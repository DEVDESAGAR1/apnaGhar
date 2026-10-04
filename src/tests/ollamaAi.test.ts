import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  checkOllamaConnection, 
  callOllamaVision, 
  analyzeRoomPhoto, 
  parseAndValidateSuggestions,
  AI_PROVIDERS
} from '../utils/aiVision';
import { evaluateRoomFit } from '../utils/fitEngine';
import type { RoomModel, FurnitureItem } from '../types/model';

describe('ApnaGhar (अपना घर) — Ollama Local AI & Vision Suite', () => {
  const sampleRoom: RoomModel = {
    id: 'test-room-1',
    name: 'Sample Living Room',
    type: 'living',
    floorId: 'floor-1',
    width: 480,
    length: 560,
    height: 270,
    wallThickness: 15,
    openings: [],
    furniture: [],
  };

  const sampleImageDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...mockbase64';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes transparent provider capabilities with offline and license metadata', () => {
    expect(AI_PROVIDERS).toHaveLength(4);
    const heuristic = AI_PROVIDERS.find(p => p.id === 'local-heuristic');
    const ollama = AI_PROVIDERS.find(p => p.id === 'local-ollama');
    const gemma = AI_PROVIDERS.find(p => p.id === 'local-gemma');
    const gemini = AI_PROVIDERS.find(p => p.id === 'cloud-gemini');

    expect(heuristic?.offlineCapable).toBe(true);
    expect(heuristic?.requiresApiKey).toBe(false);

    expect(gemma?.offlineCapable).toBe(true);
    expect(gemma?.requiresApiKey).toBe(false);
    expect(gemma?.modelLicense).toContain('Gemma Terms of Use');

    expect(ollama?.offlineCapable).toBe(true);
    expect(ollama?.requiresApiKey).toBe(false);
    expect(ollama?.modelLicense).toContain('Apache 2.0');

    expect(gemini?.offlineCapable).toBe(false);
    expect(gemini?.requiresApiKey).toBe(true);
  });

  it('successfully checks Ollama connection and detects installed vision models', async () => {
    const mockTagsResponse = {
      models: [
        { name: 'llama3.2-vision:latest', size: 7500000000 },
        { name: 'llava:7b', size: 4500000000 },
        { name: 'mistral:latest', size: 4100000000 },
      ],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockTagsResponse,
    } as Response);

    const status = await checkOllamaConnection('http://localhost:11434', 'llama3.2-vision');
    expect(status.connected).toBe(true);
    expect(status.models).toContain('llama3.2-vision:latest');
    expect(status.models).toContain('llava:7b');
    expect(status.modelInstalled).toBe(true);
  });

  it('handles Ollama connection failure gracefully with actionable diagnostics', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );

    const status = await checkOllamaConnection('http://localhost:11434', 'llama3.2-vision');
    expect(status.connected).toBe(false);
    expect(status.modelInstalled).toBe(false);
    expect(status.error).toContain('Connection refused');
    expect(status.error).toContain('OLLAMA_ORIGINS');
  });

  it('parses structured JSON suggestions, clamps physical dimensions and bounds', () => {
    const mockOllamaResponse = JSON.stringify([
      {
        label: 'Sectional Sofa',
        category: 'seating',
        estimatedWidth: 9999, // Intentional excessive dimension to test clamping
        estimatedDepth: 95,
        estimatedHeight: 85,
        suggestedX: -100, // Intentional negative position to test boundary clamping
        suggestedY: 300,
        rotation: 0,
        confidence: 0.88,
        color: '#3d5a80',
        modelType: 'sofa_3seater',
        notes: 'Spotted against main wall',
      },
      {
        label: 'Coffee Table',
        category: 'table',
        estimatedWidth: 120,
        estimatedDepth: 60,
        estimatedHeight: 45,
        suggestedX: 240,
        suggestedY: 200,
        rotation: 0,
        confidence: 0.82,
        color: '#bc6c25',
        modelType: 'coffee_table',
      },
    ]);

    const suggestions = parseAndValidateSuggestions(mockOllamaResponse, sampleRoom, 'llama3.2-vision');
    expect(suggestions).toHaveLength(2);

    // Clamping assertions
    expect(suggestions[0].estimatedWidth).toBeLessThanOrEqual(350); // Clamped
    expect(suggestions[0].suggestedX).toBeGreaterThanOrEqual(suggestions[0].estimatedWidth / 2); // Clamped within room
    expect(suggestions[0].modelType).toBe('sofa_3seater');
    expect(suggestions[0].notes).toContain('llama3.2-vision');
  });

  it('handles markdown code fences in Ollama vision responses', () => {
    const fencedResponse = '```json\n[\n  {\n    "label": "Armchair",\n    "category": "seating",\n    "estimatedWidth": 85,\n    "estimatedDepth": 80,\n    "estimatedHeight": 85,\n    "suggestedX": 100,\n    "suggestedY": 150,\n    "modelType": "armchair"\n  }\n]\n```';

    const suggestions = parseAndValidateSuggestions(fencedResponse, sampleRoom, 'llava:7b');
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toBe('Armchair');
    expect(suggestions[0].modelType).toBe('armchair');
  });

  it('throws descriptive error on malformed Ollama responses without silently falling back', () => {
    const invalidText = 'I am an AI and I see a room but I cannot output JSON.';
    expect(() => parseAndValidateSuggestions(invalidText, sampleRoom, 'llama3.2-vision')).toThrow();
  });

  it('enforces cloud-consent guard and blocks Gemini calls when consent is missing', async () => {
    await expect(
      analyzeRoomPhoto(sampleImageDataUrl, {
        provider: 'cloud-gemini',
        room: sampleRoom,
        consentExternalAi: false, // Consent NOT given
        apiKey: 'valid-api-key-here',
      })
    ).rejects.toThrow('Explicit user consent is required');
  });

  it('routes to local-ollama when requested and preserves provable local inference provenance', async () => {
    const mockOutput = JSON.stringify([
      {
        label: 'Queen Bed',
        category: 'bed',
        estimatedWidth: 160,
        estimatedDepth: 200,
        estimatedHeight: 90,
        suggestedX: 240,
        suggestedY: 280,
        rotation: 0,
        confidence: 0.9,
        color: '#293241',
        modelType: 'bed_queen',
      },
    ]);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: mockOutput }),
    } as Response);

    const result = await analyzeRoomPhoto(sampleImageDataUrl, {
      provider: 'local-ollama',
      room: sampleRoom,
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2-vision',
    });

    expect(result.source).toBe('local-ollama');
    expect(result.providerDetails?.inferenceType).toBe('local');
    expect(result.providerDetails?.modelName).toBe('llama3.2-vision');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].modelType).toBe('bed_queen');
  });

  it('guarantees deterministic geometric spatial checks are independent of AI output', () => {
    // When an unconfirmed AI item is added to room, fit check evaluates it with REVIEW rather than blindly passing
    const unconfirmedItem: FurnitureItem = {
      id: 'ai-item-1',
      name: 'Estimated Sofa',
      category: 'seating',
      width: 220,
      depth: 95,
      height: 85,
      x: 240,
      y: 280,
      z: 0,
      rotation: 0,
      color: '#3d5a80',
      modelType: 'sofa_3seater',
      clearances: {},
      provenance: 'ai-suggestion',
      isConfirmed: false, // Unconfirmed
    };

    const report = evaluateRoomFit(sampleRoom, [unconfirmedItem]);
    // Must be REVIEW because item is an unconfirmed estimate
    expect(report.overallStatus).toBe('REVIEW');
    const confidenceCheck = report.checks.find(c => c.category === 'measurement-confidence');
    expect(confidenceCheck).toBeDefined();
    expect(confidenceCheck?.status).toBe('REVIEW');

    // Confirming item makes spatial fit evaluate deterministically as PASS (if well-placed)
    const confirmedItem: FurnitureItem = { ...unconfirmedItem, isConfirmed: true, provenance: 'manual' };
    const confirmedReport = evaluateRoomFit(sampleRoom, [confirmedItem]);
    expect(confirmedReport.overallStatus).toBe('PASS');
  });
});
