import { NextResponse } from "next/server";

export async function GET() {
  const ollamaBase = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  try {
    const res = await fetch(`${ollamaBase}/api/tags`, {
      method: "GET",
      // Set a short cache lifetime so the model list reflects pulls
      next: { revalidate: 10 }, 
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch models from Ollama. Status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      status: "online",
      models: data.models || [],
      defaultModel: process.env.DEFAULT_MODEL || "llama3",
    });
  } catch (error: any) {
    console.error("Ollama connection error in api/models:", error.message);
    
    // Return offline status and default placeholders so the UI compiles/works
    // even if Ollama is starting up or has no models yet.
    return NextResponse.json(
      {
        status: "offline",
        error: error.message,
        defaultModel: process.env.DEFAULT_MODEL || "llama3",
        models: [
          { name: "llama3 (offline demo)", model: "llama3" },
          { name: "mistral (offline demo)", model: "mistral" },
          { name: "gemma (offline demo)", model: "gemma" }
        ],
      },
      { status: 200 } // Return 200 so frontend can handle connection failure gracefully
    );
  }
}
