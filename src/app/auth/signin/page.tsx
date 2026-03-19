'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import { Bot, LogIn, Shield, Zap } from 'lucide-react';

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Illustration with Blur */}
            <div
                className="absolute inset-0 z-0 opacity-20 mix-blend-overlay"
                style={{
                    backgroundImage: 'url("/images/agentic-flow.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(40px)'
                }}
            />

            {/* Ambient Background Glows */}
            <div className="absolute top-0 -left-48 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 -right-48 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-12 animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-6 group hover:scale-110 transition-transform duration-500">
                        <Bot size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter mb-2">AgentClaw</h1>
                    <p className="text-slate-400 font-medium">Enterprise Orchestration Portal</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl animate-scale-in">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                        <p className="text-slate-500 text-sm">Sign in to access your autonomous agent swarms.</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                            className="w-full flex items-center justify-center gap-3 bg-white text-black h-14 rounded-2xl font-bold hover:bg-slate-200 transition-all shadow-lg hover:shadow-white/5 active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="relative py-4 flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5"></div>
                            </div>
                            <span className="relative px-4 bg-slate-950/0 text-slate-600 text-xs font-bold uppercase tracking-widest">Enterprise Only</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                                <Shield size={18} className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Secure Access</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                                <Zap size={18} className="text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fast Auth</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <p className="mt-8 text-center text-slate-600 text-sm">
                    By continuing, you agree to our <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">Terms of Service</span>
                </p>
            </div>
        </div>
    );
}
