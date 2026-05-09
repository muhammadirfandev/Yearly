import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Trash2, Calendar, Clock, Target, Sparkles, Globe, Bell, BellOff } from 'lucide-react';
import { getYearProgress, getDaysRemaining, getDaysElapsed } from './lib/time';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  deadline: number;
  reminderDays?: number; // 0 means disabled
}

type TimeZone = 'local' | 'Europe/Finland' | 'America/New_York';

export default function App() {
  const currentYear = new Date().getFullYear();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(() => getYearProgress(new Date()));
  const [daysRemaining, setDaysRemaining] = useState(() => getDaysRemaining(new Date()));
  const [daysElapsed, setDaysElapsed] = useState(() => getDaysElapsed(new Date()));
  const [activeTimeZone, setActiveTimeZone] = useState<TimeZone>('local');
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('yearly-goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [newGoal, setNewGoal] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [aiQuote, setAiQuote] = useState<string | null>("Time is the only currency you cannot earn back. Spend it intentionally on the goals that define your year.");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Helper to calculate individual goal progress
  const getGoalProgress = (goal: Goal) => {
    if (goal.completed) return 100;
    const now = currentTime.getTime();
    const duration = goal.deadline - goal.createdAt;
    if (duration <= 0) return 0;
    const elapsed = now - goal.createdAt;
    return Math.min(Math.max((elapsed / duration) * 100, 0), 100);
  };

  const getTimeRemaining = (deadline: number) => {
    const diff = deadline - currentTime.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { diff, days, hours, minutes };
  };

  const timeDisplay = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    if (activeTimeZone !== 'local') {
      options.timeZone = activeTimeZone;
    }
    return new Intl.DateTimeFormat('en-US', options).format(currentTime);
  }, [currentTime, activeTimeZone]);

  const fetchAiQuote = async () => {
    if (!genAI) return;
    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Give a short, powerful, philosophical 1-sentence motivation quote for a person who has finished ${progress.toFixed(2)}% of the year ${currentYear}. There are ${daysRemaining} days left. Make it about intentionality and time.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      setAiQuote(text || "Time is the only currency you cannot earn back. Spend it intentionally on the goals that define your year.");
    } catch (e) {
      console.error(e);
      setAiQuote("Time is the only currency you cannot earn back. Spend it intentionally on the goals that define your year.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetchAiQuote();
  }, [currentYear]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setProgress(getYearProgress(now));
      setDaysRemaining(getDaysRemaining(now));
      setDaysElapsed(getDaysElapsed(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('yearly-goals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    
    const deadlineDate = newGoalDeadline 
      ? new Date(newGoalDeadline).getTime() 
      : new Date(currentYear, 11, 31, 23, 59, 59).getTime();

    const goal: Goal = {
      id: crypto.randomUUID(),
      title: newGoal.trim(),
      completed: false,
      createdAt: Date.now(),
      deadline: deadlineDate,
      reminderDays: 3, // Default to 3 days before
    };
    setGoals([goal, ...goals]);
    setNewGoal('');
    setNewGoalDeadline('');
  };

  const setReminder = (id: string, days: number) => {
    setGoals(goals.map(g => g.id === id ? { ...g, reminderDays: days } : g));
  };

  const toggleGoal = (id: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-start p-6 md:p-12 selection:bg-accent selection:text-bg">
      {/* Header / Year Progress Section */}
      <header className="w-full max-w-4xl mt-16 mb-24 relative flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full flex flex-col items-center"
        >
          {/* Centered Year */}
          <h1 className="font-display italic text-[10rem] md:text-[18rem] leading-none opacity-5 absolute -top-24 md:-top-36 pointer-events-none select-none">
            {currentYear}
          </h1>
          
          <div className="z-10 mt-8 md:mt-12 w-full flex flex-col items-center">
            <p className="text-xs font-mono uppercase tracking-[0.4em] text-accent/80 mb-4 px-4 bg-accent/5 py-1 rounded-full border border-accent/10">
              {timeDisplay}
            </p>
            
            <div className="flex flex-col items-center gap-0">
              <span className="text-8xl md:text-9xl font-bold tracking-tighter leading-tight">
                {Math.floor(progress)}
                <span className="text-3xl md:text-5xl font-mono text-accent">.{progress.toFixed(2).split('.')[1]}%</span>
              </span>
            </div>

            <div className="flex mt-6 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-sm">
              {(['local', 'Europe/London', 'America/New_York'] as TimeZone[]).map((tz) => (
                <button
                  key={tz}
                  onClick={() => setActiveTimeZone(tz)}
                  className={`px-4 py-1.5 text-[10px] uppercase font-mono transition-all rounded-full ${
                    activeTimeZone === tz 
                      ? 'bg-accent text-bg font-bold shadow-[0_0_10px_rgba(0,255,95,0.3)]' 
                      : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  {tz === 'local' ? 'Local' : tz.split('/').pop()?.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-2xl h-1 bg-white/5 mt-16 relative overflow-hidden rounded-full">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="absolute top-0 left-0 h-full bg-accent shadow-[0_0_20px_rgba(0,255,95,0.6)]"
          />
        </div>
        
        <div className="mt-8 opacity-40 font-mono text-[10px] uppercase tracking-widest">
          {daysRemaining} days to defining {currentYear + 1}
        </div>
      </header>

      <main className="w-full max-w-4xl mt-12 mb-20">
        <section className="space-y-12">
          {/* Main Action Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Context Header */}
            <div className="flex justify-between items-end border-b border-white/5 pb-8">
              <div className="space-y-1">
                <h2 className="text-sm font-mono uppercase tracking-widest opacity-40 flex items-center gap-2">
                  <Target size={14} className="text-accent" />
                  Primary Objectives
                </h2>
                <p className="text-[10px] font-mono opacity-20 uppercase tracking-tighter">
                  {daysElapsed} days elapsed &bull; {daysRemaining} days remaining
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase opacity-30 mb-1">Temporal Location</p>
                <div className="flex items-center gap-2 text-sm font-mono opacity-60">
                  <Globe size={12} className="text-accent/40" />
                  {timeDisplay}
                </div>
              </div>
            </div>

            {/* AI Motivation Section */}
            <AnimatePresence>
              {(aiQuote || isAiLoading) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-accent/[0.03] border border-accent/10 rounded-sm relative overflow-hidden group"
                >
                  <Sparkles size={16} className="text-accent absolute top-4 right-4 opacity-10 group-hover:opacity-40 transition-opacity" />
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent/20" />
                  <p className="text-[10px] font-mono uppercase text-accent/40 mb-4 tracking-widest">Quote of the day</p>
                  {isAiLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded-sm" />
                      <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded-sm opacity-50" />
                    </div>
                  ) : (
                    <p className="text-base italic leading-relaxed opacity-80 max-w-2xl font-serif">
                      "{aiQuote}"
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add Goal Form */}
            <form onSubmit={addGoal} className="flex flex-col gap-3 p-8 bg-white/[0.02] border border-white/5 rounded-sm relative group hover:border-white/10 transition-colors">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Define your next milestone..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-sm px-5 py-5 text-base focus:outline-none focus:border-accent/40 transition-colors placeholder:opacity-20"
                />
                <button 
                  type="submit"
                  className="bg-accent text-bg px-8 py-5 rounded-sm font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(0,255,95,0.1)] shrink-0"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="flex items-center gap-6 px-1">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-mono uppercase opacity-30 flex items-center gap-1.5 cursor-pointer hover:opacity-60 transition-opacity">
                    <Calendar size={12} className="text-accent/60" />
                    Set Deadline
                  </label>
                  <input 
                    type="date"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-[2px] text-[10px] font-mono text-accent/80 outline-none uppercase cursor-pointer hover:border-accent/40 transition-colors"
                  />
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <p className="text-[11px] font-mono opacity-30 italic leading-none">
                  Goal duration is tracked starting from today.
                </p>
              </div>
            </form>

            {/* Goals List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <AnimatePresence mode="popLayout">
                {goals.map((goal) => {
                  const goalProgress = getGoalProgress(goal);
                  const { diff, days, hours, minutes } = getTimeRemaining(goal.deadline);
                  const isPastDue = diff < 0 && !goal.completed;

                  let timeDisplayStr = '';
                  if (days >= 1) {
                    timeDisplayStr = `${days} days`;
                  } else if (hours >= 1) {
                    timeDisplayStr = `${hours} hours`;
                  } else if (minutes >= 1) {
                    timeDisplayStr = `${minutes} mins`;
                  } else {
                    timeDisplayStr = `< 1 min`;
                  }

                  return (
                    <motion.div
                      key={goal.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group flex flex-col p-8 rounded-sm border transition-all duration-700 relative overflow-hidden ${
                        goal.completed 
                          ? 'bg-accent/[0.02] border-accent/10' 
                          : 'bg-white/[0.03] border-white/5 hover:border-accent/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-start gap-5 flex-1 mt-1">
                          <button 
                            onClick={() => toggleGoal(goal.id)}
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                              goal.completed 
                                ? 'bg-accent border-accent text-bg shadow-[0_0_20px_rgba(0,255,95,0.3)] scale-110' 
                                : 'border-white/10 hover:border-accent/60 hover:scale-105'
                            }`}
                          >
                            {goal.completed && <Check size={16} strokeWidth={4} />}
                          </button>
                          <span className={`text-lg font-medium leading-[1.3] tracking-tight ${goal.completed ? 'line-through text-white/20' : 'text-white/90'}`}>
                            {goal.title}
                          </span>
                        </div>
                        
                        {/* Radial Progress Indicator */}
                        <div className="relative w-14 h-14 shrink-0 ml-4 group-hover:rotate-[360deg] transition-transform duration-1000 ease-in-out">
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="transparent"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-white/5"
                            />
                            <motion.circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="transparent"
                              stroke="currentColor"
                              strokeWidth="3"
                              initial={{ strokeDashoffset: 151 }}
                              animate={{ strokeDashoffset: 151 - (151 * goalProgress / 100) }}
                              transition={{ duration: 2, ease: "circOut" }}
                              className="text-accent drop-shadow-[0_0_8px_rgba(0,255,95,0.6)]"
                              style={{ strokeDasharray: "151" }}
                            />
                          </svg>
                          <span className={`${goal.completed ? 'text-accent' : 'text-white/60'} absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold`}>
                            {Math.floor(goalProgress)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between border-t border-white/5 pt-6 mt-auto">
                        <div className="flex gap-8">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-1.5">Horizon</span>
                            <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded-sm">
                              {new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-1.5">Momentum</span>
                            <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-sm ${
                              goal.completed ? 'bg-accent/20 text-accent' : isPastDue ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/70'
                            }`}>
                              {goal.completed ? 'Complete' : isPastDue ? 'Expired' : timeDisplayStr}
                            </span>
                          </div>

                          <div className="flex flex-col ml-2">
                             <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-1.5">Reminder</span>
                             <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setReminder(goal.id, goal.reminderDays === 0 ? 3 : 0)}
                                  className={`p-1 rounded-sm transition-all ${goal.reminderDays ? 'text-accent bg-accent/10' : 'text-white/20 hover:text-white/40'}`}
                                  title={goal.reminderDays ? `Disable notifications` : 'Enable notifications'}
                                >
                                  {goal.reminderDays ? <Bell size={12} /> : <BellOff size={12} />}
                                </button>
                                {goal.reminderDays !== 0 && (
                                  <div className="flex items-center gap-1 group/reminder">
                                    <input 
                                      type="number"
                                      min="1"
                                      max="365"
                                      value={goal.reminderDays}
                                      onChange={(e) => setReminder(goal.id, parseInt(e.target.value) || 0)}
                                      className="bg-accent/5 border border-accent/20 w-8 h-6 text-[10px] font-mono text-accent text-center rounded-sm focus:outline-none focus:border-accent/50 selection:bg-accent/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-[9px] font-mono text-accent/40 lowercase">days before</span>
                                  </div>
                                )}
                             </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => deleteGoal(goal.id)}
                          className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-2.5 text-red-500/60 hover:text-red-500 transition-all hover:scale-125"
                          title="Purge Objective"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
            {goals.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32 border border-dashed border-white/5 rounded-sm group hover:border-accent/20 transition-colors"
              >
                <div className="relative inline-block mb-6">
                  <Target size={56} className="text-white/5 group-hover:text-accent/10 transition-colors" />
                  <Plus size={20} className="absolute -bottom-1 -right-1 text-accent/20 animate-pulse" />
                </div>
                <p className="text-base font-mono uppercase tracking-[0.3em] opacity-30 group-hover:opacity-60 transition-opacity">The Ledger is Empty</p>
                <p className="text-xs opacity-20 mt-3 max-w-xs mx-auto leading-relaxed">Defining your intentions is the first step toward reclaiming your time.</p>
              </motion.div>
            )}
          </motion.div>
        </section>
      </main>

      {/* Footer / Info */}
      <footer className="mt-auto pt-20 pb-8 w-full max-w-4xl text-center">
        <div className="h-px w-12 bg-accent/20 mx-auto mb-6" />
        <p className="text-[10px] font-mono uppercase tracking-widest opacity-20">
          Yearly &bull; Precision Time Tracking &bull; {currentYear}
        </p>
      </footer>
    </div>
  );
}
