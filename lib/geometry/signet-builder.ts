import * as THREE from "three";
import {
  JewelryBlueprint,
  ALLOY_DENSITIES,
  GEMSTONE_SPECS,
} from "@/types/cad";

// ---------------------------------------------------------------------------
// SIGNET RING GEOMETRY BUILDER
// Creates a ring with a distinct flat plateau face at the top, with proper
// shoulder transitions and support for rectangular/oval/octagonal face shapes.
// ---------------------------------------------------------------------------

type FaceShape = "rectangular" | "oval" | "octagonal";

function determineFaceShape(plateauWidth: number, plateauLength: number): FaceShape {
  const ratio = plateauLength / plateauWidth;
  if (ratio > 1.3 || ratio < 0.77) return "rectangular";
  if (plateauWidth > 14) return "octagonal";
  return "oval";
}

/**
 * Creates the signet plateau face as a flat polygon at the top of the ring.
 */
function createPlateauFace(
  plateauWidth: number,
  plateauLength: number,
  faceShape: FaceShape,
  yPosition: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = plateauWidth / 2;
  const hl = plateauLength / 2;

  if (faceShape === "rectangular") {
    // Rounded rectangle
    const cornerR = Math.min(hw, hl) * 0.15;
    shape.moveTo(-hw + cornerR, -hl);
    shape.lineTo(hw - cornerR, -hl);
    shape.quadraticCurveTo(hw, -hl, hw, -hl + cornerR);
    shape.lineTo(hw, hl - cornerR);
    shape.quadraticCurveTo(hw, hl, hw - cornerR, hl);
    shape.lineTo(-hw + cornerR, hl);
    shape.quadraticCurveTo(-hw, hl, -hw, hl - cornerR);
    shape.lineTo(-hw, -hl + cornerR);
    shape.quadraticCurveTo(-hw, -hl, -hw + cornerR, -hl);
  } else if (faceShape === "octagonal") {
    const sides = 8;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 8;
      const x = Math.cos(angle) * hw;
      const z = Math.sin(angle) * hl;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();
  } else {
    // Oval
    shape.ellipse(0, 0, hw, hl, 0, Math.PI * 2, false, 0);
  }

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.6,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.15,
    bevelSegments: 2,
    curveSegments: 32,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Rotate so face is horizontal (facing up) and position at ring top
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, yPosition, 0);

  return geom;
}

/**
 * Creates the signet ring shank with smooth shoulder transitions.
 * The cross-section interpolates from a normal round band at the bottom
 * to a wider, flatter cross-section at the top where the plateau sits.
 */
