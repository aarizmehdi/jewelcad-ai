import { z } from "zod";

// ============================================================================
// 1. CATEGORIES & CORE ENUMS
// ============================================================================

export const JewelryCategorySchema = z.enum([
  "solitaire-ring",
  "halo-ring",
  "three-stone-ring",
  "signet-ring",
  "bezel-ring",
  "pendant",
  "plain-band",
]);
export type JewelryCategory = z.infer<typeof JewelryCategorySchema>;

export const BandProfileSchema = z.enum([
  "court-comfort",
  "flat-cigar",
  "knife-edge",
  "cathedral",
  "split-shank",
  "twisted-rope",
]);
export type BandProfile = z.infer<typeof BandProfileSchema>;

export const GemCutSchema = z.enum([
  "round",
  "oval",
  "emerald",
  "princess",
  "pear",
  "marquise",
  "cushion",
]);
export type GemCut = z.infer<typeof GemCutSchema>;

export const SelectablePartSchema = z.enum([
  "none",
  "head-assembly",
  "center-stone",
  "shank",
  "halo",
  "side-stones",
]);
export type SelectablePart = z.infer<typeof SelectablePartSchema>;

export const ProngTipStyleSchema = z.enum(["claw", "button", "tab"]);
export type ProngTipStyle = z.infer<typeof ProngTipStyleSchema>;

export const MetalAlloySchema = z.enum([
  "18k-yellow",
  "18k-white",
  "18k-rose",
  "22k-gold",
  "platinum",
  "925-silver",
]);
export type MetalAlloy = z.infer<typeof MetalAlloySchema>;

export const GemstoneTypeSchema = z.enum([
  "diamond",
  "sapphire",
  "ruby",
  "emerald",
  "moissanite",
  "black-onyx",
]);
export type GemstoneType = z.infer<typeof GemstoneTypeSchema>;

// ============================================================================
// 2. PENDANT SPECIFIC ENUMS
// ============================================================================

export const PendantShapeSchema = z.enum([
  "heart",
  "oval",
  "pear",
  "round",
  "octagon",
]);
export type PendantShape = z.infer<typeof PendantShapeSchema>;

export const PendantBailTypeSchema = z.enum([
  "triangular",
  "tapered",
  "ring",
]);
export type PendantBailType = z.infer<typeof PendantBailTypeSchema>;

export const PendantBorderStyleSchema = z.enum([
  "scalloped",
  "beaded",
  "smooth",
]);
export type PendantBorderStyle = z.infer<typeof PendantBorderStyleSchema>;

export const PendantCenterMotifSchema = z.enum([
  "floral-clover",
  "gemstone",
  "filigree-star",
  "plain",
]);
export type PendantCenterMotif = z.infer<typeof PendantCenterMotifSchema>;

// ============================================================================
// 3. AI & VALIDATION STATUS ENUMS
// ============================================================================

export const GenerationStatusSchema = z.enum([
  "preview",
  "validated",
  "failed",
  "requires-review",
]);
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;

// ============================================================================
// 4. TRANSFORMS & STRUCTURAL TYPES
// ============================================================================

export const TransformOffsetSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number()]),
  scale: z.tuple([z.number(), z.number(), z.number()]),
});
export type TransformOffset = z.infer<typeof TransformOffsetSchema>;

export const PartTransformsSchema = z.object({
  "none": TransformOffsetSchema,
  "head-assembly": TransformOffsetSchema,
  "center-stone": TransformOffsetSchema,
  "shank": TransformOffsetSchema,
  "halo": TransformOffsetSchema,
  "side-stones": TransformOffsetSchema,
});
export type PartTransforms = z.infer<typeof PartTransformsSchema>;

export const HexColorSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
  message: "Invalid hex color format (e.g. #FFFFFF or #FFF)",
});

// ============================================================================
// 5. DIMENSION BOUNDS (Strict jewelry manufacturing boundaries in mm)
// ============================================================================

