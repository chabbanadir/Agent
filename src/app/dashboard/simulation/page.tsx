'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Send, Terminal, Cpu, Zap, Radio, Loader2, MessageSquare, AlertCircle, ChevronRight, Play, History, Clock, BrainCircuit } from 'lucide-react';

export default function SimulationPage() {
    const [sender, setSender] = useState('customer@example.com');
    const [message, setMessage] = useState('I need help with my screen repair, what are your hours?');
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [isSimulating, setIsSimulating] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'response' | 'trace' | 'raw'>('response');
    const [history, setHistory] = useState<any[]>([]);
    const [steps, setSteps] = useState<{ node: string; message: string; timestamp: number }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [agentsRes, historyRes] = await Promise.all([
                    fetch('/api/agents'),
                    fetch('/api/simulation')
                ]);
                const agentsData = await agentsRes.json();
                const historyData = await historyRes.json();

                const agentsList = Array.isArray(agentsData) ? agentsData : [agentsData];
                setAgents(agentsList);
                if (agentsList.length > 0 && !selectedAgentId) {
                    setSelectedAgentId(agentsList[0].id);
                }
                setHistory(Array.isArray(historyData) ? historyData : []);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();
    }, []);

    const handleSimulate = async () => {
        setIsSimulating(true);
        setResult(null);
        setSteps([]);
        try {
            const response = await fetch('/api/simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender, message, agentId: selectedAgentId })
            });

            if (!response.body) throw new Error('No body in response');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let partialData = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                partialData += decoder.decode(value, { stream: true });
                const lines = partialData.split('\n\n');
                partialData = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'progress') {
                                setSteps(prev => [...prev, { node: data.node, message: data.message, timestamp: Date.now() }]);
                            } else if (data.type === 'done') {
                                setResult(data);
                                setActiveTab('response');
                            } else if (data.type === 'error') {
                                console.error("Stream error:", data.message);
                            }
                        } catch (e) {
                            console.error("Parse error in stream:", e);
                        }
                    }
                }
            }

            // Refresh history after completion
            const historyRes = await fetch('/api/simulation');
            const historyData = await historyRes.json();
            setHistory(Array.isArray(historyData) ? historyData : []);
        } catch (error) {
            console.error("Simulation failed:", error);
        } finally {
            setIsSimulating(false);
        }
    };

    const loadHistoryItem = (item: any) => {
        setResult({
            response: item.output,
            latency: `${item.latency?.toFixed(2)}s`,
            usage: item.tokens,
            trace: item.trace
        });
        setMessage(item.input);
        setSender(item.sender);
        setSelectedAgentId(item.agentId);
        setActiveTab('response');
    };

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="space-y-10 animate-fade-in text-white pb-24 max-w-[1600px] mx-auto px-4">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2 flex items-center gap-4">
                        <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Cpu size={32} />
                        </div>
                        Neural Simulation Lab
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight">Enterprise synthetic intent orchestration & cognitive traversal.</p>
                </div>
                <div className="px-5 py-2 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3 shadow-xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Environment: Dev-SandBox</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[750px]">
                {/* Left: Input (4 cols) */}
                <div className="lg:col-span-3 space-y-6 flex flex-col">
                    <section className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800/50 shadow-2xl flex-1 flex flex-col space-y-6 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2 mb-6">
                                <Radio size={14} />
                                Configuration
                            </h3>

                            <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Simulated Sender</label>
                                    <input
                                        type="text"
                                        value={sender}
                                        onChange={(e) => setSender(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Orchestration Model</label>
                                    <div className="relative group/select">
                                        <select
                                            value={selectedAgentId}
                                            onChange={(e) => setSelectedAgentId(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                        >
                                            {agents.map((agent) => (
                                                <option key={agent.id} value={agent.id}>{agent.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                            <ChevronRight size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                    {selectedAgent && (
                                        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 mt-2">
                                            <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Active Config</p>
                                            <p className="text-[10px] text-indigo-300 font-bold truncate">{selectedAgent.provider} / {selectedAgent.model}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Neural Trigger (Input)</label>
                                    <textarea
                                        rows={8}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 transition-all font-bold resize-none placeholder:text-slate-700"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSimulate}
                                disabled={isSimulating}
                                className="w-full mt-6 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group/btn hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isSimulating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>SYNTHESIZING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} className="fill-current group-hover/btn:scale-110 transition-transform" />
                                        <span>INVOKE NEURAL ENGINE</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </section>
                </div>

                {/* Middle: Results (6 cols) */}
                <div className="lg:col-span-6 flex flex-col">
                    {!result && !isSimulating ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] text-center space-y-6">
                            <div className="w-20 h-20 bg-slate-800/30 rounded-[2rem] flex items-center justify-center text-slate-600 outline outline-4 outline-slate-800/20">
                                <Terminal size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-400 tracking-tight">Awaiting Neural Stimulus</h3>
                                <p className="text-xs text-slate-600 max-w-xs mx-auto mt-2 leading-relaxed">Configure the orchestration parameters and invoke the engine to begin cognitive traversal analysis.</p>
                            </div>
                        </div>
                    ) : isSimulating ? (
                        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl relative p-10 space-y-8">
                            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative group">
                                        <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                                        <div className="w-12 h-12 rounded-2xl border-2 border-indigo-500/30 border-t-indigo-500 animate-spin relative z-10 flex items-center justify-center">
                                            <Bot className="text-indigo-500 -rotate-45" size={20} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-white tracking-widest uppercase">Neural Synthesis active</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Consulting {selectedAgent?.name || 'Cognitive Engine'}...</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                    STEP_ID: SYS_{steps.length + 1}
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                {steps.map((step, i) => (
                                    <div key={i} className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex gap-4 animate-in slide-in-from-bottom-4 duration-300">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-mono text-xs font-black shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{step.node}</span>
                                                <span className="text-[8px] text-slate-600 font-mono italic">+{((step.timestamp - (steps[i - 1]?.timestamp || steps[0].timestamp)) / 1000).toFixed(1)}s</span>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate font-medium">{step.message}</p>
                                        </div>
                                    </div>
                                ))}
                                {steps.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4">
                                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="w-1/2 h-full bg-indigo-500 animate-slide-infinite" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Calibrating Sensors...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl relative">
                            <div className="absolute inset-0 bg-slate-900/40 pointer-events-none" />
                            {/* Header */}
                            <div className="p-6 md:p-8 border-b border-slate-800/50 bg-slate-950 relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-lg glow-indigo-500/20">
                                        <Zap size={20} />
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Agent Output</h3>
                                </div>
                                <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 shadow-inner group-hover:border-slate-700 transition-all">
                                    {(['response', 'trace', 'raw'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab
                                                ? 'bg-indigo-600 text-white shadow-xl translate-y-[-1px]'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar relative z-10">
                                {activeTab === 'response' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <section className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400">Response Manifest</h4>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                                                    <Clock size={10} /> Verified At {new Date().toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="p-8 bg-slate-900/60 border border-white/5 rounded-[2.5rem] text-slate-200 text-sm leading-[1.7] whitespace-pre-wrap shadow-2xl backdrop-blur-sm relative group overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                {result.response}
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2 group/metric hover:border-emerald-500/30 transition-all">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover/metric:text-emerald-400 transition-colors">Execution Latency</p>
                                                <p className="text-xl font-black text-white tracking-tighter">{result.latency || "~1.4s"}</p>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2 group/metric hover:border-indigo-500/30 transition-all">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover/metric:text-indigo-400 transition-colors">Neural Token Cycles</p>
                                                <p className="text-xl font-black text-white tracking-tighter">
                                                    {result.usage && result.usage.total_tokens > 0
                                                        ? `${result.usage.prompt_tokens}P / ${result.usage.completion_tokens}C`
                                                        : "OpenRouter / Adaptive"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'trace' && (
                                    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <section className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                    <BrainCircuit size={16} />
                                                </div>
                                                Cognitive Reasoning Path
                                            </h4>
                                            <div className="space-y-6 relative ml-4 pl-8 border-l border-slate-800/50">
                                                {result?.trace?.messages?.filter((m: any) => m.role === 'thought' || m.role === 'system_thought').map((m: any, i: number) => (
                                                    <div key={i} className="relative group">
                                                        <div className="absolute -left-11 top-2 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform">
                                                            {i + 1}
                                                        </div>
                                                        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-300 text-xs leading-relaxed italic opacity-90 transition-all hover:bg-slate-900 hover:border-emerald-500/30">
                                                            {m.content}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!result?.trace?.messages || result.trace.messages.filter((m: any) => m.role === 'thought' || m.role === 'system_thought').length === 0) && (
                                                    <div className="p-6 bg-slate-950 border border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs text-center border-emerald-500/20">
                                                        Deep cognitive logs are protected in unified state bridge.
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'raw' && (
                                    <div className="animate-in fade-in zoom-in-95 duration-500 h-full">
                                        <div className="h-full bg-slate-900 rounded-3xl p-8 border border-slate-800 text-indigo-300/60 font-mono text-[10px] leading-relaxed whitespace-pre-wrap overflow-x-auto custom-scrollbar shadow-inner">
                                            {JSON.stringify(result.trace, null, 2)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: History (3 cols) */}
                <div className="lg:col-span-3">
                    <section className="h-full rounded-[2.5rem] bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl flex flex-col p-6 space-y-6 overflow-hidden">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 mb-2">
                            <History size={16} className="text-slate-500" />
                            Simulation History
                        </h2>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {history.length > 0 ? history.map((item, i) => (
                                <button
                                    key={item.id}
                                    onClick={() => loadHistoryItem(item)}
                                    className="w-full text-left p-4 rounded-2xl bg-slate-900 border border-slate-800/50 hover:border-indigo-500/40 transition-all group animate-in slide-in-from-right-4 duration-300"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                                        <span className="text-[8px] font-bold text-indigo-400 group-hover:translate-x-1 transition-transform tracking-widest">DETAILS →</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-300 line-clamp-2 leading-tight group-hover:text-white transition-colors">{item.input}</p>
                                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
                                        <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                                            <Zap size={10} />
                                            {item.latency?.toFixed(1)}s
                                        </div>
                                        <div className="text-slate-600 text-[9px] font-black uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded-full">
                                            {item.tokens?.total_tokens || 0} T
                                        </div>
                                    </div>
                                </button>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-[2rem] opacity-40">
                                    <History size={32} className="mb-4 text-slate-600" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Simulated Vaults Found</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
