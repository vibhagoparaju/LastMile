import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Heart, History, MessageSquare, Star, ArrowLeft, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function FamilyPortal({ user }: { user: any }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-secondary">
       <nav className="p-8 flex justify-between items-center max-w-7xl mx-auto">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted hover:text-primary transition-all group">
             <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-all" /> 
             <span className="font-medium text-muted">Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <div className="text-xs font-bold text-muted uppercase tracking-widest">Enrollment</div>
                <div className="text-primary font-serif italic">Robert • PIM Active</div>
             </div>
             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Users size={20} />
             </div>
          </div>
       </nav>

       <main className="max-w-7xl mx-auto px-8 pb-24 grid lg:grid-cols-12 gap-12">
          
          <section className="lg:col-span-8 space-y-12">
             <header>
                <h1 className="text-6xl font-serif mb-4 text-primary">The Family <span className="italic">Connection Feed.</span></h1>
                <p className="text-muted text-xl max-w-lg leading-relaxed">Contribute to the Identity Model and watch the bridge grow stronger.</p>
             </header>

             <div className="grid md:grid-cols-2 gap-8">
                <div className="p-10 rounded-[48px] bg-card shadow-soft border border-border-dim flex flex-col justify-between">
                   <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-12">
                      <Heart size={28} />
                   </div>
                   <div>
                      <h3 className="text-3xl font-serif mb-4">Contribution Mode</h3>
                      <p className="text-muted mb-8 leading-relaxed italic border-l-2 border-primary/20 pl-4">"Add your own memories of Robert. We cross-reference them with his PIM to find shared resonance."</p>
                      <button className="w-full py-4 bg-primary text-secondary rounded-2xl font-bold flex items-center justify-center gap-2">
                         <Plus size={18} /> Submit Memory
                      </button>
                   </div>
                </div>

                <div className="p-10 rounded-[48px] bg-secondary text-white shadow-soft border border-border-dim flex flex-col justify-between overflow-hidden relative">
                   <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-12">
                         <Star size={28} />
                      </div>
                      <h3 className="text-3xl font-serif mb-4">Legacy Steward</h3>
                      <p className="text-white/60 mb-8 leading-relaxed">You are currently the primary Legacy Steward. Your access will cascade to future generations.</p>
                      <button className="w-full py-4 bg-white text-secondary rounded-2xl font-bold">Permissions Manager</button>
                   </div>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>
             </div>

             <div className="space-y-8 pt-12">
                <h2 className="text-4xl font-serif">Shared Moments</h2>
                <div className="space-y-6">
                   <MomentItem 
                     title="The Roadtrip Discovery" 
                     desc="Robert's memory of the 1987 roadtrip matches Priya's story from Session 14."
                     date="Today"
                     author="System Synthesis"
                   />
                   <MomentItem 
                     title="Principles of Humor" 
                     desc="AI detected a recurring metaphor about 'the dancing clock' in his early stories."
                     date="Yesterday"
                     author="Identity Graph"
                   />
                </div>
             </div>
          </section>

          <aside className="lg:col-span-4 space-y-8">
             <div className="glass p-8 rounded-[40px] shadow-soft">
                <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-6">Family Circle</h3>
                <div className="space-y-6">
                   <FamilyMember name="Priya (Meera)" role="Primary Caregiver" active />
                   <FamilyMember name="Aiden" role="Steward" />
                   <FamilyMember name="Dr. Nair" role="Clinical Observer" />
                </div>
                <button className="w-full mt-8 py-3 bg-card rounded-xl text-xs font-bold uppercase tracking-widest text-muted border border-border-dim">Invite Member</button>
             </div>

             <div className="p-8 rounded-[40px] bg-card border border-border-dim shadow-soft text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full mx-auto flex items-center justify-center text-accent mb-4">
                   <Star size={20} />
                </div>
                <h3 className="font-serif italic text-lg mb-2">PIM Richness: 84.2%</h3>
                <p className="text-xs text-muted leading-relaxed mb-6">We've reached the threshold for 'Identity Mirroring'. High-fidelity Bridge sessions are now possible.</p>
                <button onClick={() => navigate('/bridge')} className="w-full py-4 bg-primary text-secondary rounded-2xl text-sm font-bold shadow-soft">Launch Bridge Session</button>
             </div>
          </aside>

       </main>
    </div>
  );
}

function MomentItem({ title, desc, date, author }: any) {
  return (
    <div className="p-8 rounded-[32px] bg-card border border-border-dim shadow-soft flex gap-6 items-start">
       <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-primary shrink-0">
          <Sparkles size={20} />
       </div>
       <div>
          <div className="flex justify-between items-center mb-2">
             <h4 className="text-xl font-serif text-white">{title}</h4>
<span className="text-[10px] uppercase font-bold text-muted tracking-wider">{date}</span>
          </div>
          <p className="text-muted leading-relaxed mb-4">{desc}</p>
          <div className="text-[10px] uppercase font-bold text-primary tracking-widest">SOURCE: {author}</div>
       </div>
    </div>
  );
}

function FamilyMember({ name, role, active = false }: any) {
  return (
    <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-border-dim flex items-center justify-center text-muted">
             <Users size={14} />
          </div>
          <div>
             <div className="text-sm font-bold text-white">{name}</div>
<div className="text-[10px] text-muted">{role}</div>
          </div>
       </div>
       {active && <div className="w-2 h-2 rounded-full bg-green-500" />}
    </div>
  );
}
