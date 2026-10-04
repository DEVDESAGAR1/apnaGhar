import { describe, it, expect, vi } from 'vitest';
import { 
  validateImageFile, 
  evaluateSemanticSuitability, 
  UNRELATED_SUBJECT_KEYWORDS,
  INDOOR_ROOM_KEYWORDS,
} from '../utils/imageValidation';
import { 
  buildDetailedAnalysis, 
  analyzeRoomPhoto 
} from '../utils/aiVision';
import type { 
  RoomModel, 
  FurnitureItem, 
  UserDesignGoal, 
  ImageValidationResult 
} from '../types/model';
import { 
  getFurnitureCorners, 
  checkInsideRoomBounds, 
  doPolygonsIntersect 
} from '../utils/geometry';

describe('Stage A: Local File Validation', () => {
  it('rejects null or missing file', async () => {
    const res = await validateImageFile(null as any);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/No file was provided/i);
  });

  it('rejects empty 0-byte file', async () => {
    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const res = await validateImageFile(emptyFile);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/empty \(0 bytes\)/i);
  });

  it('rejects oversized file exceeding 20MB limit', async () => {
    // Mock a 25MB file
    const oversizedFile = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(oversizedFile, 'size', { value: 25 * 1024 * 1024 });
    const res = await validateImageFile(oversizedFile);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/exceeds the 20MB limit/i);
  });

  it('rejects unsupported file formats like PDF and text', async () => {
    const pdfFile = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    const res = await validateImageFile(pdfFile);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Unsupported file format/i);
  });

  it('accepts valid JPEG, PNG, and WebP files and reads dimensions', async () => {
    const validFile = new File([new Uint8Array(1024)], 'living_room.jpg', { type: 'image/jpeg' });
    const res = await validateImageFile(validFile);
    if (!res.valid) {
      console.error('Validation failed unexpectedly:', res.error);
    }
    expect(res.valid).toBe(true);
    expect(res.dimensions).toBeDefined();
    expect(res.dimensions!.width).toBeGreaterThanOrEqual(100);
    expect(res.dimensions!.height).toBeGreaterThanOrEqual(100);
  });
});

describe('Stage B: Semantic Image Suitability Classification', () => {
  it('classifies clear living room and bedroom images as suitable', () => {
    const result = evaluateSemanticSuitability({
      fileName: 'living_room_interior.jpg',
      rawText: 'Spacious modern living room with hardwood floor, couch, and large window.',
      detectedLabels: ['sofa', 'coffee table', 'rug', 'window'],
    });

    expect(result.suitability).toBe('suitable');
    expect(result.isIndoorInterior).toBe(true);
    expect(result.qualityIssues).toHaveLength(0);
    expect(result.recommendedAction).toMatch(/Proceed to/i);
  });

  it('classifies unrelated subjects (portraits, animals, vehicles, landscapes, food) as unsuitable', () => {
    const testCases = [
      { name: 'selfie_portrait.jpg', text: 'close-up face headshot portrait smile', subject: 'portrait' },
      { name: 'my_cat_pet.png', text: 'cute fluffy kitten animal', subject: 'animal' },
      { name: 'sports_car.jpg', text: 'automobile vehicle driving on highway', subject: 'vehicle' },
      { name: 'mountain_landscape.jpg', text: 'scenic outdoor forest sunset clouds nature', subject: 'landscape' },
      { name: 'pizza_dinner.jpg', text: 'delicious food dish plate meal', subject: 'food' },
    ];

    for (const tc of testCases) {
      const result = evaluateSemanticSuitability({
        fileName: tc.name,
        rawText: tc.text,
      });

      expect(result.suitability).toBe('unsuitable');
      expect(result.isIndoorInterior).toBe(false);
      expect(result.explanation).toMatch(/unrelated subject/i);
      expect(result.recommendedAction).toMatch(/upload a photo.*indoor room/i);
    }
  });

  it('classifies dark, blurry, cropped, or obstructed room photos as partially_suitable (does NOT reject as unsuitable)', () => {
    const darkRoom = evaluateSemanticSuitability({
      fileName: 'dark_living_room.jpg',
      rawText: 'Dim bedroom with bed and wardrobe in shadows',
      qualityIssues: ['darkness'],
      detectedLabels: ['bed', 'wardrobe'],
    });

    expect(darkRoom.suitability).toBe('partially_suitable');
    expect(darkRoom.isIndoorInterior).toBe(true);
    expect(darkRoom.qualityIssues).toContain('darkness');
    expect(darkRoom.explanation).toMatch(/limits detection clarity|reduce/i);
    expect(darkRoom.recommendedAction).toMatch(/continue with provisional/i);

    const blurryRoom = evaluateSemanticSuitability({
      fileName: 'motion_blur_room.jpg',
      rawText: 'Living room couch and wall with motion blur',
      qualityIssues: ['blur'],
      detectedLabels: ['couch', 'wall'],
    });
    expect(blurryRoom.suitability).toBe('partially_suitable');
    expect(blurryRoom.qualityIssues).toContain('blur');
  });

  it('classifies ambiguous non-room textures as uncertain', () => {
    const uncertainResult = evaluateSemanticSuitability({
      fileName: 'texture_sample_882.jpg',
      rawText: 'abstract grey surface pattern',
      detectedLabels: [],
    });

    expect(uncertainResult.suitability).toBe('uncertain');
    expect(uncertainResult.isIndoorInterior).toBe(false);
    expect(uncertainResult.recommendedAction).toMatch(/wider-angle photograph/i);
  });
});

