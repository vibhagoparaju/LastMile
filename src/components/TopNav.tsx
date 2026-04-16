import { useNavigate } from 'react-router-dom';
import { History, MessageSquare, Activity, Users, Settings, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useState } from 'react';

export default function TopNav({ user }: { user: any }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="glass sticky top-0 z-50 px-8 py-4 border-b border-border-dim bg-secondary/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-secondary group-hover:rotate-12 transition-all">
            <Sparkles size={18} />
          </div>
          <span className="font-serif text-xl font-bold text-white">LastMile <span className="text-primary italic">Memory</span></span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <NavItem label="Capture" icon={<MessageSquare size={18}/>} active={location.pathname === '/capture'} onClick={() => navigate('/capture')} />
          <NavItem label="Bridge" icon={<History size={18}/>} active={location.pathname === '/bridge'} onClick={() => navigate('/bridge')} />
          <NavItem label="Circle" icon={<Users size={18}/>} active={location.pathname === '/family'} onClick={() => navigate('/family')} />
          <NavItem label="PIM" icon={<Activity size={18}/>} active={location.pathname === '/pim'} onClick={() => navigate('/pim')} />
        </div>

        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-full border border-border-dim bg-card/50 hover:bg-card transition-all"
          >
            <span className="text-xs font-bold text-muted uppercase tracking-widest">{user?.displayName?.split(' ')[0] || 'User'}</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
               {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <Settings size={16} />}
            </div>
            <ChevronDown size={14} className={`text-muted transition-all ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border-dim rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
              <button 
                onClick={() => { navigate('/consent/manage'); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-left text-sm text-muted hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded bg-muted/10 flex items-center justify-center"><Activity size={14}/></div>
                Manage Consent
              </button>
              <button 
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 transition-all flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded bg-red-400/10 flex items-center justify-center"><LogOut size={14}/></div>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavItem({ label, icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all ${active ? 'text-primary' : 'text-muted hover:text-white'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
