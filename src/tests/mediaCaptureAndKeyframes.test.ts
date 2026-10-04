import { describe, it, expect } from 'vitest';
import { 
  calculateKeyframeTimestamps, 
  getSupportedVideoMimeType, 
  extractKeyframesFromVideoBlob 
} from '../utils/videoKeyframes';

describe('Video Walkthrough & Keyframe Utilities (Privacy & Media)', () => {
  it('detects a valid supported video mime type', () => {
    const mime = getSupportedVideoMimeType();
    expect(mime).toBeDefined();
    expect(typeof mime).toBe('string');
    expect(mime.startsWith('video/')).toBe(true);
  });

  it('calculates evenly spaced keyframe timestamps across video duration', () => {
    const timestamps = calculateKeyframeTimestamps(20, 4);
    expect(timestamps.length).toBe(4);
    // Timestamps should be strictly ascending within duration bounds
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeLessThan(timestamps[i + 1]);
      expect(timestamps[i]).toBeGreaterThanOrEqual(0.1);
      expect(timestamps[i]).toBeLessThanOrEqual(20);
    }
  });

  it('handles edge case of single target frame or invalid duration', () => {
    const single = calculateKeyframeTimestamps(15, 1);
    expect(single.length).toBe(1);
    expect(single[0]).toBe(7.5);

    const zeroDuration = calculateKeyframeTimestamps(0, 4);
    expect(zeroDuration.length).toBe(4);
  });

  it('throws an informative error if video blob is empty', async () => {
    const emptyBlob = new Blob([], { type: 'video/webm' });
    await expect(extractKeyframesFromVideoBlob(emptyBlob, 4)).rejects.toThrow(
      'Cannot extract keyframes: empty or invalid video recording.'
    );
  });

  it('extracts mock keyframes in Node/test environment safely', async () => {
    const dummyBlob = new Blob(['test-video-data-bytes'], { type: 'video/webm' });
    const frames = await extractKeyframesFromVideoBlob(dummyBlob, 3);
    expect(frames.length).toBe(3);
    expect(frames[0].selected).toBe(true);
    expect(frames[0].dataUrl).toContain('data:image/');
    expect(frames[0].timestamp).toBeGreaterThan(0);
  });
});
