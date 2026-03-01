"use client";

import { useState, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import StockLookup from "@/components/StockLookup";
import StyledMarkdown from "@/components/StyledMarkdown";

interface ChartConfig {
  type: "bar" | "line" | "pie" | "area" | "scatter" | "radar";
  title: string;
  data: Record<string, unknown>[];
  xKey?: string;
  yKeys?: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  chart?: ChartConfig;
}

interface DataFile {
  id: string;
  name: string;
  data: string;
  columns: string[];
  rows: number;
  preview: string[][];
  parsedData: Record<string, string | number>[];
}

interface AnalysisHistory {
  id: string;
  fileName: string;
  question: string;
  response: string;
  timestamp: Date;
  model: string;
}

const AI_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", description: "Most powerful" },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", description: "Fast & smart" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", description: "Ultra fast" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", description: "Balanced" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "Complex analysis" },
];

const COLORS = ["#3fb950", "#d4a853", "#58a6ff", "#f85149", "#a371f7", "#238636", "#f78166"];

const CHART_TYPES = [
  { id: "bar", name: "Bar", icon: "📊" },
  { id: "line", name: "Line", icon: "📈" },
  { id: "area", name: "Area", icon: "📉" },
  { id: "pie", name: "Pie", icon: "🥧" },
  { id: "scatter", name: "Scatter", icon: "⚬" },
  { id: "radar", name: "Radar", icon: "🎯" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<DataFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "area" | "scatter" | "radar">("bar");
  const [showCharts, setShowCharts] = useState(false);
  const [aiChart, setAiChart] = useState<ChartConfig | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("financeAnalysisHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("financeAnalysisHistory", JSON.stringify(history));
  }, [history]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseCSV = (text: string): Record<string, string | number>[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = lines.slice(1).map((line) => {
      const values = line.split(",");
      const row: Record<string, string | number> = {};
      headers.forEach((header, i) => {
        const val = values[i]?.trim() || "";
        const num = parseFloat(val);
        row[header] = isNaN(num) ? val : num;
      });
      return row;
    });
    return data;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      const previewRows = lines.slice(1, 6).map((line) => line.split(","));
      const parsedData = parseCSV(text);

      const newFile: DataFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        data: text,
        columns: headers,
        rows: lines.length - 1,
        preview: previewRows,
        parsedData,
      };

      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(newFile.id);

      // Auto-generate chart data from numeric columns
      if (parsedData.length > 0) {
        const numericCols = headers.filter((h) =>
          parsedData.every((row) => typeof row[h] === "number")
        );
        if (numericCols.length > 0) {
          setChartData(
            parsedData.slice(0, 10).map((row, i) => {
              const chartRow: Record<string, unknown> = { name: row[headers[0]] || `Row ${i + 1}` };
              numericCols.slice(0, 4).forEach((col) => {
                chartRow[col] = row[col];
              });
              return chartRow;
            })
          );
        }
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: `📈 **File Loaded:** ${fileList[0].name}\n\nYou now have ${files.length + 1} file(s) loaded. Select which one to analyze.`,
        timestamp: new Date(),
      },
    ]);
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files.length > 1 ? files.find((f) => f.id !== fileId)?.id || null : null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !activeFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setInput("");
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          data: activeFile.data,
          fileName: activeFile.name,
          model: selectedModel,
          allFiles: files.map((f) => ({ name: f.name, data: f.data })),
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.error ? `❌ Error: ${data.error}` : data.response,
        timestamp: new Date(),
        model: selectedModel,
        chart: data.chart || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If AI generated a chart, show it
      if (data.chart) {
        setAiChart(data.chart);
        setShowCharts(true);
      }

      // Save to history
      if (!data.error) {
        const historyEntry: AnalysisHistory = {
          id: Date.now().toString(),
          fileName: activeFile.name,
          question: userMessage.content,
          response: data.response,
          timestamp: new Date(),
          model: selectedModel,
        };
        setHistory((prev) => [historyEntry, ...prev].slice(0, 50)); // Keep last 50
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ Connection error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    }

    setIsLoading(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(63, 185, 80);
    doc.text("Financial Analysis Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: "center" });

    let yPos = 40;

    // File info
    if (activeFile) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Data File: ${activeFile.name}`, 14, yPos);
      yPos += 7;
      doc.text(`Records: ${activeFile.rows} | Fields: ${activeFile.columns.length}`, 14, yPos);
      yPos += 15;
    }

    // Messages/Analysis
    doc.setFontSize(14);
    doc.text("Analysis", 14, yPos);
    yPos += 10;

    messages.forEach((msg) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setTextColor(msg.role === "user" ? 100 : 0);

      const roleLabel = msg.role === "user" ? "You" : "FinanceAI";
      doc.setFont(undefined, "bold");
      doc.text(`${roleLabel}:`, 14, yPos);
      doc.setFont(undefined, "normal");

      yPos += 6;

      const lines = doc.splitTextToSize(msg.content, pageWidth - 28);
      lines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 14, yPos);
        yPos += 5;
      });
      yPos += 5;
    });

    doc.save(`financial-analysis-${Date.now()}.pdf`);
  };

  const exportToExcel = () => {
    if (!activeFile) return;

    const workbook = XLSX.utils.book_new();

    // Original data sheet
    const dataSheet = XLSX.utils.aoa_to_string;
    const wsData = activeFile.data.split("\n").map((line) => line.split(","));
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, ws, "Data");

    // Analysis sheet
    const analysisData = messages.map((msg) => ({
      Role: msg.role,
      Content: msg.content.substring(0, 500),
      Timestamp: new Date(msg.timestamp).toLocaleString(),
    }));
    const analysisWs = XLSX.utils.json_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(workbook, analysisWs, "Analysis");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `financial-analysis-${Date.now()}.xlsx`);
  };

  const loadFromHistory = (entry: AnalysisHistory) => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "user",
        content: entry.question,
        timestamp: new Date(entry.timestamp),
      },
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: entry.response,
        timestamp: new Date(entry.timestamp),
        model: entry.model,
      },
    ]);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("financeAnalysisHistory");
  };

  const handleAddStockToAnalysis = (stockData: string) => {
    // Create a virtual file with the stock data
    const newFile: DataFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: `Stock Data (${new Date().toLocaleDateString()}).csv`,
      data: stockData,
      columns: ["Metric", "Value"],
      rows: stockData.split("\n").length,
      preview: [],
      parsedData: [],
    };

    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: `📈 **Stock data added to analysis!**\n\nYou can now ask questions about this stock data, or combine it with other files for comparison.`,
        timestamp: new Date(),
      },
    ]);
  };

  const compareFiles = async () => {
    if (files.length < 2) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "⚠️ Please upload at least 2 files to compare.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setInput("Compare all uploaded files and highlight key differences");
    sendMessage();
  };

  const sampleQuestions = [
    "📊 Summarize key financial metrics",
    "💰 Calculate profit margins",
    "📈 Identify growth trends",
    "🏆 Top performing segments",
  ];

  const tickers = [
    { symbol: "REVENUE", change: "+12.5%", up: true },
    { symbol: "PROFIT", change: "+8.3%", up: true },
    { symbol: "MARGIN", change: "-2.1%", up: false },
    { symbol: "GROWTH", change: "+15.7%", up: true },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Stock Ticker Bar */}
      <div className="border-b border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="flex ticker-scroll whitespace-nowrap py-2">
          {[...tickers, ...tickers].map((t, i) => (
            <div key={i} className="flex items-center gap-2 px-6">
              <span className="text-sm font-medium text-[#e6edf3]">{t.symbol}</span>
              <span className={`text-sm font-mono ${t.up ? "text-[#3fb950]" : "text-[#f85149]"}`}>
                {t.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-[#30363d] px-6 py-4 bg-[#161b22]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3fb950] to-[#238636] flex items-center justify-center glow-green">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#3fb950] rounded-full animate-pulse-green"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                FinanceAI
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/30">
                  ANALYST
                </span>
              </h1>
              <p className="text-xs text-[#8b949e]">AI-Powered Financial Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-[#3fb950]/50 transition-all"
              >
                <svg className="w-4 h-4 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-[#e6edf3]">{AI_MODELS.find((m) => m.id === selectedModel)?.name}</span>
                <svg className="w-4 h-4 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showModelSelector && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#161b22] border border-[#30363d] shadow-xl z-50 animate-fade-in">
                  <div className="p-2">
                    {AI_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelSelector(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          selectedModel === model.id
                            ? "bg-[#3fb950]/20 border border-[#3fb950]/30"
                            : "hover:bg-[#21262d]"
                        }`}
                      >
                        <div className="text-sm font-medium text-[#e6edf3]">{model.name}</div>
                        <div className="text-xs text-[#8b949e]">{model.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* History */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-[#d4a853]/50 transition-all"
            >
              <svg className="w-4 h-4 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-[#e6edf3]">History</span>
            </button>

            {/* Stock Lookup */}
            <StockLookup onAddToAnalysis={handleAddStockToAnalysis} />

            {/* Charts Toggle */}
            {chartData.length > 0 && (
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  showCharts
                    ? "bg-[#58a6ff]/20 border-[#58a6ff]/50 text-[#58a6ff]"
                    : "bg-[#21262d] border-[#30363d] hover:border-[#58a6ff]/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm">Charts</span>
              </button>
            )}

            {/* Export */}
            {messages.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-[#f85149]/50 transition-all"
                >
                  <svg className="w-4 h-4 text-[#f85149]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-[#e6edf3]">PDF</span>
                </button>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-[#3fb950]/50 transition-all"
                >
                  <svg className="w-4 h-4 text-[#3fb950]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-[#e6edf3]">Excel</span>
                </button>
              </div>
            )}

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#3fb950] to-[#238636] text-white font-medium hover:opacity-90 transition-all glow-green"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-sm">Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </header>

      {/* History Panel */}
      {showHistory && (
        <div className="border-b border-[#30363d] bg-[#161b22] p-4 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#e6edf3]">Analysis History</h3>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-[#f85149] hover:underline">
                  Clear All
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-[#8b949e]">No history yet. Your analyses will be saved here.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {history.slice(0, 9).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => loadFromHistory(entry)}
                    className="text-left p-3 rounded-lg bg-[#21262d] hover:bg-[#30363d] transition-all"
                  >
                    <div className="text-xs text-[#8b949e] mb-1">{entry.fileName}</div>
                    <div className="text-sm text-[#e6edf3] truncate">{entry.question}</div>
                    <div className="text-xs text-[#484f58] mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Panel */}
      {showCharts && (chartData.length > 0 || aiChart) && (
        <div className="border-b border-[#30363d] bg-[#161b22] p-4 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#e6edf3]">
                {aiChart ? `📊 ${aiChart.title || "AI-Generated Chart"}` : "Data Visualization"}
              </h3>
              <div className="flex gap-2">
                {CHART_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id as typeof chartType)}
                    className={`px-3 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                      chartType === type.id
                        ? "bg-[#3fb950] text-white"
                        : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]"
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={aiChart?.data || chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey={aiChart?.xKey || "name"} stroke="#8b949e" fontSize={12} />
                    <YAxis stroke="#8b949e" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                    />
                    <Legend />
                    {(aiChart?.yKeys || Object.keys((aiChart?.data || chartData)[0] || {}).filter((k) => k !== (aiChart?.xKey || "name"))).map((key: string, i: number) => (
                      <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : chartType === "line" ? (
                  <LineChart data={aiChart?.data || chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey={aiChart?.xKey || "name"} stroke="#8b949e" fontSize={12} />
                    <YAxis stroke="#8b949e" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                    />
                    <Legend />
                    {(aiChart?.yKeys || Object.keys((aiChart?.data || chartData)[0] || {}).filter((k) => k !== (aiChart?.xKey || "name"))).map((key: string, i: number) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[i % COLORS.length], strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                ) : chartType === "area" ? (
                  <AreaChart data={aiChart?.data || chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey={aiChart?.xKey || "name"} stroke="#8b949e" fontSize={12} />
                    <YAxis stroke="#8b949e" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                    />
                    <Legend />
                    {(aiChart?.yKeys || Object.keys((aiChart?.data || chartData)[0] || {}).filter((k) => k !== (aiChart?.xKey || "name"))).map((key: string, i: number) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        fill={COLORS[i % COLORS.length]}
                        stroke={COLORS[i % COLORS.length]}
                        fillOpacity={0.3}
                      />
                    ))}
                  </AreaChart>
                ) : chartType === "scatter" ? (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey={aiChart?.xKey || "name"} stroke="#8b949e" fontSize={12} />
                    <YAxis dataKey={aiChart?.yKeys?.[0] || "value"} stroke="#8b949e" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                    />
                    <Legend />
                    <Scatter
                      name="Data"
                      data={aiChart?.data || chartData}
                      fill="#3fb950"
                    />
                  </ScatterChart>
                ) : chartType === "radar" ? (
                  <RadarChart data={aiChart?.data || chartData}>
                    <PolarGrid stroke="#30363d" />
                    <PolarAngleAxis dataKey={aiChart?.xKey || "name"} stroke="#8b949e" fontSize={12} />
                    <PolarRadiusAxis stroke="#8b949e" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                    />
                    <Legend />
                    {(aiChart?.yKeys || Object.keys((aiChart?.data || chartData)[0] || {}).filter((k) => k !== (aiChart?.xKey || "name"))).map((key: string, i: number) => (
                      <Radar
                        key={key}
                        name={key}
                        dataKey={key}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.3}
                      />
                    ))}
                  </RadarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={(aiChart?.data || chartData).map((d: Record<string, unknown>) => ({
                        name: String(d[aiChart?.xKey || "name"] || ""),
                        value: Number(d[aiChart?.yKeys?.[0] || Object.values(d).find((v) => typeof v === "number") || 0),
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      fill="#3fb950"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: "#8b949e" }}
                    >
                      {(aiChart?.data || chartData).map((_: Record<string, unknown>, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                    />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex max-w-7xl mx-auto w-full min-h-0">
        {/* Sidebar - Files & Data */}
        <aside className="w-80 border-r border-[#30363d] bg-[#161b22] p-4 hidden lg:block flex-shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              Uploaded Files ({files.length})
            </h2>

            {files.length === 0 ? (
              <div className="glass rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#238636]/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#3fb950]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm text-[#8b949e]">Drop CSV files here or click Import</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      activeFileId === file.id
                        ? "bg-[#3fb950]/20 border border-[#3fb950]/50"
                        : "glass hover:bg-[#21262d]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#3fb950]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-[#e6edf3] truncate max-w-[150px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-[#8b949e]">
                            {file.rows} rows × {file.columns.length} cols
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="text-[#8b949e] hover:text-[#f85149] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {files.length >= 2 && (
                  <button
                    onClick={compareFiles}
                    className="w-full mt-2 px-4 py-2 rounded-lg bg-[#d4a853]/20 border border-[#d4a853]/50 text-[#d4a853] text-sm font-medium hover:bg-[#d4a853]/30 transition-all"
                  >
                    ⚖️ Compare All Files
                  </button>
                )}
              </div>
            )}

            {/* Active File Details */}
            {activeFile && (
              <div className="glass rounded-xl p-4 mt-4">
                <p className="text-xs text-[#8b949e] uppercase tracking-wider mb-3">Data Fields</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activeFile.columns.map((col, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950]"></div>
                      <span className="text-[#e6edf3]">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0d1117] grid-pattern min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#3fb950] to-[#238636] flex items-center justify-center glow-green">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-3">Financial Analysis Agent</h2>
                <p className="text-[#8b949e] max-w-lg mb-8">
                  Upload your financial data and get AI-powered insights, trends, and recommendations.
                </p>

                <div className="grid grid-cols-2 gap-3 max-w-xl">
                  {sampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q.slice(2).trim())}
                      className="px-4 py-3 rounded-xl glass hover:bg-[#30363d]/50 text-left transition-all group"
                    >
                      <span className="text-lg mb-1 block">{q.slice(0, 2)}</span>
                      <span className="text-sm text-[#8b949e] group-hover:text-white transition-colors">
                        {q.slice(2).trim()}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-6 mt-12 text-xs text-[#484f58]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#3fb950]"></div>
                    <span>Multiple Files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#d4a853]"></div>
                    <span>Auto Charts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#58a6ff]"></div>
                    <span>Export Reports</span>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[#238636] to-[#2ea043] text-white"
                        : "glass text-[#e6edf3]"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#30363d]">
                        <div className="w-5 h-5 rounded bg-[#3fb950]/20 flex items-center justify-center">
                          <svg className="w-3 h-3 text-[#3fb950]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <span className="text-xs text-[#3fb950] font-medium">FinanceAI</span>
                        {msg.model && (
                          <span className="text-xs text-[#8b949e]">
                            • {AI_MODELS.find((m) => m.id === msg.model)?.name}
                          </span>
                        )}
                      </div>
                    )}
                    <StyledMarkdown content={msg.content} />
                    {/* Inline Chart */}
                    {msg.chart && (
                      <div className="mt-4 pt-4 border-t border-[#30363d]">
                        <p className="text-xs text-[#8b949e] mb-2">📊 {msg.chart.title || "Visualization"}</p>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            {msg.chart.type === "bar" ? (
                              <BarChart data={msg.chart.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                                <XAxis dataKey={msg.chart.xKey || "name"} stroke="#8b949e" fontSize={10} />
                                <YAxis stroke="#8b949e" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "4px" }} />
                                {(msg.chart.yKeys || ["value"]).map((key: string, i: number) => (
                                  <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                                ))}
                              </BarChart>
                            ) : msg.chart.type === "line" ? (
                              <LineChart data={msg.chart.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                                <XAxis dataKey={msg.chart.xKey || "name"} stroke="#8b949e" fontSize={10} />
                                <YAxis stroke="#8b949e" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "4px" }} />
                                {(msg.chart.yKeys || ["value"]).map((key: string, i: number) => (
                                  <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
                                ))}
                              </LineChart>
                            ) : msg.chart.type === "area" ? (
                              <AreaChart data={msg.chart.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                                <XAxis dataKey={msg.chart.xKey || "name"} stroke="#8b949e" fontSize={10} />
                                <YAxis stroke="#8b949e" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "4px" }} />
                                {(msg.chart.yKeys || ["value"]).map((key: string, i: number) => (
                                  <Area key={key} type="monotone" dataKey={key} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.3} />
                                ))}
                              </AreaChart>
                            ) : msg.chart.type === "radar" ? (
                              <RadarChart data={msg.chart.data}>
                                <PolarGrid stroke="#30363d" />
                                <PolarAngleAxis dataKey={msg.chart.xKey || "name"} stroke="#8b949e" fontSize={10} />
                                <PolarRadiusAxis stroke="#8b949e" />
                                <Tooltip contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "4px" }} />
                                {(msg.chart.yKeys || ["value"]).map((key: string, i: number) => (
                                  <Radar key={key} dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
                                ))}
                              </RadarChart>
                            ) : (
                              <PieChart>
                                <Pie
                                  data={msg.chart.data.map((d: Record<string, unknown>) => ({
                                    name: String(d[msg.chart.xKey || "name"] || ""),
                                    value: Number(d[msg.chart.yKeys?.[0] || "value"] || 0),
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={60}
                                  innerRadius={25}
                                  dataKey="value"
                                >
                                  {msg.chart.data.map((_: Record<string, unknown>, i: number) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "4px" }} />
                              </PieChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="glass rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-[#3fb950]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#3fb950] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#3fb950] typing-dot" />
                      <div className="w-2 h-2 rounded-full bg-[#3fb950] typing-dot" />
                      <div className="w-2 h-2 rounded-full bg-[#3fb950] typing-dot" />
                    </div>
                    <span className="text-xs text-[#8b949e]">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-[#30363d] p-4 bg-[#161b22]">
            <div className="max-w-3xl mx-auto flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#484f58]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={files.length > 0 ? "Ask about your financial data..." : "Import data to start analysis..."}
                  disabled={files.length === 0 || isLoading}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-12 pr-4 py-4 text-white placeholder-[#484f58] focus:outline-none focus:border-[#3fb950]/50 focus:ring-1 focus:ring-[#3fb950]/20 disabled:opacity-50 transition-all"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || files.length === 0}
                className="px-6 py-4 rounded-xl bg-gradient-to-r from-[#3fb950] to-[#238636] text-white font-medium hover:opacity-90 transition-all glow-green disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Analyze</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-[#484f58] mt-3">
              Powered by AI • Multiple Models • Export Reports • Free
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
