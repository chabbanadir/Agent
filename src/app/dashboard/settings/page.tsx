'use client';

import React, { useState, useEffect } from 'react';
import { Save, Mail, MessageCircle, ShieldCheck, Loader2, CheckCircle2, XCircle, KeyRound, Copy, Plus, Trash2, Building2, Sparkles } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [settings, setSettings] = useState({
        name: '',
        gmailEmail: '',
        whatsappNumber: '',
        isSyncEnabled: true,
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
                        name: data.name || '',
                        gmailEmail: data.gmailEmail || '',
                        whatsappNumber: data.whatsappNumber || '',
                        isSyncEnabled: data.isSyncEnabled !== undefined ? data.isSyncEnabled : true,
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

        fetch('/api/settings/apikeys')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setApiKeys(data);
            })
            .catch(console.error);
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

    const handleGenerateApiKey = async () => {
        setGeneratingKey(true);
        try {
            const defaultName = `API Token - ${new Date().toISOString().split('T')[0]}`;
            const keyName = window.prompt("Enter a label for this API Token:", defaultName) || defaultName;

            const res = await fetch('/api/settings/apikeys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: keyName })
            });

            if (!res.ok) throw new Error('Failed to generate key');
            const data = await res.json();
            if (data.apiKey) {
                setApiKeys([data.apiKey, ...apiKeys]);
            } else if (data.key) {
                // Handle different response format based on backend standard (either data.apiKey or the object itself)
                setApiKeys([data, ...apiKeys]);
            }
        } catch (err) {
            console.error(err);
            window.alert("Failed to generate API Key. Check server logs.");
        } finally {
            setGeneratingKey(false);
        }
    };

    const handleDeleteApiKey = async (id: string) => {
        try {
            const res = await fetch(`/api/settings/apikeys?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setApiKeys(apiKeys.filter(k => k.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Optional: show a tiny toast or UI feedback here
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
        <div className="space-y-12 animate-fade-in w-full text-white pb-24">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Workspace Settings</h1>
                    <p className="text-slate-500">Manage your organization's identity and API access security.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className={`px-6 py-3 rounded-xl min-w-[180px] justify-center ${saveBtnColor} text-white font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50`}
                >
                    {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={20} /> : <SaveIcon size={20} />}
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Changes'}
                </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                {/* LEFT COLUMN */}
                <div className="space-y-8">
                    {/* Organization Identity */}
                    <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl shadow-slate-950/50">
                        <div className="flex items-center gap-3 text-white">
                            <Building2 className="text-indigo-400" />
                            <h2 className="text-xl font-bold">Organization Identity</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Public Workspace Name</label>
                                <input
                                    type="text"
                                    value={settings.name}
                                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                    placeholder="Acme Corp"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:border-indigo-500 outline-none transition-all"
                                />
                                <p className="text-xs text-slate-500">
                                    Display name used across your dashboard and communication templates.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                    <section className="p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-4">
                            <ShieldCheck size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Enterprise Security</h2>
                        <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
                            All communication credentials and external tokens are strictly encrypted using AES-256-GCM.
                            Our infrastructure follows zero-trust principles to ensure your data stays private.
                        </p>
                    </section>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-8">
                    {/* External Custom Web API Keys */}
                    <section className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl shadow-slate-950/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <KeyRound className="text-indigo-400" />
                                <h2 className="text-xl font-bold">API Tokens</h2>
                            </div>
                            <button
                                onClick={handleGenerateApiKey}
                                disabled={generatingKey}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg text-xs flex items-center gap-2 disabled:opacity-50"
                            >
                                {generatingKey ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                New Token
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-slate-500">
                                Use these tokens to authenticate external integrations with the <code className="text-indigo-400">/api/external/chat</code> endpoint.
                            </p>

                            <div className="space-y-3">
                                {apiKeys.length === 0 ? (
                                    <div className="p-6 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No keys generated</p>
                                    </div>
                                ) : (
                                    apiKeys.map((key) => (
                                        <div key={key.id} className="flex flex-col items-start justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/30 transition-all group">
                                            <div className="w-full space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{key.name || 'Personal Token'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => copyToClipboard(key.key)}
                                                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
                                                            title="Copy Token"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteApiKey(key.id)}
                                                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all border border-red-500/20"
                                                            title="Revoke Token"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-white font-mono text-[11px] bg-slate-900/80 px-3 py-3 rounded-xl border border-slate-800 overflow-hidden">
                                                    <span className="truncate">{key.key}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[9px] font-bold text-slate-600 tracking-widest">
                                                    <span>Added: {new Date(key.createdAt).toLocaleDateString()}</span>
                                                    {key.lastUsed && <span className="text-emerald-500/70 uppercase">In Use: {new Date(key.lastUsed).toLocaleTimeString()}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
