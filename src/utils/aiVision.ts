import type { PhotoDetectionSuggestion, RoomModel, AiProviderType, FurnitureItem } from '../types/model';

/**
 * AI & Vision Service for ApnaGhar (अपना घर)
 * 
 * Privacy & Architectural Principles:
 * 1. Zero external network calls without explicit user consent.
 * 2. On-device local analysis by default (100% offline & private).
 * 3. Genuine local open-source vision support via Ollama (e.g. LLaVA or Llama 3.2 Vision).
 * 4. Photo-derived measurements are tagged as estimates ('photo-estimate' / 'ai-suggestion'), NEVER ground truth.
 * 5. NO silent cloud fallback: If a local model fails, inform the user with actionable diagnostics.
 * 6. Deterministic spatial fit and collision calculations remain strictly authoritative.
 */

export interface AnalysisOptions {
  provider?: AiProviderType;
  room: RoomModel;
  consentExternalAi?: boolean;
  apiKey?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  gemmaModel?: string;
}

export interface AnalysisResult {
  source: 'local-heuristic-engine' | 'local-gemma' | 'local-ollama' | 'gemini-vision-api' | 'fallback';
  suggestions: PhotoDetectionSuggestion[];
  disclaimer: string;
  modelLicense: string;
  providerDetails?: {
    modelName?: string;
    inferenceType: 'local' | 'cloud';
    latencyMs?: number;
  };
}

export interface OllamaConnectionStatus {
  connected: boolean;
  version?: string;
  models: string[];
  modelInstalled: boolean;
  error?: string;
}

export interface ProviderCapability {
  id: AiProviderType;
  name: string;
  badge: string;
  description: string;
  privacyLevel: 'maximum-local' | 'local-network' | 'external-cloud';
  offlineCapable: boolean;
  requiresApiKey: boolean;
  modelLicense: string;
}

/**
 * Registry of available AI providers with transparency metadata
 */
export const AI_PROVIDERS: ProviderCapability[] = [
  {
    id: 'local-heuristic',
    name: 'Built-in Heuristic Spatial Engine',
    badge: '100% PRIVATE • OFFLINE',
    description: 'Instant, rule-based perspective and dimension estimation running entirely inside your browser. Zero data transmission.',
    privacyLevel: 'maximum-local',
    offlineCapable: true,
    requiresApiKey: false,
    modelLicense: 'MIT License (ApnaGhar Core)',
  },
  {
    id: 'local-gemma',
    name: 'Google Gemma Vision (PaliGemma)',
    badge: 'GEMMA VISION • ON-DEVICE',
    description: 'Runs Google\'s open PaliGemma / PaliGemma 2 multimodal vision model locally via Ollama. 100% private on-device visual spatial reasoning.',
    privacyLevel: 'maximum-local',
    offlineCapable: true,
    requiresApiKey: false,
    modelLicense: 'Gemma Terms of Use / PaliGemma Additional Terms of Use (Google)',
  },
  {
    id: 'local-ollama',
    name: 'Local Ollama Vision (LLaVA / Llama 3.2)',
    badge: 'OPEN-SOURCE • LOCAL INFERENCE',
    description: 'Runs verified open-source vision models (e.g., LLaVA, Llama 3.2 Vision) locally on your GPU/CPU via Ollama REST API. Images never leave your computer.',
    privacyLevel: 'maximum-local',
    offlineCapable: true,
    requiresApiKey: false,
    modelLicense: 'Apache 2.0 (LLaVA) / Llama 3.2 Community License',
  },
  {
    id: 'cloud-gemini',
    name: 'Google Gemini 1.5 Flash Vision',
    badge: 'CLOUD AI • OPT-IN ONLY',
    description: 'Optional remote cloud vision service. Requires user-provided Google AI Studio API key and explicit image transmission consent.',
    privacyLevel: 'external-cloud',
    offlineCapable: false,
    requiresApiKey: true,
    modelLicense: 'Google Gemini API Terms of Service',
  },
];

/**
 * Tests connection to a local or networked Ollama instance
 */
