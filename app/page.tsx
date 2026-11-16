"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import {
  JewelryBlueprint,
  SelectablePart,
  TransformOffset,
  DEFAULT_BLUEPRINT,
  INDUSTRY_PRESETS,
  ALLOY_DENSITIES,
  GEMSTONE_SPECS,
  usSizeToDiameterMM,
  diameterMMToUSSize,
  BandProfile,
  GemCut,
  JewelryCategory,
  MetalAlloy,
  GemstoneType,
} from "@/types/cad";
import {
  calculateSceneMetalMetrics,
  exportJewelrySTL,
  exportJewelryOBJ,
  exportJewelryJSON,
  MetalMetricsResult,
} from "@/lib/cadMath";
import dynamic from "next/dynamic";

const Viewport3D = dynamic(() => import("@/components/Viewport3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full w-full bg-studio-950 flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs text-slate-400">Initializing WebGL 3D CAD Studio...</span>
    </div>
  ),
});
import {
  Sparkles,
  Download,
  Upload,
  Settings2,
  Undo2,
  Redo2,
  RotateCcw,
  Sliders,
  Gem,
  ShieldCheck,
  Disc,
  FolderDown,
  Layers,
  ChevronDown,
  ChevronRight,
  KeyRound,
  FileCode,
  Image as ImageIcon,
  Check,
  AlertCircle,
  HelpCircle,
  Eye,
  Wand2,
} from "lucide-react";

