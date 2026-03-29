'use client';

import React, { useState, useEffect } from 'react';
import { 
    Mail, 
    MessageCircle,
    Search, 
    Loader2, 
    RefreshCw, 
    ShieldCheck,
    ChevronRight,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function ConversationsPage() {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
    const [availableChannels, setAvailableChannels] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchHistory = () => {
        setLoading(true);
        fetch('/api/chat/history')
            .then(res => res.json())
            .then(data => {
                if (data.threads) {
                    setThreads(data.threads);
                }
                if (data.availableChannels) {
                    setAvailableChannels(data.availableChannels);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await fetch('/api/integrations/gmail/sync', { method: 'POST' });
            fetchHistory();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(() => {
            fetch('/api/chat/history')
                .then(res => res.json())
                .then(data => {
                    if (data.threads) setThreads(data.threads);
                });
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const parseSubject = (content: string) => {
        if (!content) return null;
        const match = content.match(/Subject: (.*)\n/);
        return match ? match[1].trim() : null;
    };

    const filteredHistory = threads.filter(group => {
        const content = group.lastMessage?.content?.toLowerCase() || "";
        const sender = group.sender?.toLowerCase() || "";
        const term = searchTerm.toLowerCase();
        const matchesSearch = sender.includes(term) || content.includes(term);
        
        const matchesCategory = !selectedFilter || group.messages.some((m: any) => 
            m.category === selectedFilter || m.status === selectedFilter
        );
        
        const matchesChannel = !selectedChannel || group.messages.some((m: any) => m.channelAccountId === selectedChannel);

        return matchesSearch && matchesCategory && matchesChannel;
    });

    const filters = [
        { id: 'BUSINESS', label: 'Business', color: 'bg-indigo-500' },
        { id: 'GREETING', label: 'Greetings', color: 'bg-emerald-500' },
        { id: 'PROCESSING', label: 'Active', color: 'bg-sky-500' },
        { id: 'COMPLETED', label: 'Done', color: 'bg-teal-500' },
        { id: 'FAILED', label: 'Error', color: 'bg-rose-500' },
    ];

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-8 animate-fade-in text-white pb-24 relative min-h-screen">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3 uppercase italic">
                        Neural <span className="text-indigo-500">Threads</span>
                    </h1>
                    <p className="text-slate-500 text-sm">Autonomous interaction flows and multi-channel cognitive monitoring.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all text-xs font-black uppercase tracking-widest ${isSyncing ? 'opacity-50' : ''}`}
                    >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing' : 'Sync Trace'}
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Active Feed</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                <div className="flex flex-wrap gap-2 flex-1">
                    <button
                        onClick={() => setSelectedFilter(null)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${!selectedFilter ? 'bg-white text-black border-white' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                    >
                        All Messages
                    </button>
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setSelectedFilter(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${selectedFilter === f.id
                                ? `${f.color}/20 text-white border-${f.id === 'BUSINESS' ? 'indigo' : f.id === 'GREETING' ? 'emerald' : 'slate'}-500/50`
                                : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <div className="w-[1px] h-6 bg-slate-800 mx-2 self-center hidden sm:block" />
                    <button
                        onClick={() => setSelectedChannel(null)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${!selectedChannel ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-950 text-slate-600 border-slate-900 hover:border-slate-800'}`}
                    >
                        All Channels
                    </button>
                    {availableChannels.map(ch => (
                        <button
                            key={ch.id}
                            onClick={() => setSelectedChannel(ch.id)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${selectedChannel === ch.id
                                ? 'bg-slate-100 text-black border-white'
                                : 'bg-slate-950 text-slate-600 border-slate-900 hover:border-slate-800'}`}
                        >
                            {ch.name || ch.address} ({ch.id.substring(0, 4)})
                        </button>
                    ))}
                </div>

                <div className="relative group w-full xl:w-80 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-indigo-500" size={18} />
                    <input
                        type="text"
                        placeholder="Scan neural patterns or identifiers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold text-sm placeholder:text-slate-700"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {loading && threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-24 space-y-4">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Syncing Cognitive State...</p>
                    </div>
                ) : filteredHistory.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                        {filteredHistory.map((group) => {
                            const lastMsg = group.messages[group.messages.length - 1];
                            const isUnread = lastMsg && lastMsg.role === 'user';
                            const time = new Date(group.updatedAt);
                            const subject = parseSubject(lastMsg?.content);
                            
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={group.id}
                                >
                                    <Link 
                                        href={`/dashboard/conversations/${group.id}`}
                                        className="group block"
                                    >
                                        <div className={`p-2.5 rounded-xl border transition-all relative overflow-hidden backdrop-blur-md ${
                                            isUnread 
                                                ? 'bg-indigo-500/10 border-indigo-500/30' 
                                                : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'
                                        }`}>
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                        group.channel === 'GMAIL' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                                                    }`}>
                                                        {group.channel === 'GMAIL' ? <Mail size={14} /> : <div className="font-black text-[9px] uppercase tracking-tighter">WA</div>}
                                                    </div>
                                                    
                                                    <div className="min-w-0 flex-1 flex items-center gap-4">
                                                        <div className="w-48 shrink-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-[13px] text-white truncate">{group.senderName || group.sender}</p>
                                                                {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                                                                {group.isEscalation && (
                                                                    <span className="px-1 py-0.5 rounded bg-rose-500/10 text-[7px] font-black text-rose-500 uppercase tracking-widest border border-rose-500/20">
                                                                        Escalated
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                                                    {group.count} Messages
                                                                </span>
                                                                {group.agentName && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[7px] font-black text-slate-400 uppercase tracking-widest">
                                                                        Agent: {group.agentName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-black text-slate-300 truncate uppercase tracking-tight">
                                                                {subject || 'Neural Thread'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-600 line-clamp-1 italic mt-0.5 opacity-60">
                                                                {lastMsg?.content?.replace(/Subject:.*\n\n/, '').substring(0, 80) || '...'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 ml-4">
                                                    <div className="text-right whitespace-nowrap hidden md:block">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            {formatTime(time)}
                                                        </p>
                                                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">
                                                            {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-600 group-hover:text-white group-hover:bg-indigo-500 transition-all">
                                                        <ChevronRight size={12} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl opacity-60"
                    >
                        <Activity size={32} className="text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-400 mb-1 italic">Cognitive Silence</h3>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No active neural threads detected in this sector.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
