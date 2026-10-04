import type { FloorType, WallFinishType } from '../types/model';

export type ColorFamily = 
  | 'whites'
  | 'neutrals'
  | 'earth_tones'
  | 'greens'
  | 'blues'
  | 'pinks'
  | 'purples'
  | 'yellows'
  | 'dark_accents'
  | 'natural_shades';

export interface PaintColor {
  id: string;
  name: string;
  hex: string;
  family: ColorFamily;
  usageTags: ('wall' | 'accent' | 'ceiling' | 'trim' | 'cabinetry')[];
  tone: 'warm' | 'cool' | 'neutral';
  lightness: 'light' | 'mid' | 'dark';
  description?: string;
}

export interface CuratedPalette {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  primaryWallColor: string;
  accentWallColor: string;
  ceilingColor: string;
  trimColor: string;
  furnitureAccentColor: string;
  cabinetryColor?: string;
  pairedFloorType: FloorType;
  pairedFloorColor: string;
  wallFinish: WallFinishType;
  tags: string[];
}

export interface InteriorStyle {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  colorPreferences: string[];
  materialPreferences: string[];
  furnitureGuidance: string;
  compatibleRoomTypes: string[];
  defaultPaletteId: string;
  aestheticNotes?: string;
}

export interface MaterialOption {
  type: FloorType;
  name: string;
  category: 'hardwood' | 'stone_tile' | 'composite_masonry' | 'natural_woven';
  defaultHex: string;
  description: string;
  roughness: number;
  metalness: number;
}

// -------------------------------------------------------------
// 1. COMPREHENSIVE PAINT COLOR LIBRARY (60+ Curated Architectural Colors)
// -------------------------------------------------------------