export const DIMENSION_BOUNDS = {
  ringSizeUS: { min: 3.0, max: 16.0, default: 7.0, label: "Ring Size (US)" },
  innerDiameter: { min: 13.0, max: 26.0, default: 17.3, label: "Inner Diameter (mm)" },
  bandWidth: { min: 1.0, max: 20.0, default: 2.4, label: "Band Width (mm)" },
  bandThickness: { min: 0.8, max: 6.0, default: 1.8, label: "Band Thickness (mm)" },
  cathedralArchHeight: { min: 0.0, max: 10.0, default: 3.8, label: "Cathedral Arch Height (mm)" },
  splitShankGap: { min: 0.0, max: 6.0, default: 1.6, label: "Split Shank Gap (mm)" },
  headElevation: { min: 0.0, max: 15.0, default: 5.8, label: "Head Elevation (mm)" },
  prongCount: { min: 0, max: 16, default: 4, label: "Prong Count" },
  prongThickness: { min: 0.4, max: 3.0, default: 0.95, label: "Prong Thickness (mm)" },
  prongSpread: { min: 0.5, max: 2.0, default: 0.96, label: "Prong Spread" },
  bezelWallThickness: { min: 0.3, max: 3.0, default: 0.9, label: "Bezel Wall Thickness (mm)" },
  gemLength: { min: 0.5, max: 30.0, default: 6.5, label: "Gem Length (mm)" },
  gemWidth: { min: 0.5, max: 30.0, default: 6.5, label: "Gem Width (mm)" },
  gemDepth: { min: 0.5, max: 20.0, default: 4.0, label: "Gem Depth (mm)" },
  flankGemSize: { min: 0.0, max: 15.0, default: 3.5, label: "Flank Gem Size (mm)" },
  flankTiltAngleDeg: { min: 0.0, max: 60.0, default: 22.0, label: "Flank Tilt Angle (deg)" },
  haloStoneDiameter: { min: 0.5, max: 4.0, default: 1.3, label: "Halo Stone Diameter (mm)" },
  haloGapFromCenter: { min: 0.0, max: 3.0, default: 0.25, label: "Halo Gap (mm)" },
  paveCountPerSide: { min: 0, max: 30, default: 8, label: "Pavé Count Per Side" },
  paveStoneDiameter: { min: 0.5, max: 4.0, default: 1.5, label: "Pavé Stone Diameter (mm)" },
  signetPlateauWidth: { min: 4.0, max: 30.0, default: 11.0, label: "Signet Plateau Width (mm)" },
  signetPlateauLength: { min: 4.0, max: 30.0, default: 12.0, label: "Signet Plateau Length (mm)" },
  pendantHeight: { min: 5.0, max: 100.0, default: 32.0, label: "Pendant Height (mm)" },
  pendantWidth: { min: 5.0, max: 100.0, default: 28.0, label: "Pendant Width (mm)" },
  pendantThickness: { min: 0.5, max: 15.0, default: 1.4, label: "Pendant Thickness (mm)" },
  pendantBailDiameter: { min: 1.5, max: 20.0, default: 5.5, label: "Pendant Bail Diameter (mm)" },
  designConfidence: { min: 0.0, max: 1.0, default: 1.0, label: "Design Confidence (0-1)" },
} as const;

// ============================================================================
// 6. COMPREHENSIVE JEWELRY DESIGN ZOD SCHEMA
// ============================================================================

