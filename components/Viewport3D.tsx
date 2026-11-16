"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import {
  JewelryBlueprint,
  SelectablePart,
  TransformOffset,
  ALLOY_DENSITIES,
} from "@/types/cad";
import { MetalMetricsResult } from "@/lib/cadMath";
import { buildProceduralJewelryGroup } from "./ProceduralJewelryMesh";
import {
  Rotate3d,
  Move,
  Maximize2,
  Eye,
  Camera,
  Layers,
  Flame,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Maximize,
  Compass,
} from "lucide-react";

interface Viewport3DProps {
  blueprint: JewelryBlueprint;
  metrics: MetalMetricsResult;
  selectedPart: SelectablePart;
  onSelectPart: (part: SelectablePart) => void;
  onPartTransformChange: (part: SelectablePart, transform: TransformOffset) => void;
  rootGroupRef?: React.MutableRefObject<THREE.Group | null>;
}

export default function Viewport3D({
  blueprint,
  metrics,
  selectedPart,
  onSelectPart,
  onPartTransformChange,
  rootGroupRef,
}: Viewport3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport mode states
  const [cameraView, setCameraView] = useState<"perspective" | "top" | "front" | "side">("perspective");
  const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [wireframe, setWireframe] = useState(false);
  const [waxCastMode, setWaxCastMode] = useState(false);
  const [isTurntable, setIsTurntable] = useState(false);
  const [clippingActive, setClippingActive] = useState(false);
  const [clippingOffset, setClippingOffset] = useState(0);

  // Three.js Core Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const currentJewelryGroupRef = useRef<THREE.Group | null>(null);
  const partGroupsRef = useRef<Record<SelectablePart, THREE.Group> | null>(null);

  // Clipping Plane ref
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));

  // Initialize Three.js Engine
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 14, 38);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.06;
    orbit.target.set(0, 8, 0);
    orbit.minDistance = 8;
    orbit.maxDistance = 120;
    orbit.maxPolarAngle = Math.PI - 0.05;
    orbitControlsRef.current = orbit;

    // 5. TransformControls Gizmo
    const transform = new TransformControls(camera, renderer.domElement);
    transform.size = 0.65;
    transform.setMode(transformMode);
    scene.add(transform.getHelper());
    transformControlsRef.current = transform;

    transform.addEventListener("dragging-changed", (event) => {
      orbit.enabled = !event.value;
    });

    transform.addEventListener("objectChange", () => {
      const obj = transform.object;
      if (!obj || !obj.name) return;
      const partKey = obj.name as SelectablePart;
      const newTr: TransformOffset = {
        position: [obj.position.x, obj.position.y, obj.position.z],
        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        scale: [obj.scale.x, obj.scale.y, obj.scale.z],
      };
      onPartTransformChange(partKey, newTr);
    });

    // 6. Professional Jewelry Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    keyLight.position.set(16, 28, 22);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 1.4);
    fillLight.position.set(-22, 16, -18);
    scene.add(fillLight);

    // Sparkle High-Angle Light
    const sparkleLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sparkleLight.position.set(0, 36, 0);
    scene.add(sparkleLight);

    // Soft Rim Light
    const rimLight = new THREE.PointLight(0xcfd8dc, 0.8, 80);
    rimLight.position.set(0, -12, 16);
    scene.add(rimLight);

    // Ground Shadow Plane
    const groundGeom = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -12;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle CAD Grid
    const grid = new THREE.GridHelper(60, 60, 0x334155, 0x1e293b);
    grid.position.y = -12.01;
    scene.add(grid);

    // 7. Raycast Click Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      if (transform.dragging) return;
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      if (!currentJewelryGroupRef.current) return;

      const intersects = raycaster.intersectObjects(currentJewelryGroupRef.current.children, true);
      if (intersects.length > 0) {
        // Find which part was hit
        let hitObj: THREE.Object3D | null = intersects[0].object;
        let partFound: SelectablePart = "none";

        while (hitObj && hitObj !== currentJewelryGroupRef.current) {
          if (hitObj.userData?.part) {
            partFound = hitObj.userData.part;
            break;
          }
          if (["shank", "head-assembly", "center-stone", "halo", "side-stones"].includes(hitObj.name)) {
            partFound = hitObj.name as SelectablePart;
            break;
          }
          hitObj = hitObj.parent;
        }

        if (partFound !== "none") {
          onSelectPart(partFound);
          return;
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("pointerdown", handlePointerDown);

    // 8. Render Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
      transform.dispose();
      orbit.dispose();
      renderer.dispose();
    };
  }, []);

  // Update Procedural Geometry when Blueprint or Rendering Options change
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old jewelry group
    if (currentJewelryGroupRef.current) {
      if (transformControlsRef.current) {
        transformControlsRef.current.detach();
      }
      scene.remove(currentJewelryGroupRef.current);
      currentJewelryGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }

    // Build fresh procedural group
    const { rootGroup, partGroups } = buildProceduralJewelryGroup(blueprint, {
      waxCastMode,
      wireframe,
      clippingPlane: clippingActive ? clippingPlaneRef.current : null,
    });

    scene.add(rootGroup);
    currentJewelryGroupRef.current = rootGroup;
    partGroupsRef.current = partGroups;

    if (rootGroupRef) {
      rootGroupRef.current = rootGroup;
    }

    // Attach transform controls if part is selected
    if (selectedPart !== "none" && partGroups[selectedPart] && transformControlsRef.current) {
      transformControlsRef.current.attach(partGroups[selectedPart]);
    }
  }, [blueprint, waxCastMode, wireframe, clippingActive]);

  // Update Transform Controls Mode
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  // Update Active Selected Part
  useEffect(() => {
    if (!transformControlsRef.current) return;
    if (selectedPart === "none" || !partGroupsRef.current?.[selectedPart]) {
      transformControlsRef.current.detach();
    } else {
      transformControlsRef.current.attach(partGroupsRef.current[selectedPart]);
    }
  }, [selectedPart]);

  // Update Clipping Plane Offset
  useEffect(() => {
    clippingPlaneRef.current.constant = clippingOffset;
  }, [clippingOffset]);

  // Turntable Auto-Rotation
  useEffect(() => {
    if (!orbitControlsRef.current) return;
    orbitControlsRef.current.autoRotate = isTurntable;
    orbitControlsRef.current.autoRotateSpeed = 2.2;
  }, [isTurntable]);

  // Camera Presets Switcher
  const handleCameraChange = (view: "perspective" | "top" | "front" | "side") => {
    setCameraView(view);
    if (!cameraRef.current || !orbitControlsRef.current) return;

    const camera = cameraRef.current;
    const orbit = orbitControlsRef.current;

    if (view === "perspective") {
      camera.position.set(0, 14, 38);
      orbit.target.set(0, 8, 0);
    } else if (view === "top") {
      camera.position.set(0, 48, 0.001);
      orbit.target.set(0, 0, 0);
    } else if (view === "front") {
      camera.position.set(0, 8, 48);
      orbit.target.set(0, 8, 0);
    } else if (view === "side") {
      camera.position.set(48, 8, 0);
      orbit.target.set(0, 8, 0);
    }
    orbit.update();
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "g") setTransformMode("translate");
      else if (key === "r") setTransformMode("rotate");
      else if (key === "s") setTransformMode("scale");
      else if (key === "escape") onSelectPart("none");
      else if (key === "w") setWireframe((prev) => !prev);
      else if (key === "c") setClippingActive((prev) => !prev);
      else if (key === " ") {
        e.preventDefault();
        setIsTurntable((prev) => !prev);
      } else if (key === "1") handleCameraChange("perspective");
      else if (key === "2") handleCameraChange("top");
      else if (key === "3") handleCameraChange("front");
      else if (key === "4") handleCameraChange("side");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectPart]);

  const alloy = ALLOY_DENSITIES[blueprint.metalAlloy] || ALLOY_DENSITIES["18k-white"];

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full bg-studio-950 overflow-hidden flex flex-col select-none"
    >
      {/* ------------------------------------------------------------- */}
      {/* TOP LIVE TELEMETRY & DRC STATUS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="h-14 px-4 bg-studio-900/90 backdrop-blur-md border-b border-studio-700/60 flex items-center justify-between text-xs z-20">
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Target:</span>
            <span
              className={`px-2 py-0.5 rounded font-mono font-medium text-[11px] uppercase tracking-wide border ${
                selectedPart !== "none"
                  ? "bg-sky-500/15 text-sky-300 border-sky-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {selectedPart === "none" ? "Full Assembly" : selectedPart.replace("-", " ")}
            </span>
          </div>

          <div className="h-4 w-px bg-studio-700" />

          <div className="flex items-center space-x-4 font-mono">
            <div>
              <span className="text-slate-400">US Size: </span>
              <span className="text-white font-semibold">{blueprint.ringSizeUS}</span>
            </div>
            <div>
              <span className="text-slate-400">Ø ID: </span>
              <span className="text-white font-semibold">{blueprint.innerDiameter.toFixed(1)} mm</span>
            </div>
            <div>
              <span className="text-slate-400">Width: </span>
              <span className="text-white font-semibold">{blueprint.bandWidth.toFixed(1)} mm</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 font-mono">
          <div className="hidden sm:flex items-center space-x-2 bg-studio-850 px-2.5 py-1 rounded border border-studio-700/60">
            <span className="text-slate-400 text-[11px]">Metal Vol:</span>
            <span className="text-gold-400 font-bold">{metrics.volumeMM3} mm³</span>
          </div>

          <div className="flex items-center space-x-2 bg-studio-850 px-2.5 py-1 rounded border border-studio-700/60">
            <span className="text-slate-400 text-[11px]">Est. Weight:</span>
            <span className="text-amber-300 font-bold">
              {metrics.weightGrams}g <span className="text-[10px] text-slate-400">({alloy.label.split(" ")[0]})</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-studio-850 px-2.5 py-1 rounded border border-studio-700/60">
            <span className="text-slate-400 text-[11px]">Diamonds:</span>
            <span className="text-cyan-300 font-bold">{metrics.totalCarats} ct</span>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded font-semibold text-[11px] border tracking-wider uppercase transition-all ${
              metrics.drcPass
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : "bg-rose-500/15 text-rose-300 border-rose-500/40"
            }`}
            title={
              metrics.drcPass
                ? "Lost-Wax Lost Investment DRC Check Passed: Wall thickness >= 1.2mm, spruing certified."
                : metrics.drcErrors.join("; ")
            }
          >
            {metrics.drcPass ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>DRC Cast-Ready</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>DRC Warning ({metrics.drcErrors.length})</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DIRECT 3D CANVAS VIEWPORT */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 w-full h-full relative cad-grid-bg cursor-grab active:cursor-grabbing">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* ----------------------------------------------------------- */}
        {/* VIEWPORT OVERLAY CONTROLS (Top Left Shortcuts) */}
        {/* ----------------------------------------------------------- */}
        <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2 pointer-events-auto">
          {/* Camera View Presets */}
          <div className="bg-studio-900/80 backdrop-blur-md p-1 rounded-lg border border-studio-700/60 flex items-center space-x-1 shadow-lg">
            {(["perspective", "top", "front", "side"] as const).map((view) => (
              <button
                key={view}
                onClick={() => handleCameraChange(view)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded capitalize transition-all ${
                  cameraView === view
                    ? "bg-gold-500 text-studio-950 font-bold shadow"
                    : "text-slate-300 hover:text-white hover:bg-studio-800"
                }`}
                title={`Switch to ${view} camera [${view === "perspective" ? "1" : view === "top" ? "2" : view === "front" ? "3" : "4"}]`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* 3D Gizmo Mode Selector (G, R, S) */}
          {selectedPart !== "none" && (
            <div className="bg-studio-900/80 backdrop-blur-md p-1 rounded-lg border border-studio-700/60 flex items-center space-x-1 shadow-lg">
              <span className="text-[10px] font-mono text-slate-400 px-2 uppercase">Gizmo:</span>
              <button
                onClick={() => setTransformMode("translate")}
                className={`p-1.5 rounded transition-all ${
                  transformMode === "translate"
                    ? "bg-sky-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-studio-800"
                }`}
                title="Translate / Move [G]"
              >
                <Move className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTransformMode("rotate")}
                className={`p-1.5 rounded transition-all ${
                  transformMode === "rotate"
                    ? "bg-sky-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-studio-800"
                }`}
                title="Rotate [R]"
              >
                <Rotate3d className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTransformMode("scale")}
                className={`p-1.5 rounded transition-all ${
                  transformMode === "scale"
                    ? "bg-sky-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-studio-800"
                }`}
                title="Scale [S]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* FLOATING CAD BOTTOM DOCK (Modes, Shaders, Slicing) */}
        {/* ----------------------------------------------------------- */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
          <div className="bg-studio-900/90 backdrop-blur-lg px-4 py-2 rounded-xl border border-studio-700/80 shadow-2xl flex items-center space-x-4 text-xs font-mono">
            {/* Wireframe Toggle */}
            <button
              onClick={() => setWireframe((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
                wireframe
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white hover:bg-studio-800"
              }`}
              title="Toggle Wireframe Inspection [W]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Wireframe</span>
            </button>

            {/* Wax-Cast Preview Toggle */}
            <button
              onClick={() => setWaxCastMode((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
                waxCastMode
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-studio-800"
              }`}
              title="Wax-Cast Lost Wax Metal-Only Mode (Hides Stones)"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Wax-Cast Metal</span>
            </button>

            {/* 360 Turntable Toggle */}
            <button
              onClick={() => setIsTurntable((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
                isTurntable
                  ? "bg-gold-500/20 text-gold-300 border border-gold-500/40"
                  : "text-slate-400 hover:text-white hover:bg-studio-800"
              }`}
              title="360° Studio Turntable [Space]"
            >
              <Rotate3d className="w-3.5 h-3.5" />
              <span>Turntable</span>
            </button>

            <div className="h-4 w-px bg-studio-700" />

            {/* Cross-Section Clipping Plane */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setClippingActive((prev) => !prev)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-all ${
                  clippingActive
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "text-slate-400 hover:text-white hover:bg-studio-800"
                }`}
                title="Cross-Section Clipping Plane [C]"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Clip X-Ray</span>
              </button>

              {clippingActive && (
                <div className="flex items-center space-x-2 w-32">
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="0.5"
                    value={clippingOffset}
                    onChange={(e) => setClippingOffset(parseFloat(e.target.value))}
                    className="h-1.5 accent-rose-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-300">{clippingOffset.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Keyboard shortcut legend hint */}
        <div className="absolute bottom-5 right-4 z-10 hidden md:block">
          <div className="bg-studio-900/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-studio-800 text-[10px] text-slate-400 font-mono space-y-0.5">
            <div><span className="text-slate-300 font-bold">G</span> Move | <span className="text-slate-300 font-bold">R</span> Rotate | <span className="text-slate-300 font-bold">S</span> Scale</div>
            <div><span className="text-slate-300 font-bold">1..4</span> Views | <span className="text-slate-300 font-bold">W</span> Wire | <span className="text-slate-300 font-bold">Space</span> Spin</div>
          </div>
        </div>
      </div>
    </div>
  );
}
