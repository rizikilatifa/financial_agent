"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DataPreview {
  columns: string[];
  rows: number;
  preview: string[][];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rawData, setRawData] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const text = await file.text();
    setRawData(text);

    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",");
    const previewRows = lines.slice(1, 6).map((line) => line.split(","));

    setDataPreview({
      columns: headers,
      rows: lines.length - 1,
      preview: previewRows,
    });

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `📈 **Data Loaded Successfully**\n\n**File:** ${file.name}\n**Records:** ${(lines.length - 1).toLocaleString()}\n**Fields:** ${headers.length}\n\nYour financial data is ready for analysis. Ask me anything!`,
      },
    ]);

    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          data: rawData,
          fileName,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `❌ Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Connection error. Please try again.",
        },
      ]);
    }

    setIsLoading(false);
  };

  const sampleQuestions = [
    "📊 Summarize key financial metrics",
    "💰 Calculate profit margins",
    "📈 Identify growth trends",
    "🏆 Top performing segments",
  ];

  // Mock ticker data
  const tickers = [
    { symbol: "REVENUE", change: "+12.5%", up: true },
    { symbol: "PROFIT", change: "+8.3%", up: true },
    { symbol: "MARGIN", change: "-2.1%", up: false },
    { symbol: "GROWTH", change: "+15.7%", up: true },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117]">
      {/* Stock Ticker Bar */}
      <div className="border-b border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="flex ticker-scroll whitespace-nowrap py-2">
          {[...tickers, ...tickers].map((t, i) => (
            <div key={i} className="flex items-center gap-2 px-6">
              <span className="text-sm font-medium text-[#e6edf3]">
                {t.symbol}
              </span>
              <span
                className={`text-sm font-mono ${
                  t.up ? "text-[#3fb950]" : "text-[#f85149]"
                }`}
              >
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
            {/* Logo */}
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3fb950] to-[#238636] flex items-center justify-center glow-green">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
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
              <p className="text-xs text-[#8b949e]">
                AI-Powered Financial Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Market Status */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#238636]/10 border border-[#238636]/30">
              <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse"></div>
              <span className="text-xs text-[#3fb950] font-medium">
                Ready to Analyze
              </span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#3fb950] to-[#238636] text-white font-medium hover:opacity-90 transition-all glow-green"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="text-sm">Import Data</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar - Data Preview */}
        <aside className="w-80 border-r border-[#30363d] bg-[#161b22] p-4 hidden lg:block">
          <div className="sticky top-4 space-y-4">
            <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Data Overview
            </h2>

            {dataPreview ? (
              <div className="space-y-3">
                {/* File Info */}
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#3fb950]/10 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[#3fb950]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[150px]">
                        {fileName}
                      </p>
                      <p className="text-xs text-[#8b949e]">CSV Data File</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0d1117] rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-[#3fb950]">
                        {dataPreview.rows.toLocaleString()}
                      </p>
                      <p className="text-xs text-[#8b949e]">Records</p>
                    </div>
                    <div className="bg-[#0d1117] rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-[#d4a853]">
                        {dataPreview.columns.length}
                      </p>
                      <p className="text-xs text-[#8b949e]">Fields</p>
                    </div>
                  </div>
                </div>

                {/* Columns */}
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-[#8b949e] uppercase tracking-wider mb-3">
                    Data Fields
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dataPreview.columns.map((col, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950]"></div>
                        <span className="text-[#e6edf3]">{col.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Table */}
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#30363d]">
                    <p className="text-xs text-[#8b949e] uppercase tracking-wider">
                      Data Preview
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#0d1117]">
                          {dataPreview.columns.slice(0, 3).map((col, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left text-[#8b949e] font-medium"
                            >
                              {col.trim().slice(0, 10)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dataPreview.preview.slice(0, 4).map((row, i) => (
                          <tr
                            key={i}
                            className="border-t border-[#30363d]"
                          >
                            {row.slice(0, 3).map((cell, j) => (
                              <td
                                key={j}
                                className="px-3 py-2 text-[#e6edf3] font-mono"
                              >
                                {cell.trim().slice(0, 10)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-xl p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#238636]/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-[#3fb950]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-[#8b949e] mb-3">
                  Import your financial data
                </p>
                <p className="text-xs text-[#484f58]">
                  Supports CSV, XLSX files
                </p>
              </div>
            )}

            {/* Quick Stats Placeholder */}
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-[#8b949e] uppercase tracking-wider mb-3">
                Analysis Tools
              </p>
              <div className="space-y-2">
                {[
                  { icon: "📊", label: "Trend Analysis" },
                  { icon: "💰", label: "Profitability" },
                  { icon: "📈", label: "Growth Metrics" },
                  { icon: "📉", label: "Risk Assessment" },
                ].map((tool, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d1117] text-sm text-[#8b949e]"
                  >
                    <span>{tool.icon}</span>
                    <span>{tool.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0d1117] grid-pattern">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                {/* Hero */}
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#3fb950] to-[#238636] flex items-center justify-center glow-green">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-[#d4a853] flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-3">
                  Financial Analysis Agent
                </h2>
                <p className="text-[#8b949e] max-w-lg mb-8">
                  Upload your financial data and get AI-powered insights,
                  trends, and recommendations in seconds.
                </p>

                {/* Sample Questions */}
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

                {/* Features */}
                <div className="flex items-center gap-6 mt-12 text-xs text-[#484f58]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#3fb950]"></div>
                    <span>Instant Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#d4a853]"></div>
                    <span>Smart Insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#58a6ff]"></div>
                    <span>Secure & Private</span>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } animate-fade-in`}
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
                          <svg
                            className="w-3 h-3 text-[#3fb950]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-[#3fb950] font-medium">
                          FinanceAI
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="glass rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-[#3fb950]/20 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-[#3fb950] animate-pulse"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
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
          <div className="border-t border-[#30363d] p-4 bg-[#161b22]">
            <div className="max-w-3xl mx-auto flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#484f58]">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={
                    dataPreview
                      ? "Ask about your financial data..."
                      : "Import data to start analysis..."
                  }
                  disabled={!dataPreview || isLoading}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-12 pr-4 py-4 text-white placeholder-[#484f58] focus:outline-none focus:border-[#3fb950]/50 focus:ring-1 focus:ring-[#3fb950]/20 disabled:opacity-50 transition-all"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || !dataPreview}
                className="px-6 py-4 rounded-xl bg-gradient-to-r from-[#3fb950] to-[#238636] text-white font-medium hover:opacity-90 transition-all glow-green disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Analyze</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-[#484f58] mt-3">
              Powered by AI • Your data stays private • Free to use
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
