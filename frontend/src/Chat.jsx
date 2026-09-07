import { useState } from "react";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;

    setMessages((prev) => [
      ...prev,
      { type: "user", text: userMessage },
    ]);

    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { type: "ai", text: data.reply },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: "Backend connection failed ❌",
        },
      ]);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "auto" }}>
      <h1>🤖 AI Study Assistant</h1>

      <p>Ask me anything about your studies.</p>

      <div
        style={{
          minHeight: "400px",
          padding: "20px",
          marginTop: "20px",
          background: "#f5f5f5",
          borderRadius: "15px",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "15px",
              padding: "12px",
              background: msg.type === "user" ? "#ddd5ff" : "white",
              borderRadius: "10px",
            }}
          >
            <strong>{msg.type === "user" ? "You" : "AI"}:</strong>{" "}
            {msg.text}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask your study question..."
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            padding: "14px 25px",
            border: "none",
            borderRadius: "10px",
            background: "#5b3cc4",
            color: "white",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;