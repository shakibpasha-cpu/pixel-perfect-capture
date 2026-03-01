
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import AuthView from './components/AuthView';
import Header from './components/Header';
import SearchSection, { SearchFilters } from './components/SearchSection';
import { LeadList } from './components/LeadList';
import AnalysisPanel from './components/AnalysisPanel';
import DashboardView from './components/DashboardView';
import ManagementHub from './components/ManagementHub';
import OutreachPipeline from './components/OutreachPipeline';
import AIQualificationView from './components/AIQualificationView';
import DataVerificationView from './components/DataVerificationView';
import ComparisonView from './components/ComparisonView';
import SuperAdminView from './components/SuperAdminView';
import ProfileView from './components/ProfileView';
import ImportModal from './components/ImportModal';
import { Lead, AnalysisResult, AnalysisType } from './types';
import { gemini } from './services/geminiService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

// DEFINE SUPER ADMIN EMAILS HERE
const SUPER_ADMIN_EMAILS = ['admin@companiesgenius.com', 'shakibpasha@gmail.com', 'demo@companiesgenius.com'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'leads' | 'dashboard' | 'hub' | 'outreach' | 'ai-qualification' | 'data-verification' | 'comparison' | 'super-admin' | 'profile'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [validationVerdicts, setValidationVerdicts] = useState<Record<string, string>>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [isSuspended, setIsSuspended] = useState(false);
  const isAnalysisRunningRef = useRef(false);
  
  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Goal State
  const [searchGoal, setSearchGoal] = useState(10);
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Search State
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [area, setArea] = useState('');
  const [radius, setRadius] = useState<number>(25);
  const [filters, setFilters] = useState<SearchFilters>({
    linkedin: 'any',
    twitterRequired: false,
    instagramRequired: false,
    youtubeRequired: false,
    facebookRequired: false,
    websiteRequired: false,
    phoneRequired: false,
    localOnly: false,
    independentOnly: false,
    physicalStorefront: false,
    entityType: 'any',
    employeeCountRange: 'any',
    fundingStage: 'any',
    leadCount: 10,
    intentSignal: '',
    targetRole: ''
  });

  useEffect(() => {
    // Restore session from storage first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Check suspension in background (fire-and-forget)
        checkSuspension(session.user);
      }
      setIsAuthLoading(false);
    }).catch(() => {
      setIsAuthLoading(false);
    });

    // Listen for subsequent auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          checkSuspension(session.user);
        } else {
          setUser((prev) => prev?.id === 'demo-user-123' ? prev : null);
        }
        setIsAuthLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSuspension = async (authUser: User) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('is_suspended')
        .eq('user_id', authUser.id)
        .single();

      if (roleData?.is_suspended) {
        setIsSuspended(true);
        await supabase.auth.signOut();
        setUser(null);
      } else {
        setIsSuspended(false);
      }
    } catch (e) {
      console.error("[Auth] Suspension check failed:", e);
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-user-123',
      email: 'demo@companiesgenius.com',
      user_metadata: { display_name: 'Demo Executive' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;
    
    setUser(demoUser);
    setIsSuspended(false);
  };

  const handleApiKeyError = useCallback(async (error: any) => {
    const errorMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    if (errorMessage.includes("Requested entity was not found.") || errorMessage.includes("API_KEY_INVALID")) {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        return true;
      }
    }
    return false;
  }, []);

  const getRateLimitErrorMessage = useCallback((error: any) => {
    const errorMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    const isRateLimited = error?.status === 429 || errorMessage.includes('"code":429') || errorMessage.includes('RESOURCE_EXHAUSTED');

    if (!isRateLimited) return null;

    return "Full Discovery is temporarily rate-limited by the AI provider. Please wait 30–60 seconds and try again.";
  }, []);

  const handleSearchLeads = async () => {
    setIsSearching(true);
    setSearchError(null);
    setAnalysisError(null);
    setSelectedLead(null);
    setActiveAnalysis(null);
    setLeads([]);
    setValidationVerdicts({});
    setCurrentView('leads');
    
    try {
      console.log("[Search] Starting lead search with query:", query, "location:", location, "country:", country);
      const results = await gemini.findLeads(query, location, country, area, radius, filters);
      console.log("[Search] Results received:", results.length);
      if (results.length === 0) {
        setSearchError("No results found. Try expanding your parameters.");
      } else {
        setLeads(results);
        setSearchCount(prev => prev + 1);
        results.slice(0, 5).forEach(async (lead) => {
          try {
            const verdict = await gemini.quickValidate(lead);
            setValidationVerdicts(prev => ({ ...prev, [lead.id]: verdict }));
          } catch (e) {
            handleApiKeyError(e);
          }
        });
      }
    } catch (error: any) {
      console.error("[Search] Lead search failed:", error);
      const handled = await handleApiKeyError(error);
      if (!handled) setSearchError(error?.message || "Internal API error. Check console for details.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleStatusChange = (leadId: string, newStatus: Lead['status']) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, leadStatus: newStatus } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status: newStatus, leadStatus: newStatus } : null);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(prev => (prev?.id === updatedLead.id ? updatedLead : prev));
  };

  const handleGenerateQuickSummary = async (lead: Lead) => {
    try {
      const summary = await gemini.generateQuickSummary(lead);
      handleUpdateLead({ ...lead, quickSummary: summary });
    } catch (error) {
      handleApiKeyError(error);
    }
  };

  const handleRunAnalysis = async (type: AnalysisType, targetLead?: Lead) => {
    if (isAnalysisRunningRef.current) return;

    const leadToAnalyze = targetLead || selectedLead;
    if (!leadToAnalyze) return;

    isAnalysisRunningRef.current = true;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      if (type === AnalysisType.QUALIFY) {
        const qualification = await gemini.qualifyLead(leadToAnalyze);
        const updatedLead: Lead = {
          ...leadToAnalyze,
          qualificationScore: qualification.score,
          qualificationVerdict: qualification.verdict,
          qualificationReasoning: qualification.reasoning,
          qualifiedAt: new Date().toISOString()
        };
        handleUpdateLead(updatedLead);
      } else if (type === AnalysisType.SEARCH) {
        handleStatusChange(leadToAnalyze.id, 'enriching');
        const result = await gemini.enrichLead(leadToAnalyze);

        if (leadToAnalyze.id === selectedLead?.id) {
          setActiveAnalysis(result);
        }

        let finalLead: Lead;
        if (result.enrichedData) {
          finalLead = {
            ...leadToAnalyze,
            ...result.enrichedData,
            status: 'analyzed',
            leadStatus: 'analyzed'
          };
        } else {
          finalLead = { ...leadToAnalyze, status: 'analyzed', leadStatus: 'analyzed' };
        }

        handleUpdateLead(finalLead);

        // AUTO-GENERATE SUMMARY AFTER ENRICHMENT
        if (finalLead.status === 'analyzed' && !finalLead.quickSummary) {
          handleGenerateQuickSummary(finalLead);
        }
      }
    } catch (error) {
      const rateLimitMessage = getRateLimitErrorMessage(error);
      if (rateLimitMessage) {
        setAnalysisError(rateLimitMessage);
      }

      const handled = await handleApiKeyError(error);
      if (!handled) {
        console.error("Analysis failed:", error);
        if (type === AnalysisType.SEARCH) handleStatusChange(leadToAnalyze.id, 'new');
      }
    } finally {
      isAnalysisRunningRef.current = false;
      setIsAnalyzing(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setActiveAnalysis(null);
  };

  const handlePushToQualification = (lead: Lead) => {
    setSelectedLead(null);
    setCurrentView('ai-qualification');
  };

  const handleImportLeads = (newLeads: Lead[]) => {
    setLeads(prev => [...newLeads, ...prev]);
    setCurrentView('leads');
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ["Name", "Industry", "Location", "Rating", "Qualification Score", "Verdict", "Category"];
    const csvRows = leads.map(l => [
      l.name, 
      l.industry, 
      l.location, 
      l.rating, 
      l.qualificationScore || 'N/A', 
      l.qualificationVerdict || 'Unqualified',
      l.qualificationCategory || 'N/A'
    ].join(','));
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_qualified_${Date.now()}.csv`;
    link.click();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#fcfcfd] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-[#fcfcfd] flex items-center justify-center p-6">
        <div className="bg-white border border-rose-200 rounded-[48px] p-12 max-w-md w-full text-center shadow-2xl">
           <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <i className="fas fa-ban text-3xl"></i>
           </div>
           <h2 className="text-2xl font-black text-[#101828] mb-4">Access Suspended</h2>
           <p className="text-slate-500 font-medium mb-8">Your account has been suspended by the administrator. Please contact support.</p>
           <button onClick={() => window.location.reload()} className="text-blue-600 font-bold hover:underline">Return to Login</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView onDemoLogin={handleDemoLogin} />;
  }

  const isSuperAdmin = user.email ? SUPER_ADMIN_EMAILS.includes(user.email) : false;

  const searchStateProps = {
    query, setQuery,
    location, setLocation,
    country, setCountry,
    area, setArea,
    radius, setRadius,
    filters, setFilters
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col font-['Inter'] antialiased">
      <Header 
        onSelectKey={() => window.aistudio?.openSelectKey()} 
        currentView={currentView}
        onNavigate={setCurrentView}
        onExportCSV={handleExportCSV}
        onImport={() => setIsImportModalOpen(true)}
        leads={leads}
        isSuperAdmin={isSuperAdmin}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'leads' && (
          <SearchSection 
            onSearch={handleSearchLeads} 
            isLoading={isSearching} 
            mode="sidebar"
            {...searchStateProps}
          />
        )}

        <main className={`flex-1 overflow-y-auto bg-[#fcfcfd] flex flex-col p-8 space-y-10 ${currentView !== 'leads' ? 'max-w-[1600px] mx-auto w-full' : ''}`}>
          <div className="max-w-[1400px] mx-auto w-full space-y-10">
            {currentView === 'leads' && (
               <SearchSection 
                 onSearch={handleSearchLeads} 
                 isLoading={isSearching} 
                 mode="matrix"
                 {...searchStateProps}
               />
            )}

            {currentView === 'dashboard' && (
              <DashboardView 
                leads={leads} 
                searchCount={searchCount} 
                searchGoal={searchGoal} 
                targetDate={targetDate}
                onUpdateGoal={(val) => setSearchGoal(val)}
                onUpdateDate={(val) => setTargetDate(val)}
              />
            )}

            {currentView === 'hub' && (
              <ManagementHub userId={user.id} />
            )}

            {currentView === 'outreach' && (
              <OutreachPipeline 
                leads={leads} 
                onSelectLead={handleSelectLead} 
                onStatusChange={handleStatusChange} 
                onUpdateLead={handleUpdateLead}
              />
            )}

            {currentView === 'ai-qualification' && (
              <AIQualificationView 
                leads={leads} 
                onLeadsUpdate={setLeads}
                onNavigateToOutreach={() => setCurrentView('outreach')}
                onExport={handleExportCSV}
              />
            )}

            {currentView === 'data-verification' && (
              <DataVerificationView />
            )}

            {currentView === 'comparison' && (
              <ComparisonView leads={leads} />
            )}

            {currentView === 'super-admin' && isSuperAdmin && (
              <SuperAdminView />
            )}

            {currentView === 'profile' && (
              <ProfileView />
            )}

            {currentView === 'leads' && (
              <div className="space-y-12">
                {isSearching ? (
                  <div className="bg-white border border-[#eaecf0] rounded-[48px] p-48 flex flex-col items-center justify-center gap-6">
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-[11px] font-black text-[#101828] uppercase tracking-[0.4em]">Mining Territory Signals...</p>
                  </div>
                ) : (
                  <LeadList 
                    leads={leads} 
                    onSelect={handleSelectLead} 
                    onStatusChange={handleStatusChange}
                    onEnrichLead={(l) => handleRunAnalysis(AnalysisType.SEARCH, l)}
                    selectedLeadId={selectedLead?.id} 
                    verdicts={validationVerdicts}
                    onGenerateSummary={handleGenerateQuickSummary}
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedLead && (
        <>
          <div className="fixed inset-0 bg-[#101828]/40 backdrop-blur-md z-[140]" onClick={() => setSelectedLead(null)}></div>
          <AnalysisPanel 
            lead={selectedLead}
            analysis={activeAnalysis}
            isLoading={isAnalyzing}
            onRunAnalysis={(type) => handleRunAnalysis(type)}
            onUpdateLead={handleUpdateLead}
            onClose={() => setSelectedLead(null)}
            onPushToQualification={handlePushToQualification}
          />
        </>
      )}

      {/* IMPORT MODAL */}
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportLeads}
      />
    </div>
  );
};

export default App;
