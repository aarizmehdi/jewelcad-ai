# MASTER BUILD SPECIFICATION: JewelCAD AI — Local 3D Parametric Jewelry CAD Studio & Vision-to-STL Engine

## 1. ROLE & EXECUTION MANDATE
You are a Principal 3D CAD Graphics Engineer and Full-Stack Next.js Architect. Your task is to build and wire up the entire **JewelCAD AI** application in one pass.

- **Zero Placeholders:** Every file, API route, 3D geometry generator, interactive 3D gizmo, volume/weight calculator, and Binary `.STL` / `.OBJ` / `.JSON` exporter must be 100% implemented and functional.
- **No Broken Markdown or Missing Imports:** Ensure all TypeScript types, Three.js imports, and React hooks compile cleanly without errors.
- **Local-First & OpenRouter Powered:** Use OpenRouter (`qwen/qwen-2.5-vl-72b-instruct` default, or `qwen/qwen-2.5-vl-7b-instruct`) via `.env.local` OR via an in-app API Key Settings drawer stored in `localStorage`.

---

## 2. PROJECT INITIALIZATION & DEPENDENCIES
Run or configure the project with the following exact dependencies in `package.json`:

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.170.0",
    "@types/three": "^0.170.0",
    "@react-three/fiber": "^8.17.10",
    "@react-three/drei": "^9.117.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  }
}
```

Create `.env.local` (and `.env.example`):
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=qwen/qwen-2.5-vl-72b-instruct
```

---

## 3. REQUIRED FILE ARCHITECTURE
Create and populate these exact files:
1. `types/cad.ts` — Complete TypeScript data structures, US/ISO ring size tables, alloy densities, and default presets.
2. `lib/cadMath.ts` — Signed-tetrahedron 3D mesh volume calculator (cubic millimeters), alloy gram weight estimator, diamond carat calculator, and Binary `.STL` & `.OBJ` exporters with baked world matrices.
3. `app/api/img2cad/route.ts` — Multimodal Vision API route calling OpenRouter (`qwen/qwen-2.5-vl-72b-instruct`), with automatic JSON extraction, healing, and numeric clamping.
4. `components/ProceduralJewelryMesh.tsx` — Millimeter-accurate (`1 unit = 1mm`) procedural 3D CAD generator for rings, signets, bezels, halos, three-stone layouts, pavé shanks, and pendants, with raycast part selection and `<TransformControls>` 3D gizmos.
5. `components/Viewport3D.tsx` — Interactive Three.js CAD viewport with camera views (Perspective, Top, Front, Side), Cross-Section Clipping Plane, Wireframe toggle, Wax-Cast Metal-Only preview, and 3D Transform Gizmo bar (`Move G`, `Rotate R`, `Scale S`).
6. `app/page.tsx` — Master dark-mode CAD workstation combining the Left AI/Export Sidebar, Center 3D Viewport, Top Telemetry/DRC Bar, Right Parametric Inspector, and Undo/Redo (`Ctrl+Z` / `Ctrl+Y`) state manager.

---

## 4. COMPLETE DATA SCHEMA & PRESETS (`types/cad.ts`)
Implement `types/cad.ts` with all types, ring size conversion formulas, and 5 instant-load industry presets:

```typescript
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
  pendantBailDiameter: number;

  // 7. Interactive 3D Gizmo Offsets
  partTransforms: Record<SelectablePart, TransformOffset>;

  // 8. Studio Render Materials
  metalAlloy: "18k-yellow" | "18k-white" | "18k-rose" | "22k-gold" | "platinum" | "925-silver";
  metalColorHex: string;
  gemstoneType: "diamond" | "sapphire" | "ruby" | "emerald" | "moissanite" | "black-onyx";
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
  pendantBailDiameter: 4.8,
  partTransforms: JSON.parse(JSON.stringify(DEFAULT_PART_TRANSFORMS)),
  metalAlloy: "18k-white",
  metalColorHex: "#E5E4E2",
  gemstoneType: "diamond",
  gemColorHex: "#FFFFFF",
};

export const ALLOY_DENSITIES: Record<JewelryBlueprint["metalAlloy"], density: hex: label: number; string string; { }> = {
  "18k-yellow": { label: "18K Yellow Gold", density: 15.58, hex: "#FFD700" },
  "18k-white": { label: "18K White Gold", density: 15.90, hex: "#E5E4E2" },
  "18k-rose": { label: "18K Rose Gold", density: 15.10, hex: "#E09F87" },
  "22k-gold": { label: "22K Gold", density: 17.75, hex: "#F5BD02" },
  "platinum": { label: "Platinum 950", density: 21.45, hex: "#D9DCE0" },
  "925-silver": { label: "925 Sterling Silver", density: 10.36, hex: "#F0F2F5" },
};

export function usSizeToDiameterMM(usSize: number): number {
  return Number((11.63 + usSize * 0.8128).toFixed(2));
}

export function diameterMMToUSSize(diameter: number): number {
  return Number((((diameter - 11.63) / 0.8128) * 2).toFixed(0)) / 2;
}
```

