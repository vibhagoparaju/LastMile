import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, MessageSquare, History, Users, Activity, 
  ChevronRight, Calendar, Brain, Clock, Zap, ExternalLink 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, orderBy, limit, onSnapshot, getDocs, getDoc, doc 
} from 'firebase/firestore';
import { computeRichnessScore, getRichnessLabel } from '../lib/pim';
import TopNav from '../components/TopNav';

export default function Dashboard({ user }: { user: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [stats, setStats] = useState({
    memories: 0,
    tags: 0,
    family: 0,
    voice: "Checking..."
  });
  const [richness, setRichness] = useState(0);
  const [lucidWindow, setLucidWindow] = useState<any>(null);
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // 1. Fetch real Profile data
    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // 2. Fetch real Memories Feed (Top 5)
    const qMemoriesPath = `users/${user.uid}/memories`;
    const qMemories = query(
      collection(db, qMemoriesPath),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribeMemories = onSnapshot(qMemories, (snapshot) => {
      const mems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemories(mems);
      
      // Calculate Stats: Captured Memories
      setStats(prev => ({ ...prev, memories: snapshot.size }));
      
      // Calculate Identity Tags
      let tagCount = 0;
      mems.forEach((m: any) => { tagCount += m.tags?.length || 0 });
      setStats(prev => ({ ...prev, tags: tagCount }));

      // Voice Accuracy Check
      const hasVoice = mems.some((m: any) => m.audioUrl);
      setStats(prev => ({ ...prev, voice: hasVoice ? "Voice Active" : "Text Only" }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, qMemoriesPath);
    });

    // 3. Fetch Family Count
    const familyMembersPath = `users/${user.uid}/familyMembers`;
    getDocs(collection(db, familyMembersPath)).then(snap => {
      setStats(prev => ({ ...prev, family: snap.size }));
    }).catch(error => {
      handleFirestoreError(error, OperationType.LIST, familyMembersPath);
    });

    // 4. Compute PIM Richness
    const fetchPIM = async () => {
      const pimPath = `users/${user.uid}/pimLayers/active`;
      const pimRef = doc(db, pimPath);
      const sessionsPath = `users/${user.uid}/sessions`;
      try {
        const pimSnap = await getDoc(pimRef);
        const sessionSnap = await getDocs(collection(db, sessionsPath));
        
        const score = computeRichnessScore(pimSnap.data(), stats.memories, sessionSnap.size);
        
        // Animate scoreup
        let current = 0;
        const interval = setInterval(() => {
          if (current >= score) {
            clearInterval(interval);
          } else {
            current += 1;
            setRichness(current);
          }
        }, 20);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, pimPath);
      }
    };
    fetchPIM();

    // 5. Real Lucid Window (Live)
    const lucidWindowPath = `users/${user.uid}/lucidWindow/current`;
    const unsubscribeLucid = onSnapshot(doc(db, lucidWindowPath), (doc) => {
       if (doc.exists()) setLucidWindow(doc.data());
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, lucidWindowPath);
    });

    // 6. Last Capture Session
    const sessionsPath = `users/${user.uid}/sessions`;
    const qSessions = query(
      collection(db, sessionsPath),
      orderBy('startedAt', 'desc'),
      limit(1)
    );
    getDocs(qSessions).then(snap => {
      if (!snap.empty) {
        const last = snap.docs[0].data();
        if (last.startedAt) {
          setLastCapture(formatDistanceToNow(last.startedAt.toDate(), { addSuffix: true }));
        }
      }
    }).catch(error => {
      handleFirestoreError(error, OperationType.LIST, sessionsPath);
    });

    setLoading(false);
    return () => {
      unsubscribeProfile();
      unsubscribeMemories();
      unsubscribeLucid();
    };
  }, [user]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-secondary text-white pb-12 font-sans">
      <TopNav user={user} />

      <main className="max-w-7xl mx-auto px-8 pt-12">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="text-primary font-serif italic text-lg mb-2">Preservation Stage: {profile?.stage || 'PLANNER'}</div>
            <h1 className="text-5xl font-serif tracking-tight text-white mb-2">Welcome back, <span className="italic text-primary">{user?.displayName?.split(' ')[0] || 'Member'}</span></h1>
            <div className="flex items-center gap-4 text-muted text-sm uppercase tracking-widest font-bold">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Voice Archive Active
               </div>
               <span>•</span>
               <div>Last Capture: {lastCapture || 'Never'}</div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/capture')}
            className="px-8 py-4 bg-primary text-secondary rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-soft"
          >
             <MessageSquare size={20} />
             Start Guided Session
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatItem label="Captured Memories" value={stats.memories} />
          <StatItem label="Identity Tags" value={stats.tags} />
          <StatItem label="Family Contributions" value={stats.family} />
          <StatItem label="Voice Status" value={stats.voice} highlight />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
           {/* Left Column: Core AI Monitoring */}
           <div className="lg:col-span-8 space-y-8">
              {/* Richness Score Card */}
              <div className="glass p-12 rounded-[48px] border border-border-dim bg-card/50 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all duration-1000" />
                 
                 <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                    <div className="text-center md:text-left">
                       <h3 className="text-muted text-xs uppercase tracking-[0.2em] font-bold mb-4">PIM Richness Score</h3>
                       <div className="text-8xl md:text-9xl font-serif text-white leading-none mb-4 tracking-tighter">
                          {richness}<span className="text-primary italic text-6xl">%</span>
                       </div>
                       <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
                          <Brain size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">{getRichnessLabel(richness)}</span>
                       </div>
                    </div>

                    <div className="flex-1 max-w-sm w-full space-y-4">
                       <ProgressLine label="Identity Layer" value={78} />
                       <ProgressLine label="Narrative Layer" value={64} />
                       <ProgressLine label="Relational Layer" value={Math.min(richness + 10, 100)} />
                       <ProgressLine label="Values Layer" value={92} />
                    </div>
                 </div>
              </div>

              {/* Cognitive Insights / Drift Tracker */}
              <div className="glass p-10 rounded-[48px] border border-border-dim bg-white/5 space-y-8">
                 <div className="flex justify-between items-center">
                    <h3 className="text-muted text-[10px] uppercase tracking-[0.4em] font-bold">Cognitive Drift Insights</h3>
                    <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest border border-green-400/30 px-2 py-1 rounded">Stable Mode</div>
                 </div>
                 
                 <div className="grid md:grid-cols-4 gap-6">
                    <MetricMini label="Vocab Rich" value="High" />
                    <MetricMini label="Complexity" value="92%" />
                    <MetricMini label="Coherence" value="Stable" />
                    <MetricMini label="Emotional" value="Warm" />
                 </div>

                 <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 text-primary italic text-sm font-serif">
                   "Robert's communication patterns remain 94% consistent with his 30-day baseline. Vocabulary richness has slightly peaked this week during childhood memories."
                 </div>
              </div>

              {/* Memory Stream */}
              <div className="border border-border-dim rounded-[48px] overflow-hidden bg-white/5">
                 <div className="p-8 border-b border-border-dim flex justify-between items-center bg-card/30">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-muted">Memory Stream</h3>
                    <button onClick={() => navigate('/history')} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">Full Archive <ExternalLink size={12}/></button>
                 </div>
                 <div className="divide-y divide-border-dim">
                    {memories.length === 0 ? (
                      <div className="p-20 text-center">
                        <p className="text-muted italic mb-4">No memories captured yet.</p>
                        <button onClick={() => navigate('/capture')} className="text-primary font-bold hover:underline">Start your first session →</button>
                      </div>
                    ) : memories.map((mem, i) => (
                      <FeedItem 
                        key={mem.id}
                        title={mem.title || "Untitled Memory"}
                        time={mem.createdAt ? formatDistanceToNow(mem.createdAt.toDate(), { addSuffix: true }) : 'Recent'}
                        type={mem.audioUrl ? "VOICE" : "TEXT"}
                        onOpen={() => navigate(`/history?id=${mem.id}`)}
                      />
                    ))}
                 </div>
              </div>
           </div>

           {/* Right Column: Support & Bridge */}
           <div className="lg:col-span-4 space-y-8">
              {/* Lucid Window Predictor */}
              <div className={`glass p-8 rounded-[48px] border transition-all duration-1000 relative overflow-hidden ${lucidWindow?.probability > 0.72 ? 'border-primary shadow-[0_0_40px_rgba(229,192,123,0.1)]' : 'border-border-dim'}`}>
                 {lucidWindow?.probability > 0.72 && (
                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                 )}
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                       <Zap size={18} className="text-primary" />
                       <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Lucid Window</h3>
                    </div>
                    
                    {lucidWindow ? (
                       <div className="mb-8">
                          <div className="text-5xl font-serif text-white mb-2">{Math.round(lucidWindow.probability * 100)}% <span className="text-sm text-muted font-sans font-bold uppercase tracking-widest italic ml-auto block">Active Reliability</span></div>
                          <div className="text-muted text-sm leading-relaxed mb-6 font-serif italic">
                             Predicted High Clarity: <span className="text-primary">{lucidWindow.predictedTime || 'Calculated Soon'}</span>
                          </div>
                          
                          <button 
                            onClick={() => navigate('/bridge')}
                            className="w-full py-4 bg-primary text-secondary rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-102 transition-all"
                          >
                             Launch Bridge Now
                          </button>
                       </div>
                    ) : (
                       <div className="mb-8 opacity-60">
                          <p className="text-muted text-sm mb-6 font-serif italic italic text-center">Update Robert's cognitive state via manual steward observations to enable high-clarity window predictions.</p>
                          <button 
                             onClick={() => navigate('/biometrics')}
                             className="w-full py-4 border border-border-dim rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-muted"
                          >
                             Open Steward Portal
                          </button>
                       </div>
                    )}
                 </div>
              </div>

              {/* Quick Links Cards */}
              <div className="grid grid-cols-1 gap-4">
                 <QuickCard 
                    title="Legacy Archive" 
                    icon={<History />} 
                    desc="Explore all captured stories"
                    onClick={() => navigate('/history')}
                 />
                 <QuickCard 
                    title="Bridge Portal" 
                    icon={<Activity />} 
                    desc="Assist family connections"
                    onClick={() => navigate('/bridge')}
                 />
                  <QuickCard 
                    title="PIM Explorer" 
                    icon={<Zap className="text-primary"/>} 
                    desc="Audit your identity model"
                    onClick={() => navigate('/pim')}
                 />
              </div>

              {/* Biography Action */}
              <button 
                onClick={() => navigate('/pim?action=bio')}
                className="w-full h-32 glass rounded-[32px] border border-border-dim p-8 flex items-center gap-6 group hover:border-primary/40 transition-all text-left"
              >
                 <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-secondary transition-all">
                    <Sparkles size={24} />
                 </div>
                 <div>
                    <div className="text-white font-serif text-lg leading-tight uppercase tracking-tighter">Generate Living <span className="italic block mt-1 text-primary">Biography</span></div>
                    <div className="text-muted text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-1 group-hover:text-primary transition-all">Start Engine <ChevronRight size={10} /></div>
                 </div>
              </button>
           </div>
        </div>
      </main>
    </div>
  );
}

