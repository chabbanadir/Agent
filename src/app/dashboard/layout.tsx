'use client';

import React from 'react';
import { Bot, FileText, Settings, MessageSquare, BarChart3, Users, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-900 flex flex-col p-6 backdrop-blur-3xl bg-slate-950/50">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter mb-12 text-white hover:opacity-80 transition-opacity">
                    <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
                        <Bot size={14} />
                    </div>
                    AgentClaw
                </Link>

                <nav className="flex-1 space-y-2">
                    {[
                        { icon: <BarChart3 size={18} />, label: 'Overview', href: '/dashboard' },
                        { icon: <MessageSquare size={18} />, label: 'Conversations', href: '/dashboard/conversations' },
                        { icon: <Bot size={18} />, label: 'Simulation', href: '/dashboard/simulation' },
                        { icon: <Users size={18} />, label: 'Agents', href: '/dashboard/agents' },
                        { icon: <FileText size={18} />, label: 'Knowledge Base', href: '/dashboard/knowledge' },
                        { icon: <Settings size={18} />, label: 'Settings', href: '/dashboard/settings' },
                    ].map((item, i) => (
                        <Link
                            key={i}
                            href={item.href}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all hover:bg-slate-900 text-slate-400 font-medium hover:text-white"
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-900 space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                            {session?.user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{session?.user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate">{session?.user?.email || 'authenticated'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all hover:bg-rose-500/10 text-slate-500 font-medium hover:text-rose-400"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-12 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent">
                {children}
            </main>
        </div>
    );
}