export default function CADWorkstationPage() {
  // Master CAD Blueprint State
  const [blueprint, setBlueprint] = useState<JewelryBlueprint>(DEFAULT_BLUEPRINT);
  const [selectedPart, setSelectedPart] = useState<SelectablePart>("none");

  // Undo / Redo History Stacks
  const [history, setHistory] = useState<JewelryBlueprint[]>([]);
  const [redoStack, setRedoStack] = useState<JewelryBlueprint[]>([]);

  // 3D Scene Root Reference
  const rootGroupRef = useRef<THREE.Group | null>(null);

  // Live Metrics State
  const [metrics, setMetrics] = useState<MetalMetricsResult>(() =>
    calculateSceneMetalMetrics(null, DEFAULT_BLUEPRINT)
  );

  // AI Vision-to-CAD State
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const [aiImageMime, setAiImageMime] = useState<string>("image/jpeg");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Settings Drawer / OpenRouter API Configuration
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [openRouterKey, setOpenRouterKey] = useState<string>("");
  const [openRouterModel, setOpenRouterModel] = useState<string>("google/gemini-2.0-flash-001");

  // Right Inspector Accordion Open States
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({
    shank: true,
    head: true,
    gems: true,
    halo: true,
    materials: true,
  });

  const toggleTab = (tab: string) => {
    setExpandedTabs((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  // Load API Key & Model from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("openrouter_api_key");
      const savedModel = localStorage.getItem("openrouter_model");
      if (savedKey) setOpenRouterKey(savedKey);
      if (savedModel) setOpenRouterModel(savedModel);
    }
  }, []);

  const saveApiSettings = (key: string, model: string) => {
    setOpenRouterKey(key);
    setOpenRouterModel(model);
    if (typeof window !== "undefined") {
      localStorage.setItem("openrouter_api_key", key);
      localStorage.setItem("openrouter_model", model);
    }
    setAiSuccessMsg("API Settings saved to browser storage.");
    setTimeout(() => setAiSuccessMsg(null), 3000);
  };

  // Push new state to history for Undo/Redo
  const updateBlueprint = useCallback(
    (updater: (prev: JewelryBlueprint) => JewelryBlueprint) => {
      setBlueprint((prev) => {
        const next = updater(prev);
        setHistory((h) => [...h.slice(-30), prev]);
        setRedoStack([]);
        return next;
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [blueprint, ...r]);
    setBlueprint(previous);
  }, [history, blueprint]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((r) => r.slice(1));
    setHistory((h) => [...h, blueprint]);
    setBlueprint(next);
  }, [redoStack, blueprint]);

  // Recalculate metrics on blueprint update
  useEffect(() => {
    const calculated = calculateSceneMetalMetrics(rootGroupRef.current, blueprint);
    setMetrics(calculated);
  }, [blueprint]);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Client-Side Canvas Image Resizer (max 1024px)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setAiImagePreview(dataUrl);
          setAiImageBase64(dataUrl.split(",")[1]);
          setAiImageMime("image/jpeg");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit AI Reverse Engineering Request
  const handleGenerateFromAi = async () => {
    if (!aiImageBase64 && !customPrompt.trim()) {
      setAiError("Please upload a jewelry reference photo or enter a text prompt.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const res = await fetch("/api/img2cad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: aiImageBase64,
          mimeType: aiImageMime,
          customInstruction: customPrompt,
          runtimeApiKey: openRouterKey || undefined,
          runtimeModel: openRouterModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI generation failed");
      }

      updateBlueprint(() => data);
      setAiSuccessMsg("Parametric 3D CAD Blueprint successfully generated!");
      setTimeout(() => setAiSuccessMsg(null), 4000);
    } catch (err: any) {
      setAiError(err.message || "Failed to process image with AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Load .JSON Blueprint file
  const handleLoadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target?.result as string);
        updateBlueprint(() => ({ ...DEFAULT_BLUEPRINT, ...loaded }));
        setAiSuccessMsg("Blueprint JSON imported successfully.");
        setTimeout(() => setAiSuccessMsg(null), 3000);
      } catch (err) {
        setAiError("Invalid JSON blueprint file.");
      }
    };
    reader.readAsText(file);
  };

  // Reset Part Gizmo Transforms
  const handleResetTransforms = () => {
    updateBlueprint((prev) => ({
      ...prev,
      partTransforms: JSON.parse(JSON.stringify(DEFAULT_BLUEPRINT.partTransforms)),
    }));
  };

  return (
    <div className="flex h-screen w-screen bg-studio-950 text-slate-100 overflow-hidden font-sans">
      {/* ============================================================= */}
      {/* LEFT SIDEBAR: AI VISION & EXPORT CONTROL CENTER */}
      {/* ============================================================= */}
      <aside className="w-80 h-full bg-studio-900 border-r border-studio-700/60 flex flex-col z-20 shadow-2xl flex-shrink-0">
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-studio-700/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-studio-950 font-bold text-sm shadow-md">
              <Gem className="w-4 h-4 text-studio-950" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide">JewelCAD AI</h1>
              <p className="text-[10px] text-slate-400 font-mono">Vision-to-STL CAD Engine</p>
            </div>
          </div>

          <button
            onClick={() => setShowSettingsDrawer((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-all ${
              showSettingsDrawer
                ? "bg-gold-500/20 text-gold-400 border-gold-500/40"
                : "text-slate-400 hover:text-white border-studio-700 hover:bg-studio-800"
            }`}
            title="OpenRouter API Key & Model Settings"
          >
            <KeyRound className="w-4 h-4" />
          </button>
        </div>

        {/* API Settings Collapsible Drawer */}
        {showSettingsDrawer && (
          <div className="p-3 bg-studio-850 border-b border-studio-700 text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center space-x-1.5">
                <Settings2 className="w-3.5 h-3.5 text-gold-400" />
                <span>OpenRouter API Key</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Local Storage</span>
            </div>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-studio-950 rounded border border-studio-700 text-slate-200 placeholder-slate-600 font-mono text-[11px] focus:outline-none focus:border-gold-500"
            />
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Vision Model:</label>
              <select
                value={openRouterModel}
                onChange={(e) => setOpenRouterModel(e.target.value)}
                className="w-full px-2 py-1.5 bg-studio-950 rounded border border-studio-700 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-gold-500"
              >
                <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (Recommended: Ultra Fast, Smart & Cheap)</option>
                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Highest 3D Precision & Quality)</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini (Budget & Accurate)</option>
                <option value="google/gemini-flash-1.5">Gemini 1.5 Flash (Ultra Budget)</option>
                <option value="qwen/qwen-2.5-vl-72b-instruct">Qwen 2.5 VL 72B (Open Weights)</option>
              </select>
            </div>
            <button
              onClick={() => saveApiSettings(openRouterKey, openRouterModel)}
              className="w-full py-1 bg-gold-500 text-studio-950 font-bold rounded text-[11px] hover:bg-gold-400 transition"
            >
              Save Settings
            </button>
          </div>
        )}

        {/* Scrollable Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 1. Multimodal AI Vision-to-CAD Section */}
          <div className="space-y-3 bg-studio-850/80 p-3 rounded-xl border border-studio-700/60 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Wand2 className="w-3.5 h-3.5 text-gold-400" />
                <span>AI Vision-to-CAD</span>
              </h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-300 font-mono border border-gold-500/30">
                {openRouterModel.includes("gemini") ? "Gemini 2.0" : openRouterModel.includes("claude") ? "Claude 3.5" : openRouterModel.includes("gpt") ? "GPT-4o" : "Qwen 2.5 VL"}
              </span>
            </div>

            {/* Image Upload Area */}
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-studio-700 hover:border-gold-500/60 rounded-lg p-3 cursor-pointer transition bg-studio-900/60 group">
              {aiImagePreview ? (
                <div className="relative w-full h-32 rounded overflow-hidden">
                  <img
                    src={aiImagePreview}
                    alt="Upload Preview"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[11px] text-white font-medium">
                    Change Image
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <ImageIcon className="w-6 h-6 mx-auto text-slate-500 group-hover:text-gold-400 transition mb-1.5" />
                  <p className="text-[11px] text-slate-300 font-medium">Drop jewelry photo or click</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Auto-scaled to 1024px</p>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {/* Prompt Override / Standalone Text Prompt */}
            <div>
              <textarea
                placeholder="Optional AI instructions (e.g. 'Add 6-prong basket, use oval sapphire, 2.2mm cathedral band')..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 bg-studio-950 rounded-lg border border-studio-700 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-gold-500 transition resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleGenerateFromAi}
              disabled={isAiLoading}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-studio-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isAiLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-studio-950 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing CAD Geometry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reverse-Engineer to 3D CAD</span>
                </>
              )}
            </button>

            {aiSuccessMsg && (
              <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded text-[11px] text-emerald-300 flex items-start space-x-1.5">
                <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}

            {aiError && (
              <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded text-[11px] text-rose-300 flex items-start space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}
          </div>

          {/* 2. Instant 1-Click Industry Presets */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Industry Presets
            </h2>
            <div className="grid grid-cols-1 gap-1.5">
              {INDUSTRY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    updateBlueprint((prev) => ({
                      ...prev,
                      ...p.blueprint,
                    }))
                  }
                  className="w-full text-left p-2 rounded-lg bg-studio-850 hover:bg-studio-800 border border-studio-700/60 hover:border-gold-500/40 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200 group-hover:text-gold-300 transition">
                      {p.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      {p.category.split("-")[0]}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {p.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Export & File Management */}
          <div className="space-y-2 pt-2 border-t border-studio-800">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Export & Manufacturing
            </h2>

            {/* Lost-Wax Cast Metal STL */}
            <button
              onClick={() =>
                exportJewelrySTL(rootGroupRef.current, blueprint.designName, true)
              }
              className="w-full py-2 bg-studio-800 hover:bg-studio-750 text-white font-medium rounded-lg text-xs border border-studio-600 flex items-center justify-center space-x-2 transition shadow-sm hover:border-sky-500"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export Cast-Ready Metal .STL</span>
            </button>

            {/* Full Assembly STL */}
            <button
              onClick={() =>
                exportJewelrySTL(rootGroupRef.current, blueprint.designName, false)
              }
              className="w-full py-1.5 bg-studio-850 hover:bg-studio-800 text-slate-300 font-medium rounded-lg text-xs border border-studio-700 flex items-center justify-center space-x-2 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Full Assembly .STL</span>
            </button>

            {/* Wavefront OBJ */}
            <button
              onClick={() => exportJewelryOBJ(rootGroupRef.current, blueprint.designName)}
              className="w-full py-1.5 bg-studio-850 hover:bg-studio-800 text-slate-300 font-medium rounded-lg text-xs border border-studio-700 flex items-center justify-center space-x-2 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Wavefront .OBJ</span>
            </button>

            {/* Save/Load JSON */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => exportJewelryJSON(blueprint)}
                className="py-1.5 bg-studio-850 hover:bg-studio-800 text-slate-300 rounded-lg text-[11px] border border-studio-700 flex items-center justify-center space-x-1.5 transition"
              >
                <FolderDown className="w-3 h-3 text-gold-400" />
                <span>Save JSON</span>
              </button>

              <label className="py-1.5 bg-studio-850 hover:bg-studio-800 text-slate-300 rounded-lg text-[11px] border border-studio-700 flex items-center justify-center space-x-1.5 cursor-pointer transition text-center">
                <Upload className="w-3 h-3 text-sky-400" />
                <span>Load JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleLoadJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Undo/Redo & Reset Transforms */}
        <div className="h-12 px-4 border-t border-studio-700/60 bg-studio-900/90 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded hover:bg-studio-800 text-slate-300 hover:text-white disabled:opacity-30 transition"
              title="Undo [Ctrl+Z]"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded hover:bg-studio-800 text-slate-300 hover:text-white disabled:opacity-30 transition"
              title="Redo [Ctrl+Y]"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleResetTransforms}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-amber-400 transition"
            title="Reset All 3D Gizmo Part Offsets"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Gizmos</span>
          </button>
        </div>
      </aside>

      {/* ============================================================= */}
      {/* CENTER: 3D CAD VIEWPORT & LIVE TELEMETRY */}
      {/* ============================================================= */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden">
        <Viewport3D
          blueprint={blueprint}
          metrics={metrics}
          selectedPart={selectedPart}
          onSelectPart={setSelectedPart}
          onPartTransformChange={(part, tr) => {
            updateBlueprint((prev) => ({
              ...prev,
              partTransforms: {
                ...prev.partTransforms,
                [part]: tr,
              },
            }));
          }}
          rootGroupRef={rootGroupRef}
        />
      </main>

      {/* ============================================================= */}
      {/* RIGHT SIDEBAR: PARAMETRIC MILLIMETER INSPECTOR */}
      {/* ============================================================= */}
      <aside className="w-84 h-full bg-studio-900 border-l border-studio-700/60 flex flex-col z-20 shadow-2xl flex-shrink-0">
        {/* Inspector Header */}
        <div className="h-14 px-4 border-b border-studio-700/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-gold-400" />
            <h2 className="font-semibold text-xs text-white uppercase tracking-wider">
              Parametric Inspector
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-studio-850 border border-studio-700">
            1 unit = 1mm
          </span>
        </div>

        {/* Inspector Accordion Panels */}
        <div className="flex-1 overflow-y-auto divide-y divide-studio-800 text-xs">
          {/* TAB 1: RING SIZE & SHANK */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleTab("shank")}
              className="w-full flex items-center justify-between text-left font-semibold text-slate-200 uppercase tracking-wide hover:text-gold-400 transition"
            >
              <span>1. Ring Sizing & Shank</span>
              {expandedTabs.shank ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {expandedTabs.shank && (
              <div className="space-y-3 pt-2">
                {/* Design Name */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Design Title</label>
                  <input
                    type="text"
                    value={blueprint.designName}
                    onChange={(e) =>
                      updateBlueprint((p) => ({ ...p, designName: e.target.value }))
                    }
                    className="w-full px-2.5 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Jewelry Category</label>
                  <select
                    value={blueprint.category}
                    onChange={(e) =>
                      updateBlueprint((p) => ({
                        ...p,
                        category: e.target.value as JewelryCategory,
                      }))
                    }
                    className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500"
                  >
                    <option value="solitaire-ring">Solitaire Ring</option>
                    <option value="halo-ring">Halo Ring</option>
                    <option value="three-stone-ring">Three-Stone Trilogy</option>
                    <option value="signet-ring">Signet Ring</option>
                    <option value="bezel-ring">Bezel Ring</option>
                    <option value="plain-band">Plain Band (Solid Metal)</option>
                    <option value="pendant">Bail Pendant</option>
                  </select>
                </div>

                {/* US Ring Size & Inner Diameter */}
                {blueprint.category !== "pendant" && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">US Finger Size</span>
                        <span className="font-mono text-gold-400 font-bold">{blueprint.ringSizeUS}</span>
                      </div>
                      <input
                        type="range"
                        min="3.0"
                        max="13.5"
                        step="0.5"
                        value={blueprint.ringSizeUS}
                        onChange={(e) => {
                          const size = parseFloat(e.target.value);
                          updateBlueprint((p) => ({
                            ...p,
                            ringSizeUS: size,
                            innerDiameter: usSizeToDiameterMM(size),
                          }));
                        }}
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Size 3 (14.0mm)</span>
                        <span>Size 13.5 (22.6mm)</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Inner Diameter (mm)</span>
                        <span className="font-mono text-white">{blueprint.innerDiameter.toFixed(2)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="13.5"
                        max="23.0"
                        step="0.1"
                        value={blueprint.innerDiameter}
                        onChange={(e) => {
                          const diam = parseFloat(e.target.value);
                          updateBlueprint((p) => ({
                            ...p,
                            innerDiameter: diam,
                            ringSizeUS: diameterMMToUSSize(diam),
                          }));
                        }}
                      />
                    </div>
                  </>
                )}

                {/* PENDANT SPECIFIC CONTROLS */}
                {blueprint.category === "pendant" ? (
                  <div className="space-y-3 pt-1">
                    {/* Pendant Silhouette Shape */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Pendant Silhouette Shape</label>
                      <select
                        value={blueprint.pendantShape}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantShape: e.target.value as any,
                          }))
                        }
                        className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500 capitalize"
                      >
                        <option value="heart">Heart Shape (Bezier Curves)</option>
                        <option value="oval">Oval Medallion</option>
                        <option value="pear">Pear / Teardrop</option>
                        <option value="round">Round Disc</option>
                        <option value="octagon">Octagonal Frame</option>
                      </select>
                    </div>

                    {/* Width & Height */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Pendant Width</span>
                        <span className="font-mono text-white">{blueprint.pendantWidth.toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="12.0"
                        max="48.0"
                        step="1.0"
                        value={blueprint.pendantWidth}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantWidth: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Pendant Height</span>
                        <span className="font-mono text-white">{blueprint.pendantHeight.toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="14.0"
                        max="56.0"
                        step="1.0"
                        value={blueprint.pendantHeight}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantHeight: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Pendant Plate Thickness</span>
                        <span className="font-mono text-white">{blueprint.pendantThickness.toFixed(2)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="3.5"
                        step="0.1"
                        value={blueprint.pendantThickness}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantThickness: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>

                    {/* Bail Type & Diameter */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Bail Suspension Style</label>
                      <select
                        value={blueprint.pendantBailType}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantBailType: e.target.value as any,
                          }))
                        }
                        className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500 capitalize"
                      >
                        <option value="triangular">Triangular Tapered Bail</option>
                        <option value="tapered">Arched Bail Loop</option>
                        <option value="ring">Jump Ring Bail</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Bail Loop Diameter</span>
                        <span className="font-mono text-white">
                          {blueprint.pendantBailDiameter.toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="3.0"
                        max="10.0"
                        step="0.5"
                        value={blueprint.pendantBailDiameter}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantBailDiameter: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>

                    {/* Border Style */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Outer Border Ornament</label>
                      <select
                        value={blueprint.pendantBorderStyle}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantBorderStyle: e.target.value as any,
                          }))
                        }
                        className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500 capitalize"
                      >
                        <option value="smooth">Smooth Polished Rim</option>
                        <option value="scalloped">Scalloped Traditional Edge</option>
                        <option value="beaded">Milgrain Beaded Rim</option>
                      </select>
                    </div>

                    {/* Center Motif */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Center Decorative Motif</label>
                      <select
                        value={blueprint.pendantCenterMotif}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            pendantCenterMotif: e.target.value as any,
                          }))
                        }
                        className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500 capitalize"
                      >
                        <option value="floral-clover">Floral Clover (4-Petal Relief)</option>
                        <option value="filigree-star">Filigree 6-Point Star</option>
                        <option value="gemstone">Faceted Gemstone Bezel Seat</option>
                        <option value="plain">Solid Plain Medallion</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Band Profile */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Band Profile Cross-Section</label>
                      <select
                        value={blueprint.bandProfile}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            bandProfile: e.target.value as BandProfile,
                          }))
                        }
                        className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500"
                      >
                        <option value="court-comfort">Court / Comfort-Fit (Curved D)</option>
                        <option value="flat-cigar">Flat Cigar (Modern Square)</option>
                        <option value="knife-edge">Knife-Edge (Ridge Peak)</option>
                        <option value="cathedral">Cathedral Arch Shoulders</option>
                        <option value="split-shank">Split-Shank Dual Rails</option>
                        <option value="twisted-rope">Twisted Rope Cable</option>
                      </select>
                    </div>

                    {/* Band Width & Thickness */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Band Width</span>
                        <span className="font-mono text-white">{blueprint.bandWidth.toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="1.5"
                        max="9.0"
                        step="0.1"
                        value={blueprint.bandWidth}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            bandWidth: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Band Thickness</span>
                        <span className="font-mono text-white">{blueprint.bandThickness.toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="3.5"
                        step="0.1"
                        value={blueprint.bandThickness}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            bandThickness: parseFloat(e.target.value),
                          }))
                        }
                      />
                      {blueprint.bandThickness < 1.2 && (
                        <p className="text-[10px] text-rose-400">⚠️ Risk of porosity in lost-wax casting (&lt;1.2mm)</p>
                      )}
                    </div>

                    {/* Cathedral Arch Height */}
                    {blueprint.bandProfile === "cathedral" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Cathedral Arch Rise</span>
                          <span className="font-mono text-white">
                            {blueprint.cathedralArchHeight.toFixed(1)} mm
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="6.0"
                          step="0.2"
                          value={blueprint.cathedralArchHeight}
                          onChange={(e) =>
                            updateBlueprint((p) => ({
                              ...p,
                              cathedralArchHeight: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Split Shank Gap */}
                    {blueprint.bandProfile === "split-shank" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Split Shank Gap</span>
                          <span className="font-mono text-white">{blueprint.splitShankGap.toFixed(1)} mm</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3.5"
                          step="0.1"
                          value={blueprint.splitShankGap}
                          onChange={(e) =>
                            updateBlueprint((p) => ({
                              ...p,
                              splitShankGap: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Signet Plateau Width / Length */}
                    {blueprint.category === "signet-ring" && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Plateau Width</span>
                            <span className="font-mono text-white">
                              {blueprint.signetPlateauWidth.toFixed(1)} mm
                            </span>
                          </div>
                          <input
                            type="range"
                            min="8.0"
                            max="20.0"
                            step="0.5"
                            value={blueprint.signetPlateauWidth}
                            onChange={(e) =>
                              updateBlueprint((p) => ({
                                ...p,
                                signetPlateauWidth: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Plateau Length</span>
                            <span className="font-mono text-white">
                              {blueprint.signetPlateauLength.toFixed(1)} mm
                            </span>
                          </div>
                          <input
                            type="range"
                            min="8.0"
                            max="22.0"
                            step="0.5"
                            value={blueprint.signetPlateauLength}
                            onChange={(e) =>
                              updateBlueprint((p) => ({
                                ...p,
                                signetPlateauLength: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* TAB 2: HEAD, PRONGS & BEZEL */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleTab("head")}
              className="w-full flex items-center justify-between text-left font-semibold text-slate-200 uppercase tracking-wide hover:text-gold-400 transition"
            >
              <span>2. Head, Basket & Prongs</span>
              {expandedTabs.head ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {expandedTabs.head && (
              <div className="space-y-3 pt-2">
                {blueprint.category === "plain-band" ? (
                  <div className="p-3 bg-studio-850 rounded-lg border border-studio-700/60 text-slate-400 text-xs text-center space-y-1">
                    <p className="text-slate-300 font-medium">Solid Metal Band</p>
                    <p className="text-[11px] text-slate-500">Plain bands do not feature head or prong assemblies.</p>
                  </div>
                ) : (
                  <>
                {/* Head Elevation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Head Elevation</span>
                    <span className="font-mono text-white">{blueprint.headElevation.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="2.5"
                    max="9.0"
                    step="0.2"
                    value={blueprint.headElevation}
                    onChange={(e) =>
                      updateBlueprint((p) => ({
                        ...p,
                        headElevation: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                {/* Bezel Toggle */}
                <div className="flex items-center justify-between p-2 rounded bg-studio-850 border border-studio-700/60">
                  <span className="text-[11px] text-slate-300 font-medium">Bezel Collet Setting</span>
                  <input
                    type="checkbox"
                    checked={blueprint.bezelEnabled}
                    onChange={(e) =>
                      updateBlueprint((p) => ({
                        ...p,
                        bezelEnabled: e.target.checked,
                        prongCount: e.target.checked ? 0 : 4,
                      }))
                    }
                    className="w-4 h-4 accent-gold-500 rounded cursor-pointer"
                  />
                </div>

                {/* Bezel Wall Thickness */}
                {blueprint.bezelEnabled && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Bezel Wall Thickness</span>
                      <span className="font-mono text-white">
                        {blueprint.bezelWallThickness.toFixed(2)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.05"
                      value={blueprint.bezelWallThickness}
                      onChange={(e) =>
                        updateBlueprint((p) => ({
                          ...p,
                          bezelWallThickness: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                )}

                {/* Prongs (when bezel is not full) */}
                {!blueprint.bezelEnabled && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Prong Configuration</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 4, 6, 8].map((count) => (
                          <button
                            key={count}
                            onClick={() => updateBlueprint((p) => ({ ...p, prongCount: count }))}
                            className={`py-1 rounded text-center text-xs font-mono font-bold transition border ${
                              blueprint.prongCount === count
                                ? "bg-gold-500 text-studio-950 border-gold-400"
                                : "bg-studio-850 text-slate-400 border-studio-700 hover:text-white"
                            }`}
                          >
                            {count === 0 ? "None" : `${count} Prongs`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {blueprint.prongCount > 0 && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Prong Thickness</span>
                            <span className="font-mono text-white">
                              {blueprint.prongThickness.toFixed(2)} mm
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.7"
                            max="1.6"
                            step="0.05"
                            value={blueprint.prongThickness}
                            onChange={(e) =>
                              updateBlueprint((p) => ({
                                ...p,
                                prongThickness: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">Prong Tip Style</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(["claw", "button", "tab"] as const).map((style) => (
                              <button
                                key={style}
                                onClick={() =>
                                  updateBlueprint((p) => ({ ...p, prongTipStyle: style }))
                                }
                                className={`py-1 rounded text-center text-xs capitalize transition border ${
                                  blueprint.prongTipStyle === style
                                    ? "bg-sky-500 text-white border-sky-400 font-bold"
                                    : "bg-studio-850 text-slate-400 border-studio-700 hover:text-white"
                                }`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Gallery Rail Toggle */}
                        <div className="flex items-center justify-between p-2 rounded bg-studio-850 border border-studio-700/60">
                          <span className="text-[11px] text-slate-300">Stabilizer Gallery Rail</span>
                          <input
                            type="checkbox"
                            checked={blueprint.galleryRailEnabled}
                            onChange={(e) =>
                              updateBlueprint((p) => ({
                                ...p,
                                galleryRailEnabled: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 accent-gold-500 rounded cursor-pointer"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* TAB 3: PRIMARY & THREE-STONE GEMS */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleTab("gems")}
              className="w-full flex items-center justify-between text-left font-semibold text-slate-200 uppercase tracking-wide hover:text-gold-400 transition"
            >
              <span>3. Center & Trilogy Gems</span>
              {expandedTabs.gems ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {expandedTabs.gems && (
              <div className="space-y-3 pt-2">
                {blueprint.category === "plain-band" ? (
                  <div className="p-3 bg-studio-850 rounded-lg border border-studio-700/60 text-slate-400 text-xs text-center space-y-1">
                    <p className="text-slate-300 font-medium">No Gemstones</p>
                    <p className="text-[11px] text-slate-500">Plain bands are cast in solid precious metal.</p>
                  </div>
                ) : (
                  <>
                {/* Gem Cut */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Center Gemstone Cut</label>
                  <select
                    value={blueprint.gemCut}
                    onChange={(e) =>
                      updateBlueprint((p) => ({
                        ...p,
                        gemCut: e.target.value as GemCut,
                      }))
                    }
                    className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500 capitalize"
                  >
                    <option value="round">Round Brilliant</option>
                    <option value="oval">Oval Cut</option>
                    <option value="emerald">Emerald Step Cut</option>
                    <option value="princess">Princess Square</option>
                    <option value="cushion">Cushion Cut</option>
                    <option value="pear">Pear / Teardrop</option>
                    <option value="marquise">Marquise Navette</option>
                  </select>
                </div>

                {/* Gem Dimensions */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Length (mm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={blueprint.gemLength}
                      onChange={(e) =>
                        updateBlueprint((p) => ({
                          ...p,
                          gemLength: Math.max(2, parseFloat(e.target.value) || 2),
                        }))
                      }
                      className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 font-mono text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Width (mm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={blueprint.gemWidth}
                      onChange={(e) =>
                        updateBlueprint((p) => ({
                          ...p,
                          gemWidth: Math.max(2, parseFloat(e.target.value) || 2),
                        }))
                      }
                      className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 font-mono text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Depth (mm)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={blueprint.gemDepth}
                      onChange={(e) =>
                        updateBlueprint((p) => ({
                          ...p,
                          gemDepth: Math.max(1, parseFloat(e.target.value) || 1),
                        }))
                      }
                      className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 font-mono text-xs text-white"
                    />
                  </div>
                </div>

                {/* Estimated Center Carats */}
                <div className="p-2 bg-studio-850 rounded border border-studio-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Est. Center Carat Weight:</span>
                  <span className="font-mono font-bold text-cyan-300">{metrics.centerCarat} ct</span>
                </div>

                {/* Three-Stone Trilogy Toggle */}
                <div className="flex items-center justify-between p-2 rounded bg-studio-850 border border-studio-700/60 mt-3">
                  <span className="text-[11px] text-slate-300 font-medium">Three-Stone Flanks</span>
                  <input
                    type="checkbox"
                    checked={blueprint.threeStoneEnabled}
                    onChange={(e) =>
                      updateBlueprint((p) => ({
                        ...p,
                        threeStoneEnabled: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-gold-500 rounded cursor-pointer"
                  />
                </div>

                {blueprint.threeStoneEnabled && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Flank Stone Size</span>
                        <span className="font-mono text-white">
                          {blueprint.flankGemSize.toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2.0"
                        max="6.0"
                        step="0.1"
                        value={blueprint.flankGemSize}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            flankGemSize: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Flank Tilt Angle</span>
                        <span className="font-mono text-white">
                          {blueprint.flankTiltAngleDeg.toFixed(0)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="35"
                        step="1"
                        value={blueprint.flankTiltAngleDeg}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            flankTiltAngleDeg: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </>
                )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* TAB 4: HALO & SHANK PAVÉ */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleTab("halo")}
              className="w-full flex items-center justify-between text-left font-semibold text-slate-200 uppercase tracking-wide hover:text-gold-400 transition"
            >
              <span>4. Halo & Shank Pavé</span>
              {expandedTabs.halo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {expandedTabs.halo && (
              <div className="space-y-3 pt-2">
                {blueprint.category === "plain-band" || blueprint.category === "pendant" ? (
                  <div className="p-3 bg-studio-850 rounded-lg border border-studio-700/60 text-slate-400 text-xs text-center space-y-1">
                    <p className="text-slate-300 font-medium">Not Applicable</p>
                    <p className="text-[11px] text-slate-500">Halo and shank pavé are configured for rings with stone settings.</p>
                  </div>
                ) : (
                  <>
                {/* Halo Toggle */}
                <div className="flex items-center justify-between p-2 rounded bg-studio-850 border border-studio-700/60">
                  <span className="text-[11px] text-slate-300 font-medium">Surrounding Gem Halo</span>
                  <input
                    type="checkbox"
                    checked={blueprint.haloEnabled}
                    onChange={(e) =>
                      updateBlueprint((p) => ({
                        ...p,
                        haloEnabled: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-gold-500 rounded cursor-pointer"
                  />
                </div>

                {blueprint.haloEnabled && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Halo Diamond Diameter</span>
                        <span className="font-mono text-white">
                          {blueprint.haloStoneDiameter.toFixed(2)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.9"
                        max="2.2"
                        step="0.05"
                        value={blueprint.haloStoneDiameter}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            haloStoneDiameter: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Center Gap Margin</span>
                        <span className="font-mono text-white">
                          {blueprint.haloGapFromCenter.toFixed(2)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={blueprint.haloGapFromCenter}
                        onChange={(e) =>
                          updateBlueprint((p) => ({
                            ...p,
                            haloGapFromCenter: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                {/* Shank Pavé */}
                <div className="space-y-1 pt-2 border-t border-studio-800">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Pavé Stones Per Shoulder</span>
                    <span className="font-mono text-white">{blueprint.paveCountPerSide}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="14"
                    step="1"
                    value={blueprint.paveCountPerSide}
                    onChange={(e) =>
                      updateBlueprint((p) => ({
                        ...p,
                        paveCountPerSide: parseInt(e.target.value, 10),
                      }))
                    }
                  />
                </div>

                {blueprint.paveCountPerSide > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Pavé Stone Diameter</span>
                      <span className="font-mono text-white">
                        {blueprint.paveStoneDiameter.toFixed(2)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.2"
                      step="0.05"
                      value={blueprint.paveStoneDiameter}
                      onChange={(e) =>
                        updateBlueprint((p) => ({
                          ...p,
                          paveStoneDiameter: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* TAB 5: PRECIOUS ALLOY & GEMSTONE SHADERS */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleTab("materials")}
              className="w-full flex items-center justify-between text-left font-semibold text-slate-200 uppercase tracking-wide hover:text-gold-400 transition"
            >
              <span>5. Precious Alloy & Shaders</span>
              {expandedTabs.materials ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {expandedTabs.materials && (
              <div className="space-y-3 pt-2">
                {/* Precious Metal Alloy */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Precious Metal Casting Alloy</label>
                  <select
                    value={blueprint.metalAlloy}
                    onChange={(e) => {
                      const alloyKey = e.target.value as MetalAlloy;
                      const info = ALLOY_DENSITIES[alloyKey];
                      updateBlueprint((p) => ({
                        ...p,
                        metalAlloy: alloyKey,
                        metalColorHex: info?.hex || p.metalColorHex,
                      }));
                    }}
                    className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500"
                  >
                    <option value="18k-yellow">18K Yellow Gold (15.58 g/cm³)</option>
                    <option value="18k-white">18K White Gold (15.90 g/cm³)</option>
                    <option value="18k-rose">18K Rose Gold (15.10 g/cm³)</option>
                    <option value="22k-gold">22K High Karat Gold (17.75 g/cm³)</option>
                    <option value="platinum">Platinum 950 (21.45 g/cm³)</option>
                    <option value="925-silver">925 Sterling Silver (10.36 g/cm³)</option>
                  </select>
                </div>

                {/* Custom Metal Color Swatch */}
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={blueprint.metalColorHex}
                    onChange={(e) =>
                      updateBlueprint((p) => ({ ...p, metalColorHex: e.target.value }))
                    }
                    className="w-8 h-8 rounded border border-studio-700 cursor-pointer bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-slate-300">
                    {blueprint.metalColorHex}
                  </span>
                </div>

                {/* Gemstone Type */}
                <div className="space-y-1 pt-2 border-t border-studio-800">
                  <label className="text-[11px] text-slate-400">Gemstone Species / Shader</label>
                  <select
                    value={blueprint.gemstoneType}
                    onChange={(e) => {
                      const gemType = e.target.value as GemstoneType;
                      const spec = GEMSTONE_SPECS[gemType];
                      updateBlueprint((p) => ({
                        ...p,
                        gemstoneType: gemType,
                        gemColorHex: spec?.defaultHex || p.gemColorHex,
                      }));
                    }}
                    className="w-full px-2 py-1 bg-studio-950 rounded border border-studio-700 text-slate-200 text-xs focus:outline-none focus:border-gold-500 capitalize"
                  >
                    <option value="diamond">Natural Diamond (IOR 2.42)</option>
                    <option value="sapphire">Royal Sapphire (IOR 1.77)</option>
                    <option value="ruby">Burmese Ruby (IOR 1.77)</option>
                    <option value="emerald">Colombian Emerald (IOR 1.58)</option>
                    <option value="moissanite">Moissanite (IOR 2.65 / High Fire)</option>
                    <option value="black-onyx">Black Onyx (Opaque Polished)</option>
                  </select>
                </div>

                {/* Custom Gem Color Swatch */}
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={blueprint.gemColorHex}
                    onChange={(e) =>
                      updateBlueprint((p) => ({ ...p, gemColorHex: e.target.value }))
                    }
                    className="w-8 h-8 rounded border border-studio-700 cursor-pointer bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-slate-300">
                    {blueprint.gemColorHex}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