export const PAINT_COLORS: PaintColor[] = [
  // 1. Whites
  { id: 'w_warm_white', name: 'Warm White', hex: '#FAF8F5', family: 'whites', usageTags: ['wall', 'ceiling', 'trim'], tone: 'warm', lightness: 'light', description: 'Airy, soft architectural white with gentle sun-warmed undertones.' },
  { id: 'w_ivory', name: 'Pure Ivory', hex: '#FDFBF7', family: 'whites', usageTags: ['wall', 'ceiling'], tone: 'warm', lightness: 'light', description: 'Classic creamy ivory suited for high ceiling reflections.' },
  { id: 'w_cream', name: 'Almond Cream', hex: '#F6F1E7', family: 'whites', usageTags: ['wall', 'trim'], tone: 'warm', lightness: 'light', description: 'Silky rich cream creating welcoming, cozy living spaces.' },
  { id: 'w_pearl', name: 'Lustrous Pearl', hex: '#F3F4F6', family: 'whites', usageTags: ['wall', 'ceiling'], tone: 'cool', lightness: 'light', description: 'Modern gallery white with clean mineral clarity.' },
  { id: 'w_chalk', name: 'Chalk White', hex: '#EFEFEA', family: 'whites', usageTags: ['wall', 'ceiling', 'trim'], tone: 'neutral', lightness: 'light', description: 'Matte chalk plaster shade inspired by Mediterranean coastal villas.' },
  { id: 'w_soft_white', name: 'Soft Alabaster', hex: '#F5F2EB', family: 'whites', usageTags: ['wall', 'ceiling'], tone: 'warm', lightness: 'light', description: 'Flagship architectural warm white balanced for natural sunlight.' },
  { id: 'w_bone_white', name: 'Bone White', hex: '#EBE7DE', family: 'whites', usageTags: ['wall', 'trim'], tone: 'warm', lightness: 'light', description: 'Muted earthen off-white with antique limestone character.' },

  // 2. Neutrals
  { id: 'n_beige', name: 'Cashmere Beige', hex: '#E5DCce', family: 'neutrals', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'light', description: 'Comfortable textured warmth that pairs seamlessly with blonde oak.' },
  { id: 'n_sand', name: 'Dune Sand', hex: '#D8CCA3', family: 'neutrals', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'mid', description: 'Golden sun-bleached desert sand providing grounded warmth.' },
  { id: 'n_taupe', name: 'Architectural Taupe', hex: '#9E9285', family: 'neutrals', usageTags: ['wall', 'accent', 'cabinetry'], tone: 'warm', lightness: 'mid', description: 'Refined blend of gray and umber for transitional elegance.' },
  { id: 'n_greige', name: 'Nordic Greige', hex: '#C8C2BC', family: 'neutrals', usageTags: ['wall', 'trim'], tone: 'neutral', lightness: 'light', description: 'Harmonious hybrid neutral neutralizing cool northern daylight.' },
  { id: 'n_mushroom', name: 'Wild Mushroom', hex: '#B3A99F', family: 'neutrals', usageTags: ['wall', 'cabinetry'], tone: 'warm', lightness: 'mid', description: 'Subtle earthy neutral evoking raw linen and ceramic clay.' },
  { id: 'n_stone', name: 'Limestone Grey', hex: '#C2BBB0', family: 'neutrals', usageTags: ['wall', 'accent'], tone: 'neutral', lightness: 'mid', description: 'Honed limestone finish with timeless architectural gravitas.' },
  { id: 'n_warm_grey', name: 'Warm Pebble Grey', hex: '#B0A99F', family: 'neutrals', usageTags: ['wall', 'trim'], tone: 'warm', lightness: 'mid', description: 'Cozy stone neutral ideal for modern bedrooms and reading nooks.' },
  { id: 'n_charcoal', name: 'Charcoal Slate', hex: '#3B4252', family: 'neutrals', usageTags: ['accent', 'cabinetry'], tone: 'cool', lightness: 'dark', description: 'Dramatic deep slate providing sharp accent contrast.' },

  // 3. Earth Tones
  { id: 'e_terracotta', name: 'Artisan Terracotta', hex: '#C26D53', family: 'earth_tones', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'mid', description: 'Earthy baked terracotta recalling Indian courtyard pots.' },
  { id: 'e_clay', name: 'Raw Clay', hex: '#B87A65', family: 'earth_tones', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'mid', description: 'Textured red-mud clay delivering natural biophilic grounding.' },
  { id: 'e_rust', name: 'Oxidized Rust', hex: '#A34E36', family: 'earth_tones', usageTags: ['accent', 'cabinetry'], tone: 'warm', lightness: 'dark', description: 'Deep autumnal accent pairing boldly with brass fittings.' },
  { id: 'e_ochre', name: 'Golden Ochre', hex: '#CB904D', family: 'earth_tones', usageTags: ['accent', 'wall'], tone: 'warm', lightness: 'mid', description: 'Sun-drenched mineral ochre bringing warm midday glow.' },
  { id: 'e_caramel', name: 'Salted Caramel', hex: '#A86A3D', family: 'earth_tones', usageTags: ['accent', 'cabinetry'], tone: 'warm', lightness: 'mid', description: 'Rich confectionery amber that complements deep teak furniture.' },
  { id: 'e_cinnamon', name: 'Warm Cinnamon', hex: '#8E4A31', family: 'earth_tones', usageTags: ['accent'], tone: 'warm', lightness: 'dark', description: 'Inviting spice tone for dining rooms and statement entries.' },
  { id: 'e_sienna', name: 'Burnt Sienna', hex: '#883E28', family: 'earth_tones', usageTags: ['accent', 'wall'], tone: 'warm', lightness: 'dark', description: 'Classic Tuscan pigment bringing depth to artisanal spaces.' },

  // 4. Greens
  { id: 'g_sage', name: 'Muted Sage', hex: '#7D8B7B', family: 'greens', usageTags: ['wall', 'cabinetry', 'accent'], tone: 'cool', lightness: 'mid', description: 'Organic botanical sage promoting calm mindfulness.' },
  { id: 'g_olive', name: 'Tuscan Olive', hex: '#6B705C', family: 'greens', usageTags: ['accent', 'cabinetry'], tone: 'warm', lightness: 'mid', description: 'Subdued Mediterranean olive for bespoke kitchen cabinetry.' },
  { id: 'g_eucalyptus', name: 'Silver Eucalyptus', hex: '#9AA899', family: 'greens', usageTags: ['wall', 'trim'], tone: 'cool', lightness: 'light', description: 'Silvery green neutral providing an airy open-air feeling.' },
  { id: 'g_moss', name: 'Deep Forest Moss', hex: '#4F5D4E', family: 'greens', usageTags: ['accent', 'wall'], tone: 'cool', lightness: 'dark', description: 'Lush woodland shadow for intimate home libraries and studies.' },
  { id: 'g_forest', name: 'Evergreen Forest', hex: '#2D4436', family: 'greens', usageTags: ['accent', 'cabinetry'], tone: 'cool', lightness: 'dark', description: 'Regal deep green framing botanical views and polished brass.' },
  { id: 'g_emerald', name: 'Jeweled Emerald', hex: '#1B4D3E', family: 'greens', usageTags: ['accent'], tone: 'cool', lightness: 'dark', description: 'Luxe historic emerald bringing jewel-box charm to powder rooms.' },
  { id: 'g_mint', name: 'Crisp Mint Whisper', hex: '#D6E5D8', family: 'greens', usageTags: ['wall', 'ceiling'], tone: 'cool', lightness: 'light', description: 'Subtle fresh breath for serene north-facing bedrooms.' },

  // 5. Blues
  { id: 'b_powder', name: 'Powder Blue', hex: '#B8C5D6', family: 'blues', usageTags: ['wall', 'ceiling'], tone: 'cool', lightness: 'light', description: 'Gentle airy sky tone balancing bright afternoon windows.' },
  { id: 'b_sky', name: 'Coastal Sky', hex: '#8FA9C4', family: 'blues', usageTags: ['wall', 'accent'], tone: 'cool', lightness: 'mid', description: 'Clear ocean breeze hue bringing outdoor freshness indoors.' },
  { id: 'b_denim', name: 'Washed Denim', hex: '#58728D', family: 'blues', usageTags: ['wall', 'accent', 'cabinetry'], tone: 'cool', lightness: 'mid', description: 'Relaxed casual blue with woven texture appeal.' },
  { id: 'b_teal', name: 'Aegean Teal', hex: '#316B77', family: 'blues', usageTags: ['accent', 'cabinetry'], tone: 'cool', lightness: 'mid', description: 'Vibrant Mediterranean sea color for accent niches and tiles.' },
  { id: 'b_petrol', name: 'Deep Petrol Blue', hex: '#1F3C4D', family: 'blues', usageTags: ['accent', 'wall'], tone: 'cool', lightness: 'dark', description: 'Atmospheric deep marine shade delivering dramatic focus.' },
  { id: 'b_navy', name: 'Regal Navy', hex: '#1C2833', family: 'blues', usageTags: ['accent', 'cabinetry', 'trim'], tone: 'cool', lightness: 'dark', description: 'Authoritative timeless midnight blue commanding sophisticated spaces.' },
  { id: 'b_haze', name: 'Coastal Haze', hex: '#D1DCE5', family: 'blues', usageTags: ['wall', 'ceiling'], tone: 'cool', lightness: 'light', description: 'Soft morning sea fog with luminous reflective pigments.' },

  // 6. Pinks
  { id: 'p_blush', name: 'Silk Blush', hex: '#F0DCD3', family: 'pinks', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'light', description: 'Sophisticated petal pink flattering skin tones in vanity areas.' },
  { id: 'p_dusty_rose', name: 'Dusty Rose', hex: '#C99E96', family: 'pinks', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'mid', description: 'Vintage muted botanical rose with subtle terracotta roots.' },
  { id: 'p_muted_coral', name: 'Muted Coral Sand', hex: '#D99182', family: 'pinks', usageTags: ['accent'], tone: 'warm', lightness: 'mid', description: 'Gentle tropical terracotta-pink warming up contemporary seating.' },
  { id: 'p_rosewood', name: 'Heritage Rosewood', hex: '#824E4E', family: 'pinks', usageTags: ['accent', 'cabinetry'], tone: 'warm', lightness: 'dark', description: 'Dignified Victorian rose-brown offering timeless grandeur.' },
  { id: 'p_peach_cream', name: 'Peach Cream', hex: '#FAE3D9', family: 'pinks', usageTags: ['wall', 'ceiling'], tone: 'warm', lightness: 'light', description: 'Sunny nectar glow ideal for cozy breakfasts and sunrooms.' },
  { id: 'p_terracotta_rose', name: 'Terracotta Rose', hex: '#B86F63', family: 'pinks', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'mid', description: 'Sun-warmed pink clay bridging terracotta and dusty rose.' },

  // 7. Purples
  { id: 'pu_lavender', name: 'French Lavender', hex: '#D3CFE2', family: 'purples', usageTags: ['wall', 'accent'], tone: 'cool', lightness: 'light', description: 'Relaxing herbal purple encouraging restorative sleep.' },
  { id: 'pu_mauve', name: 'Heather Mauve', hex: '#A899A5', family: 'purples', usageTags: ['wall', 'accent'], tone: 'neutral', lightness: 'mid', description: 'Smoky, sophisticated mauve bridging warm neutrals and cool grays.' },
  { id: 'pu_plum', name: 'Midnight Plum', hex: '#4B384C', family: 'purples', usageTags: ['accent', 'cabinetry'], tone: 'cool', lightness: 'dark', description: 'Sumptuous velvety dark violet creating glamorous jewel-box powder rooms.' },
  { id: 'pu_violet', name: 'Muted Violet Ash', hex: '#877B8A', family: 'purples', usageTags: ['accent', 'wall'], tone: 'cool', lightness: 'mid', description: 'Understated ash violet favored in Scandinavian minimalist interiors.' },
  { id: 'pu_wisteria', name: 'Wisteria Mist', hex: '#E6E1EE', family: 'purples', usageTags: ['wall', 'ceiling'], tone: 'cool', lightness: 'light', description: 'Delicate pale lilac mist bringing soft romantic luminosity.' },

  // 8. Yellows
  { id: 'y_butter', name: 'Morning Butter', hex: '#FDF1C9', family: 'yellows', usageTags: ['wall', 'ceiling'], tone: 'warm', lightness: 'light', description: 'Delicate morning light infusing vitality without saturation fatigue.' },
  { id: 'y_mustard', name: 'Dijon Mustard', hex: '#CFA145', family: 'yellows', usageTags: ['accent'], tone: 'warm', lightness: 'mid', description: 'Mid-century retro mustard that anchors modern neutral seating.' },
  { id: 'y_ochre', name: 'Marigold Ochre', hex: '#D49B35', family: 'yellows', usageTags: ['accent', 'wall'], tone: 'warm', lightness: 'mid', description: 'Celebratory Indian marigold bringing festival warmth into living rooms.' },
  { id: 'y_saffron', name: 'Kashmiri Saffron', hex: '#E08D2C', family: 'yellows', usageTags: ['accent'], tone: 'warm', lightness: 'mid', description: 'Precious warm golden glow celebrating artisanal luxury.' },
  { id: 'y_honey', name: 'Wild Honeycomb', hex: '#EBB059', family: 'yellows', usageTags: ['accent', 'cabinetry'], tone: 'warm', lightness: 'mid', description: 'Golden warm honey adding warmth to breakfast corners.' },

  // 9. Dark Accents
  { id: 'd_deep_brown', name: 'Roasted Cacao', hex: '#3E2723', family: 'dark_accents', usageTags: ['accent', 'cabinetry', 'trim'], tone: 'warm', lightness: 'dark', description: 'Rich dark espresso bean for grounding door frames and mouldings.' },
  { id: 'd_espresso', name: 'Architectural Espresso', hex: '#2A201A', family: 'dark_accents', usageTags: ['cabinetry', 'accent'], tone: 'warm', lightness: 'dark', description: 'Nearly black wood tone providing high architectural contrast.' },
  { id: 'd_graphite', name: 'Graphite Metal', hex: '#24292E', family: 'dark_accents', usageTags: ['trim', 'accent', 'cabinetry'], tone: 'cool', lightness: 'dark', description: 'Precision industrial charcoal used for black metal door frames.' },
  { id: 'd_ink_black', name: 'Carbon Ink Black', hex: '#16191D', family: 'dark_accents', usageTags: ['trim', 'accent'], tone: 'neutral', lightness: 'dark', description: 'Pure architectural silhouette black for crisp modern delineation.' },
  { id: 'd_peat', name: 'Smoked Peat', hex: '#362B28', family: 'dark_accents', usageTags: ['trim', 'cabinetry'], tone: 'warm', lightness: 'dark', description: 'Deep smoky earth brown providing organic architectural grounding.' },

  // 10. Natural Shades
  { id: 'nat_walnut', name: 'American Walnut', hex: '#5C4033', family: 'natural_shades', usageTags: ['cabinetry', 'accent'], tone: 'warm', lightness: 'dark', description: 'Warm lustrous hardwood tone for custom bespoke joinery.' },
  { id: 'nat_oak', name: 'Blonde Oak', hex: '#C49A6C', family: 'natural_shades', usageTags: ['wall', 'trim', 'cabinetry'], tone: 'warm', lightness: 'mid', description: 'Natural untreated oak grain tone celebrating organic material authenticity.' },
  { id: 'nat_cane', name: 'Woven Rattan Cane', hex: '#D2B48C', family: 'natural_shades', usageTags: ['accent', 'wall'], tone: 'warm', lightness: 'mid', description: 'Breathable tropical cane wicker texture tone.' },
  { id: 'nat_jute', name: 'Raw Natural Jute', hex: '#B89B72', family: 'natural_shades', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'mid', description: 'Textured organic fiber tone for earthy floor rugs and wall tapestries.' },
  { id: 'nat_linen', name: 'Bleached Linen', hex: '#EAE6DF', family: 'natural_shades', usageTags: ['wall', 'ceiling', 'trim'], tone: 'neutral', lightness: 'light', description: 'Effortless textured neutral for light-filtering drapery and open living.' },
  { id: 'nat_sandstone', name: 'Dholpur Sandstone', hex: '#DCC3A8', family: 'natural_shades', usageTags: ['wall', 'accent'], tone: 'warm', lightness: 'mid', description: 'Heritage Indian pink-buff sandstone reminiscent of Rajasthani palaces.' },
  { id: 'nat_teak', name: 'Burma Teak', hex: '#7D5137', family: 'natural_shades', usageTags: ['cabinetry', 'accent'], tone: 'warm', lightness: 'dark', description: 'Historic golden-brown teak grain celebrated in Indian architecture.' },
];

