'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, Bot, Cpu, Sliders, MessageSquareCode, Loader2, Zap, Plus, Trash2, Mail, MessageCircle, Send, Smartphone, Sparkles } from 'lucide-react';

// Simplified Modal Implementation matching project patterns

export default function AgentConfigPage() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingAgent, setEditingAgent] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [generatingDesc, setGeneratingDesc] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const [channelAccounts, setChannelAccounts] = useState<any[]>([]);

    const fetchAgentsAndDocs = async () => {
        try {
            const [agentRes, docRes, chanRes] = await Promise.all([
                fetch('/api/agents'),
                fetch('/api/upload'),
                fetch('/api/channels')
            ]);
            const agentData = await agentRes.json();
            const docData = await docRes.json();
            const chanData = await chanRes.json();
            setAgents(Array.isArray(agentData) ? agentData : [agentData]);
            setDocuments(Array.isArray(docData) ? docData : []);
            setChannelAccounts(Array.isArray(chanData) ? chanData : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgentsAndDocs();
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
            fetchAgentsAndDocs();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAgent = async (agentId: string) => {
        if (!confirm('Are you sure you want to permanently delete this neural identity? This action cannot be reversed.')) return;
        try {
            const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
            if (res.ok) {
                setEditingAgent(null);
                fetchAgentsAndDocs();
            } else {
                const data = await res.json();
                alert(`Failed to delete agent: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to delete agent due to a network error.');
        }
    };

    const handleGenerateDescription = async () => {
        if (!editingAgent?.id) {
            alert("Please save the agent first to generate a description from its documents.");
            return;
        }
        setGeneratingDesc(true);
        try {
            const res = await fetch('/api/agents/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: editingAgent.id })
            });
            const data = await res.json();
            if (data.description) {
                setEditingAgent({ ...editingAgent, description: data.description });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setGeneratingDesc(false);
        }
    };

    const toggleDocument = (docId: string) => {
        const currentConfig = editingAgent.config || {};
        const allowed = Array.isArray(currentConfig.allowedDocuments) ? [...currentConfig.allowedDocuments] : [];

        let newAllowed;
        if (allowed.includes(docId)) {
            newAllowed = allowed.filter((id: string) => id !== docId);
        } else {
            newAllowed = [...allowed, docId];
        }

        setEditingAgent({
            ...editingAgent,
            config: { ...currentConfig, allowedDocuments: newAllowed }
        });
    };

    const addChannel = () => {
        const currentChannels = editingAgent.channels || [];
        setEditingAgent({
            ...editingAgent,
            channels: [...currentChannels, { channel: 'EMAIL', systemPrompt: '', isActive: true }]
        });
    };

    const removeChannel = (index: number) => {
        const currentChannels = [...(editingAgent.channels || [])];
        currentChannels.splice(index, 1);
        setEditingAgent({ ...editingAgent, channels: currentChannels });
    };

    const updateChannel = (index: number, updates: any) => {
        const currentChannels = [...(editingAgent.channels || [])];
        currentChannels[index] = { ...currentChannels[index], ...updates };
        setEditingAgent({ ...editingAgent, channels: currentChannels });
    };

    const getChannelIcon = (type: string) => {
        switch (type.toUpperCase()) {
            case 'GMAIL':
            case 'EMAIL': return <Mail size={16} />;
            case 'WHATSAPP': return <MessageCircle size={16} />;
            case 'TELEGRAM': return <Send size={16} />;
            default: return <Smartphone size={16} />;
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
        { id: 'google', name: 'Gemini', models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
        { id: 'ollama', name: 'Ollama', models: ['qwen2.5:7b-instruct', 'llama3.1', 'mistral'] },
        { id: 'openrouter', name: 'OpenRouter', models: ['stepfun/step-3.5-flash:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'openai/gpt-oss-120b:free'] },
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
                        onClick={() => setEditingAgent({ name: 'New Agent', provider: 'openai', model: 'gpt-4o', persuasionLevel: 0.5, systemPrompt: '', isActive: true, channels: [], escalationChannel: 'EMAIL', managerEmail: '', managerWhatsapp: '' })}
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        <Bot size={20} />
                        New Agent
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {agents.length > 0 ? agents.map((agent) => (
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
                    )) : (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <div className="p-12 border-2 border-dashed border-slate-800 rounded-[3rem] text-center flex flex-col items-center justify-center bg-slate-900/20">
                                <Bot size={48} className="text-slate-700 mb-6" />
                                <h3 className="text-xl font-black text-white mb-2">No Neural Agents Deployed</h3>
                                <p className="text-slate-500 max-w-sm mb-6">Your workspace is currently empty. Initialize your first cognitive agent to start handling interactions.</p>
                                <button
                                    onClick={() => setEditingAgent({ name: 'New Agent', provider: 'openai', model: 'gpt-4o', persuasionLevel: 0.5, systemPrompt: '', isActive: true, channels: [], escalationChannel: 'EMAIL', managerEmail: '', managerWhatsapp: '' })}
                                    className="px-6 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-500/30 text-indigo-400 font-bold transition-all border border-indigo-500/30 flex items-center gap-2"
                                >
                                    <Plus size={18} /> Deploy First Agent
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Agent Configuration Modal - Simple Card Pattern */}
            {editingAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-5xl w-full max-h-[90vh] flex flex-col space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">

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
                                {editingAgent.id && (
                                    <button
                                        onClick={() => handleDeleteAgent(editingAgent.id)}
                                        className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-500 font-bold transition-all flex items-center gap-2 border border-rose-500/20 shadow-lg shadow-rose-500/5"
                                        title="Delete Agent"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                )}
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
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-12 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Identity Name</label>
                                    <input
                                        type="text"
                                        value={editingAgent.name || ''}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Agent Name"
                                    />
                                </section>
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Specialty Description</label>
                                        <button
                                            onClick={handleGenerateDescription}
                                            disabled={generatingDesc || !editingAgent.id}
                                            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-30 uppercase tracking-wider"
                                            title="Generate from linked documents"
                                        >
                                            <Sparkles size={12} className={generatingDesc ? 'animate-pulse' : ''} />
                                            {generatingDesc ? 'Generating...' : 'Generate from Docs'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={editingAgent.description || ''}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-indigo-500 outline-none transition-all"
                                        placeholder="e.g. Specialist in beginner surf lessons"
                                    />
                                </section>
                                <section className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Agent Status</label>
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">Active for Ecosystem</p>
                                            <p className="text-[10px] text-slate-500 tracking-tight">Allow the orchestrator to route tasks to this identity.</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={editingAgent.isActive || false}
                                            onChange={(e) => setEditingAgent({ ...editingAgent, isActive: e.target.checked })}
                                            className="w-6 h-6 accent-indigo-500 cursor-pointer"
                                        />
                                    </div>
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
                                <section className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Model Selection</label>
                                    <select
                                        value={editingAgent.model || ''}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, model: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-indigo-500 outline-none appearance-none"
                                    >
                                        {currentProvider.models.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </section>
                            </div>

                            <section className="space-y-4 border-t border-slate-800 pt-8">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <Zap size={14} className="text-amber-400" />
                                    Escalation & Support
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Channel</p>
                                        <select
                                            value={editingAgent.escalationChannel || 'EMAIL'}
                                            onChange={(e) => setEditingAgent({ ...editingAgent, escalationChannel: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="EMAIL">EMAIL</option>
                                            <option value="WHATSAPP">WHATSAPP</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Manager Email</p>
                                        <input
                                            type="email"
                                            value={editingAgent.managerEmail || ''}
                                            onChange={(e) => setEditingAgent({ ...editingAgent, managerEmail: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:border-indigo-500 outline-none transition-all"
                                            placeholder="manager@example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Manager WhatsApp</p>
                                        <input
                                            type="text"
                                            value={editingAgent.managerWhatsapp || ''}
                                            onChange={(e) => setEditingAgent({ ...editingAgent, managerWhatsapp: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:border-indigo-500 outline-none transition-all"
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Knowledge Base Isolation (Allowed Documents)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {documents.length > 0 ? documents.map(doc => (
                                        <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 transition-colors hover:border-indigo-500/30">
                                            <input
                                                type="checkbox"
                                                checked={editingAgent.config?.allowedDocuments?.includes(doc.id) || false}
                                                onChange={() => toggleDocument(doc.id)}
                                                className="w-5 h-5 accent-indigo-500 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{doc.name}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="col-span-1 md:col-span-2 p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-sm">
                                            No documents uploaded to your knowledge base yet.
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">System Intent (Global Behavoir)</label>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-black">
                                        <MessageSquareCode size={14} />
                                        <span>TOKENS: {Math.floor((editingAgent.systemPrompt?.length || 0) / 4)}</span>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm leading-relaxed resize-none custom-scrollbar"
                                    value={editingAgent.systemPrompt || ''}
                                    onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                                    placeholder="Describe how this agent should interact globally..."
                                />
                            </section>

                            {/* Input Channels Configuration */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Input Flow Configuration</label>
                                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Configure per-channel specialized behavior</p>
                                    </div>
                                    <button
                                        onClick={addChannel}
                                        className="px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 transition-all flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Add Channel
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {(editingAgent.channels || []).map((ch: any, idx: number) => {
                                        const linkedAccount = channelAccounts.find(a => a.id === ch.channelAccountId);
                                        return (
                                            <div key={idx} className="p-6 rounded-3xl bg-slate-950 border border-slate-800/50 space-y-4 relative group/channel">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
                                                            {getChannelIcon(linkedAccount?.type || ch.channel)}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <select
                                                                value={ch.channelAccountId || ""}
                                                                onChange={(e) => {
                                                                    const accId = e.target.value;
                                                                    const acc = channelAccounts.find(a => a.id === accId);
                                                                    updateChannel(idx, {
                                                                        channelAccountId: accId,
                                                                        channel: acc?.type || "EMAIL"
                                                                    });
                                                                }}
                                                                className="bg-slate-900 text-sm font-black text-white outline-none border-b border-slate-800 focus:border-indigo-500 px-1 py-1 cursor-pointer min-w-[150px]"
                                                            >
                                                                <option value="" disabled>Select Channel Account</option>
                                                                {channelAccounts.map(acc => (
                                                                    <option key={acc.id} value={acc.id} className="bg-slate-900 text-white">
                                                                        {acc.name} ({acc.address})
                                                                    </option>
                                                                ))}
                                                                <option value="WEB" className="bg-slate-900 text-white">WEB API (Direct)</option>
                                                            </select>
                                                            {linkedAccount && (
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">
                                                                    Linked to {linkedAccount.type} ({linkedAccount.address})
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-600 uppercase">Use HTML</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={ch.config?.useHtmlEmail ?? true}
                                                                onChange={(e) => updateChannel(idx, {
                                                                    config: { ...(ch.config || {}), useHtmlEmail: e.target.checked }
                                                                })}
                                                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 border-l border-slate-800 pl-4 ml-2">
                                                            <span className="text-[10px] font-black text-slate-600 uppercase">Delay</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={ch.config?.delayEnabled ?? false}
                                                                onChange={(e) => updateChannel(idx, {
                                                                    config: { ...(ch.config || {}), delayEnabled: e.target.checked }
                                                                })}
                                                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                                            />
                                                            {ch.config?.delayEnabled && (
                                                                <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-200">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="600"
                                                                        value={ch.config?.maxDelaySeconds ?? 30}
                                                                        onChange={(e) => updateChannel(idx, {
                                                                            config: { ...(ch.config || {}), maxDelaySeconds: parseInt(e.target.value) || 1 }
                                                                        })}
                                                                        className="w-12 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5 text-[10px] font-bold text-white text-center outline-none focus:border-indigo-500"
                                                                    />
                                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">sec</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 border-l border-slate-800 pl-4 ml-2">
                                                            <span className="text-[10px] font-black text-slate-600 uppercase">Active</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={ch.isActive}
                                                                onChange={(e) => updateChannel(idx, { isActive: e.target.checked })}
                                                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => removeChannel(idx)}
                                                            className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Channel Specific Prompt</label>
                                                    <textarea
                                                        value={ch.systemPrompt || ''}
                                                        onChange={(e) => updateChannel(idx, { systemPrompt: e.target.value })}
                                                        className="w-full h-24 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 text-xs text-slate-400 focus:outline-none focus:border-indigo-500/30 transition-all font-mono resize-none"
                                                        placeholder={`Enter special instructions for ${linkedAccount?.name || ch.channel} interactions...`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(editingAgent.channels?.length === 0) && (
                                        <div className="py-12 border-2 border-dashed border-slate-800/50 rounded-[2rem] flex flex-col items-center justify-center text-slate-600 space-y-4">
                                            <Smartphone size={40} className="opacity-20" />
                                            {channelAccounts.length === 0 ? (
                                                <div className="text-center px-6">
                                                    <p className="text-sm font-bold mb-2">No infrastructure channels available.</p>
                                                    <p className="text-xs text-slate-700">Go to the Channels page to connect your first inbox.</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-bold">No channel overrides configured.</p>
                                            )}
                                        </div>
                                    )}
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
