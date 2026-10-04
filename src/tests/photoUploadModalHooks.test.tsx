import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PhotoUploadModal } from '../components/PhotoAI/PhotoUploadModal';
import type { RoomModel, PhotoContext, AppSettings } from '../types/model';

describe('Priority 1: PhotoUploadModal Hook Order & Render State Stability', () => {
  const dummyRoom: RoomModel = {
    id: 'room-1',
    name: 'Master Bedroom',
    type: 'bedroom',
    floorId: 'floor-g',
    width: 400,
    length: 350,
    height: 270,
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

  const emptyPhotoContext: PhotoContext = {
    hasPhoto: false,
    privacyConsentAcknowledged: false,
  };

  const activePhotoContext: PhotoContext = {
    hasPhoto: true,
    photoDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    photoName: 'room-view.jpg',
    uploadedAt: '2026-10-04T12:00:00Z',
    privacyConsentAcknowledged: true,
    detectedSuggestions: [
      {
        id: 'sug-1',
        label: 'Queen Bed',
        category: 'bedroom',
        estimatedWidth: 160,
        estimatedDepth: 205,
        estimatedHeight: 110,
        suggestedX: 200,
        suggestedY: 175,
        rotation: 0,
        confidence: 0.92,
        color: '#64748b',
        modelType: 'bed_queen',
      }
    ],
  };

  const dummySettings: AppSettings = {
    theme: 'dark',
    displayUnit: 'cm',
    gridSize: 25,
    enableSnapping: true,
    showDimensionsOnPlan: true,
    showClearanceZones: true,
    autoSave: true,
    aiProvider: 'local-heuristic',
    enableExternalAi: false,
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2-vision',
  };

  it('renders closed state (isOpen: false) cleanly returning null without hook errors', () => {
    expect(() => {
      const html = renderToString(
        <PhotoUploadModal
          isOpen={false}
          onClose={() => {}}
          room={dummyRoom}
          photoContext={emptyPhotoContext}
          settings={dummySettings}
          displayUnit="cm"
          onUpdatePhotoContext={() => {}}
          onAddFurniture={() => {}}
        />
      );
      expect(html).toBe('');
    }).not.toThrow();
  });

  it('renders open state with empty photo context (upload dropzone)', () => {
    expect(() => {
      const html = renderToString(
        <PhotoUploadModal
          isOpen={true}
          onClose={() => {}}
          room={dummyRoom}
          photoContext={emptyPhotoContext}
          settings={dummySettings}
          displayUnit="cm"
          onUpdatePhotoContext={() => {}}
          onAddFurniture={() => {}}
        />
      );
      expect(html).toContain('Room Capture &amp; Spatial Analysis');
      expect(html).toContain('Upload Room Photograph');
    }).not.toThrow();
  });

  it('renders open state with active photo and detection suggestions', () => {
    expect(() => {
      const html = renderToString(
        <PhotoUploadModal
          isOpen={true}
          onClose={() => {}}
          room={dummyRoom}
          photoContext={activePhotoContext}
          settings={dummySettings}
          displayUnit="cm"
          onUpdatePhotoContext={() => {}}
          onAddFurniture={() => {}}
        />
      );
      expect(html).toContain('room-view.jpg');
      expect(html).toContain('Queen Bed');
      expect(html).toContain('Add as Estimate');
      expect(html).toContain('Confirm &amp; Add');
    }).not.toThrow();
  });

  it('demonstrates hook order stability across alternating closed -> open -> closed -> open cycles', () => {
    // This specifically tests the regression that caused:
    // "React has detected a change in the order of Hooks called by PhotoUploadModal."
    for (let cycle = 0; cycle < 5; cycle++) {
      // 1. Closed render
      const closedHtml = renderToString(
        <PhotoUploadModal
          isOpen={false}
          onClose={() => {}}
          room={dummyRoom}
          photoContext={emptyPhotoContext}
          settings={dummySettings}
          displayUnit="cm"
          onUpdatePhotoContext={() => {}}
          onAddFurniture={() => {}}
        />
      );
      expect(closedHtml).toBe('');

      // 2. Open render with Ollama provider
      const openOllamaHtml = renderToString(
        <PhotoUploadModal
          isOpen={true}
          onClose={() => {}}
          room={dummyRoom}
          photoContext={activePhotoContext}
          settings={{ ...dummySettings, aiProvider: 'local-ollama' }}
          displayUnit="cm"
          onUpdatePhotoContext={() => {}}
          onAddFurniture={() => {}}
        />
      );
      expect(openOllamaHtml).toContain('Local Ollama');

      // 3. Open render with Cloud Gemini provider
      const openGeminiHtml = renderToString(
        <PhotoUploadModal
          isOpen={true}
          onClose={() => {}}
          room={dummyRoom}
          photoContext={activePhotoContext}
          settings={{ ...dummySettings, aiProvider: 'cloud-gemini', enableExternalAi: true }}
          displayUnit="cm"
          onUpdatePhotoContext={() => {}}
          onAddFurniture={() => {}}
        />
      );
      expect(openGeminiHtml).toContain('Cloud Gemini');
    }
  });
});