---

## 5. VOLUME MATH, CARATS & `.STL` EXPORTER (`lib/cadMath.ts`)
Implement `lib/cadMath.ts` with signed-tetrahedron mesh volume calculation and Binary `.STL` & `.OBJ` exporters:

```typescript
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { JewelryBlueprint, ALLOY_DENSITIES } from "@/types/cad";

/**
 * Computes exact volume in cubic millimeters (mm^3) of a BufferGeometry
 * using the signed tetrahedron divergence theorem.
 */
export function computeGeometryVolumeMM3(geometry: THREE.BufferGeometry, matrixWorld: THREE.Matrix4): number {
  const geom = geometry.clone();
  geom.applyMatrix4(matrixWorld);
  const pos = geom.attributes.position;
  if (!pos) return 0;

  let volume = 0;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();

  if (geom.index) {
    const idx = geom.index;
    for (let i = 0; i < idx.count; i += 3) {
      p1.fromBufferAttribute(pos, idx.getX(i));
      p2.fromBufferAttribute(pos, idx.getX(i + 1));
      p3.fromBufferAttribute(pos, idx.getX(i + 2));
      volume += p1.dot(p2.cross(p3)) / 6.0;
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      p1.fromBufferAttribute(pos, i);
      p2.fromBufferAttribute(pos, i + 1);
      p3.fromBufferAttribute(pos, i + 2);
      volume += p1.dot(p2.cross(p3)) / 6.0;
    }
  }
  geom.dispose();
  return Math.abs(volume);
}

/**
 * Traverses the 3D scene group and sums the exact volume of all metal meshes.
 */
export function calculateSceneMetalMetrics(rootGroup: THREE.Group | null, spec: JewelryBlueprint) {
  let totalVolumeMM3 = 0;
  if (rootGroup) {
    rootGroup.updateMatrixWorld(true);
    rootGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.isMetal === true && obj.geometry) {
        totalVolumeMM3 += computeGeometryVolumeMM3(obj.geometry, obj.matrixWorld);
      }
    });
  }

  const volumeCM3 = totalVolumeMM3 / 1000.0;
  const alloyInfo = ALLOY_DENSITIES[spec.metalAlloy] || ALLOY_DENSITIES["18k-white"];
  const weightGrams = volumeCM3 * alloyInfo.density;

  // Estimate Carat Weight (Center + Flanks + Halo + Pave)
  const centerCarat = spec.gemLength * spec.gemWidth * spec.gemDepth * 0.0061;
  const flankCarat = spec.threeStoneEnabled ? 2 * (Math.pow(spec.flankGemSize, 3) * 0.6 * 0.0061) : 0;
  const haloPerimeter = Math.PI * ( (spec.gemLength + spec.gemWidth) / 2 + spec.haloGapFromCenter * 2 + spec.haloStoneDiameter );
  const haloCount = spec.haloEnabled ? Math.max(10, Math.floor(haloPerimeter / (spec.haloStoneDiameter * 1.08))) : 0;
  const haloCarat = haloCount * (Math.pow(spec.haloStoneDiameter, 3) * 0.62 * 0.0061);
  const paveCarat = (spec.paveCountPerSide * 2) * (Math.pow(spec.paveStoneDiameter, 3) * 0.62 * 0.0061);

  return {
    volumeMM3: Number(totalVolumeMM3.toFixed(1)),
    weightGrams: Number(weightGrams.toFixed(2)),
    totalCarats: Number((centerCarat + flankCarat + haloCarat + paveCarat).toFixed(2)),
    drcPass: spec.bandThickness >= 1.2 && (spec.bezelEnabled || spec.prongThickness >= 0.8),
  };
}

/**
 * Exports either Cast-Ready Metal-Only .STL or Full Assembly .STL
 * with world transforms baked into millimeter vertex coordinates.
 */
export function exportJewelrySTL(rootGroup: THREE.Group | null, designName: string, metalOnly: boolean) {
  if (!rootGroup) return;
  rootGroup.updateMatrixWorld(true);

  const exportGroup = new THREE.Group();
  rootGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      if (metalOnly && child.userData?.isGem === true) return;
      const bakedGeom = child.geometry.clone();
      bakedGeom.applyMatrix4(child.matrixWorld);
      bakedGeom.computeVertexNormals();
      exportGroup.add(new THREE.Mesh(bakedGeom));
    }
  });

  const exporter = new STLExporter();
  const stlBuffer = exporter.parse(exportGroup, { binary: true });
  const blob = new Blob([stlBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (designName || "jewelry-cad").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.href = url;
  a.download = `${slug}-${metalOnly ? "cast-metal-only" : "full-assembly"}.stl`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJewelryOBJ(rootGroup: THREE.Group | null, designName: string) {
  if (!rootGroup) return;
  rootGroup.updateMatrixWorld(true);
  const exporter = new OBJExporter();
  const objText = exporter.parse(rootGroup);
  const blob = new Blob([objText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (designName || "jewelry-cad").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.href = url;
  a.download = `${slug}.obj`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 6. AI VISION-TO-CAD API ROUTE (`app/api/img2cad/route.ts`)
Create `app/api/img2cad/route.ts` to process `.png` / `.jpg` / `.webp` uploads with **Qwen Vision** on OpenRouter:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BLUEPRINT, usSizeToDiameterMM } from "@/types/cad";

const SYSTEM_VISION_PROMPT = `You are an elite Master CAD Jeweler, Gemologist, and 3D Parametric Geometry Architect.
Analyze the uploaded jewelry image and any optional user instruction, then reverse-engineer the piece into a precise parametric 3D CAD JSON blueprint in millimeters (mm) for .STL lost-wax casting.

