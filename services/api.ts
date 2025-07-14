import { Message } from "@/components/logic/context";

export async function askQuestion(question: string) {
  try {
    debugger;
    console.log(
      "process.env.NEXT_PUBLIC_API_URL",
      process.env.NEXT_PUBLIC_API_URL,
    );
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/ask?question=${encodeURIComponent(question)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get response from backend");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error asking question:", error);
    throw error;
  }
}

export async function saveConversation(
  messages: Array<{ id: string; sender: string; content: string }>,
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/messages/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages), // فقط آرایه
      },
    );

    if (!response.ok) {
      throw new Error("Failed to save conversation");
    }

    return await response.json();
  } catch (error) {
    console.error("Error saving conversation:", error);
    throw error;
  }
}

export async function extractPassengerDataWithOpenAI(messages: Message[]) {
  const response = await fetch("/api/extract-passenger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) throw new Error("Failed to extract passenger data");

  return await response.json();
}
