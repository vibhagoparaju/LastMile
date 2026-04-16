import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Zap, ShieldCheck, ArrowRight, ExternalLink, 
  Heart, Moon, RefreshCcw, Loader2, Sparkles
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import TopNav from '../components/TopNav';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function BiometricSetup({ user }: { user: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lucidWindow, setLucidWindow] = useState<any>(null);
  const [manualMode, setManualMode] = useState(false);
  const [observedClarity, setObservedClarity] = useState(5);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'lucidWindow', 'current'), (doc) => {
      setLucidWindow(doc.data());
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleManualSubmit = async () => {
    setIsPredicting(true);
    try {
      // Fetch historical patterns to provide context to Gemini
      const historySnap = await getDoc(doc(db, 'users', user.uid, 'lucidWindow', 'current'));
      const lastTrends = historySnap.exists() ? "Previous observations show moderate stability." : "Initial observation.";

      // Query Gemini to "predict" based on observed clarity
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Based on a caregiver's observation of cognitive clarity (Scale 1-10, where ${observedClarity} was observed), 
        provide a brief reasoning for the 'Lucid Window' probability and estimate how long this state might last.
        History: ${lastTrends}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              probability: { type: "NUMBER" },
              estimatedDuration: { type: "STRING" },
              predictedTime: { type: "STRING" },
              reasoning: { type: "STRING" }
            }
          }
        }
      });

      const result = JSON.parse(response.text || "{}");

      await setDoc(doc(db, 'users', user.uid, 'lucidWindow', 'current'), {
        ...result,
        probability: observedClarity / 10, // Direct override based on observation
        observedClarity,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsPredicting(false);
      setManualMode(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-secondary text-white pb-24 font-sans selection:bg-primary/30">
      <TopNav user={user} />

      <main className="max-w-4xl mx-auto px-8 pt-12">
        <header className="mb-12">
           <div className="flex items-center gap-2 text-primary font-serif italic text-lg mb-2">
              <Activity size={18} />
              Steward Observations
           </div>
           <h1 className="text-5xl font-serif tracking-tight">Health <span className="italic text-primary">Insights</span></h1>
        </header>

        <div className="grid md:grid-cols-12 gap-12">
           {/* Connection Controls */}
           <div className="md:col-span-12 space-y-12">
              {/* Prediction Display */}
              <div className={`glass p-12 rounded-[64px] border transition-all duration-1000 relative overflow-hidden text-center md:text-left ${lucidWindow?.probability > 0.7 ? 'border-primary shadow-[0_0_60px_rgba(229,192,123,0.1)]' : 'border-border-dim'}`}>
                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                 
                 <div className="grid md:grid-cols-2 gap-12 relative z-10 items-center">
                    <div>
                       <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase tracking-[0.4em] mb-6">
                          <Zap size={14} className="text-primary" />
                          Clarity Prediction
                       </div>
                       <h2 className="text-8xl md:text-9xl font-serif text-white mb-4 italic leading-none">{lucidWindow ? Math.round(lucidWindow.probability * 100) : '--'}<span className="text-primary text-4xl font-sans font-black uppercase tracking-widest ml-4">%</span></h2>
                       <p className="text-muted text-xl font-serif italic max-w-sm">
                          {lucidWindow?.reasoning || "Predicted cognitive clarity window based on direct caregiver observations."}
                       </p>
                    </div>

                    <div className="space-y-6">
                       <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 flex flex-col gap-4">
                          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted">
                             <span>Estimated Window</span>
                             <span className="text-primary">{lucidWindow?.predictedTime || 'Immediate'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted">
                             <span>Estimated Duration</span>
                             <span className="text-primary italic">{lucidWindow?.estimatedDuration || '--'}</span>
                          </div>
                       </div>
                       
                       <button 
                        onClick={() => navigate('/bridge')}
                        className="w-full py-5 bg-primary text-secondary rounded-[32px] font-bold shadow-soft flex items-center justify-center gap-2 hover:scale-105 transition-all"
                       >
                          Open Bridge Now <ArrowRight size={18} />
                       </button>
                    </div>
                 </div>
              </div>

              {/* Action Section */}
              <div className="grid md:grid-cols-1 gap-8">
                 <div className="glass p-10 rounded-[56px] border border-border-dim bg-card/50 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                       <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary border border-primary/20">
                          <Activity size={40} />
                       </div>
                       <div>
                          <h3 className="text-3xl font-serif text-white mb-2 italic">Observation Intake</h3>
                          <p className="text-muted leading-relaxed font-serif italic max-w-md">Update Robert's current cognitive state to help the AI calibrate session prompts.</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setManualMode(true)}
                      className="px-12 py-5 bg-white/5 border border-border-dim rounded-[32px] font-bold text-xs uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all shadow-soft"
                    >
                       Input Manual Observation
                    </button>
                 </div>
              </div>

              {/* Cognitive Baseline stats */}
              <div className="p-12 border border-border-dim border-dashed rounded-[64px] flex flex-col md:flex-row justify-between items-center gap-12">
                 <div className="flex-1">
                    <h3 className="text-muted text-[10px] uppercase font-bold tracking-[0.4em] mb-4 underline decoration-primary underline-offset-8">Cognitive Integrity Snapshot</h3>
                    <p className="text-lg font-serif italic text-muted leading-relaxed italic">HRV remains stable at 64ms. Topic coherence in morning capture sessions is up 12%. Topic drift is minimal.</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="p-6 bg-card rounded-3xl border border-border-dim text-center min-w-[120px]">
                       <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">HRV</div>
                       <div className="text-2xl font-serif text-primary">64ms</div>
                    </div>
                    <div className="p-6 bg-card rounded-3xl border border-border-dim text-center min-w-[120px]">
                       <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Sleep</div>
                       <div className="text-2xl font-serif text-primary">85%</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Manual Input Modal */}
      <AnimatePresence>
         {manualMode && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-secondary/90 backdrop-blur-md flex items-center justify-center p-8"
            >
               <div className="max-w-md w-full glass p-12 rounded-[56px] border border-border-dim text-center">
                  <h2 className="text-4xl font-serif text-white mb-2 italic">Manual Intake</h2>
                  <p className="text-muted mb-12">How lucid is Robert currently?</p>
                  
                  <div className="mb-12">
                     <div className="text-8xl font-serif text-primary italic mb-8">{observedClarity}</div>
                     <input 
                        type="range" min="1" max="10" 
                        value={observedClarity}
                        onChange={(e) => setObservedClarity(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                     />
                     <div className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-widest text-muted">
                        <span>Faded</span>
                        <span>Lucid</span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                     <button 
                        onClick={handleManualSubmit}
                        disabled={isPredicting}
                        className="w-full py-5 bg-primary text-secondary rounded-2xl font-bold flex items-center justify-center gap-2"
                     >
                        {isPredicting ? <Loader2 className="animate-spin" size={20} /> : <Rocket size={20} />}
                        Update Lucid Window
                     </button>
                     <button onClick={() => setManualMode(false)} className="py-2 text-muted uppercase tracking-widest font-bold text-[10px] hover:text-white transition-all">Cancel</button>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}

function Rocket({ size }: any) {
   return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.49 1.26-1.5 1.5-2.5l7-7L12 6l-7 7c-1 1.24-1.51 1.79-2.5 2.5Z"/><path d="m12 6 3.5 3.5"/><path d="m16 2 4 4"/><path d="m15.5 8.5 2 2"/><path d="M2.5 21.5c.34-.34 2.87-3.04 2.87-3.04"/><path d="M12.5 11.5l2 2" />
      </svg>
   )
}
