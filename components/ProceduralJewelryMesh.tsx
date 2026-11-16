import * as THREE from "three";
import {
  JewelryBlueprint,
  SelectablePart,
  TransformOffset,
  GEMSTONE_SPECS,
  ALLOY_DENSITIES,
} from "@/types/cad";

// ---------------------------------------------------------------------------
// 1. HIGH PRECISION PROCEDURAL FACETED GEMSTONE GEOMETRY
// ---------------------------------------------------------------------------
export function createFacetedGemstoneGeometry(
  cut: JewelryBlueprint["gemCut"],
  length: number,
  width: number,
  depth: number
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  const tableRatio = 0.56;
  const crownRatio = 0.35;
  const girdleRatio = 0.05;
  const pavilionRatio = 0.60;

  const crownHeight = depth * crownRatio;
  const girdleThickness = depth * girdleRatio;
  const pavilionHeight = depth * pavilionRatio;

  const halfL = length / 2;
  const halfW = width / 2;

  const vertices: number[] = [];
  const indices: number[] = [];

  let segments = 24;
  if (cut === "emerald") segments = 8;
  else if (cut === "princess") segments = 4;
  else if (cut === "cushion") segments = 16;
  else if (cut === "pear" || cut === "marquise" || cut === "round" || cut === "oval") segments = 24;

  function getRadialPoint(angle: number, radiusX: number, radiusZ: number): [number, number] {
    if (cut === "princess") {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const d = Math.max(Math.abs(cos), Math.abs(sin));
      return [(cos / d) * radiusX, (sin / d) * radiusZ];
    }

    if (cut === "emerald") {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const p = 4;
      const d = Math.pow(Math.pow(Math.abs(cos), p) + Math.pow(Math.abs(sin), p), 1 / p);
      return [(cos / d) * radiusX, (sin / d) * radiusZ];
    }

    if (cut === "cushion") {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const p = 3;
      const d = Math.pow(Math.pow(Math.abs(cos), p) + Math.pow(Math.abs(sin), p), 1 / p);
      return [(cos / d) * radiusX, (sin / d) * radiusZ];
    }

    if (cut === "pear") {
      const t = angle;
      const x = Math.cos(t) * radiusX;
      const z = Math.sin(t) * (1 - 0.45 * Math.cos(t)) * radiusZ;
      return [x, z];
    }

    if (cut === "marquise") {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const signX = Math.sign(cos);
      const x = signX * Math.pow(Math.abs(cos), 0.75) * radiusX;
      const z = sin * radiusZ;
      return [x, z];
    }

    return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusZ];
  }

  // 0: Table center
  vertices.push(0, crownHeight, 0);

  // 1..segments: Table perimeter
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const [x, z] = getRadialPoint(angle, halfL * tableRatio, halfW * tableRatio);
    vertices.push(x, crownHeight, z);
  }

  // Girdle top
  const girdleTopOffset = vertices.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const [x, z] = getRadialPoint(angle, halfL, halfW);
    vertices.push(x, 0, z);
  }

  // Girdle bottom
  const girdleBottomOffset = vertices.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const [x, z] = getRadialPoint(angle, halfL * 0.99, halfW * 0.99);
    vertices.push(x, -girdleThickness, z);
  }

  // Culet
  const culetIndex = vertices.length / 3;
  vertices.push(0, -girdleThickness - pavilionHeight, 0);

  // Build faces
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, i + 1, next + 1);
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const t1 = i + 1;
    const t2 = next + 1;
    const g1 = girdleTopOffset + i;
    const g2 = girdleTopOffset + next;
    indices.push(t1, g1, t2);
    indices.push(t2, g1, g2);
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const gt1 = girdleTopOffset + i;
    const gt2 = girdleTopOffset + next;
    const gb1 = girdleBottomOffset + i;
    const gb2 = girdleBottomOffset + next;
    indices.push(gt1, gb1, gt2);
    indices.push(gt2, gb1, gb2);
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const gb1 = girdleBottomOffset + i;
    const gb2 = girdleBottomOffset + next;
    indices.push(gb1, culetIndex, gb2);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// ---------------------------------------------------------------------------