RULES:
1. Choose category: "solitaire-ring", "halo-ring", "three-stone-ring", "signet-ring", "bezel-ring", or "pendant".
2. Choose bandProfile: "court-comfort", "flat-cigar", "knife-edge", "cathedral", "split-shank", or "twisted-rope".
3. Choose gemCut: "round", "oval", "emerald", "princess", "pear", "marquise", or "cushion".
4. Estimate realistic millimeter values (bandWidth: 1.6 to 8.0, bandThickness: 1.3 to 3.2, gemLength: 4.0 to 13.0, gemWidth: 4.0 to 12.0, gemDepth: 2.5 to 8.0, prongCount: 0, 4, 6, or 8, prongThickness: 0.85 to 1.4).
5. Set boolean flags accurately: galleryRailEnabled, bezelEnabled, threeStoneEnabled, haloEnabled.
6. Estimate paveCountPerSide (0 to 14) and paveStoneDiameter (1.1 to 2.2).
7. Detect metalAlloy ("18k-yellow", "18k-white", "18k-rose", "22k-gold", "platinum", "925-silver"), metalColorHex, gemstoneType, and gemColorHex.

Return ONLY a valid raw JSON object with NO markdown formatting and NO backticks.`;

function clamp(val: any, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, customInstruction, runtimeApiKey, runtimeModel } = body;

    const apiKey = runtimeApiKey || process.env.OPENROUTER_API_KEY;
    const model = runtimeModel || process.env.OPENROUTER_MODEL || "qwen/qwen-2.5-vl-72b-instruct";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenRouter API Key. Add OPENROUTER_API_KEY in .env.local or paste it in the Left Sidebar API Settings." },
        { status: 400 }
      );
    }

    const userText = customInstruction
      ? `${SYSTEM_VISION_PROMPT}\n\nUSER OVERRIDE INSTRUCTION:${customInstruction}`
      : SYSTEM_VISION_PROMPT;

    const userContent: any[] = [{ type: "text", text: userText }];
    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType \vert{}\vert{} "image/png"};base64,${imageBase64}` },
      });
    }

    const response = await fetch("[https://openrouter.ai/api/v1/chat/completions](https://openrouter.ai/api/v1/chat/completions)", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "JewelCAD-AI-Studio",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || "OpenRouter request failed");
    }

    const rawText: string = data?.choices?.[0]?.message?.content || "";
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("AI response did not contain a valid JSON object.");
    }

    const parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    const ringSizeUS = clamp(parsed.ringSizeUS, 3, 13.5, DEFAULT_BLUEPRINT.ringSizeUS);

    const healed = {
      ...DEFAULT_BLUEPRINT,
      ...parsed,
      ringSizeUS,
      innerDiameter: clamp(parsed.innerDiameter, 14.0, 22.6, usSizeToDiameterMM(ringSizeUS)),
      bandWidth: clamp(parsed.bandWidth, 1.5, 10.0, DEFAULT_BLUEPRINT.bandWidth),
      bandThickness: clamp(parsed.bandThickness, 1.0, 4.0, DEFAULT_BLUEPRINT.bandThickness),
      cathedralArchHeight: clamp(parsed.cathedralArchHeight, 0.0, 6.5, DEFAULT_BLUEPRINT.cathedralArchHeight),
      headElevation: clamp(parsed.headElevation, 2.0, 10.0, DEFAULT_BLUEPRINT.headElevation),
      prongCount: [0, 4, 6, 8].includes(Number(parsed.prongCount)) ? Number(parsed.prongCount) : 4,
      prongThickness: clamp(parsed.prongThickness, 0.6, 1.6, DEFAULT_BLUEPRINT.prongThickness),
      gemLength: clamp(parsed.gemLength, 3.0, 15.0, DEFAULT_BLUEPRINT.gemLength),
      gemWidth: clamp(parsed.gemWidth, 3.0, 15.0, DEFAULT_BLUEPRINT.gemWidth),
      gemDepth: clamp(parsed.gemDepth, 2.0, 10.0, DEFAULT_BLUEPRINT.gemDepth),
      haloStoneDiameter: clamp(parsed.haloStoneDiameter, 0.8, 2.4, DEFAULT_BLUEPRINT.haloStoneDiameter),
      paveCountPerSide: clamp(parsed.paveCountPerSide, 0, 16, DEFAULT_BLUEPRINT.paveCountPerSide),
      paveStoneDiameter: clamp(parsed.paveStoneDiameter, 1.0, 2.5, DEFAULT_BLUEPRINT.paveStoneDiameter),
      partTransforms: DEFAULT_BLUEPRINT.partTransforms,
    };

    return NextResponse.json(healed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Vision-to-CAD conversion error" }, { status: 500 });
  }
}
```

---

## 7. PROCEDURAL 3D CAD GEOMETRY GENERATOR (`components/ProceduralJewelryMesh.tsx`)
Implement `components/ProceduralJewelryMesh.tsx` with:
- Dedicated `<FacetedGemstone>` using a multi-tier Crown + Girdle + Pavilion `LatheGeometry` scaled to `gemLength`, `gemWidth`, and `gemDepth`, plus cut-specific radial faceting (`round`, `oval`, `emerald`, `princess`, `pear`, `marquise`, `cushion`).
- All 6 shank profiles (`court-comfort`, `flat-cigar`, `knife-edge`, `cathedral`, `split-shank`, `twisted-rope`) and all 6 jewelry categories (`solitaire-ring`, `halo-ring`, `three-stone-ring`, `signet-ring`, `bezel-ring`, `pendant`).
- Direct 3D clicking on any sub-part (`shank`, `head-assembly`, `center-stone`, `halo`, `side-stones`) to attach `<TransformControls>` so the user can move (`G`), rotate (`R`), or scale (`S`) any part directly inside the 3D scene.
- Every metal mesh tagged with `userData={{ isMetal: true }}` and every gemstone mesh tagged with `userData={{ isGem: true }}` so the volume calculator and Cast-Ready `.STL` slicer separate metal from stones accurately.

---

## 8. INTERACTIVE 3D VIEWPORT & WORKSTATION UI (`components/Viewport3D.tsx` & `app/page.tsx`)
Implement `components/Viewport3D.tsx` and `app/page.tsx` with:
1. **Left Sidebar (AI & Export Control Center):**
   - Client-side `<canvas>` image resizer (scales uploaded `.png`/`.jpg` to max `1024px` before Base64 encoding so large uploads never fail).
   - Text prompt input for custom AI overrides (works both with an uploaded image OR standalone text-to-CAD).
   - Collapsible **OpenRouter API Key & Model Selector** (`qwen/qwen-2.5-vl-72b-instruct` vs `qwen/qwen-2.5-vl-7b-instruct`).
   - 5 instant 1-Click Industry Presets (Cathedral Halo Solitaire, Tiffany 6-Prong Solitaire, Emerald Trilogy Three-Stone, Executive Octagon Signet, Royal Oval Sapphire Pendant).
   - **Export Cast-Ready Metal .STL (No Stones)**, **Export Full Assembly .STL**, **Export .OBJ**, and **Save/Load .JSON Blueprint**.
2. **Center 3D CAD Viewport:**
   - Top live telemetry header displaying exact internal diameter (`mm`), US Ring Size, exact signed-tetrahedron Metal Volume (`mm³`), Alloy Weight (`grams`), Total Diamond Weight (`ct`), and automated **DRC Cast-Ready** status badge.
   - Bottom floating CAD dock for Camera Presets (`Perspective`, `Top`, `Front`, `Side`), Gizmo Controls (`Orbit`, `Move G`, `Rotate R`, `Scale S`), `Wireframe`, `Wax Cast Mode (Hide Stones)`, `Cross-Section Clipping Plane Slider`, and `360° Turntable`.
3. **Right Sidebar (Parametric Millimeter Inspector):**
   - Accordion tabs for **1. Ring Size & Shank**, **2. Head, Prongs & Bezel**, **3. Center & Three-Stone Gems**, **4. Halo & Shank Pavé**, and **5. Precious Metal & Gemstone Shaders**.