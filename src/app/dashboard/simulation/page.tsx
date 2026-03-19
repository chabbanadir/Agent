'use client';

import React, { useState } from 'react';
import { Bot, Send, Terminal, Cpu, Zap, Radio, Loader2, MessageSquare, AlertCircle, ChevronRight, Play } from 'lucide-react';

export default function SimulationPage() {
    const [sender, setSender] = useState('customer@example.com');
    const [message, setMessage] = useState('I need help with my screen repair, what are your hours?');
    const [isSimulating, setIsSimulating] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'response' | 'trace' | 'raw'>('response');

    const handleSimulate = async () => {
        setIsSimulating(true);
        setResult(null);
        try {
            const res = await fetch('/api/simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender, message })
            });
            const data = await res.json();
            setResult(data);
            setActiveTab('response');
        } catch (error) {
            console.error("Simulation failed:", error);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in text-white pb-24 max-w-7xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2 flex items-center gap-4">
                        <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Cpu size={32} />
                        </div>
                        Neural Simulation Lab
                    </h1>
                    <p className="text-slate-500 font-medium">Test agent intelligence with synthetic multi-channel triggers.</p>
                </div>
                <div className="px-5 py-2 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Environment: Dev-SandBox</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left: Configuration Form */}
                <div className="lg:col-span-5 space-y-8">
                    <section className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800/50 shadow-2xl space-y-8 relative overflow-hidden group">
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">
                                <Radio size={14} />
                                Input Parameters
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Mock Sender Email</label>
                                    <input
                                        type="text"
                                        value={sender}
                                        onChange={(e) => setSender(e.target.value)}
                                        onFocus={(e) => {
                                            if (sender === 'customer@example.com') {
                                                setSender('');
                                            }
                                        }}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Simulated Message Body</label>
                                    <textarea
                                        rows={6}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onFocus={(e) => {
                                            if (message === 'I need help with my screen repair, what are your hours?') {
                                                setMessage('');
                                            }
                                        }}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSimulate}
                                disabled={isSimulating}
                                className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group/btn"
                            >
                                {isSimulating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>SYNTHESIZING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={20} className="fill-current group-hover/btn:scale-110 transition-transform" />
                                        <span>RUN SIMULATION</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full -mr-16 -mt-16" />
                    </section>

                    <section className="p-8 rounded-[2rem] bg-slate-900/30 border border-dashed border-slate-800 space-y-4 opacity-70">
                        <div className="flex items-start gap-4 text-slate-400">
                            <AlertCircle size={20} className="mt-1 flex-shrink-0" />
                            <p className="text-xs leading-relaxed font-medium">
                                Simulations run against your <span className="text-indigo-400">active agent configuration</span> but will not send actual emails or WhatsApp messages. Traces are not saved to production history.
                            </p>
                        </div>
                    </section>
                </div>

                {/* Right: Results & Traversal */}
                <div className="lg:col-span-7">
                    {!result && !isSimulating ? (
                        <div className="h-full flex flex-col items-center justify-center p-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] text-center space-y-6">
                            <div className="w-20 h-20 bg-slate-800/30 rounded-3xl flex items-center justify-center text-slate-600">
                                <Terminal size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-400">Awaiting Simulation Input</h3>
                                <p className="text-sm text-slate-600 max-w-xs mx-auto mt-2">Configure parameters and run the simulation to begin neural traversal analysis.</p>
                            </div>
                        </div>
                    ) : isSimulating ? (
                        <div className="h-full flex flex-col items-center justify-center p-20 bg-slate-900/40 rounded-[3rem] text-center space-y-8 animate-pulse">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                                <Bot className="absolute inset-0 m-auto text-indigo-500" size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white tracking-widest uppercase">Initializing Cognitive Engine</h3>
                                <div className="flex gap-1 justify-center">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-4 h-1 bg-indigo-500/30 rounded animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Result Header */}
                            <div className="p-8 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                                        <Zap size={24} />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Execution Success</h3>
                                </div>
                                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                    {(['response', 'trace', 'raw'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Result Content */}
                            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                                {activeTab === 'response' && (
                                    <div className="space-y-8 animate-in fade-in duration-300">
                                        <section className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 ml-1">Generated Neural Response</h4>
                                            <div className="p-8 bg-slate-950/80 border border-indigo-500/20 rounded-[2.5rem] text-slate-200 text-sm leading-relaxed whitespace-pre-wrap shadow-xl">
                                                {result.response}
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-1">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Latency</p>
                                                <p className="text-sm font-bold text-emerald-400">~1.4s</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-1">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Compute Cost</p>
                                                <p className="text-sm font-bold text-indigo-400">Tokens: Local-SandBox</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'trace' && (
                                    <div className="space-y-10 animate-in fade-in duration-300">
                                        <section className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-3">
                                                <span className="w-8 h-px bg-emerald-500/30" />
                                                Agent Thought Process
                                            </h4>
                                            <div className="space-y-4">
                                                {result?.trace?.messages?.filter((m: any) => m.role === 'thought' || m.role === 'system_thought').map((m: any, i: number) => (
                                                    <div key={i} className="flex gap-4 group">
                                                        <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:scale-150 transition-transform" />
                                                        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-300 text-xs leading-relaxed italic opacity-90 transition-all hover:border-emerald-500/30">
                                                            {m.content}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!result?.trace?.messages || result.trace.messages.filter((m: any) => m.role === 'thought' || m.role === 'system_thought').length === 0) && (
                                                    <p className="text-slate-600 text-xs italic ml-6">Internal reasoning logs aggregated in unified state bridge.</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 flex items-center gap-3">
                                                <span className="w-8 h-px bg-amber-500/30" />
                                                External Actions (Tools)
                                            </h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                {result?.trace?.messages?.filter((m: any) => m.tool_calls).map((m: any, i: number) => (
                                                    m.tool_calls?.map((tc: any, j: number) => (
                                                        <div key={`${i}-${j}`} className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 group hover:border-amber-500/30 transition-all">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                                        <Zap size={16} />
                                                                    </div>
                                                                    <span className="font-mono text-sm font-bold text-white tracking-tight">{tc.function?.name || 'unknown_tool'}</span>
                                                                </div>
                                                                <span className="p-1 px-3 bg-amber-500/10 text-[8px] font-black text-amber-500 rounded-full uppercase tracking-tighter">SUCCESSFUL_INVOCATION</span>
                                                            </div>
                                                            <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] text-slate-500 overflow-x-auto whitespace-pre">
                                                                {tc.function?.arguments}
                                                            </div>
                                                        </div>
                                                    ))
                                                ))}
                                                {(!result?.trace?.messages || result.trace.messages.filter((m: any) => m.tool_calls).length === 0) && (
                                                    <p className="text-slate-600 text-xs italic ml-6">No tools were invoked during this simulation.</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'raw' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="bg-slate-950 rounded-[2rem] p-8 border border-slate-800 text-slate-500 font-mono text-[10px] leading-tight whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                                            {JSON.stringify(result.trace, null, 2)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
