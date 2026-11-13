"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { beginPinch, movePinch, type Pinch, type ViewTransform } from "../../../lib/drawing-editor";
import { DEFAULT_PAINT_SETTINGS, changePaintSetting } from "../../../lib/paint-settings";
import { colorLabel, PALETTE_COLORS } from "../../../lib/editor-accessibility";
import { useDisclosureFocus } from "./useDisclosureFocus";
import { constrainFishPart, drawSwimmingFish, emptyFishDocument, exportFishPng, fishHasArtwork, fishPartContains, fishPartPoint, FISH_ARTBOARD, FISH_MAX_PARTS, makeFishPart, parseFishDraft, renderFish, renderFishToolPreview, upgradeFishDocument, validFishDocument, type ArtPoint, type FishDocument, type FishPaint, type FishPart } from "../../../lib/fish-art";
import { FISH_BODY_TEMPLATES, type FishBodyId } from "../../../lib/fish-templates";
import styles from "./FishEditor.module.css";
import { useFishEditorHeight } from "./useFishEditorHeight";

export type FishEditorProps = { draftKey: string; untimed?: boolean; deadline: number; serverTime: number; paused: boolean; submissionOnly?: boolean; initialDocument?: FishDocument; title?: string; draftMode?: boolean; onDraft?: (source: FishDocument) => void; onSubmit: (blob: Blob) => Promise<void> };
type Tool = "pen" | "spray" | "eraser" | "fill" | "select" | "pan" | "freeform";
type Gesture = { kind: "idle" } | { kind: "navigate"; pinch: Pinch | null } | { kind: "stroke"; owner: number; target: string; op: FishPaint } | { kind: "freeform"; owner: number; points: ArtPoint[] } | { kind: "drag"; owner: number; start: ArtPoint; original: FishPart; part: FishPart } | { kind: "pan"; owner: number; start: ArtPoint; view: ViewTransform };
const IDLE: Gesture = { kind: "idle" };
const DEFAULT_VIEW: ViewTransform = { zoom: 1, pan: { x: 0, y: 0 } };
const SETTINGS_PREVIEW: ArtPoint = { x: 810, y: 384 };
const TOOLS: { value: Tool; name: string; icon: string }[] = [{ value: "spray", name: "Spray can", icon: "spray" }, { value: "pen", name: "Brush", icon: "brush" }, { value: "eraser", name: "Eraser", icon: "eraser" }, { value: "fill", name: "Fill", icon: "fill" }, { value: "select", name: "Select", icon: "select" }, { value: "pan", name: "Hand", icon: "pan" }];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = { brush: "m5 16 10-10 4 4-10 10H5v-4ZM13 8l4 4M5 20H3", spray: "M4 9h12l2 3v8H4zM7 6h6M10 3h9v3h-6M18 12h3m-3 3h4M7 13v4", eraser: "m4 14 8-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 8H9l-5-5a2 2 0 0 1 0-2ZM10 8l8 8M13 21h8", fill: "m4 12 8-8 8 8-8 8-8-8ZM9 3l6 6M4 12h16M20 17s-2 2-2 3a2 2 0 0 0 4 0c0-1-2-3-2-3", select: "M5 3v17l5-5 4 6 3-2-4-6h7L5 3Z", pan: "M8 12V7a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9a6 6 0 0 1-11 3l-5-6a2 2 0 0 1 3-3l1 2", undo: "M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12", redo: "m16 5 5 5-5 5M21 10H10a6 6 0 0 0 0 12", ellipse: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", triangle: "m12 3 10 18H2L12 3Z", rectangle: "M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z", freeform: "M4 18C0 8 10 1 13 8s11 0 7 9-13 4-16 1Z", swim: "M4 12 1 7v10l3-5ZM4 12c5-10 15-8 19 0-4 8-14 10-19 0ZM17 10h.01", reset: "M4 9a9 9 0 1 1 0 7M4 3v6h6", send: "m3 3 19 9-19 9 4-9-4-9ZM7 12h15" };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.brush} /></svg>;
}

function pendingFishDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("callback-fish-delivery-v1", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("pending"); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Fish retry storage is blocked"));
  });
}
async function storePendingFish(key: string, blob: Blob | null): Promise<void> {
  const db = await pendingFishDatabase();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("pending", "readwrite");
    if (blob) transaction.objectStore("pending").put(blob, key); else transaction.objectStore("pending").delete(key);
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
  }); } finally { db.close(); }
}
async function readPendingFish(key: string): Promise<Blob | null> {
  const db = await pendingFishDatabase();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction("pending", "readonly").objectStore("pending").get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null); request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}

export async function copyPendingFish(from:string,to:string):Promise<void>{
 const blob=await readPendingFish(from);if(blob)await storePendingFish(to,blob);
}

