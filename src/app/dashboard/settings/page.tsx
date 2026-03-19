'use client';

import React, { useState, useEffect } from 'react';
import { Save, Mail, MessageCircle, ShieldCheck, Loader2, CheckCircle2, XCircle } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [settings, setSettings] = useState({
        gmailEmail: '',
        whatsappNumber: '',
        gmailSettings: { checkInterval: 60, autoReply: true },
        whatsappSettings: { enabled: true, webhookUrl: '' }
    });

    // Load saved settings on mount
    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setSettings({
                        gmailEmail: data.gmailEmail || '',
                        whatsappNumber: data.whatsappNumber || '',
                        gmailSettings: {
                            checkInterval: data.gmailSettings?.checkInterval || 60,
                            autoReply: data.gmailSettings?.autoReply !== undefined ? data.gmailSettings.autoReply : true,
                        },
                        whatsappSettings: {
                            enabled: data.whatsappSettings?.enabled !== undefined ? data.whatsappSettings.enabled : true,
                            webhookUrl: data.whatsappSettings?.webhookUrl || '',
                        }
                    });
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (): Promise<boolean> => {
        setSaveStatus('saving');
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (!res.ok) throw new Error(await res.text());
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
            return true;
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
            return false;
        }
    };

    // Save first, then sync — so the email is always persisted before the agent reads it
    const handleSync = async () => {
        setSyncResult(null);
        const saved = await handleSave();
        if (!saved) {
            setSyncResult('❌ Could not save settings before syncing. Please try again.');
            return;
        }
        setSyncing(true);
        try {
            const res = await fetch('/api/integrations/gmail/sync', { method: 'POST' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setSyncResult(`✅ ${data.status}${data.details?.processed !== undefined ? ` — ${data.details.processed} message(s) processed.` : ''}`);
        } catch (err: any) {
            setSyncResult(`❌ Sync failed: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
        );
    }

    const SaveIcon = saveStatus === 'saved' ? CheckCircle2 : saveStatus === 'error' ? XCircle : Save;
    const saveBtnColor = saveStatus === 'saved' ? 'bg-emerald-600 hover:bg-emerald-500' :
        saveStatus === 'error' ? 'bg-red-600 hover:bg-red-500' :
            'bg-indigo-600 hover:bg-indigo-500';

    return (
        <div className="space-y-12 animate-fade-in max-w-4xl text-white pb-24">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Integrations &amp; Settings</h1>
                    <p className="text-slate-500">Configure how your agents connect to the outside world.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className={`px-6 py-3 rounded-xl ${saveBtnColor} text-white font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50`}
                >
                    {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={20} /> : <SaveIcon size={20} />}
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error – Retry' : 'Save Settings'}
                </button>
            </header>

            <div className="space-y-8">
                {/* Gmail Integration */}
                <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            <Mail className="text-rose-400" />
                            <h2 className="text-xl font-bold">Gmail Inbound Integration</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${settings.gmailEmail ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            {settings.gmailEmail ? 'Connected' : 'Not Configured'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Business Email</label>
                            <div className="flex gap-4">
                                <input
                                    type="email"
                                    value={settings.gmailEmail}
                                    onChange={(e) => setSettings({ ...settings, gmailEmail: e.target.value })}
                                    placeholder="support@acme.com"
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:border-indigo-500 outline-none transition-all"
                                />
                                <button
                                    onClick={handleSync}
                                    disabled={syncing || saveStatus === 'saving' || !settings.gmailEmail}
                                    className="px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {syncing ? <Loader2 className="animate-spin" size={18} /> : 'Sync Now'}
                                </button>
                            </div>
                            {syncResult && (
                                <p className={`text-sm mt-2 px-4 py-2 rounded-lg ${syncResult.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {syncResult}
                                </p>
                            )}
                            <p className="text-xs text-slate-600 mt-1">
                                💡 Click <strong>Sync Now</strong> to save your email and run a sync. Your settings are always saved first.
                            </p>
                        </div>

                        <div className="flex items-center gap-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                            <div className="flex-1">
                                <p className="font-bold text-white mb-1">Auto-Response Monitoring</p>
                                <p className="text-xs text-slate-500">Allow agent to check and reply to unread emails automatically.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.gmailSettings.autoReply}
                                onChange={(e) => setSettings({ ...settings, gmailSettings: { ...settings.gmailSettings, autoReply: e.target.checked } })}
                                className="w-6 h-6 accent-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>
                </section>

                {/* WhatsApp Integration */}
                <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            <MessageCircle className="text-emerald-400" />
                            <h2 className="text-xl font-bold">WhatsApp Business API</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${settings.whatsappNumber ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            {settings.whatsappNumber ? 'Active' : 'Disconnected'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assigned Number</label>
                            <input
                                type="text"
                                value={settings.whatsappNumber}
                                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                                placeholder="+1 234 567 8900"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="group p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                            <p className="font-bold text-white">Webhook Configuration</p>
                            <p className="text-xs text-slate-500 mb-4">Point your Meta Business webhook to this endpoint.</p>
                            <code className="block bg-slate-900 p-3 rounded-lg text-indigo-400 text-xs font-mono break-all border border-indigo-500/20">
                                https://api.agentclaw.com/webhooks/whatsapp/{settings.whatsappNumber || 'your-number'}
                            </code>
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className="p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-4">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Advanced Security Protections</h2>
                    <p className="text-slate-400 max-w-lg mx-auto">All integration tokens are encrypted using AES-256-GCM. We never store raw passwords or unencrypted OAuth tokens.</p>
                </section>
            </div>
        </div>
    );
}
