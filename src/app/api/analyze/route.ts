import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Truncate data to fit within token limits (roughly 8000 chars = ~2000 tokens)
function truncateData(data: string, maxChars: number = 8000): string {
  if (data.length <= maxChars) return data;

  const lines = data.split("\n");
  const header = lines[0];
  const rows = lines.slice(1);

  // Include header and as many rows as fit
  let result = header + "\n";
  let currentLength = header.length + 1;

  for (const row of rows) {
    if (currentLength + row.length + 1 > maxChars) break;
    result += row + "\n";
    currentLength += row.length + 1;
  }

  result += `\n[... truncated ${rows.length - result.split("\n").length + 2} more rows ...]`;
  return result;
}

export async function POST(request: NextRequest) {
  // Read API key at runtime
  const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY environment variable is not set on Vercel." },
      { status: 500 }
    );
  }

  try {
    const { question, data, fileName, model, allFiles } = await request.json();

    if (!data) {
      return NextResponse.json(
        { error: "No data provided. Please upload a file first." },
        { status: 400 }
      );
    }

    // Truncate data to avoid token limits
    const truncatedData = truncateData(data);
    const totalRows = data.split("\n").length - 1;
    const dataInfo = totalRows > 50
      ? `(${totalRows} total rows - showing sample)`
      : `(${totalRows} rows)`;

    // Check if this is a comparison request
    const isComparison = question.toLowerCase().includes("compare") && allFiles && allFiles.length > 1;

    let prompt: string;

    if (isComparison) {
      // Multi-file comparison prompt - truncate each file
      const truncatedFiles = allFiles.map((f: { name: string; data: string }) => ({
        name: f.name,
        data: truncateData(f.data, 4000) // Smaller limit for each file in comparison
      }));

      prompt = `You are a professional financial analyst. Compare the following datasets and provide insights.

${truncatedFiles.map((f: { name: string; data: string }, i: number) => `
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

FILE: ${fileName || "data.csv"} ${dataInfo}

DATA (CSV format):
${truncatedData}

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
      console.log("Groq API Error:", JSON.stringify(errorData));
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

