import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const ollamaBase = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  try {
    const { model, messages } = await req.json();

    if (!model || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: 'model' and 'messages' array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call Ollama's streaming chat endpoint
    const response = await fetch(`${ollamaBase}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API responded with status ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error("No response body returned from Ollama API");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Create a readable stream that transforms Ollama's JSON lines into a clean text stream
    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Flush remaining buffer
              if (buffer.trim()) {
                try {
                  const parsed = JSON.parse(buffer);
                  if (parsed.message?.content) {
                    controller.enqueue(encoder.encode(parsed.message.content));
                  }
                } catch (e) {
                  console.error("Error parsing final buffer chunk:", e);
                }
              }
              controller.close();
              break;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Ollama sends JSON messages separated by newlines
            const lines = buffer.split("\n");
            // The last item might be incomplete, save it back to buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  controller.enqueue(encoder.encode(parsed.message.content));
                }
              } catch (err) {
                console.error("Failed to parse JSON stream line:", err, "Line:", line);
              }
            }
          }
        } catch (streamError) {
          console.error("Stream reading error:", streamError);
          controller.error(streamError);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error: any) {
    console.error("Chat API error:", error.message);
    
    // Provide a detailed helpful response back to the client
    return new Response(
      JSON.stringify({ 
        error: "Failed to communicate with Ollama", 
        details: error.message,
        suggestion: "Please ensure your Ollama container is running and has the model pulled."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
