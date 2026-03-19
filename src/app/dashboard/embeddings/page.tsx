'use client';

import React, { useState } from 'react';
import { Search, Brain, Database, Cpu, Loader2, Sparkles, Layers } from 'lucide-react';

export default function EmbeddingsPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleTest = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/embeddings/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: query })
            });
            const data = await res.json();
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in text-white pb-24">
            <header>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Neural Vector Tester</h1>
                        <p className="text-slate-500">Benchmark your RAG performance and verify embedding semantic accuracy.</p>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-2">
                        <Brain size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Embedding Engine</span>
                    </div>
                </div>
            </header>

            <section className="p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-8 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Search size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Semantic Query Test</h2>
                        <p className="text-slate-500 text-sm">Enter a phrase to see how it's vectorized and which documents it clusters with.</p>
                    </div>
                </div>

                <div className="flex gap-4 relative z-10">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g. What are our business hours during holidays?"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 outline-none transition-all font-medium"
                    />
                    <button
                        onClick={handleTest}
                        disabled={loading || !query.trim()}
                        className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        Execute Test
                    </button>
                </div>

                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />
            </section>

            {results && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
                    <div className="lg:col-span-1 space-y-8">
                        <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Layers size={20} />
                                <h3 className="font-black uppercase text-xs tracking-widest text-slate-400">Vector Meta</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-xs text-slate-500 font-bold">Dimensions</span>
                                    <span className="text-sm font-black text-white">{results.vectorSize}</span>
                                </div>
                                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                                    <span className="text-xs text-slate-500 font-bold">Raw Sample (Float32)</span>
                                    <div className="font-mono text-[10px] text-indigo-400 break-all leading-tight opacity-70">
                                        [{results.sample?.join(', ')}...]
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <Database size={20} />
                                <h3 className="font-black uppercase text-xs tracking-widest text-slate-400">Semantic Matches (Cosign Similarity)</h3>
                            </div>

                            <div className="space-y-4">
                                {results.matches?.length > 0 ? (
                                    results.matches.map((match: any, i: number) => (
                                        <div key={i} className="p-6 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-3 group hover:border-emerald-500/30 transition-all">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Document: {match.documentName}</span>
                                                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-black tracking-widest">
                                                    {Math.round(match.similarity * 100)}% Match
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                                {match.content}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl opacity-50">
                                        <p className="text-sm italic text-slate-500">No semantic matches found in vector store.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}
