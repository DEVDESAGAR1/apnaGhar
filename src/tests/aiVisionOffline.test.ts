import { describe, it, expect, vi } from 'vitest';
import { analyzeRoomPhoto } from '../utils/aiVision';
import { RoomModel } from '../types/model';

describe('AI Vision Offline & Privacy Suite', () => {
  const room: RoomModel = {
    name: 'Test Room',
    width: 400,
    length: 500,
    height: 260,
    wallThickness: 15,
    openings: [],
  };

  const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('runs 100% locally when external AI consent is disabled', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await analyzeRoomPhoto(dummyImage, {
      consentExternalAi: false,
      apiKey: undefined,
      room,
    });

    // Verify zero network calls were made
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.source).toBe('local-heuristic-engine');
    expect(result.suggestions.length).toBeGreaterThan(0);

    // Verify every suggestion is marked as photo-estimate
    for (const sug of result.suggestions) {
      expect(sug.confidence).toBeLessThan(1.0);
      expect(sug.estimatedWidth).toBeGreaterThan(0);
      expect(sug.estimatedDepth).toBeGreaterThan(0);
    }

    fetchSpy.mockRestore();
  });

  it('falls back gracefully to local engine if external API throws or fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network offline or rate limit'));

    const result = await analyzeRoomPhoto(dummyImage, {
      consentExternalAi: true,
      apiKey: 'test-invalid-key-12345678',
      room,
    });

    expect(result.source).toBe('local-heuristic-engine');
    expect(result.suggestions.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
