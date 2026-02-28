
import React, { useState } from 'react';
import { Lead } from '../types';
import { gemini } from '../services/geminiService';
import { Eye, Edit3, User, Calendar, Mail } from 'lucide-react';

interface Props {
  leads: Lead[];
  onLeadsUpdate: (leads: Lead[]) => void;
  onNavigateToOutreach: () => void;
  onExport: () => void;
}

const AIQualificationView: React.FC<Props> = ({ leads, onLeadsUpdate, onNavigateToOutreach, onExport }) => {
  const [criteria, setCriteria] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  const [isQualifying, setIsQualifying] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isResearchingId, setIsResearchingId] = useState<string | null>(null);

  // Email System State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [targetLead, setTargetLead] = useState<Lead | null>(null);
  const [emailDraft, setEmailDraft] = useState({ subject: '', body: '' });
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isApproved, setIsApproved] = useState(false); // Gate for "Ready to Send"
  const [emailMode, setEmailMode] = useState<'edit' | 'preview'>('edit');

  const handleAddRule = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newRule.trim() && !criteria.includes(newRule.trim())) {
      setCriteria([...criteria, newRule.trim()]);
      setNewRule('');
    }
  };

  const handleSuggestCriteria = async () => {
    setIsSuggesting(true);
    try {
      const context = leads.length > 0 ? `Leads in ${leads[0].industry} industry` : "Generic B2B lead generation";
      const result = await gemini.suggestQualificationCriteria(context);
      setCriteria(result.rules);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleBatchQualify = async () => {
    if (leads.length === 0 || criteria.length === 0) return;
    setIsQualifying(true);
    try {
      const results = await gemini.batchQualifyLeads(leads, criteria);
      const updatedLeads = leads.map(l => {
        const qual = results.find(r => r.id === l.id);
        return qual ? { ...l, ...qual, qualifiedAt: new Date().toISOString() } : l;
      });
      onLeadsUpdate(updatedLeads);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQualifying(false);
    }
  };

  const handleResearchStakeholder = async (lead: Lead) => {
    setIsResearchingId(lead.id);
    try {
      const result = await gemini.enrichLead(lead);
      if (result.enrichedData) {
        const updatedLeads = leads.map(l => l.id === lead.id ? { ...l, ...result.enrichedData, status: 'analyzed' as const } : l);
        onLeadsUpdate(updatedLeads);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResearchingId(null);
    }
  };

  const openEmailSystem = async (lead: Lead) => {
    setTargetLead(lead);
    setIsEmailModalOpen(true);
    setIsGeneratingDraft(true);
    setIsApproved(false); 
    setEmailMode('edit');
    setEmailDraft({ subject: '', body: '' }); 
    try {
      const draft = await gemini.generateOutreachEmail(lead);
      setEmailDraft(draft);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSendEmail = () => {
    if (!targetLead || !emailDraft.body || !isApproved) return;
    
    // 1. Trigger mailto client
    const mailto = `mailto:${targetLead.email}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`;
    window.location.href = mailto;
    
    // 2. Update status and record last action
    const updatedLeads = leads.map(l => l.id === targetLead.id ? { 
      ...l, 
      status: 'contacted' as const,
      lastAction: {
        type: 'email' as const,
        date: new Date().toISOString(),
        note: `Dispatched AI-generated strategic email to ${l.email}`
      }
    } : l);
    onLeadsUpdate(updatedLeads);

    // 3. Close modal immediately
    setIsEmailModalOpen(false);
  };

  const getCategoryStyles = (category?: string) => {
    switch (category) {
      case 'hot': return 'bg-rose-600 text-white shadow-rose-200';
      case 'standard': return 'bg-amber-500 text-white shadow-amber-100';
      case 'normal': return 'bg-blue-600 text-white shadow-blue-100';
      case 'cold': return 'bg-slate-400 text-white shadow-slate-50';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  const handleAction = (lead: Lead, type: 'email' | 'whatsapp' | 'call') => {
    if (type === 'email' && lead.email) {
      openEmailSystem(lead);
    } else if (type === 'whatsapp' && lead.phone) {
      window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
      const updatedLeads = leads.map(l => l.id === lead.id ? { 
        ...l, 
        lastAction: {
          type: 'whatsapp' as const,
          date: new Date().toISOString(),
          note: 'Initiated WhatsApp conversation'
        }
      } : l);
      onLeadsUpdate(updatedLeads);
    } else if (type === 'call' && lead.phone) {
      window.location.href = `tel:${lead.phone}`;
      const updatedLeads = leads.map(l => l.id === lead.id ? { 
        ...l, 
        lastAction: {
          type: 'phone' as const,
          date: new Date().toISOString(),
          note: 'Initiated voice call'
        }
      } : l);
      onLeadsUpdate(updatedLeads);
    }
  };

  const handleLinkedinAction = (lead: Lead) => {
    if (lead.linkedin) {
      window.open(lead.linkedin, '_blank');
    } else {
      const query = `${lead.name} ${lead.location} LinkedIn`;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
  };

  const sendToOutreach = (lead: Lead) => {
    const updatedLeads = leads.map(l => l.id === lead.id ? { ...l, status: 'contacted' as const } : l);
    onLeadsUpdate(updatedLeads);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Criteria Control Center */}
      <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
          <i className="fas fa-shield-check text-[140px] -rotate-12"></i>
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            <div>
              <h2 className="text-[11px] font-black text-[#2160fd] uppercase tracking-[0.5em] mb-2 flex items-center gap-2">
                <i className="fas fa-dna animate-pulse"></i>
                Scoring Engine
              </h2>
              <h3 className="text-3xl font-black text-[#101828] tracking-tighter">AI Qualification Matrix</h3>
              <p className="text-[#667085] text-sm font-medium mt-2">Define lead scoring rules or let AI analyze your pipeline intent signals.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={onExport}
                className="px-6 py-4 border border-[#eaecf0] text-[#475467] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <i className="fas fa-file-export"></i> Export All
              </button>
              <button 
                onClick={handleBatchQualify}
                disabled={isQualifying || criteria.length === 0 || leads.length === 0}
                className={`px-10 py-4 bg-[#101828] text-white rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-[#2160fd] transition-all flex items-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isQualifying ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-play-circle"></i>}
                Run Qualification
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Criteria Builder */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-list-check text-blue-500"></i> Active Qualification Rules
              </h4>
              <div className="flex flex-wrap gap-2.5 min-h-[100px] p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                {criteria.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No rules defined. Add rules or use AI suggest.</p>
                ) : (
                  criteria.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-sm animate-in zoom-in-95">
                      {rule}
                      <button onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500"><i className="fas fa-times"></i></button>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddRule} className="flex gap-2">
                <input 
                  type="text" 
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="e.g. Phone number must be present..."
                  className="flex-1 px-6 py-4 bg-white border border-[#eaecf0] rounded-2xl text-sm font-bold focus:border-[#2160fd] outline-none shadow-inner"
                />
                <button type="submit" className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg active:scale-95"><i className="fas fa-plus"></i></button>
              </form>
            </div>

            {/* AI Assistant */}
            <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[40px] flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <i className="fas fa-wand-magic-sparkles"></i> AI Criteria Strategist
                </h4>
                <p className="text-sm font-bold text-blue-900/80 leading-relaxed mb-6">
                  Not sure how to score? Our AI can scan your current discovery pipeline and generate optimal qualification rules based on market data.
                </p>
              </div>
              <button 
                onClick={handleSuggestCriteria}
                disabled={isSuggesting}
                className="w-full py-4 bg-white text-blue-600 border border-blue-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {isSuggesting ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-sparkles"></i>}
                {isSuggesting ? 'Brainstorming...' : 'Auto-Generate Criteria'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Qualified Lead Board */}
      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center justify-between px-4">
           <h3 className="text-xl font-black text-[#101828] tracking-tight">Scored Pipeline ({leads.filter(l => l.qualificationCategory).length})</h3>
           <div className="flex items-center gap-6">
              {['hot', 'standard', 'normal', 'cold'].map(cat => (
                <div key={cat} className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full ${getCategoryStyles(cat).split(' ')[0]}`}></div>
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{cat}</span>
                </div>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.length === 0 ? (
            <div className="col-span-full py-20 bg-white border border-dashed border-slate-200 rounded-[48px] text-center">
              <i className="fas fa-radar text-4xl text-slate-200 mb-6"></i>
              <p className="text-slate-400 font-bold">Pipeline Empty. Scrape leads first.</p>
            </div>
          ) : leads.map((lead) => (
            <div key={lead.id} className="bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm hover:shadow-xl transition-all group/card flex flex-col justify-between min-h-[520px]">
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-700 shadow-inner group-hover/card:bg-blue-50 group-hover/card:text-blue-600 transition-colors">
                    {lead.name[0].toUpperCase()}
                  </div>
                  {lead.qualificationCategory && (
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg animate-in fade-in zoom-in-95 ${getCategoryStyles(lead.qualificationCategory)}`}>
                       {lead.qualificationCategory}
                    </div>
                  )}
                </div>

                <h4 className="text-xl font-black text-[#101828] tracking-tighter mb-1 truncate">{lead.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6"><i className="fas fa-location-dot text-rose-500 mr-2"></i> {lead.location}</p>

                {/* Enhanced Decision Stakeholder Intelligence Info */}
                <div className="mb-6 p-5 bg-blue-50/40 border border-blue-100 rounded-[32px] relative overflow-hidden group/stakeholder shadow-inner">
                   <div className="flex flex-col gap-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-lg border-2 border-white/20">
                           {lead.contactName ? getInitials(lead.contactName) : <i className="fas fa-user-tie"></i>}
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2">
                             <p className="text-[14px] font-black text-[#101828] truncate">
                                {lead.contactName || 'Unidentified'}
                             </p>
                             {lead.email && <i className="fas fa-badge-check text-blue-500 text-[10px]" title="Direct Email Verified"></i>}
                           </div>
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                              {lead.contactRole || 'Decision Stakeholder'}
                           </p>
                        </div>
                        {!lead.contactName && (
                          <button 
                            onClick={() => handleResearchStakeholder(lead)}
                            disabled={isResearchingId === lead.id}
                            className="w-10 h-10 rounded-xl bg-white border border-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-md disabled:opacity-50"
                            title="Research Decision Maker"
                          >
                            {isResearchingId === lead.id ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-tower-broadcast"></i>}
                          </button>
                        )}
                      </div>

                      {/* Stakeholder Contact Nodes */}
                      {(lead.email || lead.linkedin) && (
                        <div className="flex items-center gap-3 pt-3 border-t border-blue-100/50">
                           {lead.email && (
                             <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-blue-50 shadow-sm" title={lead.email}>
                               <i className="fas fa-envelope text-blue-400 text-[10px]"></i>
                               <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter truncate max-w-[100px]">{lead.email.split('@')[0]}</span>
                             </div>
                           )}
                           {lead.linkedin && (
                             <a 
                               href={lead.linkedin} 
                               target="_blank" 
                               onClick={e => e.stopPropagation()}
                               className="flex items-center gap-2 px-3 py-1.5 bg-[#0a66c2]/5 hover:bg-[#0a66c2] hover:text-white text-[#0a66c2] rounded-xl border border-[#0a66c2]/10 transition-all shadow-sm"
                             >
                               <i className="fab fa-linkedin text-[10px]"></i>
                               <span className="text-[9px] font-black uppercase tracking-tighter">Profile</span>
                             </a>
                           )}
                        </div>
                      )}
                   </div>
                </div>

                {lead.qualificationReasoning ? (
                  <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-[20px]">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic line-clamp-3">"{lead.qualificationReasoning}"</p>
                    <div className="mt-3 flex items-center justify-between">
                       <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">IQ: {lead.qualificationScore}</span>
                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Verified AI</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 h-[80px] flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-[24px] opacity-40">
                     <i className="fas fa-microchip-ai text-2xl mb-2"></i>
                     <p className="text-[9px] font-black uppercase">Scoring Pending</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAction(lead, 'call')}
                    disabled={!lead.phone}
                    className="flex-1 py-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all flex items-center justify-center gap-2 border border-transparent hover:border-blue-100 disabled:opacity-30"
                  >
                    <i className="fas fa-phone-alt text-[10px]"></i>
                  </button>
                  <button 
                    onClick={() => handleAction(lead, 'whatsapp')}
                    disabled={!lead.phone}
                    className="flex-1 py-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all flex items-center justify-center gap-2 border border-transparent hover:border-emerald-100 disabled:opacity-30"
                  >
                    <i className="fab fa-whatsapp text-[12px]"></i>
                  </button>
                  
                  {/* LINKEDIN BUTTON */}
                  <button 
                    onClick={() => handleLinkedinAction(lead)}
                    className="flex-1 py-3 bg-slate-50 hover:bg-[#0a66c2]/10 text-slate-400 hover:text-[#0a66c2] rounded-xl transition-all flex items-center justify-center gap-2 border border-transparent hover:border-[#0a66c2]/20"
                    title={lead.linkedin ? "Open LinkedIn Profile" : "Search on LinkedIn"}
                  >
                    <i className="fab fa-linkedin-in text-[12px]"></i>
                  </button>

                  {/* DRAFT AI OUTREACH BUTTON */}
                  <button 
                    onClick={() => openEmailSystem(lead)}
                    disabled={!lead.email}
                    className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <i className="fas fa-wand-magic-sparkles text-[10px] group-hover:rotate-12 transition-transform"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">Draft Outreach</span>
                  </button>
                </div>
                
                <button 
                  onClick={() => sendToOutreach(lead)}
                  className="w-full py-4 bg-[#101828] hover:bg-[#2160fd] text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                >
                   <i className="fas fa-rocket-launch"></i> Push to Pipeline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REDESIGNED AI Outreach Preview & Dispatch System */}
      {isEmailModalOpen && targetLead && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-[#101828]/80 backdrop-blur-xl" onClick={() => setIsEmailModalOpen(false)}></div>
           <div className="relative w-full max-w-[800px] bg-white border border-[#eaecf0] rounded-[56px] shadow-2xl p-8 md:p-10 flex flex-col animate-in zoom-in-95 duration-500 overflow-hidden min-h-[500px]">
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center shadow-inner">
                       <i className="fas fa-envelopes-bulk text-xl"></i>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-[#101828] tracking-tighter">AI Strategic Dispatch</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipient: {targetLead.name}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{targetLead.email}</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setIsEmailModalOpen(false)} className="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all border border-slate-100">
                    <i className="fas fa-times"></i>
                 </button>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit mb-6 border border-slate-200">
                 <button 
                   onClick={() => setEmailMode('edit')}
                   className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${emailMode === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                 >
                   <Edit3 size={14} /> Editor
                 </button>
                 <button 
                   onClick={() => setEmailMode('preview')}
                   className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${emailMode === 'preview' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                 >
                   <Eye size={14} /> Client Preview
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar max-h-[55vh] pr-2">
                 {emailMode === 'edit' ? (
                   <div className="bg-slate-50 border border-[#eaecf0] rounded-[32px] p-8 relative overflow-hidden h-full">
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                         <i className="fas fa-quote-right text-6xl"></i>
                      </div>
                      
                      <div className="space-y-6 relative z-10">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Subject Header</label>
                            <input 
                               value={emailDraft.subject}
                               onChange={(e) => { setEmailDraft({ ...emailDraft, subject: e.target.value }); setIsApproved(false); }}
                               className="w-full px-6 py-4 bg-white border border-[#eaecf0] rounded-2xl font-black text-[#101828] outline-none focus:border-blue-600 transition-all shadow-sm"
                               placeholder="Subject line..."
                               disabled={isGeneratingDraft}
                            />
                         </div>

                         <div className="space-y-2 relative h-full">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Message Body</label>
                            {isGeneratingDraft && (
                              <div className="absolute inset-0 top-8 z-20 bg-white/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center text-center p-10 animate-pulse">
                                 <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                                 <h4 className="text-sm font-black text-[#101828] uppercase tracking-widest mb-2">Synthesizing Intel...</h4>
                                 <p className="text-[10px] text-slate-400 font-bold max-w-xs uppercase tracking-tighter">Drafting personalized outreach based on market signals.</p>
                              </div>
                            )}
                            <textarea 
                               value={emailDraft.body}
                               onChange={(e) => { setEmailDraft({ ...emailDraft, body: e.target.value }); setIsApproved(false); }}
                               className="w-full min-h-[300px] px-8 py-8 bg-white border border-[#eaecf0] rounded-[32px] font-medium text-slate-700 leading-[1.8] outline-none focus:border-blue-600 transition-all resize-none shadow-sm"
                               placeholder="The AI will compose your message here..."
                               disabled={isGeneratingDraft}
                            />
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="bg-white border border-[#eaecf0] rounded-[32px] shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-2">
                      {/* Mock Email Client Header */}
                      <div className="bg-slate-50 border-b border-[#eaecf0] p-6 space-y-4">
                         <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-indigo-200">
                                  <User size={18} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-xs font-bold text-[#101828]">companiesGenius Pro</span>
                                     <span className="text-[10px] text-slate-400">&lt;outreach@system&gt;</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                     <span>to</span>
                                     <span className="font-bold text-[#101828]">{targetLead.name}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                               <Calendar size={12} />
                               {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                         </div>
                         <div className="pl-14">
                            <h4 className="text-lg font-bold text-[#101828] leading-tight">{emailDraft.subject || '(No Subject)'}</h4>
                         </div>
                      </div>
                      
                      {/* Email Body Preview */}
                      <div className="p-8 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 leading-loose font-medium">
                         {emailDraft.body || <span className="text-slate-300 italic">No content generated yet. Switch to Editor to draft.</span>}
                      </div>
                   </div>
                 )}
              </div>

              {/* ACTION CENTER */}
              <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-6">
                 {/* Step 2: Approval Verification */}
                 {!isGeneratingDraft && emailDraft.body && (
                   <div className={`p-5 rounded-[24px] border flex items-center justify-between transition-all ${isApproved ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50/50 border-blue-100 shadow-inner'}`}>
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${isApproved ? 'bg-emerald-500 text-white' : 'bg-white text-blue-500'}`}>
                            <i className={`fas ${isApproved ? 'fa-check' : 'fa-clipboard-check'}`}></i>
                         </div>
                         <div>
                            <p className="text-[11px] font-black text-[#101828] uppercase tracking-widest">Step 1: Strategic Approval</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                               {isApproved ? 'Message validated and ready for dispatch.' : 'Review draft and toggle to unlock sender.'}
                            </p>
                         </div>
                      </div>
                      <button 
                        onClick={() => { setIsApproved(!isApproved); if(!isApproved) setEmailMode('preview'); }}
                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${isApproved ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      >
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${isApproved ? 'left-7' : 'left-1'}`}></div>
                      </button>
                   </div>
                 )}

                 <div className="flex flex-col md:flex-row gap-4">
                    <button 
                       onClick={() => openEmailSystem(targetLead)}
                       disabled={isGeneratingDraft}
                       className="flex-1 py-5 px-6 border border-[#eaecf0] rounded-[24px] text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                       <i className={`fas fa-arrows-rotate ${isGeneratingDraft ? 'animate-spin' : ''}`}></i>
                       Regenerate
                    </button>
                    
                    {/* Final Step: Ready for Dispatch */}
                    <button 
                       onClick={handleSendEmail}
                       disabled={isGeneratingDraft || !emailDraft.body || !isApproved}
                       className={`flex-[2] py-5 px-6 rounded-[24px] text-[11px] font-black uppercase tracking-[0.25em] shadow-2xl transition-all flex items-center justify-center gap-4 group relative overflow-hidden active:scale-95 ${
                          isApproved 
                          ? 'bg-[#101828] text-white hover:bg-blue-600 ring-4 ring-blue-50' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed grayscale'
                       }`}
                    >
                       {!isApproved && <i className="fas fa-lock text-[10px] mr-2"></i>}
                       {isApproved ? 'Dispatch Outreach Now' : 'Pending Approval'}
                       <i className={`fas fa-paper-plane-top ${isApproved ? 'group-hover:translate-x-1 group-hover:-translate-y-1' : ''} transition-transform`}></i>
                    </button>
                 </div>
              </div>

              <div className="mt-6 text-center">
                 <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Verified Intelligence Node • Gemini-3 Flash High-Conversion Engine</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AIQualificationView;
