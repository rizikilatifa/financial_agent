import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial Agent AI",
  description: "AI-powered financial analysis tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0a0a0a] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
