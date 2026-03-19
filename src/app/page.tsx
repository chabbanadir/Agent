'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, Shield, Zap, ArrowRight, LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
        style={{
          backgroundImage: 'url("/images/hero-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1px)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950 z-0" />

      {/* Hero Section */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot size={20} />
          </div>
          AgentClaw
        </div>
        <div className="hidden md:flex items-center gap-8 text-slate-400 font-medium">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <button
            onClick={() => signIn()}
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-800 hover:border-slate-700 transition-all font-bold text-white"
          >
            <LogIn size={16} /> Sign In
          </button>
          <button
            onClick={() => signIn()}
            className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 transition-all font-bold text-white shadow-lg shadow-indigo-500/20"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
          <Zap size={14} />
          <span>The Future of Autonomous Multi-Agent Systems</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
          The Operating System <br /> for AI Agents.
        </h1>

        <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Experience the power of specialized agent swarms.
          Orchestrate researchers, clerks, and classifiers in a seamless, enterprise-grade environment.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-24">
          <button
            onClick={() => signIn()}
            className="px-8 py-4 rounded-full bg-white text-black font-bold flex items-center gap-2 hover:bg-slate-200 transition-all shadow-xl shadow-white/10"
          >
            Log In to Console <ArrowRight size={20} />
          </button>
        </div>

        {/* Agentic Illustration */}
        <div className="relative max-w-5xl mx-auto mb-48 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-800 bg-slate-950/50 backdrop-blur-3xl p-4">
            <div className="aspect-video relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/images/agentic-flow.png"
                alt="Agentic Flow Illustration"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-left">
                <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs mb-2">Platform Engine</p>
                <h2 className="text-3xl font-bold text-white">Agentic Orchestration Flow</h2>
                <p className="text-slate-400 mt-2 max-w-xl">A decentralized system where specialized agents cooperate to solve complex tasks with precision and autonomy.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section id="features" className="grid md:grid-cols-3 gap-8 text-white">
          {[
            { icon: <Shield />, title: 'Tenant Isolation', desc: 'Secure data separation for every organizational unit.' },
            { icon: <Bot />, title: 'Multi-Agent Swarms', desc: 'Autonomous delegation between specialized core agents.' },
            { icon: <Zap />, title: 'Actionable Insights', desc: 'High-speed processing to drive mission-critical outcomes.' }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-slate-800 text-left hover:border-indigo-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
