/**
 * JewelCAD AI — Automated Engineering Geometry & Schema Verification Suite
 * Tests A through I as mandated by the Master Engineering Directive
 */

import * as THREE from "three";
import {
  DEFAULT_BLUEPRINT,
  JewelryBlueprint,
  ALLOY_DENSITIES,
  GEMSTONE_SPECS,
} from "../types/cad";
import {
  buildProceduralJewelryGroup,
  createFacetedGemstoneGeometry,
} from "../components/ProceduralJewelryMesh";
import {
  calculateSceneMetalMetrics,
  computeGeometryVolumeMM3,
} from "../lib/cadMath";
import {
  normalizeAndValidateBlueprint,
  checkUnsupportedRequest,
} from "../lib/schema-validation";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
    failedCount++;
  }
}

console.log("===============================================================================");
console.log("JEWELCAD AI — AUTOMATED GEOMETRY & ENGINE VERIFICATION SUITE");
console.log("===============================================================================\n");

// ---------------------------------------------------------------------------
// TEST A: PLAIN GOLD BAND
// ---------------------------------------------------------------------------
console.log("--- TEST A: Plain Gold Band (No Gemstones, Solid Metal Shank) ---");
{
  const plainBandSpec: JewelryBlueprint = {
    ...DEFAULT_BLUEPRINT,
    designName: "Classic Court 18K Yellow Gold Wedding Band",
    category: "plain-band",
    bandProfile: "court-comfort",
    bandWidth: 4.0,
    bandThickness: 1.8,
    headElevation: 0,
    prongCount: 0,
    bezelEnabled: false,
    haloEnabled: false,
    threeStoneEnabled: false,
    paveCountPerSide: 0,
    metalAlloy: "18k-yellow",
    metalColorHex: "#E5B824",
  };

  const { rootGroup, partGroups } = buildProceduralJewelryGroup(plainBandSpec, {});
  const metrics = calculateSceneMetalMetrics(rootGroup, plainBandSpec);

  assert(partGroups["shank"].children.length > 0, "Shank geometry is present");
  assert(partGroups["center-stone"].children.length === 0, "Center stone is NOT rendered for plain band");
  assert(partGroups["head-assembly"].children.length === 0, "Head basket/prongs NOT rendered for plain band");
  assert(partGroups["halo"].children.length === 0, "Halo assembly is NOT rendered for plain band");
  assert(partGroups["side-stones"].children.length === 0, "Side stones are NOT rendered for plain band");
  assert(metrics.totalCarats === 0, "Carat weight is exactly 0.00 ct", `Got ${metrics.totalCarats}`);
  assert(metrics.weightGrams > 4.0 && metrics.weightGrams < 9.0, `Metal weight is physically realistic for 18K gold band (~5-7g)`, `Got ${metrics.weightGrams}g`);
  assert(metrics.drcPass === true, "DRC passed for 1.8mm band thickness");
}

// ---------------------------------------------------------------------------
// TEST B: OVAL SAPPHIRE HALO RING
// ---------------------------------------------------------------------------
console.log("\n--- TEST B: Oval Sapphire Halo Ring (Distinct from Plain Band) ---");
{
  const haloSpec: JewelryBlueprint = {
    ...DEFAULT_BLUEPRINT,
    designName: "Royal Oval Sapphire Halo Ring",
    category: "halo-ring",
    bandProfile: "cathedral",
    bandWidth: 2.2,
    bandThickness: 1.8,
    headElevation: 5.5,
    prongCount: 4,
    gemCut: "oval",
    gemLength: 8.0,
    gemWidth: 6.0,
    gemDepth: 4.2,
    haloEnabled: true,
    haloStoneDiameter: 1.4,
    haloGapFromCenter: 0.3,
    paveCountPerSide: 6,
    paveStoneDiameter: 1.5,
    metalAlloy: "18k-white",
    gemstoneType: "sapphire",
    gemColorHex: "#1D4ED8",
  };

  const { rootGroup, partGroups } = buildProceduralJewelryGroup(haloSpec, {});
  const metrics = calculateSceneMetalMetrics(rootGroup, haloSpec);

  assert(partGroups["center-stone"].children.length === 1, "Center stone is rendered");
  assert(partGroups["head-assembly"].children.length > 0, "Head basket and prongs are rendered");
  assert(partGroups["halo"].children.length > 10, "Halo rim and melee diamonds are rendered", `Count: ${partGroups["halo"].children.length}`);
  assert(metrics.centerCarat > 1.0, `Center sapphire carat weight calculated (> 1.0 ct)`, `Got ${metrics.centerCarat} ct`);
  assert(metrics.haloCarat > 0.15, `Halo diamonds carat weight calculated (> 0.15 ct)`, `Got ${metrics.haloCarat} ct`);
  assert(metrics.totalCarats > metrics.centerCarat, "Total carats includes halo and pavé");

  // Verify material properties
  const centerMesh = partGroups["center-stone"].children[0] as THREE.Mesh;
  const mat = centerMesh.material as THREE.MeshPhysicalMaterial;
  assert(mat.transmission > 0.9, "Sapphire uses physical glass transmission shader");
  assert(mat.ior === GEMSTONE_SPECS["sapphire"].refractiveIndex, "Sapphire refractive index is 1.77");
}

