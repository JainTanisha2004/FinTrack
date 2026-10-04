"use client";

import React, { useState, useEffect } from "react";
import { fetchUserMemories, deleteUserMemory, seedSampleHistoricalMemories } from "@/actions/ai-memory";
import { Database, Trash2, Sparkles, RefreshCw, Cpu, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MemoryInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const res = await fetchUserMemories();
      if (res.success) {
        setMemories(res.memories);
      } else {
        toast.error("Failed to load memories: " + res.error);
      }
    } catch (err) {
      toast.error("Error loading memories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await seedSampleHistoricalMemories();
      if (res.success) {
        toast.success(`Successfully seeded ${res.count} historical memory documents!`);
        await loadMemories();
      } else {
        toast.error("Seeding failed: " + res.error);
      }
    } catch (err) {
      toast.error("Error seeding sample memories");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDelete = async (id, title) => {
    try {
      const res = await deleteUserMemory(id);
      if (res.success) {
        toast.success(`Deleted '${title}'`);
        setMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        toast.error("Delete failed: " + res.error);
      }
    } catch (err) {
      toast.error("Error deleting memory");
    }
  };

  return (
    <div className="w-full mb-4">
      <div className="flex items-center justify-between bg-purple-50/70 border border-purple-100 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 text-white rounded-xl shadow-sm">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-purple-900 uppercase tracking-wider">
              PostgreSQL Vector Memory (pgvector)
            </h3>
            <p className="text-xs text-purple-600 font-medium">
              {memories.length > 0
                ? `${memories.length} AI Knowledge Documents Embedded (3072 dims)`
                : "Hybrid RAG Memory Active"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={isSeeding}
            className="text-xs border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl gap-1.5 shadow-sm"
          >
            {isSeeding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            )}
            Seed Test History
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-purple-700 hover:bg-purple-100 rounded-xl"
          >
            <Database className="w-3.5 h-3.5 mr-1" />
            {isOpen ? "Hide Inspector" : "Inspect Vector DB"}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl space-y-4 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Indexed Memory Documents (HNSW pgvector)
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadMemories}
              disabled={isLoading}
              className="text-xs text-slate-400 hover:text-white h-7 px-2"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading vector embeddings from PostgreSQL...</div>
          ) : memories.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300">No memory documents stored yet.</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Click <strong>&quot;Seed Test History&quot;</strong> above to generate sample reports, insights, and budget alerts across past months.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {mem.documentType}
                      </span>
                      {mem.month && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-700 text-slate-300">
                          {mem.month}
                        </span>
                      )}
                      <span className="text-slate-200 font-semibold">{mem.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{mem.content}</p>
                  </div>

                  <button
                    onClick={() => handleDelete(mem.id, mem.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                    title="Delete Memory Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
