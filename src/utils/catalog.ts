import type { FurnitureItem } from '../types/model';

export interface CatalogTemplate {
  name: string;
  category: FurnitureItem['category'];
  width: number;  // cm
  depth: number;  // cm
  height: number; // cm
  color: string;
  modelType: string;
  clearances: FurnitureItem['clearances'];
  description: string;
  estimatedPrice?: number;
}

export const FURNITURE_CATALOG: CatalogTemplate[] = [
  {
    name: 'Nordic 3-Seater Sofa',
    category: 'seating',
    width: 218,
    depth: 90,
    height: 85,
    color: '#3d5a80',
    modelType: 'sofa_3seater',
    clearances: { front: 65 },
    description: 'Comfortable contemporary 3-seater with textured woven fabric.',
    estimatedPrice: 799,
  },
  {
    name: 'Cozy Lounge Armchair',
    category: 'seating',
    width: 86,
    depth: 82,
    height: 88,
    color: '#ee6c4d',
    modelType: 'armchair',
    clearances: { front: 50 },
    description: 'Ergonomic accent armchair with curved backrest.',
    estimatedPrice: 349,
  },
  {
    name: 'Queen Platform Bed',
    category: 'bed',
    width: 168,
    depth: 215,
    height: 105,
    color: '#293241',
    modelType: 'bed_queen',
    clearances: { front: 70, left: 60, right: 60 },
    description: 'Standard Queen bed frame with upholstered headboard.',
    estimatedPrice: 650,
  },
  {
    name: 'King Luxury Bed',
    category: 'bed',
    width: 198,
    depth: 218,
    height: 120,
    color: '#344e41',
    modelType: 'bed_king',
    clearances: { front: 75, left: 65, right: 65 },
    description: 'Spacious King-size bed frame with built-in slatted base.',
    estimatedPrice: 920,
  },
  {
    name: 'Solid Oak Dining Table',
    category: 'table',
    width: 160,
    depth: 90,
    height: 76,
    color: '#d4a373',
    modelType: 'dining_table',
    clearances: { front: 70, back: 70, left: 60, right: 60 },
    description: '6-person solid oak dining table. Clearances account for chair pullout.',
    estimatedPrice: 580,
  },
  {
    name: 'Round Bistro Table',
    category: 'table',
    width: 95,
    depth: 95,
    height: 75,
    color: '#dda15e',
    modelType: 'round_table',
    clearances: { front: 55, back: 55, left: 55, right: 55 },
    description: 'Intimate circular dining table for compact spaces.',
    estimatedPrice: 280,
  },
  {
    name: 'Minimalist Coffee Table',
    category: 'table',
    width: 115,
    depth: 55,
    height: 44,
    color: '#bc6c25',
    modelType: 'coffee_table',
    clearances: { front: 40, back: 40 },
    description: 'Low-profile coffee table with lower magazine shelf.',
    estimatedPrice: 199,
  },
  {
    name: 'Ergonomic Standing Desk',
    category: 'desk',
    width: 140,
    depth: 70,
    height: 75,
    color: '#2b2d42',
    modelType: 'desk',
    clearances: { front: 85 },
    description: 'Dual-motor sit-stand desk with cable management tray.',
    estimatedPrice: 480,
  },
  {
    name: 'Compact Home Desk',
    category: 'desk',
    width: 100,
    depth: 52,
    height: 75,
    color: '#8d99ae',
    modelType: 'desk_compact',
    clearances: { front: 75 },
    description: 'Space-saving work surface suitable for bedroom corners.',
    estimatedPrice: 190,
  },
  {
    name: 'Modern 4-Drawer Dresser',
    category: 'storage',
    width: 95,
    depth: 50,
    height: 108,
    color: '#e0fbfc',
    modelType: 'dresser',
    clearances: { front: 65 },
    description: 'Deep storage chest. Front clearance allows full drawer extension.',
    estimatedPrice: 380,
  },
  {
    name: 'Tall Storage Bookcase',
    category: 'storage',
    width: 80,
    depth: 32,
    height: 202,
    color: '#6c757d',
    modelType: 'bookcase',
    clearances: { front: 50 },
    description: '5-tier vertical shelving unit for books and displays.',
    estimatedPrice: 160,
  },
  {
    name: 'Lowline TV Media Unit',
    category: 'storage',
    width: 180,
    depth: 42,
    height: 48,
    color: '#264653',
    modelType: 'tv_unit',
    clearances: { front: 50 },
    description: 'Wide entertainment console with acoustic speaker mesh.',
    estimatedPrice: 320,
  },
  {
    name: 'Potted Fiddle Fig',
    category: 'decor',
    width: 48,
    depth: 48,
    height: 135,
    color: '#2a9d8f',
    modelType: 'plant',
    clearances: {},
    description: 'Indoor architectural plant in ceramic planter.',
    estimatedPrice: 75,
  },
  {
    name: 'Modern Arc Floor Lamp',
    category: 'lighting',
    width: 42,
    depth: 42,
    height: 185,
    color: '#e76f51',
    modelType: 'lamp',
    clearances: {},
    description: 'Overhanging curved reading lamp with weighted brass base.',
    estimatedPrice: 140,
  },
  {
    name: 'Bedside Nightstand',
    category: 'storage',
    width: 45,
    depth: 40,
    height: 56,
    color: '#4a4e69',
    modelType: 'nightstand',
    clearances: { front: 40 },
    description: 'Compact bedside table with drawer and lower open shelf.',
    estimatedPrice: 110,
  },
];

/**
 * Creates a unique FurnitureItem from a catalog template
 */
export function createFurnitureFromCatalog(
  template: CatalogTemplate, 
  roomW: number, 
  roomL: number
): FurnitureItem {
  const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Place near center of the room with a gentle jitter so consecutive additions don't stack directly
  const jitterX = (Math.random() - 0.5) * 40;
  const jitterY = (Math.random() - 0.5) * 40;
  
  const x = Math.max(template.width / 2, Math.min(roomW - template.width / 2, Math.round(roomW / 2 + jitterX)));
  const y = Math.max(template.depth / 2, Math.min(roomL - template.depth / 2, Math.round(roomL / 2 + jitterY)));

  return {
    id,
    name: template.name,
    category: template.category,
    width: template.width,
    depth: template.depth,
    height: template.height,
    x,
    y,
    z: 0,
    rotation: 0,
    color: template.color,
    modelType: template.modelType,
    clearances: { ...template.clearances },
    provenance: 'catalog',
    isConfirmed: true,
    price: template.estimatedPrice,
    provenanceNotes: 'Added from FitCheck verified catalog specs.',
  };
}
