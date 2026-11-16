import { z } from "zod";
import {
  JewelryBlueprint,
  JewelryCategory,
  BandProfile,
  GemCut,
  MetalAlloy,
  GemstoneType,
  DEFAULT_BLUEPRINT,
  DEFAULT_PART_TRANSFORMS,
  usSizeToDiameterMM,
} from "@/types/cad";

// ---------------------------------------------------------------------------
// 1. ZOD ENUM SCHEMAS
// ---------------------------------------------------------------------------

export const JewelryCategorySchema = z.enum([
  "solitaire-ring",
  "halo-ring",
  "three-stone-ring",
  "signet-ring",
  "bezel-ring",
  "plain-band",
  "pendant",
]);

export const BandProfileSchema = z.enum([
  "court-comfort",
  "flat-cigar",
  "knife-edge",
  "cathedral",
  "split-shank",
  "twisted-rope",
]);

export const GemCutSchema = z.enum([
  "round",
  "oval",
  "emerald",
  "princess",
  "pear",
  "marquise",
  "cushion",
]);

export const MetalAlloySchema = z.enum([
  "18k-yellow",
  "18k-white",
  "18k-rose",
  "22k-gold",
  "platinum",
  "925-silver",
]);

export const GemstoneTypeSchema = z.enum([
  "diamond",
  "sapphire",
  "ruby",
  "emerald",
  "moissanite",
  "black-onyx",
]);

export const PendantShapeSchema = z.enum([
  "heart",
  "oval",
  "pear",
  "round",
  "octagon",
]);

export const PendantBailTypeSchema = z.enum([
  "triangular",
  "tapered",
  "ring",
]);

export const PendantBorderStyleSchema = z.enum([
  "scalloped",
  "beaded",
  "smooth",
]);

export const PendantCenterMotifSchema = z.enum([
  "floral-clover",
  "gemstone",
  "filigree-star",
  "plain",
]);

// ---------------------------------------------------------------------------
// 2. RAW AI RESPONSE SCHEMA (Lenient with defaults)
// ---------------------------------------------------------------------------

export const RawAiBlueprintSchema = z.object({
  designName: z.string().optional(),
  category: z.string().optional(),
  ringSizeUS: z.number().or(z.string()).optional(),
  innerDiameter: z.number().or(z.string()).optional(),
  bandProfile: z.string().optional(),
  bandWidth: z.number().or(z.string()).optional(),
  bandThickness: z.number().or(z.string()).optional(),
  cathedralArchHeight: z.number().or(z.string()).optional(),
  splitShankGap: z.number().or(z.string()).optional(),
  headElevation: z.number().or(z.string()).optional(),
  prongCount: z.number().or(z.string()).optional(),
  prongThickness: z.number().or(z.string()).optional(),
  prongSpread: z.number().or(z.string()).optional(),
  prongTipStyle: z.string().optional(),
  galleryRailEnabled: z.boolean().or(z.string()).optional(),
  bezelEnabled: z.boolean().or(z.string()).optional(),
  bezelWallThickness: z.number().or(z.string()).optional(),
  gemCut: z.string().optional(),
  gemLength: z.number().or(z.string()).optional(),
  gemWidth: z.number().or(z.string()).optional(),
  gemDepth: z.number().or(z.string()).optional(),
  threeStoneEnabled: z.boolean().or(z.string()).optional(),
  flankGemSize: z.number().or(z.string()).optional(),
  flankTiltAngleDeg: z.number().or(z.string()).optional(),
  haloEnabled: z.boolean().or(z.string()).optional(),
  haloStoneDiameter: z.number().or(z.string()).optional(),
  haloGapFromCenter: z.number().or(z.string()).optional(),
  paveCountPerSide: z.number().or(z.string()).optional(),
  paveStoneDiameter: z.number().or(z.string()).optional(),
  signetPlateauWidth: z.number().or(z.string()).optional(),
  signetPlateauLength: z.number().or(z.string()).optional(),
  pendantShape: z.string().optional(),
  pendantHeight: z.number().or(z.string()).optional(),
  pendantWidth: z.number().or(z.string()).optional(),
  pendantThickness: z.number().or(z.string()).optional(),
  pendantBailType: z.string().optional(),
  pendantBailDiameter: z.number().or(z.string()).optional(),
  pendantBorderStyle: z.string().optional(),
  pendantCenterMotif: z.string().optional(),
  metalAlloy: z.string().optional(),
  metalColorHex: z.string().optional(),
  gemstoneType: z.string().optional(),
  gemColorHex: z.string().optional(),
  isUnsupported: z.boolean().optional(),
  unsupportedReason: z.string().optional(),
});

