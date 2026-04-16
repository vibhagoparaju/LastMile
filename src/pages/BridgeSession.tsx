import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  History, MessageSquare, Zap, Activity, Info, 
  ChevronRight, RefreshCcw, Heart, Brain, Clock, ShieldAlert, Sparkles, X, Loader2
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, orderBy, limit, onSnapshot, getDocs, getDoc, doc 
} from 'firebase/firestore';
import { generateBridgePrompts, analyzeEmotionalState, generateGroundingPhrases } from '../lib/gemini';
import { cosineSimilarity } from '../lib/pim';
import TopNav from '../components/TopNav';

export default function BridgeSession({ user }: { user: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [emotionalState, setEmotionalState] = useState<any>({ state: 'Neutral', valence: 0.5, recommendation: 'Begin with a calm, familiar memory.' });
  const [sessions, setSessions] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [transcript, setTranscript] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [groundingPhrases, setGroundingPhrases] = useState<string[]>([]);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);

  const messageCount = useRef(0);

  useEffect(() => {
    if (!user) return;

    // Load PIM and Memories for Prompt Generation
    const loadPrompts = async () => {
      setIsRefreshing(true);
      try {
        const pimSnap = await getDoc(doc(db, 'users', user.uid, 'pimLayers', 'active'));
        const memoriesSnap = await getDocs(collection(db, 'users', user.uid, 'memories'));
        const allMems = memoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMemories(allMems.filter((m: any) => m.photoUrl));

        // Simple Cosine Similarity (Simulation - getting top 10 for AI context)
        const top10 = allMems.slice(0, 10);
        
        const aiPrompts = await generateBridgePrompts(pimSnap.data(), top10);
        setPrompts(aiPrompts);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/bridge-prompts`);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Load Last 7 Sessions for Chart
    const sessionsPath = `users/${user.uid}/sessions`;
    const qSessions = query(
      collection(db, sessionsPath),
      orderBy('startedAt', 'desc'),
      limit(7)
    );
    const unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
      let sess = snapshot.docs.map(doc => doc.data());
      // Pad with placeholders if needed
      while (sess.length < 7) sess.push({ qualityScore: 0.3, startedAt: null });
      setSessions(sess.reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, sessionsPath);
    });

    loadPrompts();
    setLoading(false);

    return () => unsubscribeSessions();
  }, [user]);

  const handleTranscriptChange = async (e: any) => {
    const text = e.target.value;
    setTranscript(text);
    
    // Check emotional state every few messages
    const sentences = text.split(/[.!?]/);
    if (sentences.length >= messageCount.current + 3) {
      messageCount.current = sentences.length;
      const snippet = sentences.slice(-3).join('.');
      const analysis = await analyzeEmotionalState(snippet);
      if (analysis) setEmotionalState(analysis);
    }
  };

  const handleEmergency = async () => {
    setIsEmergencyLoading(true);
    setShowEmergency(true);
    
    // Fetch top memories
    try {
      const memoriesSnap = await getDocs(query(collection(db, 'users', user.uid, 'memories'), limit(3)));
      const top = memoriesSnap.docs.map(d => d.data().title);
      
      const phrases = await generateGroundingPhrases(top);
      setGroundingPhrases(phrases);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/emergency-memories`);
    } finally {
      setIsEmergencyLoading(false);
    }

    // Auto dismiss
    setTimeout(() => {
       setShowEmergency(false);
    }, 60000);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-secondary text-white pb-12 font-sans selection:bg-primary/30">
      <TopNav user={user} />

      <main className="max-w-7xl mx-auto px-8 pt-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
           <div>
              <div className="flex items-center gap-2 text-primary font-serif italic text-lg mb-2">
                 <Sparkles size={18} />
                 Resonance Engine Active
              </div>
              <h1 className="text-4xl font-serif tracking-tight">Robert's <span className="italic text-primary">Bridge Session</span></h1>
           </div>
           <div className="flex gap-4">
              <div className="px-6 py-3 bg-card border border-border-dim rounded-2xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-xs font-bold uppercase tracking-widest text-muted">Bridge Connected</span>
              </div>
           </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
           {/* Left: Prompts & Controls */}
           <div className="lg:col-span-8 space-y-8">
              <div className="glass p-10 rounded-[48px] border border-border-dim bg-card/50 shadow-2xl relative overflow-hidden">
                 <div className="flex justify-between items-center mb-10">
                    <h3 className="text-muted text-xs uppercase tracking-[0.4em] font-bold">Resonance Prompts</h3>
                    <button 
                      onClick={() => window.location.reload()}
                      className="text-primary flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:underline"
                    >
                       <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                       Refresh Engine
                    </button>
                 </div>

                 <div className="space-y-4 mb-10">
                    {isRefreshing ? (
                      [1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />)
                    ) : prompts.map((p, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="glass group p-8 rounded-[32px] border border-border-dim hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                      >
                         <div className="flex justify-between items-start relative z-10 text-white">
                            <div className="flex-1 pr-12">
                               <p className="text-xl font-serif italic mb-3">"{p.text}"</p>
                               <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">#{p.type}</span>
                                  <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Source: {p.sourceMemoryTitle}</span>
                               </div>
                            </div>
                            <ChevronRight size={20} className="text-muted group-hover:text-primary transition-all" />
                         </div>
                      </motion.div>
                    ))}
                 </div>

                 <div className="border-t border-border-dim pt-10">
                    <h3 className="text-muted text-xs uppercase tracking-[0.4em] font-bold mb-6">Observer Transcription</h3>
                    <textarea 
                      value={transcript}
                      onChange={handleTranscriptChange}
                      placeholder="Type what Robert is saying to refine AI insights..."
                      className="w-full bg-secondary/50 border border-border-dim rounded-[32px] p-6 min-h-[140px] font-serif italic text-lg focus:outline-none focus:border-primary/50 transition-all resize-none"
                    />
                 </div>
              </div>

              {/* Shared Vault */}
              <div className="glass p-10 rounded-[48px] border border-border-dim flex flex-col gap-8">
                 <div className="flex justify-between items-center">
                    <h3 className="text-muted text-xs uppercase tracking-[0.4em] font-bold">Shared Memory Vault</h3>
                    <button className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">Upload Presence</button>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {memories.length === 0 ? (
                       [1,2,3,4].map(i => (
                         <div key={i} className="aspect-square rounded-3xl bg-white/5 border border-border-dim flex flex-col items-center justify-center text-muted p-4 text-center group cursor-pointer hover:bg-white/10 transition-all">
                            <Clock size={24} className="mb-2 opacity-50" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Empty Slot</span>
                         </div>
                       ))
                    ) : memories.map((m: any, i) => (
                       <div key={i} className="aspect-square rounded-3xl bg-card border border-border-dim overflow-hidden group cursor-pointer relative">
                          <img src={m.photoUrl} alt="Memory" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-end">
                             <span className="text-xs font-serif italic text-white line-clamp-1">{m.title}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Right: Insights */}
           <div className="lg:col-span-4 space-y-8">
              {/* Emotional Resonance */}
              <div className="glass p-8 rounded-[48px] border border-border-dim">
                 <div className="flex items-center gap-2 mb-8">
                    <Heart size={18} className="text-red-400" />
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Emotional Resonance</h3>
                 </div>
                 
                 <div className="mb-8 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                    <div className="text-3xl font-serif text-white mb-2">{emotionalState.state}</div>
                    <div className="w-full h-1 bg-white/10 rounded-full mb-4">
                       <div 
                         className="h-full bg-primary transition-all duration-1000" 
                         style={{ width: `${emotionalState.valence * 100}%` }} 
                       />
                    </div>
                    <p className="text-muted text-sm italic font-serif leading-relaxed">
                       "{emotionalState.recommendation}"
                    </p>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                       <span className="text-muted">Stability Index</span>
                       <span className="text-white">High</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                       <span className="text-muted">Lucid Window</span>
                       <span className="text-primary italic">Closing 18m</span>
                    </div>
                 </div>
              </div>

              {/* Coaching Overlay */}
              <div className="p-8 rounded-[48px] bg-primary text-secondary">
                 <div className="flex items-center gap-3 mb-6">
                    <Brain size={24} />
                    <h3 className="text-xs uppercase tracking-[0.2em] font-black">AI Coaching Overlay</h3>
                 </div>
                 <p className="text-xl font-serif italic leading-snug mb-8">
                    "Robert seems slightly restless. Try matching his body language and lower your voice. Reference a peaceful sensory memory from his boyhood."
                 </p>
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em]">
                    <span>Real-time adaptive</span>
                    <Clock size={12} />
                 </div>
              </div>

              {/* Cognitive Baseline Chart */}
              <div className="glass p-8 rounded-[48px] border border-border-dim">
                 <h3 className="text-muted text-[10px] uppercase tracking-[0.4em] font-bold mb-8">Cognitive Baseline (7 Days)</h3>
                 <div className="h-40 flex items-end justify-between gap-1">
                    {sessions.map((s, i) => (
                      <div key={i} className="flex-1 group relative">
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-card border border-border-dim rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-20">
                            {s.startedAt ? s.startedAt.toDate().toLocaleDateString() : 'Placeholder'}
                         </div>
                         <motion.div 
                           initial={{ height: 0 }}
                           animate={{ height: `${s.qualityScore * 100 || 30}%` }}
                           className={`w-full rounded-t-lg transition-all ${s.qualityScore > 0.7 ? 'bg-primary' : 'bg-white/10'}`} 
                         />
                      </div>
                    ))}
                 </div>
              </div>

              {/* Emergency Re-anchor */}
              <button 
                onClick={handleEmergency}
                className="w-full py-6 bg-red-400/10 border border-red-400/30 text-red-100 rounded-[32px] font-bold uppercase tracking-widest text-sm hover:bg-red-400/20 transition-all flex items-center justify-center gap-3 group"
              >
                 <ShieldAlert size={20} className="group-hover:rotate-12 transition-all" />
                 Emergency Re-anchor
              </button>
           </div>
        </div>
      </main>

      {/* Emergency Overlay */}
      <AnimatePresence>
         {showEmergency && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-secondary/95 backdrop-blur-xl flex items-center justify-center p-8"
            >
               <div className="max-w-3xl w-full text-center">
                  <button onClick={() => setShowEmergency(false)} className="absolute top-12 right-12 text-muted hover:text-white"><X size={32}/></button>
                  <div className="w-24 h-24 bg-red-400/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-12 animate-pulse">
                     <ShieldAlert size={48} />
                  </div>
                  <h2 className="text-5xl font-serif text-white mb-6 italic underline decoration-red-400 underline-offset-8">Gently Re-anchor.</h2>
                  <p className="text-muted text-xl mb-16 font-serif italic">Use these real phrases to bring him back to safety.</p>
                  
                  {isEmergencyLoading ? (
                    <Loader2 size={48} className="text-primary animate-spin mx-auto" />
                  ) : (
                    <div className="space-y-6">
                       {groundingPhrases.map((phrase, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="glass p-8 rounded-[40px] border border-white/10 text-3xl font-serif text-primary italic"
                          >
                             "{phrase}"
                          </motion.div>
                       ))}
                    </div>
                  )}
                  
                  <div className="mt-16 text-[10px] text-muted uppercase tracking-[0.4em]">Auto-dismissing in 60 seconds</div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
