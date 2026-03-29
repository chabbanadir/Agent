'use client';

import React, { useState } from 'react';
import {
    Activity,
    Bot,
    FileText,
    Settings,
    MessageSquare,
    BarChart3,
    Users,
    LogOut,
    Link2,
    BrainCircuit,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
    Ban,
    AlertTriangle,
    Layers
} from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 80 : 300 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`relative border-r border-white/5 flex flex-col glass backdrop-blur-3xl z-20 transition-all shrink-0 ${isCollapsed ? 'p-4' : 'p-6'}`}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-30"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <Link href="/" className={`flex items-center mb-12 group h-10 shrink-0 ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform shrink-0">
                        <BrainCircuit className="text-white" size={20} />
                    </div>
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl font-black text-white tracking-tighter uppercase italic group-hover:text-indigo-400 transition-colors whitespace-nowrap overflow-hidden"
                            >
                                Agent<span className="text-indigo-500">Claw</span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>

                <nav className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-6">
                    {[
                        {
                            group: 'Interaction Zone',
                            items: [
                                { icon: <BarChart3 size={20} />, label: 'Overview', href: '/dashboard' },
                                { icon: <MessageSquare size={20} />, label: 'Conversations', href: '/dashboard/conversations' },
                                { icon: <AlertTriangle size={20} />, label: 'Escalations', href: '/dashboard/escalations' },
                                { icon: <Layers size={20} />, label: 'Message Queue', href: '/dashboard/turns' },
                            ]
                        },
                        {
                            group: 'Intelligence Hub',
                            items: [
                                { icon: <Users size={20} />, label: 'Agents', href: '/dashboard/agents' },
                                { icon: <FileText size={20} />, label: 'Knowledge Base', href: '/dashboard/knowledge' },
                                { icon: <Ban size={20} />, label: 'Blacklist', href: '/dashboard/blacklist' },
                            ]
                        },
                        {
                            group: 'System Ecosystem',
                            items: [
                                { icon: <Link2 size={20} />, label: 'Channels', href: '/dashboard/channels' },
                                { icon: <Bot size={20} />, label: 'Simulation', href: '/dashboard/simulation' },
                                { icon: <Activity size={20} />, label: 'Telemetry', href: '/dashboard/telemetry' },
                                { icon: <ShieldAlert size={20} />, label: 'Skipped', href: '/dashboard/skipped' },
                            ]
                        },
                        {
                            group: 'General',
                            items: [
                                { icon: <Settings size={20} />, label: 'Settings', href: '/dashboard/settings' },
                            ]
                        }
                    ].map((section, idx) => (
                        <div key={idx} className="space-y-2">
                            {!isCollapsed && (
                                <h3 className="px-5 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">
                                    {section.group}
                                </h3>
                            )}
                            {section.items.map((item, i) => (
                                <Link
                                    key={i}
                                    href={item.href}
                                    className={`group flex items-center gap-4 px-3 py-2.5 mx-2 rounded-2xl transition-all hover:bg-white/5 text-slate-400 font-bold hover:text-white uppercase tracking-widest text-[10px] ${isCollapsed ? 'justify-center mx-0' : ''}`}
                                >
                                    <span className="group-hover:text-indigo-400 transition-colors shrink-0">{item.icon}</span>
                                    {!isCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="mt-auto pt-8 border-t border-white/5 space-y-6 relative overflow-hidden">
                    <div className={`flex items-center gap-4 px-1 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-sm font-black text-indigo-400 shrink-0">
                            {session?.user?.name?.[0] || 'U'}
                        </div>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex-1 overflow-hidden"
                            >
                                <p className="text-sm font-black text-white truncate uppercase tracking-tighter">{session?.user?.name || 'User'}</p>
                                <p className="text-[10px] text-slate-500 truncate font-bold">{session?.user?.email || 'authenticated'}</p>
                            </motion.div>
                        )}
                    </div>
                    <button
                        onClick={() => signOut()}
                        className={`w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all hover:bg-rose-500/10 text-slate-500 font-bold hover:text-rose-400 uppercase tracking-widest text-[10px] ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <span className="shrink-0"><LogOut size={20} /></span>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                            >
                                Sign Out
                            </motion.span>
                        )}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-8 lg:p-12 bg-mesh relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10 h-full max-w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
