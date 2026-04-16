import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Activity, MessageSquare, Heart, RefreshCw, History, ExternalLink, Sparkles } from 'lucide-react';

const socket = io();

export default function BridgeSession({ user }: { user: any }) {
  const navigate = useNavigate();
  const [sessionActive, setSessionActive] = useState(false);
  const [emotionalState, setEmotionalState] = useState('Stable');
  const [prompts, setPrompts] = useState([
    { text: "Ask him about the time he drove from Chennai to Goa in 1987.", confidence: 0.95, type: 'STORY' },
    { text: "Mention his favorite old radio show to ground him.", confidence: 0.88, type: 'ANCHOR' },
    { text: "Ask if he remembers the smell of his mother's kitchen.", confidence: 0.82, type: 'SENSORY' }
  ]);

  useEffect(() => {
    if (!user) navigate('/');
    socket.emit('join-bridge', user.uid);
    
    socket.on('bridge-event', (data) => {
      console.log('Remote pulse:', data);
    });

    return () => {
      socket.off('bridge-event');
    };
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-secondary text-white flex flex-col">
       <header className="p-8 border-b border-border-dim flex justify-between items-center glass">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <History className="text-primary w-6 h-6" />
                <span className="font-serif text-xl font-bold text-white">Bridge Portal</span>
             </div>
             <div className="h-6 w-[1px] bg-border-dim/20" />
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_green]" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted">Robert: Lucid</span>
             </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-card border border-border-dim rounded-full text-sm font-bold hover:bg-border-dim transition-all">End Bridge</button>
       </header>

       <main className="flex-1 grid lg:grid-cols-12 overflow-hidden">
          
          {/* Bridge Controls (Left) */}
          <section className="lg:col-span-8 p-12 space-y-12 overflow-y-auto">
             <div>
                <h1 className="text-6xl font-serif mb-4 leading-tight text-white">Robert appears to be in a <span className="italic text-primary">high-clarity window</span>.</h1>
                <p className="text-xl text-muted max-w-2xl leading-relaxed">Estimated duration: <span className="text-white font-bold">45 minutes</span>. Focus on sensory anchors and high-resonance memories.</p>
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                <div className="glass p-10 rounded-[48px] border border-border-dim shadow-2xl relative overflow-hidden group">
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-12">
                         <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-all border border-primary/20">
                            <Activity size={24} />
                         </div>
                         <div className="text-right">
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Pulse Score</div>
                            <div className="text-4xl font-serif text-primary">82/100</div>
                         </div>
                      </div>
                      <h3 className="text-2xl mb-2 font-serif text-white">Emotional Resonance</h3>
                      <p className="text-muted text-sm leading-relaxed mb-8">He is currently highly responsive to family-centric stories. Avoid clinical topics.</p>
                      
                      <div className="flex items-center gap-4 py-4 border-t border-border-dim text-muted">
                         <div className="w-3 h-3 bg-green-500 rounded-full" />
                         <span className="text-sm font-bold">{emotionalState} Engagement</span>
                      </div>
                   </div>
                </div>

                <div className="glass p-10 rounded-[48px] border border-border-dim shadow-2xl flex flex-col justify-center">
                    <h3 className="text-stone-400 uppercase tracking-widest text-[10px] font-bold mb-6">Cognitive Baseline</h3>
                    <div className="flex items-end gap-2 mb-8">
                       {[0.2, 0.4, 0.3, 0.8, 0.9, 0.6, 0.8].map((h, i) => (
                         <motion.div 
                           key={i} 
                           initial={{ height: 0 }}
                           animate={{ height: h * 100 }}
                           className="flex-1 bg-primary/30 rounded-t-lg"
                         />
                       ))}
                    </div>
                    <p className="text-xs text-muted italic text-center">Coherence levels are at a 6-week high.</p>
                </div>
             </div>

             <div className="pt-8">
                <div className="flex justify-between items-center mb-10">
                   <h2 className="text-3xl font-serif">Resonance Prompts</h2>
                   <button className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-all">
                      <RefreshCw size={14} /> Refresh Engine
                   </button>
                </div>

                <div className="space-y-6">
                   {prompts.map((p, i) => (
                     <motion.div 
                       key={i}
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: i * 0.1 }}
                       className="glass group p-8 rounded-[32px] border border-border-dim hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                     >
                        <div className="flex justify-between items-start relative z-10 text-white">
                           <div className="flex-1 pr-12">
                              <span className="pill mb-4">
                                {p.type} • {Math.round(p.confidence * 100)}% Match
                              </span>
                              <p className="text-2xl font-serif italic text-white leading-tight">"{p.text}"</p>
                           </div>
                           <div className="w-12 h-12 rounded-2xl bg-card border border-border-dim flex items-center justify-center group-hover:bg-primary group-hover:text-secondary transition-all">
                              <ExternalLink size={20} />
                           </div>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all" />
                     </motion.div>
                   ))}
                </div>
             </div>
          </section>

          {/* Real-time Intel (Right) */}
          <section className="lg:col-span-4 bg-card border-l border-border-dim p-12 overflow-y-auto space-y-12">
             <div className="space-y-6">
                <div className="flex items-center gap-3 text-muted uppercase tracking-widest font-bold text-[10px]">
                   <Sparkles size={14} /> AI Coaching Overlay
                </div>
                <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 text-white">
                   <p className="text-sm italic leading-relaxed">"He just laughed. This is a significant moment of connection. Stay on the topic of shared travel. Avoid transition to practical matters."</p>
                </div>
                <div className="p-6 rounded-3xl bg-accent/10 border border-accent/20 text-white italic font-serif">
                   <p className="text-sm">"He seems to be searching for a word. Gently offer 'The Blue House' if he stalls."</p>
                </div>
             </div>

             <div className="space-y-6 pt-12 border-t border-border-dim text-muted">
                <h3 className="uppercase tracking-widest font-bold text-[10px]">Shared Memory Vault</h3>
                <div className="grid grid-cols-2 gap-4">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-secondary border border-border-dim relative group cursor-pointer shadow-lg hover:scale-105 transition-all">
                        <img 
                          src={`https://picsum.photos/seed/mem${i}/400/400`} 
                          alt="Memory" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 to-transparent p-4 flex items-end">
                           <span className="text-[10px] font-bold text-white uppercase tracking-widest">{i === 1 ? '1987 Chennai' : i === 2 ? 'The Wedding' : 'Origins'}</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="pt-12">
                <button className="w-full py-6 rounded-[32px] bg-red-600/20 border border-red-600/30 text-red-400 font-bold uppercase tracking-widest text-xs hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3">
                   <Heart size={16} /> Emergency Re-Anchor
                </button>
             </div>
          </section>
       </main>
    </div>
  );
}