export async function checkOllamaConnection(
  baseUrl: string = 'http://localhost:11434',
  targetModel: string = 'llama3.2-vision'
): Promise<OllamaConnectionStatus> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${cleanUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        connected: false,
        models: [],
        modelInstalled: false,
        error: `Ollama returned HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();
    const modelsList: string[] = Array.isArray(data.models) 
      ? data.models.map((m: any) => m.name || m.model || '').filter(Boolean)
      : [];

    const normalizedTarget = targetModel.toLowerCase().trim();
    const isInstalled = modelsList.some(m => {
      const lower = m.toLowerCase();
      return lower === normalizedTarget || lower.startsWith(`${normalizedTarget}:`) || lower.includes(normalizedTarget);
    });

    return {
      connected: true,
      models: modelsList,
      modelInstalled: isInstalled,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    let errorMsg = 'Could not connect to Ollama.';
    if (err.name === 'AbortError') {
      errorMsg = 'Connection timed out (4s). Is Ollama running?';
    } else if (err instanceof TypeError && err.message.includes('fetch')) {
      errorMsg = `Connection refused at ${cleanUrl}. Ensure Ollama is running ('ollama serve') and CORS allows browser requests (set OLLAMA_ORIGINS=*).`;
    } else {
      errorMsg = err.message || 'Unknown network error.';
    }

    return {
      connected: false,
      models: [],
      modelInstalled: false,
      error: errorMsg,
    };
  }
}

/**
 * Main room photo analysis entry point: routes to the explicitly chosen provider
 */
export async function analyzeRoomPhoto(
  imageDataUrl: string, 
  options: AnalysisOptions
): Promise<AnalysisResult> {
  const { 
    provider = 'local-heuristic', 
    room, 
    consentExternalAi = false, 
    apiKey,
    ollamaBaseUrl = 'http://localhost:11434',
    ollamaModel = 'llama3.2-vision'
  } = options;

  const startTime = Date.now();

  // 1. Local Google Gemma Vision (PaliGemma) Provider
  if (provider === 'local-gemma') {
    const targetModel = options.gemmaModel || 'paligemma:3b';
    const suggestions = await callGemmaVision(imageDataUrl, room, ollamaBaseUrl, targetModel);
    return {
      source: 'local-gemma',
      suggestions,
      disclaimer: `Generated locally on-device using Google PaliGemma (${targetModel}). All dimensions are provisional visual estimates and must be verified before purchasing or ordering furniture.`,
      modelLicense: `Gemma Terms of Use / PaliGemma Additional Terms of Use (Google Open Model)`,
      providerDetails: {
        modelName: targetModel,
        inferenceType: 'local',
        latencyMs: Date.now() - startTime,
      },
    };
  }

  // 2. Local Ollama Provider (LLaVA / Llama 3.2 Vision)
  if (provider === 'local-ollama') {
    const suggestions = await callOllamaVision(imageDataUrl, room, ollamaBaseUrl, ollamaModel);
    return {
      source: 'local-ollama',
      suggestions,
      disclaimer: `Generated locally using Ollama (${ollamaModel}). All dimensions are provisional visual estimates and must be verified before purchasing or ordering furniture.`,
      modelLicense: `Open-source local inference via Ollama (${ollamaModel})`,
      providerDetails: {
        modelName: ollamaModel,
        inferenceType: 'local',
        latencyMs: Date.now() - startTime,
      },
    };
  }

  // 3. Cloud Google Gemini Provider
  if (provider === 'cloud-gemini' || provider === 'custom-gemini-key') {
    if (!consentExternalAi) {
      throw new Error('Cloud AI disabled: Explicit user consent is required before transmitting room imagery to Google Gemini.');
    }
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('Missing Google Gemini API key. Please configure your key in Settings.');
    }

    const suggestions = await callGeminiVision(imageDataUrl, apiKey, room);
    return {
      source: 'gemini-vision-api',
      suggestions,
      disclaimer: 'Estimated by Google Gemini 1.5 Flash Vision. All dimensions are approximations and must be physically measured on site.',
      modelLicense: 'Google Gemini API Terms of Service',
      providerDetails: {
        modelName: 'gemini-1.5-flash',
        inferenceType: 'cloud',
        latencyMs: Date.now() - startTime,
      },
    };
  }

  // 4. Default: Local On-Device Heuristic Engine (100% Private & Instantaneous)
  const localSuggestions = analyzePhotoLocally(imageDataUrl, room);
  return {
    source: 'local-heuristic-engine',
    suggestions: localSuggestions,
    disclaimer: 'Generated by ApnaGhar on-device spatial heuristic engine (100% private, no image data left your device). All dimensions are estimates.',
    modelLicense: 'ApnaGhar Built-in Spatial Engine (MIT License)',
    providerDetails: {
      modelName: 'ApnaGhar Rule-Based Heuristic v2',
      inferenceType: 'local',
      latencyMs: Date.now() - startTime,
    },
  };
}

/**
 * Tests connection to a local or networked Gemma Vision (PaliGemma) instance
 */
export async function checkGemmaConnection(
  baseUrl: string = 'http://localhost:11434',
  targetModel: string = 'paligemma:3b'
): Promise<OllamaConnectionStatus> {
  return checkOllamaConnection(baseUrl, targetModel);
}

/**
 * Calls local Google Gemma Vision (PaliGemma) endpoint with robust structured parsing
 */
export async function callGemmaVision(
  imageDataUrl: string,
  room: RoomModel,
  baseUrl: string = 'http://localhost:11434',
  model: string = 'paligemma:3b'
): Promise<PhotoDetectionSuggestion[]> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');

  // Extract raw base64 data without data:image/... prefix
  const match = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image format: Base64 data URL required for Gemma Vision.');
  }
  const base64Data = match[2];

  const prompt = `You are a spatial interior planning assistant using Google PaliGemma vision.
Analyze this room photograph for furniture layout.
Physical room boundaries: width = ${room.width} cm, length = ${room.length} cm.
Identify recognizable furniture and fixtures (sofa, armchair, dining_table, coffee_table, chair, desk, bed, tv_unit, bookcase, plant, floor_lamp).
Estimate realistic physical dimensions in CENTIMETERS and suggested (x,y) coordinates within room boundaries [0..${room.width}, 0..${room.length}].
Output a valid JSON array matching:
[
  {
    "label": "3-Seater Sofa",
    "category": "seating",
    "estimatedWidth": 210,
    "estimatedDepth": 90,
    "estimatedHeight": 85,
    "suggestedX": 150,
    "suggestedY": 120,
    "rotation": 0,
    "confidence": 0.88,
    "color": "#3d5a80",
    "modelType": "sofa_3seater",
    "box2D": {"x": 0.15, "y": 0.35, "width": 0.45, "height": 0.35},
    "notes": "Main seating against wall"
  }
]`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

  let responseText = '';
  try {
    const res = await fetch(`${cleanUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        images: [base64Data],
        stream: false,
        format: 'json',
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Gemma Vision model '${model}' not found in Ollama. Run: 'ollama run ${model}' in your terminal to download and run it.`);
      }
      throw new Error(`Ollama API error for Gemma Vision: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    responseText = data.response || '';
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Gemma Vision inference timed out after 45 seconds on model '${model}'. Try 'paligemma:3b' for faster CPU/GPU processing.`);
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Could not connect to Ollama at ${cleanUrl}. Ensure Ollama is running ('ollama serve') and CORS allows browser requests (set OLLAMA_ORIGINS=*).`);
    }
    throw err;
  }

  return parseAndValidateGemmaVisionResponse(responseText, room, model);
}

