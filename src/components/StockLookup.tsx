"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StockData {
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

interface HistoricalData {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
}

interface StockLookupProps {
  onAddToAnalysis: (data: string) => void;
}

export default function StockLookup({ onAddToAnalysis }: StockLookupProps) {
  const [symbol, setSymbol] = useState("");
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPanel, setShowPanel] = useState(false);

  const searchStock = async () => {
    if (!symbol.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      // Get quote
      const quoteRes = await fetch(`/api/financial?action=quote&symbol=${symbol}`);
      const quoteData = await quoteRes.json();

      if (quoteData.error) {
        throw new Error(quoteData.error);
      }

      setStockData(quoteData);

      // Get historical data (1 year)
      const histRes = await fetch(`/api/financial?action=historical&symbol=${symbol}`);
      const histData = await histRes.json();

      if (!histData.error) {
        setHistoricalData(histData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stock data");
      setStockData(null);
      setHistoricalData([]);
    }

    setIsLoading(false);
  };

  const addToAnalysis = () => {
    if (!stockData) return;

    const analysisData = `
STOCK DATA: ${stockData.symbol} (${stockData.name})
=========================================
Current Price: $${stockData.price.toFixed(2)}
Change: ${stockData.change >= 0 ? "+" : ""}$${stockData.change.toFixed(2)} (${stockData.changePercent.toFixed(2)}%)
Volume: ${stockData.volume?.toLocaleString() || "N/A"}
Market Cap: ${stockData.marketCap ? `$${(stockData.marketCap / 1e9).toFixed(2)}B` : "N/A"}
P/E Ratio: ${stockData.peRatio?.toFixed(2) || "N/A"}
52 Week High: ${stockData.fiftyTwoWeekHigh ? `$${stockData.fiftyTwoWeekHigh.toFixed(2)}` : "N/A"}
52 Week Low: ${stockData.fiftyTwoWeekLow ? `$${stockData.fiftyTwoWeekLow.toFixed(2)}` : "N/A"}

${historicalData.length > 0 ? `HISTORICAL DATA (Last ${historicalData.length} trading days):
Date,Close,High,Low
${historicalData.slice(-30).map((d) => `${d.date},${d.close?.toFixed(2)},${d.high?.toFixed(2)},${d.low?.toFixed(2)}`).join("\n")}` : ""}
`;

    onAddToAnalysis(analysisData);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff]/50 transition-all"
      >
        <svg className="w-4 h-4 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-sm text-[#e6edf3]">Stocks</span>
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl bg-[#161b22] border border-[#30363d] shadow-xl z-50 animate-fade-in">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[#e6edf3] mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Real-Time Stock Lookup
            </h3>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && searchStock()}
                placeholder="Enter symbol (e.g., AAPL)"
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]/50"
              />
              <button
                onClick={searchStock}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-[#58a6ff] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "..." : "Search"}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-sm text-[#f85149] mb-3">
                {error}
              </div>
            )}

            {stockData && (
              <div className="space-y-3">
                {/* Stock Info */}
                <div className="p-3 rounded-lg bg-[#21262d]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-lg font-bold text-[#e6edf3]">{stockData.symbol}</span>
                      <span className="text-xs text-[#8b949e] ml-2">{stockData.name}</span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        stockData.change >= 0 ? "text-[#3fb950]" : "text-[#f85149]"
                      }`}
                    >
                      {stockData.change >= 0 ? "▲" : "▼"} {Math.abs(stockData.changePercent).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-[#e6edf3]">
                    ${stockData.price.toFixed(2)}
                  </div>
                  <div
                    className={`text-sm ${
                      stockData.change >= 0 ? "text-[#3fb950]" : "text-[#f85149]"
                    }`}
                  >
                    {stockData.change >= 0 ? "+" : ""}${stockData.change.toFixed(2)} today
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  {stockData.marketCap && (
                    <div className="p-2 rounded-lg bg-[#0d1117]">
                      <div className="text-xs text-[#8b949e]">Market Cap</div>
                      <div className="text-sm font-medium text-[#e6edf3]">
                        {formatNumber(stockData.marketCap)}
                      </div>
                    </div>
                  )}
                  {stockData.peRatio && (
                    <div className="p-2 rounded-lg bg-[#0d1117]">
                      <div className="text-xs text-[#8b949e]">P/E Ratio</div>
                      <div className="text-sm font-medium text-[#e6edf3]">
                        {stockData.peRatio.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {stockData.fiftyTwoWeekHigh && (
                    <div className="p-2 rounded-lg bg-[#0d1117]">
                      <div className="text-xs text-[#8b949e]">52W High</div>
                      <div className="text-sm font-medium text-[#3fb950]">
                        ${stockData.fiftyTwoWeekHigh.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {stockData.fiftyTwoWeekLow && (
                    <div className="p-2 rounded-lg bg-[#0d1117]">
                      <div className="text-xs text-[#8b949e]">52W Low</div>
                      <div className="text-sm font-medium text-[#f85149]">
                        ${stockData.fiftyTwoWeekLow.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart */}
                {historicalData.length > 0 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData.slice(-60)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis
                          dataKey="date"
                          stroke="#8b949e"
                          fontSize={10}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis stroke="#8b949e" fontSize={10} domain={["auto", "auto"]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="close"
                          stroke={stockData.change >= 0 ? "#3fb950" : "#f85149"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Add to Analysis Button */}
                <button
                  onClick={addToAnalysis}
                  className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-[#3fb950] to-[#238636] text-white text-sm font-medium hover:opacity-90 transition-all"
                >
                  Add to Analysis
                </button>
              </div>
            )}

            {/* Quick Links */}
            <div className="mt-3 pt-3 border-t border-[#30363d]">
              <div className="text-xs text-[#8b949e] mb-2">Popular Stocks:</div>
              <div className="flex flex-wrap gap-1">
                {["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSymbol(s);
                      setTimeout(searchStock, 100);
                    }}
                    className="px-2 py-1 rounded text-xs bg-[#21262d] text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#30363d] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
