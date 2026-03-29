'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import { Bot, Shield, Zap, BrainCircuit, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-[#020617] text-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('/premium_minimalist_bg.png')] bg-cover bg-center opacity-40" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-[#020617]/50 to-[#020617]" />
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[160px] rounded-full" />
            </div>

            <div className="w-full max-w-[440px] relative z-10 flex flex-col">
                {/* Logo Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="flex flex-col items-center mb-10"
                >
                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/50 mb-6 group hover:scale-110 transition-transform duration-500">
                        <BrainCircuit className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-2">
                        Agent<span className="text-indigo-500">Claw</span>
                    </h1>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Neural Access Active</span>
                    </div>
                </motion.div>

                {/* Login Card */}
                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    className="glass border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

                    <div className="text-center mb-10 space-y-2">
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Portal Access</h2>
                        <p className="text-slate-500 text-sm font-medium">Authenticate to synchronize with your swarm.</p>
                    </div>

                    <div className="space-y-6">
                        <button
                            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                            className="group w-full flex items-center justify-center gap-4 bg-white text-black h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sync with Google
                        </button>

                        {process.env.NODE_ENV === 'development' && (
                            <button
                                onClick={() => signIn('credentials', { email: 'dev@example.com', callbackUrl: '/dashboard' })}
                                className="group w-full flex items-center justify-center gap-4 bg-indigo-600 text-white h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-600/20"
                            >
                                Developer Mock Login
                            </button>
                        )}

                        <div className="relative py-2 flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5"></div>
                            </div>
                            <span className="relative px-4 bg-transparent text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Neural Protocol</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center group/feature hover:bg-white/[0.05] transition-all">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 group-hover/feature:scale-110 transition-transform">
                                    <Shield size={20} />
                                </div>
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Post-Quantum</span>
                            </div>
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center group/feature hover:bg-white/[0.05] transition-all">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 group-hover/feature:scale-110 transition-transform">
                                    <Lock size={20} />
                                </div>
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Secure Handshake</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Footer Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-10 flex flex-col items-center space-y-4"
                >
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors cursor-pointer underline underline-offset-4 decoration-white/10">Terms</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors cursor-pointer underline underline-offset-4 decoration-white/10">Architecture</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors cursor-pointer underline underline-offset-4 decoration-white/10">Privacy</span>
                    </div>
                    <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] italic">
                        By continuing, you authenticate with the global swarm.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
