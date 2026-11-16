import * as THREE from "three";
import {
  JewelryBlueprint,
  ALLOY_DENSITIES,
  GEMSTONE_SPECS,
} from "@/types/cad";

// ---------------------------------------------------------------------------
// PENDANT BODY SILHOUETTE SHAPES
// ---------------------------------------------------------------------------

function createHeartShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height;

  // Parametric heart using cubic bezier curves
  // Start at bottom cusp
  shape.moveTo(0, -h * 0.45);

  // Right side: bottom cusp to right lobe peak
  shape.bezierCurveTo(
    w * 0.25, -h * 0.25,   // control 1
    w * 1.0,  -h * 0.05,   // control 2
    w * 0.85,  h * 0.25    // right lobe peak area
  );

  // Right lobe curve to top center cleft
  shape.bezierCurveTo(
    w * 0.7,   h * 0.48,   // control 1
    w * 0.15,  h * 0.5,    // control 2
    0,         h * 0.3     // top center cleft
  );

  // Left lobe curve from cleft to left peak
  shape.bezierCurveTo(
    -w * 0.15, h * 0.5,    // control 1
    -w * 0.7,  h * 0.48,   // control 2
    -w * 0.85, h * 0.25    // left lobe peak
  );

  // Left side back down to bottom cusp
  shape.bezierCurveTo(
    -w * 1.0, -h * 0.05,   // control 1
    -w * 0.25, -h * 0.25,  // control 2
    0,        -h * 0.45    // back to bottom cusp
  );

  return shape;
}

function createOvalShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  const rx = width / 2;
  const ry = height / 2;
  shape.ellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  return shape;
}

function createPearShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height;

  // Start at bottom point
  shape.moveTo(0, -h * 0.5);

  // Right side: bottom point up to widest part
  shape.bezierCurveTo(
    w * 0.4, -h * 0.2,
    w * 1.0,  h * 0.0,
    w * 0.9,  h * 0.2
  );

  // Right to top curve
  shape.bezierCurveTo(
    w * 0.75, h * 0.45,
    w * 0.2,  h * 0.5,
    0,        h * 0.5
  );

  // Left side from top
  shape.bezierCurveTo(
    -w * 0.2,  h * 0.5,
    -w * 0.75, h * 0.45,
    -w * 0.9,  h * 0.2
  );

  // Left side back to bottom point
  shape.bezierCurveTo(
    -w * 1.0,  h * 0.0,
    -w * 0.4, -h * 0.2,
    0,        -h * 0.5
  );

  return shape;
}

function createRoundShape(width: number, _height: number): THREE.Shape {
  const shape = new THREE.Shape();
  const r = width / 2;
  shape.absarc(0, 0, r, 0, Math.PI * 2, false);
  return shape;
}

function createOctagonShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  const rx = width / 2;
  const ry = height / 2;
  const sides = 8;

  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function getPendantShape(
  pendantShape: JewelryBlueprint["pendantShape"],
  width: number,
  height: number
): THREE.Shape {
  switch (pendantShape) {
    case "heart":    return createHeartShape(width, height);
    case "oval":     return createOvalShape(width, height);
    case "pear":     return createPearShape(width, height);
    case "round":    return createRoundShape(width, height);
    case "octagon":  return createOctagonShape(width, height);
    default:         return createOvalShape(width, height);
  }
}

// ---------------------------------------------------------------------------
// BAIL GEOMETRY
// ---------------------------------------------------------------------------

