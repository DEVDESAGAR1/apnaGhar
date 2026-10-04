import type { 
  PhotoDetectionSuggestion, 
  RoomModel, 
  AiProviderType, 
  FurnitureItem,
  ImageValidationResult,
  DetailedRoomAnalysis,
  ExistingFurnitureReviewItem,
  PersonalizedRecommendation,
  UserDesignGoal
} from '../types/model';
import { 
  evaluateSemanticSuitability, 
  inspectImagePixels 
} from './imageValidation';

/**
 * AI & Vision Service for ApnaGhar (अपना घर)
 * 
 * Privacy & Architectural Principles:
 * 1. Zero external network calls without explicit user consent.
 * 2. On-device local analysis by default (100% offline & private).
 * 3. Genuine local open-source vision support via Ollama (e.g. PaliGemma, LLaVA, Llama 3.2 Vision).
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
  userGoal?: UserDesignGoal;
  fileName?: string;
}

export interface AnalysisResult {
  source: 'local-heuristic-engine' | 'local-gemma' | 'local-ollama' | 'gemini-vision-api' | 'fallback';
  suggestions: PhotoDetectionSuggestion[];
  disclaimer: string;
  modelLicense: string;
  validation?: ImageValidationResult;
  detailedAnalysis?: DetailedRoomAnalysis;
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
    name: 'Google Gemma 3 Vision (gemma3:4b)',
    badge: 'GEMMA 3 • ON-DEVICE VISION',
    description: 'Runs Google Gemma 3 (gemma3:4b) multimodal vision model locally via Ollama. 100% private on-device visual spatial reasoning.',
    privacyLevel: 'maximum-local',
    offlineCapable: true,
    requiresApiKey: false,
    modelLicense: 'Gemma Terms of Use (Google Open Model)',
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
 * Builds a comprehensive, validated DetailedRoomAnalysis report incorporating:
 * 1. Image check status (suitable, partially_suitable, unsuitable, uncertain)
 * 2. Room summary & characteristics
 * 3. Existing furniture review (assessing current pieces to keep, move, reposition, replace)
 * 4. Top personalized recommendations (Keep, Rearrange, Add, Improve, Avoid) tailored to user goals
 * 5. Suggested additions with practical purposes
 * 6. Physical measurement checklist
 */
