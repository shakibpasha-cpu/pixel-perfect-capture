import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(systemPrompt: string, userPrompt: string, model = "google/gemini-3-flash-preview") {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT: Too many requests. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("PAYMENT_REQUIRED: AI credits exhausted. Please add credits.");
    }
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return content;
}

function cleanJson(text: string): string {
  let clean = text.trim();
  if (clean.startsWith("```json")) clean = clean.replace(/^```json/, "").replace(/```$/, "");
  else if (clean.startsWith("```")) clean = clean.replace(/^```/, "").replace(/```$/, "");
  return clean.trim();
}

function parseJson(text: string) {
  return JSON.parse(cleanJson(text));
}

// ─── Action Handlers ──────────────────────────────────────────────

async function handleFindLeads(body: any) {
  const { query, location, country, area, radius, filters } = body;
  const searchContext = [area, location, country].filter(Boolean).join(", ");

  let prompt = `Find exactly ${filters?.leadCount || 10} real business leads for the niche: "${query}".
CRITICAL: Only search within a ${radius || 25}km radius of ${searchContext || "a major city"}.
For each lead, provide: name, industry, phone, website, address, estimated star rating (0-5), review count, and LinkedIn URL if known.`;

  if (filters?.employeeCountRange && filters.employeeCountRange !== "any") {
    prompt += ` Prioritize companies with estimated ${filters.employeeCountRange} employees.`;
  }
  if (filters?.entityType && filters.entityType !== "any") {
    prompt += ` Focus on ${filters.entityType.replace("_", " ")} entities.`;
  }
  if (filters?.targetRole) {
    prompt += ` Identify the ${filters.targetRole} as the primary contact.`;
  }

  prompt += `\n\nReturn a JSON object with a "leads" array. Each lead object must have: name (string), industry (string), phone (string), website (string), linkedin (string), address (string), lat (number), lng (number), rating (number), reviews (number). Provide realistic data based on your knowledge.`;

  const result = await callAI(
    "You are a business lead research assistant. Return ONLY valid JSON. Search your knowledge for real businesses matching the criteria. Provide realistic contact data.",
    prompt
  );

  const parsed = parseJson(result);
  return (parsed.leads || []).map((l: any, index: number) => ({
    ...l,
    id: `lead-${Date.now()}-${index}`,
    status: "new",
    leadStatus: "new",
    location: l.address || location || "Unknown",
    country: country || "Unknown",
    sourceType: "google_maps",
  }));
}

async function handleQuickValidate(body: any) {
  const { lead } = body;
  const result = await callAI(
    "You are a lead quality analyst. Give a one-sentence quality verdict.",
    `Quick quality verdict for: ${JSON.stringify(lead)}. One sentence max.`,
    "google/gemini-2.5-flash-lite"
  );
  return result;
}

async function handleQuickSummary(body: any) {
  const { lead } = body;
  const result = await callAI(
    "You are a strategic business analyst. Provide concise value-focused summaries.",
    `Generate a 2-sentence value-focused summary for this business lead. Focus on why they are a high-potential target and their primary business activity. Be professional and strategic.\nLead: ${JSON.stringify({ name: lead.name, industry: lead.industry, location: lead.location, rating: lead.rating, reviews: lead.reviews })}`
  );
  return result;
}

async function handleQualifyLead(body: any) {
  const { lead } = body;
  const result = await callAI(
    "You are a lead qualification expert. Return ONLY valid JSON.",
    `Perform a deep qualification analysis for this business lead.
Evaluate based on:
1. Market Presence (Reviews/Rating)
2. Contactability (Direct Email/Phone availability)
3. Digital Footprint (Social Media/Website freshness)
4. Growth Signals (Employee count/Revenue estimations)

Return JSON: { "score": number 0-100, "verdict": "Fit"|"Partial Fit"|"No Fit", "reasoning": "2-sentence explanation" }

Lead Data: ${JSON.stringify(lead)}`
  );
  return parseJson(result);
}

