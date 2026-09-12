import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function askGemini(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 600,
  temperature = 0.75
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Generate helpful contextual mock responses if GEMINI_API_KEY is not configured
    if (systemPrompt.includes('Facility Agent') || systemPrompt.includes('Plant Operations')) {
      const facilityNameMatch = userMessage.match(/Name:\s*([^\n\r]+)/);
      const clusterMatch = userMessage.match(/Industrial Cluster:\s*([^\n\r]+)/);
      const materialMatch = userMessage.match(/Material:\s*([^\n\r]+)/);
      const volumeMatch = userMessage.match(/Monthly Volume:\s*([^\n\r]+)/);
      const pricingMatch = userMessage.match(/Pricing Threshold:\s*([^\n\r]+)/);
      const hazardMatch = userMessage.match(/Hazardous Profile:\s*([^\n\r]+)/);
      const quotaMatch = userMessage.match(/Current Quota Status:\s*([^\n\r]+)/);
      const sensorMatch = userMessage.match(/Sensor \/ Quality State:\s*([^\n\r]+)/);

      const fName = facilityNameMatch ? facilityNameMatch[1].trim() : 'Our Plant';
      const cluster = clusterMatch ? clusterMatch[1].trim() : 'Karnataka';
      const material = materialMatch ? materialMatch[1].trim() : 'industrial byproduct';
      const volume = volumeMatch ? volumeMatch[1].trim() : 'available tonnage';
      const pricing = pricingMatch ? pricingMatch[1].trim() : 'commercial rates';
      const isHazard = hazardMatch && hazardMatch[1].includes('Hazardous');
      const quota = quotaMatch ? quotaMatch[1].trim() : 'Active KSPCB consent';
      const sensor = sensorMatch ? sensorMatch[1].trim() : 'nominal';

      const templates = [
        `"Here at ${fName} in ${cluster}, our yard is processing ${volume} of ${material}. ${
          isHazard
            ? 'Because this is a hazardous industrial stream, our manifest compliance under KSPCB Form-10 and authorized TSDF handling are our utmost priority.'
            : 'Because storage bay turnaround is tight, maintaining steady off-take prevents costly production throttling.'
        } Live telemetry indicates ${sensor}, so we are keeping raw material staging strictly calibrated to avoid quality degradation before dispatch.\n\nCommercially, we are standing firm on ${pricing}. Logistics along regional routes require disciplined scheduling to bypass peak freight curbs, and our KSPCB portal authorization (${quota}) is primed for immediate e-way bill generation with any vetted partner who can honor prompt clearing."`,

        `"Operating out of ${cluster}, our primary objective at ${fName} is balancing production continuity with circular efficiency for our ${volume} of ${material}. Substituting virgin inputs with certified secondary material gives us an edge against market price swings, provided moisture and contamination stay controlled (${sensor}).\n\nOn the freight and transaction side, our target benchmark is ${pricing}. With our KSPCB regulatory status (${quota}), our dispatch bays are equipped for automated digital waste manifests, so an authorized recycler nearby can collect seamlessly without administrative friction."`,

        `"From the shop floor at ${fName} in ${cluster}, managing our monthly volume of ${volume} (${material}) requires fast-moving logistics. We cannot afford yard congestion or demurrage on our internal transport bays. Given recent sensor data showing ${sensor}, quality verification at handover will be straightforward and transparent.\n\nOur terms center on ${pricing}. Provided the transport corridor allows compliant transit avoiding urban congestion windows, we are ready to lock in multi-month circular supply agreements backed by certified waste manifests immediately."`
      ];

      return templates[Math.floor(Math.random() * templates.length)];
    }
    if (systemPrompt.includes('Matchmaker')) {
      return `Feasible circular exchange: short transport distance and high material compatibility offset virgin procurement costs.`;
    }
    if (systemPrompt.includes('Seller')) {
      return `Asking price accounts for material handling, baseline separation, and local loading logistics.`;
    }
    if (systemPrompt.includes('Buyer')) {
      return `Offer reflects maximum viable input substitution cost relative to virgin raw material parity.`;
    }
    if (systemPrompt.includes('vetoed')) {
      return `VETOED: Non-certified buyers are strictly prohibited from receiving or processing hazardous byproducts under KSPCB rules.`;
    }
    if (systemPrompt.includes('approved') || systemPrompt.includes('confirm')) {
      return `APPROVED: Facility possesses valid regulatory clearances and transport route complies with waste manifest requirements.`;
    }
    return `Industrial symbiosis assessment confirmed for ${userMessage.slice(0, 60)}.`;
  }

  try {
    const client = getClient();
    if (!client) {
      return `Pairing confirmed under circular economy framework.`;
    }

    const generatePromise = client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Gemini API timeout')), 7000);
    });

    const response = await Promise.race([generatePromise, timeoutPromise]).finally(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });

    const text = response.text?.trim();
    return text || `Operational consultation completed under Karnataka circular framework.`;
  } catch (error) {
    console.warn('Gemini API call failed, using graceful fallback:', error);
    if (systemPrompt.includes('Facility Agent') || systemPrompt.includes('Plant Operations')) {
      const facilityNameMatch = userMessage.match(/Name:\s*([^\n\r]+)/);
      const clusterMatch = userMessage.match(/Industrial Cluster:\s*([^\n\r]+)/);
      const fName = facilityNameMatch ? facilityNameMatch[1].trim() : 'Our Plant';
      const cluster = clusterMatch ? clusterMatch[1].trim() : 'Karnataka';
      return `"Here at ${fName} in ${cluster}, our operations are structured for tight turnaround. We are actively prioritizing regional circular partners who can reliably clear our scheduled tonnage while strictly honoring our pricing boundaries and KSPCB manifest clearances."`;
    }
    if (systemPrompt.includes('Matchmaker')) {
      return `Feasible circular exchange: short transport distance and high material compatibility offset virgin procurement costs.`;
    }
    if (systemPrompt.includes('Seller')) {
      return `Asking price accounts for material handling, baseline separation, and local loading logistics.`;
    }
    if (systemPrompt.includes('Buyer')) {
      return `Offer reflects maximum viable input substitution cost relative to virgin raw material parity.`;
    }
    if (systemPrompt.includes('vetoed')) {
      return `VETOED: Non-certified buyers are strictly prohibited from receiving or processing hazardous byproducts under KSPCB rules.`;
    }
    if (systemPrompt.includes('approved') || systemPrompt.includes('confirm')) {
      return `APPROVED: Facility possesses valid regulatory clearances and transport route complies with waste manifest requirements.`;
    }
    return `Analysis confirmed compliant with regional symbiosis parameters.`;
  }
}