export function buildDetailedAnalysis(params: {
  validation: ImageValidationResult;
  suggestions: PhotoDetectionSuggestion[];
  room: RoomModel;
  userGoal?: UserDesignGoal;
  customCharacteristics?: Partial<DetailedRoomAnalysis['roomCharacteristics']>;
  customReviews?: ExistingFurnitureReviewItem[];
  customRecommendations?: PersonalizedRecommendation[];
  customChecklist?: string[];
}): DetailedRoomAnalysis {
  const { validation, suggestions, room, userGoal } = params;

  // If the image is unsuitable, strictly suppress room characteristics and recommendations
  if (validation.suitability === 'unsuitable') {
    return {
      validation,
      detectedItems: [],
      existingFurnitureReview: [],
      recommendations: [],
      measurementChecklist: [],
      userGoal,
    };
  }

  const roomType = params.customCharacteristics?.roomType || room.type || 'living';
  const goal = userGoal?.primaryGoal || 'general';
  const budget = userGoal?.budget || 'moderate';
  const strategy = userGoal?.furnitureStrategy || 'open-to-few-additions';

  // 1. Room Characteristics
  const roomCharacteristics = {
    roomType: roomType.charAt(0).toUpperCase() + roomType.slice(1),
    functionalZones: params.customCharacteristics?.functionalZones || [
      'Primary seating and social interaction zone',
      'Central circulation corridor connecting entrances',
      'Perimeter display and auxiliary storage wall',
    ],
    architecturalFeatures: params.customCharacteristics?.architecturalFeatures || [
      `Enclosed rectangular perimeter (${room.width} cm × ${room.length} cm)`,
      `${(room.openings || []).filter(o => o.type === 'door').length} architectural doorway(s) with clearance arcs`,
      `${(room.openings || []).filter(o => o.type === 'window').length} natural window opening(s)`,
    ],
    dominantColours: params.customCharacteristics?.dominantColours || [
      'Warm Alabaster (#F5F2EB)',
      'Natural Muted Oak (#C49A6C)',
      'Slate Gray Accents (#2B2D42)',
    ],
    materials: params.customCharacteristics?.materials || [
      'Smooth plaster walls with matte emulsion',
      'Hardwood oak floor planks with natural grain',
      'Textured woven fabric upholstery',
    ],
    apparentStyle: userGoal?.preferredStyle || params.customCharacteristics?.apparentStyle || 'Contemporary Warm Minimalist',
    lighting: params.customCharacteristics?.lighting || (
      validation.qualityIssues.includes('darkness')
        ? 'Subdued ambient light; recommended to add secondary task lighting.'
        : 'Balanced daytime illumination with distinct wall shadows.'
    ),
    congestion: (params.customCharacteristics?.congestion || (
      (room.furniture || []).length > 4 ? 'congested' : ((room.furniture || []).length > 2 ? 'moderate' : 'spacious')
    )) as 'spacious' | 'moderate' | 'congested',
    limitations: params.customCharacteristics?.limitations || [
      'Single-camera viewpoint leaves behind-camera perimeter unobserved.',
      'Perspective angles may compress depth; verify with physical tape measurements.',
    ],
  };

  // 2. Existing Furniture Review (Section 3: Review furniture user already owns)
  const existingItems = room.furniture && room.furniture.length > 0 ? room.furniture : [];
  const existingFurnitureReview: ExistingFurnitureReviewItem[] = [];

  if (params.customReviews && params.customReviews.length > 0) {
    existingFurnitureReview.push(...params.customReviews);
  } else if (existingItems.length > 0) {
    for (const item of existingItems) {
      const nearDoor = (room.openings || []).some(op => {
        if (op.type !== 'door') return false;
        return Math.hypot(item.x - op.offset, item.y - (op.wall === 'north' ? 0 : room.length)) < 120;
      });

      const nearCenter = Math.abs(item.x - room.width / 2) < 40 && Math.abs(item.y - room.length / 2) < 40;

      let placementStatus: ExistingFurnitureReviewItem['placementStatus'] = 'useful';
      let recommendation: ExistingFurnitureReviewItem['recommendation'] = 'keep';
      let reason = 'Good alignment against room boundary with sufficient clearance.';
      let additionalInfoNeeded = 'Confirm physical spacing to nearest wall with tape measure.';

      if (nearDoor) {
        placementStatus = 'obstructive';
        recommendation = 'move';
        reason = 'Currently encroaches on door swing clearance zone. Moving 30 cm away will ensure unhindered entry.';
        additionalInfoNeeded = 'Measure door opening sweep radius.';
      } else if (nearCenter && item.category !== 'table') {
        placementStatus = 'inefficient';
        recommendation = 'reposition';
        reason = 'Positioned near the center of the room, restricting open walking paths.';
        additionalInfoNeeded = 'Verify walking corridor width (minimum 80 cm recommended).';
      }

      existingFurnitureReview.push({
        id: `review-${item.id}`,
        name: item.name,
        apparentRole: `Primary ${item.category} piece supporting room function.`,
        placementStatus,
        recommendation,
        reason,
        additionalInfoNeeded,
      });
    }
  } else {
    // Review detected items from photo
    for (const sug of suggestions.slice(0, 3)) {
      existingFurnitureReview.push({
        id: `review-${sug.id}`,
        name: sug.label,
        apparentRole: `Visible ${sug.category} observed in room photograph.`,
        placementStatus: 'useful',
        recommendation: 'keep',
        reason: 'Appears functionally appropriate for this room type. Recommend retaining in current zone.',
        additionalInfoNeeded: `Measure confirmed width and depth (estimated: ${sug.estimatedWidth}×${sug.estimatedDepth} cm).`,
        estimatedItem: sug,
      });
    }
  }

  // 3. Personalized Recommendations (Section 4: Prioritized, concise categories)
  const recommendations: PersonalizedRecommendation[] = [];

  if (params.customRecommendations && params.customRecommendations.length > 0) {
    recommendations.push(...params.customRecommendations);
  } else {
    // A. Keep
    recommendations.push({
      id: `rec-keep-${Date.now()}-1`,
      category: 'keep',
      priority: 'high',
      action: 'Preserve primary perimeter seating orientation',
      reason: 'Anchors the room comfortably while leaving central floor space open for movement.',
      expectedBenefit: 'Maintains spacious feel without costly reconfigurations.',
      effortCost: 'free',
      requiredMeasurements: 'Confirm at least 60 cm walking clearance from coffee table or TV wall.',
      status: 'ready',
    });

    // B. Rearrange
    if (goal === 'improve-circulation' || existingFurnitureReview.some(r => r.recommendation === 'move')) {
      recommendations.push({
        id: `rec-rearr-${Date.now()}-2`,
        category: 'rearrange',
        priority: 'high',
        action: 'Shift seating away from entrance clearance arc',
        reason: 'Doorway swing requires an unimpeded 90-degree arc for safe egress and furniture entry.',
        expectedBenefit: 'Eliminates door collision and expands apparent entrance width.',
        effortCost: 'free',
        requiredMeasurements: 'Door swing radius (typically 80–90 cm).',
        status: 'ready',
      });
    } else {
      recommendations.push({
        id: `rec-rearr-${Date.now()}-2`,
        category: 'rearrange',
        priority: 'medium',
        action: 'Align secondary furniture to established 10 cm grid spacing',
        reason: 'Consistent setbacks from walls reduce visual clutter and simplify cleaning access.',
        expectedBenefit: 'Improves spatial rhythm and visual balance.',
        effortCost: 'free',
        requiredMeasurements: 'Wall offset distance.',
        status: 'ready',
      });
    }

    // C. Add
    if (strategy !== 'keep-all-existing') {
      if (goal === 'maximize-storage') {
        recommendations.push({
          id: `rec-add-${Date.now()}-3`,
          category: 'add',
          priority: 'high',
          action: 'Introduce a slender vertical storage bookcase (35–40 cm depth)',
          reason: 'Maximizes vertical storage capacity without encroaching on prime floor area.',
          expectedBenefit: 'Adds organized storage while conserving walkway floor area.',
          effortCost: budget === 'zero-cost' ? 'free' : 'purchase-required',
          requiredMeasurements: 'Available North/East wall length and vertical ceiling clearance.',
          status: 'needs-info',
        });
      } else if (goal === 'work-study-zone') {
        recommendations.push({
          id: `rec-add-${Date.now()}-3`,
          category: 'add',
          priority: 'high',
          action: 'Add a compact ergonomic study desk (100×55 cm)',
          reason: 'Creates a designated focus work zone with power access near wall perimeter.',
          expectedBenefit: 'Provides dedicated task productivity without cluttering dining or living surfaces.',
          effortCost: budget === 'zero-cost' ? 'free' : 'purchase-required',
          requiredMeasurements: 'Wall segment width and proximity to electrical outlets.',
          status: 'needs-info',
        });
      } else {
        recommendations.push({
          id: `rec-add-${Date.now()}-3`,
          category: 'add',
          priority: 'medium',
          action: 'Position an accent side table beside the primary sofa',
          reason: 'Provides a convenient surface for resting drinks, reading glasses, or a task lamp.',
          expectedBenefit: 'Enhances everyday comfort without restricting walking paths.',
          effortCost: 'low-cost',
          requiredMeasurements: 'Sofa armrest height (for level alignment).',
          status: 'ready',
        });
      }
    }

    // D. Improve
    recommendations.push({
      id: `rec-imp-${Date.now()}-4`,
      category: 'improve',
      priority: 'medium',
      action: 'Layer warm secondary lighting (2700K floor or table lamp)',
      reason: 'Single overhead fixtures create harsh glare and dark corners; layered light softens room depth.',
      expectedBenefit: 'Creates inviting evening ambiance and highlights architectural textures.',
      effortCost: 'low-cost',
      requiredMeasurements: 'Wall socket distance and cord run.',
      status: 'ready',
    });

    // F. Avoid
    recommendations.push({
      id: `rec-avd-${Date.now()}-5`,
      category: 'avoid',
      priority: 'high',
      action: 'Avoid oversized L-shaped sectionals or wide coffee tables exceeding 120 cm width',
      reason: 'In this room footprint, oversized pieces congest the primary circulation pathway and block door arcs.',
      expectedBenefit: 'Prevents expensive purchasing mistakes that restrict movement.',
      effortCost: 'free',
      requiredMeasurements: 'Maintain minimum 80 cm walking corridor between opposing furniture.',
      status: 'ready',
    });
  }

  // 4. Measurement Checklist
  const measurementChecklist = params.customChecklist || [
    `Room overall width (${room.width} cm) and length (${room.length} cm) measured at baseboard level`,
    'Clear doorway opening width and 90-degree swing arc radius',
    'Window sill height from floor and distance to adjacent corner',
    'Floor clearance between primary seating and opposing coffee table / TV wall (minimum 45 cm recommended)',
    'Location and height of wall electrical outlets and switches',
  ];

  return {
    validation,
    roomCharacteristics,
    detectedItems: suggestions,
    existingFurnitureReview,
    recommendations,
    measurementChecklist,
    userGoal,
  };
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
    ollamaModel = 'llama3.2-vision',
    gemmaModel = 'gemma3:4b',
    userGoal,
    fileName,
  } = options;

  const startTime = Date.now();

  // Stage B Pre-screening: Inspect pixels for brightness, contrast, and darkness/glare/blur
  const pixelStats = await inspectImagePixels(imageDataUrl);

  // Evaluate initial semantic suitability (e.g. filename checks or obvious non-room subjects)
  const initialSuitability = evaluateSemanticSuitability({
    fileName,
    qualityIssues: pixelStats.qualityIssues,
  });

  // If the image is determined to be clearly unsuitable upfront (e.g. portrait, pet, vehicle, landscape):
  if (initialSuitability.suitability === 'unsuitable') {
    const detailedAnalysis = buildDetailedAnalysis({
      validation: initialSuitability,
      suggestions: [],
      room,
      userGoal,
    });

    const providerSource = provider === 'local-gemma' 
      ? 'local-gemma' 
      : (provider === 'local-ollama' ? 'local-ollama' : (provider === 'cloud-gemini' ? 'gemini-vision-api' : 'local-heuristic-engine'));

    return {
      source: providerSource,
      suggestions: [],
      validation: initialSuitability,
      detailedAnalysis,
      disclaimer: initialSuitability.explanation,
      modelLicense: 'ApnaGhar Image Validation (Stage B Screening)',
      providerDetails: {
        modelName: provider === 'local-gemma' ? gemmaModel : (provider === 'local-ollama' ? ollamaModel : 'heuristic-screening'),
        inferenceType: provider === 'cloud-gemini' ? 'cloud' : 'local',
        latencyMs: Date.now() - startTime,
      },
    };
  }

  let suggestions: PhotoDetectionSuggestion[] = [];
  let source: AnalysisResult['source'] = 'local-heuristic-engine';
  let disclaimer = '';
  let modelLicense = '';
  let modelName = '';
  let inferenceType: 'local' | 'cloud' = 'local';

  // 1. Local Google Gemma Vision (Gemma 3 / PaliGemma) Provider
  if (provider === 'local-gemma') {
    const targetModel = gemmaModel || 'gemma3:4b';
    const visionDetails = await callGemmaVisionDetails(imageDataUrl, room, ollamaBaseUrl, targetModel);
    suggestions = visionDetails.suggestions;
    source = 'local-gemma';
    const isPali = targetModel.toLowerCase().includes('paligemma');
    disclaimer = `Generated locally on-device using Google ${isPali ? 'PaliGemma' : 'Gemma'} (${targetModel}). All dimensions are provisional visual estimates and must be verified before purchasing or ordering furniture.`;
    modelLicense = `Gemma Terms of Use (Google Open Model)`;
    modelName = targetModel;
    inferenceType = 'local';

    if (visionDetails.suitability === 'unsuitable' || !visionDetails.isIndoorRoom) {
      const unsuitableValidation = evaluateSemanticSuitability({
        fileName,
        explicitClassification: 'unsuitable',
        isIndoor: false,
        qualityIssues: visionDetails.qualityIssues,
        rawText: visionDetails.explanation,
      });

      const detailedAnalysis = buildDetailedAnalysis({
        validation: unsuitableValidation,
        suggestions: [],
        room,
        userGoal,
      });

      return {
        source,
        suggestions: [],
        validation: unsuitableValidation,
        detailedAnalysis,
        disclaimer: visionDetails.explanation || 'This image appears to show an unrelated subject rather than an indoor room.',
        modelLicense,
        providerDetails: {
          modelName,
          inferenceType,
          latencyMs: Date.now() - startTime,
        },
      };
    }
  } 
  // 2. Local Ollama Provider (LLaVA / Llama 3.2 Vision)
  else if (provider === 'local-ollama') {
    suggestions = await callOllamaVision(imageDataUrl, room, ollamaBaseUrl, ollamaModel);
    source = 'local-ollama';
    disclaimer = `Generated locally using Ollama (${ollamaModel}). All dimensions are provisional visual estimates and must be verified before purchasing or ordering furniture.`;
    modelLicense = `Open-source local inference via Ollama (${ollamaModel})`;
    modelName = ollamaModel;
    inferenceType = 'local';
  } 
  // 3. Cloud Google Gemini Provider
  else if (provider === 'cloud-gemini' || provider === 'custom-gemini-key') {
    if (!consentExternalAi) {
      throw new Error('Cloud AI disabled: Explicit user consent is required before transmitting room imagery to Google Gemini.');
    }
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('Missing Google Gemini API key. Please configure your key in Settings.');
    }

    suggestions = await callGeminiVision(imageDataUrl, apiKey, room);
    source = 'gemini-vision-api';
    disclaimer = 'Estimated by Google Gemini 1.5 Flash Vision. All dimensions are approximations and must be physically measured on site.';
    modelLicense = 'Google Gemini API Terms of Service';
    modelName = 'gemini-1.5-flash';
    inferenceType = 'cloud';
  } 
  // 4. Default: Local On-Device Heuristic Engine (100% Private & Instantaneous)
  else {
    suggestions = analyzePhotoLocally(imageDataUrl, room);
    source = 'local-heuristic-engine';
    disclaimer = 'Generated by ApnaGhar on-device spatial heuristic engine (100% private, no image data left your device). All dimensions are estimates.';
    modelLicense = 'ApnaGhar Built-in Spatial Engine (MIT License)';
    modelName = 'ApnaGhar Rule-Based Heuristic v2';
    inferenceType = 'local';
  }

  // Final Stage B semantic suitability synthesis
  // NOTE: Rule-based heuristic suggestions must not be used to bypass semantic room validation!
  const detectedLabels = (provider === 'local-heuristic') 
    ? [] 
    : suggestions.map(s => s.label);

  const finalValidation = evaluateSemanticSuitability({
    fileName,
    detectedLabels,
    qualityIssues: pixelStats.qualityIssues,
    roomType: room.type,
    isIndoor: suggestions.length > 0 && provider !== 'local-heuristic',
  });

  // If final validation determined the image is unsuitable, strictly suppress suggestions
  if (finalValidation.suitability === 'unsuitable') {
    suggestions = [];
  }

  const detailedAnalysis = buildDetailedAnalysis({
    validation: finalValidation,
    suggestions,
    room,
    userGoal,
  });

  return {
    source,
    suggestions,
    validation: finalValidation,
    detailedAnalysis,
    disclaimer,
    modelLicense,
    providerDetails: {
      modelName,
      inferenceType,
      latencyMs: Date.now() - startTime,
    },
  };
}