describe('Unsuitable Image Recommendations Suppression', () => {
  const dummyRoom: RoomModel = {
    id: 'room-1',
    name: 'Main Living Room',
    type: 'living',
    width: 450,
    length: 550,
    height: 280,
    furniture: [],
    openings: [{ id: 'door-1', type: 'door', wall: 'south', offset: 80, width: 90, height: 210, swingDirection: 'inward' }],
  };

  it('strictly blocks room recommendations and detected items when suitability is unsuitable', () => {
    const unsuitableValidation: ImageValidationResult = {
      validFile: true,
      suitability: 'unsuitable',
      isIndoorInterior: false,
      qualityIssues: ['unrelated_portrait'],
      explanation: 'Image shows a portrait face rather than an indoor room.',
      recommendedAction: 'Please upload a photo of an indoor room.',
    };

    const analysis = buildDetailedAnalysis({
      validation: unsuitableValidation,
      suggestions: [
        {
          id: 'sug-fake',
          label: 'Hallucinated Sofa',
          category: 'seating',
          estimatedWidth: 200,
          estimatedDepth: 90,
          estimatedHeight: 80,
          suggestedX: 200,
          suggestedY: 200,
          rotation: 0,
          confidence: 0.9,
          color: '#fff',
          modelType: 'sofa',
        }
      ],
      room: dummyRoom,
    });

    // Recommendations and items MUST be empty
    expect(analysis.detectedItems).toHaveLength(0);
    expect(analysis.recommendations).toHaveLength(0);
    expect(analysis.existingFurnitureReview).toHaveLength(0);
    expect(analysis.measurementChecklist).toHaveLength(0);
  });

  it('analyzeRoomPhoto halts immediately and returns zero suggestions for unsuitable images', async () => {
    const dummyDataUrl = 'data:image/jpeg;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    
    const result = await analyzeRoomPhoto(dummyDataUrl, {
      room: dummyRoom,
      provider: 'local-heuristic',
      consentExternalAi: false,
      fileName: 'cute_puppy_pet.jpg', // Unrelated subject
    });

    expect(result.validation.suitability).toBe('unsuitable');
    expect(result.suggestions).toHaveLength(0);
    expect(result.detailedAnalysis.recommendations).toHaveLength(0);
  });
});

