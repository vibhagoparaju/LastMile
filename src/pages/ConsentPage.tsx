import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ShieldCheck, ChevronRight, Check } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export default function ConsentPage() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState({
    voice: false,
    passive: false,
    family: false,
    research: false
  });

  const handleConsent = async () => {
    if (!auth.currentUser) return;
    
    const consentDoc = {
      userId: auth.currentUser.uid,
      status: 'ACTIVE',
      signedHash: '0x' + Math.random().toString(16).slice(2),
      permissions: agreed,
      createdAt: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'consent', 'current'), consentDoc);
      // Also update user profile stage if it's first time
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
         stage: 'PLANNER',
         displayName: auth.currentUser.displayName,
         email: auth.currentUser.email,
         createdAt: new Date().toISOString()
      }, { merge: true });
      
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full glass p-10 rounded-[40px] shadow-soft"
      >
        <div className="flex items-center gap-3 mb-8 text-primary">
          <ShieldCheck size={32} />
          <h1 className="text-3xl font-serif">Privacy & Consent</h1>
        </div>

        <p className="text-muted mb-8 leading-relaxed">
          LastMile Memory is a sacred bridge between who you are today and who you will always be. We prioritize your agency and data sovereignty.
        </p>

        <div className="space-y-4 mb-10">
          <ConsentToggle 
            label="Voice & Cadence Capture" 
            desc="Enable AI to learn your rhythm, humor, and unique speech patterns."
            active={agreed.voice}
            onClick={() => setAgreed(s => ({ ...s, voice: !s.voice }))}
          />
          <ConsentToggle 
            label="Family Access Level" 
            desc="Allow designated family members to contribute and use Bridge sessions."
            active={agreed.family}
            onClick={() => setAgreed(s => ({ ...s, family: !s.family }))}
          />
          <ConsentToggle 
            label="Anonymized Research" 
            desc="Contribute your cognitive data to help geriatric neurologists fight dementia."
            active={agreed.research}
            onClick={() => setAgreed(s => ({ ...s, research: !s.research }))}
          />
        </div>

        <button 
          onClick={handleConsent}
          className="w-full py-4 bg-primary text-secondary rounded-2xl font-bold flex items-center justify-center gap-2 group shadow-lg"
        >
          Sign & Enter Dashboard <ChevronRight size={18} className="group-hover:translate-x-1 transition-all" />
        </button>
      </motion.div>
    </div>
  );
}

function ConsentToggle({ label, desc, active, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-[24px] border border-border-dim cursor-pointer transition-all ${active ? 'bg-primary/5 border-primary/30' : 'bg-card hover:border-muted/30'}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold text-white mb-1">{label}</div>
          <p className="text-xs text-muted leading-relaxed">{desc}</p>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${active ? 'bg-primary border-primary text-secondary' : 'border-border-dim'}`}>
          {active && <Check size={14} />}
        </div>
      </div>
    </div>
  );
}
