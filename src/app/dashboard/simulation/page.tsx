'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Send, Terminal, Cpu, Zap, Radio, Loader2, MessageSquare, AlertCircle, ChevronRight, Play, History, Clock, BrainCircuit } from 'lucide-react';

export default function SimulationPage() {
    const [sender, setSender] = useState('customer@example.com');
    const [message, setMessage] = useState('I need help with my screen repair, what are your hours?');
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [selectedChannel, setSelectedChannel] = useState<string>('WEB');
    const [isSimulating, setIsSimulating] = useState(false);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'response' | 'trace' | 'raw'>('response');
    const [history, setHistory] = useState<any[]>([]);
    const [steps, setSteps] = useState<{ node: string; message: string; timestamp: number }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // First fetch agents if not already loaded
                if (agents.length === 0) {
                    const agentsRes = await fetch('/api/agents');
                    const agentsData = await agentsRes.json();
                    const agentsList = Array.isArray(agentsData) ? agentsData : [agentsData];
                    setAgents(agentsList);
                    if (agentsList.length > 0 && !selectedAgentId) {
                        setSelectedAgentId(agentsList[0].id);
                        return; // Let the next effect run with the new selectedAgentId
                    }
                }

                // Fetch history with optional agent filter
                const historyUrl = selectedAgentId
                    ? `/api/simulation?agentId=${selectedAgentId}`
                    : '/api/simulation';

                const historyRes = await fetch(historyUrl);
                const historyData = await historyRes.json();
                setHistory(Array.isArray(historyData) ? historyData : []);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();

        let interval: NodeJS.Timeout;
        if (isMonitoring) {
            interval = setInterval(fetchData, 5000);
        }
        return () => clearInterval(interval);
    }, [isMonitoring, selectedAgentId]);

    const handleSimulate = async () => {
        setIsSimulating(true);
        setResult(null);
        setSteps([]);
        try {
            const response = await fetch('/api/simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender, message, agentId: selectedAgentId, channel: selectedChannel })
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
            const historyRes = await fetch(`/api/simulation${selectedAgentId ? `?agentId=${selectedAgentId}` : ''}`);
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
        <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden space-y-6 text-white pb-6">
            <header className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 italic uppercase">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Bot size={24} className="text-indigo-500" />
                        </div>
                        Neural <span className="text-indigo-500">Simulation</span> Lab
                    </h1>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em] mt-1 ml-1">Enterprise synthetic intent orchestration & cognitive traversal.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMonitoring(!isMonitoring)}
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${isMonitoring
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                        {isMonitoring ? 'Monitoring Active' : 'Start Live Monitoring'}
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Environment: Dev-Sandbox</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0 flex gap-6">
                {/* Left: Configuration */}
                <div className="w-1/4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    <section className="p-8 rounded-[2rem] bg-slate-900/40 border border-slate-800/50 space-y-8 backdrop-blur-xl relative overflow-hidden group shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <MessageSquare className="text-indigo-500" size={18} />
                            <h2 className="text-xs font-black uppercase tracking-widest text-white">Configuration</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Simulated Sender</label>
                                <input
                                    type="text"
                                    value={sender}
                                    onChange={(e) => setSender(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition-all font-mono"
                                    placeholder="Enter sender email/name..."
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Orchestration Model</label>
                                <div className="relative group/select">
                                    <select
                                        value={selectedAgentId || ''}
                                        onChange={(e) => setSelectedAgentId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Agent...</option>
                                        {agents.map((a: any) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover/select:text-indigo-500 transition-colors">
                                        <Bot size={14} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Target Channel</label>
                                <select
                                    value={selectedChannel}
                                    onChange={(e) => setSelectedChannel(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="WEB">WEB (Default)</option>
                                    <option value="EMAIL">EMAIL</option>
                                    <option value="WHATSAPP">WHATSAPP</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Neural Trigger (Input)</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full h-80 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[13px] text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-mono leading-relaxed resize-none custom-scrollbar"
                                    placeholder="Type the message to simulate..."
                                />
                            </div>

                            <button
                                onClick={handleSimulate}
                                disabled={isSimulating || !message}
                                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/10 group active:scale-[0.98]"
                            >
                                {isSimulating ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <Zap size={18} className="fill-white" />
                                        Invoke Neural Engine
                                    </>
                                )}
                            </button>
                        </div>
                    </section>
                </div>

                {/* Middle: Results */}
                <div className="flex-1 flex flex-col min-w-0">
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

                            <div className="flex items-center justify-between shrink-0">
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
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl relative">
                            {/* Result Header */}
                            <div className="p-6 md:p-8 border-b border-slate-800/50 bg-slate-950 relative z-10 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-lg glow-indigo-500/20">
                                        <Zap size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black uppercase tracking-tight leading-none">Agent Output</h3>
                                        {result?.trace?.isEscalation && (
                                            <span className="text-[8px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-md uppercase tracking-[0.2em] mt-1.5 animate-pulse">
                                                🚨 Escalated to Manager
                                            </span>
                                        )}
                                    </div>
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

                            {/* Result Content */}
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10">
                                {activeTab === 'response' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <section className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400">Response Manifest</h4>
                                                <span className="text-[8px] font-bold text-slate-600 uppercase flex items-center gap-1.5 font-mono">
                                                    <Clock size={10} /> {new Date().toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="p-8 bg-slate-900/60 border border-white/5 rounded-[2.5rem] text-slate-200 text-base leading-[1.7] whitespace-pre-wrap shadow-2xl backdrop-blur-sm relative group overflow-hidden font-medium">
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
                                                {result?.trace?.messages?.filter((m: any) => m.role === 'thought' || m.role === 'system_thought' || m.type === 'thought').map((m: any, i: number) => (
                                                    <div key={i} className="relative group">
                                                        <div className="absolute -left-11 top-2 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform">
                                                            {i + 1}
                                                        </div>
                                                        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-300 text-[13px] leading-relaxed italic opacity-90 transition-all hover:bg-slate-900 hover:border-emerald-500/30">
                                                            {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'raw' && (
                                    <div className="animate-in fade-in zoom-in-95 duration-500 h-full">
                                        <div className="h-full bg-slate-900 rounded-3xl p-8 border border-slate-800 text-indigo-300/60 font-mono text-[10px] leading-relaxed whitespace-pre-wrap overflow-x-auto custom-scrollbar shadow-inner">
                                            {JSON.stringify(result.trace || result, null, 2)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: History */}
                <div className="w-1/4 flex flex-col">
                    <section className="h-full rounded-[2.5rem] bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl flex flex-col p-6 space-y-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-2 shrink-0">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                <History size={16} className="text-slate-500" />
                                Simulation History
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {history.length > 0 ? history.map((item, i) => (
                                <button
                                    key={item.id}
                                    onClick={() => loadHistoryItem(item)}
                                    className="w-full text-left p-4 rounded-2xl bg-slate-900 border border-slate-800/50 hover:border-indigo-500/40 transition-all group animate-in slide-in-from-right-4 duration-300"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 shrink-0">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {item.isReal && (
                                                <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0">LIVE ACTIVITY</span>
                                            )}
                                        </div>
                                        <span className="text-[8px] font-bold text-indigo-400 group-hover:translate-x-1 transition-transform tracking-widest">LOAD →</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-300 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                                        {item.sender?.split('<')[0] || 'Unknown'}: {item.input}
                                    </p>
                                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/50 pt-3">
                                        <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                                            <Zap size={10} />
                                            {item.latency ? `${item.latency.toFixed(1)}s` : 'N/A'}
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