export const JewelryDesignSchema = z.object({
  designName: z.string().min(1, "designName is required").max(120),
  category: JewelryCategorySchema,
  hasGemstone: z.boolean(),

  // 1. Shank & Ring Sizing (1 unit = 1.0mm)
  ringSizeUS: z.number().min(DIMENSION_BOUNDS.ringSizeUS.min).max(DIMENSION_BOUNDS.ringSizeUS.max),
  innerDiameter: z.number().min(DIMENSION_BOUNDS.innerDiameter.min).max(DIMENSION_BOUNDS.innerDiameter.max),
  bandProfile: BandProfileSchema,
  bandWidth: z.number().min(DIMENSION_BOUNDS.bandWidth.min).max(DIMENSION_BOUNDS.bandWidth.max),
  bandThickness: z.number().min(DIMENSION_BOUNDS.bandThickness.min).max(DIMENSION_BOUNDS.bandThickness.max),
  cathedralArchHeight: z.number().min(DIMENSION_BOUNDS.cathedralArchHeight.min).max(DIMENSION_BOUNDS.cathedralArchHeight.max),
  splitShankGap: z.number().min(DIMENSION_BOUNDS.splitShankGap.min).max(DIMENSION_BOUNDS.splitShankGap.max),

  // 2. Setting Head, Basket & Prong Architecture (mm)
  headElevation: z.number().min(DIMENSION_BOUNDS.headElevation.min).max(DIMENSION_BOUNDS.headElevation.max),
  prongCount: z.number().int().min(DIMENSION_BOUNDS.prongCount.min).max(DIMENSION_BOUNDS.prongCount.max),
  prongThickness: z.number().min(DIMENSION_BOUNDS.prongThickness.min).max(DIMENSION_BOUNDS.prongThickness.max),
  prongSpread: z.number().min(DIMENSION_BOUNDS.prongSpread.min).max(DIMENSION_BOUNDS.prongSpread.max),
  prongTipStyle: ProngTipStyleSchema,
  galleryRailEnabled: z.boolean(),
  bezelEnabled: z.boolean(),
  bezelWallThickness: z.number().min(DIMENSION_BOUNDS.bezelWallThickness.min).max(DIMENSION_BOUNDS.bezelWallThickness.max),

  // 3. Primary Center Gemstone (mm)
  gemCut: GemCutSchema,
  gemLength: z.number().min(DIMENSION_BOUNDS.gemLength.min).max(DIMENSION_BOUNDS.gemLength.max),
  gemWidth: z.number().min(DIMENSION_BOUNDS.gemWidth.min).max(DIMENSION_BOUNDS.gemWidth.max),
  gemDepth: z.number().min(DIMENSION_BOUNDS.gemDepth.min).max(DIMENSION_BOUNDS.gemDepth.max),

  // 4. Three-Stone Flanking Gemstones (mm)
  threeStoneEnabled: z.boolean(),
  flankGemSize: z.number().min(DIMENSION_BOUNDS.flankGemSize.min).max(DIMENSION_BOUNDS.flankGemSize.max),
  flankTiltAngleDeg: z.number().min(DIMENSION_BOUNDS.flankTiltAngleDeg.min).max(DIMENSION_BOUNDS.flankTiltAngleDeg.max),

  // 5. Halo & Shank Pavé Stones (mm)
  haloEnabled: z.boolean(),
  haloStoneDiameter: z.number().min(DIMENSION_BOUNDS.haloStoneDiameter.min).max(DIMENSION_BOUNDS.haloStoneDiameter.max),
  haloGapFromCenter: z.number().min(DIMENSION_BOUNDS.haloGapFromCenter.min).max(DIMENSION_BOUNDS.haloGapFromCenter.max),
  paveCountPerSide: z.number().int().min(DIMENSION_BOUNDS.paveCountPerSide.min).max(DIMENSION_BOUNDS.paveCountPerSide.max),
  paveStoneDiameter: z.number().min(DIMENSION_BOUNDS.paveStoneDiameter.min).max(DIMENSION_BOUNDS.paveStoneDiameter.max),

  // 6. Signet & Pendant Specifics (mm)
  signetPlateauWidth: z.number().min(DIMENSION_BOUNDS.signetPlateauWidth.min).max(DIMENSION_BOUNDS.signetPlateauWidth.max),
  signetPlateauLength: z.number().min(DIMENSION_BOUNDS.signetPlateauLength.min).max(DIMENSION_BOUNDS.signetPlateauLength.max),
  pendantShape: PendantShapeSchema,
  pendantHeight: z.number().min(DIMENSION_BOUNDS.pendantHeight.min).max(DIMENSION_BOUNDS.pendantHeight.max),
  pendantWidth: z.number().min(DIMENSION_BOUNDS.pendantWidth.min).max(DIMENSION_BOUNDS.pendantWidth.max),
  pendantThickness: z.number().min(DIMENSION_BOUNDS.pendantThickness.min).max(DIMENSION_BOUNDS.pendantThickness.max),
  pendantBailType: PendantBailTypeSchema,
  pendantBailDiameter: z.number().min(DIMENSION_BOUNDS.pendantBailDiameter.min).max(DIMENSION_BOUNDS.pendantBailDiameter.max),
  pendantBorderStyle: PendantBorderStyleSchema,
  pendantCenterMotif: PendantCenterMotifSchema,

  // 7. Interactive 3D Gizmo Offsets
  partTransforms: PartTransformsSchema,

  // 8. Studio Render Materials
  metalAlloy: MetalAlloySchema,
  metalColorHex: HexColorSchema,
  gemstoneType: GemstoneTypeSchema,
  gemColorHex: HexColorSchema,

  // 9. AI Generation & Validation Metadata
  designConfidence: z.number().min(0).max(1),
  unsupportedFeatures: z.array(z.string()),
  generationStatus: GenerationStatusSchema,
});

