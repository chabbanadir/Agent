"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MessageCircle, Mail, Activity, CheckCircle2 } from "lucide-react";

interface Turn {
    sessionId: string;
    protocol: string;
    messagesCount: number;
    executeAt: number;
    senderOriginal: string;
    lastContentSnippet: string;
}

export default function ActiveTurnsPage() {
    const [turns, setTurns] = useState<Turn[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const fetchTurns = async () => {
            try {
                const res = await fetch("/api/turns");
                if (res.ok) {
                    const data = await res.json();
                    setTurns(data.turns || []);
                }
            } catch (err) {
                console.error("Failed to fetch turns");
            } finally {
                setLoading(false);
            }
        };

        fetchTurns();
        const interval = setInterval(fetchTurns, 2000); // Poll every 2 seconds
        
        // Fast timer for UI countdowns
        const clockInterval = setInterval(() => setNow(Date.now()), 100);

        return () => {
            clearInterval(interval);
            clearInterval(clockInterval);
        };
    }, []);

    const getStatusBadge = (turn: Turn) => {
        const remaining = Math.max(0, turn.executeAt - now);
        
        if (remaining === 0) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Processing...
                </span>
            );
        }
        if (turn.protocol === 'WHATSAPP' && remaining > 15000) {
            return (
                <span className="inline-flex animate-pulse items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                    <Activity className="w-3 h-3 mr-1" /> User Typing...
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <Clock className="w-3 h-3 mr-1" /> Debouncing
            </span>
        );
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Live Conversation Engine
                </h1>
                <p className="text-gray-500 mt-2">
                    Monitoring the real-time Turn Protocol layer (BullMQ + Redis). 
                    Watch incoming fragmented messages get batched dynamically before hitting the AI.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Channel
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Batched
                                </th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    AI Trigger In
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 relative">
                            <AnimatePresence>
                                {turns.length === 0 && !loading && (
                                    <motion.tr 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <Activity className="w-8 h-8 mb-3 text-gray-300 stroke-[1.5]" />
                                                <p>No active conversations in the waiting room.</p>
                                                <p className="text-xs mt-1">Send a WhatsApp message to see it appear here dynamically.</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )}
                                
                                {turns.map((turn) => {
                                    const remaining = Math.max(0, turn.executeAt - now);
                                    
                                    return (
                                        <motion.tr 
                                            key={turn.sessionId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {turn.protocol === 'WHATSAPP' ? (
                                                        <MessageCircle className="w-5 h-5 text-green-500 mr-2" />
                                                    ) : (
                                                        <Mail className="w-5 h-5 text-blue-500 mr-2" />
                                                    )}
                                                    <span className="text-sm font-medium text-gray-900">{turn.protocol}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium">{turn.senderOriginal}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px]">"{turn.lastContentSnippet}"</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(turn)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold ring-2 ring-white shadow-sm">
                                                    {turn.messagesCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="font-mono text-sm font-semibold text-slate-700">
                                                    {(remaining / 1000).toFixed(1)}s
                                                </span>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden flex justify-end">
                                                    <div 
                                                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-100" 
                                                        style={{ width: `${Math.min(100, (remaining / (turn.protocol === 'WHATSAPP' ? 10000 : 60000)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
