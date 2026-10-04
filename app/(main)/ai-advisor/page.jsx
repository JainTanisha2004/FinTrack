"use client";

import React, { useState, useRef, useEffect } from "react";
import { askFinancialAdvisor } from "@/actions/ai-advisor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Loader2, Sparkles, Cpu, CheckCircle2, FileText, Database, ShieldCheck } from "lucide-react";
import MemoryInspector from "./_components/memory-inspector";

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content:
        "Hello! I am your AI Financial Advisor powered by a Hybrid AI Retrieval Engine. I combine real-time SQL queries (for accurate balance, budgets, and transactions) with pgvector RAG memory (for long-term historical financial advice across months). How can I help you today?",
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
        {
          role: "ai",
          content: response.answer,
          intent: response.intent,
          ragUsed: response.ragUsed,
          citations: response.citations || [],
          metrics: response.metrics,
          fallbackActive: response.fallbackActive,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "Sorry, I encountered an error while processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-md text-white">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Financial Advisor
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                Hybrid SQL + RAG Architecture
              </span>
            </div>
            <p className="text-gray-500 font-medium text-xs md:text-sm">
              Structured SQL state + Long-term pgvector memory retrieval across months.
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="flex-1 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col relative">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-white scroll-smooth">
          {/* Memory Inspector Drawer */}
          <MemoryInspector />

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
                    : "bg-gradient-to-br from-purple-600 to-indigo-700 text-white"
                }`}
              >
                {m.role === "user" ? <User size={20} /> : <Bot size={20} />}
              </div>

              <div className={`max-w-[88%] sm:max-w-[80%] space-y-2`}>
                {/* Retrieval Badge header for AI response */}
                {m.role === "ai" && m.intent && (
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    {m.intent === "HYBRID_SQL_RAG" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                        <Cpu className="w-3.5 h-3.5 text-purple-600" />
                        Hybrid AI Memory (SQL + RAG)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        Structured SQL Search (Live Data)
                      </span>
                    )}

                    {m.fallbackActive && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                        RAG Fallback Active
                      </span>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`rounded-3xl p-4 sm:p-5 shadow-sm transition-all duration-300 ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm hover:shadow-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {m.content}
                  </div>

                  {/* Citations / Memory References */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-purple-100/60 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>Based on previous reports:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {m.citations.map((cite, cIdx) => (
                          <div
                            key={cIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-100 text-xs font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                            <span>{cite.title}</span>
                            {cite.similarity && (
                              <span className="text-[10px] text-purple-500 font-normal">
                                ({(cite.similarity * 100).toFixed(0)}% match)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metrics Subtext */}
                  {m.metrics && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                      <span>
                        Retrieved {m.metrics.retrievedDocCount || 0} memory docs in {m.metrics.vectorSearchMs || 0}ms
                      </span>
                      <span>Total latency: {m.metrics.totalDurationMs}ms</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={20} />
              </div>
              <div className="bg-white border border-gray-100 rounded-3xl rounded-tl-sm p-5 shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <span className="text-gray-500 font-medium text-sm">
                  Classifying intent & searching pgvector memory...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Example prompts */}
        {messages.length <= 2 && (
          <div className="px-4 sm:px-6 pb-4 flex flex-wrap gap-2 justify-center bg-white/50 backdrop-blur-sm border-t border-gray-50 pt-4">
            {[
              "What advice have you been giving me repeatedly?",
              "What mistakes have I repeated?",
              "How has my financial discipline improved?",
              "What did you recommend in May when I exceeded my budget?",
              "What is my current balance?",
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="text-xs bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 hover:border-purple-200 px-3.5 py-1.5 rounded-full transition-all duration-200 shadow-2xs font-medium"
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
              placeholder="Ask about current finances or past report history..."
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