describe('Existing Furniture Review & Prioritizing Owned Pieces', () => {
  const roomWithFurniture: RoomModel = {
    id: 'room-review',
    name: 'Living Room',
    type: 'living',
    width: 500,
    length: 600,
    height: 280,
    furniture: [
      {
        id: 'f-sofa-door',
        name: 'Existing 3-Seater Sofa',
        category: 'seating',
        width: 220,
        depth: 95,
        height: 85,
        x: 80, // Placed directly near south door at offset 80
        y: 570,
        z: 0,
        rotation: 0,
        color: '#555',
        modelType: 'sofa',
        clearances: { front: 50 },
        provenance: 'manual',
        isConfirmed: true,
      },
      {
        id: 'f-bookshelf-wall',
        name: 'Existing Tall Bookshelf',
        category: 'storage',
        width: 100,
        depth: 38,
        height: 200,
        x: 50,
        y: 200,
        z: 0,
        rotation: 0,
        color: '#777',
        modelType: 'bookcase',
        clearances: { front: 40 },
        provenance: 'manual',
        isConfirmed: true,
      }
    ],
    openings: [
      { id: 'door-1', type: 'door', wall: 'south', offset: 80, width: 90, height: 210, swingDirection: 'inward' }
    ]
  };

  it('evaluates existing furniture and identifies obstructive placement near door swing', () => {
    const validation: ImageValidationResult = {
      validFile: true,
      suitability: 'suitable',
      isIndoorInterior: true,
      qualityIssues: [],
      explanation: 'Clear room photograph',
      recommendedAction: 'Review layout',
    };

    const analysis = buildDetailedAnalysis({
      validation,
      suggestions: [],
      room: roomWithFurniture,
    });

    expect(analysis.existingFurnitureReview).toHaveLength(2);

    const sofaReview = analysis.existingFurnitureReview.find(r => r.name.includes('Sofa'));
    expect(sofaReview).toBeDefined();
    expect(sofaReview!.placementStatus).toBe('obstructive');
    expect(sofaReview!.recommendation).toBe('move');
    expect(sofaReview!.reason).toMatch(/door swing clearance zone/i);

    const bookshelfReview = analysis.existingFurnitureReview.find(r => r.name.includes('Bookshelf'));
    expect(bookshelfReview).toBeDefined();
    expect(bookshelfReview!.placementStatus).toBe('useful');
    expect(bookshelfReview!.recommendation).toBe('keep');
  });

  it('suggests moving or repositioning rather than needlessly replacing existing pieces', () => {
    const validation: ImageValidationResult = {
      validFile: true,
      suitability: 'suitable',
      isIndoorInterior: true,
      qualityIssues: [],
      explanation: 'Clear room photo',
      recommendedAction: 'Review suggestions',
    };

    const analysis = buildDetailedAnalysis({
      validation,
      suggestions: [],
      room: roomWithFurniture,
    });

    const hasKeepOrMove = analysis.existingFurnitureReview.every(r => 
      r.recommendation === 'keep' || r.recommendation === 'move' || r.recommendation === 'reposition'
    );
    expect(hasKeepOrMove).toBe(true);

    // No existing items should be hastily tagged as damaged or poor quality
    for (const r of analysis.existingFurnitureReview) {
      expect(r.reason).not.toMatch(/damaged|poor quality|ugly/i);
    }
  });
});