async function handleEnrichLead(body: any) {
  const { lead } = body;
  const result = await callAI(
    "You are a company intelligence researcher. Use your knowledge to provide comprehensive enrichment data. Return ONLY valid JSON.",
    `Deep enrichment for: ${lead.name} in ${lead.location}.

OBJECTIVES:
1. LEADERSHIP: Find key leadership figures (C-Level, VPs, Directors) with Names, Titles, Emails, Phones, LinkedIn links. Return in 'leadership' array.
2. REVENUE: Revenue estimates and annual range.
3. PROJECTS: Active/Running projects and Future projects.
4. COMPETITORS: Top 3-5 competitors.
5. TECH STACK: Technologies they use.
6. CONTACT: Verify emails, phone, social profiles. Find the official website.
7. EMAIL LIFECYCLE: Estimate email status (Active, Dormant, Role-Based).

Return JSON:
{
  "summary": "executive briefing text",
  "enrichedData": {
    "phone": "", "email": "", "emailLifecycle": "", "website": "", "address": "",
    "linkedin": "", "facebook": "", "instagram": "", "twitter": "", "youtube": "",
    "contactName": "", "contactRole": "",
    "leadership": [{"name":"","role":"","email":"","phone":"","linkedin":""}],
    "employeeCount": "", "revenueHistory": "", "coreBusinessFocus": "",
    "rating": 0, "reviews": 0,
    "workingPartners": [], "recentProjects": [],
    "runningProjects": [], "futureProjects": [], "futureEnhancements": "", "futurePlans": "",
    "competitors": [], "techStack": [], "marketPosition": "",
    "socialMetrics": {}
  },
  "suggestions": [{"category":"data_gap|strategy|hook","title":"","description":"","action":""}]
}

Current Lead: ${JSON.stringify(lead)}`,
    "google/gemini-2.5-pro"
  );

  const parsed = parseJson(result);
  return {
    summary: parsed.summary,
    painPoints: [],
    strategy: "",
    sources: [],
    enrichedData: {
      ...parsed.enrichedData,
      status: "analyzed",
      leadStatus: "analyzed",
    },
    suggestions: parsed.suggestions,
  };
}

async function handleSuggestCriteria(body: any) {
  const { context } = body;
  const result = await callAI(
    "You are a Sales Operations Manager. Return ONLY valid JSON.",
    `Based on this business context: "${context}", suggest 5 precise rules for qualifying leads into "Hot", "Standard", "Normal", and "Cold" buckets.
Return JSON: { "rules": ["rule1","rule2",...], "description": "summary" }`
  );
  return parseJson(result);
}

async function handleBatchQualify(body: any) {
  const { leads, criteria } = body;
  const result = await callAI(
    "You are a lead scoring engine. Return ONLY a valid JSON array.",
    `Evaluate these leads based on criteria: ${criteria.join(", ")}.
Assign each: qualificationCategory ("hot"|"standard"|"normal"|"cold"), qualificationScore (0-100), qualificationReasoning (short).
Leads: ${JSON.stringify(leads.map((l: any) => ({ id: l.id, name: l.name, rating: l.rating, reviews: l.reviews, phone: !!l.phone, email: !!l.email, industry: l.industry })))}

Return JSON array: [{"id":"...","qualificationCategory":"...","qualificationScore":0,"qualificationReasoning":"..."}]`
  );
  return parseJson(result);
}

async function handleGenerateEmail(body: any) {
  const { lead } = body;
  const result = await callAI(
    "You are an expert B2B outreach copywriter. Return ONLY valid JSON.",
    `Draft a high-conversion, personalized B2B outreach email for: ${lead.name}.
CONTEXT:
- Industry: ${lead.industry}
- IQ Score: ${lead.qualificationScore} (${lead.qualificationCategory} lead)
- Reasoning: ${lead.qualificationReasoning}
- Future Projects: ${lead.futureProjects?.join(", ") || "N/A"}

Return JSON: { "subject": "compelling subject", "body": "full email text with [My Name] placeholder" }`
  );
  return parseJson(result);
}