// 2. PROCEDURAL SHANK & RING BAND GEOMETRY
// ---------------------------------------------------------------------------
export function createShankGeometry(blueprint: JewelryBlueprint): THREE.BufferGeometry {
  const {
    category,
    innerDiameter,
    bandProfile,
    bandWidth,
    bandThickness,
    cathedralArchHeight,
    splitShankGap,
    signetPlateauWidth,
    signetPlateauLength,
    pendantBailDiameter,
  } = blueprint;

  if (category === "pendant") {
    const bailRadius = pendantBailDiameter / 2;
    const tubeRadius = Math.min(bandThickness, bandWidth) / 2;
    return new THREE.TorusGeometry(bailRadius, tubeRadius, 24, 48);
  }

  if (category === "signet-ring") {
    const rIn = innerDiameter / 2;
    const radialSegs = 64;
    const crossSegs = 16;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= radialSegs; i++) {
      const u = i / radialSegs;
      const theta = u * Math.PI * 2;
      const topFactor = Math.max(0, Math.sin(theta));
      const effectiveThickness = bandThickness + topFactor * 2.5;
      const effectiveWidth = bandWidth + topFactor * (signetPlateauLength - bandWidth);

      const rOut = rIn + effectiveThickness;
      const ringCenterX = Math.cos(theta) * ((rIn + rOut) / 2);
      const ringCenterY = Math.sin(theta) * ((rIn + rOut) / 2);

      for (let j = 0; j <= crossSegs; j++) {
        const v = j / crossSegs;
        const crossAngle = v * Math.PI * 2;
        const rx = (effectiveThickness / 2) * Math.cos(crossAngle);
        const rz = (effectiveWidth / 2) * Math.sin(crossAngle);

        const posX = ringCenterX + rx * Math.cos(theta);
        const posY = ringCenterY + rx * Math.sin(theta);
        const posZ = rz;

        vertices.push(posX, posY, posZ);
      }
    }

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

  const rIn = innerDiameter / 2;
  const radialSegs = 80;
  const profilePoints: [number, number][] = [];
  const halfW = bandWidth / 2;
  const halfT = bandThickness / 2;

  if (bandProfile === "court-comfort") {
    for (let k = 0; k < 16; k++) {
      const phi = (k / 16) * Math.PI * 2;
      profilePoints.push([halfT * Math.cos(phi), halfW * Math.sin(phi)]);
    }
  } else if (bandProfile === "knife-edge") {
    profilePoints.push([halfT, 0]);
    profilePoints.push([0, halfW]);
    profilePoints.push([-halfT, halfW * 0.7]);
    profilePoints.push([-halfT, -halfW * 0.7]);
    profilePoints.push([0, -halfW]);
  } else if (bandProfile === "split-shank") {
    for (let k = 0; k < 16; k++) {
      const phi = (k / 16) * Math.PI * 2;
      profilePoints.push([halfT * Math.cos(phi), halfW * Math.sin(phi)]);
    }
  } else if (bandProfile === "twisted-rope") {
    for (let k = 0; k < 12; k++) {
      const phi = (k / 12) * Math.PI * 2;
      profilePoints.push([(halfT * 0.8) * Math.cos(phi), (halfW * 0.8) * Math.sin(phi)]);
    }
  } else {
    profilePoints.push([halfT, halfW]);
    profilePoints.push([-halfT, halfW]);
    profilePoints.push([-halfT, -halfW]);
    profilePoints.push([halfT, -halfW]);
  }

  const crossSegs = profilePoints.length;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegs; i++) {
    const u = i / radialSegs;
    const theta = u * Math.PI * 2;

    let archOffset = 0;
    let splitOffsetZ = 0;
    const topCloseness = Math.max(0, Math.cos((theta - Math.PI / 2) * 2));
    const inTopQuadrant = Math.sin(theta) > 0.4;

    if (inTopQuadrant && bandProfile === "cathedral") {
      archOffset = Math.sin(((theta - Math.PI * 0.3) / 0.4) * Math.PI) * cathedralArchHeight;
      if (isNaN(archOffset) || archOffset < 0) archOffset = 0;
    }

    if (inTopQuadrant && bandProfile === "split-shank") {
      splitOffsetZ = topCloseness * (splitShankGap / 2);
    }

    const currentRadius = rIn + halfT + archOffset;
    const cx = Math.cos(theta) * currentRadius;
    const cy = Math.sin(theta) * currentRadius;
    const twistAngle = bandProfile === "twisted-rope" ? theta * 8 : 0;

    for (let j = 0; j < crossSegs; j++) {
      const [rawDr, rawDz] = profilePoints[j];
      const dr = rawDr * Math.cos(twistAngle) - rawDz * Math.sin(twistAngle);
      const dz = rawDr * Math.sin(twistAngle) + rawDz * Math.cos(twistAngle);

      const posX = cx + dr * Math.cos(theta);
      const posY = cy + dr * Math.sin(theta);
      const posZ = dz + (j < crossSegs / 2 ? splitOffsetZ : -splitOffsetZ);

      vertices.push(posX, posY, posZ);
    }
  }

  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < crossSegs; j++) {
      const nextJ = (j + 1) % crossSegs;
      const a = i * crossSegs + j;
      const b = (i + 1) * crossSegs + j;
      const c = (i + 1) * crossSegs + nextJ;
      const d = i * crossSegs + nextJ;
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
// 3. MASTER PROCEDURAL JEWELRY 3D GRAPH BUILDER
// ---------------------------------------------------------------------------
export function buildProceduralJewelryGroup(
  blueprint: JewelryBlueprint,
  options: {
    waxCastMode?: boolean;
    wireframe?: boolean;
    clippingPlane?: THREE.Plane | null;
  }
) {
  const { waxCastMode = false, wireframe = false, clippingPlane = null } = options;

  const rootGroup = new THREE.Group();
  rootGroup.name = "jewelcad-root";

  const partGroups: Record<SelectablePart, THREE.Group> = {
    "none": rootGroup,
    "shank": new THREE.Group(),
    "head-assembly": new THREE.Group(),
    "center-stone": new THREE.Group(),
    "halo": new THREE.Group(),
    "side-stones": new THREE.Group(),
  };

  partGroups["shank"].name = "shank";
  partGroups["head-assembly"].name = "head-assembly";
  partGroups["center-stone"].name = "center-stone";
  partGroups["halo"].name = "halo";
  partGroups["side-stones"].name = "side-stones";

  rootGroup.add(partGroups["shank"]);
  rootGroup.add(partGroups["head-assembly"]);
  rootGroup.add(partGroups["center-stone"]);
  rootGroup.add(partGroups["halo"]);
  rootGroup.add(partGroups["side-stones"]);

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

  const gemSpec = GEMSTONE_SPECS[blueprint.gemstoneType] || GEMSTONE_SPECS["diamond"];
  const gemColor = blueprint.gemColorHex || gemSpec.defaultHex;

  const gemMaterial = waxCastMode
    ? new THREE.MeshBasicMaterial({ visible: false })
    : new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(gemColor),
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.95,
        ior: gemSpec.refractiveIndex,
        thickness: 3.5,
        attenuationColor: new THREE.Color(gemColor),
        attenuationDistance: 5.0,
        envMapIntensity: 2.8,
        flatShading: true,
        side: THREE.DoubleSide,
        wireframe,
        clippingPlanes: clippingPlane ? [clippingPlane] : [],
      });

  const baseY = blueprint.category === "pendant" ? 0 : blueprint.innerDiameter / 2 + blueprint.bandThickness;
  const girdleY = baseY + blueprint.headElevation;

  // 1. Shank Mesh
  const shankGeom = createShankGeometry(blueprint);
  const shankMesh = new THREE.Mesh(shankGeom, metalMaterial);
  shankMesh.name = "shank-mesh";
  shankMesh.userData = { isMetal: true, part: "shank" };
  shankMesh.castShadow = true;
  shankMesh.receiveShadow = true;
  partGroups["shank"].add(shankMesh);

  // Shank Pavé Melee Stones
  if (!waxCastMode && blueprint.category !== "pendant" && blueprint.paveCountPerSide > 0) {
    const rCenter = blueprint.innerDiameter / 2 + blueprint.bandThickness;
    const startAngle = Math.PI * 0.42;
    const stepAngle = (blueprint.paveStoneDiameter * 1.15) / rCenter;
    const paveGeom = createFacetedGemstoneGeometry(
      "round",
      blueprint.paveStoneDiameter,
      blueprint.paveStoneDiameter,
      blueprint.paveStoneDiameter * 0.6
    );

    for (let i = 0; i < blueprint.paveCountPerSide; i++) {
      const angleR = startAngle - i * stepAngle;
      const angleL = Math.PI - angleR;

      const pMeshR = new THREE.Mesh(paveGeom, gemMaterial);
      pMeshR.position.set(Math.cos(angleR) * rCenter, Math.sin(angleR) * rCenter, 0);
      pMeshR.rotation.set(0, 0, angleR - Math.PI / 2);
      pMeshR.userData = { isGem: true, part: "shank" };
      pMeshR.castShadow = true;
      partGroups["shank"].add(pMeshR);

      const pMeshL = new THREE.Mesh(paveGeom, gemMaterial);
      pMeshL.position.set(Math.cos(angleL) * rCenter, Math.sin(angleL) * rCenter, 0);
      pMeshL.rotation.set(0, 0, angleL - Math.PI / 2);
      pMeshL.userData = { isGem: true, part: "shank" };
      pMeshL.castShadow = true;
      partGroups["shank"].add(pMeshL);
    }
  }

  // 2. Head & Basket Assembly
  if (blueprint.bezelEnabled) {
    // Bezel collar
    const halfL = blueprint.gemLength / 2;
    const halfW = blueprint.gemWidth / 2;
    const wall = blueprint.bezelWallThickness;
    const segs = 32;
    const verts: number[] = [];
    const idxs: number[] = [];
    const yBot = baseY;
    const yTop = girdleY + 0.5;

    for (let i = 0; i <= segs; i++) {
      const angle = (i / segs) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      verts.push(cos * halfL, yBot, sin * halfW);
      verts.push(cos * (halfL + wall), yBot, sin * (halfW + wall));
      verts.push(cos * halfL, yTop, sin * halfW);
      verts.push(cos * (halfL + wall * 0.75), yTop, sin * (halfW + wall * 0.75));
    }

    for (let i = 0; i < segs; i++) {
      const b = i * 4;
      const nb = (i + 1) * 4;
      idxs.push(b + 1, nb + 1, b + 3);
      idxs.push(nb + 1, nb + 3, b + 3);
      idxs.push(b + 2, b + 3, nb + 2);
      idxs.push(nb + 2, b + 3, nb + 3);
      idxs.push(b + 0, b + 2, nb + 0);
      idxs.push(nb + 0, b + 2, nb + 2);
    }

    const bezelGeom = new THREE.BufferGeometry();
    bezelGeom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    bezelGeom.setIndex(idxs);
    bezelGeom.computeVertexNormals();

    const bezelMesh = new THREE.Mesh(bezelGeom, metalMaterial);
    bezelMesh.userData = { isMetal: true, part: "head-assembly" };
    bezelMesh.castShadow = true;
    partGroups["head-assembly"].add(bezelMesh);
  } else if (blueprint.prongCount > 0) {
    // Prongs
    const prongRadius = blueprint.prongThickness / 2;
    const halfL = (blueprint.gemLength / 2) * blueprint.prongSpread;
    const halfW = (blueprint.gemWidth / 2) * blueprint.prongSpread;

    for (let i = 0; i < blueprint.prongCount; i++) {
      const angle = (i / blueprint.prongCount) * Math.PI * 2 + Math.PI / blueprint.prongCount;
      const targetX = Math.cos(angle) * halfL;
      const targetZ = Math.sin(angle) * halfW;
      const startX = targetX * 0.55;
      const startZ = targetZ * 0.55;

      const pStart = new THREE.Vector3(startX, baseY, startZ);
      const pGirdle = new THREE.Vector3(targetX, girdleY, targetZ);

      let tipInward = 0.45;
      if (blueprint.prongTipStyle === "claw") tipInward = 0.65;
      else if (blueprint.prongTipStyle === "tab") tipInward = 0.35;

      const pTip = new THREE.Vector3(
        targetX * (1 - tipInward * 0.3),
        girdleY + blueprint.prongThickness * 0.85,
        targetZ * (1 - tipInward * 0.3)
      );

      const curve = new THREE.CatmullRomCurve3([pStart, pGirdle, pTip]);
      const tubeGeom = new THREE.TubeGeometry(curve, 16, prongRadius, 10, false);
      const pMesh = new THREE.Mesh(tubeGeom, metalMaterial);
      pMesh.userData = { isMetal: true, part: "head-assembly" };
      pMesh.castShadow = true;
      partGroups["head-assembly"].add(pMesh);
    }

    // Gallery rails
    if (blueprint.galleryRailEnabled) {
      const railRadius = (blueprint.prongThickness * 0.75) / 2;
      const midY = baseY + blueprint.headElevation * 0.48;
      const midScaleL = (blueprint.gemLength / 2) * blueprint.prongSpread * 0.78;
      const midScaleW = (blueprint.gemWidth / 2) * blueprint.prongSpread * 0.78;

      const midCurve = new THREE.EllipseCurve(0, 0, midScaleL, midScaleW, 0, 2 * Math.PI, false, 0);
      const midPoints = midCurve.getPoints(32).map((p) => new THREE.Vector3(p.x, midY, p.y));
      const midPath = new THREE.CatmullRomCurve3(midPoints, true);
      const midGeom = new THREE.TubeGeometry(midPath, 32, railRadius, 8, true);
      const midMesh = new THREE.Mesh(midGeom, metalMaterial);
      midMesh.userData = { isMetal: true, part: "head-assembly" };
      midMesh.castShadow = true;
      partGroups["head-assembly"].add(midMesh);

      // Base collet
      const baseScaleL = (blueprint.gemLength / 2) * blueprint.prongSpread * 0.52;
      const baseScaleW = (blueprint.gemWidth / 2) * blueprint.prongSpread * 0.52;
      const baseCurve = new THREE.EllipseCurve(0, 0, baseScaleL, baseScaleW, 0, 2 * Math.PI, false, 0);
      const basePoints = baseCurve.getPoints(32).map((p) => new THREE.Vector3(p.x, baseY + 0.3, p.y));
      const basePath = new THREE.CatmullRomCurve3(basePoints, true);
      const baseGeom = new THREE.TubeGeometry(basePath, 32, railRadius, 8, true);
      const baseMesh = new THREE.Mesh(baseGeom, metalMaterial);
      baseMesh.userData = { isMetal: true, part: "head-assembly" };
      baseMesh.castShadow = true;
      partGroups["head-assembly"].add(baseMesh);
    }
  }

  // 3. Center Gemstone
  if (!waxCastMode) {
    const centerGeom = createFacetedGemstoneGeometry(
      blueprint.gemCut,
      blueprint.gemLength,
      blueprint.gemWidth,
      blueprint.gemDepth
    );
    const centerMesh = new THREE.Mesh(centerGeom, gemMaterial);
    centerMesh.name = "center-stone-mesh";
    centerMesh.position.set(0, girdleY, 0);
    centerMesh.userData = { isGem: true, part: "center-stone" };
    centerMesh.castShadow = true;
    partGroups["center-stone"].add(centerMesh);
  }

  // 4. Halo Assembly
  if (blueprint.haloEnabled) {
    const halfL = blueprint.gemLength / 2 + blueprint.haloGapFromCenter + blueprint.haloStoneDiameter / 2;
    const halfW = blueprint.gemWidth / 2 + blueprint.haloGapFromCenter + blueprint.haloStoneDiameter / 2;

    const rimGeom = new THREE.TorusGeometry(
      (halfL + halfW) / 2,
      blueprint.haloStoneDiameter * 0.55,
      12,
      36
    );
    const rimMesh = new THREE.Mesh(rimGeom, metalMaterial);
    rimMesh.position.set(0, girdleY - blueprint.haloStoneDiameter * 0.45, 0);
    rimMesh.rotation.set(Math.PI / 2, 0, 0);
    rimMesh.userData = { isMetal: true, part: "halo" };
    rimMesh.castShadow = true;
    partGroups["halo"].add(rimMesh);

    if (!waxCastMode) {
      const perimeter = Math.PI * (halfL + halfW);
      const count = Math.max(10, Math.floor(perimeter / (blueprint.haloStoneDiameter * 1.15)));
      const haloStoneGeom = createFacetedGemstoneGeometry(
        "round",
        blueprint.haloStoneDiameter,
        blueprint.haloStoneDiameter,
        blueprint.haloStoneDiameter * 0.62
      );

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * halfL;
        const z = Math.sin(angle) * halfW;

        const hMesh = new THREE.Mesh(haloStoneGeom, gemMaterial);
        hMesh.position.set(x, girdleY - 0.1, z);
        hMesh.rotation.set(0, -angle, 0);
        hMesh.userData = { isGem: true, part: "halo" };
        hMesh.castShadow = true;
        partGroups["halo"].add(hMesh);
      }
    }
  }

  // 5. Three-Stone Flanking Assembly
  if (blueprint.threeStoneEnabled) {
    const flankDepth = blueprint.flankGemSize * 0.62;
    const distanceX = blueprint.gemLength / 2 + blueprint.flankGemSize / 2 + 0.35;
    const tiltRad = (blueprint.flankTiltAngleDeg * Math.PI) / 180;
    const dropY = Math.sin(tiltRad) * (blueprint.flankGemSize * 0.35);

    const flankGeom = createFacetedGemstoneGeometry(
      "round",
      blueprint.flankGemSize,
      blueprint.flankGemSize,
      flankDepth
    );

    const basketGeom = new THREE.CylinderGeometry(
      blueprint.flankGemSize * 0.48,
      blueprint.flankGemSize * 0.28,
      flankDepth * 0.9,
      12,
      1,
      true
    );

    // Left flank
    const leftGroup = new THREE.Group();
    leftGroup.position.set(-distanceX, girdleY - dropY, 0);
    leftGroup.rotation.set(0, 0, tiltRad);

    const bLeft = new THREE.Mesh(basketGeom, metalMaterial);
    bLeft.position.set(0, -flankDepth * 0.5, 0);
    bLeft.userData = { isMetal: true, part: "side-stones" };
    leftGroup.add(bLeft);

    if (!waxCastMode) {
      const gLeft = new THREE.Mesh(flankGeom, gemMaterial);
      gLeft.userData = { isGem: true, part: "side-stones" };
      gLeft.castShadow = true;
      leftGroup.add(gLeft);
    }
    partGroups["side-stones"].add(leftGroup);

    // Right flank
    const rightGroup = new THREE.Group();
    rightGroup.position.set(distanceX, girdleY - dropY, 0);
    rightGroup.rotation.set(0, 0, -tiltRad);

    const bRight = new THREE.Mesh(basketGeom, metalMaterial);
    bRight.position.set(0, -flankDepth * 0.5, 0);
    bRight.userData = { isMetal: true, part: "side-stones" };
    rightGroup.add(bRight);

    if (!waxCastMode) {
      const gRight = new THREE.Mesh(flankGeom, gemMaterial);
      gRight.userData = { isGem: true, part: "side-stones" };
      gRight.castShadow = true;
      rightGroup.add(gRight);
    }
    partGroups["side-stones"].add(rightGroup);
  }

  // Apply part transforms
  if (blueprint.partTransforms) {
    for (const [key, tr] of Object.entries(blueprint.partTransforms) as [SelectablePart, TransformOffset][]) {
      const grp = partGroups[key];
      if (grp && tr) {
        grp.position.set(tr.position[0], tr.position[1], tr.position[2]);
        grp.rotation.set(tr.rotation[0], tr.rotation[1], tr.rotation[2]);
        grp.scale.set(tr.scale[0], tr.scale[1], tr.scale[2]);
      }
    }
  }

  return { rootGroup, partGroups };
}