// ---------------------------------------------------------------------------
// TEST C: RECTANGULAR SIGNET RING WITH BLACK ONYX
// ---------------------------------------------------------------------------
console.log("\n--- TEST C: Rectangular Signet Ring (Flat Face, Opaque Onyx) ---");
{
  const signetSpec: JewelryBlueprint = {
    ...DEFAULT_BLUEPRINT,
    designName: "Executive Rectangular Signet Ring",
    category: "signet-ring",
    bandProfile: "court-comfort",
    bandWidth: 5.5,
    bandThickness: 2.2,
    signetPlateauWidth: 12.0,
    signetPlateauLength: 16.0, // length/width = 1.33 > 1.3 => rectangular
    bezelEnabled: true,
    gemstoneType: "black-onyx",
    gemColorHex: "#0F172A",
  };

  const { rootGroup, partGroups } = buildProceduralJewelryGroup(signetSpec, {});
  const metrics = calculateSceneMetalMetrics(rootGroup, signetSpec);

  assert(partGroups["shank"].children.length > 0, "Signet shank is present");
  assert(partGroups["head-assembly"].children.length > 0, "Signet flat plateau face is present");
  assert(partGroups["center-stone"].children.length > 0, "Signet stone inlay is present");

  // Verify opaque material for black onyx
  const inlayMesh = partGroups["center-stone"].children[0] as THREE.Mesh;
  const inlayMat = inlayMesh.material as THREE.MeshStandardMaterial;
  assert(inlayMat instanceof THREE.MeshStandardMaterial, "Black onyx uses opaque MeshStandardMaterial");
  assert((inlayMat as any).transmission === undefined, "Black onyx does NOT have transmission (is opaque)");

  // Bounding box checks
  const bbox = new THREE.Box3().setFromObject(rootGroup);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  assert(size.z >= 14.0, `Signet top plateau length is reflected in overall Z dimension (>= 14mm)`, `Z size = ${size.z.toFixed(2)}mm`);
  assert(metrics.weightGrams > 8.0, `Heavy signet casting weight reflected in metrics (> 8g)`, `Got ${metrics.weightGrams}g`);
}