export type JewelryDesign = z.infer<typeof JewelryDesignSchema>;
export type JewelryBlueprint = JewelryDesign;

// ============================================================================
// 7. LOOSE AI RESPONSE SCHEMA (Permissive raw input before validation)
// ============================================================================

export const RawAIResponseSchema = z.object({
  designName: z.string().optional(),
  category: JewelryCategorySchema.optional(),
  hasGemstone: z.boolean().optional(),
  ringSizeUS: z.number().optional(),
  innerDiameter: z.number().optional(),
  bandProfile: BandProfileSchema.optional(),
  bandWidth: z.number().optional(),
  bandThickness: z.number().optional(),
  cathedralArchHeight: z.number().optional(),
  splitShankGap: z.number().optional(),
  headElevation: z.number().optional(),
  prongCount: z.number().optional(),
  prongThickness: z.number().optional(),
  prongSpread: z.number().optional(),
  prongTipStyle: ProngTipStyleSchema.optional(),
  galleryRailEnabled: z.boolean().optional(),
  bezelEnabled: z.boolean().optional(),
  bezelWallThickness: z.number().optional(),
  gemCut: GemCutSchema.optional(),
  gemLength: z.number().optional(),
  gemWidth: z.number().optional(),
  gemDepth: z.number().optional(),
  threeStoneEnabled: z.boolean().optional(),
  flankGemSize: z.number().optional(),
  flankTiltAngleDeg: z.number().optional(),
  haloEnabled: z.boolean().optional(),
  haloStoneDiameter: z.number().optional(),
  haloGapFromCenter: z.number().optional(),
  paveCountPerSide: z.number().optional(),
  paveStoneDiameter: z.number().optional(),
  signetPlateauWidth: z.number().optional(),
  signetPlateauLength: z.number().optional(),
  pendantShape: PendantShapeSchema.optional(),
  pendantHeight: z.number().optional(),
  pendantWidth: z.number().optional(),
  pendantThickness: z.number().optional(),
  pendantBailType: PendantBailTypeSchema.optional(),
  pendantBailDiameter: z.number().optional(),
  pendantBorderStyle: PendantBorderStyleSchema.optional(),
  pendantCenterMotif: PendantCenterMotifSchema.optional(),
  partTransforms: PartTransformsSchema.optional(),
  metalAlloy: MetalAlloySchema.optional(),
  metalColorHex: z.string().optional(),
  gemstoneType: GemstoneTypeSchema.optional(),
  gemColorHex: z.string().optional(),
  designConfidence: z.number().optional(),
  unsupportedFeatures: z.array(z.string()).optional(),
  generationStatus: GenerationStatusSchema.optional(),
}).passthrough();
export type RawAIResponse = z.infer<typeof RawAIResponseSchema>;

