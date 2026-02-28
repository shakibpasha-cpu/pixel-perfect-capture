
export interface LeadTask {
  id: string;
  leadId: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface SearchParams {
  industry: string;
  location: string;
  keywords: string;
}

export interface AIQualificationCriteria {
  rules: string[];
  description: string;
}

export interface Lead {
  id: string;
  name: string;
  industry: string;
  location: string;
  country: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviews?: number;
  phone?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  address?: string;
  sourceUrl?: string;
  imageUrl?: string;
  sourceType?: 'google_maps' | 'linkedin' | 'web_search';
  status: 'new' | 'enriching' | 'analyzed' | 'contacted' | 'qualified';
  leadStatus: 'new' | 'enriching' | 'analyzed' | 'contacted' | 'qualified';
  intentSignal?: string;
  contactName?: string;
  contactRole?: string;
  employeeCount?: string;
  email?: string;
  emailLifecycle?: string; // New field for email lifecycle status
  openingHours?: string;
  revenueHistory?: string;
  recentProjects?: string[];
  futureProjects?: string[];
  futureEnhancements?: string;
  coreBusinessFocus?: string;
  workingPartners?: string[];
  futurePlans?: string;
  followUpDate?: string;
  quickSummary?: string;
  socialMetrics?: Record<string, string>;
  // Company Intelligence Fields
  leadership?: { 
    name: string; 
    role: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  }[];
  runningProjects?: string[];
  competitors?: string[];
  techStack?: string[];
  marketPosition?: string;
  // Qualification System Fields
  qualificationScore?: number; // 0-100
  qualificationVerdict?: 'Fit' | 'Partial Fit' | 'No Fit';
  qualificationReasoning?: string;
  qualifiedAt?: string;
  qualificationCategory?: 'hot' | 'standard' | 'normal' | 'cold';
  // Outreach History
  lastAction?: {
    type: 'email' | 'phone' | 'whatsapp';
    date: string;
    note?: string;
  };
  notes?: string; // Dedicated field for writable notes
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface EnrichmentSuggestion {
  category: 'data_gap' | 'strategy' | 'hook';
  title: string;
  description: string;
  action: string;
}

export interface StrategySuggestions {
  refinedQuery: string;
  industries: string[];
  roles: string[];
  reasoning: string;
}

export interface AnalysisResult {
  summary: string;
  painPoints: string[];
  strategy: string;
  roadmap?: string;
  thinking?: string;
  sources: GroundingChunk[];
  suggestions?: EnrichmentSuggestion[];
  enrichmentIdeas?: EnrichmentSuggestion[];
  enrichedData?: Partial<Lead>;
}

export interface VerificationResult {
  input: string;
  type: 'email' | 'phone' | 'whatsapp';
  isValid: boolean;
  score: number; // 0-100 Risk Score (0 = Safe, 100 = High Risk)
  riskLevel: 'Safe' | 'Medium Risk' | 'High Risk';
  classification: 'Likely Real' | 'Possibly Fake' | 'Disposable' | 'Bot/Automated';
  providerOrCarrier?: string;
  location?: string;
  reasoning: string[];
  recommendation: 'Safe to Send' | 'Verify Further' | 'Avoid' | 'Block';
  technicalDetails: {
    syntaxValid: boolean;
    domainValid?: boolean;
    mxFound?: boolean;
    smtpStatus?: 'valid' | 'invalid' | 'unknown' | 'blocked';
    catchAll?: boolean;
    domainReputation?: 'High' | 'Medium' | 'Low' | 'Blacklisted';
    isDisposable?: boolean;
    isRoleBased?: boolean;
    lineType?: 'Mobile' | 'Landline' | 'VoIP' | 'Unknown';
    hasWhatsApp?: boolean;
  };
  enrichedData?: {
    name?: string;
    business?: string;
    phone?: string;
    website?: string;
    industry?: string;
    location?: string;
    lifecycle?: string;
    source?: string;
    confidence?: 'High' | 'Medium' | 'Low';
  };
}

export interface ComparisonResult {
  winnerId: string;
  recommendation: string;
  reasoning: string;
  comparisonPoints: {
    leadId: string;
    pros: string[];
    cons: string[];
    score: number; // Overall fit score
    dimensions: {
      marketFit: number;
      innovation: number;
      reliability: number;
      costEfficiency: number;
    };
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
  }[];
}

export enum AnalysisType {
  FAST = 'fast',
  SEARCH = 'search',
  THINKING = 'thinking',
  BRAINSTORM = 'brainstorm',
  QUALIFY = 'qualify'
}

// NEW DASHBOARD TYPES
export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserFile {
  id: string;
  name: string;
  folderId?: string;
  size: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  isSuspended: boolean;
  registeredAt: string;
  lastLoginAt?: string;
  phone?: string;
  country?: string;
  city?: string;
}
