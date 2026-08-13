import { useState, useEffect, useRef } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";

export function ChatSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { connected, sendChat, chatMessages } = useNetworkStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && connected) {
        if (isOpen && inputValue.trim()) {
          sendChat(inputValue.trim());
          setInputValue("");
          setIsOpen(false);
        } else if (!isOpen) {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setInputValue("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, inputValue, connected, sendChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!connected) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: 20,
        width: 300,
        zIndex: 150,
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      {/* Messages */}
      <div
        style={{
          maxHeight: 200,
          overflowY: "auto",
          marginBottom: 8,
          opacity: isOpen ? 1 : 0.7,
          transition: "opacity 0.2s",
        }}
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: "4px 8px",
              marginBottom: 2,
              background: "rgba(0,0,0,0.5)",
              borderRadius: 4,
              fontSize: 12,
              color: "white",
            }}
          >
            <span style={{ fontWeight: "bold", color: msg.team === "CT" ? "#60a5fa" : msg.team === "T" ? "#ef4444" : "#f59e0b" }}>
              {msg.sender}:{" "}
            </span>
            <span>{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isOpen && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          maxLength={100}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: 14,
            fontFamily: "monospace",
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            color: "white",
            outline: "none",
          }}
        />
      )}

      {/* Hint */}
      {!isOpen && (
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
            background: "rgba(0,0,0,0.3)",
            padding: "2px 6px",
            borderRadius: 3,
            display: "inline-block",
          }}
        >
          Press ENTER to chat
        </div>
      )}
    </div>
  );
}