// ---------------------------------------------------------------------------
// TEST D: HEART-SHAPED PENDANT
// ---------------------------------------------------------------------------
console.log("\n--- TEST D: Heart-Shaped Pendant (Not a Torus!) ---");
{
  const heartPendantSpec: JewelryBlueprint = {
    ...DEFAULT_BLUEPRINT,
    designName: "Filigree Heart Medallion Pendant",
    category: "pendant",
    pendantShape: "heart",
    pendantWidth: 28.0,
    pendantHeight: 32.0,
    pendantThickness: 1.4,
    pendantBailType: "triangular",
    pendantBailDiameter: 5.5,
    pendantBorderStyle: "scalloped",
    pendantCenterMotif: "floral-clover",
    metalAlloy: "22k-gold",
    metalColorHex: "#F5BD02",
  };

  const { rootGroup, partGroups } = buildProceduralJewelryGroup(heartPendantSpec, {});
  const metrics = calculateSceneMetalMetrics(rootGroup, heartPendantSpec);

  assert(rootGroup.children.length >= 3, "Pendant contains body, bail, and motif groups");
  assert(partGroups["shank"].children.length > 0, "Bail suspension loop is present");
  assert(partGroups["head-assembly"].children.length > 0, "Decorative center motif is present");

  // Bounding box verification: must be ~28mm wide and ~35-40mm tall (including bail)
  const bbox = new THREE.Box3().setFromObject(rootGroup);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  assert(size.x > 24.0 && size.x < 32.0, `Pendant width matches specification (~28mm)`, `Got ${size.x.toFixed(1)}mm`);
  assert(size.y > 30.0 && size.y < 45.0, `Pendant height matches body + bail (~32mm + bail)`, `Got ${size.y.toFixed(1)}mm`);
  assert(size.z < 6.0, `Pendant is flat plate medallion (Z thickness < 6mm)`, `Got ${size.z.toFixed(1)}mm`);
  assert(metrics.totalCarats === 0, "Solid 22K gold medallion has 0 carats");
  assert(metrics.weightGrams > 10.0, `22K high-karat gold medallion weight calculated (> 10g)`, `Got ${metrics.weightGrams}g`);
  assert(metrics.drcPass === true, "DRC passes for 1.4mm plate thickness and 5.5mm bail");
}

// ---------------------------------------------------------------------------
// TEST E: PEAR-CUT SOLITAIRE PROFILE ASYMMETRY
// ---------------------------------------------------------------------------
console.log("\n--- TEST E: Pear-Cut Faceted Gemstone Asymmetry ---");
{
  const pearGeom = createFacetedGemstoneGeometry("pear", 10.0, 7.0, 4.5);
  const pos = pearGeom.attributes.position;

  // In our pear parametric formula:
  // x = cos(t) * radiusX (length along X: tip at +X, base at -X)
  // z = sin(t) * (1 - 0.45 * cos(t)) * radiusZ (width along Z)
  // The pear teardrop has bilateral symmetry across the X-axis (z and -z),
  // but longitudinal asymmetry along X: the base (x < 0) is significantly wider than the tip (x > 0).

  let maxZatTipSide = 0;   // max |Z| where x > 2.0 (towards tip)
  let maxZatBaseSide = 0;  // max |Z| where x < -2.0 (towards rounded base)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = Math.abs(pos.getZ(i));
    if (x > 2.0 && z > maxZatTipSide) maxZatTipSide = z;
    if (x < -2.0 && z > maxZatBaseSide) maxZatBaseSide = z;
  }

  assert(maxZatTipSide > 1.0, `Tip side has measurable width`, `Got ${maxZatTipSide.toFixed(2)}mm`);
  assert(maxZatBaseSide > 2.0, `Base side has measurable width`, `Got ${maxZatBaseSide.toFixed(2)}mm`);
  assert(
    maxZatBaseSide > maxZatTipSide * 1.3,
    `Pear rounded base is significantly wider than tapered tip (> 30% wider)`,
    `Base width=${maxZatBaseSide.toFixed(2)}mm vs Tip width=${maxZatTipSide.toFixed(2)}mm (ratio: ${(maxZatBaseSide / maxZatTipSide).toFixed(2)}x)`
  );
}

