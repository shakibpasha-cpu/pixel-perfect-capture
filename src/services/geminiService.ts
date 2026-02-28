
import { GoogleGenAI, Type } from "@google/genai";
import { Lead, AnalysisResult, GroundingChunk, EnrichmentSuggestion, StrategySuggestions, AIQualificationCriteria, VerificationResult, ComparisonResult } from "../types";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

const getPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    const timeout = setTimeout(() => {
      reject(new Error("Location request timed out"));
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve(pos);
      },
      (err) => {
        clearTimeout(timeout);
        reject(err);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  });
};

export class GeminiService {
  private cachedKey: string | null = null;

  private cleanJsonString(text: string): string {
    if (!text) return "{}";
    let clean = text.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json/, "").replace(/```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "").replace(/```$/, "");
    }
    return clean.trim();
  }

  private async getApiKey(): Promise<string> {
    if (this.cachedKey) return this.cachedKey;

    // Check environment variable first
    const envKey = process.env.API_KEY;
    if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && !envKey.includes('PLACEHOLDER')) {
      this.cachedKey = envKey;
      return envKey;
    }

    // Fallback to Firestore for Super Admin Key
    try {
      const docRef = doc(db, "settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().apiKey) {
        this.cachedKey = docSnap.data().apiKey;
        return this.cachedKey as string;
      }
    } catch (e) {
      console.warn("Could not fetch API key from Firestore:", e);
    }
    
    return envKey || "";
  }

  private async getAI(): Promise<GoogleGenAI> {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error("API Key missing. Please configure in Super Admin or .env.");
    return new GoogleGenAI({ apiKey });
  }

  async suggestQualificationCriteria(context: string): Promise<AIQualificationCriteria> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a senior Sales Operations Manager. Based on this business context: "${context}", suggest 5 precise rules for qualifying leads into "Hot", "Standard", "Normal", and "Cold" buckets.
      Return a JSON object with:
      - rules: string array of specific metrics or features to look for.
      - description: A short summary of why these rules work.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rules: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING }
          },
          required: ["rules", "description"]
        }
      }
    });
    return JSON.parse(this.cleanJsonString(response.text || "{}"));
  }

  async verifyContactData(input: string, type: 'email' | 'phone' | 'whatsapp'): Promise<VerificationResult> {
    const ai = await this.getAI();
    
    let expertPrompt = "";
    const tools = [{ googleSearch: {} }];
    
    if (type === 'email') {
      expertPrompt = `You are an elite Email Verification Engineer (simulated).
      Your task is to Verify, Enrich, and Score this email address: "${input}".
      
      EXECUTE THE FOLLOWING VERIFICATION PROTOCOL (Simulation):
      
      1. SYNTAX & FORMAT VALIDATION: Check against RFC 5322 rules (regex, invalid chars, double dots).
      2. DOMAIN & DNS INTELLIGENCE: Use Google Search to verify if the domain exists, is active, and likely has MX records.
      3. SMTP & MAILBOX SIMULATION: Estimate the mailbox status based on domain provider patterns (e.g. Gmail/Outlook vs Private Server) and likelihood of existence.
      4. CATCH-ALL DETECTION: Determine if the domain is likely a 'catch-all' (accepts all emails).
      5. DISPOSABLE CHECK: Compare against known disposable/burner domain patterns.
      6. ROLE-BASED DETECTION: Check for generic prefixes (info, admin, sales, hr).
      7. SPAM TRAP RISK: Estimate risk level based on domain reputation signals.
      8. ACTIVITY ESTIMATION: Estimate likelihood of recent activity/usage.

      OUTPUT FORMAT (JSON):
      {
        "isValid": boolean,
        "score": number (0-100 Trust Score),
        "riskLevel": "Safe" | "Medium Risk" | "High Risk",
        "classification": "Likely Real" | "Possibly Fake" | "Disposable" | "Bot/Automated",
        "recommendation": "Safe to Send" | "Verify Further" | "Avoid" | "Block",
        "reasoning": [string],
        "technicalDetails": {
           "syntaxValid": boolean,
           "domainValid": boolean,
           "mxFound": boolean,
           "smtpStatus": "valid" | "invalid" | "unknown" | "blocked",
           "catchAll": boolean,
           "domainReputation": "High" | "Medium" | "Low" | "Blacklisted",
           "isDisposable": boolean,
           "isRoleBased": boolean,
           "hasWhatsApp": boolean (false)
        },
        "enrichedData": {
          "name": string (Person or Business Name),
          "business": string,
          "phone": string,
          "website": string,
          "industry": string,
          "location": string,
          "lifecycle": string,
          "confidence": "High" | "Medium" | "Low",
          "source": string
        }
      }`;
    } else {
      expertPrompt = `You are a Telecommunications Intelligence Expert.
      Your task is to analyze this phone number: "${input}" and determine its validity, location, and risk profile.
      
      USE GOOGLE SEARCH TO VERIFY CARRIER AND LOCATION DATA.

      STEP 1: E.164 & COUNTRY IDENTIFICATION
      Identify the country and region based on the country code (e.g., +966 is Saudi Arabia, +971 is UAE). 
      BE EXTREMELY PRECISE. If the number starts with +966, it MUST be identified as Saudi Arabia (KSA), specifically cities like Riyadh if the area code matches.

      STEP 2: CARRIER & LINE TYPE
      Identify the specific carrier (e.g., STC, Mobily, Zain for KSA) and if it's Mobile, Landline, or VoIP.

      STEP 3: WHATSAPP/MESSAGING POTENTIAL
      Estimate likelihood of this number being active on WhatsApp based on line type.

      STEP 4: RISK SCORING
      Assign a risk score (0–100) where 0 is Safe and 100 is High Risk/Spam.
      
      STEP 5: ENRICHMENT
      Try to find if this number is associated with any public business or individual using search.

      STEP 6: FINAL VERDICT
      Return JSON.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: expertPrompt,
      config: {
        tools: tools,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            score: { type: Type.NUMBER },
            riskLevel: { type: Type.STRING, enum: ["Safe", "Medium Risk", "High Risk"] },
            classification: { type: Type.STRING, enum: ["Likely Real", "Possibly Fake", "Disposable", "Bot/Automated"] },
            providerOrCarrier: { type: Type.STRING },
            location: { type: Type.STRING },
            reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING, enum: ["Safe to Send", "Verify Further", "Avoid", "Block"] },
            technicalDetails: {
              type: Type.OBJECT,
              properties: {
                syntaxValid: { type: Type.BOOLEAN },
                domainValid: { type: Type.BOOLEAN },
                mxFound: { type: Type.BOOLEAN },
                smtpStatus: { type: Type.STRING, enum: ["valid", "invalid", "unknown", "blocked"] },
                catchAll: { type: Type.BOOLEAN },
                domainReputation: { type: Type.STRING },
                isDisposable: { type: Type.BOOLEAN },
                isRoleBased: { type: Type.BOOLEAN },
                lineType: { type: Type.STRING },
                hasWhatsApp: { type: Type.BOOLEAN }
              }
            },
            enrichedData: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                business: { type: Type.STRING },
                phone: { type: Type.STRING },
                website: { type: Type.STRING },
                industry: { type: Type.STRING },
                location: { type: Type.STRING },
                lifecycle: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                source: { type: Type.STRING }
              }
            }
          },
          required: ["isValid", "score", "riskLevel", "classification", "reasoning", "recommendation", "technicalDetails"]
        }
      }
    });

    const result = JSON.parse(this.cleanJsonString(response.text || "{}"));
    return { ...result, input, type };
  }

  async compareLeads(leads: Lead[], criteria: string, persona: string = "Strategic Consultant"): Promise<ComparisonResult> {
    const ai = await this.getAI();
    const prompt = `
      Act as a ${persona}.
      Your Goal: Compare the following companies based on this specific user criteria: "${criteria}".
      
      Candidates:
      ${JSON.stringify(leads.map(l => ({
        id: l.id,
        name: l.name,
        industry: l.industry,
        location: l.location,
        summary: l.quickSummary || l.status === 'analyzed' ? "Analyzed lead" : "No summary available",
        rating: l.rating || "N/A",
        focus: l.coreBusinessFocus || "Unknown"
      })))}

      Task:
      1. Analyze each company against the criteria from the perspective of a ${persona}.
      2. Select ONE clear winner.
      3. Assign detailed dimensional scores (0-100) reflecting the ${persona}'s priorities. 
         CRITICAL: You MUST provide scores for:
         - Market Fit: Alignment with user criteria.
         - Innovation: Modernity of tech/approach.
         - Reliability: Trust and market presence.
         - Cost Efficiency: Value for money estimation.
      4. Perform a tailored SWOT analysis for each candidate.

      Return JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            winnerId: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            comparisonPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  leadId: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  score: { type: Type.NUMBER },
                  dimensions: {
                    type: Type.OBJECT,
                    properties: {
                      marketFit: { type: Type.NUMBER },
                      innovation: { type: Type.NUMBER },
                      reliability: { type: Type.NUMBER },
                      costEfficiency: { type: Type.NUMBER }
                    },
                    required: ["marketFit", "innovation", "reliability", "costEfficiency"]
                  },
                  swot: {
                    type: Type.OBJECT,
                    properties: {
                      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                      opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                      threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                },
                required: ["leadId", "pros", "cons", "score", "dimensions", "swot"]
              }
            }
          },
          required: ["winnerId", "recommendation", "reasoning", "comparisonPoints"]
        }
      }
    });

    return JSON.parse(this.cleanJsonString(response.text || "{}"));
  }

  async batchQualifyLeads(leads: Lead[], criteria: string[]): Promise<Partial<Lead>[]> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evaluate the following leads based on these criteria: ${criteria.join(', ')}.
      Assign each lead a qualificationCategory: "hot", "standard", "normal", or "cold".
      Also provide a qualificationScore (0-100) and a short qualificationReasoning.
      Leads: ${JSON.stringify(leads.map(l => ({ id: l.id, name: l.name, rating: l.rating, reviews: l.reviews, phone: !!l.phone, email: !!l.email, industry: l.industry })))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              qualificationCategory: { type: Type.STRING, enum: ["hot", "standard", "normal", "cold"] },
              qualificationScore: { type: Type.NUMBER },
              qualificationReasoning: { type: Type.STRING }
            },
            required: ["id", "qualificationCategory", "qualificationScore", "qualificationReasoning"]
          }
        }
      }
    });
    return JSON.parse(this.cleanJsonString(response.text || "[]"));
  }

  async generateOutreachEmail(lead: Lead): Promise<{ subject: string, body: string }> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Draft a high-conversion, personalized B2B outreach email for: ${lead.name}.
      CONTEXT:
      - Industry: ${lead.industry}
      - IQ Score: ${lead.qualificationScore} (${lead.qualificationCategory} lead)
      - Reasoning: ${lead.qualificationReasoning}
      - Future Projects: ${lead.futureProjects?.join(', ') || 'N/A'}
      - Future Enhancements: ${lead.futureEnhancements || 'N/A'}
      
      The email should be professional, short, and mention a specific detail discovered about their future roadmap to show genuine interest.
      Return a JSON object with:
      - subject: A compelling subject line.
      - body: The full email text with [My Name] as placeholder for the sender.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });
    return JSON.parse(this.cleanJsonString(response.text || '{"subject": "", "body": ""}'));
  }

  async generateSearchStrategy(goal: string): Promise<StrategySuggestions> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a world-class Lead Generation Architect & Growth Strategist. 
      The user describes their high-level business goal: "${goal}"
      
      Your task is to architect a precision search strategy. 
      Return a JSON object with:
      1. refinedQuery: A high-intent search string.
      2. industries: Array of niche sectors.
      3. roles: Array of persona archetypes.
      4. reasoning: Strategy explanation.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedQuery: { type: Type.STRING },
            industries: { type: Type.ARRAY, items: { type: Type.STRING } },
            roles: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING }
          },
          required: ["refinedQuery", "industries", "roles", "reasoning"]
        }
      }
    });

    return JSON.parse(this.cleanJsonString(response.text || "{}"));
  }

  async generateQuickSummary(lead: Lead): Promise<string> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a 2-sentence value-focused summary for this business lead. 
      Focus on why they are a high-potential target and their primary business activity. 
      Be professional and strategic.
      Lead: ${JSON.stringify({ name: lead.name, industry: lead.industry, location: lead.location, rating: lead.rating, reviews: lead.reviews })}`,
    });
    return response.text || "Strategic summary unavailable.";
  }

  async findLeads(query: string, location?: string, country?: string, area?: string, radius: number = 25, filters?: any): Promise<Lead[]> {
    console.log("[GeminiService] findLeads called, getting AI instance...");
    const ai = await this.getAI();
    console.log("[GeminiService] AI instance ready, getting location...");
    let latLng = undefined;
    try {
      const pos = await getPosition();
      latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      console.log("[GeminiService] Got location:", latLng);
    } catch (e) {
      console.log("[GeminiService] Location unavailable, continuing without it");
    }

    const searchContext = [area, location, country].filter(Boolean).join(', ');
    
    let prompt = `Find exactly ${filters?.leadCount || 10} business leads for the niche: "${query}". 
    CRITICAL: Only search within a ${radius}km radius of ${searchContext || 'my current location'}. 
    For each lead, extract the exact phone, website, physical address, average star rating, and total review count.`;

    if (filters?.employeeCountRange && filters.employeeCountRange !== 'any') {
      prompt += ` Prioritize companies with an estimated employee count in the range of ${filters.employeeCountRange}.`;
    }
    if (filters?.entityType && filters.entityType !== 'any') {
      prompt += ` Specifically focus on entities that are likely ${filters.entityType.replace('_', ' ')}.`;
    }
    if (filters?.fundingStage && filters.fundingStage !== 'any') {
      prompt += ` Prioritize companies currently in the ${filters.fundingStage.replace('_', ' ')} funding stage.`;
    }
    if (filters?.targetRole) {
      prompt += ` Identify the ${filters.targetRole} as the primary contact person for each lead found.`;
    }

    console.log("[GeminiService] Calling Google Maps grounding...");
    // Google Maps grounding works best with 2.5-flash
    const mapsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleMaps: {} }], toolConfig: latLng ? { retrievalConfig: { latLng } } : undefined },
    });
    console.log("[GeminiService] Maps response received, length:", mapsResponse.text?.length || 0);

    const extractionResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `JSON extract leads from the following text data. You MUST find and include latitude (lat), longitude (lng), rating (0.0 to 5.0), reviews (count), and any discovered LinkedIn profile URLs (linkedin) for EVERY lead. 
      Text Data: ${mapsResponse.text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leads: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  industry: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  website: { type: Type.STRING },
                  linkedin: { type: Type.STRING },
                  address: { type: Type.STRING },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  rating: { type: Type.NUMBER },
                  reviews: { type: Type.INTEGER }
                },
                required: ["name", "industry", "lat", "lng", "address"]
              }
            }
          }
        }
      }
    });
    console.log("[GeminiService] Extraction response received");

    try {
      const parsed = JSON.parse(this.cleanJsonString(extractionResponse.text || '{"leads":[]}'));
      console.log("[GeminiService] Parsed leads count:", parsed.leads?.length || 0);
      return (parsed.leads || []).map((l: any, index: number) => ({
        ...l,
        id: `lead-${Date.now()}-${index}`,
        status: 'new',
        leadStatus: 'new',
        location: l.address || location || 'Unknown',
        country: country || 'Unknown',
        sourceType: 'google_maps',
      }));
    } catch (e) { 
      console.error("[GeminiService] Lead extraction failed:", e);
      return []; 
    }
  }

  async quickValidate(lead: Lead): Promise<string> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Quick quality verdict for: ${JSON.stringify(lead)}. One sentence max.`,
    });
    return response.text || "Ready for scan.";
  }

  async qualifyLead(lead: Lead): Promise<{ score: number, verdict: 'Fit' | 'Partial Fit' | 'No Fit', reasoning: string }> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a deep qualification analysis for this business lead. 
      Evaluate its potential based on:
      1. Market Presence (Reviews/Rating)
      2. Contactability (Direct Email/Phone availability)
      3. Digital Footprint (Social Media/Website freshness)
      4. Growth Signals (Employee count/Revenue estimations)
      
      Return a JSON object with:
      - score: A number from 0-100 representing overall lead quality.
      - verdict: One of "Fit", "Partial Fit", "No Fit".
      - reasoning: A 2-sentence explanation of the verdict.
      
      Lead Data: ${JSON.stringify(lead)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            verdict: { type: Type.STRING, enum: ["Fit", "Partial Fit", "No Fit"] },
            reasoning: { type: Type.STRING }
          },
          required: ["score", "verdict", "reasoning"]
        }
      }
    });

    return JSON.parse(this.cleanJsonString(response.text || '{"score": 0, "verdict": "No Fit", "reasoning": "Qualification failed due to system error."}'));
  }

  async enrichLead(lead: Lead): Promise<AnalysisResult> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Deep search enrichment for: ${lead.name} in ${lead.location}.
      
      COMPANY INTELLIGENCE OBJECTIVES:
      1. HIERARCHY & LEADERSHIP: Find at least 10 key leadership figures (C-Level, VPs, Directors) with their Names, Job Titles, Verified Emails (or patterns), Direct Phones (where public), and LinkedIn profile links. Return this in the 'leadership' array.
      2. REVENUE & FINANCE: Find revenue estimates, funding history, and annual revenue range.
      3. PROJECTS: Differentiate between "Running/Active Projects" (current case studies, live work) and "Future Projects" (roadmap, announced initiatives).
      4. COMPETITION: Identify top 3-5 competitors.
      5. TECH STACK: Identify technologies, software, or frameworks they use (e.g., AWS, React, Salesforce).
      6. SOCIALS & CONTACT: Verify direct emails, phone, and all social profiles. CRITICAL: If the website field is missing or empty, use Google Search to find the official company website and include it.
      7. EMAIL LIFECYCLE: Estimate the lifecycle status of the primary email (e.g., Active, Dormant, Auto-Generated, Role-Based).

      Return as JSON with:
      - summary: text
      - digitalImage: text
      - enrichedData: object containing all fields including the new 'leadership', 'runningProjects', 'competitors', 'techStack', and 'emailLifecycle'.
      - suggestions: array
      Current Lead: ${JSON.stringify(lead)}`,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            digitalImage: { type: Type.STRING },
            enrichedData: {
              type: Type.OBJECT,
              properties: {
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
                emailLifecycle: { type: Type.STRING },
                website: { type: Type.STRING },
                address: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                facebook: { type: Type.STRING },
                instagram: { type: Type.STRING },
                twitter: { type: Type.STRING },
                youtube: { type: Type.STRING },
                contactName: { type: Type.STRING },
                contactRole: { type: Type.STRING },
                
                // LEADERSHIP ARRAY
                leadership: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      email: { type: Type.STRING },
                      phone: { type: Type.STRING },
                      linkedin: { type: Type.STRING }
                    }
                  }
                },

                employeeCount: { type: Type.STRING },
                revenueHistory: { type: Type.STRING },
                coreBusinessFocus: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviews: { type: Type.INTEGER },
                workingPartners: { type: Type.ARRAY, items: { type: Type.STRING } },
                recentProjects: { type: Type.ARRAY, items: { type: Type.STRING } },
                
                // PROJECT INTELLIGENCE
                runningProjects: { type: Type.ARRAY, items: { type: Type.STRING } },
                futureProjects: { type: Type.ARRAY, items: { type: Type.STRING } },
                futureEnhancements: { type: Type.STRING },
                futurePlans: { type: Type.STRING },
                
                // MARKET & TECH
                competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
                techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                marketPosition: { type: Type.STRING },

                socialMetrics: {
                  type: Type.OBJECT,
                  properties: {
                    linkedin: { type: Type.STRING },
                    facebook: { type: Type.STRING },
                    instagram: { type: Type.STRING },
                    twitter: { type: Type.STRING },
                    youtube: { type: Type.STRING },
                    website: { type: Type.STRING }
                  }
                }
              }
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  action: { type: Type.STRING }
                }
              }
            }
          },
          required: ["summary", "enrichedData", "suggestions"]
        }
      }
    });
    
    try {
      const parsed = JSON.parse(this.cleanJsonString(response.text || '{}'));
      return { 
        summary: parsed.summary, 
        painPoints: [], 
        strategy: parsed.digitalImage, 
        sources: [], 
        enrichedData: {
          ...parsed.enrichedData,
          status: 'analyzed',
          leadStatus: 'analyzed'
        },
        suggestions: parsed.suggestions
      };
    } catch (e) { throw e; }
  }

  async strategicAnalysis(lead: Lead, context: string): Promise<AnalysisResult> {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Execution roadmap for: ${lead.name}. Context: ${context}`,
      config: { thinkingConfig: { thinkingBudget: 32768 } }
    });
    return { summary: "Roadmap Complete", painPoints: [], strategy: response.text || "", sources: [] };
  }
}

export const gemini = new GeminiService();
