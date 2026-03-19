'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, FileText, TrendingUp, Activity, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
    const [stats, setStats] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch stats from agents/messages/docs APIs
                const [agentsRes, messagesRes, docsRes] = await Promise.all([
                    fetch('/api/agents'),
                    fetch('/api/chat/stats').catch(() => ({ json: () => ({ count: 0 }) })), // Optional endpoint
                    fetch('/api/upload')
                ]);

                const agents = await agentsRes.json();
                const docs = await docsRes.json();

                setStats([
                    { label: 'Total Messages', value: '0', change: '0%', icon: <MessageSquare size={20} /> },
                    { label: 'Active Agents', value: agents.id ? '1' : '0', change: '0%', icon: <Users size={20} /> },
                    { label: 'Knowledge Base', value: `${docs.length || 0} Docs`, change: `+${docs.length || 0}`, icon: <FileText size={20} /> },
                    { label: 'Conversion Rate', value: '0%', change: '0%', icon: <TrendingUp size={20} /> },
                ]);

                setEvents([
                    { type: 'message', text: 'System initialized and ready', time: 'Just now' },
                    { type: 'agent', text: agents.name || 'No agent configured', time: 'Active' },
                    ...(docs.slice(0, 2).map((d: any) => ({ type: 'doc', text: `Doc "${d.name}" indexed`, time: 'Synced' })))
                ]);
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
                <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-fade-in pb-24 text-white">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Overview</h1>
                    <p className="text-slate-500">Welcome back. Monitoring agent performance in real-time.</p>
                </div>
                <Link href="/dashboard/agents" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20">
                    Deploy New Agent
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                                {stat.icon}
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white">
                <div className="lg:col-span-2 p-8 rounded-3xl bg-slate-900 border border-slate-800 h-96 flex flex-col group">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity size={20} className="text-indigo-400" />
                            Agent Activity Stream
                        </h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl relative overflow-hidden bg-slate-950/20">
                        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-indigo-500/10 to-transparent" />
                        <p className="text-slate-600 font-medium italic">Live Activity Monitoring Active...</p>
                    </div>
                </div>

                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 h-96 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-8">Recent Events</h2>
                    <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                        {events.length > 0 ? events.map((event, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 animate-pulse" />
                                <div>
                                    <p className="text-sm text-slate-300 leading-tight">{event.text}</p>
                                    <p className="text-xs text-slate-600 font-medium mt-1 uppercase tracking-wider">{event.time}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-600 italic">No recent events.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