// ============================================================================
// 8. CONSTANTS, DEFAULTS & SPECIFICATIONS
// ============================================================================

export const ZERO_TRANSFORM: TransformOffset = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

export const DEFAULT_PART_TRANSFORMS: Record<SelectablePart, TransformOffset> = {
  "none": { ...ZERO_TRANSFORM },
  "head-assembly": { ...ZERO_TRANSFORM },
  "center-stone": { ...ZERO_TRANSFORM },
  "shank": { ...ZERO_TRANSFORM },
  "halo": { ...ZERO_TRANSFORM },
  "side-stones": { ...ZERO_TRANSFORM },
};

export const ALLOY_DENSITIES: Record<MetalAlloy, { label: string; density: number; hex: string }> = {
  "18k-yellow": { label: "18K Yellow Gold", density: 15.58, hex: "#E5B824" },
  "18k-white": { label: "18K White Gold", density: 15.90, hex: "#E5E4E2" },
  "18k-rose": { label: "18K Rose Gold", density: 15.10, hex: "#E09F87" },
  "22k-gold": { label: "22K Pure Gold", density: 17.75, hex: "#F5BD02" },
  "platinum": { label: "Platinum 950", density: 21.45, hex: "#D9DCE0" },
  "925-silver": { label: "925 Sterling Silver", density: 10.36, hex: "#F0F2F5" },
};

export const GEMSTONE_SPECS: Record<GemstoneType, { label: string; refractiveIndex: number; dispersion: number; defaultHex: string }> = {
  "diamond": { label: "Natural Diamond", refractiveIndex: 2.417, dispersion: 0.044, defaultHex: "#F8FAFC" },
  "sapphire": { label: "Royal Blue Sapphire", refractiveIndex: 1.77, dispersion: 0.018, defaultHex: "#1D4ED8" },
  "ruby": { label: "Burmese Pigeon Blood Ruby", refractiveIndex: 1.77, dispersion: 0.018, defaultHex: "#BE123C" },
  "emerald": { label: "Colombian Vivid Emerald", refractiveIndex: 1.58, dispersion: 0.014, defaultHex: "#059669" },
  "moissanite": { label: "D-Color Moissanite", refractiveIndex: 2.65, dispersion: 0.104, defaultHex: "#F1F5F9" },
  "black-onyx": { label: "Midnight Onyx", refractiveIndex: 1.54, dispersion: 0.008, defaultHex: "#0F172A" },
};

export function usSizeToDiameterMM(usSize: number): number {
  return Number((11.63 + usSize * 0.8128).toFixed(2));
}

export function diameterMMToUSSize(diameter: number): number {
  return Number((((diameter - 11.63) / 0.8128) * 2).toFixed(0)) / 2;
}

export const DEFAULT_JEWELRY_DESIGN: JewelryDesign = {
  designName: "Imperial Cathedral Halo Solitaire",
  category: "halo-ring",
  hasGemstone: true,
  ringSizeUS: 7.0,
  innerDiameter: 17.3,
  bandProfile: "cathedral",
  bandWidth: 2.4,
  bandThickness: 1.8,
  cathedralArchHeight: 3.8,
  splitShankGap: 1.6,
  headElevation: 5.8,
  prongCount: 4,
  prongThickness: 0.95,
  prongSpread: 0.96,
  prongTipStyle: "claw",
  galleryRailEnabled: true,
  bezelEnabled: false,
  bezelWallThickness: 0.9,
  gemCut: "round",
  gemLength: 6.5,
  gemWidth: 6.5,
  gemDepth: 4.0,
  threeStoneEnabled: false,
  flankGemSize: 3.5,
  flankTiltAngleDeg: 22,
  haloEnabled: true,
  haloStoneDiameter: 1.3,
  haloGapFromCenter: 0.25,
  paveCountPerSide: 8,
  paveStoneDiameter: 1.5,
  signetPlateauWidth: 11.0,
  signetPlateauLength: 12.0,
  pendantShape: "heart",
  pendantHeight: 32.0,
  pendantWidth: 28.0,
  pendantThickness: 1.4,
  pendantBailType: "triangular",
  pendantBailDiameter: 5.5,
  pendantBorderStyle: "scalloped",
  pendantCenterMotif: "floral-clover",
  partTransforms: JSON.parse(JSON.stringify(DEFAULT_PART_TRANSFORMS)),
  metalAlloy: "18k-white",
  metalColorHex: "#E5E4E2",
  gemstoneType: "diamond",
  gemColorHex: "#FFFFFF",
  designConfidence: 1.0,
  unsupportedFeatures: [],
  generationStatus: "validated",
};

