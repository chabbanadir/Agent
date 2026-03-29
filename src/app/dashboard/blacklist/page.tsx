"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function BlacklistPage() {
    const [blacklist, setBlacklist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newAddress, setNewAddress] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchBlacklist();
    }, []);

    const fetchBlacklist = async () => {
        try {
            const res = await fetch("/api/blacklist");
            const data = await res.json();
            if (Array.isArray(data)) setBlacklist(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAddress) return;
        setAdding(true);

        try {
            const res = await fetch("/api/blacklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: newAddress, channel: "WHATSAPP", reason: "Added manually via Dashboard" }),
            });
            if (res.ok) {
                setNewAddress("");
                fetchBlacklist();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/blacklist?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setBlacklist(prev => prev.filter(b => b.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
                        Global Blacklist
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Manage numbers that the Agent should permanently ignore.
                    </p>
                </div>
            </div>

            {/* Add Form */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
            >
                <form onSubmit={handleAdd} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-400 mb-2">WhatsApp Number (with country code)</label>
                        <input
                            type="text"
                            placeholder="+212600000000"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={adding || !newAddress}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {adding ? "Adding..." : "Add to Blacklist"}
                    </button>
                </form>
            </motion.div>

            {/* List */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading blacklist...</div>
                ) : blacklist.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            🚫
                        </div>
                        <p>No numbers are currently blacklisted.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-white/5 border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-medium">Channel</th>
                                <th className="px-6 py-4 font-medium">Address (Number)</th>
                                <th className="px-6 py-4 font-medium">Added</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {blacklist.map((item) => (
                                <motion.tr 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={item.id} 
                                    className="hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                                            {item.channel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{item.address}</td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-slate-400 hover:text-red-400 transition-colors text-sm font-medium"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
