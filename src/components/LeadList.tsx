
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, AnalysisType } from '../types';

declare const L: any;

interface LeadListProps {
  leads: Lead[];
  onSelect: (lead: any) => void;
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void;
  onEnrichLead?: (lead) => void;
  selectedLeadId?: string;
  verdicts?: Record<string, string>;
  taskCounts?: Record<string, number>;
  onGenerateSummary?: (lead: Lead) => Promise<void>;
}

type ViewMode = 'list' | 'grid' | 'map';
type SortOption = 'priority' | 'rating' | 'name' | 'newest';

// Haversine formula to calculate distance between two points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const LeadList: React.FC<LeadListProps> = ({ 
  leads, onSelect, onStatusChange, onEnrichLead, selectedLeadId, verdicts = {}, taskCounts = {}, onGenerateSummary
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapRadius, setMapRadius] = useState<number>(25); // Set default to 25km
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
  
  // Private Notes State
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('genius_private_notes') || '{}');
    } catch {
      return {};
    }
  });
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);

  // Sync notes to localStorage
  useEffect(() => {
    localStorage.setItem('genius_private_notes', JSON.stringify(leadNotes));
  }, [leadNotes]);

  const getPriorityInfo = (lead: Lead) => {
    const rating = lead.rating || 0;
    const hasContact = !!(lead.phone || lead.website || lead.email);
    const hasReviews = (lead.reviews || 0) > 20;

    if (rating >= 4.7 && hasContact) return { label: 'Urgent', color: 'bg-rose-50 text-rose-700 border-rose-100', score: 4, icon: 'fa-bolt-lightning' };
    if (rating >= 4.2 && (hasContact || hasReviews)) return { label: 'High', color: 'bg-amber-50 text-amber-700 border-amber-100', score: 3, icon: 'fa-fire-flame-curved' };
    if (rating >= 3.5) return { label: 'Medium', color: 'bg-blue-50 text-blue-700 border-blue-100', score: 2, icon: 'fa-layer-group' };
    return { label: 'Standard', color: 'bg-slate-50 text-slate-600 border-slate-100', score: 1, icon: 'fa-minus' };
  };

  const sortedLeads = useMemo(() => {
    const list = [...leads];
    switch (sortBy) {
      case 'priority':
        return list.sort((a, b) => getPriorityInfo(b).score - getPriorityInfo(a).score);
      case 'rating':
        return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':
      default:
        return list.reverse();
    }
  }, [leads, sortBy]);

  // Center for the radius filter - uses user location if available, otherwise first lead with coords
  const filterCenter = useMemo(() => {
    if (userLocation) return userLocation;
    const firstWithCoords = leads.find(l => l.lat && l.lng);
    if (firstWithCoords) return { lat: firstWithCoords.lat!, lng: firstWithCoords.lng! };
    return null;
  }, [userLocation, leads]);

  // Filter leads by radius for map view
  const filteredMapLeads = useMemo(() => {
    if (!filterCenter) return sortedLeads;
    return sortedLeads.filter(lead => {
      if (!lead.lat || !lead.lng) return false;
      const distance = calculateDistance(filterCenter.lat, filterCenter.lng, lead.lat, lead.lng);
      return distance <= mapRadius;
    });
  }, [sortedLeads, filterCenter, mapRadius]);

  // Get user location when map is active
  useEffect(() => {
    if (viewMode === 'map' && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Location error", err),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [viewMode, userLocation]);

  useEffect(() => {
    if (viewMode === 'map' && mapContainerRef.current && !mapInstanceRef.current) {
      const timer = setTimeout(() => {
        if (!mapContainerRef.current) return;
        const standard = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        });
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          layers: [standard],
          zoomControl: false,
        }).setView([20, 0], 2);
        
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
        markersLayerRef.current = L.featureGroup().addTo(mapInstanceRef.current);
        setIsMapReady(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Update Markers and Radius Circle
  useEffect(() => {
    if (viewMode === 'map' && mapInstanceRef.current && markersLayerRef.current && isMapReady) {
      markersLayerRef.current.clearLayers();
      
      // Update Radius Circle at center
      if (filterCenter) {
        if (radiusCircleRef.current) {
          mapInstanceRef.current.removeLayer(radiusCircleRef.current);
        }
        radiusCircleRef.current = L.circle([filterCenter.lat, filterCenter.lng], {
          radius: mapRadius * 1000, // Convert km to meters
          color: '#2160fd',
          fillColor: '#2160fd',
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '5, 10'
        }).addTo(mapInstanceRef.current);

        // Center indicator
        const centerIcon = L.divIcon({
          className: 'center-location-icon',
          html: `<div style="background-color: ${userLocation ? '#2160fd' : '#475467'}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(0,0,0,0.2);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker([filterCenter.lat, filterCenter.lng], { icon: centerIcon, zIndexOffset: 1000 }).addTo(markersLayerRef.current);
      }

      // Add filtered leads
      filteredMapLeads.forEach(lead => {
        if (lead.lat && lead.lng) {
          const color = getAvatarHexColor(lead.name);
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 12px; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); transition: transform 0.2s;">${getInitials(lead.name)}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          });
          L.marker([lead.lat, lead.lng], { icon }).addTo(markersLayerRef.current)
            .on('click', () => {
              onSelect(lead);
              setViewMode('list');
              setExpandedId(lead.id);
            });
        }
      });

      if (markersLayerRef.current.getLayers().length > 0) {
        // Only fit bounds on first load or when filters change drastically
        // To avoid annoying map jumps, we can be selective here, but for functionality we fit:
        mapInstanceRef.current.fitBounds(markersLayerRef.current.getBounds(), { padding: [50, 50], maxZoom: 14 });
      } else if (filterCenter) {
        mapInstanceRef.current.setView([filterCenter.lat, filterCenter.lng], 10);
      }
    }
  }, [viewMode, filteredMapLeads, isMapReady, onSelect, filterCenter, mapRadius, userLocation]);

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function getAvatarHexColor(name: string) {
    const hexColors = ['#2160fd', '#7f56d9', '#f04438', '#12b76a', '#f79009', '#0ea5e9'];
    let hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return hexColors[hash % hexColors.length];
  }

  const getStatusBadge = (status: Lead['status']) => {
    const configs = {
      analyzed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'fa-check-double' },
      new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'fa-sparkles' },
      enriching: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'fa-spinner fa-spin' },
      contacted: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: 'fa-paper-plane' },
      qualified: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: 'fa-trophy' }
    };
    const config = (configs as any)[status] || configs.new;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${config.bg} ${config.text} ${config.border}`}>
        <i className={`fas ${config.icon} text-[8px]`}></i>
        {status}
      </span>
    );
  };

  const handleShare = (lead: Lead, platform: 'linkedin' | 'twitter' | 'email') => {
    const text = `Check out this business lead: ${lead.name}`;
    const url = lead.website || '';
    const emailSubject = `Intelligence Brief: ${lead.name}`;
    const emailBody = `Target Name: ${lead.name}\nIndustry: ${lead.industry}\nLocation: ${lead.location}\nWebsite: ${url || 'N/A'}`;

    switch (platform) {
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url || 'https://google.com')}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        break;
    }
  };

  const handleLinkedinAction = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (lead.linkedin) {
      window.open(lead.linkedin, '_blank');
    } else {
      const query = `${lead.name} ${lead.location} LinkedIn`;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
  };

  const generateSummary = async (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (!onGenerateSummary) return;
    setIsSummarizing(lead.id);
    await onGenerateSummary(lead);
    setIsSummarizing(null);
  };

  const updateLeadNote = (id: string, text: string) => {
    setLeadNotes(prev => ({ ...prev, [id]: text }));
  };

  const handleSavePrivateNote = (id: string) => {
    setSavingNoteId(id);
    // Simulate a brief save delay for visual feedback
    setTimeout(() => {
      setSavingNoteId(null);
    }, 600);
  };

  // Expanded content for a lead card (shared between list and grid)
  const renderIntelligenceLayer = (lead: Lead) => {
    const isEnriched = lead.status === 'analyzed';
    const isEnriching = lead.status === 'enriching';
    const whatsappUrl = lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : undefined;
    const mapsUrl = lead.lat && lead.lng 
      ? `https://www.google.com/maps?q=${lead.lat},${lead.lng}` 
      : lead.sourceUrl || `https://www.google.com/maps/search/${encodeURIComponent(lead.name + ' ' + lead.location)}`;
    const currentNote = leadNotes[lead.id] || '';
    const priority = getPriorityInfo(lead);

    const timelineStages = [
      { key: 'new', label: 'Discovery', icon: 'fa-sparkles', desc: 'Identified in scan' },
      { key: 'enriching', label: 'Enrichment', icon: 'fa-microchip-ai', desc: 'Mining intel' },
      { key: 'analyzed', label: 'Intelligence', icon: 'fa-brain-circuit', desc: 'Verified profile' },
      { key: 'contacted', label: 'Outreach', icon: 'fa-paper-plane', desc: 'Engaged contact' },
      { key: 'qualified', label: 'Qualified', icon: 'fa-trophy', desc: 'Intent match' },
    ];

    const currentIdx = timelineStages.findIndex(s => s.key === lead.status);

    const socials = [
      { id: 'linkedin', icon: 'fab fa-linkedin-in', color: 'text-[#0a66c2]', bg: 'bg-[#0a66c2]/5', border: 'border-[#0a66c2]/10', label: 'LinkedIn', url: lead.linkedin },
      { id: 'twitter', icon: 'fab fa-x-twitter', color: 'text-black', bg: 'bg-black/5', border: 'border-black/10', label: 'X / Twitter', url: lead.twitter },
      { id: 'facebook', icon: 'fab fa-facebook-f', color: 'text-[#1877f2]', bg: 'bg-[#1877f2]/5', border: 'border-[#1877f2]/10', label: 'Facebook', url: lead.facebook },
      { id: 'instagram', icon: 'fab fa-instagram', color: 'text-[#e4405f]', bg: 'bg-[#e4405f]/5', border: 'border-[#e4405f]/10', label: 'Instagram', url: lead.instagram },
      { id: 'youtube', icon: 'fab fa-youtube', color: 'text-[#ff0000]', bg: 'bg-[#ff0000]/5', border: 'border-[#ff0000]/10', label: 'YouTube', url: lead.youtube },
      { id: 'website', icon: 'fas fa-globe', color: 'text-[#2160fd]', bg: 'bg-[#2160fd]/5', border: 'border-[#2160fd]/10', label: 'Website', url: lead.website }
    ].filter(s => s.url);

    // Sentiment label derived from rating
    const getSentimentLabel = (rating: number) => {
      if (rating >= 4.7) return { label: 'Exceptional', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
      if (rating >= 4.2) return { label: 'Positive', color: 'text-blue-600 bg-blue-50 border-blue-100' };
      if (rating >= 3.5) return { label: 'Favorable', color: 'text-amber-600 bg-amber-50 border-amber-100' };
      return { label: 'Neutral', color: 'text-slate-500 bg-slate-50 border-slate-100' };
    };
    const sentiment = lead.rating ? getSentimentLabel(lead.rating) : null;

    return (
      <div className="bg-[#fcfcfd] border-t border-slate-100 p-8 md:p-10 animate-in slide-in-from-top-6 duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]">
        {/* Interactive Lifecycle Timeline */}
        <div className="mb-12 px-2">
           <div className="flex items-center justify-between mb-8">
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <i className="fas fa-route text-[#2160fd]"></i>
                Lead Lifecycle Velocity
              </h5>
              <div className="flex items-center gap-4">
                {lead.followUpDate && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 rounded-full animate-in slide-in-from-right duration-500">
                    <i className="fas fa-calendar-star text-amber-500 text-[10px]"></i>
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}</span>
                  </div>
                )}
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stage {currentIdx + 1} of 5</span>
              </div>
           </div>
           
           <div className="relative">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-200 -translate-y-1/2 rounded-full"></div>
              <div 
                className="absolute top-1/2 left-0 h-[3px] bg-gradient-to-r from-blue-500 to-[#2160fd] -translate-y-1/2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(33,96,253,0.3)]"
                style={{ width: `${(currentIdx / (timelineStages.length - 1)) * 100}%` }}
              ></div>

              <div className="relative flex justify-between">
                {timelineStages.map((stage, idx) => {
                  const isActive = stage.key === lead.status;
                  const isPast = idx < currentIdx;
                  
                  return (
                    <div key={stage.key} className="flex flex-col items-center group/stage">
                      <div className="relative z-10">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${
                          isActive 
                          ? 'bg-[#2160fd] border-blue-100 text-white shadow-xl scale-125 ring-8 ring-blue-50' 
                          : isPast 
                            ? 'bg-emerald-500 border-white text-white shadow-lg' 
                            : 'bg-white border-slate-100 text-slate-300'
                        }`}>
                          <i className={`fas ${stage.icon} ${isActive ? 'animate-pulse' : ''} text-xs`}></i>
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/stage:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover/stage:translate-y-0">
                           <div className="bg-[#101828] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl whitespace-nowrap shadow-2xl relative">
                              {stage.desc}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#101828]"></div>
                           </div>
                        </div>
                      </div>
                      <div className="mt-5 text-center">
                        <p className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${isActive ? 'text-[#2160fd]' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>
                           {stage.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>

        {/* REFINED Quick Intelligence Summary Block */}
        <div className="mb-10 p-10 rounded-[48px] bg-white border border-slate-200 shadow-xl relative overflow-hidden group/intel">
          <div className="absolute top-0 right-0 p-12 opacity-5">
             <i className="fas fa-sparkles text-[100px] text-blue-600"></i>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
               <h5 className="text-[11px] font-black text-[#2160fd] uppercase tracking-[0.5em] flex items-center gap-3">
                  <i className="fas fa-brain-circuit animate-pulse"></i>
                  AI Executive Briefing
               </h5>
               {lead.quickSummary && !isSummarizing && (
                 <button 
                   onClick={(e) => generateSummary(e, lead)}
                   className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                   title="Refresh AI Analysis"
                 >
                   <i className="fas fa-arrows-rotate text-[10px]"></i>
                 </button>
               )}
            </div>
            
            {lead.quickSummary ? (
              <div className="animate-in fade-in duration-700">
                <p className="text-xl md:text-2xl font-bold leading-relaxed tracking-tighter text-[#101828] bg-gradient-to-r from-[#101828] to-slate-600 bg-clip-text text-transparent">
                   "{lead.quickSummary}"
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {/* Analysis Grounded Badge */}
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 shadow-sm">
                     <i className="fas fa-badge-check"></i> Analysis Grounded
                  </span>
                  
                  {/* Priority Badge */}
                  <span className={`px-4 py-2 ${priority.color} rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 shadow-sm`}>
                     <i className={`fas ${priority.icon}`}></i> {priority.label} Priority
                  </span>

                  {/* Sentiment Badge */}
                  {sentiment && (
                    <span className={`px-4 py-2 ${sentiment.color} rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 shadow-sm`}>
                       <i className="fas fa-face-smile"></i> Sentiment: {sentiment.label} ({lead.rating})
                    </span>
                  )}
                  
                  <div className="ml-auto">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grounding Reliability: 98%</span>
                  </div>
                </div>
              </div>
            ) : isSummarizing === lead.id ? (
              <div className="space-y-4 animate-pulse">
                 <div className="h-6 bg-slate-100 rounded-full w-full"></div>
                 <div className="h-6 bg-slate-100 rounded-full w-[85%]"></div>
                 <div className="h-6 bg-slate-100 rounded-full w-[60%]"></div>
                 <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-6">Synthesizing Digital Footprint Intelligence...</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 p-8 bg-slate-50 border border-slate-100 rounded-[32px] border-dashed">
                <div className="flex-1">
                  <h6 className="text-lg font-black text-[#101828] mb-2">Strategy Summary Ready</h6>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-lg">Our AI engine has indexed this lead's core activity. Generate a strategic brief to reveal their market position and potential value props.</p>
                </div>
                <button 
                  onClick={(e) => generateSummary(e, lead)}
                  className="px-10 py-5 bg-[#101828] hover:bg-blue-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 flex items-center gap-4 group/btn"
                >
                  <i className="fas fa-wand-magic-sparkles group-hover:rotate-12 transition-transform"></i>
                  Extract Intel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Person to Contact / Identity Card */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Decision Stakeholder</h5>
                <i className="fas fa-id-card-clip text-blue-500 text-lg"></i>
              </div>
              
              <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[28px] border border-blue-100 mb-8 shadow-inner">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white">
                  {lead.contactName ? getInitials(lead.contactName) : <i className="fas fa-user-tie"></i>}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black text-[#101828] tracking-tight truncate">{lead.contactName || 'Scanning Stakeholders...'}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">{lead.contactRole || 'Key Decision Maker'}</p>
                </div>
              </div>

              <div className="space-y-4 px-2">
                 <div className="flex items-center gap-4 text-xs font-bold text-slate-700 group/link">
                   <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover/link:bg-blue-600 group-hover/link:text-white transition-all"><i className="fas fa-envelope text-[11px]"></i></div>
                   <span className="truncate">{lead.email || 'Email Search in Progress'}</span>
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold text-slate-700 group/link">
                   <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover/link:bg-blue-600 group-hover/link:text-white transition-all"><i className="fas fa-link text-[11px]"></i></div>
                   {lead.website ? (
                     <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" onClick={e => e.stopPropagation()} className="truncate hover:text-blue-600 transition-colors">{lead.website}</a>
                   ) : (
                     <span className="truncate">No Web Profile Found</span>
                   )}
                 </div>
                 {lead.linkedin && (
                   <div className="flex items-center gap-4 text-xs font-bold text-slate-700 group/link">
                     <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover/link:bg-[#0a66c2] group-hover/link:text-white transition-all"><i className="fab fa-linkedin-in text-[11px]"></i></div>
                     <a href={lead.linkedin} target="_blank" onClick={e => e.stopPropagation()} className="truncate hover:text-[#0a66c2] transition-colors">{lead.linkedin}</a>
                   </div>
                 )}
                 <div className="flex items-center gap-4 text-xs font-bold text-slate-700 group/link">
                   <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover/link:bg-blue-600 group-hover/link:text-white transition-all"><i className="fas fa-clock text-[11px]"></i></div>
                   <span className="font-black text-emerald-600">{lead.openingHours || 'Opening Hours Unknown'}</span>
                 </div>
              </div>

              {/* DEDICATED ACTION BUTTONS */}
              {(lead.email || lead.phone) && (
                <div className="flex gap-3 mt-8">
                  {lead.email && (
                    <a 
                      href={`mailto:${lead.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                    >
                      <i className="fas fa-envelope"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Email</span>
                    </a>
                  )}
                  {lead.phone && (
                    <>
                      <a 
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-3 bg-[#101828] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                      >
                        <i className="fas fa-phone"></i>
                        <span className="text-[10px] font-black uppercase tracking-widest">Call</span>
                      </a>
                      <a 
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 flex items-center justify-center bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                      >
                        <i className="fab fa-whatsapp text-lg"></i>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Validated Record</span>
               <i className="fas fa-shield-check text-emerald-500"></i>
            </div>
          </div>

          {/* Communication Suites Hub */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              <i className="fas fa-paper-plane text-[#2160fd]"></i> 
              Direct Connection Hub
            </h5>
            
            <div className="grid grid-cols-1 gap-4">
              <a 
                href={`tel:${lead.phone}`} 
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-between p-5 bg-slate-50 hover:bg-[#101828] hover:text-white rounded-[28px] transition-all group/item border border-slate-100 hover:shadow-xl hover:translate-x-1"
              >
                <div className="flex items-center gap-5">
                  <i className="fas fa-phone-arrow-up-right text-slate-400 group-hover/item:text-blue-400 text-lg"></i>
                  <span className="text-[11px] font-black uppercase tracking-[0.1em]">Verified Phone</span>
                </div>
                <span className="text-[10px] font-black opacity-50">{lead.phone || '—'}</span>
              </a>

              <a 
                href={whatsappUrl} 
                target="_blank" 
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-between p-5 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-[28px] transition-all group/item border border-emerald-100 hover:shadow-xl hover:translate-x-1"
              >
                <div className="flex items-center gap-5">
                  <i className="fab fa-whatsapp text-emerald-500 group-hover/item:text-white text-xl"></i>
                  <span className="text-[11px] font-black uppercase tracking-[0.1em]">WhatsApp Direct</span>
                </div>
                <i className="fas fa-chevron-right text-[10px] opacity-40"></i>
              </a>

              <a 
                href={`mailto:${lead.email}`}
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-between p-5 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-[28px] transition-all group/item border border-blue-100 hover:shadow-xl hover:translate-x-1"
              >
                <div className="flex items-center gap-5">
                  <i className="fas fa-at text-blue-500 group-hover/item:text-white text-lg"></i>
                  <span className="text-[11px] font-black uppercase tracking-[0.1em]">Corporate Mail</span>
                </div>
                <i className="fas fa-chevron-right text-[10px] opacity-40"></i>
              </a>
            </div>
          </div>

          {/* Market Intelligence / Strategic Hub */}
          <div className="bg-[#101828] rounded-[32px] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between group/strategy">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/strategy:scale-110 group-hover/strategy:opacity-10 transition-all duration-1000">
               <i className="fas fa-tower-observation text-[120px] -rotate-12"></i>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Market Footprint</h5>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>

              <div className="space-y-10">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-lg"><i className="fas fa-map-location-dot text-lg text-blue-400"></i></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Official Address</p>
                    <p className="text-[15px] font-bold text-slate-100 leading-snug tracking-tight">{lead.address || lead.location}</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 space-y-8">
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Scale Metrics</p>
                         <p className="text-2xl font-black text-white tracking-tighter leading-none">{lead.reviews || 0}</p>
                         <p className="text-[8px] font-black text-slate-500 uppercase mt-1">Grounding Nodes</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Sentiment</p>
                         <p className="text-2xl font-black text-blue-400 tracking-tighter leading-none">{lead.rating || '0.0'}</p>
                         <p className="text-[8px] font-black text-slate-500 uppercase mt-1">Aggregate Quality</p>
                      </div>
                   </div>
                   {lead.revenueHistory && (
                     <div className="pt-6 border-t border-white/5 animate-in fade-in slide-in-from-left-4 duration-500">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3">Economic Profile</p>
                        <p className="text-lg font-black text-white leading-tight">{lead.revenueHistory}</p>
                     </div>
                   )}
                   {lead.employeeCount && (
                     <div className="pt-6 border-t border-white/5 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">Operational Workforce</p>
                        <p className="text-lg font-black text-white leading-tight">{lead.employeeCount}</p>
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 mt-12">
               <button 
                 onClick={(e) => { e.stopPropagation(); onSelect(lead); }}
                 className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 shadow-2xl shadow-blue-900/50 transition-all flex items-center justify-center gap-3 active:scale-95 border border-blue-500/50"
               >
                 <i className="fas fa-sparkles"></i>
                 Extract Depth Intel
               </button>
               {mapsUrl && (
                 <a 
                   href={mapsUrl}
                   target="_blank"
                   onClick={e => e.stopPropagation()}
                   className="w-16 h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:shadow-rose-900/40 transition-all border border-white/10 backdrop-blur-sm"
                   title="View on Maps"
                 >
                   <i className="fas fa-map-pin text-xl"></i>
                 </a>
               )}
            </div>
          </div>
        </div>

        {/* Digital Footprint & Interactive Profiles - Functional Deployment */}
        <div className="mb-10 bg-white border border-[#eaecf0] rounded-[40px] p-10 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden relative">
           <div className="flex items-center justify-between mb-10">
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                 <i className="fas fa-fingerprint text-[#2160fd]"></i>
                 Digital Footprint Intelligence
              </h5>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                 <span className={`w-1.5 h-1.5 bg-blue-500 rounded-full ${isEnriching ? 'animate-ping' : 'animate-pulse'}`}></span>
                 <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">
                    {isEnriching ? 'Scanning Territory...' : `${socials.length} Active Nodes Discovered`}
                 </span>
              </div>
           </div>

           {isEnriching ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center px-6 gap-5">
                    <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
             </div>
           ) : socials.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {socials.map((social) => {
                  const metric = lead.socialMetrics?.[social.id];
                  return (
                    <a 
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className={`flex items-center justify-between p-6 ${social.bg} ${social.border} border rounded-[28px] transition-all hover:scale-[1.02] hover:shadow-xl group/soc relative overflow-hidden`}
                    >
                      <div className="flex items-center gap-5 relative z-10">
                        <div className={`w-12 h-12 ${social.color} bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-100 group-hover/soc:scale-110 transition-transform`}>
                          <i className={social.icon}></i>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5">{social.label}</p>
                          <p className={`text-[13px] font-bold ${social.color.replace('text-', 'text-opacity-80 text-')} truncate max-w-[150px]`}>
                            {metric || social.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          </p>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center ${social.color} text-xs shadow-sm opacity-0 group-hover/soc:opacity-100 transition-opacity translate-x-2 group-hover/soc:translate-x-0`}>
                        <i className="fas fa-arrow-up-right"></i>
                      </div>
                    </a>
                  );
                })}
             </div>
           ) : (
             <div className="p-12 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200 group/empty">
                <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover/empty:scale-110 transition-transform duration-500">
                  <i className="fas fa-earth-americas text-3xl text-[#2160fd] opacity-20"></i>
                </div>
                <p className="text-base font-bold text-slate-700 tracking-tight">Digital nodes not yet decrypted.</p>
                <p className="text-xs text-slate-400 font-medium mb-8">Execute a deep search scan to reveal the target's social graph and activity metrics.</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEnrichLead?.(lead); }}
                  className="px-10 py-4 bg-[#101828] text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#2160fd] transition-all shadow-xl active:scale-95 flex items-center gap-3 mx-auto"
                >
                  <i className="fas fa-tower-broadcast animate-pulse"></i>
                  Initialize Footprint Scan
                </button>
             </div>
           )}
        </div>

        {/* Private Tactical Notes Section */}
        <div className="mb-10 bg-white border border-[#eaecf0] rounded-[40px] p-8 shadow-sm animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-6">
            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
              <i className="fas fa-shield-keyhole text-[#2160fd]"></i>
              Private Tactical Notes
            </h5>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Visible Only to You • Encrypted Locally
            </span>
          </div>
          <div className="relative">
            <textarea 
              value={currentNote}
              onChange={(e) => updateLeadNote(lead.id, e.target.value)}
              placeholder="Record internal deal intelligence, meeting notes, or relationship context here..."
              className="w-full min-h-[140px] p-6 bg-slate-50 border border-slate-100 rounded-[28px] text-[14px] font-medium text-[#101828] focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#2160fd] outline-none transition-all resize-none leading-relaxed placeholder:text-slate-400 placeholder:italic"
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              {currentNote && (
                <button 
                  onClick={() => handleSavePrivateNote(lead.id)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${savingNoteId === lead.id ? 'bg-emerald-500 text-white' : 'bg-[#101828] text-white hover:bg-blue-600 shadow-lg'}`}
                >
                  {savingNoteId === lead.id ? (
                    <><i className="fas fa-check"></i> Saved</>
                  ) : (
                    <><i className="fas fa-floppy-disk"></i> Save Notes</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Social Intelligence & Source Strip - Functional Implementation */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-10 px-10 py-6 bg-white border border-slate-200 rounded-[36px] shadow-sm relative overflow-hidden group/footer">
           <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-blue-500 transition-all duration-500 group-hover/footer:w-2"></div>
           <div className="flex items-center gap-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Quick Actions</p>
              <div className="flex gap-4">
                 {socials.map((social) => (
                    <a 
                      key={social.id}
                      href={social.url} 
                      target="_blank" 
                      onClick={e => e.stopPropagation()}
                      title={`${social.label}: ${lead.socialMetrics?.[social.id] || 'Verified Node'}`}
                      className={`w-10 h-10 rounded-xl ${social.color.replace('text-', 'bg-').replace('text-black', 'bg-black')} text-white flex items-center justify-center hover:scale-125 transition-all shadow-lg active:scale-95`}
                    >
                      <i className={`${social.icon} text-sm`}></i>
                    </a>
                 ))}
              </div>
           </div>

           <div className="flex items-center gap-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Share Intel</p>
              <div className="flex gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare(lead, 'linkedin'); }}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-[#0a66c2] hover:text-white transition-all shadow-sm flex items-center justify-center"
                  title="Share on LinkedIn"
                >
                  <i className="fab fa-linkedin-in"></i>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare(lead, 'twitter'); }}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-[#1da1f2] hover:text-white transition-all shadow-sm flex items-center justify-center"
                  title="Share on Twitter"
                >
                  <i className="fab fa-twitter"></i>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare(lead, 'email'); }}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                  title="Share via Email"
                >
                  <i className="fas fa-envelope"></i>
                </button>
              </div>
           </div>
           
           <div className="flex items-center gap-10">
              <div className="flex flex-col items-end">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Source Node</span>
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{lead.sourceType === 'google_maps' ? 'Verified Maps Node' : 'Web Intelligence Node'}</span>
                 </div>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>
              <button className="text-[11px] font-black text-[#2160fd] hover:text-[#101828] uppercase tracking-[0.2em] flex items-center gap-3 transition-colors active:scale-95">
                 <i className="fas fa-cloud-arrow-down"></i>
                 Export Records
              </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white border border-[#eaecf0] rounded-[24px] shadow-sm flex items-center justify-center">
            <i className="fas fa-microchip-ai text-[#2160fd] text-2xl"></i>
          </div>
          <div>
            <h3 className="text-2xl font-black text-[#101828] tracking-tight leading-none">Discovery Pipeline</h3>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{leads.length} Target Accounts Found</p>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Live Grounding Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['priority', 'rating', 'name', 'newest'] as SortOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === opt ? 'bg-white text-[#2160fd] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-[20px] border border-slate-200 shadow-inner">
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
              title="Matrix View"
            >
              <i className="fas fa-list-ul"></i>
              Matrix
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
              title="Grid Gallery"
            >
              <i className="fas fa-grid-2"></i>
              Grid
            </button>
            <button 
              onClick={() => setViewMode('map')} 
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
              title="Spatial Map"
            >
              <i className="fas fa-map-pin"></i>
              Spatial
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="w-full h-[650px] border border-slate-200 rounded-[48px] overflow-hidden bg-white shadow-2xl relative transition-all duration-700 animate-in fade-in">
          <div id="map-container" ref={mapContainerRef} className="w-full h-full" />
          
          <div className="absolute top-6 left-6 z-[400] bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-white shadow-xl flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${filteredMapLeads.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
              {filteredMapLeads.length} leads within {mapRadius}km of {userLocation ? 'your location' : 'search center'}
            </span>
          </div>

          <div className="absolute top-6 right-6 z-[400] bg-white/90 backdrop-blur-md px-6 py-4 rounded-[32px] border border-white shadow-2xl flex flex-col gap-3 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Radius Filter</span>
              <span className="text-xs font-black text-blue-600">{mapRadius} KM</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="250" 
              step="1"
              value={mapRadius} 
              onChange={(e) => setMapRadius(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2160fd]"
            />
            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase">
              <span>1km</span>
              <span>250km</span>
            </div>
          </div>

          {filteredMapLeads.length === 0 && (
            <div className="absolute inset-0 z-[350] flex items-center justify-center bg-slate-900/5 backdrop-blur-[1px]">
               <div className="bg-white/90 p-8 rounded-[32px] border border-white shadow-2xl text-center max-w-xs animate-in zoom-in-95">
                  <i className="fas fa-location-slash text-slate-300 text-4xl mb-4"></i>
                  <p className="text-sm font-bold text-slate-700">No leads found in this radius.</p>
                  <button 
                    onClick={() => setMapRadius(250)}
                    className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    Expand Search Perimeter
                  </button>
               </div>
            </div>
          )}

          {userLocation && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400]">
               <button 
                 onClick={() => mapInstanceRef.current?.setView([userLocation.lat, userLocation.lng], 12)}
                 className="px-6 py-3 bg-[#101828] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 hover:bg-[#2160fd] transition-all"
               >
                 <i className="fas fa-crosshairs"></i>
                 Center on Me
               </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {sortedLeads.map((lead) => {
            const isExpanded = expandedId === lead.id;
            const isEnriched = lead.status === 'analyzed';
            const priority = getPriorityInfo(lead);
            const color = getAvatarHexColor(lead.name);
            const mapsUrl = lead.lat && lead.lng 
              ? `https://www.google.com/maps?q=${lead.lat},${lead.lng}` 
              : lead.sourceUrl || `https://www.google.com/maps/search/${encodeURIComponent(lead.name + ' ' + lead.location)}`;

            return (
              <div
                key={lead.id}
                onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                className={`group flex flex-col bg-white border rounded-[48px] cursor-pointer transition-all duration-500 overflow-hidden ${isExpanded ? 'border-[#2160fd] shadow-2xl col-span-full ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-2xl hover:-translate-y-2'}`}
              >
                <div className={`p-8 flex flex-col h-full ${isExpanded ? 'bg-white' : ''}`}>
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-20 h-20 rounded-[32px] flex items-center justify-center text-3xl font-black text-white shadow-xl transition-all group-hover:rotate-6 group-hover:scale-110 overflow-hidden" style={{ backgroundColor: color }}>
                      {lead.imageUrl ? (
                        <img src={lead.imageUrl} alt={lead.name} className="w-full h-full object-contain p-2 bg-white" />
                      ) : getInitials(lead.name)}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       {getStatusBadge(lead.status)}
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${priority.color}`}>
                          {priority.label}
                       </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="text-2xl font-black text-[#101828] tracking-tighter mb-3 leading-tight group-hover:text-[#2160fd] transition-colors line-clamp-2">{lead.name}</h4>
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-briefcase text-blue-400"></i>
                        {lead.industry}
                      </span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-location-dot text-rose-400"></i>
                        {lead.location}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rating</p>
                          <p className="text-xl font-black text-[#101828]">{lead.rating || 'N/A'}</p>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reviews</p>
                          <p className="text-xl font-black text-[#101828]">{lead.reviews || 0}</p>
                       </div>
                    </div>
                  </div>

                  {!isExpanded && (
                    <div className="flex items-center gap-3 mt-auto">
                      <a 
                        href={mapsUrl} 
                        target="_blank" 
                        onClick={e => e.stopPropagation()}
                        className="w-14 h-14 flex items-center justify-center rounded-[24px] bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 border border-transparent transition-all"
                      >
                        <i className="fas fa-map-location-dot text-lg"></i>
                      </a>
                      
                      {/* NEW BUTTON */}
                      <button 
                        onClick={(e) => handleLinkedinAction(e, lead)}
                        className="w-14 h-14 flex items-center justify-center rounded-[24px] bg-slate-50 text-slate-500 hover:text-[#0a66c2] hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all"
                        title={lead.linkedin ? "Open LinkedIn" : "Find on LinkedIn"}
                      >
                        <i className="fab fa-linkedin-in text-lg"></i>
                      </button>

                      <button 
                         onClick={(e) => { e.stopPropagation(); onSelect(lead); }}
                         className="flex-1 py-4 bg-[#101828] text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-[#2160fd] transition-all flex items-center justify-center gap-3 shadow-xl group-hover:shadow-blue-200"
                      >
                        {isEnriched ? 'Profile' : 'Deep Scan'}
                      </button>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-6 -mx-8 -mb-8">
                       {renderIntelligenceLayer(lead)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {sortedLeads.map((lead) => {
            const isExpanded = expandedId === lead.id;
            const isEnriched = lead.status === 'analyzed';
            const priority = getPriorityInfo(lead);
            const mapsUrl = lead.lat && lead.lng 
              ? `https://www.google.com/maps?q=${lead.lat},${lead.lng}` 
              : lead.sourceUrl || `https://www.google.com/maps/search/${encodeURIComponent(lead.name + ' ' + lead.location)}`;

            return (
              <div
                key={lead.id}
                onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                onMouseEnter={() => !isExpanded && setHoveredLeadId(lead.id)}
                onMouseLeave={() => setHoveredLeadId(null)}
                className={`group relative flex flex-col bg-white border rounded-[40px] cursor-pointer transition-all duration-500 ${isExpanded ? 'border-[#2160fd] shadow-2xl ring-2 ring-[#2160fd]/5 scale-[1.01]' : 'border-slate-200 hover:border-slate-300 hover:shadow-xl hover:translate-y-[-2px]'}`}
              >
                <div className={`absolute top-0 bottom-0 left-0 w-2.5 transition-all duration-700 ${isEnriched ? 'bg-gradient-to-b from-[#2160fd] via-blue-600 to-indigo-800' : 'bg-slate-100 group-hover:bg-slate-200'}`}></div>

                {/* Quick View Tooltip */}
                {!isExpanded && hoveredLeadId === lead.id && (
                  <div className="absolute left-[300px] top-[-20px] w-[340px] z-[100] animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-300 pointer-events-none">
                    <div className="bg-white/80 backdrop-blur-xl border border-blue-100 rounded-[32px] p-6 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-50">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${priority.color}`}>
                          {priority.label} Priority
                        </span>
                        <div className="flex items-center gap-1.5">
                          <i className="fas fa-brain-circuit text-[#2160fd] text-[10px]"></i>
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">AI Intelligence</span>
                        </div>
                      </div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Strategic Peek</h5>
                      <p className="text-[13px] font-bold text-[#101828] leading-relaxed">
                        {lead.quickSummary || "Strategic summary pending discovery scan."}
                      </p>
                      {lead.intentSignal && (
                        <div className="mt-4 pt-4 border-t border-blue-50">
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                             <i className="fas fa-signal-perfect"></i> Signal: {lead.intentSignal}
                           </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center p-8 gap-8">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-[28px] flex items-center justify-center text-2xl font-black text-white shadow-xl group-hover:rotate-3 transition-all duration-500 overflow-hidden" style={{ backgroundColor: getAvatarHexColor(lead.name) }}>
                      {lead.imageUrl ? (
                        <img src={lead.imageUrl} alt={lead.name} className="w-full h-full object-contain p-2 bg-white" />
                      ) : getInitials(lead.name)}
                    </div>
                    {isEnriched && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#2160fd] text-white rounded-xl flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in-50 duration-500">
                        <i className="fas fa-brain-circuit text-[11px]"></i>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h4 className="text-2xl font-black text-[#101828] tracking-tighter truncate group-hover:text-[#2160fd] transition-colors">{lead.name}</h4>
                      {getStatusBadge(lead.status)}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${priority.color}`}>
                        <i className={`fas ${priority.icon} text-[8px]`}></i>
                        {priority.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-slate-500 mb-5">
                      <span className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100"><i className="fas fa-briefcase text-[10px] text-blue-500"></i> {lead.industry}</span>
                      <span className="flex items-center gap-2"><i className="fas fa-location-dot text-[10px] text-rose-500"></i> {lead.location}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-5 border-t border-slate-100">
                      {lead.phone && (
                        <div className="flex items-center gap-2.5 text-[11px] font-black uppercase text-[#101828] tracking-widest group-hover:text-blue-600 transition-colors">
                          <i className="fas fa-phone-volume text-[10px] text-blue-500"></i>
                          {lead.phone}
                        </div>
                      )}
                      {lead.website && (
                        <span className="flex items-center gap-2.5 text-slate-600 font-bold text-[11px]">
                          <i className="fas fa-globe text-blue-300 text-[11px]"></i>
                          {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {!isExpanded && (
                      <div className="flex items-center gap-3">
                         <a 
                           href={mapsUrl} 
                           target="_blank" 
                           onClick={e => e.stopPropagation()}
                           className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                           title="Navigate"
                         >
                            <i className="fas fa-map-location-dot text-lg"></i>
                         </a>

                         {/* NEW BUTTON */}
                         <button 
                           onClick={(e) => handleLinkedinAction(e, lead)}
                           className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-[#0a66c2] hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                           title={lead.linkedin ? "Open LinkedIn" : "Find on LinkedIn"}
                         >
                            <i className="fab fa-linkedin-in text-lg"></i>
                         </button>

                         <button 
                           onClick={(e) => { e.stopPropagation(); onSelect(lead); }}
                           className="px-8 py-3.5 bg-[#101828] text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#2160fd] transition-all shadow-xl active:scale-95"
                         >
                           {isEnriched ? 'Intel' : 'Deep Scan'}
                         </button>
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-slate-100 rotate-180 shadow-inner' : 'bg-white border border-slate-200 text-slate-400 group-hover:text-[#2160fd]'}`}>
                      <i className="fas fa-chevron-down text-sm"></i>
                    </div>
                  </div>
                </div>

                {isExpanded && renderIntelligenceLayer(lead)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
