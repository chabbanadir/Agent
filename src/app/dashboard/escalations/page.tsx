"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, MessageSquare, Send, User, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Escalation {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
  status: string;
  threadId: string;
  tenant: { name: string };
}

export default function EscalationPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/escalations")
      .then((res) => res.json())
      .then((data) => {
        setEscalations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/escalations", {
        method: "POST",
        body: JSON.stringify({ messageId: selectedId, replyContent: reply }),
      });
      if (res.ok) {
        setEscalations(escalations.filter((e) => e.id !== selectedId));
        setSelectedId(null);
        setReply("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Manager Escalations
            </h1>
            <p className="text-slate-400 mt-2">Human-in-the-loop interventions for complex inquiries</p>
          </div>
          <div className="flex gap-4">
            <span className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400" />
              {escalations.length} Pending
            </span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* List */}
            <div className="space-y-4">
              <AnimatePresence>
                {escalations.map((esc) => (
                  <motion.div
                    key={esc.id}
                    layoutId={esc.id}
                    onClick={() => setSelectedId(esc.id)}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer group ${
                      selectedId === esc.id 
                        ? "bg-slate-900 border-blue-500/50 shadow-lg shadow-blue-500/10" 
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <User size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-100">{esc.sender}</h3>
                          <p className="text-xs text-slate-500">
                            {new Date(esc.createdAt).toLocaleString()} • {esc.tenant.name}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 italic">
                      "{esc.content.substring(0, 150)}..."
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {escalations.length === 0 && !loading && (
                <div className="text-center py-20 border-2 border-dashed border-slate-900 rounded-3xl">
                  <CheckCircle size={48} className="mx-auto text-green-500/50 mb-4" />
                  <p className="text-slate-500 font-medium">Clear! No pending escalations.</p>
                </div>
              )}
            </div>

            {/* Detail & Reply */}
            <div className="sticky top-8 self-start">
              <AnimatePresence mode="wait">
                {selectedId ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-8 overflow-hidden shadow-2xl relative"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10" />
                    
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <MessageSquare className="text-blue-400" />
                      Client Inquiry
                    </h2>
                    
                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 mb-8">
                       <p className="text-slate-200 leading-relaxed whitespace-pre-wrap whitespace-normal break-words overflow-auto">
                        {escalations.find(e => e.id === selectedId)?.content}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-medium text-slate-400">Response to Client</label>
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Craft the final answer here..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[160px] focus:outline-none focus:border-blue-500 transition-colors text-slate-200"
                      />
                      <button
                        onClick={handleReply}
                        disabled={submitting || !reply.trim()}
                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        {submitting ? (
                          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                        ) : (
                          <>
                            <Send size={18} />
                            Send to Client
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-20 border border-slate-900 rounded-3xl bg-slate-900/20">
                     <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center mb-6">
                        <MessageSquare className="text-slate-700" size={32} />
                     </div>
                     <p className="text-slate-500">Select an escalation to review and provide an answer.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
