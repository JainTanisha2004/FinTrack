"use client";

import React, { useState, useRef, useEffect } from "react";
import { askFinancialAdvisor } from "@/actions/ai-advisor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Loader2, Sparkles } from "lucide-react";

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "Hello! I am your AI Financial Advisor. I can analyze your transactions, provide saving tips, or answer any financial questions you have based on your data. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await askFinancialAdvisor(userMessage);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: response.answer },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "Sorry, I encountered an error. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-xl shadow-sm border border-white">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Financial Advisor
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">
            Get personalized financial insights based on your transaction history.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col relative">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-white scroll-smooth">
          {messages.map((m, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 sm:gap-4 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                    : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
                }`}
              >
                {m.role === "user" ? <User size={20} /> : <Bot size={20} />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-sm transition-all duration-300 ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm hover:shadow-md"
                }`}
              >
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={20} />
              </div>
              <div className="bg-white border border-gray-100 rounded-3xl rounded-tl-sm p-5 shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <span className="text-gray-500 font-medium">Analyzing your finances...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Example prompts */}
        {messages.length === 1 && (
          <div className="px-4 sm:px-6 pb-4 flex flex-wrap gap-2 justify-center bg-white/50 backdrop-blur-sm border-t border-gray-50 pt-4">
            {["How can I reduce my spending?", "Where am I wasting money?", "Give me saving tips.", "Can I buy a ₹20,000 phone?"].map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="text-xs sm:text-sm bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-100 hover:border-blue-200 px-4 py-2 rounded-full transition-all duration-200 shadow-sm hover:shadow"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your finances..."
              className="flex-1 py-7 pl-6 pr-14 text-base rounded-full bg-gray-50/50 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 border-gray-200 shadow-inner transition-all"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-10 w-10 flex items-center justify-center transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Send size={18} className="text-white" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}