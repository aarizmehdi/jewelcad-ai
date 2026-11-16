import * as THREE from "three";
import { JewelryBlueprint, ALLOY_DENSITIES } from "@/types/cad";

/**
 * Computes exact volume in cubic millimeters (mm^3) of a BufferGeometry
 * using the signed tetrahedron divergence theorem:
 * Volume = sum( (v1 . (v2 x v3)) / 6 )
 */
export function computeGeometryVolumeMM3(geometry: THREE.BufferGeometry, matrixWorld: THREE.Matrix4): number {
  const geom = geometry.clone();
  geom.applyMatrix4(matrixWorld);
  const pos = geom.attributes.position;
  if (!pos) {
    geom.dispose();
    return 0;
  }

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

export interface MetalMetricsResult {
  volumeMM3: number;
  weightGrams: number;
  totalCarats: number;
  centerCarat: number;
  flankCarat: number;
  haloCarat: number;
  paveCarat: number;
  drcPass: boolean;
  drcErrors: string[];
  drcWarnings: string[];
  isEstimatedVolume: boolean;
}

/**
 * Traverses the 3D scene group and calculates:
 * 1. Exact volume of all metal meshes (mm³)
 * 2. Metal weight in grams based on active alloy density
 * 3. Total diamond carat weight across center, flanks, halo, and shank pavé
 * 4. Design Rule Check (DRC) for Lost-Wax Casting manufacturability
 */
export function calculateSceneMetalMetrics(
  rootGroup: THREE.Group | null,
  spec: JewelryBlueprint
): MetalMetricsResult {
  let totalVolumeMM3 = 0;
  if (rootGroup) {
    rootGroup.updateMatrixWorld(true);
    rootGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.isMetal === true && obj.geometry) {
        totalVolumeMM3 += computeGeometryVolumeMM3(obj.geometry, obj.matrixWorld);
      }
    });
  }

  let isEstimatedVolume = false;

  // Fallback geometric estimate if scene hasn't rendered yet
  if (totalVolumeMM3 === 0) {
    isEstimatedVolume = true;
    if (spec.category === "pendant") {
      const h = spec.pendantHeight || 32;
      const w = spec.pendantWidth || 28;
      const t = spec.pendantThickness || 1.4;
      // Medallion area factor ~ 0.65 for heart/pear shape
      totalVolumeMM3 = (h * w * 0.65 * t) + 45; // +45 mm³ for bail & jump ring
    } else if (spec.category === "plain-band") {
      const ringRadius = spec.innerDiameter / 2 + spec.bandThickness / 2;
      const ringPerimeter = 2 * Math.PI * ringRadius;
      const bandSectionArea = spec.bandWidth * spec.bandThickness * 0.85;
      totalVolumeMM3 = ringPerimeter * bandSectionArea;
    } else {
      const ringRadius = spec.innerDiameter / 2 + spec.bandThickness / 2;
      const ringPerimeter = 2 * Math.PI * ringRadius;
      const bandSectionArea = spec.bandWidth * spec.bandThickness * 0.85;
      const shankVol = ringPerimeter * bandSectionArea;
      const headVol = (spec.headElevation * spec.prongCount * Math.PI * Math.pow(spec.prongThickness / 2, 2)) + (spec.bezelEnabled ? 20 : 15);
      totalVolumeMM3 = shankVol + headVol;
    }
  }

  const volumeCM3 = totalVolumeMM3 / 1000.0;
  const alloyInfo = ALLOY_DENSITIES[spec.metalAlloy] || ALLOY_DENSITIES["18k-white"];
  const weightGrams = volumeCM3 * alloyInfo.density;

  // Carat Weight Estimates based on gemological formulas:
  // Check if design actually has center stone
  const isPlainBand = spec.category === "plain-band" ||
    (spec.prongCount === 0 && !spec.bezelEnabled && !spec.haloEnabled && !spec.threeStoneEnabled && spec.category !== "pendant");
  const isPendantWithGem = spec.category === "pendant" && spec.pendantCenterMotif === "gemstone";

  let centerCarat = 0;
  let flankCarat = 0;
  let haloCarat = 0;
  let paveCarat = 0;

  if (!isPlainBand) {
    if (spec.category === "pendant") {
      if (isPendantWithGem) {
        const gemSize = Math.min(spec.pendantWidth, spec.pendantHeight) * 0.2;
        centerCarat = gemSize * gemSize * (gemSize * 0.6) * 0.0061;
      }
    } else {
      if (spec.prongCount > 0 || spec.bezelEnabled) {
        centerCarat = spec.gemLength * spec.gemWidth * spec.gemDepth * 0.0061;
      }
      flankCarat = spec.threeStoneEnabled ? 2 * (Math.pow(spec.flankGemSize, 3) * 0.6 * 0.0061) : 0;
      const haloPerimeter = Math.PI * ((spec.gemLength + spec.gemWidth) / 2 + spec.haloGapFromCenter * 2 + spec.haloStoneDiameter);
      const haloCount = spec.haloEnabled ? Math.max(10, Math.floor(haloPerimeter / (spec.haloStoneDiameter * 1.08))) : 0;
      haloCarat = haloCount * (Math.pow(spec.haloStoneDiameter, 3) * 0.62 * 0.0061);
      paveCarat = (spec.paveCountPerSide * 2) * (Math.pow(spec.paveStoneDiameter, 3) * 0.62 * 0.0061);
    }
  }

  const totalCarats = centerCarat + flankCarat + haloCarat + paveCarat;

  // DRC (Design Rule Check) - Lost-Wax Casting Standards
  const drcErrors: string[] = [];
  const drcWarnings: string[] = [];

  if (spec.category === "pendant") {
    if (spec.pendantThickness < 0.8) {
      drcErrors.push("Pendant thickness < 0.8mm risks structural warping during lost-wax burnout");
    } else if (spec.pendantThickness < 1.0) {
      drcWarnings.push("Pendant thickness < 1.0mm is thin for hand engraving or stone setting");
    }
    if (spec.pendantBailDiameter < 2.5) {
      drcErrors.push("Bail loop < 2.5mm will not accept standard commercial chain jump rings");
    }
  } else {
    // Ring DRC
    if (spec.bandThickness < 1.1) {
      drcErrors.push("Band thickness < 1.1mm risks porosity failure during investment casting");
    } else if (spec.bandThickness < 1.3) {
      drcWarnings.push("Band thickness < 1.3mm is thin for everyday wear");
    }

    if (spec.bandWidth < 1.4) {
      drcErrors.push("Band width < 1.4mm is too fragile for casting sprue attachment");
    }

    if (!spec.bezelEnabled && spec.prongCount > 0 && spec.prongThickness < 0.75) {
      drcErrors.push("Prong thickness < 0.75mm will fail during diamond setting");
    } else if (!spec.bezelEnabled && spec.prongCount > 0 && spec.prongThickness < 0.85) {
      drcWarnings.push("Prongs < 0.85mm require careful laser welding");
    }

    if (spec.bezelEnabled && spec.bezelWallThickness < 0.5) {
      drcErrors.push("Bezel wall < 0.5mm will tear during burnishing");
    }
  }

  const drcPass = drcErrors.length === 0;

  return {
    volumeMM3: Number(totalVolumeMM3.toFixed(1)),
    weightGrams: Number(weightGrams.toFixed(2)),
    totalCarats: Number(totalCarats.toFixed(2)),
    centerCarat: Number(centerCarat.toFixed(2)),
    flankCarat: Number(flankCarat.toFixed(2)),
    haloCarat: Number(haloCarat.toFixed(2)),
    paveCarat: Number(paveCarat.toFixed(2)),
    drcPass,
    drcErrors,
    drcWarnings,
    isEstimatedVolume,
  };
}

