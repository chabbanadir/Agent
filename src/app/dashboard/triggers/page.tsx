'use client';

import React from 'react';
import { Zap, Link as LinkIcon, Bell, Shield, Info, Terminal, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function TriggersPage() {
    const [copied, setCopied] = useState(false);
    const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/gmail/sync`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-12 animate-fade-in text-white pb-24">
            <header>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Automated Triggers</h1>
                        <p className="text-slate-500">Configure webhooks and events to wake up your agents.</p>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-2">
                        <Zap size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Active System</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-8 relative overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <LinkIcon size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Main Webhook Endpoint</h2>
                        </div>

                        <p className="text-slate-400 leading-relaxed">
                            Use this URL to trigger an automatic synchronization. When this endpoint receives a POST request, AgentClaw will immediately poll for new emails and process them.
                        </p>

                        <div className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl group">
                            <code className="flex-1 font-mono text-sm text-indigo-300 break-all">
                                {webhookUrl}
                            </code>
                            <button
                                onClick={copyToClipboard}
                                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all text-slate-300 group-hover:text-white"
                            >
                                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                            </button>
                        </div>

                        <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Info size={18} />
                                <span className="text-sm font-bold uppercase tracking-tight">Pro-Tip: Monitoring</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                You can integrate this with <strong className="text-slate-300">Google Cloud Pub/Sub</strong>. Create a push subscription pointing to this URL.
                                Set the <code className="bg-slate-900 px-1 rounded">topic</code> to your Gmail watch event and ensure you've called the <code className="bg-slate-900 px-1 rounded">watch()</code> method in your integration settings.
                            </p>
                        </div>

                        {/* Background subtle glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                    </section>

                    <section className="p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <Terminal size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Manual CLI Trigger</h2>
                        </div>
                        <p className="text-slate-400 text-sm">Test your hook from the command line using curl:</p>
                        <div className="bg-black/40 rounded-2xl p-6 font-mono text-xs text-slate-500 border border-slate-800/50 leading-relaxed">
                            <span className="text-emerald-500">curl</span> -X POST {webhookUrl} \<br />
                            &nbsp;&nbsp;-H <span className="text-amber-500">"Content-Type: application/json"</span> \<br />
                            &nbsp;&nbsp;-d <span className="text-amber-500">{"'{}'"}</span>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="p-8 rounded-3xl bg-indigo-600 space-y-6 shadow-2xl shadow-indigo-500/20">
                        <Bell className="text-white" size={32} />
                        <h3 className="text-xl font-black text-white leading-tight">Instant Agent Wake-up</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed font-medium opacity-90">
                            By default, agents poll every 5 minutes. Webhooks reduce this latency to <strong className="text-white underline decoration-wavy underline-offset-4">sub-second</strong> response times.
                        </p>
                    </section>

                    <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                        <div className="flex items-center gap-3">
                            <Shield className="text-slate-500" size={20} />
                            <h3 className="font-bold text-slate-300">Security Note</h3>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Endpoint security is currently enforced via session-based auth. For external Pub/Sub triggers, ensure you whitelist Google Cloud IP ranges or provide a secure bearer token in the headers.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