describe('Personalized Recommendations & User Design Goals', () => {
  const baseRoom: RoomModel = {
    id: 'room-goals',
    name: 'Flex Room',
    type: 'living',
    width: 400,
    length: 500,
    height: 270,
    furniture: [
      {
        id: 'sofa-1',
        name: 'Sectional Sofa',
        category: 'seating',
        width: 200,
        depth: 90,
        height: 80,
        x: 200,
        y: 400,
        z: 0,
        rotation: 0,
        color: '#333',
        modelType: 'sofa',
        clearances: { front: 50 },
        provenance: 'manual',
        isConfirmed: true,
      }
    ],
    openings: []
  };

  const suitableValidation: ImageValidationResult = {
    validFile: true,
    suitability: 'suitable',
    isIndoorInterior: true,
    qualityIssues: [],
    explanation: 'Good room image',
    recommendedAction: 'Check recommendations',
  };

  it('honors "keep-all-existing" furniture strategy by omitting new furniture purchase recommendations', () => {
    const userGoal: UserDesignGoal = {
      primaryGoal: 'general',
      furnitureStrategy: 'keep-all-existing',
      budget: 'zero-cost',
    };

    const analysis = buildDetailedAnalysis({
      validation: suitableValidation,
      suggestions: [],
      room: baseRoom,
      userGoal,
    });

    // Should NOT contain any 'add' category recommendations requiring purchase
    const addRecs = analysis.recommendations.filter(r => r.category === 'add');
    expect(addRecs).toHaveLength(0);

    // Should still have keep, rearrange, improve, and avoid
    expect(analysis.recommendations.some(r => r.category === 'keep')).toBe(true);
    expect(analysis.recommendations.some(r => r.category === 'improve')).toBe(true);
    expect(analysis.recommendations.some(r => r.category === 'avoid')).toBe(true);
  });

  it('adapts recommendations when user prioritizes "work-study-zone"', () => {
    const userGoal: UserDesignGoal = {
      primaryGoal: 'work-study-zone',
      furnitureStrategy: 'open-to-few-additions',
      budget: 'moderate',
    };

    const analysis = buildDetailedAnalysis({
      validation: suitableValidation,
      suggestions: [],
      room: baseRoom,
      userGoal,
    });

    const deskRec = analysis.recommendations.find(r => r.action.toLowerCase().includes('desk'));
    expect(deskRec).toBeDefined();
    expect(deskRec!.category).toBe('add');
    expect(deskRec!.priority).toBe('high');
    expect(deskRec!.expectedBenefit).toMatch(/productivity|work zone/i);
  });

  it('adapts recommendations when user prioritizes "maximize-storage"', () => {
    const userGoal: UserDesignGoal = {
      primaryGoal: 'maximize-storage',
      furnitureStrategy: 'open-to-few-additions',
      budget: 'moderate',
    };

    const analysis = buildDetailedAnalysis({
      validation: suitableValidation,
      suggestions: [],
      room: baseRoom,
      userGoal,
    });

    const storageRec = analysis.recommendations.find(r => r.action.toLowerCase().includes('storage') || r.action.toLowerCase().includes('bookcase'));
    expect(storageRec).toBeDefined();
    expect(storageRec!.category).toBe('add');
    expect(storageRec!.priority).toBe('high');
  });

  it('provides a structured physical measurement checklist', () => {
    const analysis = buildDetailedAnalysis({
      validation: suitableValidation,
      suggestions: [],
      room: baseRoom,
    });

    expect(analysis.measurementChecklist.length).toBeGreaterThanOrEqual(4);
    expect(analysis.measurementChecklist.some(item => item.includes('width') && item.includes('length'))).toBe(true);
    expect(analysis.measurementChecklist.some(item => item.includes('clearance') || item.includes('doorway'))).toBe(true);
  });
});

describe('Spatial Integration & Geometric Constraints', () => {
  it('validates proposed furniture additions against room boundaries and SAT collisions', () => {
    const room: RoomModel = {
      id: 'room-bounds',
      name: 'Test Room',
      type: 'living',
      width: 400,
      length: 500,
      height: 280,
      furniture: [
        {
          id: 'item-existing',
          name: 'Coffee Table',
          category: 'table',
          width: 100,
          depth: 60,
          height: 45,
          x: 200,
          y: 250,
          z: 0,
          rotation: 0,
          color: '#888',
          modelType: 'coffee_table',
          clearances: { front: 40 },
          provenance: 'manual',
          isConfirmed: true,
        }
      ],
      openings: [],
    };

    // Item fitting within boundaries
    const fittingItem: FurnitureItem = {
      id: 'item-fit',
      name: 'Armchair',
      category: 'seating',
      width: 80,
      depth: 80,
      height: 80,
      x: 320,
      y: 250,
      z: 0,
      rotation: 0,
      color: '#aaa',
      modelType: 'armchair',
      clearances: { front: 40 },
      provenance: 'ai-suggestion',
      isConfirmed: false,
    };

    const corners = getFurnitureCorners(fittingItem);
    const bounds = checkInsideRoomBounds(corners, room.width, room.length);
    expect(bounds.inside).toBe(true);

    // Colliding item placed directly on top of existing coffee table
    const collidingItem: FurnitureItem = {
      ...fittingItem,
      id: 'item-collide',
      x: 200,
      y: 250,
    };

    const corners1 = getFurnitureCorners(room.furniture[0]);
    const corners2 = getFurnitureCorners(collidingItem);
    const intersects = doPolygonsIntersect(corners1, corners2);
    expect(intersects).toBe(true);
  });
});