/**
 * High-performance direct Binary STL exporter that bakes all object world transformations.
 * Supports Lost-Wax Cast Ready (metal only) or Full Assembly.
 */
export function exportJewelrySTL(rootGroup: THREE.Group | null, designName: string, metalOnly: boolean) {
  if (!rootGroup) return;
  rootGroup.updateMatrixWorld(true);

  const triangles: { p1: THREE.Vector3; p2: THREE.Vector3; p3: THREE.Vector3; normal: THREE.Vector3 }[] = [];

  rootGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      if (metalOnly && child.userData?.isGem === true) return;

      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);

      const pos = geom.attributes.position;
      if (!pos) {
        geom.dispose();
        return;
      }

      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      const p3 = new THREE.Vector3();
      const cb = new THREE.Vector3();
      const ab = new THREE.Vector3();

      if (geom.index) {
        const idx = geom.index;
        for (let i = 0; i < idx.count; i += 3) {
          p1.fromBufferAttribute(pos, idx.getX(i));
          p2.fromBufferAttribute(pos, idx.getX(i + 1));
          p3.fromBufferAttribute(pos, idx.getX(i + 2));

          cb.subVectors(p3, p2);
          ab.subVectors(p1, p2);
          cb.cross(ab).normalize();

          triangles.push({
            p1: p1.clone(),
            p2: p2.clone(),
            p3: p3.clone(),
            normal: cb.clone(),
          });
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          p1.fromBufferAttribute(pos, i);
          p2.fromBufferAttribute(pos, i + 1);
          p3.fromBufferAttribute(pos, i + 2);

          cb.subVectors(p3, p2);
          ab.subVectors(p1, p2);
          cb.cross(ab).normalize();

          triangles.push({
            p1: p1.clone(),
            p2: p2.clone(),
            p3: p3.clone(),
            normal: cb.clone(),
          });
        }
      }
      geom.dispose();
    }
  });

  const bufferLength = 80 + 4 + triangles.length * 50;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const dataView = new DataView(arrayBuffer);

  // 80-byte header
  const headerText = `JewelCAD AI - ${designName.slice(0, 50)} - Binary STL Lossless`;
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < headerText.length ? headerText.charCodeAt(i) : 0);
  }

  // 4-byte uint32 triangle count
  dataView.setUint32(80, triangles.length, true);

  // 50 bytes per triangle
  let offset = 84;
  for (const tri of triangles) {
    // Normal
    dataView.setFloat32(offset, tri.normal.x, true);
    dataView.setFloat32(offset + 4, tri.normal.y, true);
    dataView.setFloat32(offset + 8, tri.normal.z, true);
    offset += 12;

    // V1
    dataView.setFloat32(offset, tri.p1.x, true);
    dataView.setFloat32(offset + 4, tri.p1.y, true);
    dataView.setFloat32(offset + 8, tri.p1.z, true);
    offset += 12;

    // V2
    dataView.setFloat32(offset, tri.p2.x, true);
    dataView.setFloat32(offset + 4, tri.p2.y, true);
    dataView.setFloat32(offset + 8, tri.p2.z, true);
    offset += 12;

    // V3
    dataView.setFloat32(offset, tri.p3.x, true);
    dataView.setFloat32(offset + 4, tri.p3.y, true);
    dataView.setFloat32(offset + 8, tri.p3.z, true);
    offset += 12;

    // Attribute byte count
    dataView.setUint16(offset, 0, true);
    offset += 2;
  }

  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  downloadBlob(blob, `${slugify(designName)}-${metalOnly ? "lost-wax-cast-ready" : "full-assembly"}.stl`);
}

