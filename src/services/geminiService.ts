
import { Lead, AnalysisResult, VerificationResult, ComparisonResult, AIQualificationCriteria, StrategySuggestions } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function callAIProxy(action: string, body: Record<string, any>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: { action, ...body },
  });

  if (error) {
    console.error(`[AI Proxy] Error for ${action}:`, error);
    const msg = error.message || "AI request failed";
    if (msg.includes("429") || msg.includes("RATE_LIMIT")) {
      toast.error("Rate limited — please wait a moment and try again.");
    } else if (msg.includes("402") || msg.includes("PAYMENT_REQUIRED")) {
      toast.error("AI credits exhausted. Please add credits in Settings → Workspace → Usage.");
    }
    throw new Error(msg);
  }

  if (data?.error) {
    console.error(`[AI Proxy] Response error for ${action}:`, data.error);
    if (data.error.includes("RATE_LIMIT")) {
      toast.error("Rate limited — please wait a moment and try again.");
    } else if (data.error.includes("PAYMENT_REQUIRED")) {
      toast.error("AI credits exhausted. Please add credits.");
    }
    throw new Error(data.error);
  }

  return data?.data ?? data;
}

export class GeminiService {
  async suggestQualificationCriteria(context: string): Promise<AIQualificationCriteria> {
    return callAIProxy("suggestCriteria", { context });
  }

  async verifyContactData(input: string, type: 'email' | 'phone' | 'whatsapp'): Promise<VerificationResult> {
    return callAIProxy("verifyContact", { input, type });
  }

  async compareLeads(leads: Lead[], criteria: string, persona: string = "Strategic Consultant"): Promise<ComparisonResult> {
    return callAIProxy("compareLeads", { leads, criteria, persona });
  }

  async batchQualifyLeads(leads: Lead[], criteria: string[]): Promise<Partial<Lead>[]> {
    return callAIProxy("batchQualify", { leads, criteria });
  }

  async generateOutreachEmail(lead: Lead): Promise<{ subject: string; body: string }> {
    return callAIProxy("generateEmail", { lead });
  }

  async generateSearchStrategy(goal: string): Promise<StrategySuggestions> {
    return callAIProxy("searchStrategy", { goal });
  }

  async generateQuickSummary(lead: Lead): Promise<string> {
    return callAIProxy("quickSummary", { lead });
  }

  async findLeads(query: string, location?: string, country?: string, area?: string, radius: number = 25, filters?: any): Promise<Lead[]> {
    return callAIProxy("findLeads", { query, location, country, area, radius, filters });
  }

  async quickValidate(lead: Lead): Promise<string> {
    return callAIProxy("quickValidate", { lead });
  }

  async qualifyLead(lead: Lead): Promise<{ score: number; verdict: 'Fit' | 'Partial Fit' | 'No Fit'; reasoning: string }> {
    return callAIProxy("qualifyLead", { lead });
  }

  async enrichLead(lead: Lead): Promise<AnalysisResult> {
    return callAIProxy("enrichLead", { lead });
  }

  async strategicAnalysis(lead: Lead, context: string): Promise<AnalysisResult> {
    return callAIProxy("enrichLead", { lead });
  }
}

export const gemini = new GeminiService();