export const DEFAULT_BLUEPRINT: JewelryDesign = DEFAULT_JEWELRY_DESIGN;

export const INDUSTRY_PRESETS: Array<{
  id: string;
  name: string;
  subtitle: string;
  category: JewelryCategory;
  blueprint: Partial<JewelryDesign>;
}> = [
  {
    id: "cathedral-halo",
    name: "Imperial Cathedral Halo",
    subtitle: "Cathedral arch with micro-pavé halo & round brilliant center",
    category: "halo-ring",
    blueprint: {
      ...DEFAULT_JEWELRY_DESIGN,
    },
  },
  {
    id: "tiffany-solitaire",
    name: "Tiffany 6-Prong Solitaire",
    subtitle: "Knife-edge shank with 6-claw wire basket head",
    category: "solitaire-ring",
    blueprint: {
      ...DEFAULT_JEWELRY_DESIGN,
      designName: "Tiffany 6-Prong Classic Solitaire",
      category: "solitaire-ring",
      hasGemstone: true,
      bandProfile: "knife-edge",
      bandWidth: 2.1,
      bandThickness: 1.7,
      headElevation: 6.2,
      prongCount: 6,
      prongThickness: 0.9,
      prongSpread: 0.95,
      prongTipStyle: "claw",
      galleryRailEnabled: true,
      bezelEnabled: false,
      gemCut: "round",
      gemLength: 6.8,
      gemWidth: 6.8,
      gemDepth: 4.2,
      haloEnabled: false,
      threeStoneEnabled: false,
      paveCountPerSide: 0,
      metalAlloy: "platinum",
      metalColorHex: "#D9DCE0",
      gemstoneType: "diamond",
      gemColorHex: "#FFFFFF",
    },
  },
  {
    id: "emerald-trilogy",
    name: "Emerald Trilogy Three-Stone",
    subtitle: "Step-cut emerald center flanked by matched trapezoid stones",
    category: "three-stone-ring",
    blueprint: {
      ...DEFAULT_JEWELRY_DESIGN,
      designName: "Grand Emerald Cut Trilogy",
      category: "three-stone-ring",
      hasGemstone: true,
      bandProfile: "flat-cigar",
      bandWidth: 2.6,
      bandThickness: 1.8,
      headElevation: 5.4,
      prongCount: 4,
      prongThickness: 1.05,
      prongSpread: 0.92,
      prongTipStyle: "tab",
      galleryRailEnabled: true,
      bezelEnabled: false,
      gemCut: "emerald",
      gemLength: 8.5,
      gemWidth: 6.5,
      gemDepth: 4.6,
      threeStoneEnabled: true,
      flankGemSize: 4.2,
      flankTiltAngleDeg: 24,
      haloEnabled: false,
      paveCountPerSide: 4,
      paveStoneDiameter: 1.4,
      metalAlloy: "18k-yellow",
      metalColorHex: "#E5B824",
      gemstoneType: "diamond",
      gemColorHex: "#FFFFFF",
    },
  },
  {
    id: "classic-plain-band",
    name: "Classic Comfort Fit Plain Band",
    subtitle: "Timeless unadorned wedding band with high-polish domed profile",
    category: "plain-band",
    blueprint: {
      ...DEFAULT_JEWELRY_DESIGN,
      designName: "Classic Comfort Fit Plain Band",
      category: "plain-band",
      hasGemstone: false,
      bandProfile: "court-comfort",
      bandWidth: 4.0,
      bandThickness: 1.8,
      prongCount: 0,
      headElevation: 0,
      bezelEnabled: false,
      haloEnabled: false,
      threeStoneEnabled: false,
      paveCountPerSide: 0,
      metalAlloy: "18k-yellow",
      metalColorHex: "#E5B824",
      gemstoneType: "diamond",
      gemColorHex: "#FFFFFF",
    },
  },
  {
    id: "executive-signet",
    name: "Executive Octagon Signet",
    subtitle: "Heavy comfort-fit tapering shank with solid onyx table",
    category: "signet-ring",
    blueprint: {
      ...DEFAULT_JEWELRY_DESIGN,
      designName: "Executive Octagon Signet Ring",
      category: "signet-ring",
      hasGemstone: true,
      bandProfile: "court-comfort",
      bandWidth: 6.5,
      bandThickness: 2.4,
      signetPlateauWidth: 13.5,
      signetPlateauLength: 14.5,
      headElevation: 3.2,
      prongCount: 0,
      bezelEnabled: true,
      bezelWallThickness: 1.2,
      gemCut: "emerald",
      gemLength: 11.0,
      gemWidth: 9.0,
      gemDepth: 2.8,
      haloEnabled: false,
      threeStoneEnabled: false,
      paveCountPerSide: 0,
      metalAlloy: "18k-yellow",
      metalColorHex: "#E5B824",
      gemstoneType: "black-onyx",
      gemColorHex: "#0F172A",
    },
  },
  {
    id: "royal-pendant",
    name: "Royal Oval Sapphire Pendant",
    subtitle: "Suspended bezel basket, filigree gallery & articulated bail",
    category: "pendant",
    blueprint: {
      ...DEFAULT_JEWELRY_DESIGN,
      designName: "Royal Oval Sapphire Halo Pendant",
      category: "pendant",
      hasGemstone: true,
      headElevation: 6.0,
      pendantShape: "oval",
      pendantHeight: 34.0,
      pendantWidth: 26.0,
      pendantThickness: 1.6,
      pendantBailType: "tapered",
      pendantBailDiameter: 5.2,
      pendantBorderStyle: "smooth",
      pendantCenterMotif: "gemstone",
      gemCut: "oval",
      gemLength: 9.0,
      gemWidth: 7.0,
      gemDepth: 4.8,
      prongCount: 4,
      prongThickness: 0.95,
      prongSpread: 0.95,
      prongTipStyle: "claw",
      galleryRailEnabled: true,
      bezelEnabled: false,
      haloEnabled: true,
      haloStoneDiameter: 1.5,
      haloGapFromCenter: 0.35,
      threeStoneEnabled: false,
      paveCountPerSide: 0,
      metalAlloy: "18k-white",
      metalColorHex: "#E5E4E2",
      gemstoneType: "sapphire",
      gemColorHex: "#1D4ED8",
    },
  },
  {
    id: "filigree-heart-pendant",
    name: "22K Gold Filigree Heart (#32)",
    subtitle: "Nested heart medallion, floral clover, openwork jali & triangular bail",
    category: "pendant",
    blueprint: {
      ...DEFAULT_JEWELRY_DESIGN,
      designName: "Traditional 22K Gold Filigree Heart Medallion",
      category: "pendant",
      hasGemstone: false,
      pendantShape: "heart",
      pendantHeight: 32.0,
      pendantWidth: 28.0,
      pendantThickness: 1.4,
      pendantBailType: "triangular",
      pendantBailDiameter: 5.5,
      pendantBorderStyle: "scalloped",
      pendantCenterMotif: "floral-clover",
      prongCount: 0,
      headElevation: 0,
      bezelEnabled: false,
      haloEnabled: false,
      threeStoneEnabled: false,
      paveCountPerSide: 0,
      metalAlloy: "22k-gold",
      metalColorHex: "#F5BD02",
      gemstoneType: "diamond",
      gemColorHex: "#FFFFFF",
    },
  },
];
