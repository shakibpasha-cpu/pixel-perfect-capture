
import React, { useState } from 'react';
import { gemini } from '../services/geminiService';
import { VerificationResult } from '../types';
import { ShieldCheck, ShieldAlert, Scan, Activity, Mail, Phone, Lock, User, Building2, MapPin, Globe, Server, CloudLightning, BadgeAlert, MailWarning } from 'lucide-react';

const DataVerificationView: React.FC = () => {
  const [input, setInput] = useState('');
  const [type, setType] = useState<'email' | 'phone'>('email');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsVerifying(true);
    setResult(null);
    try {
      const data = await gemini.verifyContactData(input, type);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-emerald-500';
    if (score < 70) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getRiskBg = (score: number) => {
    if (score < 30) return 'bg-emerald-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getConfidenceBadge = (confidence?: string) => {
    if (confidence === 'High') return 'bg-emerald-100 text-emerald-700';
    if (confidence === 'Medium') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Cinematic Header Block */}
      <div className="bg-[#101828] rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
          <ShieldCheck size={180} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[28px] flex items-center justify-center mb-8 shadow-inner ring-4 ring-white/5">
             <Lock className="text-emerald-400" size={32} />
          </div>
          <h2 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
            <Activity className="animate-pulse" size={14} />
            Data Truth Protocol
          </h2>
          <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-tight">
            Verification Intelligence
          </h3>
          <p className="text-slate-400 font-medium text-base leading-relaxed max-w-xl">
            Deploy AI-driven forensic analysis. Grab, verify, enrich, and score contact data with deep search intelligence and probability modeling.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner mb-8">
               <button 
                 onClick={() => setType('email')}
                 className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'email' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
               >
                 <Mail size={14} /> Email
               </button>
               <button 
                 onClick={() => setType('phone')}
                 className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'phone' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
               >
                 <Phone size={14} /> Phone
               </button>
             </div>

             <form onSubmit={handleVerify} className="space-y-4">
               <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2160fd] transition-colors">
                   {type === 'email' ? <Mail size={18} /> : <Phone size={18} />}
                 </div>
                 <input 
                   type={type === 'email' ? 'email' : 'tel'}
                   placeholder={type === 'email' ? "enter@email.com" : "+1 555 000 0000"}
                   className="w-full pl-14 pr-6 py-5 bg-[#f9fafb] border border-[#eaecf0] rounded-[24px] text-sm font-bold text-[#101828] outline-none focus:bg-white focus:border-[#2160fd] focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                 />
               </div>
               
               <button 
                 type="submit"
                 disabled={isVerifying || !input}
                 className={`w-full py-5 rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] text-white transition-all shadow-xl flex items-center justify-center gap-3 ${isVerifying || !input ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#101828] hover:bg-[#2160fd] hover:shadow-blue-500/30 active:scale-95'}`}
               >
                 {isVerifying ? (
                   <><Scan className="animate-spin" size={16} /> Scanning Node...</>
                 ) : (
                   <><ShieldCheck size={16} /> Verify & Enrich</>
                 )}
               </button>
             </form>
          </div>

          {result && (
             <div className={`p-8 rounded-[40px] border-2 text-center transition-all animate-in slide-in-from-top-4 ${result.riskLevel === 'Safe' ? 'bg-emerald-50 border-emerald-100' : result.riskLevel === 'High Risk' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-white shadow-md ${getRiskColor(result.score)}`}>
                   <span className="text-3xl font-black">{result.score}</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trust Score</p>
                <h3 className={`text-2xl font-black tracking-tight mb-2 ${getRiskColor(result.score)}`}>{result.riskLevel}</h3>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{result.recommendation}</p>
             </div>
          )}
        </div>

        {/* Results Display */}
        <div className="lg:col-span-8">
           {!result && !isVerifying && (
             <div className="h-full min-h-[400px] bg-white border border-dashed border-[#eaecf0] rounded-[48px] flex flex-col items-center justify-center text-slate-300">
               <Scan size={64} className="mb-6 opacity-20" />
               <p className="text-[11px] font-black uppercase tracking-widest">System Ready</p>
               <p className="text-sm font-medium opacity-60">Awaiting data input for forensic scan.</p>
             </div>
           )}

           {isVerifying && (
             <div className="h-full min-h-[400px] bg-white border border-[#eaecf0] rounded-[48px] flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-blue-50/30 animate-pulse"></div>
               <div className="w-24 h-24 border-4 border-blue-100 border-t-[#2160fd] rounded-full animate-spin mb-8 relative z-10"></div>
               <h4 className="text-xl font-black text-[#101828] relative z-10">Triangulating Data Points...</h4>
               <p className="text-sm font-bold text-slate-400 mt-2 relative z-10">Searching • Verifying • Enriching</p>
             </div>
           )}

           {result && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               {/* Primary Findings */}
               <div className="bg-white border border-[#eaecf0] rounded-[40px] p-10 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[11px] font-black text-[#101828] uppercase tracking-[0.4em] flex items-center gap-3">
                      <Activity size={16} className="text-[#2160fd]" /> Analysis Vector
                    </h4>
                    {result.enrichedData?.confidence && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getConfidenceBadge(result.enrichedData.confidence)}`}>
                        {result.enrichedData.confidence} Confidence
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</p>
                        <p className="text-xl font-black text-[#101828]">{result.classification}</p>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syntax Check</p>
                        <p className="text-xl font-black flex items-center gap-2">
                           {result.technicalDetails.syntaxValid ? (
                             <span className="text-emerald-600 flex items-center gap-2"><ShieldCheck size={20} /> Valid Format</span>
                           ) : (
                             <span className="text-rose-600 flex items-center gap-2"><ShieldAlert size={20} /> Invalid Format</span>
                           )}
                        </p>
                     </div>
                     
                     {/* New Enriched Fields */}
                     {result.enrichedData?.name && (
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Match</p>
                          <p className="text-xl font-black text-[#101828] flex items-center gap-2">
                            <User size={18} className="text-blue-500" />
                            {result.enrichedData.name}
                          </p>
                       </div>
                     )}
                     
                     {result.enrichedData?.business && (
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</p>
                          <p className="text-xl font-black text-[#101828] flex items-center gap-2">
                            <Building2 size={18} className="text-indigo-500" />
                            {result.enrichedData.business}
                          </p>
                       </div>
                     )}

                     {result.enrichedData?.location && (
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                          <p className="text-xl font-black text-[#101828] flex items-center gap-2">
                            <MapPin size={18} className="text-rose-500" />
                            {result.enrichedData.location}
                          </p>
                       </div>
                     )}

                     {result.enrichedData?.website && (
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</p>
                          <a href={result.enrichedData.website} target="_blank" rel="noopener noreferrer" className="text-xl font-black text-blue-600 hover:underline flex items-center gap-2">
                            <Globe size={18} />
                            {result.enrichedData.website.replace(/^https?:\/\//, '')}
                          </a>
                       </div>
                     )}
                  </div>
               </div>

               {/* Technical Deep Dive */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {result.type === 'email' ? (
                    <div className="bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                         <Server size={14} className="text-blue-500" /> Infrastructure Intelligence
                       </h5>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <CloudLightning size={14} className="text-indigo-500" />
                               <span className="text-xs font-bold text-slate-600">Domain Active</span>
                             </div>
                             <span className={`text-[10px] font-black px-2 py-1 rounded ${result.technicalDetails.domainValid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {result.technicalDetails.domainValid ? 'VERIFIED' : 'FAILED'}
                             </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <MailWarning size={14} className="text-amber-500" />
                               <span className="text-xs font-bold text-slate-600">MX Records</span>
                             </div>
                             <span className={`text-[10px] font-black px-2 py-1 rounded ${result.technicalDetails.mxFound ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {result.technicalDetails.mxFound ? 'FOUND' : 'MISSING'}
                             </span>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <ShieldCheck size={14} className="text-blue-500" />
                               <span className="text-xs font-bold text-slate-600">SMTP Status</span>
                             </div>
                             <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${result.technicalDetails.smtpStatus === 'valid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {result.technicalDetails.smtpStatus || 'UNKNOWN'}
                             </span>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <BadgeAlert size={14} className="text-rose-500" />
                               <span className="text-xs font-bold text-slate-600">Catch-All</span>
                             </div>
                             <span className={`text-[10px] font-black px-2 py-1 rounded ${result.technicalDetails.catchAll ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-600'}`}>
                                {result.technicalDetails.catchAll ? 'DETECTED' : 'NO'}
                             </span>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                         <Phone size={14} className="text-blue-500" /> Telephony Intelligence
                       </h5>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <Server size={14} className="text-indigo-500" />
                               <span className="text-xs font-bold text-slate-600">Carrier</span>
                             </div>
                             <span className="text-[10px] font-black px-2 py-1 rounded bg-blue-100 text-blue-600 uppercase">
                                {result.providerOrCarrier || 'UNKNOWN'}
                             </span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <Activity size={14} className="text-amber-500" />
                               <span className="text-xs font-bold text-slate-600">Line Type</span>
                             </div>
                             <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-200 text-slate-600 uppercase">
                                {result.technicalDetails.lineType || 'UNKNOWN'}
                             </span>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <Activity size={14} className="text-emerald-500" />
                               <span className="text-xs font-bold text-slate-600">WhatsApp</span>
                             </div>
                             <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${result.technicalDetails.hasWhatsApp ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                                {result.technicalDetails.hasWhatsApp ? 'ACTIVE' : 'INACTIVE/UNKNOWN'}
                             </span>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-2">
                               <MapPin size={14} className="text-rose-500" />
                               <span className="text-xs font-bold text-slate-600">Region</span>
                             </div>
                             <span className="text-[10px] font-black px-2 py-1 rounded bg-rose-100 text-rose-600 uppercase">
                                {result.location || 'UNKNOWN'}
                             </span>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Expert Reasoning</h5>
                     <div className="space-y-3">
                        {result.reasoning.map((reason, idx) => (
                          <div key={idx} className="flex gap-3 items-start">
                             <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${getRiskBg(result.score)}`}></div>
                             <p className="text-xs font-medium text-slate-600 leading-relaxed">{reason}</p>
                          </div>
                        ))}
                     </div>
                     {result.enrichedData?.source && (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Intelligence Source</p>
                           <p className="text-xs font-medium text-slate-500 truncate">{result.enrichedData.source}</p>
                        </div>
                     )}
                  </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DataVerificationView;