async function handleVerifyContact(body: any) {
  const { input, type } = body;
  let prompt = "";

  if (type === "email") {
    prompt = `You are an Email Verification Engineer. Verify, enrich, and score this email: "${input}".

Analyze: syntax, domain validity, MX records likelihood, SMTP status estimate, catch-all detection, disposable check, role-based detection, spam trap risk.

Return JSON:
{
  "isValid": boolean, "score": 0-100, "riskLevel": "Safe"|"Medium Risk"|"High Risk",
  "classification": "Likely Real"|"Possibly Fake"|"Disposable"|"Bot/Automated",
  "recommendation": "Safe to Send"|"Verify Further"|"Avoid"|"Block",
  "reasoning": ["reason1","reason2"],
  "technicalDetails": { "syntaxValid": bool, "domainValid": bool, "mxFound": bool, "smtpStatus": "valid"|"invalid"|"unknown"|"blocked", "catchAll": bool, "domainReputation": "High"|"Medium"|"Low"|"Blacklisted", "isDisposable": bool, "isRoleBased": bool, "hasWhatsApp": false },
  "enrichedData": { "name": "", "business": "", "phone": "", "website": "", "industry": "", "location": "", "lifecycle": "", "confidence": "High"|"Medium"|"Low", "source": "" }
}`;
  } else {
    prompt = `You are a Telecommunications Intelligence Expert. Analyze this phone number: "${input}".

1. Country & region identification from country code.
2. Carrier & line type.
3. WhatsApp likelihood.
4. Risk scoring (0-100, 0=Safe).
5. Business association.

Return JSON:
{
  "isValid": boolean, "score": 0-100, "riskLevel": "Safe"|"Medium Risk"|"High Risk",
  "classification": "Likely Real"|"Possibly Fake"|"Disposable"|"Bot/Automated",
  "providerOrCarrier": "", "location": "",
  "reasoning": ["reason1"],
  "recommendation": "Safe to Send"|"Verify Further"|"Avoid"|"Block",
  "technicalDetails": { "syntaxValid": bool, "lineType": "Mobile"|"Landline"|"VoIP"|"Unknown", "hasWhatsApp": bool },
  "enrichedData": { "name": "", "business": "", "confidence": "High"|"Medium"|"Low", "source": "" }
}`;
  }

  const result = await callAI("You are a data verification expert. Return ONLY valid JSON.", prompt);
  const parsed = parseJson(result);
  return { ...parsed, input, type };
}

async function handleCompareLeads(body: any) {
  const { leads, criteria, persona } = body;
  const result = await callAI(
    `You are acting as a ${persona || "Strategic Consultant"}. Return ONLY valid JSON.`,
    `Compare these companies based on criteria: "${criteria}".

Candidates: ${JSON.stringify(leads.map((l: any) => ({
      id: l.id, name: l.name, industry: l.industry, location: l.location, rating: l.rating,
    })))}

Tasks:
1. Analyze each against criteria.
2. Select ONE winner.
3. Assign dimensional scores (0-100): marketFit, innovation, reliability, costEfficiency.
4. SWOT for each.

Return JSON:
{
  "winnerId": "id",
  "recommendation": "text",
  "reasoning": "text",
  "comparisonPoints": [{ "leadId": "id", "pros": [], "cons": [], "score": 0, "dimensions": { "marketFit": 0, "innovation": 0, "reliability": 0, "costEfficiency": 0 }, "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] } }]
}`,
    "google/gemini-2.5-pro"
  );
  return parseJson(result);
}

async function handleSearchStrategy(body: any) {
  const { goal } = body;
  const result = await callAI(
    "You are a Lead Generation Architect. Return ONLY valid JSON.",
    `User goal: "${goal}"
Architect a precision search strategy.
Return JSON: { "refinedQuery": "", "industries": [], "roles": [], "reasoning": "" }`
  );
  return parseJson(result);
}

// ─── Main Server ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...body } = await req.json();

    let result: any;

    switch (action) {
      case "findLeads":
        result = await handleFindLeads(body);
        break;
      case "quickValidate":
        result = await handleQuickValidate(body);
        break;
      case "quickSummary":
        result = await handleQuickSummary(body);
        break;
      case "qualifyLead":
        result = await handleQualifyLead(body);
        break;
      case "enrichLead":
        result = await handleEnrichLead(body);
        break;
      case "suggestCriteria":
        result = await handleSuggestCriteria(body);
        break;
      case "batchQualify":
        result = await handleBatchQualify(body);
        break;
      case "generateEmail":
        result = await handleGenerateEmail(body);
        break;
      case "verifyContact":
        result = await handleVerifyContact(body);
        break;
      case "compareLeads":
        result = await handleCompareLeads(body);
        break;
      case "searchStrategy":
        result = await handleSearchStrategy(body);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-proxy error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("RATE_LIMIT") ? 429 : message.includes("PAYMENT_REQUIRED") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
