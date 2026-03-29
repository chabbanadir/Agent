'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Check,
    Send,
    MessageSquare, 
    User, 
    Bot, 
    Loader2, 
    ArrowLeft, 
    Calendar, 
    ShieldCheck, 
    Mail, 
    MessageCircle,
    ChevronDown,
    ChevronUp,
    Zap,
    Cpu,
    Activity,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConversationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [thread, setThread] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isApproving, setIsApproving] = useState<string | null>(null);
    const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchThread = (isInitial = false) => {
        if (!params.id) return;
        fetch(`/api/chat/history/${params.id}`)
            .then(res => {
                if (!res.ok) throw new Error("Conversation not found");
                return res.json();
            })
            .then(data => {
                setThread(data);
                if (isInitial) {
                    setTimeout(scrollToBottom, 100);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchThread(true);
        const interval = setInterval(() => fetchThread(false), 10000);
        return () => clearInterval(interval);
    }, [params.id]);

    const toggleContext = (msgId: string) => {
        setExpandedContexts(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    const extractSubject = (content: string) => {
        if (!content) return null;
        const match = content.match(/Subject: (.*)\n/);
        return match ? match[1] : null;
    };

    const cleanContent = (content: string, draft: string | null = null) => {
        const text = content || draft || "";
        return text.replace(/Subject:.*\n\n/, '');
    };

    const handleApprove = async (messageId: string) => {
        setIsApproving(messageId);
        try {
            const res = await fetch('/api/chat/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            });
            if (res.ok) {
                fetchThread();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsApproving(null);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setSendingReply(true);
        try {
            const res = await fetch('/api/chat/manager-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    threadId: thread.id, 
                    channelAccountId: thread.messages[0]?.channelAccountId,
                    content: replyText 
                })
            });
            if (res.ok) {
                setReplyText('');
                fetchThread(true);
            } else {
                const data = await res.json();
                alert(`Failed to send reply: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                        <Cpu className="text-indigo-500 animate-spin-slow" size={40} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full animate-ping" />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-white font-black uppercase tracking-[0.3em] text-sm italic">Accessing Neural Layer</p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Reconstructing Trace Data...</p>
                </div>
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center px-6">
                <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-2xl shadow-rose-500/5">
                    <ShieldCheck size={48} />
                </div>
                <div className="space-y-3">
                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Trace Fragmented</h3>
                    <p className="text-slate-500 max-w-md mx-auto font-bold uppercase tracking-widest text-[10px] leading-relaxed">
                        {error || "The requested neural sequence could not be synthesized in the current temporal stack."}
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/conversations')}
                    className="px-10 py-4 bg-white text-black rounded-2xl font-black transition-all flex items-center gap-3 hover:scale-105 active:scale-95 shadow-xl uppercase text-xs tracking-widest"
                >
                    <ArrowLeft size={18} />
                    Back to Terminal
                </button>
            </div>
        );
    }

    const subject = extractSubject(thread.messages[0]?.content);

    return (
        <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-6rem)] animate-fade-in relative z-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 backdrop-blur-3xl sticky top-0 z-30 shadow-2xl ring-1 ring-white/5 mx-2">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/dashboard/conversations')}
                        className="w-14 h-14 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 hover:border-indigo-500/50 transition-all hover:scale-110 active:scale-95 group shadow-xl"
                    >
                        <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-4 mb-2 flex-wrap">
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic truncate max-w-[200px] md:max-w-md">{thread.senderName || thread.sender}</h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${thread.source === 'GMAIL' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                {thread.source === 'GMAIL' ? <Mail size={12} /> : <MessageCircle size={12} />}
                                {thread.source}
                            </span>
                        </div>
                        {subject && (
                            <p className="text-slate-400 font-bold text-sm line-clamp-1 mb-2">
                                <span className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mr-2 italic">Subject:</span> {subject}
                            </p>
                        )}
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Activity size={10} className="text-indigo-500" />
                            Neural Interaction • {thread.messages.length} Events Logged
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5 shadow-inner min-w-[200px]">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-lg">
                        <Bot size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] leading-none mb-1.5">Sector Agent</p>
                        <p className="text-sm font-black text-indigo-400 uppercase italic truncate">{thread.agentName || 'Orchestrator'}</p>
                    </div>
                </div>
            </header>

            {/* Conversation Timeline */}
            <div className={`flex-1 overflow-y-auto no-scrollbar pt-8 pb-32 px-4 space-y-8 ${thread.source === 'WHATSAPP' ? 'max-w-3xl mx-auto w-full' : ''}`}>
                {thread.messages.map((msg: any, idx: number) => {
                    const isAssistant = msg.role === 'assistant';
                    const isWhatsApp = thread.source === 'WHATSAPP' || msg.source === 'WHATSAPP';
                    const trace = msg.trace ? (typeof msg.trace === 'string' ? JSON.parse(msg.trace) : msg.trace) : null;
                    const isExpanded = expandedContexts[msg.id];

                    return (
                        <div key={msg.id} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} gap-3 group/msg`}>
                            {/* Message Header */}
                            <div className={`flex items-center gap-3 ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg border transition-all duration-300 group-hover/msg:scale-105 ${isAssistant
                                    ? isWhatsApp 
                                        ? 'bg-emerald-600 border-emerald-400/30 text-white' 
                                        : 'bg-indigo-600 border-indigo-400/30 text-white'
                                    : isWhatsApp
                                        ? 'bg-slate-800 border-emerald-700/30 text-emerald-400'
                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}>
                                    {isAssistant ? <Bot size={18} /> : <User size={18} />}
                                </div>
                                <div className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${
                                            isAssistant 
                                                ? isWhatsApp ? 'text-emerald-400' : 'text-indigo-400' 
                                                : 'text-slate-500'
                                        }`}>
                                            {isAssistant ? (msg.sender || 'System Agent') : (isWhatsApp ? (thread.senderName || thread.sender) : 'Human Interactor')}
                                        </span>
                                        {isWhatsApp && (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[7px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20">
                                                <MessageCircle size={8} className="inline mr-1" />WA
                                            </span>
                                        )}
                                        {msg.isGhostReply && (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[7px] font-black text-amber-500 uppercase tracking-widest border border-amber-500/20">
                                                Approval Required
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[8px] text-slate-700 font-black uppercase tracking-widest mt-0.5">
                                        {new Date(msg.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Message Bubble */}
                            <div className={`max-w-[90%] md:max-w-[75%] space-y-3 ${isAssistant ? 'ml-12' : 'mr-12'}`}>
                                <div className={`relative p-6 shadow-xl transition-all duration-300 group-hover/msg:shadow-lg ${
                                    isWhatsApp
                                        ? isAssistant
                                            ? 'bg-slate-900/80 border border-emerald-500/10 text-slate-100 rounded-2xl rounded-tl-sm'
                                            : 'bg-emerald-900/30 border border-emerald-500/20 text-slate-100 rounded-2xl rounded-tr-sm'
                                        : isAssistant
                                            ? 'bg-slate-900/60 border border-white/10 text-slate-100 rounded-[2.5rem] rounded-tl-none ring-1 ring-white/5'
                                            : 'bg-indigo-600/10 border border-indigo-500/20 text-slate-200 rounded-[2.5rem] rounded-tr-none'
                                }`}>

                                    {/* Bubble tail indicator for WhatsApp */}
                                    {isWhatsApp && (
                                        <div className={`absolute top-0 w-3 h-3 ${
                                            isAssistant
                                                ? '-left-1.5 bg-slate-900/80 border-l border-t border-emerald-500/10 rotate-45'
                                                : '-right-1.5 bg-emerald-900/30 border-r border-t border-emerald-500/20 rotate-45'
                                        }`} />
                                    )}
                                    
                                    <div className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words font-medium ${msg.isGhostReply ? 'opacity-60 italic' : ''}`}>
                                        {cleanContent(msg.content, msg.draftContent)}
                                    </div>

                                    {/* Delivery status for WhatsApp */}
                                    {isWhatsApp && isAssistant && msg.status === 'COMPLETED' && (
                                        <div className="flex justify-end mt-2">
                                            <Check size={14} className="text-emerald-500" />
                                        </div>
                                    )}

                                    {msg.isGhostReply && (
                                        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 text-amber-500/80">
                                                <ShieldCheck size={16} />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Human-in-the-loop: Review draft output</p>
                                            </div>
                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                <button className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all">
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleApprove(msg.id)}
                                                    disabled={isApproving === msg.id}
                                                    className="flex-1 md:flex-none px-8 py-2.5 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
                                                >
                                                    {isApproving === msg.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="group-hover/btn:translate-x-1 transition-transform" />}
                                                    {isApproving === msg.id ? 'Launching' : 'Approve & Send'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Expandable Trace Context for Assistant Messages */}
                                    {isAssistant && trace && (
                                        <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                                            <button 
                                                onClick={() => toggleContext(msg.id)}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10"
                                            >
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                {isExpanded ? 'Hide Neural Logic' : 'View Execution Trace'}
                                                <Zap size={10} className={isExpanded ? 'text-amber-400' : 'text-slate-600'} />
                                            </button>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden space-y-4"
                                                    >
                                                        {trace.reasoning && (
                                                            <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                                                                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">Cognitive Path</label>
                                                                <p className="text-xs text-slate-400 italic leading-relaxed">{trace.reasoning}</p>
                                                            </div>
                                                        )}
                                                        {trace.tool_calls && trace.tool_calls.length > 0 && (
                                                            <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                                                                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500">Sub-Routine Invocations</label>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {trace.tool_calls.map((tc: any, tIdx: number) => (
                                                                        <div key={tIdx} className="p-3 bg-slate-900/50 rounded-xl border border-white/5 font-mono text-[10px] text-indigo-400 flex items-center justify-between">
                                                                            <span>{tc.function?.name || 'internal_tool'}</span>
                                                                            <span className="text-slate-600 text-[8px] font-black tracking-widest uppercase">Executed</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="p-5 bg-slate-950 rounded-2xl border border-white/5">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Unified State Bridge</label>
                                                                <div className="flex gap-4">
                                                                    <span className="text-[8px] font-black text-indigo-500/80 uppercase">{trace.total_tokens ? trace.total_tokens : '--'} Tokens</span>
                                                                    <span className="text-[8px] font-black text-emerald-500/80 uppercase">{trace.latency ? trace.latency.toFixed(2) + 's' : 'Calculating...'} Latency</span>
                                                                </div>
                                                            </div>
                                                            <pre className="text-[9px] text-slate-600 font-mono overflow-x-auto custom-scrollbar max-h-48 whitespace-pre-wrap leading-tight">
                                                                {JSON.stringify(trace, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    {/* Action Footers for User or Error States */}
                                    {msg.status && msg.status !== 'COMPLETED' && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {msg.status === 'PROCESSING' ? (
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400 italic">
                                                        <Loader2 className="animate-spin text-indigo-500" size={12} />
                                                        <span className="animate-pulse">Active Cognition...</span>
                                                    </div>
                                                ) : (
                                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase italic ${msg.status === 'FAILED' ? 'text-rose-500' : 'text-amber-500'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${msg.status === 'FAILED' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} />
                                                        <span>{msg.status}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {(msg.status === 'FAILED' || msg.status === 'RECEIVED') && (
                                                <button
                                                    disabled={isRetrying}
                                                    onClick={() => {
                                                        setIsRetrying(true);
                                                        fetch('/api/chat/reset', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ threadId: thread.id })
                                                        })
                                                            .then(() => fetchThread())
                                                            .finally(() => setIsRetrying(false));
                                                    }}
                                                    className={`px-5 py-2 bg-indigo-500/10 hover:bg-white hover:text-black text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-500/20 transition-all flex items-center gap-2 ${isRetrying ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isRetrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                    {isRetrying ? 'Syncing...' : 'Force Analysis'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Manager Reply Input Zone */}
            <div className="absolute bottom-4 left-0 right-0 max-w-3xl mx-auto px-4 w-full">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-2 flex items-end gap-2 shadow-2xl shadow-indigo-500/5">
                    <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Intervene as Manager (Human in the loop)..."
                        className="flex-1 bg-transparent text-white font-medium text-sm placeholder:text-slate-600 focus:outline-none resize-none px-4 py-3 max-h-32 custom-scrollbar"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                            }
                        }}
                    />
                    <button 
                        onClick={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                    >
                        {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="translate-x-0.5" />}
                    </button>
                </div>
            </div>

            {/* Aesthetic Background Accents */}
            <div className="fixed -bottom-64 -left-64 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full pointer-events-none -z-10" />
            <div className="fixed top-0 -right-64 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        </div>
    );
}
