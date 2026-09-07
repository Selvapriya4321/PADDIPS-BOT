import { useState } from "react";

// =====================================================
// API URL
// =====================================================

const API_URL =
  import.meta.env.VITE_API_URL ||  "https://paddips-bot.onrender.com";

// =====================================================
// CHAT COMPONENT
// =====================================================

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===================================================
  // SEND MESSAGE
  // ===================================================

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: userMessage,
      },
    ]);

    // Clear input
    setMessage("");

    // Show loading
    setLoading(true);

    try {
      // ===============================================
      // CALL RENDER BACKEND
      // ===============================================

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: userMessage,
        }),
      });

      // ===============================================
      // READ RESPONSE
      // ===============================================

      const data = await response.json();

      // ===============================================
      // CHECK BACKEND ERROR
      // ===============================================

      if (!response.ok) {
        throw new Error(
          data.error || "Chat request failed"
        );
      }

      // ===============================================
      // ADD AI RESPONSE
      // ===============================================

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text:
            data.reply ||
            "Sorry, I could not generate a response.",
        },
      ]);
    } catch (error) {
      console.error("Chat Error:", error);

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text:
            "❌ Backend connection failed. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // ENTER KEY
  // ===================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "800px",
        margin: "auto",
      }}
    >
      {/* TITLE */}
      <h1>🤖 AI Study Assistant</h1>

      <p>Ask me anything about your studies.</p>

      {/* CHAT AREA */}
      <div
        style={{
          minHeight: "400px",
          padding: "20px",
          marginTop: "20px",
          background: "#f5f5f5",
          borderRadius: "15px",
          overflowY: "auto",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "100px 20px",
              color: "#777",
            }}
          >
            👋 Ask me a question to get started!
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "15px",
              padding: "12px",
              background:
                msg.type === "user"
                  ? "#ddd5ff"
                  : "white",
              borderRadius: "10px",
              lineHeight: "1.6",
              wordBreak: "break-word",
            }}
          >
            <strong>
              {msg.type === "user" ? "You" : "AI"}:
            </strong>{" "}
            {msg.text}
          </div>
        ))}

        {/* LOADING MESSAGE */}
        {loading && (
          <div
            style={{
              marginBottom: "15px",
              padding: "12px",
              background: "white",
              borderRadius: "10px",
              color: "#666",
            }}
          >
            <strong>AI:</strong> Thinking... 🤔
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your study question..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            outline: "none",
          }}
        />

        <button
          onClick={sendMessage}
          disabled={loading || !message.trim()}
          style={{
            padding: "14px 25px",
            border: "none",
            borderRadius: "10px",
            background: "#5b3cc4",
            color: "white",
            cursor:
              loading || !message.trim()
                ? "not-allowed"
                : "pointer",
            opacity:
              loading || !message.trim()
                ? 0.6
                : 1,
          }}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default Chat;