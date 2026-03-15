"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { usePathname } from "next/navigation";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export function ChatPanel() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isHydrated,
    addMessage,
    loadMessages,
    clearMessages,
    setToolExecuting,
    addToolEvent,
    commitToolEvents,
    discardToolEvents,
  } = useChatStore();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // ページ情報を取得
  const getPageContext = (): string => {
    switch (pathname) {
      case "/":
      case "/dashboard":
        return "ダッシュボード - 売上統計、商品分析、AI提案を表示中";
      case "/orders":
        return "注文管理 - 注文一覧、検索、編集機能";
      case "/orders/new":
        return "新規注文作成 - 注文情報入力フォーム";
      case "/upload":
        return "CSVアップロード - ファイルアップロード、内容確認、一括取り込み";
      case "/settings":
        return "設定 - UI設定、通知設定、EC連携設定";
      case "/prompts":
        return "プロンプト管理 - AI設定、カスタムプロンプト";
      default:
        return `現在のページ: ${pathname}`;
    }
  };

  useEffect(() => {
    if (mounted) {
      loadMessages();
    }
  }, [mounted, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setIsLoading(true);
    // Mark tool execution start to suppress history reloads (improvement #1 & #3)
    setToolExecuting(true);

    // Add user message directly (not via tool event buffer)
    addMessage({
      id: Date.now().toString(),
      content: userMessage,
      role: "user",
      timestamp: new Date(),
    });

    try {
      // Get authentication tokens from cookies
      const sessionToken =
        document.cookie.split("session_token=")[1]?.split(";")[0] || "";
      const csrfToken =
        document.cookie.split("csrf_token=")[1]?.split(";")[0] || "";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": sessionToken,
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage,
          customerId: "default",
          pageContext: getPageContext(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Buffer error as tool event, then commit only final result (improvement #3)
        const errorMessage =
          data.response ||
          data.message ||
          "エラーが発生しました。もう一度お試しください。";
        addToolEvent({
          id: (Date.now() + 1).toString(),
          content: errorMessage,
          role: "assistant",
          timestamp: new Date(),
        });
        commitToolEvents();
        return;
      }

      // Buffer AI response as final tool event, then commit (improvement #3)
      addToolEvent({
        id: (Date.now() + 1).toString(),
        content: data.response || "AIからの応答がありません。",
        role: "assistant",
        timestamp: new Date(),
      });
      commitToolEvents();
    } catch (error) {
      console.error("Chat error:", error);
      addToolEvent({
        id: (Date.now() + 1).toString(),
        content: "エラーが発生しました。もう一度お試しください。",
        role: "assistant",
        timestamp: new Date(),
      });
      commitToolEvents();
    } finally {
      setIsLoading(false);
      // Ensure tool executing flag is cleared even if commitToolEvents wasn't called
      discardToolEvents();
    }
  };

  const handleClearChat = () => {
    if (confirm("会話履歴をすべて削除しますか？")) {
      clearMessages();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900">AI アシスタント</span>
        </div>
        <button
          onClick={handleClearChat}
          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          会話をクリア
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              農業システムについて何でもお聞きください
              <br />
              操作方法、エラー解決、データ分析など
            </p>
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p>💡 「CSVファイルのアップロード方法は？」</p>
              <p>💡 「エラーが出て困っています」</p>
              <p>💡 「売上データの見方を教えて」</p>
            </div>
          </div>
        ) : (
          <div suppressHydrationWarning>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 mb-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }
            `}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`
              max-w-[calc(100%-3rem)] rounded-lg px-3 py-2 text-sm
              ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }
            `}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div
                    className={`
                text-xs mt-1 opacity-70
                ${msg.role === "user" ? "text-primary-100" : "text-gray-500"}
              `}
                    suppressHydrationWarning
                  >
                    {msg.timestamp.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 input-field text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed p-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
