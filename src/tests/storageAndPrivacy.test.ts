import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createNewProject, 
  saveProject, 
  loadActiveProject, 
  exportProjectJson, 
  importProjectJson, 
  purgePrivatePhoto,
  createSampleDemoProject
} from '../utils/storage';
import { FitProject } from '../types/model';

// Mock localStorage for test environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  },
  key: (idx: number) => Object.keys(mockStorage)[idx] || null,
  length: 0,
};

describe('Storage & Privacy Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and reloads project state faithfully', () => {
    const project = createNewProject('My Studio', 380, 420);
    project.furniture.push({
      id: 'test-item-1',
      name: 'Test Desk',
      category: 'desk',
      width: 120,
      depth: 60,
      height: 75,
      x: 100,
      y: 100,
      z: 0,
      rotation: 0,
      color: '#000000',
      modelType: 'desk',
      clearances: {},
      provenance: 'manual',
      isConfirmed: true,
    });

    saveProject(project);

    const reloaded = loadActiveProject();
    expect(reloaded).not.toBeNull();
    expect(reloaded.id).toBe(project.id);
    expect(reloaded.name).toBe('My Studio');
    expect(reloaded.room.width).toBe(380);
    expect(reloaded.furniture.length).toBe(1);
    expect(reloaded.furniture[0].name).toBe('Test Desk');
  });

  it('STRIPS private room photograph by default upon export', () => {
    const project = createNewProject('Private Room', 400, 500);
    // User attached a sensitive home photo
    project.photoContext = {
      hasPhoto: true,
      photoDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
      photoName: 'my_private_bedroom.jpg',
      privacyConsentAcknowledged: true,
    };

    // Default export without flag
    const exportedJson = exportProjectJson(project);
    const parsed = JSON.parse(exportedJson);

    expect(parsed.photoContext.photoDataUrl).toBeUndefined();
    expect(parsed.photoContext.hasPhoto).toBe(true); // metadata preserved, bytes stripped!
  });

  it('includes private photo in export ONLY when user explicitly checks opt-in', () => {
    const project = createNewProject('Private Room', 400, 500);
    const privateData = 'data:image/jpeg;base64,SECRET_PHOTO_BYTES';
    project.photoContext = {
      hasPhoto: true,
      photoDataUrl: privateData,
      photoName: 'room.jpg',
      privacyConsentAcknowledged: true,
    };

    // Explicit opt-in export
    const exportedJson = exportProjectJson(project, true);
    const parsed = JSON.parse(exportedJson);

    expect(parsed.photoContext.photoDataUrl).toBe(privateData);
  });

  it('purges room photo permanently on demand', () => {
    const project = createNewProject('Living', 400, 400);
    project.photoContext = {
      hasPhoto: true,
      photoDataUrl: 'data:image/jpeg;base64,abc12345',
      photoName: 'temp.jpg',
      privacyConsentAcknowledged: true,
    };
    saveProject(project);

    const purged = purgePrivatePhoto(project);
    expect(purged.photoContext.hasPhoto).toBe(false);
    expect(purged.photoContext.photoDataUrl).toBeUndefined();

    // Verify localStorage reflects purged state
    const loaded = loadActiveProject();
    expect(loaded.photoContext.hasPhoto).toBe(false);
    expect(loaded.photoContext.photoDataUrl).toBeUndefined();
  });

  it('validates imported JSON structure and guards against malformed input', () => {
    expect(() => importProjectJson('not valid json')).toThrow();
    expect(() => importProjectJson('{"empty": true}')).toThrow('Invalid FitCheck project file');

    const validExport = exportProjectJson(createSampleDemoProject('living'));
    const imported = importProjectJson(validExport);
    expect(imported.room.width).toBeGreaterThan(0);
    expect(imported.furniture.length).toBeGreaterThan(0);
  });
});
