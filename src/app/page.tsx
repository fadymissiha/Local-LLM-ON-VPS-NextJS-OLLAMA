"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OllamaModel {
  name: string;
  model: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

export default function ChatPage() {
  // Chat History & Input
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "default",
      title: "New Fast Chat",
      messages: [],
    },
  ]);
  const [activeConvId, setActiveConvId] = useState<string>("default");
  const [input, setInput] = useState<string>("");

  // Models & Status
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [activeModel, setActiveModel] = useState<string>("");
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // UI States
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Refs for scrolling and auto-expanding input
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active messages list
  const activeConversation = conversations.find((c) => c.id === activeConvId) || conversations[0];
  const messages = activeConversation.messages;

  // Fetch Ollama models & status on mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Handle auto-resizing textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const fetchModels = async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      
      const defaultModelFromEnv = data.defaultModel || "llama3";

      if (data.status === "online") {
        setOllamaStatus("online");
        setModels(data.models);
        
        // If the configured default model exists in the online list, pre-select it
        const hasDefaultModel = data.models.some((m: OllamaModel) => m.model === defaultModelFromEnv);
        if (hasDefaultModel) {
          setActiveModel(defaultModelFromEnv);
        } else if (data.models.length > 0) {
          setActiveModel(data.models[0].model);
        }
      } else {
        setOllamaStatus("offline");
        setModels(data.models || []);
        setActiveModel(defaultModelFromEnv);
        setErrorMessage("The assistant service is currently unavailable.");
      }
    } catch (err: any) {
      setOllamaStatus("offline");
      setActiveModel("default");
      setErrorMessage("The assistant service is currently unavailable.");
    }
  };

  const handleCreateNewChat = () => {
    const newId = `chat_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: "New Fast Chat",
      messages: [],
    };
    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setInput("");
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleSendMessage = async (e?: React.FormEvent, promptText?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = promptText || input;
    if (!textToSend.trim() || isStreaming) return;

    // Reset input field
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // 1. Add user message to conversation history
    const userMessage: Message = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMessage];
    
    // Update active conversation history and set its title based on first user prompt
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            title: c.messages.length === 0 ? (textToSend.slice(0, 24) + (textToSend.length > 24 ? "..." : "")) : c.title,
            messages: updatedMessages,
          };
        }
        return c;
      })
    );

    // 2. Prepare streaming assistant placeholder
    setIsStreaming(true);
    const initialAssistantMessage: Message = { role: "assistant", content: "" };
    
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            messages: [...updatedMessages, initialAssistantMessage],
          };
        }
        return c;
      })
    );

    try {
      // Send chat payload to Next.js API route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeModel,
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message to local API");
      }

      if (!response.body) {
        throw new Error("No response stream available");
      }

      // Stream response processing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponseText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantResponseText += chunk;

        // Continuously update the assistant message content
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConvId) {
              const workingMessages = [...c.messages];
              const lastMsgIndex = workingMessages.length - 1;
              if (lastMsgIndex >= 0 && workingMessages[lastMsgIndex].role === "assistant") {
                workingMessages[lastMsgIndex] = {
                  role: "assistant",
                  content: assistantResponseText,
                };
              }
              return { ...c, messages: workingMessages };
            }
            return c;
          })
        );
      }
    } catch (err: any) {
      console.error(err);
      
      let errorResponseText = "⚠️ The assistant service could not respond right now.\n\n";
      if (ollamaStatus === "offline") {
        errorResponseText += "The service appears to be unavailable. Please try again in a moment.";
      } else {
        errorResponseText += `An error occurred while streaming the response: ${err.message || err}`;
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConvId) {
            const workingMessages = [...c.messages];
            const lastMsgIndex = workingMessages.length - 1;
            if (lastMsgIndex >= 0 && workingMessages[lastMsgIndex].role === "assistant") {
              workingMessages[lastMsgIndex] = {
                role: "assistant",
                content: errorResponseText,
              };
            }
            return { ...c, messages: workingMessages };
          }
          return c;
        })
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Safe markdown formatting helper
  const renderMessageContent = (text: string) => {
    if (!text) return null;

    // Simple custom markdown parser for bullet list, bolding, code block, etc.
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Match code blocks
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.split("\n");
        const language = lines[0].replace("```", "").trim() || "code";
        const codeContent = lines.slice(1, -1).join("\n");

        return (
          <div key={index} className="code-block-container" style={{ margin: "14px 0" }}>
            <div style={{
              display: "flex", 
              justifyContent: "space-between", 
              background: "rgba(0,0,0,0.5)", 
              padding: "6px 12px", 
              fontSize: "0.75rem", 
              color: "var(--text-secondary)",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}>
              <span>{language}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(codeContent)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Copy
              </button>
            </div>
            <pre style={{
              margin: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0
            }}>
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // Format simple paragraph content with bolding, inline code, and lists
      const textLines = part.split("\n");
      return (
        <div key={index}>
          {textLines.map((line, lIdx) => {
            // Unordered list
            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
              const listText = line.replace(/^[\s]*[-*]\s/, "");
              return (
                <ul key={lIdx} style={{ paddingLeft: "20px", marginBottom: "4px" }}>
                  <li>{formatInlineElements(listText)}</li>
                </ul>
              );
            }
            // Numbered list
            if (/^\s*\d+\.\s/.test(line)) {
              const listText = line.replace(/^\s*\d+\.\s/, "");
              return (
                <ol key={lIdx} style={{ paddingLeft: "20px", marginBottom: "4px" }}>
                  <li>{formatInlineElements(listText)}</li>
                </ol>
              );
            }
            // Empty space
            if (line.trim() === "") {
              return <div key={lIdx} style={{ height: "10px" }} />;
            }
            // Standard Paragraph
            return (
              <p key={lIdx} style={{ marginBottom: "8px", minHeight: "1rem" }}>
                {formatInlineElements(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Bold and inline code formatting helper
  const formatInlineElements = (line: string) => {
    // Regex matches inline code e.g. `code`
    const codeSplit = line.split(/(`[^`]+`)/g);

    return codeSplit.map((segment, sIdx) => {
      if (segment.startsWith("`") && segment.endsWith("`")) {
        return <code key={sIdx}>{segment.slice(1, -1)}</code>;
      }

      // Bold formatter **text**
      const boldSplit = segment.split(/(\*\*[^*]+\*\*)/g);
      return boldSplit.map((subSegment, ssIdx) => {
        if (subSegment.startsWith("**") && subSegment.endsWith("**")) {
          return <strong key={ssIdx} style={{ color: "var(--text-primary)", fontWeight: 700 }}>{subSegment.slice(2, -2)}</strong>;
        }
        return subSegment;
      });
    });
  };

  return (
    <div className="app-container">
      {/* Sidebar Drawer */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo-icon">🚀</div>
          <div className="logo-text">FastChat</div>
        </div>

        <button className="new-chat-btn" onClick={handleCreateNewChat}>
          <span>+</span> New Chat
        </button>

        {/* Conversations History */}
        <div className="conversations-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeConvId ? "active" : ""}`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <span className="conv-icon">💬</span>
              <span className="conv-title">{conv.title}</span>
            </div>
          ))}
        </div>

        {/* Connection status footer */}
        <div className="sidebar-footer">
          <div className="status-badge">
            <span className={`status-dot ${ollamaStatus === "online" ? "online" : ""}`} />
            <span>Service: {ollamaStatus === "online" ? "Connected" : ollamaStatus === "checking" ? "Checking..." : "Unavailable"}</span>
          </div>
          {errorMessage && (
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
              {errorMessage}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-area">
        {/* Chat Header */}
        <header className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <div className="header-model-info">
              <span className="active-model-title">Private Assistant</span>
              <span className="active-model-subtitle">Ready for chat</span>
            </div>
          </div>
        </header>

        {/* Messages Pane */}
        <div className="messages-pane">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2 className="empty-title">Start a conversation</h2>
              <p className="empty-subtitle">
                A private assistant is ready to help with writing, planning, brainstorming, and quick answers.
              </p>

              {/* Suggestions Grid */}
              <div className="quick-starts">
                <button 
                  className="quick-chip" 
                  onClick={() => handleSendMessage(undefined, "What is a Docker container? Explain in simple terms.")}
                >
                  <span className="quick-chip-title">Explain Containers</span>
                  <span>Explain the concept of containerization simply</span>
                </button>
                <button 
                  className="quick-chip"
                  onClick={() => handleSendMessage(undefined, "Write a clean Python function to parse JSON with error handling.")}
                >
                  <span className="quick-chip-title">Write Python Code</span>
                  <span>Scaffold a JSON parser with safety assertions</span>
                </button>
                <button 
                  className="quick-chip"
                  onClick={() => handleSendMessage(undefined, "Suggest a 3-day travel itinerary for Rome, highlighting historic sites.")}
                >
                  <span className="quick-chip-title">Rome Itinerary</span>
                  <span>Plan a curated 3-day historical expedition</span>
                </button>
                <button 
                  className="quick-chip"
                  onClick={() => handleSendMessage(undefined, "Write a motivational quote about building applications with AI.")}
                >
                  <span className="quick-chip-title">Creative Spark</span>
                  <span>Generate a compelling motivation line</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`msg-row ${msg.role}`}>
                <div className="msg-bubble">
                  {renderMessageContent(msg.content)}
                  {isStreaming && index === messages.length - 1 && msg.role === "assistant" && (
                    <span className="streaming-caret" />
                  )}
                  <div className="msg-meta">
                    <span>{msg.role === "user" ? "You" : "Assistant"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <footer className="input-pane">
          <div className="input-container-box">
            <form onSubmit={handleSendMessage} className="input-bar">
              <textarea
                ref={textareaRef}
                className="input-textarea"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Submit on Enter without shift
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask the assistant..."
                disabled={isStreaming}
              />
              <button 
                type="submit" 
                className="send-btn" 
                disabled={!input.trim() || isStreaming}
              >
                ➔
              </button>
            </form>
            <div className="input-footer-hint">
              Responses may take a moment depending on current service load.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
