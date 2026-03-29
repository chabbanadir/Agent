'use client';

import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Users,
    FileText,
    TrendingUp,
    Activity,
    Loader2,
    Bot,
    User,
    ArrowUpRight,
    Zap,
    BrainCircuit,
    Plus
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
};

export default function DashboardOverview() {
    const [stats, setStats] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [activityStream, setActivityStream] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await fetch('/api/dashboard/stats');
                const data = await res.json();

                if (data.stats) {
                    setStats([
                        { label: 'Total Messages', value: data.stats.totalMessages.toLocaleString(), change: '+12%', icon: <MessageSquare size={18} />, tooltip: 'Total processed messages across all channels.' },
                        { label: 'Active Agents', value: data.stats.activeAgents.toString(), change: 'Stable', icon: <Users size={18} />, tooltip: 'Number of AI agents currently active in the ecosystem.' },
                        { label: 'Knowledge Base', value: `${data.stats.totalDocs}`, change: 'Indexed', icon: <FileText size={18} />, tooltip: 'Total number of reference documents digested by the swarm.' },
                        { label: 'Conversion Rate', value: data.stats.conversionRate, change: '+2.4%', icon: <TrendingUp size={18} />, tooltip: 'Percentage of business intents resulting in successful resolution without human intervention.' },
                    ]);
                    setEvents(data.events || []);
                    setActivityStream(data.activityStream || []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-t-2 border-indigo-500 animate-spin" />
                    <BrainCircuit className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-24">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight italic uppercase mb-2">
                        Neural <span className="text-indigo-500">Console</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Engine Active</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">System performance optimized for real-time orchestration.</p>
                    </div>
                </div>
                <Link href="/dashboard/agents" className="group flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5">
                    <Plus size={16} />
                    Deploy Swarm
                </Link>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-[2rem] glass border border-white/5 hover:border-indigo-500/30 transition-all group"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                {stat.icon}
                            </div>
                            <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full ${stat.change.includes('+') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-white/5'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                                {stat.tooltip && (
                                    <div className="text-slate-600 hover:text-slate-400 cursor-help transition-colors" title={stat.tooltip}>
                                        <div className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px] font-bold">?</div>
                                    </div>
                                )}
                            </div>
                            <p className="text-4xl font-black text-white tracking-tighter leading-none">{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Activity and Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Stream */}
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 rounded-[2.5rem] bg-[#0a0f1d] border border-white/5 overflow-hidden flex flex-col group min-h-[450px]"
                >
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                                <Activity size={20} className="text-indigo-400" />
                                Swarm Activity
                            </h2>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gmail</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Internal</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto max-h-[400px] custom-scrollbar space-y-4">
                        {activityStream.length > 0 ? activityStream.map((activity, i) => {
                            const sourceColor =
                                activity.source === 'GMAIL' ? 'bg-red-500' :
                                    activity.source === 'WHATSAPP' ? 'bg-emerald-500' :
                                        'bg-blue-500';
                            const sourceShadow =
                                activity.source === 'GMAIL' ? 'shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                    activity.source === 'WHATSAPP' ? 'shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                                        'shadow-[0_0_10px_rgba(59,130,246,0.3)]';

                            return (
                                <div key={i} className="flex gap-5 p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 transition-all group/item overflow-hidden relative">
                                    {/* Source Indicator Line */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${sourceColor} opacity-50`} />

                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${activity.role === 'assistant' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-900 text-slate-500 border border-white/5'
                                        } group-hover/item:scale-110 transition-transform relative`}>
                                        {activity.role === 'assistant' ? <Bot size={22} /> : <User size={22} />}
                                        <div className={`absolute -right-1 -top-1 w-3 h-3 rounded-full ${sourceColor} ${sourceShadow} border-2 border-[#0a0f1d]`} />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <p className="text-sm font-black text-white uppercase italic tracking-tight">{activity.actor}</p>
                                                <span className="text-[9px] font-black tracking-[0.2em] uppercase bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-500/10">{activity.category || 'EVENT'}</span>
                                                <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md border ${activity.source === 'GMAIL' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                                                        activity.source === 'WHATSAPP' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                                                            'text-blue-400 border-blue-500/20 bg-blue-500/5'
                                                    }`}>
                                                    {activity.source}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-600 font-bold tracking-tighter">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <p className="text-slate-400 text-sm font-medium leading-relaxed">{activity.action}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4">
                                <Zap size={40} className="text-slate-600" />
                                <p className="text-slate-600 font-black uppercase tracking-widest text-xs">No activity detected</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Recent Events */}
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.5 }}
                    className="rounded-[2.5rem] glass border border-white/5 p-8 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tight">System Log</h2>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Real-time</span>
                    </div>

                    <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {events.length > 0 ? events.map((event, i) => (
                            <div key={i} className="relative pl-6 overflow-hidden before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-indigo-500 before:rounded-full before:shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                                <p className="text-sm text-slate-300 font-medium leading-snug">{event.text}</p>
                                <p className="text-[10px] text-slate-600 font-bold mt-2 uppercase tracking-widest">{event.time}</p>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
                                <FileText size={40} className="text-slate-600" />
                                <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Logs clear</p>
                            </div>
                        )}
                    </div>

                    <button className="mt-8 w-full py-4 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-white/5 hover:text-white transition-all">
                        View Full History
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
