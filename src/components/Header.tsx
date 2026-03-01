import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '../types';

interface HeaderProps {
  onSelectKey: () => void;
  currentView: 'leads' | 'dashboard' | 'hub' | 'outreach' | 'ai-qualification' | 'data-verification' | 'comparison' | 'super-admin' | 'profile';
  onNavigate: (view: 'leads' | 'dashboard' | 'hub' | 'outreach' | 'ai-qualification' | 'data-verification' | 'comparison' | 'super-admin' | 'profile') => void;
  onExportCSV: () => void;
  onImport: () => void;
  leads: Lead[];
  isSuperAdmin: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSelectKey, currentView, onNavigate, onExportCSV, onImport, leads, isSuperAdmin }) => {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const reminderCount = leads.filter(l => {
    if (!l.followUpDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(l.followUpDate);
    reminderDate.setHours(0, 0, 0, 0);
    return reminderDate <= today;
  }).length;

  return (
    <header className="bg-white border-b border-[#eaecf0] sticky top-0 z-50 h-16 flex items-center">
      <div className="max-w-[1600px] w-full mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => onNavigate('leads')}
          >
            <div className="w-10 h-10 bg-[#2160fd] rounded-xl flex items-center justify-center text-white shadow-sm group-hover:bg-[#1d52d9] transition-all group-hover:rotate-6">
              <i className="fas fa-rocket text-lg"></i>
            </div>
            <span className="text-xl font-black tracking-tighter text-[#101828] uppercase">
              companiesGenius Pro
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <button 
              onClick={() => onNavigate('leads')}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                currentView === 'leads' 
                ? 'bg-slate-50 text-[#2160fd]' 
                : 'text-[#475467] hover:bg-[#f9fafb]'
              }`}
            >
              Search
            </button>
            <button 
              onClick={() => onNavigate('ai-qualification')}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                currentView === 'ai-qualification' 
                ? 'bg-[#2160fd] text-white shadow-lg shadow-blue-500/20' 
                : 'text-[#475467] hover:bg-[#f9fafb]'
              }`}
            >
              <i className="fas fa-brain-circuit mr-2"></i>
              AI Qualification
            </button>
            <button 
              onClick={() => onNavigate('data-verification')}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                currentView === 'data-verification' 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'text-[#475467] hover:bg-[#f9fafb]'
              }`}
            >
              <i className="fas fa-shield-check mr-2"></i>
              Data Truth
            </button>
            <button 
              onClick={() => onNavigate('comparison')}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                currentView === 'comparison' 
                ? 'bg-amber-50 text-amber-600' 
                : 'text-[#475467] hover:bg-[#f9fafb]'
              }`}
            >
              <i className="fas fa-scale-balanced mr-2"></i>
              Compare
            </button>
            <button 
              onClick={() => onNavigate('outreach')}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${
                currentView === 'outreach' 
                ? 'bg-slate-50 text-[#2160fd]' 
                : 'text-[#475467] hover:bg-[#f9fafb]'
              }`}
            >
              Outreach
              {reminderCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce shadow-sm">
                  {reminderCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => onNavigate('dashboard')}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                currentView === 'dashboard' 
                ? 'bg-slate-50 text-[#2160fd]' 
                : 'text-[#475467] hover:bg-[#f9fafb]'
              }`}
            >
              Analytics
            </button>
            <button 
              onClick={() => onNavigate('hub')}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                currentView === 'hub' 
                ? 'bg-slate-50 text-[#2160fd]' 
                : 'text-[#475467] hover:bg-[#f9fafb]'
              }`}
            >
              Notes
            </button>
            
            {/* SUPER ADMIN TAB */}
            {isSuperAdmin && (
              <button 
                onClick={() => onNavigate('super-admin')}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  currentView === 'super-admin' 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <i className="fas fa-user-shield mr-2"></i>
                Super Admin
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
             <button 
               className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${reminderCount > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400'}`}
               title={`${reminderCount} reminders needing attention`}
               onClick={() => onNavigate('outreach')}
             >
               <i className={`fas ${reminderCount > 0 ? 'fa-bell-on animate-shake' : 'fa-bell'}`}></i>
             </button>
          </div>

          {/* API ENGINE - ONLY VISIBLE TO SUPER ADMIN */}
          {isSuperAdmin && (
            <>
              <div className="w-px h-6 bg-[#eaecf0]"></div>
              <button 
                onClick={onSelectKey}
                className="text-rose-600 hover:text-rose-800 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <i className="fas fa-key"></i>
                API Engine
              </button>
            </>
          )}
          
          <div className="w-px h-6 bg-[#eaecf0]"></div>
          
          <button 
            onClick={onImport}
            className="text-[#475467] hover:text-[#2160fd] transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <i className="fas fa-file-import"></i>
            Import
          </button>

          <button 
            onClick={onExportCSV}
            className="text-[#475467] hover:text-[#2160fd] transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <i className="fas fa-file-csv"></i>
            Export
          </button>

          <div className="w-px h-6 bg-[#eaecf0]"></div>

          <button 
            onClick={() => onNavigate('profile')}
            className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${currentView === 'profile' ? 'text-[#2160fd]' : 'text-[#475467] hover:text-[#101828]'}`}
          >
            <i className="fas fa-user-circle text-lg"></i>
            Profile
          </button>

          <div className="w-px h-6 bg-[#eaecf0]"></div>

          <button 
            onClick={handleSignOut}
            className="text-[#475467] hover:text-rose-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group"
          >
            <i className="fas fa-power-off group-hover:rotate-12 transition-transform"></i>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
