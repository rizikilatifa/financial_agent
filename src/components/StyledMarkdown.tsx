"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface StyledMarkdownProps {
  content: string;
}

export default function StyledMarkdown({ content }: StyledMarkdownProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mb-4 pb-2 border-b border-[#30363d]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-[#3fb950] mt-6 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-[#d4a853] mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-[#58a6ff] mt-3 mb-2">{children}</h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-[#e6edf3] leading-relaxed mb-3">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-none space-y-2 mb-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-[#e6edf3] flex items-start gap-2">
              <span className="text-[#3fb950] mt-1">•</span>
              <span>{children}</span>
            </li>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-[#30363d]">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#21262d]">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#30363d]">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#21262d]/50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-[#e6edf3]">{children}</td>
          ),

          // Code blocks
          pre: ({ children }) => (
            <pre className="bg-[#0d1117] rounded-lg p-4 my-3 overflow-x-auto border border-[#30363d]">
              {children}
            </pre>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-[#21262d] text-[#f85149] px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ) : (
              <code className="text-xs font-mono text-[#e6edf3]">{children}</code>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#3fb950] pl-4 py-2 my-4 bg-[#21262d]/50 rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="border-[#30363d] my-6" />,

          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#d4a853]">{children}</em>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#58a6ff] hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        .markdown-content {
          font-size: 14px;
          line-height: 1.6;
        }
        .markdown-content ul ul {
          margin-left: 1rem;
          margin-top: 0.5rem;
        }
        .markdown-content ol ol {
          margin-left: 1rem;
          margin-top: 0.5rem;
        }
        .markdown-content table th:first-child {
          border-radius: 8px 0 0 0;
        }
        .markdown-content table th:last-child {
          border-radius: 0 8px 0 0;
        }
        .markdown-content tr:last-child td:first-child {
          border-radius: 0 0 0 8px;
        }
        .markdown-content tr:last-child td:last-child {
          border-radius: 0 0 8px 0;
        }
        .markdown-content tr:nth-child(even) {
          background: rgba(33, 38, 45, 0.5);
        }
      `}</style>
    </div>
  );
}
