
import React, { useState } from 'react';
import { Lead, ComparisonResult } from '../types';
import { gemini } from '../services/geminiService';
import { Scale, Trophy, CheckCircle, XCircle, ArrowRight, Activity, Target, User, Sword, Shield, Zap, Coins } from 'lucide-react';

interface Props {
  leads: Lead[];
}

const PERSONAS = [
  { id: 'Strategic Consultant', label: 'The Strategist', icon: 'fa-chess', color: 'text-indigo-600', desc: 'Focuses on long-term viability and market fit.' },
  { id: 'Aggressive Investor', label: 'The VC', icon: 'fa-money-bill-trend-up', color: 'text-emerald-600', desc: 'Prioritizes high growth potential and innovation.' },
  { id: 'Risk Manager', label: 'The Skeptic', icon: 'fa-shield-halved', color: 'text-rose-600', desc: 'Identifies threats, weaknesses, and reliability issues.' },
  { id: 'Procurement Officer', label: 'The Buyer', icon: 'fa-cart-shopping', color: 'text-blue-600', desc: 'Looks for cost efficiency and operational stability.' },
];

const ComparisonView: React.FC<Props> = ({ leads }) => {
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [criteria, setCriteria] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const toggleLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) 
        ? prev.filter(lid => lid !== id) 
        : [...prev, id]
    );
  };

  const handleCompare = async () => {
    if (selectedLeadIds.length < 2 || !criteria.trim()) return;
    
    setIsAnalyzing(true);
    setResult(null);
    try {
      const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
      const comparisonData = await gemini.compareLeads(selectedLeads, criteria, selectedPersona.id);
      setResult(comparisonData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (score >= 50) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-rose-500 bg-rose-50 border-rose-100';
  };

  const renderStatBar = (label: string, value: number, icon: any) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
          {icon} {label}
        </span>
        <span className="text-[10px] font-black">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${value > 75 ? 'bg-emerald-500' : value > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Cinematic Header Block */}
      <div className="bg-[#101828] rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
          <Scale size={180} />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[28px] flex items-center justify-center mb-6 shadow-inner ring-4 ring-white/5">
             <Sword className="text-amber-400" size={32} />
          </div>
          <h2 className="text-[11px] font-black text-amber-400 uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
            <Target className="animate-pulse" size={14} />
            Competitor Battleground
          </h2>
          <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">
            Strategic Showdown
          </h3>
          <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-lg">
            Simulate a competitive analysis between potential partners. Select an AI persona to judge the battle based on your specific goals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Selection & Criteria Panel */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm h-full flex flex-col">
             
             {/* Persona Selector */}
             <div className="mb-8">
               <h4 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <User size={16} className="text-[#2160fd]" /> Select Judge Persona
               </h4>
               <div className="grid grid-cols-1 gap-3">
                 {PERSONAS.map(p => (
                   <button
                     key={p.id}
                     onClick={() => setSelectedPersona(p)}
                     className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-4 group ${selectedPersona.id === p.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 hover:border-blue-100'}`}
                   >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPersona.id === p.id ? 'bg-white shadow-sm' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
                       <i className={`fas ${p.icon} ${p.color}`}></i>
                     </div>
                     <div>
                       <p className={`text-xs font-black uppercase tracking-wide ${selectedPersona.id === p.id ? 'text-[#101828]' : 'text-slate-600'}`}>{p.label}</p>
                       <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{p.desc}</p>
                     </div>
                   </button>
                 ))}
               </div>
             </div>

             <h4 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-[#2160fd]" /> Select Contenders (Min 2)
             </h4>
             
             <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 mb-8 pr-2 custom-scrollbar">
                {leads.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No leads available. Run a search first.</p>
                ) : (
                  leads.map(lead => (
                    <div 
                      key={lead.id}
                      onClick={() => toggleLead(lead.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-md'}`}
                    >
                       <div>
                          <p className={`text-sm font-bold ${selectedLeadIds.includes(lead.id) ? 'text-[#2160fd]' : 'text-[#101828]'}`}>{lead.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{lead.industry} • {lead.location}</p>
                       </div>
                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedLeadIds.includes(lead.id) ? 'bg-[#2160fd] border-[#2160fd]' : 'border-slate-300'}`}>
                          {selectedLeadIds.includes(lead.id) && <CheckCircle size={12} className="text-white" />}
                       </div>
                    </div>
                  ))
                )}
             </div>

             <div className="space-y-4">
                <h4 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.2em] flex items-center gap-2">
                   <Target size={16} className="text-[#2160fd]" /> Define Objective
                </h4>
                <textarea 
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="e.g. I need a vendor with strong AI capabilities, under $50k cost, and high reliability..."
                  className="w-full h-24 p-4 bg-[#f9fafb] border border-[#eaecf0] rounded-2xl text-sm font-medium text-[#101828] focus:bg-white focus:border-[#2160fd] focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none placeholder:text-slate-400"
                />
                
                <button 
                  onClick={handleCompare}
                  disabled={selectedLeadIds.length < 2 || !criteria.trim() || isAnalyzing}
                  className={`w-full py-4 rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] text-white transition-all shadow-xl flex items-center justify-center gap-3 ${selectedLeadIds.length < 2 || !criteria.trim() || isAnalyzing ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#101828] hover:bg-[#2160fd] hover:shadow-blue-500/30 active:scale-95'}`}
                >
                  {isAnalyzing ? (
                    <><Activity className="animate-spin" size={16} /> Running Simulation...</>
                  ) : (
                    <><Sword size={16} /> Start Battle</>
                  )}
                </button>
             </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-8">
           {!result && !isAnalyzing && (
             <div className="h-full min-h-[500px] bg-white border border-dashed border-[#eaecf0] rounded-[48px] flex flex-col items-center justify-center text-slate-300">
               <Scale size={64} className="mb-6 opacity-20" />
               <p className="text-[11px] font-black uppercase tracking-widest">Arena Empty</p>
               <p className="text-sm font-medium opacity-60">Select contenders to begin the battle.</p>
             </div>
           )}

           {isAnalyzing && (
             <div className="h-full min-h-[500px] bg-white border border-[#eaecf0] rounded-[48px] flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-blue-50/30 animate-pulse"></div>
               <div className="w-24 h-24 border-4 border-blue-100 border-t-[#2160fd] rounded-full animate-spin mb-8 relative z-10"></div>
               <h4 className="text-xl font-black text-[#101828] relative z-10">Simulating Scenarios...</h4>
               <p className="text-sm font-bold text-slate-400 mt-2 relative z-10">
                 {selectedPersona.label} is analyzing Fit • Innovation • Risk
               </p>
             </div>
           )}

           {result && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Winner Banner */}
                <div className="bg-gradient-to-r from-[#101828] to-[#1e293b] rounded-[40px] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Trophy size={140} className="-rotate-12" />
                   </div>
                   <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                         <span className="bg-amber-400 text-[#101828] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                            <Trophy size={10} /> Champion Selected
                         </span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           Judge: {selectedPersona.label}
                         </span>
                      </div>
                      <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                         {leads.find(l => l.id === result.winnerId)?.name || 'Unknown Winner'}
                      </h3>
                      <p className="text-lg text-slate-200 font-medium leading-relaxed max-w-2xl mb-6">
                         "{result.recommendation}"
                      </p>
                      <div className="bg-white/10 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                         <p className="text-xs font-medium text-slate-300 italic leading-relaxed">
                            <span className="text-amber-400 font-black not-italic uppercase tracking-wider mr-2">Verdict:</span> 
                            {result.reasoning}
                         </p>
                      </div>
                   </div>
                </div>

                {/* Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {result.comparisonPoints.map((point) => {
                      const lead = leads.find(l => l.id === point.leadId);
                      if (!lead) return null;
                      const isWinner = point.leadId === result.winnerId;

                      return (
                         <div key={point.leadId} className={`bg-white border rounded-[32px] p-8 shadow-sm flex flex-col h-full ${isWinner ? 'border-amber-200 ring-4 ring-amber-50' : 'border-[#eaecf0]'}`}>
                            <div className="flex items-start justify-between mb-6">
                               <div>
                                  <h4 className="text-xl font-black text-[#101828] tracking-tight mb-1">{lead.name}</h4>
                                  <p className="text-xs font-bold text-slate-400">{lead.industry}</p>
                               </div>
                               <div className={`px-4 py-2 rounded-xl flex flex-col items-center border ${getScoreColor(point.score)}`}>
                                  <span className="text-xl font-black">{point.score}</span>
                                  <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Fit Score</span>
                               </div>
                            </div>

                            {/* Dimensional Scoring */}
                            {point.dimensions && (
                              <div className="mb-8 p-5 bg-slate-50 rounded-[24px] border border-slate-100">
                                {renderStatBar('Market Fit', point.dimensions.marketFit, <Target size={10} />)}
                                {renderStatBar('Innovation', point.dimensions.innovation, <Zap size={10} />)}
                                {renderStatBar('Reliability', point.dimensions.reliability, <Shield size={10} />)}
                                {renderStatBar('Cost Efficiency', point.dimensions.costEfficiency, <Coins size={10} />)}
                              </div>
                            )}

                            {/* SWOT Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                               <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Strengths</p>
                                  <ul className="space-y-1">
                                    {point.swot?.strengths?.slice(0,2).map((s,i) => <li key={i} className="text-[10px] text-emerald-800 leading-tight">• {s}</li>)}
                                  </ul>
                               </div>
                               <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2">Weaknesses</p>
                                  <ul className="space-y-1">
                                    {point.swot?.weaknesses?.slice(0,2).map((s,i) => <li key={i} className="text-[10px] text-rose-800 leading-tight">• {s}</li>)}
                                  </ul>
                               </div>
                               <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Opportunities</p>
                                  <ul className="space-y-1">
                                    {point.swot?.opportunities?.slice(0,2).map((s,i) => <li key={i} className="text-[10px] text-blue-800 leading-tight">• {s}</li>)}
                                  </ul>
                               </div>
                               <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Threats</p>
                                  <ul className="space-y-1">
                                    {point.swot?.threats?.slice(0,2).map((s,i) => <li key={i} className="text-[10px] text-amber-800 leading-tight">• {s}</li>)}
                                  </ul>
                               </div>
                            </div>

                            <div className="space-y-6 flex-1 border-t border-slate-100 pt-6">
                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                     <CheckCircle size={12} className="text-emerald-500" /> Key Pros
                                  </p>
                                  <ul className="space-y-2">
                                     {point.pros.map((pro, i) => (
                                        <li key={i} className="text-xs font-medium text-slate-600 flex items-start gap-2">
                                           <span className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 shrink-0"></span>
                                           {pro}
                                        </li>
                                     ))}
                                  </ul>
                               </div>

                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                     <XCircle size={12} className="text-rose-500" /> Key Cons
                                  </p>
                                  <ul className="space-y-2">
                                     {point.cons.map((con, i) => (
                                        <li key={i} className="text-xs font-medium text-slate-600 flex items-start gap-2">
                                           <span className="w-1 h-1 bg-rose-300 rounded-full mt-1.5 shrink-0"></span>
                                           {con}
                                        </li>
                                     ))}
                                  </ul>
                               </div>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;