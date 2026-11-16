export type JewelryCategory =
  | "solitaire-ring"
  | "halo-ring"
  | "three-stone-ring"
  | "signet-ring"
  | "bezel-ring"
  | "pendant";

export type BandProfile =
  | "court-comfort"
  | "flat-cigar"
  | "knife-edge"
  | "cathedral"
  | "split-shank"
  | "twisted-rope";

export type GemCut =
  | "round"
  | "oval"
  | "emerald"
  | "princess"
  | "pear"
  | "marquise"
  | "cushion";

export type SelectablePart =
  | "none"
  | "head-assembly"
  | "center-stone"
  | "shank"
  | "halo"
  | "side-stones";

export interface TransformOffset {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export type MetalAlloy =
  | "18k-yellow"
  | "18k-white"
  | "18k-rose"
  | "22k-gold"
  | "platinum"
  | "925-silver";

export type GemstoneType =
  | "diamond"
  | "sapphire"
  | "ruby"
  | "emerald"
  | "moissanite"
  | "black-onyx";

export interface JewelryBlueprint {
  designName: string;
  category: JewelryCategory;

  // 1. Shank & Ring Sizing (1 unit = 1.0mm)
  ringSizeUS: number;
  innerDiameter: number;
  bandProfile: BandProfile;
  bandWidth: number;
  bandThickness: number;
  cathedralArchHeight: number;
  splitShankGap: number;

  // 2. Setting Head, Basket & Prong Architecture (mm)
  headElevation: number;
  prongCount: number;
  prongThickness: number;
  prongSpread: number;
  prongTipStyle: "claw" | "button" | "tab";
  galleryRailEnabled: boolean;
  bezelEnabled: boolean;
  bezelWallThickness: number;

  // 3. Primary Center Gemstone (mm)
  gemCut: GemCut;
  gemLength: number;
  gemWidth: number;
  gemDepth: number;

  // 4. Three-Stone Flanking Gemstones (mm)
  threeStoneEnabled: boolean;
  flankGemSize: number;
  flankTiltAngleDeg: number;

  // 5. Halo & Shank Pavé Stones (mm)
  haloEnabled: boolean;
  haloStoneDiameter: number;
  haloGapFromCenter: number;
  paveCountPerSide: number;
  paveStoneDiameter: number;

  // 6. Signet & Pendant Specifics (mm)
  signetPlateauWidth: number;
  signetPlateauLength: number;
  pendantShape: "heart" | "oval" | "pear" | "round" | "octagon";
  pendantHeight: number;
  pendantWidth: number;
  pendantThickness: number;
  pendantBailType: "triangular" | "tapered" | "ring";
  pendantBailDiameter: number;
  pendantBorderStyle: "scalloped" | "beaded" | "smooth";
  pendantCenterMotif: "floral-clover" | "gemstone" | "filigree-star" | "plain";

  // 7. Interactive 3D Gizmo Offsets
  partTransforms: Record<SelectablePart, TransformOffset>;

  // 8. Studio Render Materials
  metalAlloy: MetalAlloy;
  metalColorHex: string;
  gemstoneType: GemstoneType;
  gemColorHex: string;
}

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

export const DEFAULT_BLUEPRINT: JewelryBlueprint = {
  designName: "Imperial Cathedral Halo Solitaire",
  category: "halo-ring",
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

export const INDUSTRY_PRESETS: Array<{ id: string; name: string; subtitle: string; category: JewelryCategory; blueprint: Partial<JewelryBlueprint> }> = [
  {
    id: "cathedral-halo",
    name: "Imperial Cathedral Halo",
    subtitle: "Cathedral arch with micro-pavé halo & round brilliant center",
    category: "halo-ring",
    blueprint: {
      ...DEFAULT_BLUEPRINT,
    },
  },
  {
    id: "tiffany-solitaire",
    name: "Tiffany 6-Prong Solitaire",
    subtitle: "Knife-edge shank with 6-claw wire basket head",
    category: "solitaire-ring",
    blueprint: {
      ...DEFAULT_BLUEPRINT,
      designName: "Tiffany 6-Prong Classic Solitaire",
      category: "solitaire-ring",
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
      ...DEFAULT_BLUEPRINT,
      designName: "Grand Emerald Cut Trilogy",
      category: "three-stone-ring",
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
    id: "executive-signet",
    name: "Executive Octagon Signet",
    subtitle: "Heavy comfort-fit tapering shank with solid onyx table",
    category: "signet-ring",
    blueprint: {
      ...DEFAULT_BLUEPRINT,
      designName: "Executive Octagon Signet Ring",
      category: "signet-ring",
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
      ...DEFAULT_BLUEPRINT,
      designName: "Royal Oval Sapphire Halo Pendant",
      category: "pendant",
      headElevation: 6.0,
      pendantBailDiameter: 5.2,
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
      ...DEFAULT_BLUEPRINT,
      designName: "Traditional 22K Gold Filigree Heart Medallion",
      category: "pendant",
      pendantShape: "heart",
      pendantHeight: 32.0,
      pendantWidth: 28.0,
      pendantThickness: 1.4,
      pendantBailType: "triangular",
      pendantBailDiameter: 5.5,
      pendantBorderStyle: "scalloped",
      pendantCenterMotif: "floral-clover",
      prongCount: 0,
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
