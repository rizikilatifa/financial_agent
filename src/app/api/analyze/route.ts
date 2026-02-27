import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const { question, data, fileName, model, allFiles } = await request.json();

    if (!data) {
      return NextResponse.json(
        { error: "No data provided. Please upload a file first." },
        { status: 400 }
      );
    }

    // Check if this is a comparison request
    const isComparison = question.toLowerCase().includes("compare") && allFiles && allFiles.length > 1;

    let prompt: string;

    if (isComparison) {
      // Multi-file comparison prompt
      prompt = `You are a professional financial analyst. Compare the following datasets and provide insights.

${allFiles.map((f: { name: string; data: string }, i: number) => `
--- FILE ${i + 1}: ${f.name} ---
${f.data}
`).join("\n")}

QUESTION: ${question}

Provide a detailed comparison including:
1. Key differences between datasets
2. Performance comparison
3. Notable trends in each dataset
4. Recommendations

Use markdown formatting for better readability.`;
    } else {
      // Single file analysis prompt
      prompt = `You are a professional financial analyst. Analyze the following data and answer the question.

FILE: ${fileName || "data.csv"}

DATA (CSV format):
${data}

QUESTION: ${question}

Provide a clear, detailed analysis. Use markdown formatting for better readability (tables, bold text, lists, etc.).`;
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com",
        "X-Title": "Financial Agent",
      },
      body: JSON.stringify({
        model: model || "google/gemma-3n-e2b-it:free",
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
