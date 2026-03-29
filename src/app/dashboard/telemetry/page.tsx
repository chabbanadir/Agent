'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Bot, Brain, ChevronDown, ChevronRight, Clock, Code2,
    Cpu, Filter, Loader2, MessageSquare, RefreshCw, Search,
    Sparkles, Terminal, Zap
} from 'lucide-react';

export default function TelemetryPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const url = selectedAgent
                ? `/api/telemetry?agentId=${selectedAgent}`
                : '/api/telemetry';
            const res = await fetch(url);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedAgent]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const getTabForEntry = (id: string) => activeTab[id] || 'reasoning';

    const setTabForEntry = (id: string, tab: string) => {
        setActiveTab(prev => ({ ...prev, [id]: tab }));
    };

    const filteredEntries = (data?.entries || []).filter((entry: any) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            entry.agentName?.toLowerCase().includes(term) ||
            entry.inputPreview?.toLowerCase().includes(term) ||
            entry.responsePreview?.toLowerCase().includes(term) ||
            entry.category?.toLowerCase().includes(term)
        );
    });

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={48} />
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest animate-pulse">Loading Neural Telemetry...</p>
                </div>
            </div>
        );
    }

    const stats = data?.stats || {};

    return (
        <div className="space-y-8 animate-fade-in text-white pb-24">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Activity size={24} className="text-amber-400" />
                        </div>
                        Agent Telemetry
                    </h1>
                    <p className="text-slate-500">Real-time cognitive trace analysis, token flows, and reasoning traversals.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className={`p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/30 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={18} />
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Live</span>
                    </div>
                </div>
            </header>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50 space-y-2 group hover:border-indigo-500/30 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Total Interactions</p>
                    <p className="text-3xl font-black text-white tracking-tighter">{stats.totalInteractions || 0}</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50 space-y-2 group hover:border-amber-500/30 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Total Tokens</p>
                    <p className="text-3xl font-black text-white tracking-tighter">{(stats.totalTokens || 0).toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50 space-y-2 group hover:border-emerald-500/30 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Avg Latency</p>
                    <p className="text-3xl font-black text-white tracking-tighter">{stats.avgLatency || 0}s</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/50 space-y-2 group hover:border-rose-500/30 transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Categories</p>
                    <div className="flex flex-wrap gap-1">
                        {Object.entries(stats.categoryCounts || {}).map(([cat, count]: any) => (
                            <span key={cat} className="px-2 py-0.5 rounded-md bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                {cat}: {count}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search traces, agents, or content..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <select
                        value={selectedAgent}
                        onChange={(e) => { setSelectedAgent(e.target.value); setLoading(true); }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-12 text-white text-sm focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer font-bold min-w-[200px]"
                    >
                        <option value="">All Agents</option>
                        {(data?.agents || []).map((a: any) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Telemetry Entries */}
            <div className="space-y-4">
                {filteredEntries.length > 0 ? filteredEntries.map((entry: any) => {
                    const isExpanded = expandedEntry === entry.id;
                    const tab = getTabForEntry(entry.id);

                    return (
                        <div key={entry.id} className="rounded-[2rem] bg-slate-900/40 border border-slate-800/50 overflow-hidden transition-all hover:border-indigo-500/20 backdrop-blur-sm">
                            {/* Entry Header - Always visible */}
                            <button
                                onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                className="w-full p-6 flex items-center justify-between text-left group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                        <Bot size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-white text-lg tracking-tight">{entry.agentName}</span>
                                            {entry.category && (
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                    entry.category === 'BUSINESS' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                    entry.category === 'GREETING' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    'bg-slate-800 text-slate-500 border-slate-700'
                                                }`}>
                                                    {entry.category}
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                                entry.source === 'email' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                                {entry.source}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium line-clamp-1 max-w-xl italic">
                                            {entry.inputPreview || 'No input preview'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="hidden md:flex items-center gap-6 text-right">
                                        {entry.latency && (
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Latency</p>
                                                <p className="text-sm font-black text-emerald-400">{entry.latency.toFixed(1)}s</p>
                                            </div>
                                        )}
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Tokens</p>
                                            <p className="text-sm font-black text-indigo-400">{entry.totalTokens.toLocaleString()}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Time</p>
                                            <p className="text-[10px] font-bold text-slate-500">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className={`transition-transform duration-300 text-slate-600 ${isExpanded ? 'rotate-90' : ''}`}>
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </button>

                            {/* Expanded Detail */}
                            {isExpanded && (
                                <div className="border-t border-slate-800/50 animate-in slide-in-from-top-2 duration-300">
                                    {/* Tab Bar */}
                                    <div className="flex items-center gap-1 p-3 px-6 bg-slate-950/50">
                                        {[
                                            { id: 'reasoning', label: 'Reasoning', icon: <Brain size={14} /> },
                                            { id: 'tools', label: 'Tool Calls', icon: <Code2 size={14} /> },
                                            { id: 'context', label: 'Context', icon: <Sparkles size={14} /> },
                                            { id: 'response', label: 'Response', icon: <MessageSquare size={14} /> },
                                            { id: 'raw', label: 'Raw Trace', icon: <Terminal size={14} /> },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTabForEntry(entry.id, t.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    tab === t.id
                                                        ? 'bg-indigo-600 text-white shadow-lg'
                                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                {t.icon} {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    <div className="p-8 space-y-6">
                                        {tab === 'reasoning' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Brain size={18} className="text-emerald-400" />
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Cognitive Reasoning Path</h3>
                                                </div>
                                                {entry.thoughts.length > 0 ? (
                                                    <div className="space-y-3 relative ml-4 pl-8 border-l border-slate-800/50">
                                                        {entry.thoughts.map((thought: string, i: number) => (
                                                            <div key={i} className="relative group">
                                                                <div className="absolute -left-11 top-2 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-400 group-hover:scale-110 transition-transform">
                                                                    {i + 1}
                                                                </div>
                                                                <div className="p-5 bg-slate-950/80 border border-slate-800/50 rounded-2xl text-slate-300 text-sm leading-relaxed italic hover:border-emerald-500/30 transition-all">
                                                                    {thought}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm italic">
                                                        No reasoning traces captured for this interaction.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {tab === 'tools' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Code2 size={18} className="text-amber-400" />
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Active Tool Invocations</h3>
                                                </div>
                                                {entry.toolCalls.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {entry.toolCalls.map((tc: any, i: number) => (
                                                            <div key={i} className="p-5 bg-slate-950/80 border border-slate-800/50 rounded-2xl space-y-3 hover:border-amber-500/30 transition-all">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-mono text-sm font-bold text-indigo-400">{tc.name || 'unknown_tool'}</span>
                                                                    <span className="text-[8px] text-slate-600 font-black tracking-widest uppercase bg-slate-900 px-2 py-0.5 rounded-full">INVOKED</span>
                                                                </div>
                                                                <div className="bg-black/40 rounded-xl p-4 font-mono text-[11px] text-slate-500 overflow-x-auto leading-relaxed">
                                                                    {tc.args || 'No arguments'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm italic">
                                                        No external tools were invoked.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {tab === 'context' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Sparkles size={18} className="text-indigo-400" />
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">System Context & Configuration</h3>
                                                </div>

                                                {/* System Prompts */}
                                                <section className="space-y-4">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Context (Multi-Node)</label>
                                                    {entry.systemPrompts && entry.systemPrompts.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {entry.systemPrompts.map((sp: any, i: number) => (
                                                                <div key={i} className="space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                                        <span className="text-[10px] font-black uppercase tracking-tight text-indigo-400">{sp.step || 'Step'} Configuration</span>
                                                                    </div>
                                                                    <div className="p-4 bg-slate-950/80 border border-slate-800/50 rounded-xl text-slate-400 text-xs font-mono leading-relaxed max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                                                        {sp.prompt}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 bg-slate-950/80 border border-slate-800/50 rounded-2xl text-slate-500 text-sm italic">
                                                            System prompts not captured in this trace.
                                                        </div>
                                                    )}
                                                </section>

                                                {/* Metrics */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="p-4 bg-slate-950/80 border border-slate-800/50 rounded-xl text-center space-y-1">
                                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Prompt</p>
                                                        <p className="text-lg font-black text-indigo-400">{entry.promptTokens.toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-4 bg-slate-950/80 border border-slate-800/50 rounded-xl text-center space-y-1">
                                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Completion</p>
                                                        <p className="text-lg font-black text-emerald-400">{entry.completionTokens.toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-4 bg-slate-950/80 border border-slate-800/50 rounded-xl text-center space-y-1">
                                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Total</p>
                                                        <p className="text-lg font-black text-white">{entry.totalTokens.toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-4 bg-slate-950/80 border border-slate-800/50 rounded-xl text-center space-y-1">
                                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Batch Size</p>
                                                        <p className="text-lg font-black text-amber-400">{entry.batchSize}</p>
                                                    </div>
                                                </div>

                                                {/* Input Preview */}
                                                {entry.inputPreview && (
                                                    <section className="space-y-3">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Original Input</label>
                                                        <div className="p-5 bg-slate-950/80 border border-slate-800/50 rounded-2xl text-slate-300 text-sm leading-relaxed italic">
                                                            {entry.inputPreview}
                                                        </div>
                                                    </section>
                                                )}
                                            </div>
                                        )}

                                        {tab === 'response' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <MessageSquare size={18} className="text-indigo-400" />
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Agent Response</h3>
                                                </div>
                                                <div className="p-6 bg-slate-950/80 border border-slate-800/50 rounded-2xl text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {entry.responsePreview}
                                                </div>
                                            </div>
                                        )}

                                        {tab === 'raw' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Terminal size={18} className="text-slate-400" />
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Raw Execution Trace</h3>
                                                </div>
                                                <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-slate-500 font-mono text-[10px] leading-tight whitespace-pre-wrap overflow-x-auto custom-scrollbar max-h-96">
                                                    {JSON.stringify(entry.rawTrace, null, 2)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <div className="p-24 text-center bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-60">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Activity size={40} className="text-slate-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-400 mb-2">No Telemetry Data</h3>
                        <p className="text-slate-600 font-medium italic">Agent interactions will appear here as they process messages.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