function createTriangularBail(
  bailDiameter: number,
  thickness: number,
  metalMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const w = bailDiameter;
  const h = bailDiameter * 1.2;
  const tubeR = Math.min(thickness, 1.2) / 2;

  // Triangular bail path
  const points = [
    new THREE.Vector3(-w / 2, 0, 0),
    new THREE.Vector3(0, h, 0),
    new THREE.Vector3(w / 2, 0, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(points, false);
  const tubeGeom = new THREE.TubeGeometry(curve, 20, tubeR, 8, false);

  // Cap the ends with small spheres
  const capGeom = new THREE.SphereGeometry(tubeR, 8, 8);

  const tubeMesh = new THREE.Mesh(tubeGeom, metalMaterial);
  tubeMesh.userData = { isMetal: true, part: "bail" };
  tubeMesh.castShadow = true;
  group.add(tubeMesh);

  const capL = new THREE.Mesh(capGeom, metalMaterial);
  capL.position.copy(points[0]);
  capL.userData = { isMetal: true, part: "bail" };
  group.add(capL);

  const capR = new THREE.Mesh(capGeom, metalMaterial);
  capR.position.copy(points[2]);
  capR.userData = { isMetal: true, part: "bail" };
  group.add(capR);

  return group;
}

function createTaperedBail(
  bailDiameter: number,
  thickness: number,
  metalMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const r = bailDiameter / 2;
  const tubeR = Math.min(thickness, 1.2) / 2;

  // Arch path
  const archPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const angle = Math.PI * t;
    archPoints.push(
      new THREE.Vector3(
        Math.cos(angle) * r,
        Math.sin(angle) * r * 1.3,
        0
      )
    );
  }
  const curve = new THREE.CatmullRomCurve3(archPoints, false);
  const tubeGeom = new THREE.TubeGeometry(curve, 20, tubeR, 8, false);

  const mesh = new THREE.Mesh(tubeGeom, metalMaterial);
  mesh.userData = { isMetal: true, part: "bail" };
  mesh.castShadow = true;
  group.add(mesh);

  return group;
}

function createRingBail(
  bailDiameter: number,
  thickness: number,
  metalMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const r = bailDiameter / 2;
  const tubeR = Math.min(thickness, 1.0) / 2;

  const torusGeom = new THREE.TorusGeometry(r, tubeR, 12, 24);
  const mesh = new THREE.Mesh(torusGeom, metalMaterial);
  mesh.rotation.x = Math.PI / 2;
  mesh.userData = { isMetal: true, part: "bail" };
  mesh.castShadow = true;
  group.add(mesh);

  return group;
}

// ---------------------------------------------------------------------------
// BORDER DECORATIONS
// ---------------------------------------------------------------------------

function addScallopedBorder(
  bodyGroup: THREE.Group,
  shape: THREE.Shape,
  thickness: number,
  metalMaterial: THREE.Material
): void {
  // Get points along the outer edge
  const points = shape.getPoints(64);
  const bumpRadius = thickness * 0.4;

  for (let i = 0; i < points.length; i += 3) {
    const pt = points[i];
    const sphereGeom = new THREE.SphereGeometry(bumpRadius, 6, 6);
    const mesh = new THREE.Mesh(sphereGeom, metalMaterial);
    mesh.position.set(pt.x, pt.y, 0);
    mesh.userData = { isMetal: true, part: "border" };
    bodyGroup.add(mesh);
  }
}

function addBeadedBorder(
  bodyGroup: THREE.Group,
  shape: THREE.Shape,
  thickness: number,
  metalMaterial: THREE.Material
): void {
  const points = shape.getPoints(48);
  const beadRadius = thickness * 0.25;

  for (let i = 0; i < points.length; i += 2) {
    const pt = points[i];
    const sphereGeom = new THREE.SphereGeometry(beadRadius, 6, 6);
    const mesh = new THREE.Mesh(sphereGeom, metalMaterial);
    mesh.position.set(pt.x, pt.y, 0);
    mesh.userData = { isMetal: true, part: "border" };
    bodyGroup.add(mesh);
  }
}

// ---------------------------------------------------------------------------
// CENTER MOTIFS
// ---------------------------------------------------------------------------

function createFloralCloverMotif(
  width: number,
  height: number,
  thickness: number,
  metalMaterial: THREE.Material
): THREE.Group {
  const motifGroup = new THREE.Group();
  const petalR = Math.min(width, height) * 0.12;
  const centerDist = petalR * 1.1;
  const relief = thickness * 0.15;

  // Four petals (clover pattern)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const cx = Math.cos(angle) * centerDist;
    const cy = Math.sin(angle) * centerDist;

    // Petal as flattened sphere
    const petalGeom = new THREE.SphereGeometry(petalR, 12, 8);
    petalGeom.scale(1, 1, 0.35);
    const petal = new THREE.Mesh(petalGeom, metalMaterial);
    petal.position.set(cx, cy, thickness / 2 + relief);
    petal.userData = { isMetal: true, part: "motif" };
    petal.castShadow = true;
    motifGroup.add(petal);
  }

  // Center dot
  const centerGeom = new THREE.SphereGeometry(petalR * 0.5, 8, 8);
  centerGeom.scale(1, 1, 0.4);
  const center = new THREE.Mesh(centerGeom, metalMaterial);
  center.position.set(0, 0, thickness / 2 + relief);
  center.userData = { isMetal: true, part: "motif" };
  center.castShadow = true;
  motifGroup.add(center);

  return motifGroup;
}

