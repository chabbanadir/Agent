'use client';

import React, { useState, useEffect } from 'react';
import {
    Link2,
    Plus,
    Mail,
    MessageCircle,
    Trash2,
    ToggleLeft,
    ToggleRight,
    ExternalLink,
    ShieldCheck,
    Loader2,
    CheckCircle2,
    XCircle,
    Building2,
    Key,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';

export default function ChannelsPage() {
    const { data: session } = useSession();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [settings, setSettings] = useState({
        isSyncEnabled: true,
        whatsappNumber: ''
    });
    const [newAccount, setNewAccount] = useState({
        type: 'GMAIL',
        name: '',
        address: '',
        config: {}
    });
    const [showWhatsAppQR, setShowWhatsAppQR] = useState(false);
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [waConnectionStatus, setWaConnectionStatus] = useState<'IDLE' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED'>('IDLE');
    const [realQR, setRealQR] = useState<string | null>(null);

    useEffect(() => {
        let pollInterval: any;
        if (showWhatsAppQR && newAccount.address) {
            pollInterval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/integrations/whatsapp/session?address=${encodeURIComponent(newAccount.address)}`);
                    const data = await res.json();
                    if (data.status) setWaConnectionStatus(data.status);
                    if (data.qr) setRealQR(data.qr);
                    
                    if (data.status === 'CONNECTED') {
                        clearInterval(pollInterval);
                        setTimeout(async () => {
                            // Create the actual account in DB now that it's linked
                            await finishConnection();
                        }, 2000);
                    }
                } catch (err) {
                    console.error("Poll error", err);
                }
            }, 3000);
        }
        return () => clearInterval(pollInterval);
    }, [showWhatsAppQR, newAccount.address]);

    const finishConnection = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            });
            if (res.ok) {
                setShowAddModal(false);
                setShowWhatsAppQR(false);
                setNewAccount({ type: 'GMAIL', name: '', address: '', config: {} });
                await fetchAccounts();
            }
        } catch (err) {
            console.error("Create failed", err);
        } finally {
            setIsSaving(false);
            setWaConnectionStatus('IDLE');
        }
    };

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchAccounts(), fetchSettings()]);
            setLoading(false);
        };
        init();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/api/channels');
            const data = await res.json();
            if (!data.error) setAccounts(data);
        } catch (err) {
            console.error("Failed to fetch channels", err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data && !data.error) {
                setSettings({
                    isSyncEnabled: data.isSyncEnabled !== undefined ? data.isSyncEnabled : true,
                    whatsappNumber: data.whatsappNumber || ''
                });
            }
        } catch (err) {
            console.error("Failed to fetch settings", err);
        }
    };

    const handleToggleGlobalSync = async () => {
        const newValue = !settings.isSyncEnabled;
        setSettings({ ...settings, isSyncEnabled: newValue });
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSyncEnabled: newValue })
            });
        } catch (err) {
            console.error("Failed to update global sync", err);
        }
    };

    const handleSyncNow = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/integrations/gmail/sync', { method: 'POST' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setSyncResult(`✅ Sync complete: ${data.details?.processed || 0} messages.`);
            setTimeout(() => setSyncResult(null), 5000);
        } catch (err: any) {
            setSyncResult(`❌ Error: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleToggleActive = async (account: any) => {
        try {
            const res = await fetch('/api/channels', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: account.id, isActive: !account.isActive })
            });
            if (res.ok) await fetchAccounts();
        } catch (err) {
            console.error("Toggle failed", err);
        }
    };

    const handleRefreshWatch = async (account: any) => {
        try {
            const res = await fetch('/api/channels', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: account.id, action: 'refresh_watch' })
            });
            const data = await res.json();
            if (data.success) {
                setSyncResult("✅ Watch refreshed");
                setTimeout(() => setSyncResult(null), 3000);
                await fetchAccounts();
            } else {
                setSyncResult("❌ Refresh failed");
                setTimeout(() => setSyncResult(null), 3000);
            }
        } catch (err) {
            console.error("Refresh failed", err);
        }
    };

    const handleRescanWhatsApp = async (account: any) => {
        if (!confirm(`Are you sure you want to rescan the QR for ${account.address}? This will temporarily disconnect the channel.`)) return;

        console.log(`[Channels] Rescan QR triggered for: ${account.address}`);
        
        // Reset modal state as if we are adding a new one, but with existing address
        setNewAccount({ 
            type: 'WHATSAPP', 
            name: account.name || '', 
            address: account.address, 
            config: account.config || {} 
        });
        setWaConnectionStatus('INITIALIZING');
        setShowWhatsAppQR(true);
        setRealQR(null);

        try {
            // 1. Delete existing session to force fresh QR
            await fetch(`/api/integrations/whatsapp/session?address=${encodeURIComponent(account.address)}`, { 
                method: 'DELETE' 
            });
            
            // 2. Start new session
            await fetch('/api/integrations/whatsapp/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: account.address })
            });
        } catch (err) {
            console.error("[Channels] Rescan failed", err);
        }
    };

    const handleDelete = async (id: string) => {
        console.log(`[Channels] Requesting deletion for channel ID: ${id}`);
        if (!confirm("Are you sure you want to disconnect this channel?")) {
            console.log("[Channels] Deletion cancelled by user.");
            return;
        }
        try {
            const res = await fetch(`/api/channels?id=${id}`, { method: 'DELETE' });
            console.log(`[Channels] Delete response status: ${res.status}`);
            if (res.ok) {
                console.log("[Channels] Deletion successful, refreshing accounts...");
                await fetchAccounts();
            } else {
                const errData = await res.json();
                console.error("[Channels] Deletion failed:", errData.error);
                alert(`Error: ${errData.error}`);
            }
        } catch (err) {
            console.error("[Channels] Delete failed", err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newAccount.type === 'WHATSAPP') {
            setWaConnectionStatus('INITIALIZING');
            setShowWhatsAppQR(true);
            try {
                await fetch('/api/integrations/whatsapp/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: newAccount.address })
                });
            } catch (err) {
                console.error("Init failed", err);
            }
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewAccount({ type: 'GMAIL', name: '', address: '', config: {} });
                await fetchAccounts();
            }
        } catch (err) {
            console.error("Create failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Synchronizing communication infrastructure...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black text-white tracking-tighter">
                        Channels & <span className="text-indigo-500">Inputs</span>
                    </h1>
                    <p className="text-slate-500 text-lg max-w-2xl">
                        Connect and manage all your incoming data streams. Agents only process messages from active channels.
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20"
                >
                    <Plus size={20} />
                    Connect Channel
                </button>
            </div>

            {/* Global Sync Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6 text-left">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Master Autonomous Sync</h3>
                            <p className="text-slate-500 text-sm">When enabled, background workers will poll connected channels and trigger agent processing.</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-4 min-w-[120px]">
                        <button
                            onClick={handleToggleGlobalSync}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors cursor-pointer ${settings.isSyncEnabled ? 'bg-indigo-600' : 'bg-slate-800'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.isSyncEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${settings.isSyncEnabled ? 'text-indigo-400' : 'text-slate-600'}`}>
                            {settings.isSyncEnabled ? 'Active' : 'Paused'}
                        </span>
                    </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex flex-col justify-between gap-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Manual Override</span>
                        {syncResult && (
                            <span className="text-[10px] font-bold text-indigo-400 animate-pulse">{syncResult}</span>
                        )}
                    </div>
                    <button
                        onClick={handleSyncNow}
                        disabled={syncing}
                        className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {syncing ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                        {syncing ? 'Syncing...' : 'Force Global Sync'}
                    </button>
                </div>
            </div>

            {/* Account Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ... existing account mapping ... */}
                {accounts.length === 0 ? (
                    <div className="col-span-full p-20 rounded-[3rem] bg-slate-900/50 border-2 border-dashed border-slate-800 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-slate-950 flex items-center justify-center text-slate-700">
                            <Link2 size={40} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-white">No channels connected</h3>
                            <p className="text-slate-500">Start by connecting a Gmail account or a Web API input.</p>
                        </div>
                    </div>
                ) : (
                    accounts.map((account) => (
                        <div
                            key={account.id}
                            className={`group relative p-8 rounded-[2.5rem] border transition-all duration-500 ${account.isActive
                                ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/50'
                                : 'bg-slate-950 border-slate-900 grayscale opacity-60'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl ${account.type === 'GMAIL' ? 'bg-rose-500/10 text-rose-500' : 'bg-green-500/10 text-green-500'
                                        }`}>
                                        {account.type === 'GMAIL' ? <Mail size={24} /> : <MessageCircle size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">{account.name || 'Unnamed Account'}</h3>
                                        <p className="text-slate-500 font-medium truncate max-w-[200px]">{account.address}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggleActive(account)}
                                        className={`transition-colors ${account.isActive ? 'text-indigo-400 hover:text-indigo-300' : 'text-slate-600 hover:text-slate-500'}`}
                                    >
                                        {account.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                    </button>
                                </div>
                            </div>

                            {/* WhatsApp Webhook Info */}
                            {account.type === 'WHATSAPP' && account.isActive && (
                                <div className="mt-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Webhook Config</p>
                                    <code className="block bg-slate-900 p-2 rounded-lg text-emerald-400 text-[10px] font-mono break-all border border-emerald-500/10">
                                        https://api.agentclaw.com/webhooks/whatsapp/{account.address}
                                    </code>
                                </div>
                            )}

                            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-800/50">
                                <div className="flex items-center gap-3">
                                    {account.isActive ? (
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                                <ShieldCheck size={12} /> Live
                                            </span>
                                            {account.type === 'GMAIL' && (
                                                <button
                                                    onClick={() => handleRefreshWatch(account)}
                                                    className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1"
                                                    title="Refresh push notification watch"
                                                >
                                                    <RefreshCw size={10} /> Refresh
                                                </button>
                                            )}
                                            {account.type === 'WHATSAPP' && (
                                                <button
                                                    onClick={() => handleRescanWhatsApp(account)}
                                                    className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1"
                                                    title="Rescan QR Code"
                                                >
                                                    <RefreshCw size={10} /> Rescan QR
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                            Paused
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(account.id)}
                                    className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                    title="Disconnect account"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Channel Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-24 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-2xl bg-slate-900/90 border border-white/10 rounded-[3rem] p-12 shadow-2xl backdrop-blur-2xl"
                        >
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Add New Channel</h2>
                                        <p className="text-slate-500 font-medium">Connect a new incoming data stream.</p>
                                    </div>
                                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400">
                                        <Plus className="rotate-45" size={24} />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setNewAccount({ ...newAccount, type: 'GMAIL' })}
                                            className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-4 ${newAccount.type === 'GMAIL' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                        >
                                            <Mail size={32} />
                                            <span className="font-bold uppercase tracking-widest text-xs">Gmail Account</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewAccount({ ...newAccount, type: 'WHATSAPP' })}
                                            className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-4 ${newAccount.type === 'WHATSAPP' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                        >
                                            <MessageCircle size={32} />
                                            <span className="font-bold uppercase tracking-widest text-xs">WhatsApp API</span>
                                        </button>
                                    </div>

                                    {newAccount.type === 'GMAIL' ? (
                                        <div className="space-y-6">
                                            <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 text-center space-y-4">
                                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto">
                                                    <ShieldCheck size={32} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-bold text-white">OAuth Synchronization</h3>
                                                    <p className="text-slate-500 text-sm">To connect a Gmail account, we must establish a secure handshake via Google. This ensures the background agent has the necessary permissions to read and respond to emails.</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    // Set a flag in cookie to indicate "linking" mode
                                                    const tid = (session?.user as any)?.tenantId || '';
                                                    console.log(`[Channels] Setting link cookie for tenant: ${tid}`);
                                                    document.cookie = `linking_tenant_id=${tid}; path=/; max-age=300; samesite=lax`;

                                                    await signIn('google', {
                                                        callbackUrl: '/dashboard/channels',
                                                        prompt: 'consent'
                                                    });
                                                }}
                                                className="w-full bg-white text-black h-16 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                                Authorize with Google
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleCreate} className="space-y-8">
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Channel Name</label>
                                                    <input
                                                        required
                                                        value={newAccount.name}
                                                        onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                                        placeholder="e.g. Sales Inbox"
                                                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl p-4 text-white font-medium outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Address / Identifier</label>
                                                    <input
                                                        required
                                                        value={newAccount.address}
                                                        onChange={e => setNewAccount({ ...newAccount, address: e.target.value })}
                                                        placeholder="Phone number with country code"
                                                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-2xl p-4 text-white font-medium outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="w-full bg-white text-black h-16 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all disabled:opacity-50 shadow-xl shadow-white/5 active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                                {isSaving ? 'Initializing Connection...' : 'Establish Channel Connection'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* WhatsApp QR Modal */}
            <AnimatePresence>
                {showWhatsAppQR && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl"
                        >
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">WhatsApp Link</h3>
                                <p className="text-slate-500 text-sm">Scan the dynamic QR code below to authorize the agent.</p>
                            </div>

                            <div className="relative aspect-square w-64 mx-auto bg-white rounded-3xl p-4 flex items-center justify-center overflow-hidden shadow-2xl shadow-indigo-500/20">
                                {waConnectionStatus === 'INITIALIZING' ? (
                                    <div className="text-center space-y-4">
                                        <Loader2 className="animate-spin text-indigo-500 mx-auto" size={48} />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waking neural link...</p>
                                    </div>
                                ) : waConnectionStatus === 'CONNECTED' ? (
                                    <div className="text-center space-y-4 animate-in zoom-in">
                                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-500/40">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Linked Securely</p>
                                    </div>
                                ) : realQR ? (
                                    <img 
                                        src={realQR} 
                                        alt="WhatsApp QR" 
                                        className="w-full h-full object-contain animate-in fade-in zoom-in"
                                    />
                                ) : (
                                    <div className="text-center space-y-4">
                                        <Loader2 className="animate-spin text-indigo-500 mx-auto" size={48} />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Handshake...</p>
                                    </div>
                                )}
                                
                                {waConnectionStatus === 'QR_READY' && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        <motion.div 
                                            animate={{ top: ['0%', '100%', '0%'] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${waConnectionStatus === 'QR_READY' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {waConnectionStatus === 'INITIALIZING' ? 'Booting Protocol...' : 
                                         waConnectionStatus === 'QR_READY' ? 'Scan to Link Device' : 
                                         waConnectionStatus === 'CONNECTED' ? 'Cognitive Handshake Complete' : 'Handshake Active'}
                                    </span>
                                </div>
                                
                                {waConnectionStatus !== 'CONNECTED' && (
                                    <button 
                                        onClick={() => {
                                            setShowWhatsAppQR(false);
                                            fetch(`/api/integrations/whatsapp/session?address=${encodeURIComponent(newAccount.address)}`, { method: 'DELETE' });
                                        }}
                                        className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        Abort Connection
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
