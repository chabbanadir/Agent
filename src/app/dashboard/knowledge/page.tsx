'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, Trash2, FileText, Plus, Loader2, Brain, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function KnowledgeBasePage() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [indexingId, setIndexingId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'documents' | 'test'>('documents');
    const [testQuery, setTestQuery] = useState('');
    const [testResults, setTestResults] = useState<any[]>([]);
    const [testing, setTesting] = useState(false);

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/upload');
            const data = await res.json();
            if (!data.error) {
                setDocuments(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
        const interval = setInterval(fetchDocuments, 5000); // Polling for status updates
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                fetchDocuments();
            } else {
                const data = await res.json();
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred during upload.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleIndex = async (documentId: string) => {
        setIndexingId(documentId);
        try {
            const res = await fetch('/api/upload/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId })
            });
            const data = await res.json();
            if (res.ok) {
                setNotification({ message: 'Document indexed successfully! AI can now use it.', type: 'success' });
                fetchDocuments();
            } else {
                setNotification({ message: data.error || 'Indexing failed', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setNotification({ message: 'An error occurred during indexing.', type: 'error' });
        } finally {
            setIndexingId(null);
        }
    };

    const handleTestRAG = async () => {
        if (!testQuery) return;
        setTesting(true);
        try {
            const res = await fetch('/api/knowledge/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: testQuery })
            });
            const data = await res.json();
            setTestResults(data.results || []);
        } catch (error) {
            console.error(error);
        } finally {
            setTesting(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'INDEXED': return <CheckCircle2 size={14} className="text-emerald-400" />;
            case 'INDEXING': return <Loader2 size={14} className="animate-spin text-indigo-400" />;
            case 'ERROR': return <AlertCircle size={14} className="text-rose-400" />;
            default: return <Clock size={14} className="text-slate-500" />;
        }
    };

    return (
        <div className="space-y-12 animate-fade-in text-white pb-24 relative">
            {/* Notification Bubble */}
            {notification && (
                <div className={`fixed top-8 right-8 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-in ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="font-bold">{notification.message}</p>
                </div>
            )}

            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Knowledge Base</h1>
                    <p className="text-slate-500">Manage the documents your agents use for context.</p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.csv"
                />
            </header>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'documents' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
                    Documents
                    {activeTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('test')}
                    className={`pb-4 px-2 font-bold transition-all relative ${activeTab === 'test' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
                    Test Retrieval
                    {activeTab === 'test' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
                </button>
            </div>

            {activeTab === 'documents' ? (
                <div className="space-y-8 animate-slide-up">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-all font-black" size={20} />
                        <input
                            type="text"
                            placeholder="Filter your vectorized knowledge..."
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl py-6 pl-16 pr-6 text-white text-lg focus:outline-none focus:border-indigo-500/50 transition-all font-medium placeholder:text-slate-700 backdrop-blur-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {loading && documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-600 animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Brain size={24} className="text-indigo-400 opacity-50" />
                                    </div>
                                </div>
                                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Syncing Vector Database...</p>
                            </div>
                        ) : documents.length > 0 ? (
                            documents.map((doc) => (
                                <div key={doc.id} className="p-10 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 flex items-center justify-between group hover:border-indigo-500/30 hover:bg-slate-900 transition-all relative overflow-hidden backdrop-blur-md">
                                    {doc.status === 'INDEXING' && (
                                        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 animate-shimmer w-full bg-[length:200%_100%]" />
                                    )}

                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                            <FileText size={32} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <p className="font-black text-2xl text-white tracking-tight">{doc.name}</p>
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${doc.status === 'INDEXED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                    doc.status === 'INDEXING' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shimmer-bg' :
                                                        doc.status === 'ERROR' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                                            'bg-slate-800/50 border-slate-700/50 text-slate-500'
                                                    }`}>
                                                    {getStatusIcon(doc.status)}
                                                    {doc.status}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">
                                                <span>{formatSize(doc.metadata?.size)}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                <span>{new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 relative z-10">
                                        {doc.status !== 'INDEXED' && doc.status !== 'INDEXING' && (
                                            <button
                                                onClick={() => handleIndex(doc.id)}
                                                disabled={indexingId === doc.id}
                                                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                                            >
                                                {indexingId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <Brain size={18} />}
                                                Generate Embeddings
                                            </button>
                                        )}
                                        <button className="p-4 rounded-2xl bg-slate-800/50 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all border border-slate-800">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    {/* Glass gradient */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))
                        ) : (
                            <div className="p-32 rounded-[3rem] border-4 border-dashed border-slate-800/50 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="p-6 rounded-full bg-slate-900 border border-slate-800">
                                    <FileText size={48} className="text-slate-700" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-slate-300 font-black text-2xl tracking-tight">Your Knowledge Hub is Empty</p>
                                    <p className="text-slate-600 max-w-sm font-medium leading-relaxed italic">Upload documents to provide your agents with the expert context they need to satisfy customer inquiries.</p>
                                </div>
                            </div>
                        )}

                        {!loading && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-8 border-4 border-dashed border-slate-800/50 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-8 border border-slate-800 group-hover:scale-110 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all relative z-10 shadow-2xl">
                                    <Upload size={48} />
                                </div>
                                <div className="space-y-3 relative z-10">
                                    <p className="text-white font-black text-3xl tracking-tight">Expand Agent Intellect</p>
                                    <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-xs">Drop files here or click to browse</p>
                                    <p className="text-slate-700 text-[10px] font-medium mt-4">SECURE VECTOR STORAGE • PDF, TXT, CSV</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-10 animate-slide-up">
                    <section className="p-10 rounded-[3rem] bg-slate-900 border border-slate-800 space-y-10 relative overflow-hidden backdrop-blur-xl">
                        <div className="space-y-3 relative z-10">
                            <h3 className="text-3xl font-black flex items-center gap-4 tracking-tighter text-white">
                                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                                    <Search size={32} />
                                </div>
                                Semantic Insight Probe
                            </h3>
                            <p className="text-slate-500 max-w-2xl leading-relaxed font-medium">
                                Simulate an agent inquiry to visualize the raw context gathered from your vector index.
                                High similarity scores ensure your agent remains grounded and factual.
                            </p>
                        </div>

                        <div className="flex gap-4 relative z-10">
                            <input
                                type="text"
                                value={testQuery}
                                onChange={(e) => setTestQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTestRAG()}
                                placeholder="Probe the neural index with a query..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl py-6 px-8 text-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium placeholder:text-slate-800"
                            />
                            <button
                                onClick={handleTestRAG}
                                disabled={testing || !testQuery}
                                className="px-10 py-6 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-600/30 group"
                            >
                                {testing ? <Loader2 size={24} className="animate-spin" /> : <Brain size={24} className="group-hover:rotate-12 transition-transform" />}
                                {testing ? 'Probing...' : 'Run Analysis'}
                            </button>
                        </div>

                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />
                    </section>

                    <div className="space-y-6">
                        {testResults.length > 0 ? (
                            testResults.map((result: any, idx: number) => (
                                <div key={idx} className="p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-6 animate-fade-in group hover:border-indigo-500/20 transition-all" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="px-4 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                                                Context Rank #{idx + 1}
                                            </div>
                                            <p className="text-lg font-black text-white/90 tracking-tight">{result.documentName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Semantic Relevance</p>
                                            <div className="px-4 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-black border border-emerald-500/20">
                                                {Math.round(result.similarity * 100)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800/50 text-slate-400 text-lg leading-relaxed font-medium italic relative overflow-hidden group-hover:text-slate-200 transition-colors">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 group-hover:bg-indigo-500 transition-colors" />
                                        "{result.content}"
                                    </div>
                                </div>
                            ))
                        ) : (
                            !testing && (
                                <div className="p-32 rounded-[3.5rem] border-4 border-dashed border-slate-800/50 flex flex-col items-center justify-center text-center opacity-40">
                                    <Brain size={64} className="text-slate-700 mb-6" />
                                    <p className="text-slate-500 font-black text-2xl tracking-tight uppercase">Ready for Semantic Validation</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
