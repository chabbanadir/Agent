'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ShieldAlert, Search, Loader2, RefreshCw, Trash2, Eye } from 'lucide-react';

export default function SkippedEmailsPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
    const [selectedMsg, setSelectedMsg] = useState<any | null>(null);

    const fetchSkipped = () => {
        setLoading(true);
        fetch('/api/chat/skipped')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setMessages(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchSkipped();
    }, []);

    const filteredMessages = messages.filter(msg => {
        const matchesSearch = msg.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             msg.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesChannel = !selectedChannel || msg.source === selectedChannel;
        return matchesSearch && matchesChannel;
    });

    const handleReset = (id: string) => {
        // Removed confirm() as per user request to avoid browser alerts
        fetch('/api/chat/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: id })
        }).then(() => {
            fetchSkipped();
        });
    };

    return (
        <div className="space-y-6 animate-fade-in text-white pb-24 relative min-h-screen">
            <header>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Skipped Messages</h1>
                        <p className="text-slate-500">Review automated emails, newsletters, and system notifications filtered by AI.</p>
                    </div>
                    <button
                        onClick={fetchSkipped}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Refresh</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input
                        type="text"
                        placeholder="Search sender or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-3xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl shrink-0">
                    {['ALL', 'GMAIL', 'WHATSAPP'].map(ch => (
                        <button
                            key={ch}
                            onClick={() => setSelectedChannel(ch === 'ALL' ? null : ch)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                (ch === 'ALL' && !selectedChannel) || selectedChannel === ch
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {ch}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex items-center justify-center p-24">
                        <Loader2 className="animate-spin text-indigo-500" size={40} />
                    </div>
                ) : filteredMessages.length > 0 ? (
                    <div className="grid gap-2">
                        {filteredMessages.map((msg) => (
                            <div key={msg.id} className="group transition-all">
                                <div className="p-3 rounded-xl border transition-all relative overflow-hidden backdrop-blur-md bg-slate-900/40 border-slate-800/50 hover:border-amber-500/30">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                                <ShieldAlert size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1 flex items-center gap-4">
                                                <p className="font-bold text-sm text-white tracking-tight truncate w-48">{msg.sender}</p>
                                                <p className="text-[11px] text-slate-400 line-clamp-1 opacity-60 italic flex-1">
                                                    {msg.content.substring(0, 150)}...
                                                </p>
                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[8px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                                                    {msg.category || 'SKIPPED'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <div className="text-right mr-4 hidden md:block">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                                                    {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedMsg(msg)}
                                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all"
                                                title="View Details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleReset(msg.id)}
                                                className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 text-[10px] font-bold uppercase tracking-widest transition-all"
                                            >
                                                Process
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-32 text-center bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-60">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Mail size={40} className="text-slate-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-400 mb-2">No Skipped Content</h3>
                        <p className="text-slate-600 font-medium italic tracking-tight">All messages have been synchronized or no automation was detected.</p>
                    </div>
                )}
            </div>

            {/* Modal for viewing content */}
            {selectedMsg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-4xl w-full max-h-[85vh] flex flex-col space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-800 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Review Skipped Content</h2>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Filtered by: Automation Policy v1.0</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMsg(null)}
                                className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black transition-all border border-slate-700/50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950 rounded-3xl border border-slate-800/50 font-mono text-xs leading-relaxed text-slate-400 whitespace-pre-wrap">
                            {selectedMsg.content}
                        </div>

                        <div className="pt-4 flex justify-end gap-4 relative z-10">
                            <button
                                onClick={() => { handleReset(selectedMsg.id); setSelectedMsg(null); }}
                                className="px-8 py-3 rounded-xl bg-indigo-500 text-white font-black hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Process Message Now
                            </button>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                    </div>
                </div>
            )}
        </div>
    );
}
