
import { useState, useRef, useEffect } from "react";
import "./Chat.css";

// ============================================
// API CONFIGURATION
// ============================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://paddips-bot.onrender.com"
).replace(/\/+$/, "");

// ============================================
// CHAT COMPONENT
// ============================================

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Automatically scroll to the latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const sendMessage = async (event) => {
    event?.preventDefault();

    const userMessage = message.trim();

    if (!userMessage || loading) return;

    setError("");
    setMessage("");

    setMessages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-user`,
        type: "user",
        text: userMessage,
      },
    ]);

    setLoading(true);

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 90000);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
        signal: controller.signal,
      });

      const rawResponse = await response.text();

      let data = {};

      try {
        data = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        throw new Error(
          `Invalid server response (HTTP ${response.status}). Check the Render backend URL.`
        );
      }

      // Display useful backend errors, including API-key errors.
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            data.reply ||
            `Request failed with HTTP ${response.status}`
        );
      }

      const aiReply =
        typeof data.reply === "string"
          ? data.reply
          : typeof data.response === "string"
          ? data.response
          : typeof data.answer === "string"
          ? data.answer
          : typeof data.message === "string"
          ? data.message
          : "";

      if (!aiReply.trim()) {
        throw new Error(
          "The server responded, but no AI reply was received."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-ai`,
          type: "ai",
          text: aiReply,
        },
      ]);
    } catch (err) {
      console.error("PADDIPS BOT error:", err);

      let errorMessage;

      if (err.name === "AbortError") {
        errorMessage =
          "The server took too long to respond. Please try again.";
      } else if (err instanceof TypeError) {
        errorMessage =
          "Cannot connect to the backend. Check the Render URL, CORS settings, and network connection.";
      } else {
        errorMessage =
          err.message || "Something went wrong. Please try again.";
      }

      setError(errorMessage);

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          type: "error",
          text: errorMessage,
        },
      ]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ==========================================
  // CLEAR CHAT
  // ==========================================

  const clearChat = () => {
    if (loading) return;

    setMessages([]);
    setError("");
    setMessage("");
    inputRef.current?.focus();
  };

  // ==========================================
  // CHAT UI
  // ==========================================

  return (
    <main className="paddips-chat-page">
      <section className="paddips-chat-container">

        {/* HEADER */}
        <header className="paddips-chat-header">
          <div className="paddips-brand">
            <div className="paddips-brand-icon">🤖</div>

            <div>
              <h1>PADDIPS BOT</h1>
              <p>AI LEARNING ASSISTANT</p>
            </div>
          </div>

          <div className="paddips-status">
            <span className="paddips-status-dot" />
            AI ASSISTANT
          </div>
        </header>

        {/* INTRO */}
        <div className="paddips-chat-intro">
          <span className="paddips-intro-label">
            ✨ YOUR PERSONAL AI TUTOR
          </span>

          <h2>
            Learn smarter.
            <br />
            <span>Grow faster.</span>
          </h2>

          <p>
            Ask questions, understand difficult concepts,
            and improve your learning with PADDIPS BOT.
          </p>
        </div>

        {/* CHAT PANEL */}
        <section
          className="paddips-chat-panel"
          aria-label="AI chat"
        >
          {/* TOOLBAR */}
          <div className="paddips-chat-toolbar">
            <div>
              <strong>Study Chat</strong>
              <p>Your AI learning companion</p>
            </div>

            <button
              type="button"
              className="paddips-clear-button"
              onClick={clearChat}
              disabled={loading || messages.length === 0}
            >
              Clear chat
            </button>
          </div>

          {/* MESSAGES */}
          <div
            className="paddips-messages"
            aria-live="polite"
            aria-busy={loading}
          >
            {messages.length === 0 && (
              <div className="paddips-empty-state">
                <div className="paddips-empty-icon">
                  💡
                </div>

                <h3>What would you like to learn?</h3>

                <p>
                  Ask me about programming, databases,
                  computer science, or your studies.
                </p>

                <div className="paddips-suggestions">
                  {[
                    "Explain DBMS simply",
                    "What is React?",
                    "Explain data structures",
                  ].map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => {
                        setMessage(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`paddips-message-row ${msg.type}`}
              >
                <div className="paddips-message-avatar">
                  {msg.type === "user"
                    ? "YOU"
                    : msg.type === "error"
                    ? "!"
                    : "AI"}
                </div>

                <div className="paddips-message-content">
                  <strong>
                    {msg.type === "user"
                      ? "You"
                      : msg.type === "error"
                      ? "Connection error"
                      : "PADDIPS BOT"}
                  </strong>

                  <div className="paddips-message-bubble">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}

            {/* THINKING INDICATOR */}
            {loading && (
              <div className="paddips-message-row ai">
                <div className="paddips-message-avatar">
                  AI
                </div>

                <div className="paddips-message-content">
                  <strong>PADDIPS BOT</strong>

                  <div className="paddips-message-bubble paddips-thinking">
                    <span />
                    <span />
                    <span />
                    <small>Thinking...</small>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORM */}
          <form
            className="paddips-chat-form"
            onSubmit={sendMessage}
          >
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Ask your study question..."
              aria-label="Your message"
              autoComplete="off"
              disabled={loading}
            />

            <button
              type="submit"
              className="paddips-send-button"
              disabled={loading || !message.trim()}
            >
              {loading ? "Sending..." : "Send ➤"}
            </button>
          </form>

          <p className="paddips-chat-note">
            AI can make mistakes. Verify important information.
          </p>
        </section>

        {/* ERROR NOTICE */}
        {error && (
          <div
            className="paddips-error-notice"
            role="alert"
          >
            <strong>Unable to get a response</strong>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => {
                setError("");
                inputRef.current?.focus();
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* FOOTER */}
        <footer className="paddips-chat-footer">
          <span>✦ PADDIPS BOT</span>
          <span>AI LEARNING ASSISTANT</span>
        </footer>

      </section>
    </main>
  );
}

export default Chat;
