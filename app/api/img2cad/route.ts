import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BLUEPRINT, JewelryBlueprint } from "@/types/cad";
import {
  normalizeAndValidateBlueprint,
  checkUnsupportedRequest,
} from "@/lib/schema-validation";

const SYSTEM_VISION_PROMPT = `You are an elite Master CAD Jeweler, Gemologist, and 3D Parametric Geometry Architect.
Analyze the provided jewelry image and/or user text instructions, then reverse-engineer it into a precise, lost-wax castable 3D CAD parametric JSON blueprint (units in millimeters: 1 unit = 1.0mm).

JEWELRY CATEGORY TAXONOMY:
You MUST classify the design into exactly one of these supported categories:
1. "plain-band": Solid continuous metal band with NO gemstones, NO prongs, NO heads (e.g. classic wedding band, cigar band, knife-edge band).
2. "solitaire-ring": Single center stone ring held by prongs or basket.
3. "halo-ring": Center stone encircled by micro-pavé halo diamonds.
4. "three-stone-ring": Center gemstone flanked by two angled side stones (trilogy).
5. "signet-ring": Flat top plateau table (rectangular, oval, octagonal) with tapering shank, optional flat stone inlay.
6. "bezel-ring": Center stone secured by continuous metal rim/collar.
7. "pendant": Suspended necklace pendant with bail loop, plate silhouette body (heart, oval, pear, round, octagon), outer border styling, and decorative center motif.

UNSUPPORTED JEWELRY HANDLING:
JewelCAD AI currently supports parametric CAD modeling for Rings and Pendants.
If the provided image or user prompt is clearly an unsupported jewelry family (such as earrings, stud earrings, hoop earrings, bracelets, bangles, tennis bracelets, chain necklaces without pendants, tiaras, crowns, cufflinks, brooches, or watches):
Return:
{
  "isUnsupported": true,
  "unsupportedReason": "The design is an unsupported category. JewelCAD AI parametric modeling currently supports Rings and Shaped Pendants."
}
DO NOT silently replace an earring or bracelet with a ring!

WEIGHT TARGETING & VOLUMETRIC SCALING:
If user specifies target casting weight (e.g. "5g in 18k", "heavy 8g signet"):
- Volume (mm³) = (Target Weight in grams / Alloy Density in g/cm³) * 1000.
  - 18k Gold: ~15.8 g/cm³ (5g = ~316 mm³)
  - 22k Gold: ~17.75 g/cm³ (5g = ~281 mm³)
  - Platinum 950: ~21.45 g/cm³ (5g = ~233 mm³)
  - 925 Silver: ~10.36 g/cm³ (5g = ~482 mm³)
- Ring band volume ≈ π * (innerDiameter + bandThickness) * bandWidth * bandThickness * 0.85. Size bandWidth & bandThickness to reach target.

VISUAL FEATURE & COLOR RECOGNITION:
- Metal tone:
  - Yellow Gold: metalAlloy = "18k-yellow" or "22k-gold", metalColorHex ≈ "#E5B824"
  - White Gold / Platinum: metalAlloy = "18k-white" or "platinum", metalColorHex ≈ "#E5E4E2"
  - Rose / Pink Gold: metalAlloy = "18k-rose", metalColorHex ≈ "#E09F87"
  - Silver: metalAlloy = "925-silver", metalColorHex ≈ "#F0F2F5"
- Gemstones & cuts:
  - Deep blue: gemstoneType = "sapphire", gemColorHex ≈ "#1D4ED8"
  - Vivid red: gemstoneType = "ruby", gemColorHex ≈ "#BE123C"
  - Emerald green: gemstoneType = "emerald", gemColorHex ≈ "#059669"
  - Clear / brilliant sparkle: gemstoneType = "diamond" or "moissanite", gemColorHex ≈ "#FFFFFF"
  - Jet black: gemstoneType = "black-onyx", gemColorHex ≈ "#0F172A"
- GemCut options: "round", "oval", "emerald", "princess", "pear", "marquise", "cushion".

PENDANT PARAMETERS (Required when category is "pendant"):
- "pendantShape": "heart" | "oval" | "pear" | "round" | "octagon"
- "pendantHeight": height in mm (e.g. 24.0 - 45.0)
- "pendantWidth": width in mm (e.g. 20.0 - 40.0)
- "pendantThickness": plate thickness in mm (e.g. 1.2 - 2.0)
- "pendantBailType": "triangular" | "tapered" | "ring"
- "pendantBailDiameter": outer diameter of bail loop in mm (e.g. 4.5 - 6.5)
- "pendantBorderStyle": "scalloped" | "beaded" | "smooth"
- "pendantCenterMotif": "floral-clover" | "gemstone" | "filigree-star" | "plain"

OUTPUT FORMAT:
Return ONLY a valid, raw JSON object matching the schema below. Do not wrap in markdown or markdown backticks, do not include explanations.

{
  "designName": "string",
  "category": "solitaire-ring" | "halo-ring" | "three-stone-ring" | "signet-ring" | "bezel-ring" | "plain-band" | "pendant",
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
  "pendantShape": "heart" | "oval" | "pear" | "round" | "octagon",
  "pendantHeight": 32.0,
  "pendantWidth": 28.0,
  "pendantThickness": 1.4,
  "pendantBailType": "triangular" | "tapered" | "ring",
  "pendantBailDiameter": 5.5,
  "pendantBorderStyle": "scalloped" | "beaded" | "smooth",
  "pendantCenterMotif": "floral-clover" | "gemstone" | "filigree-star" | "plain",
  "metalAlloy": "18k-yellow" | "18k-white" | "18k-rose" | "22k-gold" | "platinum" | "925-silver",
  "metalColorHex": "#E5B824",
  "gemstoneType": "diamond" | "sapphire" | "ruby" | "emerald" | "moissanite" | "black-onyx",
  "gemColorHex": "#FFFFFF"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, customInstruction, runtimeApiKey, runtimeModel } = body;

    // Fast-fail check on text prompt if unsupported jewelry family requested
    if (customInstruction && !imageBase64) {
      const unsupportedCheck = checkUnsupportedRequest(customInstruction);
      if (unsupportedCheck.isUnsupported) {
        return NextResponse.json(
          { error: unsupportedCheck.reason, isUnsupported: true },
          { status: 422 }
        );
      }
    }

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

    // Normalize and validate through our domain schema pipeline
    const validationResult = normalizeAndValidateBlueprint(parsed);

    if (!validationResult.isSupported) {
      return NextResponse.json(
        {
          error: validationResult.unsupportedReason || "The requested jewelry design is not supported.",
          isUnsupported: true,
          diagnostics: validationResult.diagnostics,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(validationResult.blueprint);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Vision-to-CAD processing error" },
      { status: 500 }
    );
  }
}
