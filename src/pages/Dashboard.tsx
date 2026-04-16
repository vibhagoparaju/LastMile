import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Activity, History, Users, MessageSquare, Plus, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard({ user }: { user: any }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    const fetchProfile = async () => {
      const d = await getDoc(doc(db, 'users', user.uid));
      if (d.exists()) setProfile(d.data());
      
      const q = query(collection(db, 'users', user.uid, 'sessions'), limit(10));
      const s = await getDocs(q);
      setSessionCount(s.size);
    };
    fetchProfile();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-secondary p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8">
        
        {/* Sidebar / Profile Info */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="glass p-8 rounded-[40px] shadow-soft">
            <div className="w-20 h-20 rounded-3xl bg-primary/20 mb-6 flex items-center justify-center text-primary overflow-hidden">
               {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <Users size={32} />}
            </div>
            <h2 className="text-2xl font-serif mb-1">{user?.displayName}</h2>
            <div className="text-sm text-muted mb-6 uppercase tracking-wider font-bold">
              {profile?.stage || 'PLANNER'}
            </div>
            
            <div className="space-y-2">
              <NavItem icon={<Activity size={18}/>} label="Health Insights" active />
              <NavItem icon={<History size={18}/>} label="Legacy Feed" />
              <NavItem icon={<Users size={18}/>} label="Circle of Care" />
            </div>
          </div>

          <div className="p-8 rounded-[40px] bg-primary text-secondary shadow-soft">
             <h3 className="text-lg font-serif mb-4 italic text-secondary">Next Guided Session</h3>
             <p className="text-sm text-secondary/70 mb-6 font-medium uppercase">Heritage & Origins</p>
             <button onClick={() => navigate('/capture')} className="w-full py-3 bg-secondary text-primary rounded-xl font-bold text-sm shadow-lg">
               Start Session
             </button>
          </div>
        </aside>

        {/* Main Feed */}
        <main className="lg:col-span-6 space-y-8">
           <header className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-5xl font-serif text-primary">Welcome back, {user?.displayName?.split(' ')[0]}.</h1>
                <p className="text-muted mt-2">Your Identity Landscape is growing today.</p>
              </div>
              <div className="text-right hidden sm:block">
                 <div className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Last Capture</div>
                 <div className="font-serif italic text-lg text-primary">Today, 10:24 AM</div>
              </div>
           </header>

           {/* Richness Score Card */}
           <div className="glass p-10 rounded-[48px] shadow-soft relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                   <div>
                     <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-2">PIM Richness Score</h3>
                     <div className="text-8-xl font-serif text-primary leading-none">84.2%</div>
                   </div>
                   <div className="px-4 py-2 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                     +12% This Week
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <StatItem label="Captured Memories" value={sessionCount * 12 + 45} />
                   <StatItem label="Identity Tags" value="1,204" />
                   <StatItem label="Family Contributions" value="28" />
                   <StatItem label="Voice Accuracy" value="98.2%" />
                </div>
              </div>
              
              {/* Abstract Viz Background */}
              <div className="absolute top-0 right-0 w-2/3 h-full -z-0 opacity-20 pointer-events-none">
                 <svg viewBox="0 0 200 200" className="w-full h-full text-primary">
                    <motion.path 
                      d="M40,80 Q100,20 160,80 T280,80" 
                      fill="none" stroke="currentColor" strokeWidth="2"
                      animate={{ d: ["M40,80 Q100,20 160,80 T280,80", "M40,90 Q100,10 160,90 T280,90", "M40,80 Q100,20 160,80 T280,80"] }}
                      transition={{ repeat: Infinity, duration: 8 }}
                    />
                 </svg>
              </div>
           </div>

           <div className="flex gap-4">
              <div className="flex-1 glass p-8 rounded-[32px] shadow-soft hover:bg-card/50 transition-all cursor-pointer group">
                 <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl text-primary">Legacy Archive</h3>
                    <ArrowUpRight className="text-muted group-hover:text-primary transition-all" />
                 </div>
                 <div className="flex gap-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-12 h-12 rounded-lg bg-card border border-border-dim animate-pulse" />
                    ))}
                 </div>
              </div>
              <div className="flex-1 glass p-8 rounded-[32px] shadow-soft hover:bg-card/50 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl text-primary">Bridge Portal</h3>
                    <ArrowUpRight className="text-muted group-hover:text-primary transition-all" />
                 </div>
                 <button onClick={() => navigate('/bridge')} className="text-sm font-bold text-accent">Launch Bridge Session</button>
              </div>
           </div>
        </main>

        {/* Feed / Right Side */}
        <aside className="lg:col-span-3 space-y-8">
           <div className="glass p-8 rounded-[40px] shadow-soft">
              <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-6 border-b border-border-dim pb-4 flex justify-between">
                <span>Memory Stream</span>
                <Plus size={14} className="cursor-pointer" />
              </h3>
              <div className="space-y-6">
                 <FeedItem title="The 1987 Roadtrip" date="2 days ago" type="STORY" />
                 <FeedItem title="Morning Humor Check-in" date="Yesterday" type="VOICE" />
                 <FeedItem title="Principles of Work" date="4 days ago" type="VALUES" />
              </div>
           </div>

           <div className="glass p-8 rounded-[40px] shadow-soft bg-accent/5 border-accent/10">
              <h3 className="text-accent font-serif text-lg mb-2 italic">Lucid Window Predicted</h3>
              <p className="text-sm text-muted mb-4">A high-clarity event is predicted tomorrow around 10:00 AM.</p>
              <div className="w-full bg-accent/20 h-1 rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-accent" 
                   initial={{ width: 0 }}
                   animate={{ width: '82%' }}
                   transition={{ duration: 1 }}
                 />
              </div>
              <div className="text-[10px] text-accent font-bold mt-2 uppercase tracking-wide text-right">82% Probability</div>
           </div>
        </aside>

      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: any) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function StatItem({ label, value }: any) {
  return (
    <div>
      <div className="text-2xl font-serif text-primary">{value}</div>
      <div className="text-[10px] uppercase font-bold text-muted tracking-wider">{label}</div>
    </div>
  );
}

function FeedItem({ title, date, type }: any) {
  return (
    <div className="flex gap-4 group cursor-pointer">
       <div className="w-10 h-10 rounded-xl bg-card border border-border-dim flex items-center justify-center shadow-sm text-muted group-hover:text-primary transition-all">
          <MessageSquare size={16} />
       </div>
       <div>
         <div className="text-sm font-bold text-white">{title}</div>
         <div className="text-[10px] text-muted flex gap-2">
            <span>{date}</span>
            <span>•</span>
            <span className="text-primary/70">{type}</span>
         </div>
       </div>
    </div>
  );
}