// -------------------------------------------------------------
// 2. CURATED PALETTES (16+ Professional Designer Color Systems)
// -------------------------------------------------------------

export const CURATED_PALETTES: CuratedPalette[] = [
  {
    id: 'warm-neutral',
    name: 'Warm Neutral Sanctuary',
    subtitle: 'Alabaster, Linen & Natural Oak',
    description: 'A timeless, restorative palette that bathes the room in gentle organic warmth and layered natural textures.',
    primaryWallColor: '#F5F2EB', // Soft Alabaster
    accentWallColor: '#EBE7DE',  // Bone White
    ceilingColor: '#FAF8F5',     // Warm White
    trimColor: '#FAF8F5',
    furnitureAccentColor: '#C49A6C', // Blonde Oak
    pairedFloorType: 'hardwood_oak',
    pairedFloorColor: '#C49A6C',
    wallFinish: 'matte',
    tags: ['Relaxed', 'Timeless', 'Warm', 'Organic'],
  },
  {
    id: 'contemporary-indian',
    name: 'Contemporary Indian',
    subtitle: 'Artisanal Terracotta, Brass & Rich Teak',
    description: 'Vibrant modern Indian aesthetic honoring traditional clay craftsmanship, warm mustard accents, and heritage hardwoods.',
    primaryWallColor: '#F5F2EB', // Soft Alabaster main
    accentWallColor: '#C26D53',  // Artisan Terracotta focal wall
    ceilingColor: '#FDFBF7',     // Pure Ivory
    trimColor: '#3E2723',        // Roasted Cacao
    furnitureAccentColor: '#CB904D', // Golden Ochre
    cabinetryColor: '#6D4C3D',
    pairedFloorType: 'hardwood_walnut',
    pairedFloorColor: '#6D4C3D',
    wallFinish: 'satin',
    tags: ['Heritage', 'Indian', 'Vibrant', 'Artisanal'],
  },
  {
    id: 'earthy-terracotta',
    name: 'Earthy Terracotta & Clay',
    subtitle: 'Raw Mud, Ochre & Tuscan Plaster',
    description: 'Sun-baked warmth inspired by earthen pottery and Mediterranean courtyards, creating a deeply welcoming grounded ambiance.',
    primaryWallColor: '#EBE7DE', // Bone White
    accentWallColor: '#C26D53',  // Terracotta
    ceilingColor: '#FAF8F5',
    trimColor: '#EBE7DE',
    furnitureAccentColor: '#A86A3D', // Salted Caramel
    pairedFloorType: 'terrazzo',
    pairedFloorColor: '#D8CCA3',
    wallFinish: 'limewash',
    tags: ['Earthy', 'Mediterranean', 'Textured', 'Grounded'],
  },
  {
    id: 'sage-and-cream',
    name: 'Sage Plaster & Sweet Cream',
    subtitle: 'Botanical Sage, Almond Cream & Ash Wood',
    description: 'A soothing biophilic connection uniting restorative herbal greens with buttery creams for deep serenity.',
    primaryWallColor: '#F6F1E7', // Almond Cream
    accentWallColor: '#7D8B7B',  // Muted Sage
    ceilingColor: '#FAF8F5',
    trimColor: '#FFFFFF',
    furnitureAccentColor: '#4F5D4E', // Forest Moss
    pairedFloorType: 'hardwood_ash',
    pairedFloorColor: '#D6C5AD',
    wallFinish: 'matte',
    tags: ['Biophilic', 'Calming', 'Nature', 'Gentle'],
  },
  {
    id: 'coastal-blue',
    name: 'Calm Coastal Haze',
    subtitle: 'Sea Fog, Driftwood & Azure Accents',
    description: 'Crisp seaside freshness featuring sea-salt white walls, washed denim blues, and weathered blonde timber.',
    primaryWallColor: '#F3F4F6', // Pearl White
    accentWallColor: '#58728D',  // Washed Denim
    ceilingColor: '#FFFFFF',
    trimColor: '#E2E8F0',
    furnitureAccentColor: '#8FA9C4', // Coastal Sky
    pairedFloorType: 'hardwood_oak',
    pairedFloorColor: '#C8BEB2',
    wallFinish: 'matte',
    tags: ['Breezy', 'Coastal', 'Light', 'Fresh'],
  },
  {
    id: 'japandi-natural',
    name: 'Japandi Balance',
    subtitle: 'Limewash Stone, Chevron Parquet & Carbon Ink',
    description: 'Japanese functional minimalism paired with Scandinavian warmth. Features textured limewash and crisp black iron contrast.',
    primaryWallColor: '#E6E2D8', // Limewash Stone
    accentWallColor: '#C2BBB0',  // Limestone Grey
    ceilingColor: '#F5F2EB',
    trimColor: '#16191D',        // Carbon Ink Black
    furnitureAccentColor: '#24292E',
    pairedFloorType: 'herringbone_parquet',
    pairedFloorColor: '#B88B58',
    wallFinish: 'limewash',
    tags: ['Japandi', 'Zen', 'Minimal', 'Craft'],
  },
  {
    id: 'scandinavian-light',
    name: 'Scandinavian Light',
    subtitle: 'Chalk White, Pale Birch & Muted Eucalyptus',
    description: 'Designed to maximize natural light during all seasons with clean chalk walls, blonde timber, and botanical greenery.',
    primaryWallColor: '#FAF8F5', // Warm White
    accentWallColor: '#9AA899',  // Silver Eucalyptus
    ceilingColor: '#FFFFFF',
    trimColor: '#FFFFFF',
    furnitureAccentColor: '#7D8B7B',
    pairedFloorType: 'hardwood_ash',
    pairedFloorColor: '#E0D4C3',
    wallFinish: 'matte',
    tags: ['Nordic', 'Bright', 'Airy', 'Functional'],
  },
  {
    id: 'modern-monochrome',
    name: 'Modern Monochrome',
    subtitle: 'High-Contrast Alabaster & Graphite Slate',
    description: 'Bold architectural clarity with crisp white planes, deep slate charcoal accents, and polished concrete flooring.',
    primaryWallColor: '#FAF8F5',
    accentWallColor: '#3B4252',  // Charcoal Slate
    ceilingColor: '#FFFFFF',
    trimColor: '#16191D',
    furnitureAccentColor: '#24292E',
    pairedFloorType: 'polished_concrete',
    pairedFloorColor: '#A8ACB3',
    wallFinish: 'matte',
    tags: ['Modern', 'Bold', 'Architectural', 'Crisp'],
  },
  {
    id: 'olive-and-walnut',
    name: 'Tuscan Olive & Rich Walnut',
    subtitle: 'Earthy Olive, Warm Walnut & Brass Accents',
    description: 'Rich, grounded sophistication combining deep botanical greens with luscious dark walnut and antique gold tones.',
    primaryWallColor: '#F2EDE4', // Soft Linen
    accentWallColor: '#6B705C',  // Tuscan Olive
    ceilingColor: '#FAF8F5',
    trimColor: '#5C4033',        // American Walnut
    furnitureAccentColor: '#CB904D',
    pairedFloorType: 'hardwood_walnut',
    pairedFloorColor: '#6D4C3D',
    wallFinish: 'satin',
    tags: ['Sophisticated', 'Rich', 'Olive', 'Timeless'],
  },
  {
    id: 'muted-pastels',
    name: 'Muted Pastels & Chalk',
    subtitle: 'Silk Blush, Dusty Rose & Soft Linen',
    description: 'Gentle, romantic subtlety using powdered pastel mineral pigments that reflect light with delicate warmth.',
    primaryWallColor: '#FDFBF7',
    accentWallColor: '#C99E96',  // Dusty Rose
    ceilingColor: '#FFFFFF',
    trimColor: '#F0DCD3',
    furnitureAccentColor: '#D3CFE2', // French Lavender
    pairedFloorType: 'hardwood_oak',
    pairedFloorColor: '#D6C5AD',
    wallFinish: 'matte',
    tags: ['Gentle', 'Pastel', 'Romantic', 'Soft'],
  },
  {
    id: 'jewel-tone-luxury',
    name: 'Jewel-Tone Grandeur',
    subtitle: 'Emerald Forest, Midnight Plum & Carrara Marble',
    description: 'Regal, dramatic indulgence featuring saturated jewel tones, polished white marble, and sumptuous velvety materials.',
    primaryWallColor: '#2D4436', // Evergreen Forest
    accentWallColor: '#1C2833',  // Regal Navy
    ceilingColor: '#FAF8F5',
    trimColor: '#16191D',
    furnitureAccentColor: '#CB904D', // Gold/Brass
    pairedFloorType: 'marble_carrara',
    pairedFloorColor: '#F0F2F5',
    wallFinish: 'satin',
    tags: ['Luxury', 'Dramatic', 'Opulent', 'Jewel'],
  },
  {
    id: 'warm-minimalist',
    name: 'Warm Minimalist Studio',
    subtitle: 'Bone White, Raw Jute & Honed Limestone',
    description: 'Eliminates visual clutter while retaining tactile warmth. Focuses on natural light and honest organic textures.',
    primaryWallColor: '#EBE7DE',
    accentWallColor: '#C2BBB0',
    ceilingColor: '#FAF8F5',
    trimColor: '#EBE7DE',
    furnitureAccentColor: '#B89B72', // Raw Jute
    pairedFloorType: 'limestone_tile',
    pairedFloorColor: '#D8D2C4',
    wallFinish: 'matte',
    tags: ['Minimalist', 'Pure', 'Warm', 'Tactile'],
  },
  {
    id: 'soft-pink-and-sand',
    name: 'Soft Blush & Desert Sand',
    subtitle: 'Silk Blush, Dune Sand & Terrazzo',
    description: 'A contemporary playful aesthetic blending desert sand neutrals with delicate blush plaster and Italian terrazzo.',
    primaryWallColor: '#FAF8F5',
    accentWallColor: '#F0DCD3',  // Silk Blush
    ceilingColor: '#FFFFFF',
    trimColor: '#D8CCA3',
    furnitureAccentColor: '#C26D53',
    pairedFloorType: 'terrazzo',
    pairedFloorColor: '#E2DDD4',
    wallFinish: 'matte',
    tags: ['Modern', 'Playful', 'Warm', 'Chic'],
  },
  {
    id: 'charcoal-and-brass',
    name: 'Charcoal Slate & Brushed Brass',
    subtitle: 'Moody Slate, Warm Oak & Metallic Lustre',
    description: 'An intimate executive ambiance with dark matte walls illuminated by warm under-cabinet lighting and rich metallic brass.',
    primaryWallColor: '#2C3338', // Charcoal Slate
    accentWallColor: '#1F2428',
    ceilingColor: '#1F2428',
    trimColor: '#C49A6C',        // Brass/Warm Oak trim
    furnitureAccentColor: '#D49B35',
    pairedFloorType: 'hardwood_walnut',
    pairedFloorColor: '#5C4033',
    wallFinish: 'satin',
    tags: ['Moody', 'Executive', 'Brass', 'Intimate'],
  },
  {
    id: 'nature-inspired',
    name: 'Nature Inspired Biophilia',
    subtitle: 'Forest Moss, Natural Cane & River Stone',
    description: 'Brings the tranquility of the forest indoors through layered greens, woven cane wicker, and natural stone flooring.',
    primaryWallColor: '#F5F2EB',
    accentWallColor: '#4F5D4E',  // Deep Forest Moss
    ceilingColor: '#FAF8F5',
    trimColor: '#6B705C',
    furnitureAccentColor: '#D2B48C', // Woven Cane
    pairedFloorType: 'natural_stone',
    pairedFloorColor: '#B0A99F',
    wallFinish: 'textured_plaster',
    tags: ['Biophilic', 'Forest', 'Organic', 'Grounding'],
  },
  {
    id: 'custom-palette',
    name: 'Custom Atelier Palette',
    subtitle: 'Personalized Bespoke Color Specification',
    description: 'Fine-tune each individual surface independently to match your exact home renovation requirements.',
    primaryWallColor: '#F5F2EB',
    accentWallColor: '#C26D53',
    ceilingColor: '#FAF8F5',
    trimColor: '#E6E2D8',
    furnitureAccentColor: '#C49A6C',
    pairedFloorType: 'hardwood_oak',
    pairedFloorColor: '#C49A6C',
    wallFinish: 'matte',
    tags: ['Custom', 'Bespoke', 'Editable'],
  },
];

