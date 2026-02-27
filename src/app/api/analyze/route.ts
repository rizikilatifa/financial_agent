import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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

IMPORTANT: Provide a detailed text analysis, NOT code. Include:
1. Key differences between datasets
2. Performance comparison
3. Notable trends in each dataset
4. Recommendations

Format your response with markdown (tables, bullet points, bold text).`;
    } else {
      // Single file analysis prompt
      prompt = `You are a professional financial analyst. Analyze the following data and answer the question.

FILE: ${fileName || "data.csv"}

DATA (CSV format):
${data}

QUESTION: ${question}

IMPORTANT INSTRUCTIONS:
- Provide a TEXT analysis, NOT code or Python scripts
- Answer in plain English with clear explanations
- Use markdown formatting (tables, bullet points, bold text)
- Include specific numbers and percentages from the data
- Highlight key insights and trends

DO NOT write code. DO NOT write Python scripts. Provide a written analysis.`;
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
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