export function FishEditor({ draftKey, untimed = false, deadline, serverTime, paused, submissionOnly = false, initialDocument, title, draftMode = false, onDraft, onSubmit }: FishEditorProps) {
  const initialDocumentRef = useRef(initialDocument); const draftCallback = useRef(onDraft); useEffect(() => { draftCallback.current = onDraft; }, [onDraft]);
  const [bodyPicker, setBodyPicker] = useState(false);
  const bodyPanel = useRef<HTMLElement>(null);
  const toolPanel = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState<FishDocument>(emptyFishDocument);
  const editorRef = useFishEditorHeight();
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const drawingRef = useRef(drawing); const past = useRef<FishDocument[]>([]); const future = useRef<FishDocument[]>([]);
  const [tool, setTool] = useState<Tool>("spray"); const [toolSettings, setToolSettings] = useState(false); const stripDrag = useRef({ x: 0, scroll: 0, moved: false }); const [mode, setMode] = useState<"body" | "parts">("body"); const [paintTarget, setPaintTarget] = useState<"body" | "free">("body");
  const [color, setColor] = useState<string>("#111A39"); const [paintSettings, setPaintSettings] = useState(DEFAULT_PAINT_SETTINGS); const [showIntro, setShowIntro] = useState(true); const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null); const [view, setView] = useState<ViewTransform>(DEFAULT_VIEW); const viewRef = useRef(view);
  const canvas = useRef<HTMLCanvasElement>(null); const stage = useRef<HTMLDivElement>(null); const source = useRef<HTMLCanvasElement | null>(null);
  const gesture = useRef<Gesture>(IDLE); const pointers = useRef(new Map<number, ArtPoint>()); const frame = useRef<number | null>(null); const dwell = useRef<number | null>(null);
  const [fit, setFit] = useState({ width: 320, height: 240 }); const [preview, setPreview] = useState(false); const previewRef = useRef(false);
  const [brushPreview, setBrushPreview] = useState<ArtPoint | null>(null); const previewCanvas = useRef<HTMLCanvasElement>(null);
  const displayedBrushPreview = brushPreview ?? (toolSettings && !preview ? SETTINGS_PREVIEW : null);
  const reduced = useRef(false); const [ready, setReady] = useState(false); const [error, setError] = useState(""); const [saveMessage, setSaveMessage] = useState("Saved on this device");
  const [submission, setSubmission] = useState<"editing" | "sending" | "retry" | "accepted" | "expired">("editing");
  const submissionRef = useRef(submission); const pendingBlob = useRef<Blob | null>(null); const submitting = useRef(false); const dirty = useRef(false);
  const submitRef = useRef(onSubmit); const [now, setNow] = useState(serverTime); const clock = useRef({ server: serverTime, local: 0 });
  const deadlineRef = useRef(deadline); const pausedRef = useRef(paused); const nextId = useRef(0);
  const locked = submission !== "editing" || paused || submissionOnly || !ready;
  useDisclosureFocus(bodyPicker && !locked && !preview, bodyPanel);
  useDisclosureFocus(toolSettings && !locked && !preview, toolPanel);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const activePaintTool = tool === "spray" || tool === "eraser" ? tool : "pen";
  const activePaint = paintSettings[activePaintTool];
  const size = activePaint.size;
  const brushOpacity = activePaint.opacity;
  const spraySize = paintSettings.spray.size;
  const opacity = paintSettings.spray.opacity;
  const paintName = activePaintTool === "spray" ? "Spray" : activePaintTool === "eraser" ? "Eraser" : "Brush";
  const selected = drawing.parts.find(part => part.id === selectedId);
  const setSelection = useCallback((id: string | null) => { selectedRef.current = id; setSelectedId(id); }, []);
  const updateView = useCallback((next: ViewTransform) => { viewRef.current = next; setView(next); }, []);
  const markSubmission = useCallback((value: typeof submission) => { submissionRef.current = value; setSubmission(value); }, []);
  const persist = useCallback(() => {
    if (!dirty.current) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ fish: drawingRef.current, accepted: submissionRef.current === "accepted", frozen: submissionRef.current !== "editing" })); dirty.current = false; setSaveMessage("Saved on this device"); }
    catch { setSaveMessage("Keep this page open · device storage unavailable"); }
  }, [draftKey]);
  const paint = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const target = canvas.current?.getContext("2d"); if (!target) return;
      let fish = drawingRef.current; const active = gesture.current;
      if (active.kind === "drag") fish = { ...fish, parts: fish.parts.map(part => part.id === active.part.id ? active.part : part) };
      try {
        renderFish(target, fish, undefined, active.kind === "stroke" ? { target: active.target, operation: active.op } : undefined);
        if (!previewRef.current) {
          const part = fish.parts.find(item => item.id === selectedRef.current);
          if (part) {
            target.save(); target.strokeStyle = "#087F90"; target.lineWidth = 3; target.setLineDash([10, 7]);
            target.beginPath(); target.moveTo(part.root.x, part.root.y); target.lineTo(part.x, part.y); target.stroke();
            target.setLineDash([]); target.beginPath(); target.arc(part.root.x, part.root.y, 8, 0, Math.PI * 2); target.fillStyle = "#46DBDC"; target.fill(); target.stroke();
            target.translate(part.x, part.y); target.rotate(part.rotation * Math.PI / 180); target.setLineDash([10, 7]); target.strokeRect(-part.width / 2 - 5, -part.height / 2 - 5, part.width + 10, part.height + 10); target.restore();
          }
          if (active.kind === "freeform" && active.points.length) { target.save(); target.strokeStyle = "#087F90"; target.lineWidth = 4; target.setLineDash([8, 5]); target.beginPath(); target.moveTo(active.points[0].x, active.points[0].y); for (const point of active.points.slice(1)) target.lineTo(point.x, point.y); target.stroke(); target.restore(); }
        }
      } catch { setError("The fish canvas could not render. Your saved draft is still here."); }
    });
  }, []);
  const update = useCallback((next: FishDocument, record = true) => {
    if (!validFishDocument(next)) { setError("This fish is full of detail. Undo a few marks to make room."); paint(); return false; }
    if (record) { past.current = [...past.current.slice(-39), drawingRef.current]; future.current = []; }
    setHistoryState({ undo: past.current.length > 0, redo: future.current.length > 0 });
    drawingRef.current = next; setDrawing(next); dirty.current = true; setError(""); paint(); return true;
  }, [paint]);
  const stopDwell = useCallback(() => { if (dwell.current !== null) { window.clearInterval(dwell.current); dwell.current = null; } }, []);
  const cancelGesture = useCallback(() => { stopDwell(); gesture.current = IDLE; pointers.current.clear(); paint(); }, [paint, stopDwell]);
  const finish = useCallback(() => {
    const active = gesture.current; stopDwell(); gesture.current = IDLE;
    if (active.kind === "stroke") update(active.target === "body" ? { ...drawingRef.current, body: [...drawingRef.current.body, active.op] } : active.target === "free" ? { ...drawingRef.current, free: [...drawingRef.current.free, active.op] } : { ...drawingRef.current, parts: drawingRef.current.parts.map(part => part.id === active.target ? { ...part, paint: [...part.paint, active.op] } : part) });
    else if (active.kind === "drag" && (active.part.x !== active.original.x || active.part.y !== active.original.y)) update({ ...drawingRef.current, parts: drawingRef.current.parts.map(part => part.id === active.part.id ? active.part : part) });
    else if (active.kind === "freeform" && active.points.length >= 3) {
      const minX = Math.min(...active.points.map(point => point.x)); const maxX = Math.max(...active.points.map(point => point.x));
      const minY = Math.min(...active.points.map(point => point.y)); const maxY = Math.max(...active.points.map(point => point.y));
      const width = Math.max(24, maxX - minX); const height = Math.max(24, maxY - minY);
      const part = constrainFishPart({ ...makeFishPart("freeform", color, `part-${nextId.current++}`), x: (minX + maxX) / 2, y: (minY + maxY) / 2, width, height, points: active.points.map(point => ({ x: clamp((point.x - minX) / width), y: clamp((point.y - minY) / height) })) });
      if (update({ ...drawingRef.current, parts: [...drawingRef.current.parts, part] })) { setSelection(part.id); setTool("select"); }
    }
    paint();
  }, [color, paint, setSelection, stopDwell, update]);
  const send = useCallback(async (automatic = false) => {
    if (submitting.current || submissionRef.current === "accepted" || submissionRef.current === "expired" || pausedRef.current) return;
    finish(); pointers.current.clear(); persist();
    if (!fishHasArtwork(drawingRef.current)) { if (automatic) markSubmission("expired"); else setError("Add a colour or a part to make this fish yours."); return; }
    if(draftMode){if(automatic)return;submitting.current=true;try{await submitRef.current(await exportFishPng(drawingRef.current));}catch(cause){setError(cause instanceof Error?cause.message:"Please retry saving.");}finally{submitting.current=false;}return;}
    submitting.current = true; markSubmission("sending"); dirty.current = true; persist(); setError("");
    try {
      if (!pendingBlob.current) {
        pendingBlob.current = await exportFishPng(drawingRef.current);
        try { await storePendingFish(draftKey, pendingBlob.current); } catch { setSaveMessage("Keep this page open to preserve delivery retries"); }
      }
      await submitRef.current(pendingBlob.current);
      markSubmission("accepted"); dirty.current = true; persist(); void storePendingFish(draftKey, null).catch(() => {});
    } catch (cause) {
      // Once bytes exist, preserve them for every delivery retry under the caller's submission ID.
      markSubmission(pendingBlob.current ? "retry" : automatic ? "retry" : "editing"); dirty.current = true; persist();
      setError(cause instanceof Error ? cause.message : "Your fish is saved. Please retry sending.");
    } finally { submitting.current = false; }
  }, [draftKey, draftMode, finish, markSubmission, persist]);

  useEffect(() => { submitRef.current = onSubmit; }, [onSubmit]);
  useEffect(() => { clock.current = { server: serverTime, local: Date.now() }; const request = requestAnimationFrame(() => setNow(serverTime)); return () => cancelAnimationFrame(request); }, [serverTime]);
  useEffect(() => { deadlineRef.current = deadline; pausedRef.current = paused; if (paused) cancelGesture(); }, [deadline, paused, cancelGesture]);
  useEffect(() => {
    let canceled = false;
    const request = requestAnimationFrame(() => { void (async () => {
      let recovered: FishDocument | null = null; let accepted = false; let frozen = false;
      try {
        const raw = localStorage.getItem(draftKey); const stored = raw ? JSON.parse(raw) : null;
        recovered = parseFishDraft(stored?.fish ? JSON.stringify(stored.fish) : raw); accepted = Boolean(recovered && stored?.accepted); frozen = Boolean(recovered && stored?.frozen);
      } catch { /* An unavailable draft must not block painting. */ }
      let recoveredBlob: Blob | null = null;
      if (frozen && !accepted) { try { recoveredBlob = await readPendingFish(draftKey); } catch { /* Editable source still survives if database storage is unavailable. */ } }
      if (canceled) return;
      past.current = []; future.current = []; pendingBlob.current = recoveredBlob; gesture.current = IDLE; pointers.current.clear(); nextId.current = Date.now();
      drawingRef.current = recovered ?? (initialDocumentRef.current ? upgradeFishDocument(initialDocumentRef.current) : emptyFishDocument()); setDrawing(drawingRef.current); markSubmission(accepted ? "accepted" : frozen ? "retry" : "editing"); setSelection(null); setHistoryState({ undo: false, redo: false });
      setSaveMessage(recovered ? "Your fish was restored" : "Saved on this device"); setReady(true); paint();
    })(); });
    const preference = matchMedia("(prefers-reduced-motion: reduce)"); reduced.current = preference.matches;
    const change = () => { reduced.current = preference.matches; }; preference.addEventListener("change", change);
    return () => { canceled = true; cancelAnimationFrame(request); preference.removeEventListener("change", change); if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  }, [draftKey, markSubmission, paint, setSelection]);
  useEffect(() => {
    const element = stage.current; if (!element) return;
    const fitCanvas = () => { cancelGesture(); updateView(DEFAULT_VIEW); const box = element.getBoundingClientRect(); const inset = box.height < 120 ? 12 : 24; const width = Math.max(1, Math.min(box.width - inset, (box.height - inset) * 4 / 3)); setFit({ width, height: width * 3 / 4 }); };
    const observer = new ResizeObserver(fitCanvas); observer.observe(element); fitCanvas(); return () => observer.disconnect();
  }, [cancelGesture, updateView]);
  useEffect(() => { if(ready)draftCallback.current?.(drawing); }, [drawing,ready]);
  useEffect(() => { if (!ready) return; const timer = setTimeout(persist, 400); return () => clearTimeout(timer); }, [drawing, ready, persist]);
  useEffect(() => {
    const release = () => { cancelGesture(); persist(); }; const hidden = () => { if (document.hidden) release(); };
    window.addEventListener("blur", release); window.addEventListener("pagehide", release); document.addEventListener("visibilitychange", hidden);
    return () => { release(); window.removeEventListener("blur", release); window.removeEventListener("pagehide", release); document.removeEventListener("visibilitychange", hidden); };
  }, [cancelGesture, persist]);
  useEffect(() => {
    if (!ready || untimed) return;
    const tick = () => {
      if (pausedRef.current) return;
      const current = clock.current.server + Date.now() - clock.current.local; setNow(current);
      if (current >= deadlineRef.current && submissionRef.current === "editing") void send(true);
    };
    tick(); const timer = setInterval(tick, 250); return () => clearInterval(timer);
  }, [ready, send, untimed]);
  useEffect(() => {
    if (ready && submissionOnly && !paused && submissionRef.current === "editing") void send(true);
  }, [paused, ready, send, submissionOnly]);
  useEffect(() => {
    previewRef.current = preview;
    if (!preview) { paint(); return; }
    const surface = document.createElement("canvas"); surface.width = 1024; surface.height = 768; source.current = surface;
    const context = surface.getContext("2d"); if (!context) return; renderFish(context, drawingRef.current);
    let request = 0;
    const animate = (time: number) => {
      const target = canvas.current?.getContext("2d"); if (target) { target.clearRect(0, 0, 1024, 768); drawSwimmingFish(target, surface, time / 1000, { x: 10, y: 15, width: 1004, height: 738, reducedMotion: reduced.current }); }
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate); return () => { cancelAnimationFrame(request); source.current = null; };
  }, [paint, preview]);
  useEffect(() => {
    const target = previewCanvas.current?.getContext("2d"); if (!target || !displayedBrushPreview || preview || !["spray", "pen", "eraser"].includes(tool)) return;
    const point = { x: displayedBrushPreview.x / FISH_ARTBOARD.width, y: displayedBrushPreview.y / FISH_ARTBOARD.height };
    const operation: FishPaint = tool === "spray"
      ? { kind: "spray", style: "mist-v1", color, size: spraySize, opacity, points: [point] }
      : { kind: "stroke", tool: tool === "eraser" ? "eraser" : "pen", color, size, opacity: brushOpacity, points: [point] };
    renderFishToolPreview(target, operation, drawing, paintTarget);
  }, [brushPreview, brushOpacity, color, displayedBrushPreview, drawing, opacity, paintTarget, preview, spraySize, size, tool]);

  function artPoint(event: Pick<PointerEvent, "clientX" | "clientY">): ArtPoint {
    const rect = canvas.current!.getBoundingClientRect(); return { x: clamp((event.clientX - rect.left) / rect.width) * 1024, y: clamp((event.clientY - rect.top) / rect.height) * 768 };
  }
  function normalized(point: ArtPoint, target: string): { x: number; y: number } {
    const part = drawingRef.current.parts.find(item => item.id === target); const local = part ? fishPartPoint(part, point) : { x: point.x / 1024, y: point.y / 768 };
    return { x: clamp(local.x), y: clamp(local.y) };
  }
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (showIntro) setShowIntro(false);
    if (toolSettings) { setToolSettings(false); return; }
    if (!ready || locked || preview || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]; const rect = stage.current!.getBoundingClientRect();
      gesture.current = { kind: "navigate", pinch: beginPinch(a, b, viewRef.current, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) }; paint(); return;
    }
    if (gesture.current.kind !== "idle") return;
    const point = artPoint(event.nativeEvent);
    setBrushPreview(point);
    if (tool === "pan") { gesture.current = { kind: "pan", owner: event.pointerId, start: { x: event.clientX, y: event.clientY }, view: viewRef.current }; return; }
    if (tool === "select") {
      const parts = [...drawingRef.current.parts.filter(part => part.behind), ...drawingRef.current.parts.filter(part => !part.behind)].reverse();
      const part = parts.find(item => fishPartContains(item, point)); setSelection(part?.id ?? null);
      if (part) gesture.current = { kind: "drag", owner: event.pointerId, start: point, original: part, part }; paint(); return;
    }
    if (tool === "freeform") {
      if (drawingRef.current.parts.length >= FISH_MAX_PARTS) { setError("Your fish has all 16 parts. Delete one to add another."); return; }
      gesture.current = { kind: "freeform", owner: event.pointerId, points: [point] }; return;
    }
    const target = mode === "body" ? paintTarget : selectedRef.current;
    if (!target) { setError("Select a part to paint, or add a new shape."); return; }
    const local = normalized(point, target);
    const op: FishPaint = tool === "fill" ? { kind: "fill", color, point: local } : tool === "spray" ? { kind: "spray", style: "mist-v1", color, size: spraySize, opacity, points: [local] } : { kind: "stroke", tool, color, size, opacity: brushOpacity, points: [local] };
    const active: Gesture = { kind: "stroke", owner: event.pointerId, target, op }; gesture.current = active;
    if (tool === "spray") dwell.current = window.setInterval(() => {
      if (gesture.current !== active || pausedRef.current || submissionRef.current !== "editing") { stopDwell(); return; }
      if (op.kind === "spray" && op.points.length < 1200) { op.points.push({ ...op.points.at(-1)! }); paint(); }
      else stopDwell();
    }, 100);
    paint();
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault(); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); const active = gesture.current;
    setBrushPreview(artPoint(event.nativeEvent));
    if (active.kind === "navigate") { if (pointers.current.size >= 2 && active.pinch) { const [a, b] = [...pointers.current.values()]; updateView(movePinch(active.pinch, a, b)); } return; }
    if (active.kind === "idle" || active.owner !== event.pointerId) return;
    const point = artPoint(event.nativeEvent);
    if (active.kind === "pan") updateView({ zoom: active.view.zoom, pan: { x: active.view.pan.x + event.clientX - active.start.x, y: active.view.pan.y + event.clientY - active.start.y } });
    else if (active.kind === "drag") { active.part = constrainFishPart({ ...active.original, x: active.original.x + point.x - active.start.x, y: active.original.y + point.y - active.start.y }); paint(); }
    else if (active.kind === "freeform") { if (active.points.length < 600 && Math.hypot(point.x - active.points.at(-1)!.x, point.y - active.points.at(-1)!.y) > 3) active.points.push(point); paint(); }
    else if ((active.op.kind === "stroke" || active.op.kind === "spray") && active.op.points.length < 1200) {
      const local = normalized(point, active.target); const last = active.op.points.at(-1)!;
      if (Math.hypot(local.x - last.x, local.y - last.y) > .001) active.op.points.push(local); paint();
    }
  }
  function pointerEnd(event: ReactPointerEvent<HTMLDivElement>, canceled = false) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (gesture.current.kind === "navigate") {
      if (!pointers.current.size) gesture.current = IDLE;
      else if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()]; const rect = stage.current!.getBoundingClientRect();
        gesture.current = { kind: "navigate", pinch: beginPinch(a, b, viewRef.current, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) };
      } else gesture.current.pinch = null;
      return;
    }
    const active = gesture.current; setBrushPreview(null);
    if (active.kind !== "idle" && active.owner === event.pointerId) { stopDwell(); if (canceled) { gesture.current = IDLE; paint(); } else finish(); }
  }
  function history(direction: "undo" | "redo") {
    if (locked || preview) return; cancelGesture();
    const from = direction === "undo" ? past : future; const to = direction === "undo" ? future : past;
    const next = from.current.at(-1); if (!next) return;
    from.current = from.current.slice(0, -1); to.current = [...to.current, drawingRef.current]; update(next, false);
    if (!next.parts.some(part => part.id === selectedRef.current)) setSelection(null);
  }
  useEffect(() => { if (!toolSettings) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setToolSettings(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [toolSettings]);
  function chooseTool(value: Tool) { setBodyPicker(false); cancelGesture(); setTool(value); setToolSettings(["spray", "pen", "eraser"].includes(value)); if (value === "select") setMode("parts"); }
  function editPart(changes: Partial<FishPart>) {
    if (!selected || locked || preview) return; cancelGesture();
    update({ ...drawingRef.current, parts: drawingRef.current.parts.map(part => part.id === selected.id ? constrainFishPart({ ...part, ...changes }) : part) });
  }
  function chooseBody(shape: FishBodyId | "blank") {
    if (locked || preview) return;
    finish(); cancelGesture();
    const current = drawingRef.current;
    const same = shape === "blank" ? current.template === "blank" : current.template === "fish" && (current.bodyShape ?? "classic") === shape;
    if (same) { setBodyPicker(false); return; }
    if (fishHasArtwork(current) && !window.confirm("Replace your current drawing with a new body? Your colours, marks and parts will be cleared. You can Undo to bring them back.")) return;
    const next = emptyFishDocument(shape === "blank" ? "blank" : "fish");
    if (shape !== "blank") next.bodyShape = shape;
    if (update(next)) { setSelection(null); setMode("body"); setPaintTarget(shape === "blank" ? "free" : "body"); updateView(DEFAULT_VIEW); setShowIntro(false); setBodyPicker(false); }
  }
  function togglePreview() { finish(); cancelGesture(); updateView(DEFAULT_VIEW); setPreview(value => !value); }
  return <section ref={editorRef} className={styles.editor} aria-label="Fish drawing editor" data-fish-editor="true" data-fish-template={drawing.template}>
    <header className={styles.header}><div><span className={styles.eyebrow}>THE WORK AQUARIUM</span><h2>{title ?? "Make a little swimmer."}</h2></div>{!untimed && <div className={`${styles.timer} ${remaining <= 15 ? styles.urgent : ""}`} role="timer" aria-label={paused ? "Drawing paused" : `${remaining} seconds left`}>{paused ? "Paused" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</div>}</header>
    <div className={styles.modeRow}><div className={styles.modeTabs} aria-label="Drawing mode"><button type="button" aria-label={drawing.template === "fish" ? "Draw on fish" : "Draw"} aria-pressed={mode === "body" && paintTarget === "body"} disabled={locked || preview} onClick={() => { cancelGesture(); setMode("body"); setPaintTarget("body"); setSelection(null); }}>Draw</button><button type="button" aria-label="Body" aria-pressed={mode === "body" && paintTarget === "free"} disabled={locked || preview} onClick={() => { cancelGesture(); setMode("body"); setPaintTarget("free"); setSelection(null); setTool("spray"); }}>Body</button></div><button className={styles.templateButton} type="button" aria-label="Fish bodies" aria-expanded={bodyPicker} aria-controls="fish-body-picker" disabled={locked || preview} onClick={() => { finish(); cancelGesture(); setToolSettings(false); setBodyPicker(value => !value); }}><span>Fish bodies</span></button><button className={styles.previewButton} type="button" aria-pressed={preview} disabled={!ready} onClick={togglePreview}><Icon name="swim" /><span>{preview ? "Back to drawing" : "Preview swim"}</span></button></div>
    <div className={styles.workArea}>
      {bodyPicker && !locked && !preview && <section ref={bodyPanel} id="fish-body-picker" className={styles.bodyPicker} aria-label="Choose a fish body" onKeyDown={event => { if (event.key === "Escape") setBodyPicker(false); }}>
        <div className={styles.pickerHeading}><div><strong>Choose your swimmer</strong><p>Start simple or try fancy fins. Colour it your way.</p></div><button type="button" aria-label="Done choosing fish bodies" onClick={() => setBodyPicker(false)}>Done</button></div>
        {(["Simple", "Advanced"] as const).map(level => <div key={level}><h3>{level}</h3><div className={styles.bodyChoices}>{FISH_BODY_TEMPLATES.filter(item => item.level === level).map(item => <button type="button" key={item.id} title={item.tip} aria-pressed={drawing.template === "fish" && (drawing.bodyShape ?? "classic") === item.id} onClick={() => chooseBody(item.id)}><svg viewBox="120 60 740 650" aria-hidden="true"><path d={item.path} /><circle cx={item.id === "ray" ? 740 : 750} cy="365" r="13" /></svg><strong>{item.name}</strong><span>{item.tip}</span></button>)}</div></div>)}
        <button className={styles.blankChoice} type="button" aria-pressed={drawing.template === "blank"} onClick={() => chooseBody("blank")}>Blank canvas · invent your own body</button>
        <p className={styles.pickerNote}>Choosing a new body replaces your drawing. Undo brings it back.</p>
      </section>}

{toolSettings && !locked && !preview && <div ref={toolPanel} className={styles.toolPopover} role="region" aria-label="Tool settings"><strong>{tool === "spray" ? "Spray" : tool === "eraser" ? "Eraser" : "Brush"} settings</strong>          <label className={styles.rangeLabel}><span>{<>{paintName} size <strong>{size}</strong></>}</span><input aria-label={`${paintName} size`} type="range" min={tool === "spray" ? 6 : 2} max={tool === "spray" ? 160 : 64} value={tool === "spray" ? spraySize : size} onChange={event => setPaintSettings(current => changePaintSetting(current, activePaintTool, {size: Number(event.target.value)}))} /></label>
          <label className={styles.rangeLabel}><span>Opacity <strong>{Math.round((tool === "spray" ? opacity : brushOpacity) * 100)}%</strong></span><input aria-label={`${paintName} opacity`} type="range" min="5" max="100" value={Math.round((tool === "spray" ? opacity : brushOpacity) * 100)} onChange={event => setPaintSettings(current => changePaintSetting(current, activePaintTool, {opacity: Number(event.target.value) / 100}))} /></label>
<span>Changes apply immediately. Each tool remembers its own size and opacity while you draw.</span><button type="button" onClick={() => setToolSettings(false)}>Done ✓</button></div>}
        <div ref={stage} className={`${styles.stage} ${preview ? styles.water : ""}`} aria-label="Fish canvas" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)} onLostPointerCapture={event => pointerEnd(event, true)} onPointerLeave={() => { if (gesture.current.kind === "idle") setBrushPreview(null); }} onContextMenu={event => event.preventDefault()}>
        <div className={styles.artboard} style={{ width: fit.width, height: fit.height, transform: `translate(-50%, -50%) translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})` }}><canvas ref={canvas} width={FISH_ARTBOARD.width} height={FISH_ARTBOARD.height} aria-label="Your fish. Its head faces right and tail faces left." role="img" />{!preview && displayedBrushPreview && tool !== "eraser" && <canvas ref={previewCanvas} data-testid="fish-tool-preview" className={styles.toolPreview} width={FISH_ARTBOARD.width} height={FISH_ARTBOARD.height} style={{ left: 0, top: 0, width: fit.width, height: fit.height }} aria-hidden="true" />}{!preview && displayedBrushPreview && tool === "eraser" && <i className={styles.brushCursor} aria-hidden="true" style={{ left: displayedBrushPreview.x * fit.width / FISH_ARTBOARD.width, top: displayedBrushPreview.y * fit.height / FISH_ARTBOARD.height, width: size * fit.width / FISH_ARTBOARD.width, height: size * fit.height / FISH_ARTBOARD.width }} />}</div>
        {!preview && !showIntro && <span className={styles.headCue} aria-hidden="true">Tail ← · → Head</span>}
        {!preview && showIntro && <div className={styles.introHelp} role="note"><strong>Start with the spray can</strong><span>{drawing.template === "fish" ? "Draw paints the fish. Body lets you make a new transparent body shape." : "Draw on the transparent canvas, then preview your fish swimming."}</span><button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => setShowIntro(false)}>Got it</button></div>}
        <button className={styles.resetView} type="button" onPointerDown={event => event.stopPropagation()} onClick={() => { cancelGesture(); updateView(DEFAULT_VIEW); }} aria-label="Fit whole fish in view"><Icon name="reset" />{Math.round(view.zoom * 100)}%</button>
        {paused && <div className={styles.pauseNotice}>Drawing is paused</div>}
        {preview && <span className={styles.previewLabel}>Swim check · your artwork stays unchanged</span>}
      </div>
      <aside className={styles.dock} aria-label="Fish tools">
        <p className={styles.instruction}>{preview ? "Check fins, white details and the edges before sending." : tool === "freeform" ? "Draw a closed shape. Lift your finger to add it." : mode === "parts" ? selected ? "Drag your part. Its cyan root stays attached to the fish." : "Select a saved fin or part to move it." : paintTarget === "free" ? "Build a new body over the transparent water." : drawing.template === "blank" ? "Use Body to create a fish, then Draw to colour it." : "Draw paints the fish and body additions. Body creates marks on transparency."}</p>
        <fieldset disabled={locked || preview} className={styles.controls}><legend className={styles.srOnly}>Fish drawing tools</legend>
          <div className={styles.toolRow} aria-label="Swipe for more tools" onPointerDown={event => { stripDrag.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false }; }} onPointerMove={event => { if (event.pointerType !== "mouse" || event.buttons !== 1) return; const delta = event.clientX - stripDrag.current.x; if (Math.abs(delta) > 6) stripDrag.current.moved = true; if (stripDrag.current.moved) event.currentTarget.scrollLeft = stripDrag.current.scroll - delta; }} onClickCapture={event => { if (stripDrag.current.moved) { event.preventDefault(); event.stopPropagation(); } }}>{TOOLS.map(item => <button key={item.value} type="button" title={item.name} aria-label={item.name} aria-pressed={tool === item.value} onClick={() => chooseTool(item.value)}><Icon name={item.icon} /><span>{item.value === "spray" ? "Spray" : item.name}</span></button>)}</div>
          <div className={styles.quickHistory}><button type="button" aria-label="Undo" title="Undo" disabled={!historyState.undo} onClick={() => history("undo")}><Icon name="undo" /><span>Undo</span></button><button type="button" aria-label="Redo" title="Redo" disabled={!historyState.redo} onClick={() => history("redo")}><Icon name="redo" /><span>Redo</span></button></div><div className={styles.palette} aria-label="Ink colour">{PALETTE_COLORS.map(value => <button key={value} type="button" style={{ backgroundColor: value }} aria-label={colorLabel(value)} title={colorLabel(value)} aria-pressed={color.toLowerCase() === value.toLowerCase()} onClick={() => setColor(value)}>{color.toLowerCase() === value.toLowerCase() && <span style={{ color: value === "#111A39" ? "#FFFFFF" : "#111A39" }}>✓</span>}</button>)}<label className={styles.customColor} title="Custom colour"><span className={styles.srOnly}>Custom colour</span><input type="color" value={color} onChange={event => setColor(event.target.value)} /><span aria-hidden="true">＋</span></label></div>
          <details className={styles.settings}><summary>More settings</summary><div className={styles.settingsBody}>

          {mode === "parts" && selected && <div className={styles.inspector} aria-label="Selected part controls"><div className={styles.partHeading}><strong>Selected {selected.shape === "ellipse" ? "circle" : selected.shape}</strong><button type="button" onClick={() => editPart({ color })}>Colour part</button></div><div className={styles.partFields}><label>Width<input aria-label="Part width" type="range" min="24" max="300" value={selected.width} onChange={event => editPart({ width: Number(event.target.value) })} /></label><label>Height<input aria-label="Part height" type="range" min="24" max="300" value={selected.height} onChange={event => editPart({ height: Number(event.target.value) })} /></label><label>Rotate <span>{Math.round(selected.rotation)}°</span><input aria-label="Part rotation" type="range" min="-180" max="180" value={selected.rotation} onChange={event => editPart({ rotation: Number(event.target.value) })} /></label></div><div className={styles.positionControls}><span>Move part</span>{[{ label: "left", x: -10, y: 0, symbol: "←" }, { label: "up", x: 0, y: -10, symbol: "↑" }, { label: "down", x: 0, y: 10, symbol: "↓" }, { label: "right", x: 10, y: 0, symbol: "→" }].map(direction => <button type="button" key={direction.label} aria-label={`Move part ${direction.label}`} onClick={() => editPart({ x: selected.x + direction.x, y: selected.y + direction.y })}>{direction.symbol}</button>)}</div><div className={styles.partActions}><button type="button" aria-pressed={selected.behind} onClick={() => editPart({ behind: !selected.behind })}>{selected.behind ? "Behind fish" : "In front"}</button><button type="button" disabled={drawing.parts.length >= FISH_MAX_PARTS} onClick={() => { const part = constrainFishPart({ ...selected, id: `part-${nextId.current++}`, x: selected.x + 30, y: selected.y + 20 }); if (update({ ...drawingRef.current, parts: [...drawingRef.current.parts, part] })) setSelection(part.id); }}>Duplicate</button><button type="button" onClick={() => { update({ ...drawingRef.current, parts: drawingRef.current.parts.filter(part => part.id !== selected.id) }); setSelection(null); }}>Delete</button></div></div>}
          </div></details>
        </fieldset>
      </aside>
    </div>
    <footer className={styles.footer}>
      <div className={styles.status} aria-live="polite">{submission === "accepted" ? <strong>Your fish is saved to the aquarium.</strong> : submission === "expired" ? <><strong>Time’s up. You’re watching this round.</strong><span>Your local draft is kept for recovery.</span></> : submission === "retry" ? <><strong>Your fish is saved. Delivery needs a retry.</strong><span>Retry sends the same fish.</span></> : <><span>{!untimed && remaining <= 20 && !paused ? "Time is nearly up · your fish will send automatically." : saveMessage}</span><span>Sending locks your drawing.</span></>}{error && <span className={styles.error} role="alert">{error}</span>}</div>
      <button className={styles.send} type="button" disabled={!ready || paused || submission === "sending" || submission === "accepted" || submission === "expired" || (!fishHasArtwork(drawing) && submission !== "retry")} onClick={() => void send()}><Icon name="send" />{submission === "sending" ? "Sending…" : submission === "accepted" ? "Fish sent ✓" : submission === "retry" ? "Retry sending" : draftMode ? "Save creation" : "Send fish"}</button>
    </footer>
  </section>;
}
