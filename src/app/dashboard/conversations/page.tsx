'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, User, Bot, Search, Loader2, Calendar } from 'lucide-react';

export default function ConversationsPage() {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedThread, setExpandedThread] = useState<string | null>(null);
    const [selectedTrace, setSelectedTrace] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchHistory = () => {
        fetch('/api/chat/history')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setThreads(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 10000);
        return () => clearInterval(interval);
    }, []);

    const filteredThreads = threads.filter(thread =>
        thread.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="space-y-12 animate-fade-in text-white pb-24 relative min-h-screen">
                <header>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight mb-2">Internalized Conversations</h1>
                            <p className="text-slate-500">Professional multi-channel interaction monitoring & telemetry.</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Real-time</span>
                        </div>
                    </div>
                </header>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input
                        type="text"
                        placeholder="Search threads, senders, or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-3xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                    />
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-24">
                            <Loader2 className="animate-spin text-indigo-500" size={40} />
                        </div>
                    ) : filteredThreads.length > 0 ? (
                        filteredThreads.map((thread) => (
                            <div key={thread.id} className="group transition-all">
                                <div
                                    onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}
                                    className={`p-8 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${expandedThread === thread.id
                                        ? 'bg-slate-900/80 border-indigo-500/50 shadow-2xl shadow-indigo-500/10 scale-[1.01]'
                                        : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700 hover:bg-slate-900/60'
                                        }`}>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${thread.source === 'email' ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20'
                                                }`}>
                                                <MessageSquare size={28} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <p className="font-black text-xl text-white tracking-tight">{thread.sender}</p>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700/50 shadow-inner">
                                                        {thread.source}
                                                    </span>
                                                    {thread.count > 1 && (
                                                        <span className="px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-lg shadow-indigo-500/20">
                                                            {thread.count} REPLIES
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 font-medium line-clamp-1 opacity-60 mt-1 max-w-xl">
                                                    {thread.lastMessage.content}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                                {new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="flex items-center gap-3 justify-end">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Status</span>
                                                {thread.lastMessage.status === 'COMPLETED' ? (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                                                ) : thread.lastMessage.status === 'FAILED' ? (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                fetch('/api/chat/reset', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ threadId: thread.id })
                                                                }).then(() => fetchHistory());
                                                            }}
                                                            className="text-[8px] font-black uppercase text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                                                        >
                                                            Reset
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {expandedThread === thread.id && (
                                        <div className="mt-10 pt-10 border-t border-slate-800/50 space-y-10 animate-slide-up">
                                            {thread.messages.map((msg: any, idx: number) => (
                                                <div key={msg.id} className="flex flex-col space-y-3">
                                                    <div className={`flex items-start gap-4 ${msg.role === 'assistant' ? 'flex-row' : 'flex-row'}`}>
                                                        <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 shadow-xl ${msg.role === 'assistant' ? 'bg-indigo-600 text-white border border-indigo-400/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                            }`}>
                                                            {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-xs font-black uppercase tracking-widest ${msg.role === 'assistant' ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                                    {msg.role === 'assistant' ? 'AgentClaw Autonomous Unit' : msg.sender}
                                                                </span>
                                                                <span className="text-[10px] text-slate-700 font-bold uppercase tracking-tighter">
                                                                    {new Date(msg.createdAt).toLocaleString()}
                                                                </span>
                                                                {msg.trace && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedTrace(msg.trace);
                                                                        }}
                                                                        className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all ml-auto"
                                                                    >
                                                                        Analyze Trace
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className={`p-6 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap relative group/bubble ${msg.role === 'assistant'
                                                                ? 'bg-slate-950/80 border border-indigo-500/20 text-slate-200 shadow-xl'
                                                                : 'bg-indigo-900/10 border border-indigo-500/10 text-slate-300'
                                                                }`}>
                                                                {msg.content}
                                                                {msg.role === 'assistant' && (
                                                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/bubble:opacity-100 transition-opacity">
                                                                        <Bot size={14} className="text-indigo-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Decor */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-32 -mt-32 transition-colors group-hover:bg-indigo-500/10" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-32 text-center bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-60 backdrop-blur-sm">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <MessageSquare size={40} className="text-slate-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-400 mb-2">Neural Silence</h3>
                            <p className="text-slate-600 font-medium italic tracking-tight">No active threads found. All quiet in the cognitive network.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Telemetry Modal - Redesigned as a Centered Card */}
            {selectedTrace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-5xl w-full max-h-[90vh] flex flex-col space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between pb-6 border-b border-slate-800 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Execution Intelligence</h2>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Neural Trace: v4.2 stable</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="hidden md:flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Compute</p>
                                        <p className="text-sm font-bold text-indigo-400">~1,240 tokens</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Latency</p>
                                        <p className="text-sm font-bold text-emerald-400">2.4s</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTrace(null)}
                                    className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black transition-all border border-slate-700/50 shadow-xl"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Intelligence Area */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-12 relative z-10">

                            {/* Base Instruction */}
                            <section className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Base Instruction Context</label>
                                <div className="p-8 bg-slate-950/80 border border-slate-800/50 rounded-[2rem] text-slate-400 text-xs leading-relaxed font-mono relative group">
                                    <p className="line-clamp-4 group-hover:line-clamp-none transition-all duration-500">
                                        {selectedTrace.systemPrompt || "Standard Autonomous Protocol v1.4.2 [Implicit] - Optimizing for high-intent conversion and neural clarity."}
                                    </p>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Reasoning Chain */}
                                <section className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Reasoning Traversal</label>
                                    <div className="space-y-3">
                                        {selectedTrace.messages?.filter((m: any) => m.role === 'thought' || m.role === 'system_thought').length > 0 ? (
                                            selectedTrace.messages.filter((m: any) => m.role === 'thought' || m.role === 'system_thought').map((m: any, i: number) => (
                                                <div key={i} className="p-5 bg-slate-950 border-l-2 border-emerald-500/50 rounded-r-2xl text-slate-300 text-xs leading-relaxed italic">
                                                    {m.content}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-5 bg-slate-950 border-l-2 border-slate-800 rounded-r-2xl text-slate-500 text-xs italic">
                                                Internal reasoning logs aggregated in unified state bridge.
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Tool Invocations */}
                                <section className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Active Tool Calls</label>
                                    <div className="space-y-4">
                                        {selectedTrace.messages?.filter((m: any) => m.tool_calls).length > 0 ? (
                                            selectedTrace.messages.filter((m: any) => m.tool_calls).map((m: any, i: number) => (
                                                m.tool_calls.map((tc: any, j: number) => (
                                                    <div key={`${i}-${j}`} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-mono text-xs font-bold text-indigo-400">{tc.function?.name || 'unknown_tool'}</span>
                                                            <span className="text-[8px] text-slate-600 font-black tracking-widest uppercase">INVOKED</span>
                                                        </div>
                                                        <div className="bg-black/40 rounded-xl p-3 font-mono text-[10px] text-slate-500 overflow-x-auto">
                                                            {tc.function?.arguments}
                                                        </div>
                                                    </div>
                                                ))
                                            ))
                                        ) : (
                                            <div className="p-8 border border-dashed border-slate-800 rounded-[2rem] text-center">
                                                <p className="text-[10px] text-slate-600 font-black uppercase">No Tools Required</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Raw Context */}
                            <section className="space-y-4 pt-6">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Unified Execution Context (Full API Data)</label>
                                <div className="bg-slate-950 rounded-[2rem] p-8 border border-slate-800 text-slate-500 font-mono text-[10px] leading-tight whitespace-pre-wrap overflow-x-auto custom-scrollbar max-h-96">
                                    {JSON.stringify(selectedTrace, null, 2)}
                                </div>
                            </section>
                        </div>

                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                    </div>
                </div>
            )}
        </>
    );
}