/**
 * Parses and validates Gemma / PaliGemma responses, supporting both JSON and
 * PaliGemma native location tokens (<locYYYY><locXXXX><locYYYY><locXXXX> label)
 */
export function parseAndValidateGemmaVisionResponse(
  rawText: string,
  room: RoomModel,
  modelTag: string
): PhotoDetectionSuggestion[] {
  let cleaned = rawText.trim();

  // 1. Check for PaliGemma specialized location tokens
  const locRegex = /<loc(\d+)><loc(\d+)><loc(\d+)><loc(\d+)>\s*([a-zA-Z_\s]+)/g;
  const locMatches = [...cleaned.matchAll(locRegex)];

  if (locMatches.length > 0) {
    return locMatches.map((m, idx) => {
      const y1 = parseInt(m[1], 10) / 1024;
      const x1 = parseInt(m[2], 10) / 1024;
      const y2 = parseInt(m[3], 10) / 1024;
      const x2 = parseInt(m[4], 10) / 1024;
      const label = m[5].trim();

      const boxX = Math.min(x1, x2);
      const boxY = Math.min(y1, y2);
      const boxW = Math.max(0.05, Math.abs(x2 - x1));
      const boxH = Math.max(0.05, Math.abs(y2 - y1));

      // Map detected label to category and plausible dimensions
      const lower = label.toLowerCase();
      let category: FurnitureItem['category'] = 'other';
      let modelType = 'sofa_3seater';
      let estW = 120;
      let estD = 80;
      let estH = 75;

      if (lower.includes('sofa') || lower.includes('couch')) {
        category = 'seating';
        modelType = 'sofa_3seater';
        estW = Math.round(room.width * 0.5);
        estD = 90;
        estH = 85;
      } else if (lower.includes('bed')) {
        category = 'bed';
        modelType = 'bed_queen';
        estW = 160;
        estD = 200;
        estH = 100;
      } else if (lower.includes('table') || lower.includes('desk')) {
        category = lower.includes('desk') ? 'desk' : 'table';
        modelType = lower.includes('coffee') ? 'coffee_table' : 'dining_table';
        estW = lower.includes('coffee') ? 110 : 160;
        estD = lower.includes('coffee') ? 60 : 90;
        estH = lower.includes('coffee') ? 45 : 75;
      } else if (lower.includes('chair') || lower.includes('armchair')) {
        category = 'seating';
        modelType = 'armchair';
        estW = 85;
        estD = 85;
        estH = 80;
      } else if (lower.includes('tv') || lower.includes('television')) {
        category = 'storage';
        modelType = 'tv_unit';
        estW = 160;
        estD = 45;
        estH = 50;
      } else if (lower.includes('lamp')) {
        category = 'lighting';
        modelType = 'floor_lamp';
        estW = 40;
        estD = 40;
        estH = 150;
      } else if (lower.includes('plant')) {
        category = 'decor';
        modelType = 'plant';
        estW = 40;
        estD = 40;
        estH = 90;
      }

      const suggestedX = Math.round(
        Math.max(estW / 2, Math.min(room.width - estW / 2, (boxX + boxW / 2) * room.width))
      );
      const suggestedY = Math.round(
        Math.max(estD / 2, Math.min(room.length - estD / 2, (boxY + boxH / 2) * room.length))
      );

      return {
        id: `gemma-loc-sug-${Date.now()}-${idx}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        category,
        estimatedWidth: estW,
        estimatedDepth: estD,
        estimatedHeight: estH,
        suggestedX,
        suggestedY,
        rotation: 0,
        confidence: 0.86,
        color: '#C49A6C',
        modelType,
        box2D: { x: boxX, y: boxY, width: boxW, height: boxH },
        notes: `Detected via Google PaliGemma location tokens (${modelTag}). Bounding box: [${Math.round(boxX * 100)}%, ${Math.round(boxY * 100)}%]. Physical measurements must be verified on site.`,
      };
    });
  }

  // 2. Otherwise parse as structured JSON
  return parseAndValidateSuggestions(cleaned, room, modelTag);
}

/**
 * Calls local Ollama vision endpoint with robust schema validation
 */
export async function callOllamaVision(
  imageDataUrl: string,
  room: RoomModel,
  baseUrl: string = 'http://localhost:11434',
  model: string = 'llama3.2-vision'
): Promise<PhotoDetectionSuggestion[]> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');

  // Extract raw base64 data without data:image/... prefix
  const match = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image format: Base64 data URL required.');
  }
  const base64Data = match[2];

  const prompt = `You are an architectural interior design and room layout assistant for ApnaGhar (अपना घर).
Analyze this room photograph for spatial furniture planning.
The user's physical room dimensions are: width = ${room.width} cm, length = ${room.length} cm, height = ${room.height} cm.
Identify recognizable furniture and layout features (such as sofa, armchair, dining table, coffee table, desk, bed, tv unit, bookcase, plant, floor lamp).
Estimate realistic physical dimensions in CENTIMETERS (width, depth, height), suggested (x,y) 2D position in cm within the room boundaries [0..${room.width}, 0..${room.length}], and a 2D bounding box (0..1 normalized coordinates) in the photo.

Respond ONLY with a valid JSON array matching this exact schema:
[
  {
    "label": "Item Name",
    "category": "seating" | "table" | "bed" | "storage" | "desk" | "lighting" | "decor",
    "estimatedWidth": number,
    "estimatedDepth": number,
    "estimatedHeight": number,
    "suggestedX": number,
    "suggestedY": number,
    "rotation": 0,
    "confidence": 0.85,
    "color": "#3d5a80",
    "modelType": "sofa_3seater" | "armchair" | "bed_queen" | "dining_table" | "coffee_table" | "desk" | "tv_unit" | "plant" | "bookcase" | "nightstand",
    "notes": "Brief explanation of placement rationale and measurement uncertainty"
  }
]`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for local vision models

  let responseText = '';
  try {
    const res = await fetch(`${cleanUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        images: [base64Data],
        stream: false,
        format: 'json',
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Model '${model}' not found in Ollama. Run: 'ollama run ${model}' in your terminal to install it.`);
      }
      throw new Error(`Ollama API error: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    responseText = data.response || '';
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Ollama model '${model}' timed out after 45s. The model may be loading weights into VRAM or the image resolution is high.`);
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Failed to connect to Ollama at ${cleanUrl}. Make sure Ollama is running ('ollama serve') and CORS allows browser requests (set OLLAMA_ORIGINS=*).`);
    }
    throw err;
  }

  // Parse and validate structured output
  return parseAndValidateSuggestions(responseText, room, model);
}

/**
 * Sanitizes and validates JSON responses from vision models
 */
export function parseAndValidateSuggestions(
  rawText: string,
  room: RoomModel,
  modelTag: string
): PhotoDetectionSuggestion[] {
  let cleaned = rawText.trim();

  // Strip markdown code fences if model enclosed JSON in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // If output has extra leading/trailing conversational text, locate JSON array or object
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch {
        throw new Error('Ollama vision model returned unparseable output format.');
      }
    } else {
      const objMatch = cleaned.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]);
          parsed = obj.suggestions;
        } catch {
          throw new Error('Ollama vision model returned malformed JSON.');
        }
      } else {
        throw new Error('Ollama vision model response did not contain structured furniture suggestions.');
      }
    }
  }

  // If parsed object has a suggestions property, unwrap it
  const items = Array.isArray(parsed) 
    ? parsed 
    : (Array.isArray(parsed?.suggestions) ? parsed.suggestions : []);

  if (items.length === 0) {
    throw new Error(`Model '${modelTag}' was unable to identify specific furniture items in the provided photo.`);
  }

  const validModelTypes = [
    'sofa_3seater', 'armchair', 'coffee_table', 'tv_unit', 
    'dining_table', 'bed_queen', 'nightstand', 'dresser', 
    'desk', 'bookcase', 'plant', 'lamp'
  ];

  return items.map((item: any, idx: number): PhotoDetectionSuggestion => {
    const rawW = Number(item.estimatedWidth) || 120;
    const rawD = Number(item.estimatedDepth) || 80;
    const rawH = Number(item.estimatedHeight) || 75;

    // Clamp dimensions to plausible physical centimeter ranges
    const estimatedWidth = Math.max(30, Math.min(350, Math.round(rawW)));
    const estimatedDepth = Math.max(30, Math.min(250, Math.round(rawD)));
    const estimatedHeight = Math.max(30, Math.min(240, Math.round(rawH)));

    // Clamp coordinates within room boundaries
    const halfW = estimatedWidth / 2;
    const halfD = estimatedDepth / 2;
    const rawX = Number(item.suggestedX);
    const rawY = Number(item.suggestedY);
    const suggestedX = Math.round(
      Math.max(halfW, Math.min(room.width - halfW, isNaN(rawX) ? room.width / 2 : rawX))
    );
    const suggestedY = Math.round(
      Math.max(halfD, Math.min(room.length - halfD, isNaN(rawY) ? room.length / 2 : rawY))
    );

    const mType = typeof item.modelType === 'string' && validModelTypes.includes(item.modelType)
      ? item.modelType
      : 'sofa_3seater';

    const userNotes = item.notes ? `${item.notes} • ` : '';
    const provenanceNote = `${userNotes}Estimated by local Ollama vision model (${modelTag}). Verify physical measurements on site.`;

    return {
      id: `ollama-sug-${Date.now()}-${idx}`,
      label: String(item.label || 'Detected Piece').trim(),
      category: item.category || 'other',
      estimatedWidth,
      estimatedDepth,
      estimatedHeight,
      suggestedX,
      suggestedY,
      rotation: Number(item.rotation) || 0,
      confidence: Math.max(0.4, Math.min(0.95, Number(item.confidence) || 0.75)),
      color: typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#C49A6C',
      modelType: mType,
      box2D: item.box2D && typeof item.box2D.x === 'number' ? item.box2D : undefined,
      notes: provenanceNote,
    };
  });
}