function StatItem({ label, value, highlight }: any) {
  return (
    <div className="glass p-6 rounded-3xl border border-border-dim hover:bg-card/50 transition-all">
      <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-muted mb-3">{label}</div>
      <div className={`text-3xl font-serif ${highlight ? 'text-primary italic' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function ProgressLine({ label, value }: any) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-widest">
         <span className="text-muted">{label}</span>
         <span className="text-primary italic">{value}%</span>
      </div>
      <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${value}%` }}
           transition={{ duration: 1.5, delay: 0.5 }}
           className="h-full bg-primary" 
         />
      </div>
    </div>
  );
}

function FeedItem({ title, time, type, onOpen }: any) {
  return (
    <div 
      onClick={onOpen}
      className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group cursor-pointer"
    >
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-card border border-border-dim flex items-center justify-center text-primary group-hover:scale-110 transition-all">
             {type === 'VOICE' ? <MessageSquare size={16} /> : <History size={16} />}
          </div>
          <div>
             <div className="text-md font-serif text-white mb-1 group-hover:text-primary transition-all">{title}</div>
             <div className="text-xs text-muted flex items-center gap-2">
                <Clock size={10} />
                {time}
             </div>
          </div>
       </div>
       <ChevronRight size={18} className="text-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
    </div>
  );
}

function QuickCard({ title, icon, desc, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="p-6 glass rounded-4xl border border-border-dim hover:border-primary/30 transition-all flex items-center gap-5 cursor-pointer group"
    >
       <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center text-muted group-hover:bg-primary/20 group-hover:text-primary transition-all">
          {icon}
       </div>
       <div className="flex-1">
          <div className="text-sm font-bold text-white uppercase tracking-widest">{title}</div>
          <div className="text-xs text-muted font-serif italic">{desc}</div>
       </div>
       <ChevronRight size={16} className="text-muted group-hover:text-primary" />
    </div>
  );
}

function MetricMini({ label, value }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
       <div className="text-[9px] uppercase tracking-widest text-muted mb-1">{label}</div>
       <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}