// ---------------------------------------------------------------------------
// 3. NUMBER SANITIZATION & BOUNDING HELPER
// ---------------------------------------------------------------------------

function toNum(val: any, min: number, max: number, fallback: number): number {
  if (val === undefined || val === null) return fallback;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Number(n.toFixed(2))));
}

function toBool(val: any, fallback: boolean): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1) return true;
  if (val === "false" || val === 0) return false;
  return fallback;
}

// ---------------------------------------------------------------------------
// 4. CATEGORY-AWARE NORMALIZER WITH UNSUPPORTED CHECK
// ---------------------------------------------------------------------------

export interface NormalizationResult {
  blueprint: JewelryBlueprint;
  isSupported: boolean;
  unsupportedReason?: string;
  diagnostics: string[];
}

// Unsupported jewelry keywords that cannot currently be represented
const UNSUPPORTED_KEYWORDS = [
  "necklace",
  "choker",
  "chain",
  "bracelet",
  "bangle",
  "earring",
  "earrings",
  "cufflink",
  "cufflinks",
  "brooch",
  "pin",
  "tiara",
  "crown",
  "watch",
  "anklet",
];

export function checkUnsupportedRequest(userText: string): { isUnsupported: boolean; reason?: string } {
  const lower = userText.toLowerCase();
  for (const keyword of UNSUPPORTED_KEYWORDS) {
    // Check whole word match
    const regex = new RegExp(`\\b${keyword}s?\\b`, "i");
    if (regex.test(lower)) {
      // Exclude false alarms (e.g. "pendant necklace" -> supported as pendant)
      if (lower.includes("pendant") && (keyword === "necklace" || keyword === "chain")) {
        continue;
      }
      return {
        isUnsupported: true,
        reason: `The requested design family '${keyword}' is currently not supported for 3D parametric CAD modeling. JewelCAD AI currently generates production-grade parametric CAD for Rings (solitaire, halo, three-stone, signet, bezel, plain bands) and Pendants (heart, oval, pear, round, octagonal with bails and motifs).`,
      };
    }
  }
  return { isUnsupported: false };
}

