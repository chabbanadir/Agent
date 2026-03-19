'use client';

import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Cpu, Globe, Lock, ShieldCheck, Loader2 } from 'lucide-react';

export default function ModelsPage() {
    const [models, setModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<any | null>(null);
    const [formModel, setFormModel] = useState({
        name: '',
        provider: 'OpenAI',
        modelType: 'LLM',
        status: 'ACTIVE'
    });

    const fetchModels = async () => {
        try {
            const res = await fetch('/api/models');
            const data = await res.json();
            if (Array.isArray(data)) setModels(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModels();
    }, []);

    const handleSaveModel = async () => {
        setLoading(true);
        try {
            const body = editingModel ? { ...formModel, id: editingModel.id } : formModel;
            await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            setIsModalOpen(false);
            setEditingModel(null);
            setFormModel({ name: '', provider: 'OpenAI', modelType: 'LLM', status: 'ACTIVE' });
            fetchModels();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleEditClick = (model: any) => {
        setEditingModel(model);
        setFormModel({
            name: model.name,
            provider: model.provider,
            modelType: model.modelType,
            status: model.status
        });
        setIsModalOpen(true);
    };

    const handleDeleteModel = async (id: string) => {
        if (!confirm('Are you sure you want to delete this model?')) return;
        setLoading(true);
        try {
            await fetch(`/api/models?id=${id}`, { method: 'DELETE' });
            fetchModels();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in text-white pb-24">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">AI Models</h1>
                    <p className="text-slate-500">Manage connections to LLMs and Embedding providers.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingModel(null);
                        setFormModel({ name: '', provider: 'OpenAI', modelType: 'LLM', status: 'ACTIVE' });
                        setIsModalOpen(true);
                    }}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                    <Plus size={20} />
                    Add Model
                </button>
            </header>

            {/* Model Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
                        <div className="flex items-center gap-4 text-white">
                            {editingModel ? <Cpu className="text-indigo-400" /> : <Plus className="text-indigo-400" />}
                            <h2 className="text-2xl font-bold">{editingModel ? 'Edit Model' : 'New Model Configuration'}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Friendly Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Primary LLM"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                                    value={formModel.name}
                                    onChange={(e) => setFormModel({ ...formModel, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Provider</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                                        value={formModel.provider}
                                        onChange={(e) => setFormModel({ ...formModel, provider: e.target.value })}
                                    >
                                        <option>OpenAI</option>
                                        <option>Anthropic</option>
                                        <option>Ollama</option>
                                        <option>Gemini</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Type</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                                        value={formModel.modelType}
                                        onChange={(e) => setFormModel({ ...formModel, modelType: e.target.value })}
                                    >
                                        <option>LLM</option>
                                        <option>EMBEDDING</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveModel}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-all">
                                {editingModel ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading && models.length === 0 ? (
                    <div className="col-span-2 flex items-center justify-center p-24">
                        <Loader2 className="animate-spin text-indigo-500" size={40} />
                    </div>
                ) : models.length === 0 ? (
                    <div className="col-span-2 p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500">
                        No models configured. Add your first AI model to get started.
                    </div>
                ) : (
                    models.map((model) => (
                        <div key={model.id} className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group relative overflow-hidden">
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${model.provider === 'OpenAI' ? 'bg-emerald-500/10 text-emerald-400' :
                                        model.provider === 'Anthropic' ? 'bg-amber-500/10 text-amber-400' :
                                            'bg-indigo-500/10 text-indigo-400'
                                        }`}>
                                        <Cpu size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{model.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{model.provider}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{model.modelType}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        {model.status}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                <div className="flex items-center gap-4 text-slate-500">
                                    <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                                        <Globe size={14} />
                                        <span className="text-xs font-bold uppercase tracking-tighter">Connection</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                                        <ShieldCheck size={14} />
                                        <span className="text-xs font-bold uppercase tracking-tighter">Security</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditClick(model)}
                                        className="p-2 text-slate-600 hover:text-indigo-400 transition-all">
                                        <Cpu size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteModel(model.id)}
                                        className="p-2 mr-[-8px] text-slate-600 hover:text-rose-400 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Glass background effect */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all" />
                        </div>
                    ))
                )}
            </div>

            {/* Providers Section */}
            <section className="mt-16 space-y-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-4">
                    <Database className="text-indigo-400" />
                    <h2 className="text-2xl font-bold tracking-tight">External Providers</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['OpenAI', 'Anthropic', 'Google', 'Ollama', 'Mistral'].map((provider) => (
                        <div key={provider} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between hover:bg-slate-900 hover:border-slate-700 transition-all cursor-pointer">
                            <span className="font-bold text-slate-400 group-hover:text-white">{provider}</span>
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-600">
                                <Lock size={14} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
