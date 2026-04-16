import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Heart, ShieldCheck, History, Users } from 'lucide-react';

export default function LandingPage({ user }: { user: any }) {
  const navigate = useNavigate();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/consent');
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background soft gradients */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-secondary">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-3xl opacity-50" />
      </div>

      <nav className="p-8 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <History className="text-primary w-8 h-8" />
          <span className="font-serif text-2xl font-bold tracking-tight text-primary">LastMile Memory</span>
        </div>
        {user ? (
          <button onClick={() => navigate('/dashboard')} className="text-primary font-medium hover:underline">
            Go to App
          </button>
        ) : (
          <button onClick={handleLogin} className="px-6 py-2 rounded-full border border-primary/20 text-primary font-medium hover:bg-white/50 transition-all">
            Sign In
          </button>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-8 pt-12 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase mb-6">
            The Identity Preservation System
          </div>
          <h1 className="text-6xl lg:text-8xl font-serif text-primary leading-[0.9] mb-8">
            Refuse to let them <span className="italic">fade away.</span>
          </h1>
          <p className="text-xl text-muted mb-10 leading-relaxed max-w-lg">
            LastMile Memory doesn't treat dementia — it refuses to let it erase a person. Capture the essence of identity now, to build a bridge forever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={user ? () => navigate('/dashboard') : handleLogin}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              Start Preserving My Memory
            </button>
            <button className="px-8 py-4 bg-card text-primary border border-border-dim rounded-2xl font-medium hover:bg-border-dim transition-all">
              Family Enrollment
            </button>
          </div>
          
          <div className="mt-12 flex items-center gap-6 opacity-60">
            <div className="flex items-center gap-2 text-sm"><ShieldCheck size={18} /> Privacy First</div>
            <div className="flex items-center gap-2 text-sm"><Heart size={18} /> Emotionally Aware</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative aspect-square lg:aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl"
        >
          <img 
            src="https://picsum.photos/seed/legacy/1200/1500" 
            alt="Family Memory" 
            className="w-full h-full object-cover grayscale-[0.3] brightness-90"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-8 bottom-8 p-8 glass rounded-[32px] shadow-soft">
            <p className="font-serif italic text-2xl text-primary mb-2">"It felt like I was talking to the dad I remember, not the disease."</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-border-dim" />
              <div>
                <div className="text-sm font-bold text-white">Dr. Sarah Miller</div>
                <div className="text-xs text-muted">Neurologist & Caregiver</div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <section className="bg-secondary p-8 border-t border-border-dim">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<History className="text-primary" />}
            title="Active Capture"
            description="AI-guided sessions that feel like conversation, not data entry. We capture voice, humor, and values."
          />
          <FeatureCard 
            icon={<Users className="text-primary" />}
            title="The Memory Bridge"
            description="Real-time session guidance for families, using the person's own preserved identity as a prompt engine."
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-primary" />}
            title="Legacy Vault"
            description="A cryptographically secure archive that grows into a living biography for future generations."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="p-8 rounded-[32px] bg-card border border-border-dim shadow-soft hover:translate-y-[-4px] transition-all">
      <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-6 shadow-sm border border-border-dim">
        {icon}
      </div>
      <h3 className="text-2xl mb-3 text-primary">{title}</h3>
      <p className="text-muted leading-relaxed">{description}</p>
    </div>
  );
}