function createFiligreStarMotif(
  width: number,
  height: number,
  thickness: number,
  metalMaterial: THREE.Material
): THREE.Group {
  const motifGroup = new THREE.Group();
  const starR = Math.min(width, height) * 0.2;
  const relief = thickness * 0.15;

  // Six-pointed star (Star of David) as two overlapping triangles
  for (let tri = 0; tri < 2; tri++) {
    const offset = tri * (Math.PI / 6);
    const starShape = new THREE.Shape();

    for (let i = 0; i < 6; i++) {
      const angle = offset + (i / 6) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? starR : starR * 0.45;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const extrudeSettings = {
      depth: thickness * 0.12,
      bevelEnabled: false,
    };
    const starGeom = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    const starMesh = new THREE.Mesh(starGeom, metalMaterial);
    starMesh.position.set(0, 0, thickness / 2 + relief - thickness * 0.06);
    starMesh.userData = { isMetal: true, part: "motif" };
    starMesh.castShadow = true;
    motifGroup.add(starMesh);
  }

  return motifGroup;
}

// ---------------------------------------------------------------------------
// MAIN PENDANT BUILDER
// ---------------------------------------------------------------------------
export interface PendantBuildResult {
  group: THREE.Group;
  partGroups: Record<string, THREE.Group>;
}

export function buildPendantGeometry(
  blueprint: JewelryBlueprint,
  options: {
    waxCastMode?: boolean;
    wireframe?: boolean;
    clippingPlane?: THREE.Plane | null;
  }
): PendantBuildResult {
  const { waxCastMode = false, wireframe = false, clippingPlane = null } = options;

  const pendantWidth = blueprint.pendantWidth || 28;
  const pendantHeight = blueprint.pendantHeight || 32;
  const pendantThickness = blueprint.pendantThickness || 1.4;
  const pendantShape = blueprint.pendantShape || "heart";
  const bailType = blueprint.pendantBailType || "triangular";
  const bailDiameter = blueprint.pendantBailDiameter || 5.5;
  const borderStyle = blueprint.pendantBorderStyle || "smooth";
  const centerMotif = blueprint.pendantCenterMotif || "plain";

  const rootGroup = new THREE.Group();
  rootGroup.name = "pendant-root";

  const bodyGroup = new THREE.Group();
  bodyGroup.name = "pendant-body";

  const bailGroup = new THREE.Group();
  bailGroup.name = "bail";

  const motifGroup = new THREE.Group();
  motifGroup.name = "motif";

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

  // 1. PENDANT BODY
  const shape = getPendantShape(pendantShape, pendantWidth, pendantHeight);
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: pendantThickness,
    bevelEnabled: true,
    bevelThickness: pendantThickness * 0.15,
    bevelSize: pendantThickness * 0.1,
    bevelSegments: 3,
    curveSegments: 48,
  };

  const bodyGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Center the extrusion depth-wise
  bodyGeom.translate(0, 0, -pendantThickness / 2);

  const bodyMesh = new THREE.Mesh(bodyGeom, metalMaterial);
  bodyMesh.name = "pendant-body-mesh";
  bodyMesh.userData = { isMetal: true, part: "pendant-body" };
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);

  // 2. BORDER DECORATION
  if (borderStyle === "scalloped") {
    addScallopedBorder(bodyGroup, shape, pendantThickness, metalMaterial);
  } else if (borderStyle === "beaded") {
    addBeadedBorder(bodyGroup, shape, pendantThickness, metalMaterial);
  }

  // 3. BAIL — positioned at top of pendant body
  // Find the topmost Y of the shape to position the bail
  const shapePoints = shape.getPoints(64);
  let maxY = -Infinity;
  for (const pt of shapePoints) {
    if (pt.y > maxY) maxY = pt.y;
  }

  let bail: THREE.Group;
  if (bailType === "triangular") {
    bail = createTriangularBail(bailDiameter, pendantThickness, metalMaterial);
  } else if (bailType === "tapered") {
    bail = createTaperedBail(bailDiameter, pendantThickness, metalMaterial);
  } else {
    bail = createRingBail(bailDiameter, pendantThickness, metalMaterial);
  }
  bail.position.set(0, maxY + 0.5, 0);
  bailGroup.add(bail);

  // 4. CENTER MOTIF
  if (centerMotif === "floral-clover") {
    const floral = createFloralCloverMotif(pendantWidth, pendantHeight, pendantThickness, metalMaterial);
    motifGroup.add(floral);
  } else if (centerMotif === "filigree-star") {
    const star = createFiligreStarMotif(pendantWidth, pendantHeight, pendantThickness, metalMaterial);
    motifGroup.add(star);
  } else if (centerMotif === "gemstone" && !waxCastMode) {
    // Simple gemstone seat in center — use a small faceted gem
    const gemSpec = GEMSTONE_SPECS[blueprint.gemstoneType] || GEMSTONE_SPECS["diamond"];
    const gemColor = blueprint.gemColorHex || gemSpec.defaultHex;
    const gemSize = Math.min(pendantWidth, pendantHeight) * 0.2;

    const gemMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(gemColor),
      roughness: 0.05,
      metalness: 0.0,
      transmission: blueprint.gemstoneType === "black-onyx" ? 0 : 0.95,
      ior: gemSpec.refractiveIndex,
      thickness: 3.5,
      wireframe,
      clippingPlanes: clippingPlane ? [clippingPlane] : [],
    });

    // Simple brilliant-cut approximation
    const gemGeom = new THREE.ConeGeometry(gemSize / 2, gemSize * 0.6, 8);
    const topGeom = new THREE.CylinderGeometry(gemSize / 2 * 0.56, gemSize / 2, gemSize * 0.25, 8);

    const pavilion = new THREE.Mesh(gemGeom, gemMaterial);
    pavilion.rotation.x = Math.PI;
    pavilion.position.set(0, 0, pendantThickness / 2 + gemSize * 0.1);
    pavilion.rotation.set(Math.PI / 2, 0, 0);
    pavilion.userData = { isGem: true, part: "motif" };
    motifGroup.add(pavilion);

    const crown = new THREE.Mesh(topGeom, gemMaterial);
    crown.position.set(0, 0, pendantThickness / 2 + gemSize * 0.25);
    crown.rotation.set(Math.PI / 2, 0, 0);
    crown.userData = { isGem: true, part: "motif" };
    motifGroup.add(crown);

    // Bezel ring around gemstone
    const bezelGeom = new THREE.TorusGeometry(gemSize / 2 + 0.3, 0.4, 8, 24);
    const bezel = new THREE.Mesh(bezelGeom, metalMaterial);
    bezel.position.set(0, 0, pendantThickness / 2 + gemSize * 0.15);
    bezel.userData = { isMetal: true, part: "motif" };
    motifGroup.add(bezel);
  }

  // Assemble
  rootGroup.add(bodyGroup);
  rootGroup.add(bailGroup);
  rootGroup.add(motifGroup);

  // Orient pendant upright (shape is in XY plane, extrude along Z)
  // We want it visible from the front (looking down -Z)
  // No rotation needed — shape is already in XY, which faces the camera in front view

  return {
    group: rootGroup,
    partGroups: {
      "pendant-body": bodyGroup,
      "bail": bailGroup,
      "motif": motifGroup,
    },
  };
}