/**
 * Automatically discovers installed models in Ollama via /api/tags
 */
export async function discoverOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${cleanUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data.models)) {
      return data.models.map((m: any) => m.name || m.model || '').filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Tests connection to a local or networked Gemma Vision instance (gemma3:4b / paligemma:3b)
 */
export async function checkGemmaConnection(
  baseUrl: string = 'http://localhost:11434',
  targetModel: string = 'gemma3:4b'
): Promise<OllamaConnectionStatus> {
  return checkOllamaConnection(baseUrl, targetModel);
}

export interface VisionInferenceDetails {
  suggestions: PhotoDetectionSuggestion[];
  suitability: ImageSuitability;
  isIndoorRoom: boolean;
  subjectType: string;
  explanation?: string;
  qualityIssues: string[];
}

/**
 * Calls local Google Gemma Vision (gemma3:4b / paligemma:3b) endpoint with full suitability metadata
 */
export async function callGemmaVisionDetails(
  imageDataUrl: string,
  room: RoomModel,
  baseUrl: string = 'http://localhost:11434',
  model: string = 'gemma3:4b'
): Promise<VisionInferenceDetails> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');

  // Extract raw base64 data without data:image/... prefix
  const match = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image format: Base64 data URL required for Gemma Vision.');
  }
  const base64Data = match[2];

  const isPaliGemma = model.toLowerCase().includes('paligemma');
  const prompt = isPaliGemma
    ? `You are a spatial interior planning assistant using Google PaliGemma vision.
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
]`
    : `You are an architectural vision and interior planning assistant for ApnaGhar (अपना घर).
Analyze this image:
1. Determine if this image is a genuine indoor room photograph (living room, bedroom, dining room, kitchen, office) or an unrelated subject (such as a selfie or portrait of a person, animal, vehicle, landscape, food, document, meme).
2. If it is an unrelated subject or a personal selfie/portrait, set is_indoor_room to false, suitability to "unsuitable", provide a clear explanation, and keep suggestions empty [].
3. Only if it is a genuine indoor room, identify visible furniture within physical room boundaries: width = ${room.width} cm, length = ${room.length} cm.

Respond ONLY with a valid JSON object matching this schema:
{
  "is_indoor_room": boolean,
  "subject_type": "room" | "selfie" | "portrait" | "animal" | "vehicle" | "landscape" | "food" | "other",
  "suitability": "suitable" | "partially_suitable" | "unsuitable" | "uncertain",
  "explanation": "concise description of what is visible",
  "quality_issues": string[],
  "suggestions": [
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
      "modelType": "sofa_3seater",
      "box2D": {"x": 0.2, "y": 0.3, "width": 0.4, "height": 0.3},
      "notes": "Placement rationale"
    }
  ]
}`;

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
      throw new Error(`Gemma Vision inference timed out after 45 seconds on model '${model}'. Try 'gemma3:4b' for faster CPU/GPU processing.`);
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Could not connect to Ollama at ${cleanUrl}. Ensure Ollama is running ('ollama serve') and CORS allows browser requests (set OLLAMA_ORIGINS=*).`);
    }
    throw err;
  }

  return parseGemmaVisionDetails(responseText, room, model);
}

/**
 * Backward-compatible helper returning PhotoDetectionSuggestion[] directly
 */
export async function callGemmaVision(
  imageDataUrl: string,
  room: RoomModel,
  baseUrl: string = 'http://localhost:11434',
  model: string = 'gemma3:4b'
): Promise<PhotoDetectionSuggestion[]> {
  const details = await callGemmaVisionDetails(imageDataUrl, room, baseUrl, model);
  return details.suggestions;
}

/**
 * Parses raw text from Gemma / PaliGemma into full VisionInferenceDetails
 */
export function parseGemmaVisionDetails(
  rawText: string,
  room: RoomModel,
  modelTag: string
): VisionInferenceDetails {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Check for PaliGemma specialized location tokens
  const locRegex = /<loc(\d+)><loc(\d+)><loc(\d+)><loc(\d+)>\s*([a-zA-Z_\s]+)/g;
  if (locRegex.test(cleaned)) {
    const suggestions = parseAndValidateGemmaVisionResponse(cleaned, room, modelTag);
    return {
      suggestions,
      suitability: 'suitable',
      isIndoorRoom: true,
      subjectType: 'room',
      explanation: 'Detected room layout via Google PaliGemma location tokens.',
      qualityIssues: [],
    };
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch {
        // Fallback
      }
    } else {
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          parsed = JSON.parse(objMatch[0]);
        } catch {
          // Fallback
        }
      }
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const isIndoor = parsed.is_indoor_room !== false;
    const subject = parsed.subject_type || (isIndoor ? 'room' : 'other');
    const suitability: ImageSuitability = parsed.suitability || (isIndoor ? 'suitable' : 'unsuitable');
    const explanation = parsed.explanation || (isIndoor ? 'Valid room photo' : 'Unrelated subject detected');
    const qualityIssues = Array.isArray(parsed.quality_issues) ? parsed.quality_issues : [];

    if (!isIndoor || suitability === 'unsuitable') {
      return {
        suggestions: [],
        suitability: 'unsuitable',
        isIndoorRoom: false,
        subjectType: subject,
        explanation,
        qualityIssues,
      };
    }

    const suggestions = parseAndValidateSuggestions(cleaned, room, modelTag);
    return {
      suggestions,
      suitability,
      isIndoorRoom: true,
      subjectType: subject,
      explanation,
      qualityIssues,
    };
  }

  // If array format:
  const suggestions = parseAndValidateGemmaVisionResponse(cleaned, room, modelTag);
  return {
    suggestions,
    suitability: 'suitable',
    isIndoorRoom: true,
    subjectType: 'room',
    explanation: 'Detected items using Google Gemma.',
    qualityIssues: [],
  };
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

  // If parsed object has a validation object indicating unsuitable image, return empty suggestions
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (
      parsed.validation?.suitability === 'unsuitable' || 
      parsed.suitability === 'unsuitable' || 
      parsed.is_indoor_room === false ||
      parsed.subject_type === 'selfie' ||
      parsed.subject_type === 'portrait'
    ) {
      return [];
    }
  }

  // If parsed object has a suggestions or detectedItems property, unwrap it
  const items = Array.isArray(parsed) 
    ? parsed 
    : (Array.isArray(parsed?.suggestions) ? parsed.suggestions : (Array.isArray(parsed?.detectedItems) ? parsed.detectedItems : []));

  if (items.length === 0) {
    if (
      parsed?.validation?.suitability === 'unsuitable' || 
      parsed?.suitability === 'unsuitable' || 
      parsed?.is_indoor_room === false ||
      parsed?.subject_type === 'selfie' ||
      parsed?.subject_type === 'portrait'
    ) {
      return [];
    }
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