export function normalizeAndValidateBlueprint(raw: any): NormalizationResult {
  const diagnostics: string[] = [];

  // Check explicit unsupported flag from AI
  if (raw?.isUnsupported === true || raw?.unsupported === true) {
    return {
      blueprint: { ...DEFAULT_BLUEPRINT },
      isSupported: false,
      unsupportedReason: raw?.unsupportedReason || "The requested jewelry geometry cannot be produced by the parametric CAD engine.",
      diagnostics: ["AI marked design as unsupported"],
    };
  }

  // Parse category
  const rawCat = typeof raw?.category === "string" ? raw.category.trim().toLowerCase() : "";
  let category: JewelryCategory = "solitaire-ring";

  const validCategories: JewelryCategory[] = [
    "solitaire-ring",
    "halo-ring",
    "three-stone-ring",
    "signet-ring",
    "bezel-ring",
    "plain-band",
    "pendant",
  ];

  if (validCategories.includes(rawCat as JewelryCategory)) {
    category = rawCat as JewelryCategory;
  } else if (rawCat.includes("pendant") || rawCat.includes("medallion") || rawCat.includes("charm")) {
    category = "pendant";
    diagnostics.push(`Normalized category '${rawCat}' to 'pendant'`);
  } else if (rawCat.includes("signet") || rawCat.includes("seal")) {
    category = "signet-ring";
    diagnostics.push(`Normalized category '${rawCat}' to 'signet-ring'`);
  } else if (rawCat.includes("band") || rawCat.includes("wedding") || rawCat.includes("plain")) {
    category = "plain-band";
    diagnostics.push(`Normalized category '${rawCat}' to 'plain-band'`);
  } else if (rawCat.includes("halo")) {
    category = "halo-ring";
    diagnostics.push(`Normalized category '${rawCat}' to 'halo-ring'`);
  } else if (rawCat.includes("three") || rawCat.includes("trilogy")) {
    category = "three-stone-ring";
    diagnostics.push(`Normalized category '${rawCat}' to 'three-stone-ring'`);
  } else if (rawCat.includes("bezel")) {
    category = "bezel-ring";
    diagnostics.push(`Normalized category '${rawCat}' to 'bezel-ring'`);
  } else {
    // If it's a completely unsupported family
    const unsupportedCheck = checkUnsupportedRequest(rawCat);
    if (unsupportedCheck.isUnsupported) {
      return {
        blueprint: { ...DEFAULT_BLUEPRINT },
        isSupported: false,
        unsupportedReason: unsupportedCheck.reason,
        diagnostics: [`Category '${rawCat}' is unsupported`],
      };
    }
    category = "solitaire-ring";
    diagnostics.push(`Unrecognized category '${rawCat}', defaulted to solitaire-ring`);
  }

  // Ring Sizing
  const ringSizeUS = toNum(raw?.ringSizeUS, 3.0, 14.0, 7.0);
  const innerDiameter = toNum(raw?.innerDiameter, 13.5, 23.5, usSizeToDiameterMM(ringSizeUS));

  // Band Profile
  const rawProfile = typeof raw?.bandProfile === "string" ? raw.bandProfile.trim().toLowerCase() : "";
  const validProfiles: BandProfile[] = [
    "court-comfort",
    "flat-cigar",
    "knife-edge",
    "cathedral",
    "split-shank",
    "twisted-rope",
  ];
  const bandProfile: BandProfile = validProfiles.includes(rawProfile as BandProfile)
    ? (rawProfile as BandProfile)
    : "court-comfort";

  const bandWidth = toNum(raw?.bandWidth, 1.5, 12.0, category === "signet-ring" ? 6.5 : category === "plain-band" ? 4.0 : 2.4);
  const bandThickness = toNum(raw?.bandThickness, 1.0, 4.5, category === "signet-ring" ? 2.2 : 1.8);
  const cathedralArchHeight = toNum(raw?.cathedralArchHeight, 0.0, 7.0, bandProfile === "cathedral" ? 3.8 : 0.0);
  const splitShankGap = toNum(raw?.splitShankGap, 0.5, 4.0, 1.6);

  // Gem cut & dimensions
  const rawCut = typeof raw?.gemCut === "string" ? raw.gemCut.trim().toLowerCase() : "";
  const validCuts: GemCut[] = ["round", "oval", "emerald", "princess", "pear", "marquise", "cushion"];
  const gemCut: GemCut = validCuts.includes(rawCut as GemCut) ? (rawCut as GemCut) : "round";

  const gemLength = toNum(raw?.gemLength, 2.5, 20.0, 6.5);
  const gemWidth = toNum(raw?.gemWidth, 2.5, 20.0, 6.5);
  const gemDepth = toNum(raw?.gemDepth, 1.5, 12.0, 4.0);

  // Metal & Gemstone
  const rawAlloy = typeof raw?.metalAlloy === "string" ? raw.metalAlloy.trim().toLowerCase() : "";
  const validAlloys: MetalAlloy[] = [
    "18k-yellow",
    "18k-white",
    "18k-rose",
    "22k-gold",
    "platinum",
    "925-silver",
  ];
  const metalAlloy: MetalAlloy = validAlloys.includes(rawAlloy as MetalAlloy)
    ? (rawAlloy as MetalAlloy)
    : "18k-white";

  const rawGemType = typeof raw?.gemstoneType === "string" ? raw.gemstoneType.trim().toLowerCase() : "";
  const validGemTypes: GemstoneType[] = [
    "diamond",
    "sapphire",
    "ruby",
    "emerald",
    "moissanite",
    "black-onyx",
  ];
  const gemstoneType: GemstoneType = validGemTypes.includes(rawGemType as GemstoneType)
    ? (rawGemType as GemstoneType)
    : "diamond";

  // Pendant specific fields
  const rawPendantShape = typeof raw?.pendantShape === "string" ? raw.pendantShape.trim().toLowerCase() : "";
  const validPendantShapes = ["heart", "oval", "pear", "round", "octagon"];
  const pendantShape = validPendantShapes.includes(rawPendantShape) ? (rawPendantShape as any) : "heart";

  const rawBailType = typeof raw?.pendantBailType === "string" ? raw.pendantBailType.trim().toLowerCase() : "";
  const validBailTypes = ["triangular", "tapered", "ring"];
  const pendantBailType = validBailTypes.includes(rawBailType) ? (rawBailType as any) : "triangular";

  const rawBorderStyle = typeof raw?.pendantBorderStyle === "string" ? raw.pendantBorderStyle.trim().toLowerCase() : "";
  const validBorderStyles = ["scalloped", "beaded", "smooth"];
  const pendantBorderStyle = validBorderStyles.includes(rawBorderStyle) ? (rawBorderStyle as any) : "smooth";

  const rawCenterMotif = typeof raw?.pendantCenterMotif === "string" ? raw.pendantCenterMotif.trim().toLowerCase() : "";
  const validMotifs = ["floral-clover", "gemstone", "filigree-star", "plain"];
  const pendantCenterMotif = validMotifs.includes(rawCenterMotif) ? (rawCenterMotif as any) : "plain";

  const pendantHeight = toNum(raw?.pendantHeight, 14.0, 60.0, 32.0);
  const pendantWidth = toNum(raw?.pendantWidth, 12.0, 50.0, 28.0);
  const pendantThickness = toNum(raw?.pendantThickness, 0.8, 4.0, 1.4);
  const pendantBailDiameter = toNum(raw?.pendantBailDiameter, 3.0, 10.0, 5.5);

  // Signet plateau
  const signetPlateauWidth = toNum(raw?.signetPlateauWidth, 6.0, 22.0, 12.0);
  const signetPlateauLength = toNum(raw?.signetPlateauLength, 6.0, 24.0, 13.0);

  // Settings & assemblies - configure according to category
  let prongCount = 4;
  let bezelEnabled = false;
  let haloEnabled = false;
  let threeStoneEnabled = false;
  let paveCountPerSide = 0;
  let headElevation = toNum(raw?.headElevation, 2.0, 10.0, 5.8);

  if (category === "plain-band") {
    // Enforce solid metal plain band: no stones, no head, no bezels
    prongCount = 0;
    bezelEnabled = false;
    haloEnabled = false;
    threeStoneEnabled = false;
    paveCountPerSide = 0;
    headElevation = 0;
  } else if (category === "pendant") {
    prongCount = 0;
    bezelEnabled = pendantCenterMotif === "gemstone";
    haloEnabled = false;
    threeStoneEnabled = false;
    paveCountPerSide = 0;
  } else if (category === "signet-ring") {
    prongCount = 0;
    bezelEnabled = toBool(raw?.bezelEnabled, true);
    haloEnabled = false;
    threeStoneEnabled = false;
    paveCountPerSide = 0;
    headElevation = 2.5;
  } else if (category === "bezel-ring") {
    prongCount = 0;
    bezelEnabled = true;
    haloEnabled = toBool(raw?.haloEnabled, false);
    threeStoneEnabled = false;
    paveCountPerSide = toNum(raw?.paveCountPerSide, 0, 16, 0);
  } else if (category === "three-stone-ring") {
    prongCount = [4, 6].includes(Number(raw?.prongCount)) ? Number(raw?.prongCount) : 4;
    bezelEnabled = false;
    haloEnabled = false;
    threeStoneEnabled = true;
    paveCountPerSide = toNum(raw?.paveCountPerSide, 0, 16, 0);
  } else if (category === "halo-ring") {
    prongCount = [4, 6, 8].includes(Number(raw?.prongCount)) ? Number(raw?.prongCount) : 4;
    bezelEnabled = false;
    haloEnabled = true;
    threeStoneEnabled = false;
    paveCountPerSide = toNum(raw?.paveCountPerSide, 0, 16, 6);
  } else {
    // Solitaire
    prongCount = [4, 6, 8].includes(Number(raw?.prongCount)) ? Number(raw?.prongCount) : 4;
    bezelEnabled = false;
    haloEnabled = false;
    threeStoneEnabled = false;
    paveCountPerSide = toNum(raw?.paveCountPerSide, 0, 16, 0);
  }

  const prongThickness = toNum(raw?.prongThickness, 0.65, 1.8, 0.95);
  const prongSpread = toNum(raw?.prongSpread, 0.7, 1.3, 0.96);
  const prongTipStyle = ["claw", "button", "tab"].includes(raw?.prongTipStyle)
    ? raw.prongTipStyle
    : "claw";
  const galleryRailEnabled = toBool(raw?.galleryRailEnabled, true);
  const bezelWallThickness = toNum(raw?.bezelWallThickness, 0.5, 2.0, 0.9);

  const flankGemSize = toNum(raw?.flankGemSize, 1.5, 8.0, 3.5);
  const flankTiltAngleDeg = toNum(raw?.flankTiltAngleDeg, 5, 45, 22);

  const haloStoneDiameter = toNum(raw?.haloStoneDiameter, 0.8, 2.8, 1.3);
  const haloGapFromCenter = toNum(raw?.haloGapFromCenter, 0.1, 1.5, 0.25);
  const paveStoneDiameter = toNum(raw?.paveStoneDiameter, 0.9, 2.6, 1.5);

  const metalColorHex = typeof raw?.metalColorHex === "string" && raw.metalColorHex.startsWith("#")
    ? raw.metalColorHex
    : DEFAULT_BLUEPRINT.metalColorHex;

  const gemColorHex = typeof raw?.gemColorHex === "string" && raw.gemColorHex.startsWith("#")
    ? raw.gemColorHex
    : DEFAULT_BLUEPRINT.gemColorHex;

  const designName = typeof raw?.designName === "string" && raw.designName.trim()
    ? raw.designName.trim()
    : `${category.replace("-", " ").toUpperCase()} Design`;

  const blueprint: JewelryBlueprint = {
    designName,
    category,
    ringSizeUS,
    innerDiameter,
    bandProfile,
    bandWidth,
    bandThickness,
    cathedralArchHeight,
    splitShankGap,
    headElevation,
    prongCount,
    prongThickness,
    prongSpread,
    prongTipStyle,
    galleryRailEnabled,
    bezelEnabled,
    bezelWallThickness,
    gemCut,
    gemLength,
    gemWidth,
    gemDepth,
    threeStoneEnabled,
    flankGemSize,
    flankTiltAngleDeg,
    haloEnabled,
    haloStoneDiameter,
    haloGapFromCenter,
    paveCountPerSide,
    paveStoneDiameter,
    signetPlateauWidth,
    signetPlateauLength,
    pendantShape,
    pendantHeight,
    pendantWidth,
    pendantThickness,
    pendantBailType,
    pendantBailDiameter,
    pendantBorderStyle,
    pendantCenterMotif,
    partTransforms: JSON.parse(JSON.stringify(DEFAULT_PART_TRANSFORMS)),
    metalAlloy,
    metalColorHex,
    gemstoneType,
    gemColorHex,
  };

  return {
    blueprint,
    isSupported: true,
    diagnostics,
  };
}