function createSignetShank(
  innerDiameter: number,
  bandWidth: number,
  bandThickness: number,
  plateauWidth: number,
  plateauLength: number
): THREE.BufferGeometry {
  const rIn = innerDiameter / 2;
  const radialSegs = 80;
  const crossSegs = 20;

  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegs; i++) {
    const u = i / radialSegs;
    const theta = u * Math.PI * 2;
    const sinT = Math.sin(theta);

    // Blend factor: 0 at bottom (theta=3PI/2), 1 at top (theta=PI/2)
    // Use smooth hermite interpolation
    const rawBlend = (sinT + 1) / 2; // 0..1
    const blend = rawBlend * rawBlend * (3 - 2 * rawBlend); // smoothstep

    // Interpolate cross-section dimensions
    const effectiveWidth = bandWidth + blend * (plateauLength - bandWidth);
    const effectiveThickness = bandThickness + blend * (Math.max(bandThickness, 3.0) - bandThickness);

    // The ring center radius varies — thicker at top
    const rOut = rIn + effectiveThickness;
    const ringCenterR = (rIn + rOut) / 2;

    const cx = Math.cos(theta) * ringCenterR;
    const cy = Math.sin(theta) * ringCenterR;

    for (let j = 0; j <= crossSegs; j++) {
      const v = j / crossSegs;
      const crossAngle = v * Math.PI * 2;

      // At bottom: round/elliptical cross-section
      // At top: flatter, wider cross-section (more rectangular)
      let dr: number, dz: number;

      if (blend < 0.3) {
        // Normal round cross-section
        dr = (effectiveThickness / 2) * Math.cos(crossAngle);
        dz = (effectiveWidth / 2) * Math.sin(crossAngle);
      } else {
        // Transition to flatter top: compress the radial dimension, widen Z
        const flatness = Math.min(1, (blend - 0.3) / 0.5);
        const rPower = 2 + flatness * 4; // higher power = flatter top
        const cosCA = Math.cos(crossAngle);
        const sinCA = Math.sin(crossAngle);
        const superR = Math.pow(
          Math.pow(Math.abs(cosCA), rPower) + Math.pow(Math.abs(sinCA), rPower),
          1 / rPower
        );
        dr = (effectiveThickness / 2) * (cosCA / (superR || 1));
        dz = (effectiveWidth / 2) * (sinCA / (superR || 1));
      }

      const posX = cx + dr * Math.cos(theta);
      const posY = cy + dr * Math.sin(theta);
      const posZ = dz;

      vertices.push(posX, posY, posZ);
    }
  }

  // Build index buffer
  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < crossSegs; j++) {
      const a = i * (crossSegs + 1) + j;
      const b = (i + 1) * (crossSegs + 1) + j;
      const c = (i + 1) * (crossSegs + 1) + (j + 1);
      const d = i * (crossSegs + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// ---------------------------------------------------------------------------
// MAIN SIGNET BUILDER
// ---------------------------------------------------------------------------
export interface SignetBuildResult {
  group: THREE.Group;
  partGroups: Record<string, THREE.Group>;
}

export function buildSignetGeometry(
  blueprint: JewelryBlueprint,
  options: {
    waxCastMode?: boolean;
    wireframe?: boolean;
    clippingPlane?: THREE.Plane | null;
  }
): SignetBuildResult {
  const { waxCastMode = false, wireframe = false, clippingPlane = null } = options;

  const plateauWidth = blueprint.signetPlateauWidth || 13.5;
  const plateauLength = blueprint.signetPlateauLength || 14.5;
  const innerDiam = blueprint.innerDiameter;
  const bandW = blueprint.bandWidth;
  const bandT = blueprint.bandThickness;

  const rootGroup = new THREE.Group();
  rootGroup.name = "signet-root";

  const shankGroup = new THREE.Group();
  shankGroup.name = "shank";

  const faceGroup = new THREE.Group();
  faceGroup.name = "signet-face";

  const inlayGroup = new THREE.Group();
  inlayGroup.name = "inlay";

  // Materials
  const alloyInfo = ALLOY_DENSITIES[blueprint.metalAlloy] || ALLOY_DENSITIES["18k-white"];
  const metalColor = blueprint.metalColorHex || alloyInfo.hex;

  const metalMaterial = waxCastMode
    ? new THREE.MeshStandardMaterial({
        color: "#0284c7",
        roughness: 0.38,
        metalness: 0.05,
        wireframe,
        clippingPlanes: clippingPlane ? [clippingPlane] : [],
        clipShadows: true,
      })
    : new THREE.MeshStandardMaterial({
        color: new THREE.Color(metalColor),
        roughness: 0.16,
        metalness: 0.96,
        envMapIntensity: 1.8,
        wireframe,
        clippingPlanes: clippingPlane ? [clippingPlane] : [],
        clipShadows: true,
      });

  // 1. SHANK
  const shankGeom = createSignetShank(
    innerDiam, bandW, bandT, plateauWidth, plateauLength
  );
  const shankMesh = new THREE.Mesh(shankGeom, metalMaterial);
  shankMesh.name = "signet-shank-mesh";
  shankMesh.userData = { isMetal: true, part: "shank" };
  shankMesh.castShadow = true;
  shankMesh.receiveShadow = true;
  shankGroup.add(shankMesh);

  // 2. PLATEAU FACE
  const faceShape = determineFaceShape(plateauWidth, plateauLength);
  const rTop = innerDiam / 2 + Math.max(bandT, 3.0);
  const plateauY = rTop + 0.1; // Slightly above the top of the shank

  const faceGeom = createPlateauFace(plateauWidth, plateauLength, faceShape, plateauY);
  const faceMesh = new THREE.Mesh(faceGeom, metalMaterial);
  faceMesh.name = "signet-face-mesh";
  faceMesh.userData = { isMetal: true, part: "signet-face" };
  faceMesh.castShadow = true;
  faceGroup.add(faceMesh);

  // 3. STONE INLAY (optional)
  if (blueprint.bezelEnabled && !waxCastMode) {
    const gemSpec = GEMSTONE_SPECS[blueprint.gemstoneType] || GEMSTONE_SPECS["diamond"];
    const gemColor = blueprint.gemColorHex || gemSpec.defaultHex;
    const isOpaque = blueprint.gemstoneType === "black-onyx";

    const inlayMaterial = isOpaque
      ? new THREE.MeshStandardMaterial({
          color: new THREE.Color(gemColor),
          roughness: 0.3,
          metalness: 0.1,
          wireframe,
          clippingPlanes: clippingPlane ? [clippingPlane] : [],
        })
      : new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(gemColor),
          roughness: 0.05,
          metalness: 0.0,
          transmission: 0.95,
          ior: gemSpec.refractiveIndex,
          thickness: 2.0,
          wireframe,
          clippingPlanes: clippingPlane ? [clippingPlane] : [],
        });

    // Inlay sits recessed into the plateau
    const inlayW = plateauWidth * 0.7;
    const inlayL = plateauLength * 0.7;
    const inlayDepth = 1.2;

    let inlayGeom: THREE.BufferGeometry;
    if (faceShape === "rectangular") {
      inlayGeom = new THREE.BoxGeometry(inlayW, inlayDepth, inlayL);
    } else if (faceShape === "octagonal") {
      const octShape = new THREE.Shape();
      const sides = 8;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 8;
        const x = Math.cos(angle) * inlayW / 2;
        const z = Math.sin(angle) * inlayL / 2;
        if (i === 0) octShape.moveTo(x, z);
        else octShape.lineTo(x, z);
      }
      octShape.closePath();
      inlayGeom = new THREE.ExtrudeGeometry(octShape, { depth: inlayDepth, bevelEnabled: false });
      inlayGeom.rotateX(-Math.PI / 2);
    } else {
      // Oval inlay
      inlayGeom = new THREE.CylinderGeometry(inlayW / 2, inlayW / 2, inlayDepth, 24);
      inlayGeom.scale(1, 1, inlayL / inlayW);
    }

    const inlayMesh = new THREE.Mesh(inlayGeom, inlayMaterial);
    inlayMesh.position.set(0, plateauY + 0.5, 0);
    inlayMesh.name = "signet-inlay-mesh";
    inlayMesh.userData = { isGem: true, part: "inlay" };
    inlayMesh.castShadow = true;
    inlayGroup.add(inlayMesh);
  }

  // Assemble
  rootGroup.add(shankGroup);
  rootGroup.add(faceGroup);
  rootGroup.add(inlayGroup);

  return {
    group: rootGroup,
    partGroups: {
      shank: shankGroup,
      "signet-face": faceGroup,
      inlay: inlayGroup,
    },
  };
}

