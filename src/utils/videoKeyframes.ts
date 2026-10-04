/**
 * Video Keyframe Extraction & Media Utilities for ApnaGhar (अपना घर)
 * 
 * Provides privacy-preserving, on-device video frame extraction for vision AI models.
 * Since local and cloud vision models (Ollama, Gemini) consume still images rather than
 * full video streams, this utility samples representative keyframes across the user's
 * room walkthrough recording.
 */

export interface ExtractedKeyframe {
  id: string;
  dataUrl: string;
  timestamp: number;
  label: string;
  selected: boolean;
}

/**
 * Returns the best supported video MIME type for browser MediaRecorder
 */
export function getSupportedVideoMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'video/webm';
  }

  const candidateTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

/**
 * Calculates evenly distributed timestamps across a video duration
 */
export function calculateKeyframeTimestamps(durationSeconds: number, targetCount: number = 4): number[] {
  if (!durationSeconds || durationSeconds <= 0 || !isFinite(durationSeconds)) {
    return [0.5, 1.5, 2.5, 3.5];
  }

  const count = Math.max(1, Math.min(targetCount, 8));
  
  if (count === 1) {
    return [Math.round((durationSeconds * 0.5) * 10) / 10];
  }

  // Margin at start and end to avoid initial camera shake or user pressing stop
  const startMargin = durationSeconds * 0.12;
  const endMargin = durationSeconds * 0.88;
  const step = (endMargin - startMargin) / (count - 1);

  const timestamps: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.max(0.1, Math.min(durationSeconds - 0.1, startMargin + i * step));
    timestamps.push(Math.round(t * 10) / 10);
  }

  return timestamps;
}

/**
 * Extracts representative keyframes from a recorded video Blob using HTML5 Video and Canvas.
 * Operates 100% on-device with zero server transmission.
 */
export async function extractKeyframesFromVideoBlob(
  videoBlob: Blob,
  targetCount: number = 4,
  onProgress?: (progressRatio: number, statusText: string) => void
): Promise<ExtractedKeyframe[]> {
  if (!videoBlob || videoBlob.size === 0) {
    throw new Error('Cannot extract keyframes: empty or invalid video recording.');
  }

  if (typeof document === 'undefined') {
    // Non-browser / Node test environment fallback
    return Array.from({ length: targetCount }).map((_, i) => ({
      id: `frame-mock-${i}`,
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      timestamp: i + 1,
      label: `Keyframe ${i + 1} (${i + 1}s)`,
      selected: true,
    }));
  }

  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  try {
    onProgress?.(0.1, 'Loading video recording...');

    // Wait for video metadata to load to obtain duration and resolution
    await new Promise<void>((resolve, reject) => {
      const handleLoadedMetadata = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error('Failed to load recorded video metadata in browser.'));
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Video loading timed out.'));
      }, 10000);

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        clearTimeout(timeout);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
      video.src = videoUrl;
    });

    let duration = video.duration;
    // WebM recordings in Chrome occasionally report Infinity or NaN duration until sought
    if (!isFinite(duration) || duration <= 0) {
      video.currentTime = 1e101;
      await new Promise(r => setTimeout(r, 100));
      duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        duration = 10; // Fallback safe estimate for brief room walkthrough
      }
    }

    const timestamps = calculateKeyframeTimestamps(duration, targetCount);
    const keyframes: ExtractedKeyframe[] = [];

    const canvas = document.createElement('canvas');
    const width = Math.min(video.videoWidth || 1280, 1920);
    const height = Math.min(video.videoHeight || 720, 1080);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas 2D context unavailable for keyframe rendering.');
    }

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      onProgress?.(0.2 + (i / timestamps.length) * 0.7, `Extracting frame ${i + 1} of ${timestamps.length} (${ts}s)...`);

      // Seek to target timestamp
      await new Promise<void>((resolve, reject) => {
        const handleSeeked = () => {
          cleanup();
          resolve();
        };
        const handleSeekError = () => {
          cleanup();
          reject(new Error(`Failed to seek video to timestamp ${ts}s`));
        };
        const seekTimeout = setTimeout(() => {
          cleanup();
          resolve(); // Resolve on timeout to avoid hanging on a single frame
        }, 3000);

        const cleanup = () => {
          video.removeEventListener('seeked', handleSeeked);
          video.removeEventListener('error', handleSeekError);
          clearTimeout(seekTimeout);
        };

        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('error', handleSeekError);
        video.currentTime = ts;
      });

      // Render frame to canvas and encode as JPEG
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      keyframes.push({
        id: `keyframe-${Date.now()}-${i}`,
        dataUrl,
        timestamp: ts,
        label: `View ${i + 1} (${ts}s)`,
        selected: true,
      });
    }

    onProgress?.(1.0, 'Keyframe extraction complete.');
    return keyframes;
  } finally {
    URL.revokeObjectURL(videoUrl);
    video.src = '';
  }
}
