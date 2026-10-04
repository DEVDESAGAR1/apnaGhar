import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  checkGemmaConnection, 
  callGemmaVision, 
  parseAndValidateGemmaVisionResponse,
  analyzeRoomPhoto 
} from '../utils/aiVision';
import type { RoomModel } from '../types/model';

describe('Google Gemma Vision (PaliGemma) Integration', () => {
  const sampleRoom: RoomModel = {
    id: 'room-gemma-test',
    name: 'Drawing Room',
    type: 'living',
    floorId: 'floor-g',
    width: 480, // cm
    length: 360, // cm
    height: 270, // cm
    wallThickness: 15,
    openings: [],
    furniture: [],
    finishes: {
      wallColor: '#F5F2EB',
      wallFinish: 'matte',
      floorType: 'hardwood_oak',
      floorColor: '#C49A6C',
    },
  };

  const validBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid image data URLs without base64 prefix', async () => {
    await expect(
      callGemmaVision('invalid-data-url', sampleRoom, 'http://localhost:11434', 'paligemma:3b')
    ).rejects.toThrow('Invalid image format: Base64 data URL required for Gemma Vision.');
  });

  it('parses valid structured JSON array from Gemma vision models', () => {
    const rawGemmaJson = JSON.stringify([
      {
        label: 'Three-Seater Sofa',
        category: 'seating',
        estimatedWidth: 220,
        estimatedDepth: 95,
        estimatedHeight: 85,
        suggestedX: 200,
        suggestedY: 150,
        rotation: 0,
        confidence: 0.92,
        color: '#3d5a80',
        modelType: 'sofa_3seater',
        notes: 'Placed along East wall'
      },
      {
        label: 'Coffee Table',
        category: 'table',
        estimatedWidth: 120,
        estimatedDepth: 60,
        estimatedHeight: 45,
        suggestedX: 200,
        suggestedY: 230,
        rotation: 0,
        confidence: 0.88,
        color: '#c49a6c',
        modelType: 'coffee_table',
        notes: 'Centered in front of sofa'
      }
    ]);

    const suggestions = parseAndValidateGemmaVisionResponse(rawGemmaJson, sampleRoom, 'paligemma:3b');
    expect(suggestions.length).toBe(2);
    expect(suggestions[0].label).toBe('Three-Seater Sofa');
    expect(suggestions[0].category).toBe('seating');
    expect(suggestions[0].estimatedWidth).toBe(220);
    expect(suggestions[0].suggestedX).toBe(200);
    expect(suggestions[0].suggestedY).toBe(150);

    expect(suggestions[1].label).toBe('Coffee Table');
    expect(suggestions[1].category).toBe('table');
  });

  it('parses JSON enclosed in markdown code blocks from Gemma responses', () => {
    const markdownFenced = "```json\n" + JSON.stringify([
      {
        label: 'Armchair',
        category: 'seating',
        estimatedWidth: 85,
        estimatedDepth: 85,
        estimatedHeight: 80,
        suggestedX: 100,
        suggestedY: 100,
        modelType: 'armchair',
        confidence: 0.85
      }
    ]) + "\n```";

    const suggestions = parseAndValidateGemmaVisionResponse(markdownFenced, sampleRoom, 'paligemma:3b');
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].label).toBe('Armchair');
    expect(suggestions[0].category).toBe('seating');
  });

  it('parses Google PaliGemma native location tokens (<locYYYY><locXXXX>) into spatial bounding boxes', () => {
    // PaliGemma detection format: <loc{y1}><loc{x1}><loc{y2}><loc{x2}> label
    // Normalized 0..1024
    const rawTokens = '<loc200><loc150><loc600><loc700> sofa\n<loc650><loc250><loc850><loc550> table';

    const suggestions = parseAndValidateGemmaVisionResponse(rawTokens, sampleRoom, 'paligemma:3b');
    expect(suggestions.length).toBe(2);

    // Sofa
    expect(suggestions[0].label).toBe('Sofa');
    expect(suggestions[0].category).toBe('seating');
    expect(suggestions[0].box2D).toBeDefined();
    expect(suggestions[0].box2D?.x).toBeCloseTo(150 / 1024, 2);
    expect(suggestions[0].box2D?.y).toBeCloseTo(200 / 1024, 2);
    expect(suggestions[0].suggestedX).toBeGreaterThan(0);
    expect(suggestions[0].suggestedX).toBeLessThan(sampleRoom.width);

    // Table
    expect(suggestions[1].label).toBe('Table');
    expect(suggestions[1].category).toBe('table');
    expect(suggestions[1].box2D?.x).toBeCloseTo(250 / 1024, 2);
  });

  it('enforces physical dimension clamping and room boundary constraints', () => {
    const nonPhysicalJson = JSON.stringify([
      {
        label: 'Oversized Item',
        category: 'storage',
        estimatedWidth: 800, // Impossibly large -> should clamp to 350cm
        estimatedDepth: -50, // Negative -> should clamp to 30cm
        estimatedHeight: 500, // Too tall -> should clamp to 240cm
        suggestedX: 9999, // Outside room -> should clamp inside room bounds
        suggestedY: -200, // Outside room -> should clamp inside room bounds
        modelType: 'unknown_type' // Invalid -> fallback to safe modelType
      }
    ]);

    const suggestions = parseAndValidateGemmaVisionResponse(nonPhysicalJson, sampleRoom, 'paligemma:3b');
    expect(suggestions.length).toBe(1);
    const item = suggestions[0];

    expect(item.estimatedWidth).toBe(350);
    expect(item.estimatedDepth).toBe(30);
    expect(item.estimatedHeight).toBe(240);

    // Position must be strictly inside [width/2, room.width - width/2]
    expect(item.suggestedX).toBeLessThanOrEqual(sampleRoom.width - item.estimatedWidth / 2);
    expect(item.suggestedY).toBeGreaterThanOrEqual(item.estimatedDepth / 2);
    expect(item.modelType).toBe('sofa_3seater'); // Default fallback
  });

  it('throws informative setup instructions if PaliGemma model returns HTTP 404 in Ollama', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    }));

    await expect(
      callGemmaVision(validBase64Image, sampleRoom, 'http://localhost:11434', 'paligemma:3b')
    ).rejects.toThrow("Gemma Vision model 'paligemma:3b' not found in Ollama. Run: 'ollama run paligemma:3b'");
  });

  it('routes to local-gemma when provider is set to local-gemma in analyzeRoomPhoto', async () => {
    const mockJson = JSON.stringify([
      {
        label: 'Queen Bed',
        category: 'bed',
        estimatedWidth: 160,
        estimatedDepth: 200,
        estimatedHeight: 110,
        suggestedX: 240,
        suggestedY: 180,
        modelType: 'bed_queen',
        confidence: 0.90,
      }
    ]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      response: mockJson
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const result = await analyzeRoomPhoto(validBase64Image, {
      provider: 'local-gemma',
      room: sampleRoom,
      gemmaModel: 'paligemma:3b',
    });

    expect(result.source).toBe('local-gemma');
    expect(result.modelLicense).toContain('Gemma Terms of Use');
    expect(result.disclaimer).toContain('Google PaliGemma');
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].label).toBe('Queen Bed');
    expect(result.providerDetails?.modelName).toBe('paligemma:3b');
    expect(result.providerDetails?.inferenceType).toBe('local');
  });

  it('checks Gemma connection against local Ollama API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      models: [
        { name: 'paligemma:3b' },
        { name: 'llama3.2:latest' }
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const status = await checkGemmaConnection('http://localhost:11434', 'paligemma:3b');
    expect(status.connected).toBe(true);
    expect(status.modelInstalled).toBe(true);
    expect(status.models).toContain('paligemma:3b');
  });
});