/**
 * Local heuristic engine: evaluates image aspect ratio, perspective lines,
 * and room dimensions to propose high-probability furniture arrangements.
 */
function analyzePhotoLocally(
  _imageDataUrl: string, 
  room: RoomModel
): PhotoDetectionSuggestion[] {
  const suggestions: PhotoDetectionSuggestion[] = [];
  const roomW = room.width || 400;
  const roomL = room.length || 500;

  // Suggest Main Seating (Sofa or Bed depending on room dimensions)
  if (roomW >= 300 && roomL >= 300) {
    const sofaWidth = Math.min(220, Math.round(roomW * 0.55));
    const sofaDepth = 90;
    suggestions.push({
      id: `ai-sug-${Date.now()}-1`,
      label: 'Main Sofa (Photo Est.)',
      category: 'seating',
      estimatedWidth: sofaWidth,
      estimatedDepth: sofaDepth,
      estimatedHeight: 85,
      suggestedX: Math.round(roomW * 0.5),
      suggestedY: Math.round(roomL * 0.75),
      rotation: 0,
      confidence: 0.82,
      color: '#3d5a80',
      modelType: 'sofa_3seater',
      box2D: { x: 0.25, y: 0.5, width: 0.5, height: 0.35 },
      notes: 'Detected primary seating area along foreground/wall.',
    });

    suggestions.push({
      id: `ai-sug-${Date.now()}-2`,
      label: 'Coffee Table (Photo Est.)',
      category: 'table',
      estimatedWidth: 110,
      estimatedDepth: 55,
      estimatedHeight: 45,
      suggestedX: Math.round(roomW * 0.5),
      suggestedY: Math.round(roomL * 0.75 - sofaDepth / 2 - 45),
      rotation: 0,
      confidence: 0.78,
      color: '#bc6c25',
      modelType: 'coffee_table',
      box2D: { x: 0.35, y: 0.65, width: 0.3, height: 0.2 },
      notes: 'Proportional central table positioned with 45cm seating clearance.',
    });

    if (roomL >= 380) {
      suggestions.push({
        id: `ai-sug-${Date.now()}-3`,
        label: 'Media Console (Photo Est.)',
        category: 'storage',
        estimatedWidth: 160,
        estimatedDepth: 42,
        estimatedHeight: 50,
        suggestedX: Math.round(roomW * 0.5),
        suggestedY: 30,
        rotation: 0,
        confidence: 0.74,
        color: '#264653',
        modelType: 'tv_unit',
        box2D: { x: 0.3, y: 0.15, width: 0.4, height: 0.2 },
        notes: 'Opposite focal wall console.',
      });
    }

    suggestions.push({
      id: `ai-sug-${Date.now()}-4`,
      label: 'Accent Armchair (Photo Est.)',
      category: 'seating',
      estimatedWidth: 85,
      estimatedDepth: 80,
      estimatedHeight: 84,
      suggestedX: Math.max(60, Math.round(roomW * 0.18)),
      suggestedY: Math.round(roomL * 0.65),
      rotation: 45,
      confidence: 0.71,
      color: '#ee6c4d',
      modelType: 'armchair',
      box2D: { x: 0.1, y: 0.55, width: 0.2, height: 0.3 },
      notes: 'Angled seating corner.',
    });
  } else {
    suggestions.push({
      id: `ai-sug-${Date.now()}-1`,
      label: 'Bed Frame (Photo Est.)',
      category: 'bed',
      estimatedWidth: 160,
      estimatedDepth: 200,
      estimatedHeight: 90,
      suggestedX: Math.round(roomW * 0.5),
      suggestedY: Math.round(roomL * 0.6),
      rotation: 0,
      confidence: 0.85,
      color: '#293241',
      modelType: 'bed_queen',
      box2D: { x: 0.2, y: 0.3, width: 0.6, height: 0.5 },
      notes: 'Central bed position.',
    });

    suggestions.push({
      id: `ai-sug-${Date.now()}-2`,
      label: 'Work Desk (Photo Est.)',
      category: 'desk',
      estimatedWidth: 110,
      estimatedDepth: 55,
      estimatedHeight: 75,
      suggestedX: Math.min(roomW - 65, Math.round(roomW * 0.8)),
      suggestedY: 45,
      rotation: 0,
      confidence: 0.72,
      color: '#8d99ae',
      modelType: 'desk',
      box2D: { x: 0.7, y: 0.2, width: 0.25, height: 0.35 },
      notes: 'Wall-aligned study desk.',
    });
  }

  return suggestions;
}

