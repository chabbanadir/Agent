'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  ArrowRight,
  Cpu,
  Layers,
  Shield,
  Mail,
  MessageCircle,
  Terminal,
  Globe,
  Bot,
  Sparkles,
  Search,
  ChevronRight,
  Play,
  PlusCircle,
  Zap
} from 'lucide-react';

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-[#f8fafc] selection:bg-indigo-500/30 font-sans selection:text-white overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('/premium_minimalist_bg.png')] bg-cover bg-center opacity-40" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-[#020617]/50 to-[#020617]" />
        <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-500/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tight uppercase italic">
              Agent<span className="text-indigo-500">Claw</span>
            </span>
          </motion.div>

          <div className="hidden lg:flex items-center gap-8">
            {['Architecture', 'Swarms', 'Security', 'Enterprise'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all">
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hidden sm:block text-[11px] font-black uppercase tracking-[0.2em] text-white hover:text-indigo-400 transition-colors">
              Console
            </Link>
            <Link href="/dashboard" className="bg-white text-black px-7 py-2.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95">
              Launch Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 z-10">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">Neural Engine v4.0 Deploying</span>
          </motion.div>

          <div className="relative mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.85] uppercase italic"
            >
              <span className="text-white">Collect.</span> <br />
              <span className="text-gradient">Orchestrate.</span> <br />
              <span className="text-indigo-500">Automate.</span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl font-medium leading-relaxed mb-16 tracking-tight"
          >
            The world's first multi-channel neural infrastructure. Connect your entire business
            to a swarm of specialized agents that think, act, and resolve in real-time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link href="/dashboard" className="group w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-600/30">
              Build Your Swarm
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
            </Link>
            <Link href="#architecture" className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-full border border-white/10 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-white/5 transition-all">
              Technical Docs
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Neural Hub Visualizer (Inspired by Superhuman/Mockups) */}
      <section className="py-20 relative z-10 flex justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="w-full max-w-6xl aspect-[16/9] rounded-[3rem] bg-[#0a0f1d] border border-white/5 shadow-[0_0_100px_rgba(79,70,229,0.1)] overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50" />

          {/* Mock Interface Details */}
          <div className="absolute top-0 w-full h-12 bg-black/20 border-b border-white/5 flex items-center px-6 justify-between">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>
            <div className="text-[10px] uppercase font-black tracking-widest text-slate-600">Swarm Orchestrator Console</div>
            <div className="w-10" />
          </div>

          <div className="h-full pt-12 p-12 grid grid-cols-12 gap-10">
            {/* Sidebar Mock */}
            <div className="col-span-3 space-y-8 py-4">
              <div className="space-y-3">
                <div className="h-2 w-1/2 bg-indigo-500/20 rounded-full" />
                <div className="h-4 w-full bg-slate-800/50 rounded-lg" />
                <div className="h-4 w-full bg-slate-800/50 rounded-lg" />
                <div className="h-4 w-5/6 bg-slate-800/50 rounded-lg" />
              </div>
              <div className="space-y-3 pt-6">
                <div className="h-2 w-2/3 bg-slate-800/30 rounded-full" />
                <div className="h-10 w-full bg-indigo-600 rounded-xl" />
                <div className="h-10 w-full bg-slate-900 border border-white/5 rounded-xl" />
              </div>
            </div>

            {/* Main Center Visualization */}
            <div className="col-span-6 relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[300px] h-[300px] rounded-full border border-indigo-500/10 animate-ping opacity-20" />
                <div className="w-[200px] h-[200px] rounded-full border border-indigo-500/20 absolute" />
              </div>

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-full h-full absolute flex items-center justify-center"
              >
                <div className="absolute top-0 w-12 h-12 rounded-xl glass border border-indigo-400/50 flex items-center justify-center translate-y-[-100px]"><Mail className="text-indigo-400" size={20} /></div>
                <div className="absolute bottom-0 w-12 h-12 rounded-xl glass border border-emerald-400/50 flex items-center justify-center translate-y-[100px]"><MessageCircle className="text-emerald-400" size={20} /></div>
                <div className="absolute left-0 w-12 h-12 rounded-xl glass border border-purple-400/50 flex items-center justify-center translate-x-[-120px]"><Zap className="text-purple-400" size={20} /></div>
                <div className="absolute right-0 w-12 h-12 rounded-xl glass border border-rose-400/50 flex items-center justify-center translate-x-[120px]"><Bot className="text-rose-400" size={20} /></div>
              </motion.div>

              <div className="z-10 w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/50 group-hover:scale-110 transition-transform duration-500">
                <BrainCircuit className="text-white" size={48} />
              </div>
            </div>

            {/* Right Mock Details */}
            <div className="col-span-3 py-4 space-y-6">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Input Log</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="font-mono text-[9px] text-indigo-400/70 space-y-1">
                  <p>{'>'} Analyzing intent...</p>
                  <p>{'>'} Routing to Finance-Agent</p>
                  <p>{'>'} Executing resolution...</p>
                </div>
              </div>
              <div className="h-32 bg-slate-900 shadow-inner rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-indigo-500/20 to-transparent" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Integration Gird (Lattice inspired) */}
      <section id="architecture" className="py-32 bg-slate-950/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/2 space-y-8 text-left">
              <h2 className="text-5xl font-black text-white uppercase italic leading-none tracking-tighter">
                Seamless <br />
                <span className="text-indigo-500">Ecosystem.</span>
              </h2>
              <p className="text-slate-400 text-lg md:text-xl font-medium tracking-tight leading-relaxed">
                AgentClaw isn't another silo. It's the unifying neural layer
                for your entire stack. Connect any channel, pollinate any data,
                and let the swarm handle the rest.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                {['Gmail', 'WhatsApp', 'Zapier', 'OpenAI', 'Slack', 'Discord', 'Custom APIs'].map((tag) => (
                  <span key={tag} className="px-5 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:border-indigo-400/30 hover:text-white transition-all cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 grid grid-cols-4 gap-6 relative">
              <div className="absolute inset-0 bg-indigo-500/5 blur-[80px]" />
              {[Mail, MessageCircle, Terminal, Globe, Zap, Bot, Search, Cpu, Layers, Shield, Sparkles].map((Icon, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -5, scale: 1.05 }}
                  className="aspect-square rounded-3xl glass border border-white/5 flex items-center justify-center group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Icon className="text-slate-400 group-hover:text-white transition-colors" size={24} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features (Superhuman UI style) */}
      <section id="swarms" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {[
              {
                icon: Cpu,
                title: "Parallel Processing",
                desc: "Deploy massive swarms of specialized agents that process thousands of data points simultaneously without performance degradation."
              },
              {
                icon: Layers,
                title: "Hierarchical Memory",
                desc: "Our agents share a global knowledge base while maintaining individual context, allowing for cross-departmental intelligence."
              },
              {
                icon: Shield,
                title: "Post-Quantum Security",
                desc: "Every transmission and token is wrapped in enterprise-grade AES-256-GCM encryption with rotational key schemas."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="space-y-6 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all duration-500">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-600/5 to-transparent" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-12">
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none italic uppercase"
          >
            TRANSFORM <br />
            <span className="text-gradient">OPERATIONS.</span>
          </motion.h2>
          <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto tracking-tight leading-relaxed">
            Join the next evolution of autonomous enterprise systems. Stop managing tasks.
            Start orchestrating intelligence.
          </p>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/dashboard" className="w-full sm:w-auto px-16 py-7 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.25em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5">
              Get Started
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto px-16 py-7 rounded-full border border-white/10 text-white font-black text-xs uppercase tracking-[0.25em] hover:bg-white/5 transition-all">
              Talk to Engineers
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-black/20">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <BrainCircuit className="text-white" size={18} />
            </div>
            <span className="text-lg font-black tracking-tight uppercase italic text-white">
              Agent<span className="text-indigo-500">Claw</span>
            </span>
          </div>

          <div className="flex gap-12">
            {['X', 'GitHub', 'LinkedIn', 'Status'].map((link) => (
              <Link key={link} href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors">
                {link}
              </Link>
            ))}
          </div>

          <p className="text-slate-600 text-[9px] uppercase font-black tracking-[0.4em]">
            © 2026 AGENTCLAW INC. PATENT PENDING.
          </p>
        </div>
      </footer>
    </div>
  );
}
