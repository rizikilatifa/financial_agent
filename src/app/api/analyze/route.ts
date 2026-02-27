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
      prompt = `You are a professional financial analyst. Your job is to ANALYZE data and provide INSIGHTS in plain English.

DO NOT write code. DO NOT write Python. DO NOT write scripts.
Instead, provide a text-based analysis with your findings.

Compare the following datasets:

${allFiles.map((f: { name: string; data: string }, i: number) => `
--- FILE ${i + 1}: ${f.name} ---
${f.data}
`).join("\n")}

QUESTION: ${question}

Provide your analysis as a human-readable report with:
1. **Summary** - Key differences between datasets
2. **Performance** - Which dataset performs better and why
3. **Trends** - Notable patterns in each dataset
4. **Recommendations** - Actionable insights

Use markdown formatting (bold, lists, tables) but NO CODE BLOCKS.`;
    } else {
      // Single file analysis prompt
      prompt = `You are a professional financial analyst. Your job is to ANALYZE data and provide INSIGHTS in plain English.

IMPORTANT RULES:
- DO NOT write code
- DO NOT write Python scripts
- DO NOT show calculations in code format
- Instead, EXPLAIN your findings in plain English
- Use markdown for formatting (bold, lists, tables)

Analyze this financial data:

FILE: ${fileName || "data.csv"}

DATA:
${data}

QUESTION: ${question}

Provide your analysis as a professional report:
1. **Key Findings** - What the data shows
2. **Metrics** - Important numbers and what they mean
3. **Trends** - Patterns you observe
4. **Recommendations** - What actions to take

Write in clear, simple language that a business person can understand.`;
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