// -------------------------------------------------------------
// 3. EXPANDED INTERIOR DESIGN STYLES (24 Architectural Styles)
// -------------------------------------------------------------

export const INTERIOR_STYLES: InteriorStyle[] = [
  {
    id: 'contemporary-indian',
    name: 'Contemporary Indian',
    subtitle: 'Artisanal Craft & Modern Living',
    description: 'Celebrates rich Indian heritage with terracotta clay, brass jaali motifs, handloom textiles, and warm teak woodwork.',
    colorPreferences: ['#C26D53', '#F5F2EB', '#CB904D', '#6D4C3D', '#2D4436'],
    materialPreferences: ['Sheesham & Teak Wood', 'Artisan Terracotta', 'Handwoven Khadi', 'Hammered Brass', 'Kota Stone'],
    furnitureGuidance: 'Low-slung seating, carved accent coffee tables, brass metal accents, and embroidered throw cushions.',
    compatibleRoomTypes: ['living', 'dining', 'bedroom', 'pooja'],
    defaultPaletteId: 'contemporary-indian',
  },
  {
    id: 'modern-indian',
    name: 'Modern Indian',
    subtitle: 'Sleek Lines with Heritage Accents',
    description: 'Minimalist contemporary architecture infused with subtle Indian motifs, flute paneling, and warm jewel tones.',
    colorPreferences: ['#F5F2EB', '#C49A6C', '#1B4D3E', '#A34E36', '#24292E'],
    materialPreferences: ['Veneered Teak', 'Polished Terrazzo', 'Brass Inlays', 'Indian Marble', 'Raw Silk'],
    furnitureGuidance: 'Clean-profile modular sofas complemented by an iconic statement Indian jhula or brass side table.',
    compatibleRoomTypes: ['living', 'bedroom', 'dining'],
    defaultPaletteId: 'contemporary-indian',
  },
  {
    id: 'traditional-indian',
    name: 'Traditional Indian',
    subtitle: 'Classic Grandeur & Intricate Woodcraft',
    description: 'Timeless Indian luxury featuring deep Sheesham wood carvings, ornate brass lamps, silk tapestries, and vibrant hues.',
    colorPreferences: ['#883E28', '#D49B35', '#2D4436', '#FAF8F5', '#3E2723'],
    materialPreferences: ['Solid Carved Teak', 'Pure Brass & Copper', 'Brocade Silk', 'Hand-painted Tiles', 'Kota Stone'],
    furnitureGuidance: 'High-backed diwans, ornate carved temple consoles, heavy dining tables, and upholstered footstools.',
    compatibleRoomTypes: ['living', 'dining', 'pooja', 'bedroom'],
    defaultPaletteId: 'contemporary-indian',
  },
  {
    id: 'warm-minimalist',
    name: 'Warm Minimalist',
    subtitle: 'Decluttered Warmth & Tactile Texture',
    description: 'Eliminates visual noise without feeling sterile. Emphasizes warm architectural lighting, plaster walls, and natural timber.',
    colorPreferences: ['#F5F2EB', '#EBE7DE', '#C49A6C', '#9E9285', '#24292E'],
    materialPreferences: ['Matte Emulsion', 'Natural Oak', 'Linen Upholstery', 'Brushed Travertine', 'Cast Iron'],
    furnitureGuidance: 'Curved organic armchairs, floating media consoles, concealed storage, and intentional empty space.',
    compatibleRoomTypes: ['living', 'bedroom', 'office', 'dining'],
    defaultPaletteId: 'warm-neutral',
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    subtitle: 'Nordic Functionalism & Light Maximization',
    description: 'Bright, airy, and practical Nordic design focused on hygge, daylight reflection, blonde woods, and soft botanical greens.',
    colorPreferences: ['#FAF8F5', '#9AA899', '#D6C5AD', '#EFEFEA', '#3B4252'],
    materialPreferences: ['Blonde Birch & Ash', 'Textured Wool', 'Powder-coated Metal', 'Ceramic Tile'],
    furnitureGuidance: 'Tapered wooden legs, multi-functional nesting tables, comfortable linen seating, and leafy potted flora.',
    compatibleRoomTypes: ['living', 'bedroom', 'office', 'dining', 'kitchen'],
    defaultPaletteId: 'scandinavian-light',
  },
  {
    id: 'japandi',
    name: 'Japandi',
    subtitle: 'Wabi-Sabi Simplicity & Nordic Warmth',
    description: 'Harmonious hybrid of Japanese Zen aesthetic and Scandinavian functionalism. Celebrates craftsmanship and subtle contrast.',
    colorPreferences: ['#E6E2D8', '#C2BBB0', '#B88B58', '#16191D', '#7D8B7B'],
    materialPreferences: ['Limewash Plaster', 'Chevron Parquet', 'Blackened Steel', 'Wabi-Sabi Ceramics', 'Rattan'],
    furnitureGuidance: 'Low platform furniture, paper shoji-style lighting, sliding slatted panels, and minimal decluttered surfaces.',
    compatibleRoomTypes: ['bedroom', 'living', 'study', 'dining'],
    defaultPaletteId: 'japandi-natural',
  },
  {
    id: 'modern-contemporary',
    name: 'Modern Contemporary',
    subtitle: 'Current Architectural Trends & Flow',
    description: 'Open-concept spaces with crisp geometric profiles, ambient indirect LED lighting, and polished reflective finishes.',
    colorPreferences: ['#FAF8F5', '#3B4252', '#0EA5E9', '#D1D5DB', '#16191D'],
    materialPreferences: ['Tempered Glass', 'Polished Concrete', 'Brushed Aluminum', 'Smooth Leather'],
    furnitureGuidance: 'Low-profile sectional sofas, architectural floor lamps, cantilevered chairs, and floating shelves.',
    compatibleRoomTypes: ['living', 'dining', 'office', 'kitchen'],
    defaultPaletteId: 'modern-monochrome',
  },
  {
    id: 'modern-luxury',
    name: 'Modern Luxury',
    subtitle: 'Opulent Finishes & Dramatic Lighting',
    description: 'High-end penthouse aesthetic featuring book-matched Italian marble, smoked mirror panels, and tailored velvet.',
    colorPreferences: ['#2C3338', '#F0F2F5', '#CB904D', '#1B4D3E', '#16191D'],
    materialPreferences: ['Carrara Marble', 'Plush Velvet', 'Brushed Gold', 'Smoked Glass', 'Walnut Veneer'],
    furnitureGuidance: 'Channel-tufted sofas, brass-trimmed coffee tables, statement chandeliers, and plush area rugs.',
    compatibleRoomTypes: ['living', 'dining', 'bedroom'],
    defaultPaletteId: 'jewel-tone-luxury',
  },
  {
    id: 'industrial',
    name: 'Industrial Loft',
    subtitle: 'Raw Materials & Urban Architectural Bones',
    description: 'Celebrates raw structural elements including exposed brick walls, matte black steel beams, and poured concrete floors.',
    colorPreferences: ['#D1D5DB', '#A8ACB3', '#A34E36', '#16191D', '#5C4033'],
    materialPreferences: ['Exposed Brick', 'Polished Concrete', 'Black Iron Pipes', 'Reclaimed Distressed Wood', 'Leather'],
    furnitureGuidance: 'Heavy iron-framed tables, vintage leather Chesterfield seating, open metal pipe shelving, and Edison bulbs.',
    compatibleRoomTypes: ['living', 'office', 'dining'],
    defaultPaletteId: 'modern-monochrome',
  },
  {
    id: 'mid-century-modern',
    name: 'Mid-Century Modern',
    subtitle: '1950s Iconic Curves & Functional Optimism',
    description: 'Classic mid-century silhouette characterized by organic curves, tapered peg legs, warm walnut timbers, and mustard accents.',
    colorPreferences: ['#F5F2EB', '#CFA145', '#58728D', '#6D4C3D', '#A34E36'],
    materialPreferences: ['Molded Plywood', 'Teak & Walnut', 'Bouclé Fabric', 'Terrazzo', 'Brass Accents'],
    furnitureGuidance: 'Iconic lounge armchairs, hairpin-legged coffee tables, credenzas with sliding tambour doors.',
    compatibleRoomTypes: ['living', 'dining', 'office', 'bedroom'],
    defaultPaletteId: 'warm-neutral',
  },
  {
    id: 'bohemian',
    name: 'Bohemian Chic',
    subtitle: 'Eclectic Textures, Macramé & Free Spirit',
    description: 'Layered global textiles, macramé wall hangings, abundant indoor plants, woven wicker, and warm earth tones.',
    colorPreferences: ['#C26D53', '#D8CCA3', '#7D8B7B', '#A86A3D', '#FDFBF7'],
    materialPreferences: ['Woven Rattan', 'Macramé Cotton', 'Jute Rugs', 'Moroccan Tiles', 'Distressed Brass'],
    furnitureGuidance: 'Floor cushions, peacock chairs, hanging hammock chairs, vintage brass trunks, and plant tiers.',
    compatibleRoomTypes: ['living', 'bedroom', 'balcony'],
    defaultPaletteId: 'earthy-terracotta',
  },
  {
    id: 'coastal',
    name: 'Calm Coastal',
    subtitle: 'Sun-Drenched Shorelines & Driftwood',
    description: 'Bright seaside tranquility with white-washed shiplap, weathered gray wood, blue accents, and open ocean breezes.',
    colorPreferences: ['#F8F9FA', '#8FA9C4', '#C8BEB2', '#D1DCE5', '#316B77'],
    materialPreferences: ['Weathered Oak', 'Slub Cotton Linen', 'Sea Glass', 'White Ceramic', 'Jute Rope'],
    furnitureGuidance: 'Slipcovered white couches, distressed driftwood coffee tables, nautical lanterns, and woven baskets.',
    compatibleRoomTypes: ['living', 'bedroom', 'dining'],
    defaultPaletteId: 'coastal-blue',
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean Villa',
    subtitle: 'Sun-Baked Stucco & Terracotta Arches',
    description: 'Warm coastal architecture featuring textured white stucco walls, terracotta tile floors, wrought iron, and olive trees.',
    colorPreferences: ['#FAF8F5', '#C26D53', '#6B705C', '#CB904D', '#316B77'],
    materialPreferences: ['Handmade Terracotta Tile', 'Rough Plaster', 'Wrought Iron', 'Limestone', 'Olive Wood'],
    furnitureGuidance: 'Curved stucco alcoves, iron chandeliers, rustic timber dining sets, and large terracotta urns.',
    compatibleRoomTypes: ['living', 'dining', 'kitchen', 'terrace'],
    defaultPaletteId: 'earthy-terracotta',
  },
  {
    id: 'rustic',
    name: 'Rustic Warmth',
    subtitle: 'Rugged Timbers & Hearthside Comfort',
    description: 'Hearty, grounded charm with exposed ceiling beams, rough-hewn stone fireplaces, and warm handcrafted cabinetry.',
    colorPreferences: ['#EBE7DE', '#5C4033', '#8E4A31', '#B0A99F', '#24292E'],
    materialPreferences: ['Rough-sawn Timber', 'Fieldstone', 'Forged Iron', 'Woven Wool Plaid'],
    furnitureGuidance: 'Heavy timber farmhouse tables, deep leather armchairs, wrought-iron fire tools, and chunky knit blankets.',
    compatibleRoomTypes: ['living', 'dining', 'bedroom'],
    defaultPaletteId: 'olive-and-walnut',
  },
  {
    id: 'farmhouse',
    name: 'Modern Farmhouse',
    subtitle: 'Cozy Nostalgia Meets Clean Modernity',
    description: 'Welcoming blend of vintage country comfort with crisp white shiplap walls, black metal accents, and apron-front fixtures.',
    colorPreferences: ['#FAF8F5', '#C8C2BC', '#16191D', '#C49A6C', '#7D8B7B'],
    materialPreferences: ['White Shiplap', 'Distressed Pine', 'Matte Black Hardware', 'Galvanized Metal'],
    furnitureGuidance: 'Cross-back dining chairs, sliding barn doors, trestle dining tables, and soft buffalo check pillows.',
    compatibleRoomTypes: ['kitchen', 'dining', 'living'],
    defaultPaletteId: 'scandinavian-light',
  },
  {
    id: 'art-deco',
    name: 'Art Deco Glamour',
    subtitle: '1920s Symmetrical Splendor & Brass Inlays',
    description: 'Dramatic geometry, sunburst motifs, polished gold inlays, exotic wood veneers, and rich jewel-toned velvets.',
    colorPreferences: ['#16191D', '#CB904D', '#1B4D3E', '#F0F2F5', '#4B384C'],
    materialPreferences: ['High-gloss Lacquer', 'Polished Brass', 'Burl Walnut', 'Faceted Glass', 'Velvet'],
    furnitureGuidance: 'Scalloped back velvet club chairs, geometric gold inlays, stepped mirrors, and drinks carts.',
    compatibleRoomTypes: ['living', 'dining', 'bar', 'powder_room'],
    defaultPaletteId: 'jewel-tone-luxury',
  },
  {
    id: 'classic-european',
    name: 'Classic European',
    subtitle: 'Timeless Millwork, Parquet & Elegance',
    description: 'Parisian Haussmannian inspiration with ornate wall wainscoting, French herringbone parquet, and gilded mirrors.',
    colorPreferences: ['#FDFBF7', '#E5DCce', '#B88B58', '#CB904D', '#9E9285'],
    materialPreferences: ['Ornate Wainscoting', 'Herringbone Oak', 'White Marble Mantel', 'Gilt Wood', 'Linen'],
    furnitureGuidance: 'Louis XVI style armchairs, antique marble mantelpiece, tall gilded mirrors, and crystal chandeliers.',
    compatibleRoomTypes: ['living', 'dining', 'bedroom'],
    defaultPaletteId: 'warm-neutral',
  },
  {
    id: 'transitional',
    name: 'Transitional Harmony',
    subtitle: 'The Perfect Bridge Between Classic and Modern',
    description: 'Blends traditional architectural comfort with sleek modern lines. Focuses on neutral palettes and subtle textures.',
    colorPreferences: ['#F5F2EB', '#C8C2BC', '#3B4252', '#C49A6C', '#FAF8F5'],
    materialPreferences: ['Tailored Chenille', 'Honed Granite', 'Warm Brushed Nickel', 'White Oak'],
    furnitureGuidance: 'Curved track-arm sofas, round stone accent tables, tailored Roman blinds, and balanced symmetry.',
    compatibleRoomTypes: ['living', 'bedroom', 'dining', 'family_room'],
    defaultPaletteId: 'warm-neutral',
  },
  {
    id: 'eclectic',
    name: 'Curated Eclectic',
    subtitle: 'Personal Expression & Joyful Contrast',
    description: 'Fearlessly combines disparate eras, art collections, and global travel artifacts into a cohesive personal story.',
    colorPreferences: ['#FAF8F5', '#C26D53', '#316B77', '#CFA145', '#16191D'],
    materialPreferences: ['Mixed Pattern Textiles', 'Gallery Wall Frames', 'Sculptural Ceramics', 'Vintage Finds'],
    furnitureGuidance: 'Mix-and-match dining chairs, gallery wall focal points, vintage cocktail tables, and layered rugs.',
    compatibleRoomTypes: ['living', 'study', 'bedroom'],
    defaultPaletteId: 'contemporary-indian',
  },
  {
    id: 'organic-modern',
    name: 'Organic Modern',
    subtitle: 'Sculptural Curves & Raw Earth Form',
    description: 'Smooth organic contours, unlacquered finishes, live-edge wood surfaces, and porous travertine stones.',
    colorPreferences: ['#F5F2EB', '#C2BBB0', '#C49A6C', '#7D8B7B', '#EBE7DE'],
    materialPreferences: ['Brushed Travertine', 'Bouclé Wool', 'Live-edge Oak', 'Matte Clay', 'Handwoven Linen'],
    furnitureGuidance: 'Curved organic bean-shaped sofas, pill-shaped marble tables, hollow pottery, and textured plaster lamps.',
    compatibleRoomTypes: ['living', 'bedroom', 'dining'],
    defaultPaletteId: 'warm-neutral',
  },
  {
    id: 'wabi-sabi',
    name: 'Wabi-Sabi',
    subtitle: 'Finding Beauty in Imperfection',
    description: 'Japanese philosophy embracing natural impermanence. Uses uneven plaster, raw wood grain, and weathered pottery.',
    colorPreferences: ['#E6E2D8', '#B3A99F', '#5C4033', '#4F5D4E', '#EFEFEA'],
    materialPreferences: ['Rough Limewash', 'Reclaimed Weathered Cedar', 'Unglazed Stoneware', 'Wrinkled Linen'],
    furnitureGuidance: 'Low rustic wood benches, hand-turned ceramic vessels, tatami woven mats, and branch floral arrangements.',
    compatibleRoomTypes: ['bedroom', 'tea_room', 'living'],
    defaultPaletteId: 'japandi-natural',
  },
  {
    id: 'tropical-modern',
    name: 'Tropical Modern',
    subtitle: 'Lush Foliage, Verandas & Cross-Ventilation',
    description: 'Designed for warm climates with open louvered shutters, natural teak floors, indoor palms, and breathable cane furniture.',
    colorPreferences: ['#FAF8F5', '#2D4436', '#D2B48C', '#CB904D', '#6D4C3D'],
    materialPreferences: ['Teak Wood Slats', 'Rattan & Cane', 'Terrazzo Slabs', 'Louvered Timber', 'Tropical Greenery'],
    furnitureGuidance: 'Cane-backed planters chairs, outdoor-indoor transition daybeds, ceiling fans with wooden blades.',
    compatibleRoomTypes: ['living', 'veranda', 'bedroom', 'dining'],
    defaultPaletteId: 'nature-inspired',
  },
  {
    id: 'minimalist',
    name: 'Pure Minimalist',
    subtitle: 'Clarity, Precision & Essential Form',
    description: 'Uncompromising dedication to essential form. Everything has a dedicated functional place behind seamless push-to-open panels.',
    colorPreferences: ['#FAF8F5', '#D1D5DB', '#16191D', '#9E9285'],
    materialPreferences: ['Corian Acrylic', 'Flush Lacquered Panels', 'Polished Concrete', 'Frameless Glass'],
    furnitureGuidance: 'Monolithic floating islands, hidden storage, concealed baseboards, and monochromatic linear sofas.',
    compatibleRoomTypes: ['kitchen', 'living', 'bedroom', 'office'],
    defaultPaletteId: 'modern-monochrome',
  },
  {
    id: 'traditional-classic',
    name: 'Traditional Classic',
    subtitle: 'Enduring Symmetry & Heritage Warmth',
    description: 'Dignified residential comfort with formal furniture groupings, crown mouldings, rich mahogany, and classic floral or stripe motifs.',
    colorPreferences: ['#FDFBF7', '#5C4033', '#1C2833', '#A34E36', '#CB904D'],
    materialPreferences: ['Mahogany & Cherry', 'Damask Upholstery', 'Brass Sconces', 'Hardwood Parquet'],
    furnitureGuidance: 'Wingback chairs, mahogany roll-top desks, formal camelback sofas, and gilt-framed landscape oil paintings.',
    compatibleRoomTypes: ['living', 'dining', 'study', 'library'],
    defaultPaletteId: 'warm-neutral',
  },
];