// ---------------------------------------------------------------------------
// TEST F: UNSUPPORTED COMPLEX JEWELRY REJECTION
// ---------------------------------------------------------------------------
console.log("\n--- TEST F: Unsupported Jewelry Rejection & Diagnostics ---");
{
  // Test earrings
  const earringCheck = checkUnsupportedRequest("Chandelier diamond drop earrings for bride");
  assert(earringCheck.isUnsupported === true, "Earrings correctly detected as unsupported");
  assert(Boolean(earringCheck.reason?.includes("earring")), "Clear diagnostic reason explains earrings are not supported");

  // Test tennis bracelet
  const braceletCheck = checkUnsupportedRequest("14k white gold tennis bracelet with 50 diamonds");
  assert(braceletCheck.isUnsupported === true, "Bracelet correctly detected as unsupported");

  // Test necklace
  const necklaceCheck = checkUnsupportedRequest("Cuban link chain necklace heavy 100g");
  assert(necklaceCheck.isUnsupported === true, "Chain necklace correctly detected as unsupported");

  // Test supported pendant necklace exception: "pendant necklace" should NOT be rejected
  const pendantNecklaceCheck = checkUnsupportedRequest("Gold heart pendant necklace");
  assert(pendantNecklaceCheck.isUnsupported === false, "Pendant necklace is correctly accepted as pendant");

  // Test normalizeAndValidateBlueprint unsupported handling
  const rawEarring = { category: "earrings", designName: "Drop Earrings" };
  const normEarring = normalizeAndValidateBlueprint(rawEarring);
  assert(normEarring.isSupported === false, "Schema normalizer rejects unsupported category 'earrings'");

  // Test normalizeAndValidateBlueprint plain band handling
  const rawBand = { category: "wedding band", ringSizeUS: 8, bandWidth: 5.0 };
  const normBand = normalizeAndValidateBlueprint(rawBand);
  assert(normBand.isSupported === true, "Schema normalizer accepts 'wedding band'");
  assert(normBand.blueprint.category === "plain-band", "Normalized to 'plain-band'");
  assert(normBand.blueprint.prongCount === 0, "Prong count forced to 0 for plain band");
}

// ---------------------------------------------------------------------------
// TEST G: MESH VOLUME & DIVERGENCE THEOREM VALIDITY
// ---------------------------------------------------------------------------
console.log("\n--- TEST G: Mesh Volume & Divergence Theorem ---");
{
  // Test exact divergence theorem volume on a known cube: BoxGeometry(10, 10, 10) = 1000 mm³
  const boxGeom = new THREE.BoxGeometry(10, 10, 10);
  const boxVol = computeGeometryVolumeMM3(boxGeom, new THREE.Matrix4());
  assert(Math.abs(boxVol - 1000) < 0.01, `Exact volume of 10x10x10 cube is 1000.00 mm³`, `Got ${boxVol.toFixed(2)} mm³`);

  // Test cylinder volume: CylinderGeometry(radius=5, height=10) = π * r² * h ≈ 785.40 mm³
  const cylGeom = new THREE.CylinderGeometry(5, 5, 10, 64);
  const cylVol = computeGeometryVolumeMM3(cylGeom, new THREE.Matrix4());
  const expectedCyl = Math.PI * 25 * 10;
  assert(Math.abs(cylVol - expectedCyl) / expectedCyl < 0.01, `Cylinder volume is within 1% of analytical π*r²*h`, `Got ${cylVol.toFixed(2)}, expected ${expectedCyl.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// TEST H: DRC LOST-WAX CASTING VALIDATION ACCURACY
// ---------------------------------------------------------------------------
console.log("\n--- TEST H: DRC Lost-Wax Casting Standards ---");
{
  // Thin band failure test (< 1.1mm)
  const thinBandSpec: JewelryBlueprint = {
    ...DEFAULT_BLUEPRINT,
    bandThickness: 0.9,
    bandWidth: 1.2,
  };
  const thinMetrics = calculateSceneMetalMetrics(null, thinBandSpec);
  assert(thinMetrics.drcPass === false, "Thin band (< 1.1mm) fails DRC");
  assert(thinMetrics.drcErrors.some((e) => e.includes("Band thickness < 1.1mm")), "Specific porosity error reported");
  assert(thinMetrics.drcErrors.some((e) => e.includes("Band width < 1.4mm")), "Specific sprue attachment error reported");

  // Thin pendant failure test (< 0.8mm)
  const thinPendantSpec: JewelryBlueprint = {
    ...DEFAULT_BLUEPRINT,
    category: "pendant",
    pendantThickness: 0.6,
    pendantBailDiameter: 2.0,
  };
  const pendantMetrics = calculateSceneMetalMetrics(null, thinPendantSpec);
  assert(pendantMetrics.drcPass === false, "Thin pendant (< 0.8mm) fails DRC");
  assert(pendantMetrics.drcErrors.some((e) => e.includes("Pendant thickness < 0.8mm")), "Pendant plate thickness error reported");
  assert(pendantMetrics.drcErrors.some((e) => e.includes("Bail loop < 2.5mm")), "Pendant bail diameter error reported");
}

console.log("\n===============================================================================");
console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("===============================================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! ZERO DEFECTS DETECTED.");
  process.exit(0);
}
