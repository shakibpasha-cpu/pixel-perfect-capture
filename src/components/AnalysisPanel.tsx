
import React, { useState } from 'react';
import { Lead, AnalysisResult, AnalysisType, EnrichmentSuggestion } from '../types';

interface AnalysisPanelProps {
  lead: Lead;
  analysis: AnalysisResult | null;
  isLoading: boolean;
  onRunAnalysis: (type: AnalysisType) => void;
  onUpdateLead: (lead: Lead) => void;
  onClose: () => void;
  onPushToQualification?: (lead: Lead) => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  lead, analysis, isLoading, onRunAnalysis, onUpdateLead, onClose, onPushToQualification
}) => {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'company_intel' | 'details'>('intelligence');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryColor = (category: EnrichmentSuggestion['category']) => {
    switch (category) {
      case 'data_gap': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'strategy': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'hook': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  const data = analysis?.enrichedData || lead;

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[900px] bg-white shadow-[-40px_0_80px_rgba(16,24,40,0.2)] z-[150] flex flex-col transform border-l border-[#eaecf0] animate-in slide-in-from-right duration-500 overflow-hidden">
      {/* Header */}
      <div className="relative p-8 md:p-12 border-b border-[#eaecf0] bg-white z-10 shrink-0">
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-8">
            <div className={`w-24 h-24 bg-gradient-to-br from-[#101828] to-[#2160fd] rounded-[36px] flex items-center justify-center text-white text-4xl font-black shadow-2xl overflow-hidden border-2 border-white/20 shrink-0`}>
              {lead.imageUrl ? (
                <img src={lead.imageUrl} alt={lead.name} className="w-full h-full object-contain p-2 bg-white" />
              ) : (
                getInitials(lead.name)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <h2 className="text-4xl font-black text-[#101828] tracking-tighter truncate leading-tight">{lead.name}</h2>
                {analysis && (
                  <span className="bg-[#2160fd] text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-[#2160fd]/10 shadow-lg animate-in zoom-in-50 duration-500">
                    <i className="fas fa-badge-check mr-1.5"></i> Verified Intel
                  </span>
                )}
              </div>
              <p className="text-[14px] font-bold text-[#667085] opacity-80 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2"><i className="fas fa-industry text-blue-500"></i> {lead.industry}</span>
                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                <span className="flex items-center gap-2"><i className="fas fa-location-dot text-rose-500"></i> {lead.location}</span>
                {data.employeeCount && (
                  <>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                    <span className="flex items-center gap-2"><i className="fas fa-users text-indigo-500"></i> {data.employeeCount}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-14 h-14 flex items-center justify-center rounded-[20px] hover:bg-rose-50 text-[#667085] hover:text-rose-600 transition-all border border-[#eaecf0] shrink-0">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="flex items-center gap-10 border-b border-[#f2f4f7] -mb-12 overflow-x-auto no-scrollbar">
          {[
            { id: 'intelligence', label: 'Executive Brief', icon: 'fa-brain-circuit' },
            { id: 'company_intel', label: 'Company Intelligence', icon: 'fa-building-shield' },
            { id: 'details', label: 'Operational Records', icon: 'fa-database' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative flex items-center gap-3 whitespace-nowrap ${activeTab === tab.id ? 'text-[#2160fd]' : 'text-[#98a2b3] hover:text-[#475467]'}`}
            >
              <i className={`fas ${tab.icon} text-[14px]`}></i>
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1.5 bg-[#2160fd] rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#fcfcfd] relative custom-scrollbar">
        {isLoading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-[160] flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-[#101828] rounded-[32px] border-t-4 border-blue-500 animate-spin flex items-center justify-center shadow-2xl">
              <i className="fas fa-radar text-3xl text-blue-400 animate-pulse"></i>
            </div>
            <h4 className="text-2xl font-black text-[#101828] uppercase tracking-[0.4em] mt-10">Decrypting Footprint...</h4>
            <p className="text-slate-400 text-sm font-bold mt-4 tracking-tight">AI is parsing regulatory filings, web records, and leadership graphs.</p>
          </div>
        )}

        <div className="p-8 md:p-12 space-y-12 pb-32">
          {activeTab === 'intelligence' && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              {!analysis && (
                 <div className="bg-[#101828] rounded-[56px] p-16 text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                      <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[28px] flex items-center justify-center mx-auto mb-8">
                         <i className="fas fa-satellite-dish text-blue-400 text-3xl"></i>
                      </div>
                      <h4 className="text-3xl font-black text-white tracking-tighter mb-6">Deep Intelligence Grounding</h4>
                      <p className="text-slate-400 text-base font-medium mb-12 max-w-md mx-auto leading-relaxed">Execute a multi-stage grounding scan to extract decision-makers, revenue brackets, and operational scaling data.</p>
                      <button 
                        onClick={() => onRunAnalysis(AnalysisType.SEARCH)}
                        className="px-14 py-6 bg-blue-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 hover:shadow-[0_20px_40px_-10px_rgba(33,96,253,0.5)] transition-all flex items-center gap-5 mx-auto active:scale-95"
                      >
                        <i className="fas fa-tower-broadcast animate-pulse"></i> Initialize Full Discovery
                      </button>
                    </div>
                 </div>
              )}

              {analysis && (
                <div className="space-y-12">
                  <section className="bg-white p-10 md:p-12 rounded-[56px] border border-[#eaecf0] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                       <i className="fas fa-quote-right text-8xl"></i>
                    </div>
                    <h5 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.5em] mb-10 flex items-center gap-3">
                      <i className="fas fa-sparkles"></i> Executive Briefing
                    </h5>
                    <p className="text-xl md:text-2xl font-bold text-[#101828] leading-[1.6] tracking-tight">{analysis.summary}</p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <div className="bg-white p-8 rounded-[40px] border border-[#eaecf0] shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                             <i className="fas fa-user-crown text-amber-500"></i> Primary Lead
                          </span>
                          <p className="text-lg md:text-xl font-black text-[#101828] leading-tight">
                            {data.contactName || 'CEO Identity Shielded'}
                          </p>
                          {data.email && <p className="text-xs font-bold text-slate-400 mt-2 truncate">{data.email}</p>}
                        </div>
                        {data.contactRole && <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-4">{data.contactRole}</p>}
                     </div>

                     <div className="bg-white p-8 rounded-[40px] border border-[#eaecf0] shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                             <i className="fas fa-chart-line-up text-emerald-500"></i> Revenue Intensity
                          </span>
                          <p className="text-lg md:text-xl font-black text-emerald-700 leading-tight">
                            {data.revenueHistory || 'Estimated via Market Volume'}
                          </p>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-4">Verified Annual Band</p>
                     </div>

                     <div className="bg-white p-8 rounded-[40px] border border-[#eaecf0] shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                             <i className="fas fa-users-gear text-indigo-500"></i> Workforce Scale
                          </span>
                          <p className="text-lg md:text-xl font-black text-indigo-700 leading-tight">
                            {data.employeeCount || 'Sizing in Progress'}
                          </p>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-4">Calculated FTE Range</p>
                     </div>
                  </div>

                  <div className="space-y-8">
                    <h5 className="text-[12px] font-black text-[#101828] uppercase tracking-[0.5em] px-4 flex items-center gap-4">
                      <i className="fas fa-chess-knight text-blue-600"></i> Outreach Strategies & Hooks
                    </h5>
                    <div className="grid grid-cols-1 gap-6">
                      {analysis.suggestions?.map((suggestion, idx) => (
                        <div key={idx} className="bg-white border border-[#eaecf0] p-10 rounded-[48px] hover:shadow-2xl transition-all relative group/card">
                          <div className="absolute top-0 bottom-0 left-0 w-2.5 rounded-l-[48px] bg-[#2160fd] opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                          <div className="flex items-start justify-between mb-8">
                            <span className={`text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest border shadow-sm ${getCategoryColor(suggestion.category as any)}`}>
                              {suggestion.category.replace('_', ' ')}
                            </span>
                            <button 
                              onClick={() => handleCopy(suggestion.action, `sug-${idx}`)} 
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${copiedId === `sug-${idx}` ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-blue-600 border border-slate-100'}`}
                              title="Copy Communication Hook"
                            >
                              <i className={`fas ${copiedId === `sug-${idx}` ? 'fa-check' : 'fa-copy'}`}></i>
                            </button>
                          </div>
                          <h5 className="text-2xl font-black text-[#101828] mb-4 tracking-tight">{suggestion.title}</h5>
                          <p className="text-[15px] text-[#667085] font-bold opacity-80 mb-8 leading-relaxed">{suggestion.description}</p>
                          <div className="p-6 bg-slate-50 border border-slate-100 rounded-[28px] relative">
                             <i className="fas fa-quote-left absolute top-4 left-4 opacity-10 text-2xl"></i>
                             <p className="text-sm md:text-base font-medium text-slate-700 italic relative z-10 pl-6">"{suggestion.action}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'company_intel' && (
            <div className="animate-in fade-in duration-500 space-y-12">
              
              {/* Leadership Command Center - REVISED HIERARCHY */}
              <section>
                <h5 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                  <i className="fas fa-sitemap text-amber-500"></i> Corporate Hierarchy & Leadership
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {/* Primary CEO/Founders Card */}
                  <div className="bg-[#101828] rounded-[32px] p-8 text-white relative overflow-hidden group col-span-1 md:col-span-2 shadow-2xl">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                      <i className="fas fa-crown text-8xl"></i>
                    </div>
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-4">Executive Leadership</p>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-black text-white border border-white/10">
                        {data.contactName ? getInitials(data.contactName) : '?'}
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{data.contactName || 'CEO Pending Scan'}</p>
                        <p className="text-sm font-medium text-slate-400 mt-1">{data.contactRole || 'Chief Executive Officer'}</p>
                        {data.email && (
                          <div className="flex items-center gap-3 mt-4">
                             <a href={`mailto:${data.email}`} className="px-4 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-colors border border-blue-500/30">
                               Email Direct
                             </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Extended Leadership Grid - 10 Profiles */}
                  {data.leadership && data.leadership.length > 0 ? (
                    data.leadership.map((leader, i) => (
                      <div key={i} className="bg-white border border-[#eaecf0] rounded-[32px] p-6 hover:shadow-xl hover:border-blue-200 transition-all group/leader relative overflow-hidden">
                        <div className="flex items-start gap-5 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-100 group-hover/leader:bg-blue-50 group-hover/leader:text-blue-600 transition-colors">
                            {getInitials(leader.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-[#101828] truncate">{leader.name}</p>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mt-0.5 truncate">{leader.role}</p>
                            
                            <div className="flex items-center gap-2 mt-4">
                               {leader.email && (
                                 <a href={`mailto:${leader.email}`} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all" title={leader.email}>
                                   <i className="fas fa-envelope text-xs"></i>
                                 </a>
                               )}
                               {leader.phone && (
                                 <a href={`tel:${leader.phone}`} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all" title={leader.phone}>
                                   <i className="fas fa-phone text-xs"></i>
                                 </a>
                               )}
                               {leader.linkedin && (
                                 <a href={leader.linkedin} target="_blank" className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-[#0a66c2] hover:text-white transition-all" title="LinkedIn Profile">
                                   <i className="fab fa-linkedin-in text-xs"></i>
                                 </a>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full bg-slate-50 border border-slate-200 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center text-center">
                      <i className="fas fa-users-slash text-slate-300 text-3xl mb-4"></i>
                      <p className="text-sm font-bold text-slate-500">Hierarchy data requires deep scan.</p>
                      <button 
                        onClick={() => onRunAnalysis(AnalysisType.SEARCH)} 
                        className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        Run Deep Enrichment
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Financial & Market Profile */}
              <section className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm relative overflow-hidden">
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-60"></div>
                 <h5 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.4em] mb-8 flex items-center gap-3 relative z-10">
                    <i className="fas fa-chart-network text-emerald-500"></i> Financial & Market Position
                 </h5>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Annual Revenue</p>
                       <p className="text-3xl font-black text-[#101828] tracking-tight">{data.revenueHistory || 'Estimate Pending'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Market Standing</p>
                       <p className="text-xl font-bold text-slate-700 leading-relaxed">
                         {data.marketPosition || 'Analyzing market share and vertical dominance...'}
                       </p>
                    </div>
                 </div>
              </section>

              {/* Strategic Roadmap: Running vs Future */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-slate-50 border border-slate-200 rounded-[40px] p-8">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                       <i className="fas fa-play-circle"></i> Active Running Projects
                    </h5>
                    {data.runningProjects && data.runningProjects.length > 0 ? (
                      <ul className="space-y-4">
                        {data.runningProjects.map((proj, i) => (
                          <li key={i} className="flex items-start gap-3">
                             <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                             <span className="text-sm font-bold text-[#101828] leading-snug">{proj}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs font-medium text-slate-400 italic">No public active projects indexed.</p>
                    )}
                 </div>

                 <div className="bg-indigo-50/50 border border-indigo-100 rounded-[40px] p-8">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                       <i className="fas fa-rocket-launch"></i> Future Initiatives
                    </h5>
                    {data.futureProjects && data.futureProjects.length > 0 ? (
                      <ul className="space-y-4">
                        {data.futureProjects.map((proj, i) => (
                          <li key={i} className="flex items-start gap-3">
                             <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                             <span className="text-sm font-bold text-[#101828] leading-snug">{proj}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs font-medium text-slate-400 italic">Future roadmap not publicly disclosed.</p>
                    )}
                 </div>
              </section>

              {/* Competitors & Tech Stack */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white border border-[#eaecf0] rounded-[40px] p-8">
                    <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                       <i className="fas fa-swords"></i> Top Competitors
                    </h5>
                    <div className="flex flex-wrap gap-3">
                       {data.competitors && data.competitors.length > 0 ? (
                         data.competitors.map((comp, i) => (
                           <span key={i} className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-black uppercase tracking-wide">
                             {comp}
                           </span>
                         ))
                       ) : (
                         <p className="text-xs font-medium text-slate-400 italic">Competitive landscape analysis pending.</p>
                       )}
                    </div>
                 </div>

                 <div className="bg-white border border-[#eaecf0] rounded-[40px] p-8">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                       <i className="fas fa-layer-group"></i> Technology Stack
                    </h5>
                    <div className="flex flex-wrap gap-3">
                       {data.techStack && data.techStack.length > 0 ? (
                         data.techStack.map((tech, i) => (
                           <span key={i} className="px-4 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold">
                             {tech}
                           </span>
                         ))
                       ) : (
                         <p className="text-xs font-medium text-slate-400 italic">Tech stack unidentified.</p>
                       )}
                    </div>
                 </div>
              </section>

              {/* Communication Infrastructure */}
              <section className="bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm">
                 <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <i className="fas fa-network-wired text-blue-500"></i> Communication Infrastructure
                 </h5>
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl border border-blue-100 shadow-sm">
                       <i className="fas fa-at"></i>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Lifecycle Status</p>
                       <div className="flex items-center gap-3">
                          <p className="text-xl font-black text-[#101828]">{data.emailLifecycle || 'Pending Verification'}</p>
                          {data.emailLifecycle && (
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${data.emailLifecycle.toLowerCase().includes('active') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                               Verified
                            </span>
                          )}
                       </div>
                       <p className="text-xs font-medium text-slate-500 mt-1">
                          {data.email ? `Associated with: ${data.email}` : 'No email detected'}
                       </p>
                    </div>
                 </div>
              </section>

            </div>
          )}

          {activeTab === 'details' && (
            <div className="animate-in fade-in duration-500 space-y-10">
               <div className="bg-white p-12 rounded-[56px] border border-[#eaecf0] shadow-sm">
                  <h4 className="text-[12px] font-black text-[#101828] uppercase tracking-[0.5em] mb-12 flex items-center gap-3">
                    <i className="fas fa-server"></i> Grounded System Records
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Entity Name</p>
                        <p className="text-2xl font-black text-[#101828] tracking-tight">{lead.name}</p>
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Vertical</p>
                        <p className="text-2xl font-black text-[#101828] tracking-tight">{lead.industry}</p>
                     </div>
                  </div>
                  
                  <div className="mt-12 pt-12 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location Data</p>
                         <p className="text-sm font-bold text-[#101828]">{lead.location}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Discovery Source</p>
                         <p className="text-sm font-bold text-[#101828]">{lead.sourceType || 'Web Search'}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Database ID</p>
                         <p className="text-sm font-bold text-slate-300 font-mono">{lead.id}</p>
                      </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;
