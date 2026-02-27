import { NextRequest, NextResponse } from "next/server";

// Financial Tools API - Anthropic MCP-style integration
// Provides real-time stock data, financial statements, and market analysis

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance";
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

interface FinancialStatement {
  symbol: string;
  type: "income" | "balance" | "cashflow";
  period: string;
  data: Record<string, unknown>;
}

// Available Financial Tools (MCP-style)
const FINANCIAL_TOOLS = [
  {
    name: "get_stock_quote",
    description: "Get real-time stock price and basic metrics",
    parameters: ["symbol"],
  },
  {
    name: "get_historical_prices",
    description: "Get historical stock prices for a date range",
    parameters: ["symbol", "start", "end"],
  },
  {
    name: "get_company_info",
    description: "Get company profile and key statistics",
    parameters: ["symbol"],
  },
  {
    name: "get_market_summary",
    description: "Get market indices summary (S&P 500, Dow, NASDAQ)",
    parameters: [],
  },
  {
    name: "get_trending_stocks",
    description: "Get trending/most active stocks",
    parameters: [],
  },
  {
    name: "compare_stocks",
    description: "Compare multiple stocks side by side",
    parameters: ["symbols"],
  },
  {
    name: "search_stocks",
    description: "Search for stocks by company name or symbol",
    parameters: ["query"],
  },
];

// Helper function to fetch from Yahoo Finance
async function fetchYahooFinance(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }
  return response.json();
}

// Get stock quote
async function getStockQuote(symbol: string): Promise<StockQuote> {
  const url = `${YAHOO_FINANCE_BASE}/quote?symbols=${symbol}`;
  const data = await fetchYahooFinance(url);

  const quote = data.quoteResponse?.result?.[0];
  if (!quote) {
    throw new Error(`Stock not found: ${symbol}`);
  }

  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName || symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    volume: quote.regularMarketVolume,
    marketCap: quote.marketCap,
    peRatio: quote.trailingPE,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
  };
}

// Get historical prices
async function getHistoricalPrices(
  symbol: string,
  start: string,
  end: string
): Promise<unknown[]> {
  const startTime = Math.floor(new Date(start).getTime() / 1000);
  const endTime = Math.floor(new Date(end).getTime() / 1000);
  const url = `${YAHOO_CHART_BASE}/${symbol}?period1=${startTime}&period2=${endTime}&interval=1d`;

  const data = await fetchYahooFinance(url);
  const quotes = data.chart?.result?.[0];

  if (!quotes) {
    throw new Error(`Historical data not found for: ${symbol}`);
  }

  const timestamps = quotes.timestamp || [];
  const closes = quotes.indicators?.quote?.[0]?.close || [];

  return timestamps.map((ts: number, i: number) => ({
    date: new Date(ts * 1000).toISOString().split("T")[0],
    close: closes[i],
    open: quotes.indicators?.quote?.[0]?.open?.[i],
    high: quotes.indicators?.quote?.[0]?.high?.[i],
    low: quotes.indicators?.quote?.[0]?.low?.[i],
    volume: quotes.indicators?.quote?.[0]?.volume?.[i],
  }));
}

// Get company info
async function getCompanyInfo(symbol: string) {
  const modules = [
    "assetProfile",
    "summaryProfile",
    "financialData",
    "defaultKeyStatistics",
    "earnings",
    "earningsTrend",
  ].join(",");

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
  const data = await fetchYahooFinance(url);

  const info = data.quoteSummary?.result?.[0];
  if (!info) {
    throw new Error(`Company info not found for: ${symbol}`);
  }

  return {
    symbol,
    profile: info.assetProfile || info.summaryProfile,
    financialData: info.financialData,
    keyStats: info.defaultKeyStatistics,
    earnings: info.earnings,
    earningsTrend: info.earningsTrend,
  };
}

// Get market summary
async function getMarketSummary() {
  const symbols = "^GSPC,^DJI,^IXIC,^RUT";
  const url = `${YAHOO_FINANCE_BASE}/quote?symbols=${symbols}`;
  const data = await fetchYahooFinance(url);

  const indices: Record<string, unknown> = {};
  for (const quote of data.quoteResponse?.result || []) {
    indices[quote.symbol] = {
      name: quote.shortName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
    };
  }

  return indices;
}

// Get trending stocks
async function getTrendingStocks() {
  const url = "https://query1.finance.yahoo.com/v1/finance/trending/US";
  const data = await fetchYahooFinance(url);

  const quotes = data.finance?.result?.[0]?.quotes || [];
  const symbols = quotes.slice(0, 10).map((q: { symbol: string }) => q.symbol);

  // Get actual quotes for trending stocks
  if (symbols.length > 0) {
    const quotesUrl = `${YAHOO_FINANCE_BASE}/quote?symbols=${symbols.join(",")}`;
    const quotesData = await fetchYahooFinance(quotesUrl);
    return quotesData.quoteResponse?.result?.map((q: Record<string, unknown>) => ({
      symbol: q.symbol,
      name: q.shortName,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
    }));
  }

  return [];
}

// Compare stocks
async function compareStocks(symbols: string[]) {
  const url = `${YAHOO_FINANCE_BASE}/quote?symbols=${symbols.join(",")}`;
  const data = await fetchYahooFinance(url);

  return data.quoteResponse?.result?.map((q: Record<string, unknown>) => ({
    symbol: q.symbol,
    name: q.shortName,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    marketCap: q.marketCap,
    peRatio: q.trailingPE,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    volume: q.regularMarketVolume,
  }));
}

// Search stocks
async function searchStocks(query: string) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10`;
  const data = await fetchYahooFinance(url);

  return data.quotes?.map((q: Record<string, unknown>) => ({
    symbol: q.symbol,
    name: q.shortname || q.longname,
    exchange: q.exchange,
    type: q.quoteType,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "tools";

  try {
    switch (action) {
      case "tools":
        return NextResponse.json({ tools: FINANCIAL_TOOLS });

      case "quote":
        const symbol = searchParams.get("symbol");
        if (!symbol) throw new Error("Symbol required");
        return NextResponse.json(await getStockQuote(symbol.toUpperCase()));

      case "historical":
        const histSymbol = searchParams.get("symbol");
        const start = searchParams.get("start") || getDefaultStart();
        const end = searchParams.get("end") || getToday();
        if (!histSymbol) throw new Error("Symbol required");
        return NextResponse.json(
          await getHistoricalPrices(histSymbol.toUpperCase(), start, end)
        );

      case "company":
        const compSymbol = searchParams.get("symbol");
        if (!compSymbol) throw new Error("Symbol required");
        return NextResponse.json(await getCompanyInfo(compSymbol.toUpperCase()));

      case "market":
        return NextResponse.json(await getMarketSummary());

      case "trending":
        return NextResponse.json(await getTrendingStocks());

      case "compare":
        const symbols = searchParams.get("symbols");
        if (!symbols) throw new Error("Symbols required (comma-separated)");
        return NextResponse.json(await compareStocks(symbols.toUpperCase().split(",")));

      case "search":
        const query = searchParams.get("query");
        if (!query) throw new Error("Search query required");
        return NextResponse.json(await searchStocks(query));

      default:
        return NextResponse.json({ tools: FINANCIAL_TOOLS });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function getDefaultStart(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}
