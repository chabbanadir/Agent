'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, Bot, Cpu, Sliders, MessageSquareCode, Loader2, Zap } from 'lucide-react';

// Simplified Modal Implementation matching project patterns

export default function AgentConfigPage() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingAgent, setEditingAgent] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/agents');
            const data = await res.json();
            setAgents(Array.isArray(data) ? data : [data]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingAgent)
            });
            setEditingAgent(null);
            fetchAgents();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
        );
    }

    const providers = [
        { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'] },
        { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'] },
        { id: 'google', name: 'Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
        { id: 'ollama', name: 'Ollama', models: ['qwen2.5:7b-instruct', 'llama3.1', 'mistral'] },
    ];

    const currentProvider = providers.find(p => p.id === editingAgent?.provider) || providers[0];

    return (
        <>
            <div className="space-y-12 animate-fade-in text-white pb-24">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">My Agents</h1>
                        <p className="text-slate-500">Configure and manage your personalized AI workforce.</p>
                    </div>
                    <button
                        onClick={() => setEditingAgent({ name: 'New Agent', provider: 'openai', model: 'gpt-4o', persuasionLevel: 0.5, systemPrompt: '', isActive: true })}
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        <Bot size={20} />
                        New Agent
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {agents.map((agent) => (
                        <div key={agent.id} className="p-10 rounded-[2.5rem] bg-slate-900/50 border border-slate-800/50 hover:border-indigo-500/30 transition-all group relative overflow-hidden backdrop-blur-sm">
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                                        <Bot size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black text-white tracking-tight leading-none">{agent.name}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{agent.provider}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 relative">
                                                {agent.isActive && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping" />}
                                                <div className={`absolute inset-0 rounded-full ${agent.isActive ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-10 flex items-center justify-between relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Active Model</p>
                                    <p className="text-xs font-bold text-slate-400 font-mono italic">{agent.model}</p>
                                </div>
                                <button
                                    onClick={() => setEditingAgent({ ...agent })}
                                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black transition-all flex items-center gap-3 border border-slate-700/50 shadow-xl"
                                >
                                    <Sliders size={16} />
                                    CONFIG
                                </button>
                            </div>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[60px] rounded-full -mr-24 -mt-24 group-hover:bg-indigo-500/10 transition-all" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Agent Configuration Modal - Simple Card Pattern */}
            {editingAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-4xl w-full max-h-[90vh] flex flex-col space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between pb-6 border-b border-slate-800 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                    <Cpu size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Agent Configuration</h2>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Neural State: {editingAgent.id ? 'STABLE' : 'INITIALIZING'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setEditingAgent(null)}
                                    className="px-6 py-2.5 rounded-xl hover:bg-slate-800 text-slate-400 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {saving ? 'Save' : 'Commit Changes'}
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Form Area */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Identity Name</label>
                                    <input
                                        type="text"
                                        value={editingAgent.name}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Agent Name"
                                    />
                                </section>
                                <section className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Neural Engine</label>
                                    <div className="flex gap-2">
                                        {providers.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setEditingAgent({ ...editingAgent, provider: p.id, model: p.models[0] })}
                                                className={`flex-1 p-3 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${editingAgent.provider === p.id ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'}`}>
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                <section className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Model Selection</label>
                                    <select
                                        value={editingAgent.model}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, model: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-indigo-500 outline-none appearance-none"
                                    >
                                        {currentProvider.models.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </section>
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Persuasion Intensity</label>
                                        <span className="text-xs font-black text-indigo-400">{Math.round(editingAgent.persuasionLevel * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={editingAgent.persuasionLevel}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, persuasionLevel: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-950 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </section>
                            </div>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">System Intent (Behavoiral Logic)</label>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-black">
                                        <MessageSquareCode size={14} />
                                        <span>TOKENS: {Math.floor((editingAgent.systemPrompt?.length || 0) / 4)}</span>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full h-64 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm leading-relaxed resize-none custom-scrollbar"
                                    value={editingAgent.systemPrompt}
                                    onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                                    placeholder="Describe how this agent should interact..."
                                />
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
