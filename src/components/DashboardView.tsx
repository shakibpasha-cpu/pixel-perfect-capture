
import React, { useState } from 'react';
import { Lead } from '../types';

interface DashboardViewProps {
  leads: Lead[];
  searchCount: number;
  searchGoal: number;
  targetDate: string;
  onUpdateGoal: (val: number) => void;
  onUpdateDate: (val: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  leads, searchCount, searchGoal, targetDate, onUpdateGoal, onUpdateDate 
}) => {
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [localGoal, setLocalGoal] = useState(searchGoal);
  const [localDate, setLocalDate] = useState(targetDate);

  const totalLeads = leads.length;
  const analyzedLeads = leads.filter(l => l.status === 'analyzed').length;
  const avgRating = leads.reduce((acc: number, lead) => acc + (lead.rating || 0), 0) / (leads.filter(l => l.rating !== undefined).length || 1);
  const analyzedPercent = totalLeads > 0 ? Math.round((analyzedLeads / totalLeads) * 100) : 0;
  
  // Progress Calculations
  const progressPercent = Math.min(100, Math.round((searchCount / searchGoal) * 100)); // This seems to be using searchCount as leads count in original code? Let's fix logic below.
  const leadProgressPercent = Math.min(100, Math.round((totalLeads / searchGoal) * 100));
  
  const daysLeft = Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0;

  // Forecast Logic
  const leadsPerSearch = searchCount > 0 ? (totalLeads / searchCount) : 0;
  const remainingLeads = Math.max(0, searchGoal - totalLeads);
  const estimatedSearchesNeeded = leadsPerSearch > 0 ? Math.ceil(remainingLeads / leadsPerSearch) : 0;
  
  // Simple velocity: Leads per day since "start" (assuming start was 7 days ago for demo if no history)
  // In a real app we'd track campaign start date.
  const assumedCampaignDays = 7; 
  const velocityPerDay = Math.max(0.5, totalLeads / assumedCampaignDays); 
  const daysToComplete = Math.ceil(remainingLeads / velocityPerDay);
  
  const projectedFinishDate = new Date();
  projectedFinishDate.setDate(projectedFinishDate.getDate() + daysToComplete);
  
  const isAtRisk = projectedFinishDate > new Date(targetDate);

  // Advanced Metrics
  const hotLeads = leads.filter(l => l.qualificationCategory === 'hot').length;
  const standardLeads = leads.filter(l => l.qualificationCategory === 'standard').length;
  
  // Pipeline Health Index (PHI) Calculation
  const phiScore = totalLeads > 0 ? Math.round(
    (leads.reduce((acc, l) => {
      const w = l.qualificationCategory === 'hot' ? 1.0 : 
                l.qualificationCategory === 'standard' ? 0.7 : 
                l.qualificationCategory === 'normal' ? 0.4 : 
                l.qualificationCategory === 'cold' ? 0.1 : 0.2;
      return acc + w;
    }, 0) / totalLeads) * 100
  ) : 0;

  // Data Density Calculation
  const dataDensity = totalLeads > 0 ? Math.round(
    (leads.reduce((acc, l) => {
      let score = 0;
      if (l.email) score += 33;
      if (l.phone) score += 33;
      if (l.linkedin || l.website) score += 34;
      return acc + score;
    }, 0) / totalLeads)
  ) : 0;

  const industryStats = leads.reduce((acc, lead) => {
    acc[lead.industry] = (acc[lead.industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedIndustries = Object.entries(industryStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6);

  const maxIndustryCount = Math.max(...(Object.values(industryStats) as number[]), 1);

  const handleSaveGoals = () => {
    onUpdateGoal(localGoal);
    onUpdateDate(localDate);
    setIsEditingGoals(false);
  };

  const stats = [
    { 
      label: 'Pipeline Value', 
      value: `${totalLeads}`, 
      icon: 'fa-briefcase', 
      trend: `${Math.round((totalLeads / searchGoal) * 100)}% of target`, 
      color: 'bg-[#2160fd]' 
    },
    { label: 'Intelligence', value: `${analyzedPercent}%`, icon: 'fa-brain-circuit', trend: 'Target: 80%', color: 'bg-[#7f56d9]' },
    { label: 'Avg Rating', value: avgRating.toFixed(1), icon: 'fa-star', trend: 'High Priority', color: 'bg-[#f79009]' },
    { label: 'Actionable', value: analyzedLeads, icon: 'fa-bolt-lightning', trend: 'CRM Ready', color: 'bg-[#12b76a]' },
  ];

  if (totalLeads === 0 && searchCount === 0) {
    return (
      <div className="bg-white border border-[#eaecf0] rounded-[48px] py-32 text-center shadow-sm">
        <div className="w-16 h-16 bg-[#f9fafb] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#eaecf0]">
          <i className="fas fa-chart-line text-[#667085] text-xl"></i>
        </div>
        <h2 className="text-xl font-bold text-[#101828]">Waiting for Pipeline Data</h2>
        <p className="text-[#667085] text-sm mt-2 max-w-sm mx-auto">Run a lead discovery search to see your target market distribution and intent metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* Mission Control HUD */}
      <div className="bg-[#0f172a] rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden group border border-[#1e293b]">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-110">
          <i className="fas fa-crosshairs text-[240px] text-blue-500"></i>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 mb-12">
            <div>
              <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.6em] mb-3 flex items-center gap-2">
                <i className="fas fa-satellite-dish animate-pulse"></i>
                Mission Control
              </h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Strategic Forecast
              </h3>
            </div>

            <div className="flex items-center gap-4">
              {/* Report Toggle */}
              <button 
                onClick={() => setShowReport(!showReport)}
                className={`flex items-center gap-3 px-6 py-3 rounded-[20px] border transition-all ${showReport ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
              >
                <i className={`fas ${showReport ? 'fa-file-contract' : 'fa-file-lines'}`}></i>
                <span className="text-[9px] font-black uppercase tracking-widest">{showReport ? 'Hide Report' : 'Detail Report'}</span>
              </button>

              {/* Goal Editor Widget */}
              {isEditingGoals ? (
                <div className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-[24px] border border-white/10 backdrop-blur-sm animate-in fade-in">
                  <div className="flex flex-col px-3">
                    <label className="text-[8px] font-black uppercase text-slate-400 mb-1">Target Volume</label>
                    <input 
                      type="number" 
                      value={localGoal} 
                      onChange={e => setLocalGoal(parseInt(e.target.value))}
                      className="bg-transparent border-b border-blue-500 w-24 text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col px-3 border-l border-white/10">
                    <label className="text-[8px] font-black uppercase text-slate-400 mb-1">Deadline</label>
                    <input 
                      type="date" 
                      value={localDate} 
                      onChange={e => setLocalDate(e.target.value)}
                      className="bg-transparent border-b border-blue-500 text-sm font-bold focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <button onClick={handleSaveGoals} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-500 transition-colors shadow-lg">
                    <i className="fas fa-check text-xs"></i>
                  </button>
                  <button onClick={() => setIsEditingGoals(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingGoals(true)}
                  className="group/btn flex items-center gap-4 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[20px] transition-all"
                >
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Objective</p>
                    <p className="text-lg font-black tracking-tight">{searchGoal} Leads <span className="text-slate-500 font-medium text-xs">by {new Date(targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover/btn:bg-blue-500 transition-colors">
                    <i className="fas fa-pen text-xs"></i>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Velocity & Progress Module */}
            <div className="bg-[#1e293b]/50 rounded-[32px] p-8 border border-white/5 backdrop-blur-sm relative overflow-hidden group/card">
               <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Acquisition Velocity</p>
                    <div className="flex items-baseline gap-2">
                       <h4 className="text-3xl font-black">{totalLeads}</h4>
                       <span className="text-xs font-bold text-slate-400">/ {searchGoal}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Status</p>
                    <p className={`text-xs font-black px-2 py-1 rounded-lg inline-block ${daysLeft < 7 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {daysLeft < 0 ? 'Overdue' : `${daysLeft} Days Left`}
                    </p>
                  </div>
               </div>
               
               <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                  <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${leadProgressPercent}%` }}></div>
               </div>
               <p className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                  <span>{leadProgressPercent}% Complete</span>
                  <span>{remainingLeads} Remaining</span>
               </p>
            </div>

            {/* 2. Pipeline Health Module */}
            <div className="bg-[#1e293b]/50 rounded-[32px] p-8 border border-white/5 backdrop-blur-sm relative overflow-hidden group/card">
               <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Pipeline Health</p>
                    <div className="flex items-baseline gap-2">
                       <h4 className="text-3xl font-black">{phiScore}</h4>
                       <span className="text-xs font-bold text-slate-400">/ 100</span>
                    </div>
                  </div>
                  <i className="fas fa-heart-pulse text-2xl text-emerald-500/50"></i>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Hot Leads</p>
                     <p className="text-lg font-black text-white">{hotLeads}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Qualified</p>
                     <p className="text-lg font-black text-white">{standardLeads + hotLeads}</p>
                  </div>
               </div>
            </div>

            {/* 3. Data Density Module */}
            <div className="bg-[#1e293b]/50 rounded-[32px] p-8 border border-white/5 backdrop-blur-sm relative overflow-hidden group/card">
               <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1">Data Density</p>
                    <div className="flex items-baseline gap-2">
                       <h4 className="text-3xl font-black">{dataDensity}%</h4>
                       <span className="text-xs font-bold text-slate-400">Richness</span>
                    </div>
                  </div>
                  <i className="fas fa-database text-2xl text-purple-500/50"></i>
               </div>

               <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Contactability</span>
                     <span>{leads.filter(l => l.email || l.phone).length} Units</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-500" style={{ width: `${(leads.filter(l => l.email || l.phone).length / Math.max(totalLeads, 1)) * 100}%` }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">
                     <span>Social Graph</span>
                     <span>{leads.filter(l => l.linkedin).length} Units</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                     <div className="h-full bg-pink-500" style={{ width: `${(leads.filter(l => l.linkedin).length / Math.max(totalLeads, 1)) * 100}%` }}></div>
                  </div>
               </div>
            </div>
          </div>

          {/* DETAILED STRATEGIC REPORT */}
          {showReport && (
            <div className="mt-8 pt-8 border-t border-white/10 animate-in fade-in slide-in-from-top-4">
               <h4 className="text-[11px] font-black text-white uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                  <i className="fas fa-clipboard-list text-blue-400"></i> Intelligence Breakdown
               </h4>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT: Projections */}
                  <div className="bg-slate-800/50 rounded-[32px] p-8 border border-white/5">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Efficiency & Projections</h5>
                     
                     <div className="space-y-6">
                        <div className="flex justify-between items-center">
                           <div>
                              <p className="text-white font-bold text-sm">Search Yield</p>
                              <p className="text-[10px] text-slate-500 font-medium">Avg leads per execution</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xl font-black text-blue-400">{leadsPerSearch.toFixed(1)}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">Leads/Search</p>
                           </div>
                        </div>

                        <div className="flex justify-between items-center">
                           <div>
                              <p className="text-white font-bold text-sm">Projected Completion</p>
                              <p className="text-[10px] text-slate-500 font-medium">Based on current velocity</p>
                           </div>
                           <div className="text-right">
                              <p className={`text-xl font-black ${isAtRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                                 {projectedFinishDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </p>
                              <p className={`text-[9px] font-bold uppercase ${isAtRisk ? 'text-rose-500' : 'text-emerald-500'}`}>
                                 {isAtRisk ? `${daysToComplete} days late` : 'On Track'}
                              </p>
                           </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                           <div>
                              <p className="text-white font-bold text-sm">Gap Closure Effort</p>
                              <p className="text-[10px] text-slate-500 font-medium">Estimated work to hit goal</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xl font-black text-white">{estimatedSearchesNeeded}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">Addtl. Searches</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* RIGHT: Tactical Recommendations */}
                  <div className="bg-slate-800/50 rounded-[32px] p-8 border border-white/5">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Tactical Adjustments</h5>
                     
                     <div className="space-y-3">
                        {isAtRisk && (
                           <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-4 items-start">
                              <i className="fas fa-triangle-exclamation text-rose-400 mt-1"></i>
                              <div>
                                 <p className="text-xs font-bold text-rose-300 uppercase tracking-wide mb-1">Velocity Warning</p>
                                 <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                                    Current pace is insufficient to meet the {new Date(targetDate).toLocaleDateString()} deadline. Increase daily search volume by 30%.
                                 </p>
                              </div>
                           </div>
                        )}

                        {leadsPerSearch < 5 && leadsPerSearch > 0 && (
                           <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 items-start">
                              <i className="fas fa-compress-arrows-alt text-amber-400 mt-1"></i>
                              <div>
                                 <p className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-1">Low Yield Detected</p>
                                 <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                                    Search queries are too narrow. Expand radius by 15km or add adjacent industry keywords to boost yield.
                                 </p>
                              </div>
                           </div>
                        )}

                        {analyzedPercent < 50 && (
                           <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-4 items-start">
                              <i className="fas fa-wand-magic-sparkles text-blue-400 mt-1"></i>
                              <div>
                                 <p className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-1">Enrichment Gap</p>
                                 <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                                    Only {analyzedPercent}% of leads are enriched. Run AI Deep Scan on {totalLeads - analyzedLeads} leads to unlock contact data.
                                 </p>
                              </div>
                           </div>
                        )}

                        {!isAtRisk && leadsPerSearch >= 5 && analyzedPercent >= 50 && (
                           <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-4 items-start">
                              <i className="fas fa-check-circle text-emerald-400 mt-1"></i>
                              <div>
                                 <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-1">Optimal Performance</p>
                                 <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                                    Strategy is performing well. Maintain current search cadence and focus on outreach conversion.
                                 </p>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Legacy Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[36px] border border-[#eaecf0] shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
                <i className={`fas ${stat.icon} text-base`}></i>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-4xl font-black text-[#101828] tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[48px] p-10 border border-[#eaecf0] shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.4em] flex items-center gap-3">
              <i className="fas fa-diagram-project text-[#2160fd]"></i>
              Industry Concentration
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {sortedIndustries.map(([name, count]) => (
              <div key={name} className="space-y-3">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                  <span className="text-[#344054] truncate max-w-[200px]">{name}</span>
                  <span className="text-[#2160fd]">{count}</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className="h-full bg-[#2160fd] rounded-full transition-all duration-1000"
                    style={{ width: `${((count as number) / maxIndustryCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[48px] p-10 text-[#101828] shadow-xl flex flex-col justify-center border border-[#eaecf0] relative overflow-hidden group/sentiment">
           <div className="absolute top-0 right-0 p-8 opacity-5">
             <i className="fas fa-face-smile-beam text-[120px]"></i>
           </div>
           
           <div className="text-center relative z-10">
             <div className="inline-flex items-center justify-center w-28 h-28 rounded-full border-[8px] border-blue-50 mb-6 bg-white shadow-xl group-hover/sentiment:rotate-12 transition-transform duration-700">
                <span className="text-4xl font-black text-[#2160fd]">{avgRating.toFixed(1)}</span>
             </div>
             <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-3 text-slate-500">Market Sentiment</h4>
             <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed font-bold">Aggregate quality score across discovered segments.</p>
           </div>
           
           <div className="mt-10 pt-10 border-t border-slate-50 space-y-6">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                 <span className="text-slate-400">High Intent</span>
                 <span className="text-blue-600">{leads.filter(l => (l.rating || 0) >= 4.5).length} Units</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                 <span className="text-slate-400">Local Reach</span>
                 <span className="text-emerald-600">{leads.filter(l => (l.reviews || 0) > 50).length} Units</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