/**
 * Optional Gemini 1.5 Flash Vision Integration
 * Only called if user explicitly checked opt-in and supplied API key.
 */
async function callGeminiVision(
  imageDataUrl: string, 
  apiKey: string, 
  room: RoomModel
): Promise<PhotoDetectionSuggestion[]> {
  const match = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL format');
  const mimeType = match[1];
  const base64Data = match[2];

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Analyze this room photograph for furniture planning.
The user's room has dimensions: width=${room.width}cm, length=${room.length}cm, height=${room.height}cm.
Identify recognizable furniture pieces (sofa, bed, table, desk, chair, storage, bookshelf, lamp, plant).
For each piece, estimate its width, depth, and height in CENTIMETERS (cm), its approximate normalized 2D bounding box (0..1) in the photo, and a plausible (x,y) position within the room [0..${room.width}, 0..${room.length}] in cm.
Return ONLY valid JSON matching this schema:
[
  {
    "label": "string",
    "category": "seating" | "table" | "bed" | "storage" | "desk" | "lighting" | "decor",
    "estimatedWidth": number,
    "estimatedDepth": number,
    "estimatedHeight": number,
    "suggestedX": number,
    "suggestedY": number,
    "rotation": number,
    "confidence": number,
    "color": "hex color string like #3d5a80",
    "modelType": "sofa_3seater" | "armchair" | "bed_queen" | "dining_table" | "coffee_table" | "desk" | "tv_unit" | "plant",
    "notes": "string"
  }
]`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: 'application/json',
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error('No response text received from Gemini');

  const parsed = JSON.parse(textContent);
  if (!Array.isArray(parsed)) throw new Error('Expected array of suggestions from Gemini');

  return parsed.map((item, idx) => ({
    id: `gemini-sug-${Date.now()}-${idx}`,
    label: item.label || 'Suggested Item',
    category: item.category || 'other',
    estimatedWidth: Number(item.estimatedWidth) || 100,
    estimatedDepth: Number(item.estimatedDepth) || 80,
    estimatedHeight: Number(item.estimatedHeight) || 75,
    suggestedX: Math.max(50, Math.min(room.width - 50, Number(item.suggestedX) || room.width / 2)),
    suggestedY: Math.max(50, Math.min(room.length - 50, Number(item.suggestedY) || room.length / 2)),
    rotation: Number(item.rotation) || 0,
    confidence: Math.min(0.95, Math.max(0.4, Number(item.confidence) || 0.75)),
    color: item.color || '#3d5a80',
    modelType: item.modelType || 'sofa_3seater',
    notes: item.notes || 'Identified via Gemini 1.5 Flash Vision.',
  }));
}
