"use client";

import { useState, useEffect } from "react";
import Simulator from "@/components/Simulator";
import Login from "@/components/Login";
import { 
  Stethoscope, 
  Activity, 
  LogOut, 
  ShieldCheck, 
  User, 
  Clock,
  HeartPulse,
  Info
} from "lucide-react";
import { motion } from "motion/react";

import { auth } from "@/firebase";
import { signOut } from "firebase/auth";

import { useAuth } from "@/hooks/use-auth";

export default function Page() {
  const { user, loading: authLoading, profile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* Medical Grade Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-xl shadow-lg shadow-teal-100">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900 leading-none">Tele-Triage AI</h1>
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Clinical Decision Support</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-4 text-slate-500">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-semibold">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <Clock className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-semibold">24/7 Monitoring</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{profile?.displayName || user.email?.split('@')[0]}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Patient ID: {user.uid.slice(0, 8)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar - Patient Info & Stats */}
        <aside className="lg:col-span-3 space-y-6 hidden lg:block">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-full border border-teal-100">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Last Analysis</span>
                <span className="text-xs font-semibold text-slate-700">Today, 12:45 PM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Risk Profile</span>
                <span className="text-xs font-semibold text-amber-600">Moderate</span>
              </div>
            </div>
          </section>

          <section className="bg-teal-600 p-6 rounded-2xl shadow-xl shadow-teal-100 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-teal-100 uppercase tracking-widest mb-2">Emergency Support</h3>
              <p className="text-sm font-medium mb-4 opacity-90">If you are experiencing severe symptoms, please contact emergency services immediately.</p>
              <button className="w-full bg-white text-teal-700 font-bold py-3 rounded-xl text-sm hover:bg-teal-50 transition-colors">
                Call Emergency (911)
              </button>
            </div>
            <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-teal-500/30 rotate-12" />
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Clinical Guidelines
            </h3>
            <ul className="space-y-3">
              <li className="text-xs text-slate-600 flex gap-2">
                <div className="w-1 h-1 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                Provide clear, well-lit photos for skin analysis.
              </li>
              <li className="text-xs text-slate-600 flex gap-2">
                <div className="w-1 h-1 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                Describe duration and progression of symptoms.
              </li>
              <li className="text-xs text-slate-600 flex gap-2">
                <div className="w-1 h-1 bg-teal-500 rounded-full mt-1.5 shrink-0" />
                AI results are for triage only, not diagnosis.
              </li>
            </ul>
          </section>
        </aside>

        {/* Main Simulator Area */}
        <div className="lg:col-span-9 h-full flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col"
          >
            <Simulator />
          </motion.div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest text-center sm:text-left">
            © 2026 Tele-Triage AI System • Secure Clinical Decision Support Interface
          </p>
          <div className="flex gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-teal-600">Privacy Policy</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-teal-600">Terms of Service</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-teal-600">Medical Disclaimer</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
