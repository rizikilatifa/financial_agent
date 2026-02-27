import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY =
  "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const { question, data, fileName } = await request.json();

    if (!data) {
      return NextResponse.json(
        { error: "No data provided. Please upload a file first." },
        { status: 400 }
      );
    }

    const prompt = `You are a professional financial analyst. Analyze the following data and answer the question.

FILE: ${fileName || "data.csv"}

DATA (CSV format):
${data}

QUESTION: ${question}

Provide a clear, detailed analysis. Use markdown formatting for better readability (tables, bold text, lists, etc.).`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com",
        "X-Title": "Financial Agent",
      },
      body: JSON.stringify({
        model: "google/gemma-3n-e2b-it:free",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || "API request failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content || "No response";

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze data. Please try again." },
      { status: 500 }
    );
  }
}