// -------------------------------------------------------------
// 4. EXPANDED FLOORING AND SURFACE MATERIALS (14+ Real Materials)
// -------------------------------------------------------------

export const FLOOR_MATERIALS: MaterialOption[] = [
  {
    type: 'hardwood_oak',
    name: 'Natural Blonde Oak',
    category: 'hardwood',
    defaultHex: '#C49A6C',
    description: 'Wide-plank Scandinavian white oak with fine organic grain and satin protective finish.',
    roughness: 0.45,
    metalness: 0.05,
  },
  {
    type: 'hardwood_walnut',
    name: 'Architectural Walnut',
    category: 'hardwood',
    defaultHex: '#6D4C3D',
    description: 'Deep, rich dark walnut planks providing luxurious warmth and acoustic comfort.',
    roughness: 0.42,
    metalness: 0.05,
  },
  {
    type: 'hardwood_ash',
    name: 'Pale Scandinavian Ash',
    category: 'hardwood',
    defaultHex: '#D6C5AD',
    description: 'Light cream hardwood plank with distinctive flowing grain that brightens north-facing rooms.',
    roughness: 0.48,
    metalness: 0.04,
  },
  {
    type: 'dark_wood',
    name: 'Smoked Wenge / Dark Teak',
    category: 'hardwood',
    defaultHex: '#3E2A20',
    description: 'Dramatic smoked timber with deep chocolate tones anchoring bright focal furnishings.',
    roughness: 0.4,
    metalness: 0.08,
  },
  {
    type: 'bamboo_cane',
    name: 'Pressed Eco Bamboo',
    category: 'hardwood',
    defaultHex: '#D2B48C',
    description: 'Sustainable strand-woven bamboo offering exceptional durability and clean linear texture.',
    roughness: 0.5,
    metalness: 0.04,
  },
  {
    type: 'herringbone_parquet',
    name: 'Chevron French Parquet',
    category: 'hardwood',
    defaultHex: '#B88B58',
    description: 'Artisan chevron layout delivering timeless Haussmannian Parisian elegance.',
    roughness: 0.45,
    metalness: 0.05,
  },
  {
    type: 'polished_concrete',
    name: 'Poured Polished Concrete',
    category: 'composite_masonry',
    defaultHex: '#A8ACB3',
    description: 'Seamless monolithic industrial gray with subtle aggregate stone speckles.',
    roughness: 0.28,
    metalness: 0.12,
  },
  {
    type: 'exposed_brick',
    name: 'Rustic Terracotta Brick Pavers',
    category: 'composite_masonry',
    defaultHex: '#A85A44',
    description: 'Textured handmade clay brick pavers ideal for garden rooms, sunrooms, and verandas.',
    roughness: 0.88,
    metalness: 0.02,
  },
  {
    type: 'natural_stone',
    name: 'Honed Dholpur Stone',
    category: 'stone_tile',
    defaultHex: '#C2BBB0',
    description: 'Large-format natural stone slabs with mineral veining and cooling thermal mass.',
    roughness: 0.6,
    metalness: 0.05,
  },
  {
    type: 'marble_carrara',
    name: 'Polished Carrara Marble',
    category: 'stone_tile',
    defaultHex: '#EAEFF2',
    description: 'Luminous white Italian marble with subtle gray feathery veining and reflective polish.',
    roughness: 0.15,
    metalness: 0.2,
  },
  {
    type: 'limestone_tile',
    name: 'French Limestone Pavers',
    category: 'stone_tile',
    defaultHex: '#D8D2C4',
    description: 'Matte honed beige limestone with ancient fossil impressions and soft walking feel.',
    roughness: 0.65,
    metalness: 0.04,
  },
  {
    type: 'terrazzo',
    name: 'Venetian Composite Terrazzo',
    category: 'composite_masonry',
    defaultHex: '#E2DDD4',
    description: 'Durable composite with crushed marble, quartz, and granite chips in cement binder.',
    roughness: 0.25,
    metalness: 0.1,
  },
  {
    type: 'ceramic_tile',
    name: 'Matte Architectural Porcelain',
    category: 'stone_tile',
    defaultHex: '#E5E7EB',
    description: 'Precision rectified porcelain tile with stain-resistant glaze and ultra-thin grout lines.',
    roughness: 0.35,
    metalness: 0.08,
  },
  {
    type: 'jute_carpet',
    name: 'Natural Woven Jute Carpet',
    category: 'natural_woven',
    defaultHex: '#B89B72',
    description: 'Deep textured bouclé weave natural vegetable fiber carpet bringing tactile warmth underfoot.',
    roughness: 0.95,
    metalness: 0.01,
  },
];

// Helper functions for easy searching and filtering
export function findPaintColor(idOrHex: string): PaintColor | undefined {
  const norm = idOrHex.toLowerCase().trim();
  return PAINT_COLORS.find(c => c.id.toLowerCase() === norm || c.hex.toLowerCase() === norm);
}

export function filterPaintColors(params: {
  family?: ColorFamily;
  tag?: 'wall' | 'accent' | 'ceiling' | 'trim' | 'cabinetry';
  searchQuery?: string;
}): PaintColor[] {
  return PAINT_COLORS.filter(c => {
    if (params.family && c.family !== params.family) return false;
    if (params.tag && !c.usageTags.includes(params.tag)) return false;
    if (params.searchQuery) {
      const q = params.searchQuery.toLowerCase().trim();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchFamily = c.family.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchFamily) return false;
    }
    return true;
  });
}

export function findCuratedPalette(id: string): CuratedPalette | undefined {
  return CURATED_PALETTES.find(p => p.id === id);
}

export function findInteriorStyle(id: string): InteriorStyle | undefined {
  return INTERIOR_STYLES.find(s => s.id === id);
}

export function findFloorMaterial(type: FloorType): MaterialOption | undefined {
  return FLOOR_MATERIALS.find(m => m.type === type);
}
