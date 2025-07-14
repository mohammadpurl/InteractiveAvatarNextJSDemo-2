import { NextRequest, NextResponse } from "next/server";

import { Message } from "@/components/logic/context";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";




// Helper to call OpenAI
async function callOpenAI(messages: Message[]) {
    
  const prompt = `Extract all passenger and ticket information from the following conversation for an airline booking. Return a JSON object with these fields:
{
  "airportName": string,
  "travelDate": string,
  "flightNumber": string,
  "passengers": [
    { "fullName": string, "nationalId": string, "luggageCount": number }
  ]
}
If any field is missing, use an empty string or 0. Only return the JSON object, nothing else.

Conversation:
${messages.map((m) => `${m.sender}: ${m.content}`).join("\n")}
`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for airline ticket booking.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI error response:", errorText);

    throw new Error("OpenAI API error");
  }
  const data = await response.json();
  // Try to parse the JSON from the response
  const text = data.choices?.[0]?.message?.content || "";

  try {
    return JSON.parse(text);
  } catch {
    // fallback: try to extract JSON from text
    const match = text.match(/\{[\s\S]*\}/);

    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse OpenAI response");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    console.log(messages)
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages must be an array" },
        { status: 400 },
      );
    }
    const extracted = await callOpenAI(messages);

    return NextResponse.json(extracted);
  } catch (error) {
    console.log(error)
    const errorMessage =
      error instanceof Error ? error.message : "Internal error";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
