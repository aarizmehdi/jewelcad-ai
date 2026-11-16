import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BLUEPRINT, usSizeToDiameterMM, JewelryBlueprint } from "@/types/cad";

const SYSTEM_VISION_PROMPT = `You are an elite Master CAD Jeweler, Gemologist, and 3D Parametric Geometry Architect.
Analyze the provided jewelry image and/or user text instructions, then reverse-engineer it into a precise, lost-wax castable 3D CAD parametric JSON blueprint (units in millimeters: 1 unit = 1.0mm).

WEIGHT TARGETING & VOLUMETRIC SCALING:
If the user specifies a target metal casting weight (e.g. "make it 5 grams in 18k", "target casting weight 4g", "heavy 7g signet"):
1. Calculate target volume: Volume (mm³) = (Target Weight in grams / Alloy Density in g/cm³) * 1000.
   - 18k Gold density: ~15.8 g/cm³ (5g = ~316 mm³)
   - 22k Gold density: ~17.75 g/cm³ (5g = ~281 mm³)
   - Platinum 950 density: ~21.45 g/cm³ (5g = ~233 mm³)
   - 925 Silver density: ~10.36 g/cm³ (5g = ~482 mm³)
2. Size the band accordingly:
   - Finger ring circumference ≈ π * (innerDiameter + bandThickness) ≈ 58mm.
   - Adjust "bandWidth" and "bandThickness" so that (bandWidth * bandThickness * 0.85 * 58) + headVolume approximates the target volume.
   - For example, for a 5g 18k ring: set bandWidth ≈ 2.8 - 3.2mm and bandThickness ≈ 1.8 - 2.0mm.

VISUAL FEATURE & COLOR RECOGNITION:
- Visually identify metal tone from the image:
  - Yellow Gold: metalAlloy = "18k-yellow" or "22k-gold", metalColorHex ≈ "#E5B824"
  - White Gold / Platinum: metalAlloy = "18k-white" or "platinum", metalColorHex ≈ "#E5E4E2"
  - Rose / Pink Gold: metalAlloy = "18k-rose", metalColorHex ≈ "#E09F87"
  - Silver: metalAlloy = "925-silver", metalColorHex ≈ "#F0F2F5"
- Visually identify gemstones and cuts:
  - Deep blue: gemstoneType = "sapphire", gemColorHex ≈ "#1D4ED8"
  - Vivid red: gemstoneType = "ruby", gemColorHex ≈ "#BE123C"
  - Emerald green: gemstoneType = "emerald", gemColorHex ≈ "#059669"
  - Clear / brilliant sparkle: gemstoneType = "diamond" or "moissanite", gemColorHex ≈ "#FFFFFF"
  - Jet black: gemstoneType = "black-onyx", gemColorHex ≈ "#0F172A"
- Visually match the gemCut ("round", "oval", "emerald", "princess", "pear", "marquise", "cushion").

OUTPUT FORMAT:
Return ONLY a valid, raw JSON object matching the schema below. Do not wrap in markdown or markdown backticks, do not include explanations.

{
  "designName": "string",
  "category": "solitaire-ring" | "halo-ring" | "three-stone-ring" | "signet-ring" | "bezel-ring" | "pendant",
  "ringSizeUS": 7.0,
  "innerDiameter": 17.3,
  "bandProfile": "court-comfort" | "flat-cigar" | "knife-edge" | "cathedral" | "split-shank" | "twisted-rope",
  "bandWidth": 2.4,
  "bandThickness": 1.8,
  "cathedralArchHeight": 3.8,
  "splitShankGap": 1.6,
  "headElevation": 5.8,
  "prongCount": 0 | 4 | 6 | 8,
  "prongThickness": 0.95,
  "prongSpread": 0.96,
  "prongTipStyle": "claw" | "button" | "tab",
  "galleryRailEnabled": true,
  "bezelEnabled": false,
  "bezelWallThickness": 0.9,
  "gemCut": "round" | "oval" | "emerald" | "princess" | "pear" | "marquise" | "cushion",
  "gemLength": 6.5,
  "gemWidth": 6.5,
  "gemDepth": 4.0,
  "threeStoneEnabled": false,
  "flankGemSize": 3.5,
  "flankTiltAngleDeg": 22,
  "haloEnabled": true,
  "haloStoneDiameter": 1.3,
  "haloGapFromCenter": 0.25,
  "paveCountPerSide": 8,
  "paveStoneDiameter": 1.5,
  "signetPlateauWidth": 11.0,
  "signetPlateauLength": 12.0,
  "pendantBailDiameter": 4.8,
  "metalAlloy": "18k-yellow" | "18k-white" | "18k-rose" | "22k-gold" | "platinum" | "925-silver",
  "metalColorHex": "#E5E4E2",
  "gemstoneType": "diamond" | "sapphire" | "ruby" | "emerald" | "moissanite" | "black-onyx",
  "gemColorHex": "#FFFFFF"
}`;

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
    const model = runtimeModel || process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing OpenRouter API Key. Please enter your API Key in the Left Sidebar API Settings drawer, or set OPENROUTER_API_KEY in .env.local.",
        },
        { status: 400 }
      );
    }

    const userText = customInstruction
      ? `${SYSTEM_VISION_PROMPT}\n\nUSER OVERRIDE INSTRUCTION / DESIGN REQUEST:\n${customInstruction}`
      : SYSTEM_VISION_PROMPT;

    const userContent: any[] = [{ type: "text", text: userText }];

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType || "image/png"};base64,${imageBase64}`,
        },
      });
    }

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

    const data = await openRouterResponse.json();
    if (!openRouterResponse.ok) {
      throw new Error(data?.error?.message || `OpenRouter error (${openRouterResponse.status})`);
    }

    const rawText: string = data?.choices?.[0]?.message?.content || "";
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("AI response did not contain a valid JSON object: " + rawText.slice(0, 100));
    }

    const parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    const ringSizeUS = clamp(parsed.ringSizeUS, 3, 14, DEFAULT_BLUEPRINT.ringSizeUS);

    const healed: JewelryBlueprint = {
      ...DEFAULT_BLUEPRINT,
      ...parsed,
      designName: parsed.designName || "Custom AI Jewelry Piece",
      category: [
        "solitaire-ring",
        "halo-ring",
        "three-stone-ring",
        "signet-ring",
        "bezel-ring",
        "pendant",
      ].includes(parsed.category)
        ? parsed.category
        : DEFAULT_BLUEPRINT.category,
      bandProfile: [
        "court-comfort",
        "flat-cigar",
        "knife-edge",
        "cathedral",
        "split-shank",
        "twisted-rope",
      ].includes(parsed.bandProfile)
        ? parsed.bandProfile
        : DEFAULT_BLUEPRINT.bandProfile,
      ringSizeUS,
      innerDiameter: clamp(parsed.innerDiameter, 13.5, 23.5, usSizeToDiameterMM(ringSizeUS)),
      bandWidth: clamp(parsed.bandWidth, 1.5, 12.0, DEFAULT_BLUEPRINT.bandWidth),
      bandThickness: clamp(parsed.bandThickness, 1.0, 4.5, DEFAULT_BLUEPRINT.bandThickness),
      cathedralArchHeight: clamp(parsed.cathedralArchHeight, 0.0, 7.0, DEFAULT_BLUEPRINT.cathedralArchHeight),
      splitShankGap: clamp(parsed.splitShankGap, 0.5, 4.0, DEFAULT_BLUEPRINT.splitShankGap),
      headElevation: clamp(parsed.headElevation, 2.0, 12.0, DEFAULT_BLUEPRINT.headElevation),
      prongCount: [0, 4, 6, 8].includes(Number(parsed.prongCount)) ? Number(parsed.prongCount) : 4,
      prongThickness: clamp(parsed.prongThickness, 0.6, 1.8, DEFAULT_BLUEPRINT.prongThickness),
      prongSpread: clamp(parsed.prongSpread, 0.7, 1.3, DEFAULT_BLUEPRINT.prongSpread),
      prongTipStyle: ["claw", "button", "tab"].includes(parsed.prongTipStyle) ? parsed.prongTipStyle : "claw",
      galleryRailEnabled: Boolean(parsed.galleryRailEnabled ?? true),
      bezelEnabled: Boolean(parsed.bezelEnabled ?? false),
      bezelWallThickness: clamp(parsed.bezelWallThickness, 0.5, 2.0, DEFAULT_BLUEPRINT.bezelWallThickness),
      gemCut: [
        "round",
        "oval",
        "emerald",
        "princess",
        "pear",
        "marquise",
        "cushion",
      ].includes(parsed.gemCut)
        ? parsed.gemCut
        : "round",
      gemLength: clamp(parsed.gemLength, 3.0, 18.0, DEFAULT_BLUEPRINT.gemLength),
      gemWidth: clamp(parsed.gemWidth, 3.0, 18.0, DEFAULT_BLUEPRINT.gemWidth),
      gemDepth: clamp(parsed.gemDepth, 1.5, 12.0, DEFAULT_BLUEPRINT.gemDepth),
      threeStoneEnabled: Boolean(parsed.threeStoneEnabled ?? false),
      flankGemSize: clamp(parsed.flankGemSize, 1.5, 8.0, DEFAULT_BLUEPRINT.flankGemSize),
      flankTiltAngleDeg: clamp(parsed.flankTiltAngleDeg, 5, 45, DEFAULT_BLUEPRINT.flankTiltAngleDeg),
      haloEnabled: Boolean(parsed.haloEnabled ?? false),
      haloStoneDiameter: clamp(parsed.haloStoneDiameter, 0.8, 2.8, DEFAULT_BLUEPRINT.haloStoneDiameter),
      haloGapFromCenter: clamp(parsed.haloGapFromCenter, 0.1, 1.5, DEFAULT_BLUEPRINT.haloGapFromCenter),
      paveCountPerSide: clamp(parsed.paveCountPerSide, 0, 16, DEFAULT_BLUEPRINT.paveCountPerSide),
      paveStoneDiameter: clamp(parsed.paveStoneDiameter, 0.9, 2.6, DEFAULT_BLUEPRINT.paveStoneDiameter),
      signetPlateauWidth: clamp(parsed.signetPlateauWidth, 6.0, 22.0, DEFAULT_BLUEPRINT.signetPlateauWidth),
      signetPlateauLength: clamp(parsed.signetPlateauLength, 6.0, 24.0, DEFAULT_BLUEPRINT.signetPlateauLength),
      pendantBailDiameter: clamp(parsed.pendantBailDiameter, 3.0, 10.0, DEFAULT_BLUEPRINT.pendantBailDiameter),
      metalAlloy: [
        "18k-yellow",
        "18k-white",
        "18k-rose",
        "22k-gold",
        "platinum",
        "925-silver",
      ].includes(parsed.metalAlloy)
        ? parsed.metalAlloy
        : DEFAULT_BLUEPRINT.metalAlloy,
      metalColorHex: parsed.metalColorHex || DEFAULT_BLUEPRINT.metalColorHex,
      gemstoneType: [
        "diamond",
        "sapphire",
        "ruby",
        "emerald",
        "moissanite",
        "black-onyx",
      ].includes(parsed.gemstoneType)
        ? parsed.gemstoneType
        : DEFAULT_BLUEPRINT.gemstoneType,
      gemColorHex: parsed.gemColorHex || DEFAULT_BLUEPRINT.gemColorHex,
      partTransforms: DEFAULT_BLUEPRINT.partTransforms,
    };

    return NextResponse.json(healed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Vision-to-CAD processing error" },
      { status: 500 }
    );
  }
}