/**
 * Direct OBJ exporter that preserves world coordinates and mesh names.
 */
export function exportJewelryOBJ(rootGroup: THREE.Group | null, designName: string) {
  if (!rootGroup) return;
  rootGroup.updateMatrixWorld(true);

  let output = `# JewelCAD AI Wavefront OBJ File\n# Design: ${designName}\n# Units: Millimeters (1 unit = 1mm)\n\n`;
  let vertexOffset = 1;

  rootGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      const pos = geom.attributes.position;
      if (!pos) {
        geom.dispose();
        return;
      }

      output += `o ${child.name || "mesh"}\n`;

      for (let i = 0; i < pos.count; i++) {
        output += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
      }

      if (geom.index) {
        const idx = geom.index;
        for (let i = 0; i < idx.count; i += 3) {
          const a = idx.getX(i) + vertexOffset;
          const b = idx.getX(i + 1) + vertexOffset;
          const c = idx.getX(i + 2) + vertexOffset;
          output += `f ${a} ${b} ${c}\n`;
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          const a = i + vertexOffset;
          const b = i + 1 + vertexOffset;
          const c = i + 2 + vertexOffset;
          output += `f ${a} ${b} ${c}\n`;
        }
      }

      vertexOffset += pos.count;
      geom.dispose();
      output += "\n";
    }
  });

  const blob = new Blob([output], { type: "text/plain" });
  downloadBlob(blob, `${slugify(designName)}.obj`);
}

export function exportJewelryJSON(spec: JewelryBlueprint) {
  const jsonStr = JSON.stringify(spec, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  downloadBlob(blob, `${slugify(spec.designName)}-blueprint.json`);
}

function slugify(text: string): string {
  return (text || "jewelry-cad")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
