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
