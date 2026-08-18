import React, { useState, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Plus, Trash2, Download, Copy, Leaf, Ruler, ShoppingCart, Fence, Sprout, Home as HomeIcon, RotateCw, LayoutGrid, Box, Map, ChevronDown, ChevronRight, Save, FolderOpen, Printer, Droplets } from "lucide-react";

// ---------- Default unit prices (approx. Home Depot / Lowes, editable in-app) ----------
const DEFAULT_PRICES = {
  cattlePanelEach: 34,
  fencePost8: 19, fencePost10: 27, fencePost12: 34,
  capBoard8: 11, capBoard10: 14, capBoard12: 18, capBoard16: 24,
  gateKitWalk: 48, gateKitDrive: 145, fenceClips: 12,
  board8: 28, board10: 35, board12: 42, board16: 58,
  post4x4x8: 19, deckScrews: 14, fabricRoll: 22,
  linerRoll: 28, hardwareClothRoll: 55, screenMeshRoll: 32,
  trellisPostEach: 9, trellisMeshSqft: 2.75, trellisHardwareEach: 8,
  soilBag: 6.5, soilBulkCY: 55,
  paver16: 4.25, paverBaseBag: 4.75, sandBag: 4.25,
  gravelBulkCY: 48, structPergolaLow: 18, structPergolaHigh: 35, structArborLow: 14, structArborHigh: 26, structPavilionLow: 30, structPavilionHigh: 55, structGazeboLow: 35, structGazeboHigh: 70, structCabinLow: 55, structCabinHigh: 130,
  furnishingsEach: 450, exteriorDoorEach: 220,
  treeEach: 120, shrubEach: 28, flowerBedSqft: 8, mulchBulkCY: 45, sodSqft: 0.55, pathSqft: 6, archEach: 140, doubleArchEach: 230, tunnelEach: 65,
  dripMainlineRoll100: 38, dripTubingRoll100: 34, soakerHose50: 26, dripEmitterEach: 0.45, dripFittingPack: 14, irrigationTimerEach: 42, pressureRegulatorEach: 19, filterEach: 16, backflowPreventerEach: 12, zoneValveEach: 18,
};

const LANDSCAPE_TYPES = {
  tree: { label: "Tree", defaultW: 4, defaultL: 4, color: "#3F6B3A", circle: true, unit: "ea", priceKey: "treeEach" },
  shrub: { label: "Shrub", defaultW: 2, defaultL: 2, color: "#5C8A52", circle: true, unit: "ea", priceKey: "shrubEach" },
  bed: { label: "Flower Bed", defaultW: 3, defaultL: 6, color: "#C98FB3", circle: false, unit: "sqft", priceKey: "flowerBedSqft" },
  mulch: { label: "Mulch Border", defaultW: 2, defaultL: 10, color: "#7A5230", circle: false, unit: "cy", priceKey: "mulchBulkCY" },
  grass: { label: "Grass / Sod", defaultW: 10, defaultL: 10, color: "#8FBF6E", circle: false, unit: "sqft", priceKey: "sodSqft" },
  path: { label: "Walkway / Path", defaultW: 3, defaultL: 10, color: "#C9C2AE", circle: false, unit: "sqft", priceKey: "pathSqft" },
  arch: { label: "Garden Arch", defaultW: 4, defaultL: 1.5, defaultH: 7, color: "#8A6A45", circle: false, unit: "ea", priceKey: "archEach" },
  doubleArch: { label: "Double Arch", defaultW: 4, defaultL: 5, defaultH: 7, color: "#8A6A45", circle: false, unit: "ea", priceKey: "doubleArchEach" },
  tunnel: { label: "Tunnel Trellis (bed to bed)", defaultW: 4, defaultL: 2, defaultH: 6, color: "#7C8B93", circle: false, unit: "ea", priceKey: "tunnelEach" },
};
const STRUCTURAL_LANDSCAPE_TYPES = ["arch", "doubleArch", "tunnel"]; // shown in their own "Trellis & Arches" tab instead of general Landscaping
const GROUND_COVER_TYPES = new Set(["bed", "mulch", "grass", "path"]);

const STRUCTURE_TYPES = {
  none: { label: "No structure — open patio", desc: "Just the surface below, no roof or overhead structure." },
  pergola: { label: "Pergola", lowKey: "structPergolaLow", highKey: "structPergolaHigh", desc: "Open lattice roof — partial shade, classic look, usually a DIY kit." },
  arbor: { label: "Arbor / Shade Canopy", lowKey: "structArborLow", highKey: "structArborHigh", desc: "Lightweight open frame, often with a fabric or slat shade cover." },
  pavilion: { label: "Pavilion / Pole Barn", lowKey: "structPavilionLow", highKey: "structPavilionHigh", desc: "Open-sided post-frame structure with a solid roof — bigger gathering spaces, usually needs a permit." },
  gazebo: { label: "Gazebo", lowKey: "structGazeboLow", highKey: "structGazeboHigh", desc: "Fully enclosed roof, often octagonal — full shade and rain cover, commonly a prefab kit." },
  cabin: { label: "Garden House (walls + door)", lowKey: "structCabinLow", highKey: "structCabinHigh", enclosed: true, desc: "An actual small building — four walls, a roof, and a door. Room for a table and chairs to sit and eat inside, not just shade. Usually needs a permit; check local setback rules." },
};

// Small original line-art icons for the structure picker — not photos, since hotlinked
// external images tend to break or carry copyright the moment they're baked into a
// downloadable file. These are just enough to distinguish the silhouettes at a glance.
function StructureIcon({ type }) {
  const wood = "#8A6A45", dark = "#5C4023", roof = "#7A5637";
  const posts = (xs) => xs.map((x, i) => <rect key={i} x={x} y={22} width={3} height={22} fill={dark} />);
  if (type === "pergola") return (
    <svg viewBox="0 0 80 56" width="100%" height="42">
      {posts([8, 24, 56, 72])}
      <rect x={4} y={16} width={72} height={5} fill={wood} />
      {[10, 20, 30, 40, 50, 60, 70].map((x, i) => <rect key={i} x={x} y={12} width={3} height={10} fill={wood} />)}
    </svg>
  );
  if (type === "arbor") return (
    <svg viewBox="0 0 80 56" width="100%" height="42">
      {posts([16, 60])}
      <path d="M12 20 Q40 2 68 20" fill="none" stroke={wood} strokeWidth={4} />
      <path d="M16 20 L64 20 M22 20 L37 6 M58 20 L43 6" stroke={wood} strokeWidth={2} fill="none" />
    </svg>
  );
  if (type === "pavilion") return (
    <svg viewBox="0 0 80 56" width="100%" height="42">
      {posts([10, 26, 54, 70])}
      <polygon points="2,22 40,4 78,22 68,22 40,10 12,22" fill={roof} />
    </svg>
  );
  if (type === "gazebo") return (
    <svg viewBox="0 0 80 56" width="100%" height="42">
      {posts([14, 30, 50, 66])}
      <polygon points="40,2 8,22 72,22" fill={roof} />
      <circle cx={40} cy={2} r={2.5} fill={dark} />
      <line x1={4} y1={22} x2={76} y2={22} stroke={dark} strokeWidth={2} />
    </svg>
  );
  if (type === "cabin") return (
    <svg viewBox="0 0 80 56" width="100%" height="42">
      <rect x={8} y={22} width={64} height={22} fill={wood} stroke={dark} strokeWidth={1} />
      <polygon points="4,22 40,4 76,22" fill={roof} />
      <rect x={34} y={30} width={12} height={14} fill={dark} />
      <circle cx={43} cy={37} r={1} fill="#D9C9A8" />
    </svg>
  );
  return (
    <svg viewBox="0 0 80 56" width="100%" height="42">
      <rect x={10} y={14} width={60} height={34} fill="none" stroke="#B5A98B" strokeWidth={2} strokeDasharray="4,3" />
      <circle cx={40} cy={10} r={5} fill="#D9A441" />
      <line x1={40} y1={0} x2={40} y2={3} stroke="#D9A441" strokeWidth={2} />
      <line x1={30} y1={4} x2={32} y2={6} stroke="#D9A441" strokeWidth={2} />
      <line x1={50} y1={4} x2={48} y2={6} stroke="#D9A441" strokeWidth={2} />
    </svg>
  );
}

const ENCLOSURE_PRESETS = ["8x8", "8x16", "16x16", "16x32"];
const BED_PRESETS = ["3x5", "3x6", "4x4", "4x8", "4x10"];
const PATIO_PRESETS = ["8x8", "10x10", "12x16", "16x20"];
const STOCK_LENGTHS = [8, 10, 12, 16];
const CROP_PROFILES = [
  { key: "mixed", label: "Mixed / custom planting", minZone: 3, maxZone: 11, minSunHours: 4, spacingIn: 12, waterInchesWeek: 1.2, notes: "General fallback profile." },
  { key: "lettuce", label: "Lettuce & greens", minZone: 3, maxZone: 10, minSunHours: 4, spacingIn: 8, waterInchesWeek: 1.1, notes: "Cool-season, appreciates partial shade in hot climates." },
  { key: "tomato", label: "Tomatoes", minZone: 5, maxZone: 11, minSunHours: 8, spacingIn: 24, waterInchesWeek: 1.5, notes: "Full sun and steady moisture for best yield." },
  { key: "pepper", label: "Peppers", minZone: 5, maxZone: 11, minSunHours: 8, spacingIn: 18, waterInchesWeek: 1.25, notes: "Prefers warm soil and consistent watering." },
  { key: "carrot", label: "Carrots / root crops", minZone: 3, maxZone: 10, minSunHours: 6, spacingIn: 3, waterInchesWeek: 1.0, notes: "Keep topsoil moist during germination." },
  { key: "onion", label: "Onions / alliums", minZone: 3, maxZone: 10, minSunHours: 6, spacingIn: 4, waterInchesWeek: 1.0, notes: "Well-drained beds reduce bulb rot." },
  { key: "beans", label: "Beans & peas", minZone: 4, maxZone: 10, minSunHours: 6, spacingIn: 6, waterInchesWeek: 1.0, notes: "Vining types benefit from trellis support." },
  { key: "squash", label: "Squash / cucumbers", minZone: 5, maxZone: 11, minSunHours: 8, spacingIn: 24, waterInchesWeek: 1.6, notes: "Large leaves need consistent irrigation." },
];
const CROP_PROFILE_BY_KEY = Object.fromEntries(CROP_PROFILES.map((c) => [c.key, c]));
const SAMPLE_PLAN_META = {
  "03-family-16x16-patio.json": "Large-bed 16x16 layout with long rows.",
  "04-market-16x32-intensive.json": "High-yield long-row 16x32 production layout.",
  "05-pollinator-cutflower-garden.json": "Pollinator habitat and cut-flower focus.",
  "06-kids-teaching-garden.json": "Simple educational zones for family learning.",
  "07-low-maintenance-perennial.json": "Fewer beds and easy-upkeep perimeter planting.",
  "08-pergola-dining-garden.json": "Entertaining-focused garden with pergola area.",
  "09-orchard-berry-border.json": "Fruit-tree and berry-forward mixed production.",
  "10-accessible-wide-paths.json": "Wider paths and easier access movement.",
  "11-rainwater-resilient-garden.json": "Rain/drought-resilient mixed planting strategy.",
  "12-small-space-vertical-max.json": "Vertical trellis-heavy small footprint design.",
  "13-production-32x48-zoned.json": "Large 32x48 zoned production layout with an outside-fence pergola break area.",
  "14-family-32x48-orchard.json": "32x48 family garden with orchard edge and an outside-fence pergola patio.",
  "15-market-40x60-intensive.json": "40x60 intensive market-style layout with long rows and an outside-fence pergola.",
  "16-estate-40x60-mixed-garden.json": "40x60 mixed estate garden with an outside-fence pergola gathering zone.",
  "17-homestead-34x60-production.json": "34x60 homestead production layout with central service lane and outside pergola.",
  "18-family-34x60-learning-garden.json": "34x60 family learning layout with an outside-fence pergola and teaching beds.",
  "19-market-40x60-zoned.json": "40x60 zoned market layout with nursery edge beds and outside pergola.",
  "20-estate-40x60-entertaining.json": "40x60 estate layout balancing kitchen rows and an outside-fence pergola.",
  "21-entertaining-34x60-pergola-courtyard.json": "34x60 entertainment courtyard with an outside-fence pergola and fire lounge.",
  "22-entertaining-34x60-pavilion-dining.json": "34x60 hosting layout with outside pergola dining plus pavilion lounge.",
  "23-entertaining-40x60-event-lawn.json": "40x60 event-friendly layout with open lawn and an outside catering pergola.",
  "24-entertaining-40x60-gazebo-orchard.json": "40x60 gazebo and orchard entertaining layout with an outside banquet pergola.",
};
function titleCaseWords(s) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }
const SAMPLE_PLAN_MODULES = import.meta.glob("./sample-plans/*.json", { eager: true });
const SAMPLE_PLANS = Object.entries(SAMPLE_PLAN_MODULES)
  .map(([path, mod]) => {
    const file = path.split("/").pop() || path;
    const data = mod.default || mod;
    const size = data?.enclosure ? `${data.enclosure.width}×${data.enclosure.length} ft` : "";
    const hasOutsidePergola = !!(data?.enclosure && Array.isArray(data?.patios) && data.patios.some((p) => (
      p?.structureType === "pergola"
      && (
        (Number(p.x) || 0) < 0
        || (Number(p.y) || 0) < 0
        || (Number(p.x) || 0) + Math.max(Number(p.width) || 0, 0) > data.enclosure.width
        || (Number(p.y) || 0) + Math.max(Number(p.length) || 0, 0) > data.enclosure.length
      )
    )));
    return {
      file,
      data,
      label: titleCaseWords(file
        .replace(/^\d{2}-/, "")
        .replace(/\.json$/, "")
        .replace(/-/g, " ")),
      size,
      blurb: SAMPLE_PLAN_META[file] || "Sample starter layout.",
      hasOutsidePergola,
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

function fmt(n) { return n.toLocaleString(undefined, { style: "currency", currency: "USD" }); }
function round1(n) { return Math.round(n * 10) / 10; }
function clamp(n, min, max) { return Math.max(min, Math.min(n, max)); }
function numOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function normalizePatio(patio) {
  const structureType = STRUCTURE_TYPES[patio?.structureType] ? patio.structureType : "none";
  return {
    ...patio,
    label: String(patio?.label || "Patio"),
    width: clamp(numOr(patio?.width, 8), 4, 200),
    length: clamp(numOr(patio?.length, 8), 4, 200),
    x: numOr(patio?.x, 0),
    y: numOr(patio?.y, 0),
    surface: patio?.surface === "gravel" ? "gravel" : "pavers",
    structureType,
    structureHeight: clamp(numOr(patio?.structureHeight, 8), 7, 12),
    roofStyle: ["hip", "gable", "flat"].includes(patio?.roofStyle) ? patio.roofStyle : "hip",
    roofDirection: patio?.roofDirection === "rotated" ? "rotated" : "auto",
    doorWidth: patio?.doorWidth === 6 ? 6 : 3,
    furnishings: !!patio?.furnishings,
  };
}
function landscapeLabelText(l, t) {
  const custom = String(l.label || t.label || "Landscape");
  if (GROUND_COVER_TYPES.has(l.type)) {
    const areaSqft = round1(Math.max(Number(l.width) || 0, 0) * Math.max(Number(l.length) || 0, 0) * Math.max(Number(l.qty) || 1, 1));
    return `${custom} • ${t.label} ground cover • ${areaSqft} sq ft`;
  }
  if (t.unit === "ea" && (Number(l.qty) || 1) > 1) return `${custom} • ${t.label} ×${Math.max(Number(l.qty) || 1, 1)}`;
  return `${custom} • ${t.label}`;
}
function bedFootprintAreaSqft(b) {
  const width = Math.max(Number(b.width) || 0, 0);
  const length = Math.max(Number(b.length) || 0, 0);
  if (b.shape !== "L") return width * length;
  const notchW = Math.max(0, Math.min(Number(b.notchWidth) || 0, Math.max(width - 0.1, 0)));
  const notchD = Math.max(0, Math.min(Number(b.notchDepth) || 0, Math.max(length - 0.1, 0)));
  return Math.max(width * length - notchW * notchD, 0);
}

function piecesForSide(sideFt) {
  const fit = STOCK_LENGTHS.find((s) => s >= sideFt);
  if (fit) return [{ length: fit, qty: 1 }];
  const full = Math.floor(sideFt / 16);
  const rem = round1(sideFt - full * 16);
  const arr = [{ length: 16, qty: full }];
  if (rem > 0) arr.push({ length: STOCK_LENGTHS.find((s) => s >= rem) || 16, qty: 1 });
  return arr;
}

// L-shape: a bounding box (W x L) with a rectangular notch (nw x nl) removed from one corner.
// Returns 6 vertices in canvas coords (x right, y down), clockwise from top-left area.
function lShapeVertices(W, L, nw, nl, corner) {
  nw = Math.min(Math.max(nw, 0), W - 0.1);
  nl = Math.min(Math.max(nl, 0), L - 0.1);
  switch (corner) {
    case "top-left": return [[nw, 0], [W, 0], [W, L], [0, L], [0, nl], [nw, nl]];
    case "bottom-right": return [[0, 0], [W, 0], [W, L - nl], [W - nw, L - nl], [W - nw, L], [0, L]];
    case "bottom-left": return [[0, 0], [W, 0], [W, L], [nw, L], [nw, L - nl], [0, L - nl]];
    case "top-right":
    default: return [[0, 0], [W - nw, 0], [W - nw, nl], [W, nl], [W, L], [0, L]];
  }
}
// When a bed is rendered rotated 90° (right/left wall beds), the on-screen corner a
// local notch ends up at is shifted one step clockwise (local TL->screen TR, TR->BR,
// BR->BL, BL->TL). This maps the corner the user PICKED (what they see on screen)
// back to the local corner to actually request, so "top-right" always looks like
// top-right on screen regardless of the bed's rotation state.
const CORNER_UNROTATE = { "top-right": "top-left", "bottom-right": "top-right", "bottom-left": "bottom-right", "top-left": "bottom-left" };
function displayCornerToLocal(corner, rotated) { return rotated ? CORNER_UNROTATE[corner] : corner; }
function polygonEdgeLengths(pts) {
  const lens = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    lens.push(Math.hypot(x2 - x1, y2 - y1));
  }
  return lens;
}
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    const hit = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}
// Scatter "planted row" dot positions inside a bed footprint (local coords), skipping
// the notch area for L-shaped beds so nothing appears to float outside the soil.
function plantDots(width, length, isL, verts) {
  const dots = [];
  const margin = 0.4, spacing = 1.25;
  for (let y = margin; y <= length - margin; y += spacing) {
    for (let x = margin; x <= width - margin; x += spacing) {
      if (isL && !pointInPolygon(x, y, verts)) continue;
      dots.push([round1(x), round1(y)]);
    }
  }
  return dots;
}

// Walks a rectangular ring path (top -> right -> bottom -> left) placing beds
// with their "width" running along the wall and "length" as the inward depth.
function placeRing(bedsList, x0, y0, x1, y1, gap) {
  const segs = [
    { type: "top", length: x1 - x0, start: { x: x0, y: y0 } },
    { type: "right", length: y1 - y0, start: { x: x1, y: y0 } },
    { type: "bottom", length: x1 - x0, start: { x: x1, y: y1 } },
    { type: "left", length: y1 - y0, start: { x: x0, y: y1 } },
  ];
  let segIdx = 0, cursor = 0, overflow = false;
  const placed = [];
  bedsList.forEach((bed) => {
    const along = bed.width + gap;
    let attempts = 0;
    while (cursor + bed.width > segs[segIdx].length && attempts < 4) { segIdx = (segIdx + 1) % 4; cursor = 0; attempts++; }
    if (attempts >= 4) overflow = true;
    const seg = segs[segIdx];
    let x, y, rotated;
    if (seg.type === "top") { x = seg.start.x + cursor; y = seg.start.y; rotated = false; }
    else if (seg.type === "bottom") { x = seg.start.x - cursor - bed.width; y = seg.start.y - bed.length; rotated = false; }
    else if (seg.type === "right") { x = seg.start.x - bed.length; y = seg.start.y + cursor; rotated = true; }
    else { x = seg.start.x; y = seg.start.y - cursor - bed.width; rotated = true; }
    placed.push({ ...bed, x, y, rotated });
    cursor += along;
  });
  return { placed, overflow };
}

// Given a wall's length and the gates that fall on it, returns the fence-line
// segments to actually draw/build (the parts NOT covered by a gate opening).
function wallSegments(length, gatesOnWall) {
  const cuts = gatesOnWall.map((g) => [Math.max(0, g.offset), Math.min(length, g.offset + g.width)]).sort((a, b) => a[0] - b[0]);
  const segs = [];
  let cur = 0;
  cuts.forEach(([s, e]) => { if (s > cur) segs.push([cur, s]); cur = Math.max(cur, e); });
  if (cur < length) segs.push([cur, length]);
  return segs;
}
function fencePostAnchors(width, length, spacing) {
  const step = Math.max(spacing || 1, 0.5);
  const rows = [];
  function addWall(wall, wallLen, toPoint) {
    const offsets = [0];
    for (let d = step; d < wallLen; d += step) offsets.push(round1(d));
    offsets.push(wallLen);
    offsets.forEach((off) => {
      const p = toPoint(off);
      rows.push({ ...p, wall, wallOffset: off });
    });
  }
  addWall("top", width, (off) => ({ x: off, y: 0 }));
  addWall("right", length, (off) => ({ x: width, y: off }));
  addWall("bottom", width, (off) => ({ x: width - off, y: length }));
  addWall("left", length, (off) => ({ x: 0, y: length - off }));

  const seen = new Set();
  const unique = [];
  rows.forEach((p) => {
    const key = `${round1(p.x)}|${round1(p.y)}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(p);
  });
  const isEdge = (v, max) => Math.abs(v) < 0.001 || Math.abs(v - max) < 0.001;
  return unique.map((p) => ({
    ...p,
    isCorner: isEdge(p.x, width) && isEdge(p.y, length),
  }));
}

let idCounter = 3;

export default function GardenDesigner() {
  const [enclosure, setEnclosure] = useState({ width: 16, length: 16 });
  const [fenceHeight, setFenceHeight] = useState(6);
  const [postSpacing, setPostSpacing] = useState(7);
  const [gates, setGates] = useState([{ id: 1, wall: "bottom", offset: round1(16 / 2 - 1.75), width: 3.5 }]);
  const [courses, setCourses] = useState(3); // default course count used when adding a new bed
  const [perimeterInset, setPerimeterInset] = useState(4); // setback (ft) from fence to perimeter-zone beds
  const [beds, setBeds] = useState([
    { id: 1, label: "Bed A", width: 4, length: 8, qty: 2, courses: 3, shape: "rect", zone: "center", cropKey: "mixed", trellis: false, trellisHeight: 6, trellisSide: "width", positions: [{ x: 2, y: 2, rotated: false }, { x: 2, y: 11, rotated: false }] },
    { id: 2, label: "Bed B", width: 3, length: 5, qty: 1, courses: 3, shape: "rect", zone: "center", cropKey: "mixed", trellis: false, trellisHeight: 6, trellisSide: "width", positions: [{ x: 7, y: 2, rotated: false }] },
  ]);
  const [patios, setPatios] = useState([]);
  const [expandedPatios, setExpandedPatios] = useState(() => new Set());
  const [yardMargin, setYardMargin] = useState(10); // ft of yard shown/usable outside the fence
  const [landscape, setLandscape] = useState([]);
  const [expandedLandscape, setExpandedLandscape] = useState(() => new Set());
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [gardenSite, setGardenSite] = useState({ usdaZone: 7, sunHours: 8 });
  const [irrigation, setIrrigation] = useState({ enabled: true, method: "drip", zones: 2, rowSpacingIn: 12, emitterSpacingIn: 12, emitterGph: 0.5, minutesPerDay: 35, daysPerWeek: 4 });
  const [reportName, setReportName] = useState("");
  const [savedReports, setSavedReports] = useState([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveStatusType, setSaveStatusType] = useState("ok"); // 'ok' | 'warn' | 'error'
  const [filePanel, setFilePanel] = useState(null); // null | 'export' | 'import'
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const sessionReportsRef = useRef({}); // in-memory fallback so Save/Load always work this session, even if window.storage is unavailable
  const fileInputRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [dragKey, setDragKey] = useState(null);
  const [selected, setSelected] = useState(null); // { kind: 'bed'|'patio', bedId, idx }
  const [nudgeStep, setNudgeStep] = useState(0.5);
  const [viewMode, setViewMode] = useState("2d"); // '2d' | '3d'
  const [planCamera, setPlanCamera] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [renderQuality3d, setRenderQuality3d] = useState("cinematic"); // 'standard' | 'cinematic'
  const [activeTab, setActiveTab] = useState("enclosure"); // 'enclosure' | 'beds' | 'patio' | 'landscaping' | 'trellis' | 'irrigation' | 'prices'
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [expandedBeds, setExpandedBeds] = useState(() => new Set([1, 2]));
  const [advancedBeds, setAdvancedBeds] = useState(() => new Set());
  const threeContainerRef = useRef(null);
  const camStateRef = useRef({ theta: 0.8, phi: 1.0, radius: null });
  const historyRef = useRef([]);
  const historyHashRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const historyReadyRef = useRef(false);
  const skipNextHistoryRef = useRef(false);
  function toggleExpanded(id) { setExpandedBeds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAdvanced(id) { setAdvancedBeds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  const boardActualIn = 11.25; // actual height of a 2x12
  const bedWallHeightFt = round1((courses * boardActualIn) / 12);

  function resizePositions(positions = [], qty, w, l) {
    const arr = positions.slice(0, qty).map((p) => ({ ...p }));
    while (arr.length < qty) {
      const n = arr.length;
      arr.push({ x: round1(1 + (n % 4) * (w + 0.8)), y: round1(1 + Math.floor(n / 4) * (l + 0.8)), rotated: false });
    }
    return arr;
  }
  function updateBed(id, patch) {
    setBeds((bs) => bs.map((b) => {
      if (b.id !== id) return b;
      const next = { ...b, ...patch };
      if (patch.qty !== undefined || patch.width !== undefined || patch.length !== undefined) {
        next.positions = resizePositions(b.positions, next.qty, next.width, next.length);
      }
      return next;
    }));
  }
  function addBed() {
    idCounter += 1;
    const w = 4, l = 8;
    // stack new beds below whatever's already placed, so two beds added back-to-back
    // don't both land on the same fixed (1,1) spot and hide on top of each other
    const cascadeY = beds.reduce((maxY, b) => Math.max(maxY, ...(b.positions || []).map((p) => p.y + (p.rotated ? b.width : b.length))), 0);
    setBeds((bs) => [...bs, { id: idCounter, label: `Bed ${String.fromCharCode(65 + bs.length)}`, width: w, length: l, qty: 1, courses, shape: "rect", notchWidth: 2, notchDepth: 2, notchCorner: "top-right", zone: "center", cropKey: "mixed", trellis: false, trellisHeight: 6, trellisSide: "width", positions: [{ x: 1, y: round1(cascadeY + 1), rotated: false }] }]);
    setExpandedBeds((s) => new Set(s).add(idCounter));
  }
  function removeBed(id) { setBeds((bs) => bs.filter((b) => b.id !== id)); }
  function applyEnclosurePreset(p) { const [w, l] = p.split("x").map(Number); setEnclosure({ width: w, length: l }); }
  function applyBedPreset(id, p) { const [w, l] = p.split("x").map(Number); updateBed(id, { width: w, length: l }); }
  function wallLength(wall) { return wall === "top" || wall === "bottom" ? enclosure.width : enclosure.length; }
  const fencePosts = useMemo(() => fencePostAnchors(enclosure.width, enclosure.length, postSpacing), [enclosure.width, enclosure.length, postSpacing]);
  const MIN_PLAN_ZOOM = 0.2;
  const MAX_PLAN_ZOOM = 6;
  const planBaseBounds = useMemo(() => ({
    x: -1 - yardMargin,
    y: -1 - yardMargin,
    width: enclosure.width + 2 + 2 * yardMargin,
    height: enclosure.length + 2 + 2 * yardMargin,
  }), [enclosure.width, enclosure.length, yardMargin]);
  const planViewport = useMemo(() => {
    const zoom = clamp(Number(planCamera.zoom) || 1, MIN_PLAN_ZOOM, MAX_PLAN_ZOOM);
    const width = planBaseBounds.width / zoom;
    const height = planBaseBounds.height / zoom;
    const maxPanX = Math.max((planBaseBounds.width - width) / 2, 0);
    const maxPanY = Math.max((planBaseBounds.height - height) / 2, 0);
    const panX = clamp(Number(planCamera.panX) || 0, -maxPanX, maxPanX);
    const panY = clamp(Number(planCamera.panY) || 0, -maxPanY, maxPanY);
    const centerX = planBaseBounds.x + planBaseBounds.width / 2 + panX;
    const centerY = planBaseBounds.y + planBaseBounds.height / 2 + panY;
    return { zoom, panX, panY, maxPanX, maxPanY, x: centerX - width / 2, y: centerY - height / 2, width, height };
  }, [planBaseBounds, planCamera]);
  const planPanStep = useMemo(() => {
    const visibleSpan = Math.min(planViewport.width, planViewport.height);
    return round1(Math.max(0.5, visibleSpan * 0.12));
  }, [planViewport.width, planViewport.height]);
  function zoomPlan(multiplier) {
    setPlanCamera((cam) => {
      const nextZoom = clamp((Number(cam.zoom) || 1) * multiplier, MIN_PLAN_ZOOM, MAX_PLAN_ZOOM);
      if (nextZoom <= 1.001) return { zoom: Math.round(nextZoom * 100) / 100, panX: 0, panY: 0 };
      return { ...cam, zoom: Math.round(nextZoom * 100) / 100 };
    });
  }
  function panPlan(dx, dy) {
    setPlanCamera((cam) => ({
      ...cam,
      panX: round1((Number(cam.panX) || 0) + dx),
      panY: round1((Number(cam.panY) || 0) + dy),
    }));
  }
  function resetPlanViewport() { setPlanCamera({ zoom: 1, panX: 0, panY: 0 }); }
  function overviewPlanViewport() { setPlanCamera({ zoom: 0.5, panX: 0, panY: 0 }); }
  function enter3dPreview() {
    // Reset orbit baseline so radically different layouts (or outside-yard structures)
    // never inherit a stale camera radius that can make the scene look blank.
    camStateRef.current = { theta: 0.8, phi: 1.0, radius: null };
    setViewMode("3d");
  }
  function onPlanWheel(e) {
    e.preventDefault();
    zoomPlan(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }
  function addGate() {
    idCounter += 1;
    const wl = wallLength("bottom");
    setGates((gs) => [...gs, { id: idCounter, wall: "bottom", offset: round1(Math.max(0, Math.min(1 + gs.length * 4, wl - 3.5))), width: 3.5 }]);
  }
  function updateGate(id, patch) {
    setGates((gs) => gs.map((g) => {
      if (g.id !== id) return g;
      const next = { ...g, ...patch };
      const wl = wallLength(next.wall);
      next.width = Math.min(next.width, wl - 0.5);
      next.offset = Math.max(0, Math.min(next.offset, wl - next.width));
      return next;
    }));
  }
  function removeGate(id) { setGates((gs) => gs.filter((g) => g.id !== id)); }
  function gateEndpoints(g) {
    const W = enclosure.width, L = enclosure.length;
    if (g.wall === "top") return { x1: g.offset, y1: 0, x2: g.offset + g.width, y2: 0, nx: 0, ny: -1 };
    if (g.wall === "bottom") return { x1: g.offset, y1: L, x2: g.offset + g.width, y2: L, nx: 0, ny: 1 };
    if (g.wall === "left") return { x1: 0, y1: g.offset, x2: 0, y2: g.offset + g.width, nx: -1, ny: 0 };
    return { x1: W, y1: g.offset, x2: W, y2: g.offset + g.width, nx: 1, ny: 0 };
  }
  function addLandscape(type) {
    idCounter += 1;
    const t = LANDSCAPE_TYPES[type];
    // shelf-pack into rows bounded to the enclosure width, wrapping instead of stacking
    // in one ever-growing column — keeps new items near the garden and in camera view,
    // while still avoiding the overlap that a fixed grid caused for long/thin items
    const rowWidth = Math.max(enclosure.width, 16);
    let cursorX = 0, cursorY = enclosure.length + 2, rowH = 0;
    landscape.forEach((l) => {
      if (cursorX + l.width > rowWidth) { cursorX = 0; cursorY += rowH + 1; rowH = 0; }
      cursorX += l.width + 1;
      rowH = Math.max(rowH, l.length);
    });
    if (cursorX + t.defaultW > rowWidth) { cursorX = 0; cursorY += rowH + 1; }
    setLandscape((ls) => [...ls, {
      id: idCounter, type, label: t.label, width: t.defaultW, length: t.defaultL, height: t.defaultH, qty: 1,
      x: round1(cursorX), y: round1(cursorY),
    }]);
    setExpandedLandscape((s) => new Set(s).add(idCounter));
  }
  function updateLandscape(id, patch) { setLandscape((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); }
  function removeLandscape(id) { setLandscape((ls) => ls.filter((l) => l.id !== id)); }
  function toggleLandscapeExpanded(id) { setExpandedLandscape((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function addPatio() {
    idCounter += 1;
    const n = patios.length;
    setPatios((ps) => [...ps, normalizePatio({
      id: idCounter, label: `Patio ${String.fromCharCode(65 + n)}`, width: 8, length: 8, surface: "pavers",
      structureType: "none", structureHeight: 8, roofStyle: "hip", roofDirection: "auto", doorWidth: 3, furnishings: false,
      x: round1(2 + n * 2), y: round1(2 + n * 2),
    })]);
    setExpandedPatios((s) => new Set(s).add(idCounter));
  }
  function updatePatio(id, patch) { setPatios((ps) => ps.map((p) => (p.id === id ? normalizePatio({ ...p, ...patch }) : p))); }
  function removePatio(id) { setPatios((ps) => ps.filter((p) => p.id !== id)); }
  function togglePatioExpanded(id) { setExpandedPatios((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function renderLandscapeItem(l) {
    const t = LANDSCAPE_TYPES[l.type];
    const isOpen = expandedLandscape.has(l.id);
    if (!isOpen) {
      return (
        <div key={l.id} className="gdw-bedrow" style={{ cursor: "pointer" }} onClick={() => toggleLandscapeExpanded(l.id)}>
          <div className="gdw-bedrow-top" style={{ marginBottom: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
              <ChevronRight size={14} /> {l.label} {t.circle ? `— ${l.width} ft spread` : l.type === "arch" ? `— ${l.width} ft wide × ${l.height || 7} ft tall` : l.type === "doubleArch" ? `— ${l.width} ft wide × ${l.length} ft deep × ${l.height || 7} ft tall` : l.type === "tunnel" ? `— ${l.width} ft span × ${l.height || 6} ft tall × ${l.length} ft wide` : `— ${l.width}×${l.length} ft`}{t.unit === "ea" && t.circle ? ` ×${l.qty}` : ""}
            </span>
            <button className="gdw-iconbtn" onClick={(e) => { e.stopPropagation(); removeLandscape(l.id); }}><Trash2 size={15} /></button>
          </div>
        </div>
      );
    }
    return (
      <div key={l.id} className="gdw-bedrow">
        <div className="gdw-bedrow-top">
          <span style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
            <button className="gdw-iconbtn" style={{ color: "var(--ink)" }} onClick={() => toggleLandscapeExpanded(l.id)}><ChevronDown size={14} /></button>
            <input className="gdw-name" value={l.label} onChange={(e) => updateLandscape(l.id, { label: e.target.value })} />
          </span>
          <button className="gdw-iconbtn" onClick={() => removeLandscape(l.id)}><Trash2 size={15} /></button>
        </div>
        {t.circle ? (
          <div className="gdw-row">
            <span style={{ fontSize: 11, color: "#6b6350" }}>Spread (ft)</span>
            <input type="number" min={1} step={0.5} className="gdw-inp" value={l.width} onChange={(e) => { const v = Number(e.target.value) || 1; updateLandscape(l.id, { width: v, length: v }); }} />
            <span style={{ fontSize: 12 }}>qty</span>
            <input type="number" min={1} className="gdw-inp" style={{ width: 44 }} value={l.qty} onChange={(e) => updateLandscape(l.id, { qty: Number(e.target.value) || 1 })} />
          </div>
        ) : l.type === "arch" ? (
          <>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Width</span>
              {[4, 6, 8].map((w) => (
                <button key={w} className={`gdw-btn ${l.width === w ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { width: w })}>{w} ft</button>
              ))}
            </div>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Height</span>
              {[6, 7, 8].map((h) => (
                <button key={h} className={`gdw-btn ${(l.height || 7) === h ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { height: h })}>{h} ft</button>
              ))}
            </div>
            <div className="gdw-note" style={{ margin: "4px 0 0 0" }}>Want a second arch? Click "+ Garden Arch" again — each one is placed and priced separately, since they each need their own spot.</div>
          </>
        ) : l.type === "doubleArch" ? (
          <>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Opening width</span>
              {[4, 6, 8].map((w) => (
                <button key={w} className={`gdw-btn ${l.width === w ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { width: w })}>{w} ft</button>
              ))}
            </div>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Front-to-back spacing</span>
              {[3, 4, 5, 6, 8].map((sp) => (
                <button key={sp} className={`gdw-btn ${l.length === sp ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { length: sp })}>{sp} ft</button>
              ))}
            </div>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Height</span>
              {[6, 7, 8].map((h) => (
                <button key={h} className={`gdw-btn ${(l.height || 7) === h ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { height: h })}>{h} ft</button>
              ))}
            </div>
            <div className="gdw-note" style={{ margin: "4px 0 0 0" }}>Two arches set front-to-back, connected by rails along the top — walk through one, then the other, like a short covered tunnel.</div>
          </>
        ) : l.type === "tunnel" ? (
          <>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Span (bed to bed)</span>
              {[3, 4, 5, 6, 8].map((w) => (
                <button key={w} className={`gdw-btn ${l.width === w ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { width: w })}>{w} ft</button>
              ))}
              <input type="number" min={1} step={0.5} className="gdw-inp" style={{ width: 44 }} value={l.width} onChange={(e) => updateLandscape(l.id, { width: Number(e.target.value) || 1 })} />
            </div>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Height</span>
              {[6, 7, 8].map((h) => (
                <button key={h} className={`gdw-btn ${(l.height || 6) === h ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { height: h })}>{h} ft</button>
              ))}
            </div>
            <div className="gdw-row">
              <span style={{ fontSize: 11, color: "#6b6350" }}>Width (along the path)</span>
              {[1, 2, 3, 4].map((wd) => (
                <button key={wd} className={`gdw-btn ${l.length === wd ? "active" : ""}`} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { length: wd })}>{wd} ft</button>
              ))}
              <input type="number" min={0.5} step={0.5} className="gdw-inp" style={{ width: 44 }} value={l.length} onChange={(e) => updateLandscape(l.id, { length: Number(e.target.value) || 0.5 })} />
              <button className="gdw-btn" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => updateLandscape(l.id, { width: l.length, length: l.width })} title="Swap the span and path-width values">⇄ Swap</button>
            </div>
            <div className="gdw-note" style={{ margin: "4px 0 0 0" }}>Drag it so each end sits inside a bed on either side of the path — the arch spans the gap between them. Need a second one for a different pair of beds? Click "+ Tunnel Trellis" again — each one is placed and priced separately.</div>
          </>
        ) : (
          <div className="gdw-row">
            <span style={{ fontSize: 11, color: "#6b6350" }}>Size (ft)</span>
            <input type="number" min={0.5} step={0.5} className="gdw-inp" style={{ width: 48 }} value={l.width} onChange={(e) => updateLandscape(l.id, { width: Number(e.target.value) || 0.5 })} />
            <span>×</span>
            <input type="number" min={0.5} step={0.5} className="gdw-inp" style={{ width: 48 }} value={l.length} onChange={(e) => updateLandscape(l.id, { length: Number(e.target.value) || 0.5 })} />
            {t.unit === "ea" && (
              <>
                <span style={{ fontSize: 12 }}>qty</span>
                <input type="number" min={1} className="gdw-inp" style={{ width: 44 }} value={l.qty} onChange={(e) => updateLandscape(l.id, { qty: Number(e.target.value) || 1 })} />
              </>
            )}
          </div>
        )}
      </div>
    );
  }
  function setPrice(key, val) { setPrices((p) => ({ ...p, [key]: Number(val) || 0 })); }

  const plantingGuidance = useMemo(() => {
    const zone = Number(gardenSite.usdaZone) || 7;
    const sunHours = Number(gardenSite.sunHours) || 8;
    const bedsSummary = beds.map((b) => {
      const crop = CROP_PROFILE_BY_KEY[b.cropKey] || CROP_PROFILE_BY_KEY.mixed;
      const area = bedFootprintAreaSqft(b);
      const spacingFt = Math.max((crop.spacingIn || 12) / 12, 0.2);
      const plantsPerBed = Math.max(Math.floor(area / (spacingFt * spacingFt)), 1);
      const plantsTotal = plantsPerBed * Math.max(Number(b.qty) || 1, 1);
      const issues = [];
      if (crop.key !== "mixed") {
        if (zone < crop.minZone || zone > crop.maxZone) issues.push(`zone ${zone} is outside recommended ${crop.minZone}-${crop.maxZone}`);
        if (sunHours < crop.minSunHours) issues.push(`needs ~${crop.minSunHours}+ sun hours (you set ${sunHours})`);
      }
      return { bedId: b.id, bedLabel: b.label, crop, plantsTotal, issues };
    });
    const issuesCount = bedsSummary.reduce((sum, row) => sum + row.issues.length, 0);
    return { bedsSummary, issuesCount };
  }, [beds, gardenSite.usdaZone, gardenSite.sunHours]);

  const irrigationPlan = useMemo(() => {
    const zones = Math.max(Number(irrigation.zones) || 1, 1);
    const rowSpacingFt = Math.max((Number(irrigation.rowSpacingIn) || 12) / 12, 0.5);
    const emitterSpacingIn = Math.max(Number(irrigation.emitterSpacingIn) || 12, 4);
    const emitterGph = Math.max(Number(irrigation.emitterGph) || 0.5, 0.1);
    const minutesPerDay = Math.max(Number(irrigation.minutesPerDay) || 1, 1);
    const daysPerWeek = Math.max(Number(irrigation.daysPerWeek) || 1, 1);
    let lateralFt = 0;
    let bedCount = 0;
    beds.forEach((b) => {
      const qty = Math.max(Number(b.qty) || 0, 0);
      if (!qty) return;
      const width = Math.max(Number(b.width) || 0.5, 0.5);
      const area = bedFootprintAreaSqft(b);
      const rowsPerBed = Math.max(Math.round(width / rowSpacingFt), 1);
      const rowRunFt = Math.max(area / (rowsPerBed * rowSpacingFt), 0.5);
      lateralFt += rowsPerBed * rowRunFt * qty;
      bedCount += qty;
    });
    const mainlineFt = round1((2 * (enclosure.width + enclosure.length)) * 0.55 + zones * 6);
    const emitterCount = irrigation.method === "drip" ? Math.ceil((lateralFt * 12) / emitterSpacingIn) : 0;
    const hoursPerWeek = (minutesPerDay / 60) * daysPerWeek;
    const soakerGphPerFt = 0.6;
    const gallonsPerWeek = round1((irrigation.method === "drip" ? emitterCount * emitterGph : lateralFt * soakerGphPerFt) * hoursPerWeek);
    return { enabled: !!irrigation.enabled, zones, lateralFt: round1(lateralFt), mainlineFt, emitterCount, gallonsPerWeek, rowSpacingFt, emitterSpacingIn };
  }, [beds, enclosure, irrigation]);

  // ---------- BOM calculation ----------
  const bom = useMemo(() => {
    const sections = [];

    // ---- Fencing: 4x4 wood posts on 6-8 ft spacing, cattle panel fencing, 2x6 top cap ----
    const perimeter = 2 * (enclosure.width + enclosure.length);
    const totalGateWidth = gates.reduce((s, g) => s + g.width, 0);
    const netFence = Math.max(perimeter - totalGateWidth, 0);

    const postLenNeeded = fenceHeight + 2; // 2 ft set in the ground
    const postStock = STOCK_LENGTHS.find((s) => s >= postLenNeeded) || 12;
    const postPrice = prices[`fencePost${postStock}`] || prices.fencePost8;
    const totalPosts = Math.ceil(netFence / postSpacing) + 1;
    const gatePostCount = gates.length * 2;

    const panelHeightFt = 50 / 12; // standard cattle panel: 16 ft x 50 in
    const panelsStacked = Math.max(Math.ceil(fenceHeight / panelHeightFt), 1);
    const panelRuns = Math.ceil(netFence / 16);
    const totalPanels = panelRuns * panelsStacked;
    const clipBoxes = Math.max(Math.ceil((netFence / 100) * panelsStacked), 1);

    const capTally = {};
    ["top", "bottom", "left", "right"].forEach((wall) => {
      const wl = wall === "top" || wall === "bottom" ? enclosure.width : enclosure.length;
      wallSegments(wl, gates.filter((g) => g.wall === wall)).forEach(([s, e]) => {
        const segLen = e - s;
        if (segLen <= 0) return;
        piecesForSide(segLen).forEach(({ length, qty }) => { capTally[length] = (capTally[length] || 0) + qty; });
      });
    });
    const capItems = Object.entries(capTally).filter(([, q]) => q > 0).map(([len, q]) => ({ desc: `2x6x${len} PT cap board (top rail)`, qty: q, unit: "ea", price: prices[`capBoard${len}`] }));

    const walkGates = gates.filter((g) => g.width <= 4);
    const driveGates = gates.filter((g) => g.width > 4);

    const fenceItems = [
      { desc: `Cattle panel, 16 ft x 50 in welded wire`, qty: totalPanels, unit: "ea", price: prices.cattlePanelEach },
      { desc: `4x4x${postStock} PT post, set 2 ft deep (line + corner, ~${postSpacing} ft spacing)`, qty: totalPosts, unit: "ea", price: postPrice },
      ...capItems,
      { desc: `Fence panel clips/brackets (box)`, qty: clipBoxes, unit: "box", price: prices.fenceClips },
    ];
    if (gates.length) fenceItems.push({ desc: `4x4x${postStock} PT gate post, set 2 ft deep (2 per gate)`, qty: gatePostCount, unit: "ea", price: postPrice });
    if (walkGates.length) fenceItems.push({ desc: `Walk gate kit (up to 4 ft, hinges + latch)`, qty: walkGates.length, unit: "kit", price: prices.gateKitWalk });
    if (driveGates.length) fenceItems.push({ desc: `Drive/double gate kit (>4 ft, hinges + latch + drop rod)`, qty: driveGates.length, unit: "kit", price: prices.gateKitDrive });
    sections.push({
      name: "Perimeter Fencing", icon: "fence", items: fenceItems,
      note: `Enclosure ${enclosure.width}×${enclosure.length} ft · perimeter ${round1(perimeter)} ft · ${fenceHeight} ft tall · posts every ~${postSpacing} ft · cattle panels stacked ${panelsStacked} high to reach height · 2x6 cap rail along the top · ${gates.length} gate${gates.length === 1 ? "" : "s"} (${round1(totalGateWidth)} ft of openings)`,
    });

    // ---- Raised beds: lumber, posts, screws, fabric, soil ----
    const lumberTally = {}; // length -> qty
    let cornerPieces = 0;
    let totalBedCount = 0;
    let totalBedAreaSqft = 0;
    let totalSoilCf = 0;
    let totalLinerAreaSqft = 0;
    const bedHeights = new Set();

    beds.forEach((b) => {
      const qty = Math.max(b.qty, 0);
      const bCourses = Math.max(b.courses || courses, 1);
      const bHeightFt = round1((bCourses * boardActualIn) / 12);
      bedHeights.add(bHeightFt);
      const fillHeightFt = Math.max(bHeightFt - 2 / 12, 0.5);
      const isL = b.shape === "L";
      const area = isL ? b.width * b.length - b.notchWidth * b.notchDepth : b.width * b.length;
      const sides = isL
        ? polygonEdgeLengths(lShapeVertices(b.width, b.length, b.notchWidth, b.notchDepth, b.notchCorner))
        : [b.width, b.width, b.length, b.length];
      const bedPerimeter = sides.reduce((s2, v) => s2 + v, 0);
      const cornersPerBed = isL ? 6 : 4;

      totalBedCount += qty;
      totalBedAreaSqft += area * qty;
      totalSoilCf += area * fillHeightFt * qty;
      totalLinerAreaSqft += bedPerimeter * bHeightFt * qty;
      cornerPieces += cornersPerBed * qty;
      for (let c = 0; c < bCourses; c++) {
        sides.forEach((s) => {
          piecesForSide(s).forEach(({ length, qty: pieceQty }) => {
            lumberTally[length] = (lumberTally[length] || 0) + pieceQty * qty;
          });
        });
      }
    });
    const heightNote = bedHeights.size > 1 ? `heights vary ${Math.min(...bedHeights)}–${Math.max(...bedHeights)} ft` : `wall height ≈ ${[...bedHeights][0] || bedWallHeightFt} ft`;

    const lumberItems = Object.entries(lumberTally)
      .filter(([, q]) => q > 0)
      .map(([len, q]) => ({ desc: `2x12x${len} pressure-treated board (bed walls)`, qty: q, unit: "ea", price: prices[`board${len}`] }));

    const postBoards = Math.ceil(cornerPieces / 2);
    const screwBoxes = Math.max(Math.ceil(totalBedCount / 2), totalBedCount > 0 ? 1 : 0);
    const fabricRolls = Math.max(Math.ceil(totalBedAreaSqft / 150), totalBedCount > 0 ? 1 : 0);
    const linerRolls = Math.max(Math.ceil(totalLinerAreaSqft / 100), totalBedCount > 0 ? 1 : 0);
    const hardwareClothRolls = Math.max(Math.ceil(totalBedAreaSqft / 75), totalBedCount > 0 ? 1 : 0);
    const screenMeshRolls = Math.max(Math.ceil(totalBedAreaSqft / 100), totalBedCount > 0 ? 1 : 0);
    const soilBags = Math.ceil(totalSoilCf / 1.5);
    const soilCY = totalSoilCf / 27;

    const bedItems = [
      ...lumberItems,
      { desc: `4x4x8 PT corner post (cut to bed height)`, qty: postBoards, unit: "ea", price: prices.post4x4x8 },
      { desc: `Exterior deck screws, 3" (5 lb box)`, qty: screwBoxes, unit: "box", price: prices.deckScrews },
      { desc: `Landscape/weed barrier fabric, under footprint (3x50 ft roll)`, qty: fabricRolls, unit: "roll", price: prices.fabricRoll },
      { desc: `Bed liner fabric, interior walls (4x25 ft roll)`, qty: linerRolls, unit: "roll", price: prices.linerRoll },
      { desc: `Galvanized hardware cloth, 1/2" — rodent barrier, stapled to bottom (3x25 ft roll)`, qty: hardwareClothRolls, unit: "roll", price: prices.hardwareClothRoll },
      { desc: `Fine screen mesh underlayment — covers bed bottoms to support soil above hardware cloth (4x25 ft roll)`, qty: screenMeshRolls, unit: "roll", price: prices.screenMeshRoll },
      { desc: `Raised bed soil mix (1.5 cf bag)`, qty: soilBags, unit: "bag", price: prices.soilBag },
    ];
    sections.push({
      name: "Raised Beds", icon: "sprout", items: bedItems,
      note: `${totalBedCount} bed${totalBedCount === 1 ? "" : "s"} · ${heightNote} · ${round1(totalSoilCf)} cf soil (${round1(soilCY)} cy) · liner covers interior walls; hardware cloth + screen mesh cover each bed bottom` + (soilCY > 2 ? " — consider bulk soil delivery instead of bags for large volumes" : ""),
    });

    // ---- Trellises: sized to match each bed's width, 6 or 8 ft tall ----
    let trellisCount = 0, trellisSqft = 0, trellisPosts = 0;
    beds.forEach((b) => {
      if (!b.trellis) return;
      const qty = Math.max(b.qty, 0);
      const h = b.trellisHeight || 6;
      trellisCount += qty;
      trellisSqft += (b.trellisSide === "length" ? b.length : b.width) * h * qty;
      trellisPosts += 2 * qty;
    });
    if (trellisCount > 0) {
      const trellisItems = [
        { desc: `Trellis support post (2x4)`, qty: trellisPosts, unit: "ea", price: prices.trellisPostEach },
        { desc: `Trellis wire/lattice mesh panel`, qty: round1(trellisSqft), unit: "sqft", price: prices.trellisMeshSqft },
        { desc: `Trellis mounting hardware (brackets/ties, per trellis)`, qty: trellisCount, unit: "set", price: prices.trellisHardwareEach },
      ];
      sections.push({ name: "Trellises", icon: "trellis", items: trellisItems, note: `${trellisCount} trellis${trellisCount === 1 ? "" : "es"}, each matching its bed's width, mounted along the back edge on top of the bed frame` });
    }

    // ---- Irrigation planner ----
    if (irrigationPlan.enabled && irrigationPlan.lateralFt > 0) {
      const totalTubeFt = irrigationPlan.mainlineFt + irrigationPlan.lateralFt;
      const mainlineRolls = Math.max(Math.ceil((irrigationPlan.mainlineFt * 1.1) / 100), 1);
      const lateralRolls = irrigation.method === "drip"
        ? Math.max(Math.ceil((irrigationPlan.lateralFt * 1.1) / 100), 1)
        : 0;
      const soakerRolls = irrigation.method === "soaker"
        ? Math.max(Math.ceil((irrigationPlan.lateralFt * 1.1) / 50), 1)
        : 0;
      const fittingPacks = Math.max(Math.ceil(totalTubeFt / 80), 1);
      const irrigationItems = [
        { desc: `Irrigation timer`, qty: 1, unit: "ea", price: prices.irrigationTimerEach },
        { desc: `Pressure regulator`, qty: 1, unit: "ea", price: prices.pressureRegulatorEach },
        { desc: `Inline sediment filter`, qty: 1, unit: "ea", price: prices.filterEach },
        { desc: `Backflow preventer`, qty: 1, unit: "ea", price: prices.backflowPreventerEach },
        { desc: `Zone valve`, qty: irrigationPlan.zones, unit: "ea", price: prices.zoneValveEach },
        { desc: `1/2" mainline poly tubing (100 ft roll)`, qty: mainlineRolls, unit: "roll", price: prices.dripMainlineRoll100 },
        { desc: `Drip/irrigation fittings pack (tees/elbows/couplers)`, qty: fittingPacks, unit: "pack", price: prices.dripFittingPack },
      ];
      if (irrigation.method === "drip") {
        irrigationItems.push(
          { desc: `1/4" drip tubing (100 ft roll)`, qty: lateralRolls, unit: "roll", price: prices.dripTubingRoll100 },
          { desc: `Drip emitters`, qty: irrigationPlan.emitterCount, unit: "ea", price: prices.dripEmitterEach },
        );
      } else {
        irrigationItems.push({ desc: `Soaker hose (50 ft)`, qty: soakerRolls, unit: "roll", price: prices.soakerHose50 });
      }
      sections.push({
        name: "Irrigation",
        icon: "droplets",
        items: irrigationItems,
        note: `${irrigation.method === "drip" ? "Drip" : "Soaker"} plan · ${irrigationPlan.zones} zone${irrigationPlan.zones === 1 ? "" : "s"} · ~${irrigationPlan.mainlineFt} ft mainline + ~${irrigationPlan.lateralFt} ft bed runs · est. ${irrigationPlan.gallonsPerWeek} gal/week`,
      });
    }

    // ---- Patios: ground surface + optional overhead structure, each independently customized ----
    patios.forEach((patio) => {
      const patioItems = [];
      const area = patio.width * patio.length;
      if (patio.surface === "pavers") {
        const paverCount = Math.ceil((area / 1.78) * 1.05);
        const baseCf = (area * 4) / 12;
        const baseBags = Math.ceil(baseCf / 0.5);
        const sandCf = (area * 0.5) / 12;
        const sandBags = Math.ceil(sandCf / 0.5);
        patioItems.push(
          { desc: `16x16 in concrete paver`, qty: paverCount, unit: "ea", price: prices.paver16 },
          { desc: `Paver base gravel (0.5 cf bag, 4" depth)`, qty: baseBags, unit: "bag", price: prices.paverBaseBag },
          { desc: `Paver leveling sand (0.5 cf bag)`, qty: sandBags, unit: "bag", price: prices.sandBag },
        );
      } else {
        const gravelCY = round1((area * 4) / 12 / 27 * 10) / 10;
        const fabricRollsPatio = Math.max(Math.ceil(area / 150), 1);
        patioItems.push(
          { desc: `Bulk gravel, 4" base (cubic yard)`, qty: Math.max(gravelCY, 0.5), unit: "cy", price: prices.gravelBulkCY },
          { desc: `Landscape fabric under gravel (3x50 ft roll)`, qty: fabricRollsPatio, unit: "roll", price: prices.fabricRoll },
        );
      }
      const st = STRUCTURE_TYPES[patio.structureType] || STRUCTURE_TYPES.none;
      if (patio.structureType !== "none") {
        const stLow = prices[st.lowKey], stHigh = prices[st.highKey];
        const low = area * stLow, high = area * stHigh;
        patioItems.push({ desc: `${st.label} kit (${patio.structureHeight || 8} ft, ${patio.roofStyle || "hip"} roof), rough estimate`, qty: 1, unit: "est.", price: (low + high) / 2, range: [low, high] });
        if (st.enclosed) patioItems.push({ desc: `Exterior door, prehung (${patio.doorWidth || 3} ft wide)`, qty: 1, unit: "ea", price: prices.exteriorDoorEach * ((patio.doorWidth || 3) > 3 ? 1.8 : 1) });
      }
      if (patio.furnishings) patioItems.push({ desc: `Outdoor table & chairs (sitting/eating area allowance)`, qty: 1, unit: "set", price: prices.furnishingsEach });
      const patioNote = `${area} sqft ${patio.surface} surface` + (patio.structureType !== "none" ? ` with a ${st.label.toLowerCase()} (${st.desc} Estimate range $${prices[st.lowKey]}–$${prices[st.highKey]}/sqft — highly variable by design; check local permit requirements and get a contractor quote.)` : " — no overhead structure");
      sections.push({ name: patio.label || "Patio", icon: "home", items: patioItems, note: patioNote });
    });

    // ---- Landscaping (outside the fence) ----
    if (landscape.length) {
      const lsItems = landscape.map((l) => {
        const t = LANDSCAPE_TYPES[l.type];
        let qty, unit = t.unit, price = prices[t.priceKey];
        if (t.unit === "ea") qty = Math.max(l.qty, 1);
        else if (t.unit === "cy") qty = Math.max(round1((l.width * l.length * (3 / 12) / 27) * 10) / 10, 0.1);
        else qty = round1(l.width * l.length);
        return { desc: `${l.label}${t.circle ? ` (${l.width} ft spread)` : l.type === "arch" ? ` (${l.width} ft wide x ${l.height || 7} ft tall)` : l.type === "doubleArch" ? ` (${l.width} ft wide x ${l.length} ft deep x ${l.height || 7} ft tall)` : l.type === "tunnel" ? ` (${l.width} ft span x ${l.height || 6} ft tall x ${l.length} ft wide)` : ` (${l.width}×${l.length} ft)`}`, qty, unit, price };
      });
      sections.push({ name: "Landscaping", icon: "leaf", items: lsItems, note: "Outside the fence — trees/shrubs priced per plant, beds/sod/paths priced per sqft, mulch by the cubic yard (3\" depth)." });
    }

    const withTotals = sections.map((s) => ({
      ...s,
      items: s.items.map((it) => ({ ...it, total: it.price * it.qty })),
      subtotal: s.items.reduce((sum, it) => sum + it.price * it.qty, 0),
    }));
    const grandTotal = withTotals.reduce((sum, s) => sum + s.subtotal, 0);

    return { sections: withTotals, grandTotal, perimeter, totalBedAreaSqft, totalBedCount };
  }, [enclosure, fenceHeight, postSpacing, gates, courses, beds, patios, landscape, prices, irrigation, irrigationPlan, bedWallHeightFt, boardActualIn]);

  // ---------- Layout: reads current positions; auto-arrange writes new ones ----------
  const layout = useMemo(() => {
    const placed = [];
    beds.forEach((b) => {
      (b.positions || []).forEach((pos, idx) => {
        const w = pos.rotated ? b.length : b.width;
        const h = pos.rotated ? b.width : b.length;
        placed.push({ bedId: b.id, idx, x: pos.x, y: pos.y, rotated: pos.rotated, width: b.width, length: b.length, shape: b.shape, notchWidth: b.notchWidth, notchDepth: b.notchDepth, notchCorner: b.notchCorner, courses: b.courses || courses, trellis: !!b.trellis, trellisHeight: b.trellisHeight || 6, trellisSide: b.trellisSide || "width", outOfBounds: pos.x < -yardMargin || pos.y < -yardMargin || pos.x + w > enclosure.width + yardMargin || pos.y + h > enclosure.length + yardMargin });
      });
    });
    const anyOOB = placed.some((p) => p.outOfBounds);
    const ringActive = beds.some((b) => b.zone === "perimeter");
    const inset = Math.min(perimeterInset, enclosure.width / 2 - 0.5, enclosure.length / 2 - 0.5);
    return { placed, fits: !anyOOB, ringActive, ringLine: { x: inset, y: inset, w: enclosure.width - 2 * inset, h: enclosure.length - 2 * inset } };
  }, [beds, enclosure, perimeterInset, courses, yardMargin]);

  function autoArrange() {
    const gap = 1.5, margin = 2;
    const taggedRing = [], taggedCenter = [];
    beds.forEach((b) => {
      for (let i = 0; i < b.qty; i++) {
        const item = { width: b.width, length: b.length, bedId: b.id, idx: i };
        (b.zone === "perimeter" ? taggedRing : taggedCenter).push(item);
      }
    });
    const inset = Math.min(perimeterInset, enclosure.width / 2 - 0.5, enclosure.length / 2 - 0.5);
    const ringX0 = inset, ringY0 = inset, ringX1 = enclosure.width - inset, ringY1 = enclosure.length - inset;
    const ringResult = taggedRing.length ? placeRing(taggedRing, ringX0, ringY0, ringX1, ringY1, gap) : { placed: [] };
    const ringDepth = taggedRing.length ? Math.max(0, ...ringResult.placed.map((b) => b.length)) : 0;
    const cx0 = taggedRing.length ? ringX0 + ringDepth + gap : margin;
    const cy0 = taggedRing.length ? ringY0 + ringDepth + gap : margin;
    const cx1 = taggedRing.length ? ringX1 - ringDepth - gap : enclosure.width - margin;
    const innerW = Math.max(cx1 - cx0, 1);
    let cursorX = cx0, cursorY = cy0, rowH = 0;
    // patios keep their own manually-placed positions — auto-arrange only affects beds
    const placedCenter = [];
    taggedCenter.forEach((bed) => {
      if (cursorX + bed.width > cx0 + innerW) { cursorX = cx0; cursorY += rowH + 2; rowH = 0; }
      placedCenter.push({ ...bed, x: cursorX, y: cursorY, rotated: false });
      cursorX += bed.width + 2;
      rowH = Math.max(rowH, bed.length);
    });
    const allPlaced = [...ringResult.placed, ...placedCenter];
    setBeds((bs) => bs.map((b) => {
      const mine = allPlaced.filter((p) => p.bedId === b.id).sort((a, c) => a.idx - c.idx).map((p) => ({ x: round1(p.x), y: round1(p.y), rotated: !!p.rotated }));
      return mine.length ? { ...b, positions: mine } : b;
    }));
  }
  useEffect(() => { autoArrange(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { refreshReports(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function refreshReports() {
    const names = new Set(Object.keys(sessionReportsRef.current));
    if (window.storage) {
      try {
        const res = await window.storage.list("reports:", false);
        const keys = (res && res.keys) || [];
        keys.forEach((k) => names.add(k.replace(/^reports:/, "")));
      } catch (e) { /* persistent storage unavailable — session list still works */ }
    }
    setSavedReports([...names].sort());
  }
  function buildSnapshot(includeTimestamp = true) {
    const snapshot = { enclosure, fenceHeight, postSpacing, gates, courses, beds, patios, yardMargin, landscape, prices, gardenSite, irrigation, renderQuality3d };
    if (includeTimestamp) snapshot.savedAt = new Date().toISOString();
    return snapshot;
  }
  function syncHistoryButtons() {
    const idx = historyIdxRef.current;
    const len = historyRef.current.length;
    setCanUndo(idx > 0);
    setCanRedo(idx >= 0 && idx < len - 1);
  }
  function pushHistorySnapshot(snapshot) {
    const serialized = JSON.stringify(snapshot);
    const currentSerialized = historyHashRef.current[historyIdxRef.current];
    if (serialized === currentSerialized) return;
    let nextHistory = historyRef.current.slice(0, historyIdxRef.current + 1);
    let nextHashes = historyHashRef.current.slice(0, historyIdxRef.current + 1);
    nextHistory.push(snapshot);
    nextHashes.push(serialized);
    const limit = 120;
    if (nextHistory.length > limit) {
      const trim = nextHistory.length - limit;
      nextHistory = nextHistory.slice(trim);
      nextHashes = nextHashes.slice(trim);
      historyIdxRef.current = Math.max(historyIdxRef.current - trim, -1);
    }
    historyRef.current = nextHistory;
    historyHashRef.current = nextHashes;
    historyIdxRef.current = nextHistory.length - 1;
    syncHistoryButtons();
  }
  function applyHistoryAt(index) {
    const next = historyRef.current[index];
    if (!next) return;
    historyIdxRef.current = index;
    skipNextHistoryRef.current = true;
    const snapshot = typeof structuredClone === "function" ? structuredClone(next) : JSON.parse(JSON.stringify(next));
    applySnapshot(snapshot);
    syncHistoryButtons();
  }
  function undoChange() {
    if (historyIdxRef.current <= 0) return;
    applyHistoryAt(historyIdxRef.current - 1);
    setSaveStatus("Undid last change");
    setSaveStatusType("ok");
    setTimeout(() => setSaveStatus(""), 1200);
  }
  function redoChange() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    applyHistoryAt(historyIdxRef.current + 1);
    setSaveStatus("Redid change");
    setSaveStatusType("ok");
    setTimeout(() => setSaveStatus(""), 1200);
  }
  async function saveReport() {
    const name = reportName.trim();
    if (!name) return;
    const snapshot = buildSnapshot();
    sessionReportsRef.current[name] = snapshot; // always succeeds, guarantees Save works this session
    let persisted = false;
    if (window.storage) {
      try {
        const res = await window.storage.set(`reports:${name}`, JSON.stringify(snapshot), false);
        persisted = !!res;
      } catch (e) { persisted = false; }
    }
    setSaveStatus(persisted ? `Saved "${name}"` : `Saved "${name}" (this session only — persistent storage isn't available here, so it won't survive a reload)`);
    setSaveStatusType(persisted ? "ok" : "warn");
    await refreshReports();
    setTimeout(() => setSaveStatus(""), persisted ? 2500 : 7000);
  }
  async function loadReport(name) {
    let data = null;
    if (window.storage) {
      try {
        const res = await window.storage.get(`reports:${name}`, false);
        if (res) data = JSON.parse(res.value);
      } catch (e) { /* fall through to session cache */ }
    }
    if (!data) data = sessionReportsRef.current[name];
    if (!data) { setSaveStatus(`Couldn't find "${name}"`); setSaveStatusType("error"); return; }
    applySnapshot(data);
    setReportName(name);
    setShowLoadMenu(false);
    setSaveStatus(`Loaded "${name}"`);
    setSaveStatusType("ok");
    setTimeout(() => setSaveStatus(""), 2500);
  }
  function loadSamplePlan(file) {
    const sample = SAMPLE_PLANS.find((p) => p.file === file);
    if (!sample) return;
    const snapshot = typeof structuredClone === "function"
      ? structuredClone(sample.data)
      : JSON.parse(JSON.stringify(sample.data));
    applySnapshot(snapshot);
    setReportName(sample.label);
    setShowLoadMenu(false);
    setSaveStatus(`Loaded sample plan "${sample.label}"`);
    setSaveStatusType("ok");
    setTimeout(() => setSaveStatus(""), 3000);
  }
  function applySnapshot(data) {
    if (data.enclosure) setEnclosure(data.enclosure);
    if (data.fenceHeight) setFenceHeight(data.fenceHeight);
    if (data.postSpacing) setPostSpacing(data.postSpacing);
    if (data.gates) setGates(data.gates);
    if (data.courses) setCourses(data.courses);
    if (data.beds) setBeds(data.beds);
    if (data.patios) setPatios(data.patios.map(normalizePatio));
    else if (data.includePatio && data.patio) setPatios([normalizePatio({ id: ++idCounter, label: "Patio A", structureHeight: 8, roofStyle: "hip", doorWidth: 3, ...data.patio })]); // back-compat with single-patio saves
    if (data.yardMargin) setYardMargin(data.yardMargin);
    if (data.landscape) setLandscape(data.landscape);
    if (data.prices) setPrices({ ...DEFAULT_PRICES, ...data.prices });
    if (data.gardenSite) setGardenSite({ usdaZone: 7, sunHours: 8, ...data.gardenSite });
    if (data.irrigation) setIrrigation({ enabled: true, method: "drip", zones: 2, rowSpacingIn: 12, emitterSpacingIn: 12, emitterGph: 0.5, minutesPerDay: 35, daysPerWeek: 4, ...data.irrigation });
    if (data.renderQuality3d) setRenderQuality3d(data.renderQuality3d);
    setPlanCamera({ zoom: 1, panX: 0, panY: 0 }); // refit 2D viewport to show full enclosure + yard when loading
    camStateRef.current = { theta: 0.8, phi: 1.0, radius: null };
    const allIds = [...(data.beds || []).map((b) => b.id), ...(data.gates || []).map((g) => g.id), ...(data.landscape || []).map((l) => l.id), ...(data.patios || []).map((p) => p.id), idCounter];
    idCounter = Math.max(...allIds);
    setSelected(null);
  }
  useEffect(() => {
    const snapshot = buildSnapshot(false);
    if (!historyReadyRef.current) {
      historyRef.current = [snapshot];
      historyHashRef.current = [JSON.stringify(snapshot)];
      historyIdxRef.current = 0;
      historyReadyRef.current = true;
      syncHistoryButtons();
      return;
    }
    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false;
      return;
    }
    pushHistorySnapshot(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enclosure, fenceHeight, postSpacing, gates, courses, beds, patios, yardMargin, landscape, prices, gardenSite, irrigation, renderQuality3d]);

  useEffect(() => {
    function onUndoRedoHotkeys(e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redoChange();
      else undoChange();
    }
    window.addEventListener("keydown", onUndoRedoHotkeys);
    return () => window.removeEventListener("keydown", onUndoRedoHotkeys);
  }, []);
  // "Save As" / "Load from file" — the artifact sandbox often blocks direct filesystem
  // access (showSaveFilePicker / <a download>) outright, with no error to catch, so those
  // can silently do nothing. Copy/paste to a text file is the one path guaranteed to work
  // regardless of sandbox restrictions, so it's the primary method; native APIs are tried
  // first as a bonus when the browser/context actually allows them.
  function openExportPanel() {
    setExportText(JSON.stringify(buildSnapshot(), null, 2));
    setImportText("");
    setFilePanel("export");
  }
  function openImportPanel() {
    setExportText("");
    setImportText("");
    setFilePanel("import");
  }
  function closeFilePanel() { setFilePanel(null); }
  async function tryNativeSaveDialog() {
    const json = exportText || JSON.stringify(buildSnapshot(), null, 2);
    const filename = `${(reportName.trim() || "garden-design").replace(/[^\w\- ]/g, "")}.json`;
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: "Garden design", accept: { "application/json": [".json"] } }] });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        setSaveStatus(`Saved to "${handle.name}"`); setSaveStatusType("ok");
        setTimeout(() => setSaveStatus(""), 2500);
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSaveStatus(`Download triggered for "${filename}" — if nothing appeared, use Copy to Clipboard below instead`); setSaveStatusType("warn");
    } catch (e) {
      setSaveStatus("Direct download isn't available here — use Copy to Clipboard below and save it yourself"); setSaveStatusType("warn");
    }
    setTimeout(() => setSaveStatus(""), 6000);
  }
  function copyExportText() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(exportText).then(() => {
        setSaveStatus('Copied — paste into a text editor and save as "yourname.json"'); setSaveStatusType("ok");
        setTimeout(() => setSaveStatus(""), 4000);
      }).catch(() => {
        setSaveStatus("Couldn't auto-copy — click inside the box below and copy manually (Ctrl/Cmd+C)"); setSaveStatusType("warn");
      });
    } else {
      setSaveStatus("Click inside the box below and copy manually (Ctrl/Cmd+C)"); setSaveStatusType("warn");
    }
  }
  function triggerFileLoad() { fileInputRef.current?.click(); }
  function onFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        applySnapshot(data);
        setReportName(file.name.replace(/\.json$/i, ""));
        setSaveStatus(`Loaded from "${file.name}"`); setSaveStatusType("ok");
        setFilePanel(null);
      } catch (err) {
        setSaveStatus("Couldn't read that file — try pasting its contents into the box below instead"); setSaveStatusType("error");
      }
      setTimeout(() => setSaveStatus(""), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }
  function applyImportText() {
    try {
      const data = JSON.parse(importText);
      applySnapshot(data);
      if (!reportName.trim()) setReportName("Imported design");
      setSaveStatus("Design loaded from pasted text"); setSaveStatusType("ok");
      setFilePanel(null);
    } catch (e) {
      setSaveStatus("Couldn't parse that text — make sure you pasted the whole JSON, starting with { and ending with }"); setSaveStatusType("error");
    }
    setTimeout(() => setSaveStatus(""), 4000);
  }
  async function deleteReport(name) {
    delete sessionReportsRef.current[name];
    if (window.storage) {
      try { await window.storage.delete(`reports:${name}`, false); } catch (e) { /* ignore */ }
    }
    await refreshReports();
  }
  function handlePrint() {
    setViewMode("2d");
    setSelected(null);
    setShowLoadMenu(false);
    setTimeout(() => window.print(), 200);
  }
  useEffect(() => {
    setGates((gs) => gs.map((g) => {
      const wl = wallLength(g.wall);
      const width = Math.min(g.width, Math.max(wl - 0.5, 1));
      const offset = Math.max(0, Math.min(g.offset, wl - width));
      return { ...g, width, offset };
    }));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [enclosure.width, enclosure.length]);

  function svgPoint(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }
  function startDrag(e, kind, bedId, idx, w, h, rotated) {
    e.preventDefault(); e.stopPropagation();
    const p = svgPoint(e.clientX, e.clientY);
    const curX = kind === "patio" ? patios.find((pt) => pt.id === bedId).x : kind === "landscape" ? landscape.find((l) => l.id === bedId).x : (beds.find((b) => b.id === bedId).positions[idx].x);
    const curY = kind === "patio" ? patios.find((pt) => pt.id === bedId).y : kind === "landscape" ? landscape.find((l) => l.id === bedId).y : (beds.find((b) => b.id === bedId).positions[idx].y);
    dragRef.current = { kind, bedId, idx, offX: p.x - curX, offY: p.y - curY, w, h, rotated, moved: false, startX: p.x, startY: p.y };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  }
  function onDragMove(e) {
    const info = dragRef.current; if (!info) return;
    const p = svgPoint(e.clientX, e.clientY);
    if (!info.moved && Math.hypot(p.x - info.startX, p.y - info.startY) < 0.1) return; // ignore tiny jitter so plain clicks register as selection
    info.moved = true;
    setDragKey(info.kind === "patio" ? `pt-${info.bedId}` : info.kind === "landscape" ? `ls-${info.bedId}` : `${info.bedId}-${info.idx}`);
    const boxW = info.rotated ? info.h : info.w;
    const boxH = info.rotated ? info.w : info.h;
    // beds, patios, and landscape items may all be placed anywhere in the yard now,
    // including outside the fence
    const nx = round1(Math.max(-yardMargin, Math.min(p.x - info.offX, enclosure.width + yardMargin - boxW)));
    const ny = round1(Math.max(-yardMargin, Math.min(p.y - info.offY, enclosure.length + yardMargin - boxH)));
    if (info.kind === "bed") {
      setBeds((bs) => bs.map((b) => b.id === info.bedId ? { ...b, positions: b.positions.map((pos, i) => i === info.idx ? { ...pos, x: nx, y: ny } : pos) } : b));
      return;
    }
    if (info.kind === "patio") { setPatios((ps) => ps.map((pt) => (pt.id === info.bedId ? { ...pt, x: nx, y: ny } : pt))); return; }
    setLandscape((ls) => ls.map((l) => (l.id === info.bedId ? { ...l, x: nx, y: ny } : l)));
  }
  function onDragEnd() {
    const info = dragRef.current;
    if (info && !info.moved) setSelected({ kind: info.kind, bedId: info.bedId, idx: info.idx });
    dragRef.current = null; setDragKey(null);
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }
  function rotateBed(bedId, idx) {
    setBeds((bs) => bs.map((b) => {
      if (b.id !== bedId) return b;
      return { ...b, positions: b.positions.map((pos, i) => i === idx ? { ...pos, rotated: !pos.rotated } : pos) };
    }));
  }
  function nudge(dx, dy) {
    if (!selected) return;
    if (selected.kind === "patio") {
      setPatios((ps) => ps.map((pt) => pt.id === selected.bedId ? { ...pt, x: round1(Math.max(-yardMargin, Math.min(pt.x + dx, enclosure.width + yardMargin - pt.width))), y: round1(Math.max(-yardMargin, Math.min(pt.y + dy, enclosure.length + yardMargin - pt.length))) } : pt));
      return;
    }
    if (selected.kind === "landscape") {
      setLandscape((ls) => ls.map((l) => l.id === selected.bedId ? { ...l, x: round1(Math.max(-yardMargin, Math.min(l.x + dx, enclosure.width + yardMargin - l.width))), y: round1(Math.max(-yardMargin, Math.min(l.y + dy, enclosure.length + yardMargin - l.length))) } : l));
      return;
    }
    setBeds((bs) => bs.map((b) => {
      if (b.id !== selected.bedId) return b;
      return {
        ...b, positions: b.positions.map((pos, i) => {
          if (i !== selected.idx) return pos;
          const w = pos.rotated ? b.length : b.width;
          const h = pos.rotated ? b.width : b.length;
          return { ...pos, x: round1(Math.max(-yardMargin, Math.min(pos.x + dx, enclosure.width + yardMargin - w))), y: round1(Math.max(-yardMargin, Math.min(pos.y + dy, enclosure.length + yardMargin - h))) };
        }),
      };
    }));
  }
  useEffect(() => {
    function onKey(e) {
      if (!selected) return;
      if (e.key === "Escape") { setSelected(null); return; }
      const map = { ArrowLeft: [-nudgeStep, 0], ArrowRight: [nudgeStep, 0], ArrowUp: [0, -nudgeStep], ArrowDown: [0, nudgeStep] };
      if (map[e.key]) { e.preventDefault(); nudge(...map[e.key]); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, nudgeStep, beds, patios, landscape, enclosure, yardMargin]);

  // ---------- 3D preview (Three.js) ----------
  useEffect(() => {
    if (viewMode !== "3d" || !threeContainerRef.current) return;
    const container = threeContainerRef.current;
    container.innerHTML = "";
    const cinematic = renderQuality3d === "cinematic";
    const W = enclosure.width, L = enclosure.length;
    const width = container.clientWidth || 600, height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cinematic ? "#B8D2C2" : "#BFE3D0");
    scene.fog = new THREE.Fog(cinematic ? "#B8D2C2" : "#BFE3D0", Math.max(W, L) * 1.3, Math.max(W, L) * 4.2);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cinematic ? 2 : 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = cinematic ? 1.03 : 1.08;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = cinematic;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const mkMat = (params = {}) => {
      const { clearcoat, transmission, ...shared } = params;
      if (cinematic) {
        return new THREE.MeshPhysicalMaterial({
          roughness: 0.82,
          metalness: 0.03,
          clearcoat: 0.04,
          ...shared,
          ...(clearcoat !== undefined ? { clearcoat } : {}),
          ...(transmission !== undefined ? { transmission } : {}),
        });
      }
      return new THREE.MeshStandardMaterial(shared);
    };

    scene.add(new THREE.AmbientLight(0xffffff, cinematic ? 0.4 : 0.65));
    const skyFill = new THREE.HemisphereLight(0xd6e8ff, 0x6c7a63, cinematic ? 0.72 : 0.45);
    scene.add(skyFill);
    const sun = new THREE.DirectionalLight(0xfff5e8, cinematic ? 1.45 : 0.85);
    sun.position.set(W * 0.6, Math.max(W, L) * 0.9, L * 0.4);
    sun.castShadow = cinematic;
    if (cinematic) {
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.bias = -0.00012;
      sun.shadow.normalBias = 0.01;
      const range = Math.max(W + yardMargin, L + yardMargin) * 1.1;
      sun.shadow.camera.left = -range;
      sun.shadow.camera.right = range;
      sun.shadow.camera.top = range;
      sun.shadow.camera.bottom = -range;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = Math.max(W, L) * 6;
    }
    scene.add(sun);

    const groundSize = Math.max(W + 2 * yardMargin, L + 2 * yardMargin) * 1.8;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      mkMat({ color: "#82A96B", roughness: cinematic ? 0.92 : 0.86, metalness: 0.0, clearcoat: 0.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = cinematic;
    scene.add(ground);

    // ---- fence walls + posts (with gaps at gate openings) ----
    const capMat = mkMat({ color: "#B98956", roughness: 0.82, metalness: 0.02, clearcoat: 0.1 });
    const fenceSkirtMat = mkMat({ color: "#C89C66", roughness: 0.76, metalness: 0.02, clearcoat: 0.08 });
    const fenceWireMat = new THREE.LineBasicMaterial({ color: "#6C746D", transparent: true, opacity: cinematic ? 0.5 : 0.38 });
    const fenceSkirtH = Math.min(Math.max(fenceHeight * 0.35, 1.6), 2.6);
    function fencePanel(len, h, spacing = 1, material = null) {
      const pts = [];
      const nx = Math.max(1, Math.round(len / spacing)), ny = Math.max(1, Math.round(h / spacing));
      for (let i = 0; i <= nx; i++) { const x = (i / nx) * len; pts.push(x, 0, 0, x, h, 0); }
      for (let j = 0; j <= ny; j++) { const y = (j / ny) * h; pts.push(0, y, 0, len, y, 0); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      return new THREE.LineSegments(geo, material || new THREE.LineBasicMaterial({ color: "#6B4A2E", transparent: true, opacity: 0.55 }));
    }
    function addWallSegments(wall, wallLen, worldStart, axis) {
      // axis: 'x' for top/bottom walls (run along world X), 'z' for left/right (run along world Z)
      const segs = wallSegments(wallLen, gates.filter((g) => g.wall === wall));
      segs.forEach(([s, e]) => {
        const segLen = e - s;
        if (segLen <= 0) return;
        const meshH = Math.max(fenceHeight - fenceSkirtH, 0.5);
        const skirt = new THREE.Mesh(
          new THREE.BoxGeometry(axis === "x" ? segLen : 0.36, fenceSkirtH, axis === "x" ? 0.36 : segLen),
          fenceSkirtMat
        );
        const midRail = new THREE.Mesh(
          new THREE.BoxGeometry(axis === "x" ? segLen : 0.28, 0.12, axis === "x" ? 0.28 : segLen),
          capMat
        );
        const panel = fencePanel(segLen, meshH, 0.45, fenceWireMat);
        if (axis === "x") {
          skirt.position.set(worldStart.x + s + segLen / 2, fenceSkirtH / 2, worldStart.z);
          midRail.position.set(worldStart.x + s + segLen / 2, fenceSkirtH + 0.06, worldStart.z);
          panel.position.set(worldStart.x + s, fenceSkirtH, worldStart.z);
        } else {
          skirt.position.set(worldStart.x, fenceSkirtH / 2, worldStart.z + s + segLen / 2);
          midRail.position.set(worldStart.x, fenceSkirtH + 0.06, worldStart.z + s + segLen / 2);
          panel.rotation.y = -Math.PI / 2;
          panel.position.set(worldStart.x, fenceSkirtH, worldStart.z + s);
        }
        scene.add(skirt);
        scene.add(midRail);
        scene.add(panel);
      });
    }
    addWallSegments("top", W, { x: -W / 2, z: -L / 2 }, "x");
    addWallSegments("bottom", W, { x: -W / 2, z: L / 2 }, "x");
    addWallSegments("left", L, { x: -W / 2, z: -L / 2 }, "z");
    addWallSegments("right", L, { x: W / 2, z: -L / 2 }, "z");

    // 2x6 top cap rail along the fence (skips gate openings) — laid flat, wide face up
    function addCapSegments(wall, wallLen, worldStart, axis) {
      wallSegments(wallLen, gates.filter((g) => g.wall === wall)).forEach(([s, e]) => {
        const segLen = e - s;
        if (segLen <= 0) return;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(axis === "x" ? segLen : 0.46, 0.14, axis === "x" ? 0.46 : segLen), capMat);
        if (axis === "x") cap.position.set(worldStart.x + s + segLen / 2, fenceHeight + 0.07, worldStart.z);
        else cap.position.set(worldStart.x, fenceHeight + 0.07, worldStart.z + s + segLen / 2);
        scene.add(cap);
      });
    }
    addCapSegments("top", W, { x: -W / 2, z: -L / 2 }, "x");
    addCapSegments("bottom", W, { x: -W / 2, z: L / 2 }, "x");
    addCapSegments("left", L, { x: -W / 2, z: -L / 2 }, "z");
    addCapSegments("right", L, { x: W / 2, z: -L / 2 }, "z");

    // gate posts (taller marker so gate openings are visible)
    const gatePostMat = mkMat({ color: "#C99A2E", roughness: 0.55, metalness: 0.24, clearcoat: 0.08 });
    gates.forEach((g) => {
      const ep = gateEndpoints(g);
      [[ep.x1, ep.y1], [ep.x2, ep.y2]].forEach(([px, py]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.33, fenceHeight, 0.33), gatePostMat);
        post.position.set(px - W / 2, fenceHeight / 2, py - L / 2);
        scene.add(post);
      });
    });

    const postMat = mkMat({ color: "#6B4A2E", roughness: 0.84, metalness: 0.02, clearcoat: 0.08 });
    fencePosts.forEach((p) => {
      const inGate = gates.some((g) => g.wall === p.wall && p.wallOffset > g.offset && p.wallOffset < g.offset + g.width);
      if (inGate) return;
      const postSize = p.isCorner ? 0.42 : 0.33;
      const post = new THREE.Mesh(new THREE.BoxGeometry(postSize, fenceHeight, postSize), postMat);
      post.position.set(p.x - W / 2, fenceHeight / 2, p.y - L / 2);
      scene.add(post);
    });

    // ---- raised beds: cedar frame + mounded soil + planted rows (simplified as rectangular footprints — see 2D plan for exact L-shape geometry) ----
    const frameMat = mkMat({ color: cinematic ? "#C6935D" : "#8A6A45", roughness: 0.81, metalness: 0.03, clearcoat: 0.1 });
    const frameSeamMat = mkMat({ color: "#9A6E42", roughness: 0.9, metalness: 0.01 });
    const soilMat = mkMat({ color: "#4A3626", roughness: 1, metalness: 0, clearcoat: 0 });
    const plantColors = ["#6B9950", "#8FBF6E", "#5E8A46"];
    const wallThickness = 0.15;
    const bedCapDepth = 0.22;
    const bedCapThickness = 0.07;
    const bedCageMat = mkMat({ color: "#A87A49", roughness: 0.82, metalness: 0.02, clearcoat: 0.08 });
    const bedCageWireMat = new THREE.LineBasicMaterial({ color: "#828a84", transparent: true, opacity: cinematic ? 0.5 : 0.36 });
    function addBedProtectionCage(wx0, wz0, cw, cl, h, cageH) {
      const postSize = 0.14;
      const postInset = 0.14;
      const railH = h + cageH;
      const meshH = Math.max(cageH - 0.28, 0.5);
      const corners = [
        [wx0 + postInset, wz0 + postInset],
        [wx0 + cw - postInset, wz0 + postInset],
        [wx0 + postInset, wz0 + cl - postInset],
        [wx0 + cw - postInset, wz0 + cl - postInset],
      ];
      corners.forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(postSize, cageH, postSize), bedCageMat);
        post.position.set(px, h + cageH / 2, pz);
        scene.add(post);
      });
      const railFront = new THREE.Mesh(new THREE.BoxGeometry(Math.max(cw - 2 * postInset, 0.4), 0.1, 0.12), bedCageMat);
      railFront.position.set(wx0 + cw / 2, railH, wz0 + postInset);
      scene.add(railFront);
      const railBack = new THREE.Mesh(new THREE.BoxGeometry(Math.max(cw - 2 * postInset, 0.4), 0.1, 0.12), bedCageMat);
      railBack.position.set(wx0 + cw / 2, railH, wz0 + cl - postInset);
      scene.add(railBack);
      const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, Math.max(cl - 2 * postInset, 0.4)), bedCageMat);
      railLeft.position.set(wx0 + postInset, railH, wz0 + cl / 2);
      scene.add(railLeft);
      const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, Math.max(cl - 2 * postInset, 0.4)), bedCageMat);
      railRight.position.set(wx0 + cw - postInset, railH, wz0 + cl / 2);
      scene.add(railRight);
      const frontMesh = fencePanel(cw - 2 * postInset, meshH, 0.38, bedCageWireMat);
      frontMesh.position.set(wx0 + postInset, h + 0.12, wz0 + postInset);
      scene.add(frontMesh);
      const backMesh = fencePanel(cw - 2 * postInset, meshH, 0.38, bedCageWireMat);
      backMesh.position.set(wx0 + postInset, h + 0.12, wz0 + cl - postInset);
      scene.add(backMesh);
      const leftMesh = fencePanel(cl - 2 * postInset, meshH, 0.38, bedCageWireMat);
      leftMesh.rotation.y = -Math.PI / 2;
      leftMesh.position.set(wx0 + postInset, h + 0.12, wz0 + postInset);
      scene.add(leftMesh);
      const rightMesh = fencePanel(cl - 2 * postInset, meshH, 0.38, bedCageWireMat);
      rightMesh.rotation.y = -Math.PI / 2;
      rightMesh.position.set(wx0 + cw - postInset, h + 0.12, wz0 + postInset);
      scene.add(rightMesh);
    }
    layout.placed.forEach((b) => {
      const cw = b.rotated ? b.length : b.width;
      const cl = b.rotated ? b.width : b.length;
      const h = round1((b.courses * boardActualIn) / 12);
      const wx0 = b.x - W / 2, wz0 = b.y - L / 2; // world position of the bed's plan corner

      // hollow frame (4 thin walls) so it reads as a bed, not a solid block
      const front = new THREE.Mesh(new THREE.BoxGeometry(cw, h, wallThickness), frameMat);
      front.position.set(wx0 + cw / 2, h / 2, wz0 + wallThickness / 2);
      scene.add(front);
      const back = new THREE.Mesh(new THREE.BoxGeometry(cw, h, wallThickness), frameMat);
      back.position.set(wx0 + cw / 2, h / 2, wz0 + cl - wallThickness / 2);
      scene.add(back);
      const leftW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, cl), frameMat);
      leftW.position.set(wx0 + wallThickness / 2, h / 2, wz0 + cl / 2);
      scene.add(leftW);
      const rightW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, h, cl), frameMat);
      rightW.position.set(wx0 + cw - wallThickness / 2, h / 2, wz0 + cl / 2);
      scene.add(rightW);
      const capFront = new THREE.Mesh(new THREE.BoxGeometry(cw + 0.08, bedCapThickness, bedCapDepth), frameMat);
      capFront.position.set(wx0 + cw / 2, h + bedCapThickness / 2, wz0 + bedCapDepth / 2);
      scene.add(capFront);
      const capBack = new THREE.Mesh(new THREE.BoxGeometry(cw + 0.08, bedCapThickness, bedCapDepth), frameMat);
      capBack.position.set(wx0 + cw / 2, h + bedCapThickness / 2, wz0 + cl - bedCapDepth / 2);
      scene.add(capBack);
      const capLeft = new THREE.Mesh(new THREE.BoxGeometry(bedCapDepth, bedCapThickness, cl + 0.08), frameMat);
      capLeft.position.set(wx0 + bedCapDepth / 2, h + bedCapThickness / 2, wz0 + cl / 2);
      scene.add(capLeft);
      const capRight = new THREE.Mesh(new THREE.BoxGeometry(bedCapDepth, bedCapThickness, cl + 0.08), frameMat);
      capRight.position.set(wx0 + cw - bedCapDepth / 2, h + bedCapThickness / 2, wz0 + cl / 2);
      scene.add(capRight);
      const seamCount = Math.max(1, Number(b.courses) || 1);
      for (let si = 1; si < seamCount; si++) {
        const seamY = (h * si) / seamCount;
        const seamFront = new THREE.Mesh(new THREE.BoxGeometry(cw - 0.02, 0.03, 0.04), frameSeamMat);
        seamFront.position.set(wx0 + cw / 2, seamY, wz0 + wallThickness + 0.02);
        scene.add(seamFront);
        const seamBack = new THREE.Mesh(new THREE.BoxGeometry(cw - 0.02, 0.03, 0.04), frameSeamMat);
        seamBack.position.set(wx0 + cw / 2, seamY, wz0 + cl - wallThickness - 0.02);
        scene.add(seamBack);
        const seamLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, cl - 0.02), frameSeamMat);
        seamLeft.position.set(wx0 + wallThickness + 0.02, seamY, wz0 + cl / 2);
        scene.add(seamLeft);
        const seamRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, cl - 0.02), frameSeamMat);
        seamRight.position.set(wx0 + cw - wallThickness - 0.02, seamY, wz0 + cl / 2);
        scene.add(seamRight);
      }

      // mounded soil, sitting just proud of the rim
      const soil = new THREE.Mesh(new THREE.BoxGeometry(Math.max(cw - 2 * wallThickness, 0.1), 0.14, Math.max(cl - 2 * wallThickness, 0.1)), soilMat);
      soil.position.set(wx0 + cw / 2, h - 0.02, wz0 + cl / 2);
      scene.add(soil);

      // small planted-row markers
      plantDots(cw, cl, false, null).forEach(([lx, lz], i) => {
        const plant = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 6), mkMat({ color: plantColors[i % plantColors.length], roughness: 0.95, metalness: 0 }));
        plant.position.set(wx0 + lx, h + 0.12, wz0 + lz);
        scene.add(plant);
      });

      if (cinematic) {
        // Photo-style raised-bed guard frame and wire mesh.
        const cageH = clamp(numOr(b.trellisHeight, 6) - 0.6, 3.5, 7);
        addBedProtectionCage(wx0, wz0, cw, cl, h, cageH);
      }

      // trellis — matches this bed's chosen dimension (width or length), mounted on top of the frame
      if (b.trellis && !cinematic) {
        const trellisH = b.trellisHeight || 6;
        const trellisMat = mkMat({ color: "#6B4A2E", roughness: 0.86, metalness: 0.02, clearcoat: 0.07 });
        const isLengthSide = b.trellisSide === "length";
        const span = isLengthSide ? cl : cw;
        const panel = fencePanel(span, trellisH);
        panel.material = new THREE.LineBasicMaterial({ color: "#5C7A57", transparent: true, opacity: 0.7 });
        if (isLengthSide) {
          panel.rotation.y = -Math.PI / 2;
          panel.position.set(wx0 + cw, h, wz0);
        } else {
          panel.position.set(wx0, h, wz0 + cl);
        }
        scene.add(panel);
        const postPts = isLengthSide
          ? [[wx0 + cw, wz0], [wx0 + cw, wz0 + cl]]
          : [[wx0, wz0 + cl], [wx0 + cw, wz0 + cl]];
        postPts.forEach(([px, pz]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, trellisH, 0.14), trellisMat);
          post.position.set(px, h + trellisH / 2, pz);
          scene.add(post);
        });
      }
    });

    // ---- patios ----
    patios.forEach((patio) => {
      const patioColor = patio.surface === "gravel" ? "#B9AF9C" : "#D9C9A8";
      const slab = new THREE.Mesh(new THREE.BoxGeometry(patio.width, 0.08, patio.length), mkMat({ color: patioColor, roughness: patio.surface === "gravel" ? 0.95 : 0.72, metalness: 0.02 }));
      slab.position.set(patio.x + patio.width / 2 - W / 2, 0.04, patio.y + patio.length / 2 - L / 2);
      scene.add(slab);
      if (patio.structureType !== "none") {
        const postMat3 = mkMat({ color: "#6B4A2E", roughness: 0.84, metalness: 0.03, clearcoat: 0.08 });
        const roofColor = patio.structureType === "gazebo" ? "#7A5637" : "#5C4A38";
        const postH = patio.structureHeight || 8, inset = 0.6;
        const wx0 = patio.x - W / 2, wz0 = patio.y - L / 2;
        if (patio.structureType === "cabin") {
          // corner posts sit flush with the wall corners (not inset like the open
          // structures) so they actually frame the building instead of floating inside it
          [[wx0, wz0], [wx0 + patio.width, wz0], [wx0, wz0 + patio.length], [wx0 + patio.width, wz0 + patio.length]].forEach(([px, pz]) => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.33, postH, 0.33), postMat3);
            post.position.set(px, postH / 2, pz);
            scene.add(post);
          });
        } else {
          const corners = [
            [patio.x + inset, patio.y + inset], [patio.x + patio.width - inset, patio.y + inset],
            [patio.x + inset, patio.y + patio.length - inset], [patio.x + patio.width - inset, patio.y + patio.length - inset],
          ];
          corners.forEach(([px, py]) => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.33, postH, 0.33), postMat3);
            post.position.set(px - W / 2, postH / 2, py - L / 2);
            scene.add(post);
          });
        }
        if (patio.structureType === "cabin") {
          // actual walls with a door gap and windows, not just posts+roof — a real small building
          const wallH = postH, wallT = 0.18, doorW = patio.doorWidth || 3, doorH = Math.min(6.5, wallH - 0.8);
          const wallMat = mkMat({ color: "#D8CDB0", roughness: 0.7, metalness: 0.01 });
          const doorMat = mkMat({ color: "#4A3626", roughness: 0.85, metalness: 0.01, clearcoat: 0.06 });
          const windowMat = mkMat({ color: "#BFDDE0", roughness: 0.15, metalness: 0.05, transmission: cinematic ? 0.48 : 0.0, opacity: cinematic ? 0.85 : 1, transparent: cinematic });
          const midX = patio.width / 2;
          const segW = Math.max(midX - doorW / 2, 0.3);
          const frontL = new THREE.Mesh(new THREE.BoxGeometry(segW, wallH, wallT), wallMat);
          frontL.position.set(wx0 + segW / 2, wallH / 2, wz0);
          scene.add(frontL);
          const frontR = new THREE.Mesh(new THREE.BoxGeometry(segW, wallH, wallT), wallMat);
          frontR.position.set(wx0 + patio.width - segW / 2, wallH / 2, wz0);
          scene.add(frontR);
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, Math.max(wallH - doorH, 0.2), wallT), wallMat);
          lintel.position.set(wx0 + midX, doorH + Math.max(wallH - doorH, 0.2) / 2, wz0);
          scene.add(lintel);
          const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.4, doorH - 0.2, 0.06), doorMat);
          doorLeaf.position.set(wx0 + midX, (doorH - 0.2) / 2 + 0.1, wz0 + 0.03);
          scene.add(doorLeaf);
          const back = new THREE.Mesh(new THREE.BoxGeometry(patio.width, wallH, wallT), wallMat);
          back.position.set(wx0 + patio.width / 2, wallH / 2, wz0 + patio.length);
          scene.add(back);
          const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, patio.length), wallMat);
          leftWall.position.set(wx0, wallH / 2, wz0 + patio.length / 2);
          scene.add(leftWall);
          const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, patio.length), wallMat);
          rightWall.position.set(wx0 + patio.width, wallH / 2, wz0 + patio.length / 2);
          scene.add(rightWall);
          // simple windows on the side walls, sized to whatever fits
          const winSize = Math.min(1.8, patio.length * 0.3);
          if (patio.length > 4) {
            [wz0 + patio.length * 0.3, wz0 + patio.length * 0.7].forEach((wzPos) => {
              const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, winSize, winSize), windowMat);
              win.position.set(wx0, wallH * 0.55, wzPos);
              scene.add(win);
              const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, winSize, winSize), windowMat);
              win2.position.set(wx0 + patio.width, wallH * 0.55, wzPos);
              scene.add(win2);
            });
          }
        }
        if (patio.structureType === "pergola" || patio.structureType === "arbor") {
          const beamCount = Math.max(Math.round(patio.length / 1.2), 3);
          for (let i = 0; i <= beamCount; i++) {
            const bz = patio.y + inset + (i / beamCount) * (patio.length - 2 * inset);
            const beam = new THREE.Mesh(new THREE.BoxGeometry(patio.width - 2 * inset + 0.6, 0.14, 0.2), mkMat({ color: roofColor, roughness: 0.82, metalness: 0.03, clearcoat: 0.05 }));
            beam.position.set(patio.x + patio.width / 2 - W / 2, postH + 0.1, bz - L / 2);
            scene.add(beam);
          }
        } else if (patio.roofStyle === "flat") {
          const roof = new THREE.Mesh(new THREE.BoxGeometry(patio.width + 0.6, 0.15, patio.length + 0.6), mkMat({ color: roofColor, roughness: 0.78, metalness: 0.04 }));
          roof.position.set(patio.x + patio.width / 2 - W / 2, postH + 0.1, patio.y + patio.length / 2 - L / 2);
          scene.add(roof);
        } else if (patio.roofStyle === "gable") {
          // real two-panel ridge roof, sized to the actual footprint — ridge runs along
          // the longer side, so it always meets the walls correctly regardless of shape
          const roofMat = mkMat({ color: roofColor, roughness: 0.78, metalness: 0.04 });
          const cx = patio.x + patio.width / 2 - W / 2, cz = patio.y + patio.length / 2 - L / 2;
          const autoRidgeAlongZ = patio.length >= patio.width;
          const ridgeAlongZ = patio.roofDirection === "rotated" ? !autoRidgeAlongZ : autoRidgeAlongZ;
          const span = (ridgeAlongZ ? patio.width : patio.length) + 0.6; // + small eave overhang
          const ridgeLen = (ridgeAlongZ ? patio.length : patio.width) + 0.6;
          const peak = span * 0.4;
          const slopeLen = Math.hypot(span / 2, peak);
          const theta = Math.atan2(peak, span / 2);
          const thickness = 0.12;
          if (ridgeAlongZ) {
            const left = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, thickness, ridgeLen), roofMat);
            left.position.set(cx - span / 4, postH + peak / 2, cz);
            left.rotation.z = theta;
            scene.add(left);
            const right = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, thickness, ridgeLen), roofMat);
            right.position.set(cx + span / 4, postH + peak / 2, cz);
            right.rotation.z = -theta;
            scene.add(right);
          } else {
            const front = new THREE.Mesh(new THREE.BoxGeometry(ridgeLen, thickness, slopeLen), roofMat);
            front.position.set(cx, postH + peak / 2, cz - span / 4);
            front.rotation.x = -theta;
            scene.add(front);
            const back = new THREE.Mesh(new THREE.BoxGeometry(ridgeLen, thickness, slopeLen), roofMat);
            back.position.set(cx, postH + peak / 2, cz + span / 4);
            back.rotation.x = theta;
            scene.add(back);
          }
        } else {
          // hip roof (default) — a unit pyramid/cone scaled per-axis so its base exactly
          // matches the rectangular footprint instead of a same-radius square/octagon
          const segs = patio.structureType === "gazebo" ? 8 : 4;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 2.4, segs), mkMat({ color: roofColor, roughness: 0.78, metalness: 0.04 }));
          roof.position.set(patio.x + patio.width / 2 - W / 2, postH + 1.2, patio.y + patio.length / 2 - L / 2);
          const faceFactor = segs === 4 ? Math.SQRT2 : 2 * Math.cos(Math.PI / 8); // unit-radius flat-to-flat width
          roof.scale.set((patio.width + 0.6) / faceFactor, 1, (patio.length + 0.6) / faceFactor);
          if (segs === 4) roof.rotation.y = Math.PI / 4;
          scene.add(roof);
        }
      }
    });

    // ---- landscaping (outside the fence) ----
    landscape.forEach((l) => {
      const t = LANDSCAPE_TYPES[l.type];
      const wx = l.x + l.width / 2 - W / 2, wz = l.y + l.length / 2 - L / 2;
      if (l.type === "tree") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8), mkMat({ color: "#6B4A2E", roughness: 0.86, metalness: 0.02, clearcoat: 0.08 }));
        trunk.position.set(wx, 0.7, wz);
        scene.add(trunk);
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(l.width / 2, l.width * 0.9, 10), mkMat({ color: t.color, roughness: 0.96, metalness: 0 }));
        canopy.position.set(wx, 1.4 + (l.width * 0.9) / 2, wz);
        scene.add(canopy);
      } else if (l.type === "shrub") {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(l.width / 2, 10, 8), mkMat({ color: t.color, roughness: 0.96, metalness: 0 }));
        bush.position.set(wx, l.width / 2, wz);
        scene.add(bush);
      } else if (l.type === "arch") {
        const archMat = mkMat({ color: t.color, roughness: 0.83, metalness: 0.02, clearcoat: 0.06 });
        const archH = l.height || 7, postSpan = l.width * 0.7;
        [-1, 1].forEach((side) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, archH, 0.25), archMat);
          post.position.set(wx + (side * postSpan) / 2, archH / 2, wz);
          scene.add(post);
        });
        // flat square-top beam spanning post-to-post, rather than a rounded arch
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(postSpan + 0.35, 0.22, 0.3), archMat);
        topBeam.position.set(wx, archH + 0.11, wz);
        scene.add(topBeam);
      } else if (l.type === "doubleArch") {
        // two arches set front-to-back (spaced along the walkway), joined by rails
        // running along the top — a short covered tunnel, not a wide double-door
        const archMat = mkMat({ color: t.color, roughness: 0.83, metalness: 0.02, clearcoat: 0.06 });
        const archH = l.height || 7, postSpan = l.width * 0.7, spacing = l.length;
        const frontZ = wz - spacing / 2, backZ = wz + spacing / 2;
        [frontZ, backZ].forEach((z) => {
          [-1, 1].forEach((side) => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, archH, 0.25), archMat);
            post.position.set(wx + (side * postSpan) / 2, archH / 2, z);
            scene.add(post);
          });
          const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(postSpan + 0.35, 0.22, 0.3), archMat);
          crossBeam.position.set(wx, archH + 0.11, z);
          scene.add(crossBeam);
        });
        [-1, 1].forEach((side) => {
          const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, spacing + 0.3), archMat);
          stringer.position.set(wx + (side * postSpan) / 2, archH + 0.11, wz);
          scene.add(stringer);
        });
      } else if (l.type === "tunnel") {
        // a bent wire panel spanning bed-to-bed: several parallel arcs (the panel's
        // horizontal wires) stacked across the footprint depth, plus radial cross-wires
        const tunnelMat = mkMat({ color: t.color, roughness: 0.83, metalness: 0.03, clearcoat: 0.04 });
        const radius = l.width / 2;
        const heightScale = (l.height || 6) / radius;
        const strands = 4;
        for (let i = 0; i < strands; i++) {
          const zOff = -l.length / 2 + (i / (strands - 1)) * l.length;
          const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 8, 24, Math.PI), tunnelMat);
          arc.scale.y = heightScale;
          arc.position.set(wx, 0, wz + zOff);
          scene.add(arc);
        }
        const spokes = 6;
        for (let i = 1; i < spokes; i++) {
          const ang = (Math.PI * i) / spokes;
          const px = wx + Math.cos(ang) * radius;
          const py = Math.sin(ang) * radius * heightScale;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, l.length), tunnelMat);
          spoke.position.set(px, py, wz);
          scene.add(spoke);
        }
      } else {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(l.width, 0.06, l.length), mkMat({ color: t.color, roughness: 0.88, metalness: 0.01 }));
        slab.position.set(wx, 0.03, wz);
        scene.add(slab);
      }
    });

    if (cinematic) {
      scene.traverse((obj) => {
        if (!obj.isMesh) return;
        if (obj !== ground) obj.castShadow = true;
        obj.receiveShadow = true;
      });
    }

    // ---- camera orbit controls (manual — OrbitControls isn't available in three r128) ----
    let maxExtent = Math.max(W + yardMargin, L + yardMargin);
    landscape.forEach((l) => {
      const lx = numOr(l.x, 0), ly = numOr(l.y, 0);
      const lw = Math.max(numOr(l.width, 0), 0.5), ll = Math.max(numOr(l.length, 0), 0.5);
      maxExtent = Math.max(maxExtent, Math.abs(lx + lw / 2 - W / 2) + lw / 2, Math.abs(ly + ll / 2 - L / 2) + ll / 2);
    });
    patios.forEach((p) => {
      const px = numOr(p.x, 0), py = numOr(p.y, 0);
      const pw = Math.max(numOr(p.width, 0), 1), pl = Math.max(numOr(p.length, 0), 1);
      maxExtent = Math.max(maxExtent, Math.abs(px + pw / 2 - W / 2) + pw / 2, Math.abs(py + pl / 2 - L / 2) + pl / 2);
    });
    const minR = Math.max(Math.max(W, L) * 0.45, maxExtent * 0.55);
    const maxR = maxExtent * 4.2;
    const defaultR = maxExtent * 1.3;
    const priorR = numOr(camStateRef.current.radius, defaultR);
    camStateRef.current.radius = clamp(priorR, minR, maxR);
    camStateRef.current.theta = numOr(camStateRef.current.theta, 0.8);
    camStateRef.current.phi = clamp(numOr(camStateRef.current.phi, 1.0), 0.15, 1.45);
    const target = new THREE.Vector3(0, fenceHeight * 0.25, 0);
    function applyCam() {
      const { theta, phi, radius } = camStateRef.current;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    }
    applyCam();

    let dragging = false, lastX = 0, lastY = 0;
    const dom = renderer.domElement;
    dom.style.cursor = "grab";
    dom.style.touchAction = "none";
    function onDown(e) { dragging = true; lastX = e.clientX; lastY = e.clientY; dom.style.cursor = "grabbing"; }
    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      camStateRef.current.theta -= dx * 0.006;
      camStateRef.current.phi = Math.min(1.45, Math.max(0.15, camStateRef.current.phi - dy * 0.006));
      applyCam();
    }
    function onUp() { dragging = false; dom.style.cursor = "grab"; }
    function onWheel(e) {
      e.preventDefault();
      camStateRef.current.radius = Math.min(maxR, Math.max(minR, camStateRef.current.radius * (1 + e.deltaY * 0.001)));
      applyCam();
    }
    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    function onResize() {
      const w2 = container.clientWidth || 600, h2 = container.clientHeight || height;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cinematic ? 2 : 1.25));
      renderer.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);

    let raf;
    function loop() { renderer.render(scene, camera); raf = requestAnimationFrame(loop); }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, [viewMode, renderQuality3d, enclosure, layout, patios, landscape, gates, fenceHeight, postSpacing, yardMargin, fencePosts]);

  function exportCSV() {
    const rows = [["Category", "Item", "Qty", "Unit", "Unit Price", "Line Total"]];
    bom.sections.forEach((s) => {
      s.items.forEach((it) => rows.push([s.name, it.desc, it.qty, it.unit, it.price.toFixed(2), it.total.toFixed(2)]));
      rows.push([s.name, "SUBTOTAL", "", "", "", s.subtotal.toFixed(2)]);
    });
    rows.push(["", "GRAND TOTAL", "", "", "", bom.grandTotal.toFixed(2)]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `garden-bom-${enclosure.width}x${enclosure.length}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function copyList() {
    let text = `RAISED BED GARDEN — SHOPPING LIST\nEnclosure: ${enclosure.width} x ${enclosure.length} ft, ${fenceHeight} ft fence\n\n`;
    bom.sections.forEach((s) => {
      text += `${s.name.toUpperCase()}\n`;
      s.items.forEach((it) => { text += `  ${it.qty} ${it.unit} — ${it.desc} — ${fmt(it.price)} ea — ${fmt(it.total)}\n`; });
      text += `  Subtotal: ${fmt(s.subtotal)}\n\n`;
    });
    text += `GRAND TOTAL: ${fmt(bom.grandTotal)}\n`;
    navigator.clipboard?.writeText(text);
  }

  return (
    <div style={{ "--bg": "#16241C", "--panel": "#FBF6EA", "--ink": "#202B21", "--wood": "#6B4A2E", "--leaf": "#4F7A4B", "--clay": "#B5502A", "--gold": "#C99A2E", "--line": "#DCD2B8" }}
      className="gdw-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        .gdw-root{background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;padding:28px 20px;min-height:100%;box-sizing:border-box;}
        .gdw-root *{box-sizing:border-box;}
        .gdw-wrap{max-width:1180px;margin:0 auto;}
        .gdw-header{display:flex;align-items:baseline;gap:14px;margin-bottom:4px;color:var(--panel);}
        .gdw-title{font-family:'Fraunces',serif;font-weight:700;font-size:34px;letter-spacing:-0.01em;margin:0;}
        .gdw-sub{color:#C9D6C6;font-size:14px;margin:0 0 24px 0;}
        .gdw-grid{display:grid;grid-template-columns:340px 1fr;gap:20px;}
        @media(max-width:900px){.gdw-grid{grid-template-columns:1fr;}}
        .gdw-panel{background:var(--panel);border-radius:10px;padding:18px 20px;margin-bottom:16px;border:1px solid var(--line);}
        .gdw-panel h2{font-family:'Fraunces',serif;font-size:17px;margin:0 0 12px 0;display:flex;align-items:center;gap:8px;color:var(--ink);}
        .gdw-row{display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;}
        .gdw-label{font-size:12px;color:#5b5342;text-transform:uppercase;letter-spacing:.04em;width:100%;margin-bottom:4px;}
        .gdw-inp{width:64px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:13px;background:#fff;}
        .gdw-inp.wide{width:100%;}
        .gdw-btn{border:1px solid var(--line);background:#fff;border-radius:6px;padding:6px 10px;font-size:12.5px;cursor:pointer;color:var(--ink);font-family:'Inter',sans-serif;}
        .gdw-btn:hover{border-color:var(--leaf);}
        .gdw-btn.active{background:var(--leaf);color:#fff;border-color:var(--leaf);}
        .gdw-btn.primary{background:var(--clay);color:#fff;border-color:var(--clay);}
        .gdw-bedrow{border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:8px;background:#fff;}
        .gdw-bedrow-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
        .gdw-name{font-weight:600;font-size:13.5px;border:none;background:transparent;font-family:'Inter',sans-serif;width:110px;}
        .gdw-iconbtn{background:none;border:none;cursor:pointer;color:#a34;padding:2px;}
        .gdw-add{width:100%;padding:8px;border:1.5px dashed var(--leaf);border-radius:8px;background:transparent;color:var(--leaf);font-weight:600;cursor:pointer;font-size:13px;margin-top:4px;}
        .gdw-morebtn{display:flex;align-items:center;gap:4px;background:none;border:none;color:var(--leaf);font-size:11px;font-weight:600;cursor:pointer;padding:4px 0 0 0;font-family:'Inter',sans-serif;}
        .gdw-canvaswrap{background:var(--panel);border-radius:10px;border:1px solid var(--line);padding:18px 20px;margin-bottom:16px;}
        .gdw-svg{width:100%;height:auto;display:block;}
        .gdw-legend{display:flex;gap:16px;font-size:12px;margin-top:10px;color:#5b5342;}
        .gdw-legend span{display:inline-flex;align-items:center;gap:5px;}
        .gdw-swatch{width:11px;height:11px;border-radius:2px;display:inline-block;}
        .gdw-bom{background:var(--panel);border-radius:10px;border:1px solid var(--line);padding:18px 20px;}
        .gdw-bomhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
        .gdw-bomhead h2{font-family:'Fraunces',serif;font-size:20px;margin:0;}
        .gdw-actions{display:flex;gap:8px;}
        .gdw-section{margin-bottom:14px;}
        .gdw-section-title{font-weight:700;font-size:13.5px;text-transform:uppercase;letter-spacing:.03em;color:var(--wood);border-bottom:1px solid var(--line);padding-bottom:4px;margin-bottom:2px;display:flex;justify-content:space-between;}
        .gdw-note{font-size:12px;color:#6b6350;font-style:italic;margin:4px 0 6px 0;}
        table.gdw-table{width:100%;border-collapse:collapse;font-size:13px;min-width:420px;}
        table.gdw-table td{padding:5px 4px;border-bottom:1px solid #ECE4CC;}
        table.gdw-table td.num{text-align:right;font-family:'IBM Plex Mono',monospace;white-space:nowrap;}
        .gdw-subtotal td{font-weight:700;border-top:1px solid var(--line);border-bottom:none;padding-top:6px;}
        .gdw-grand{display:flex;justify-content:space-between;align-items:baseline;padding-top:14px;margin-top:6px;border-top:2px solid var(--ink);}
        .gdw-grand .amt{font-family:'IBM Plex Mono',monospace;font-size:26px;font-weight:700;color:var(--clay);}
        .gdw-grand .lbl{font-family:'Fraunces',serif;font-size:16px;}
        select.gdw-inp{width:auto;}
        .gdw-pricegrid{display:grid;grid-template-columns:1fr auto;gap:6px 10px;font-size:12.5px;align-items:center;}
        .gdw-pricegrid input{width:70px;}
        .gdw-tabbar{display:flex;gap:4px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px;}
        .gdw-tab{display:flex;align-items:center;gap:5px;padding:8px 12px;border:1px solid var(--line);border-bottom:2px solid transparent;background:var(--panel);border-radius:8px 8px 0 0;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:600;color:#6b6350;cursor:pointer;white-space:nowrap;flex-shrink:0;}
        .gdw-tab:hover{color:var(--ink);}
        .gdw-tab.active{background:#fff;border-color:var(--line);border-bottom-color:#fff;color:var(--leaf);box-shadow:0 -2px 0 var(--leaf) inset;}
        .gdw-structgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px;margin-bottom:8px;}
        .gdw-structcard{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px 6px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;font-family:'Inter',sans-serif;font-size:10.5px;color:var(--ink);text-align:center;line-height:1.2;}
        .gdw-structcard:hover{border-color:var(--leaf);}
        .gdw-structcard.active{border-color:var(--leaf);background:#F0F5EC;box-shadow:0 0 0 1px var(--leaf) inset;}
        .gdw-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:18px;padding:10px 14px;background:var(--panel);border:1px solid var(--line);border-radius:10px;}
        .gdw-loadmenu{position:absolute;top:110%;left:0;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,0.18);min-width:270px;max-height:300px;overflow-y:auto;z-index:20;padding:6px;}
        .gdw-loadrow{display:flex;justify-content:space-between;align-items:center;padding:4px 6px;border-radius:5px;gap:6px;}
        .gdw-loadrow:hover{background:#F0EADB;}
        .gdw-loadname{background:none;border:none;text-align:left;flex:1;cursor:pointer;font-size:12.5px;color:var(--ink);padding:2px 0;}
        .gdw-loadsection{font-size:10.5px;color:#8a8065;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px 3px 8px;}
        .gdw-samplecard{display:flex;flex-direction:column;align-items:flex-start;width:100%;background:#F9F7F0;border:1px solid #DFD7C3;border-radius:8px;text-align:left;cursor:pointer;padding:8px 9px;gap:2px;margin:0 0 6px 0;}
        .gdw-samplecard:hover{border-color:var(--leaf);background:#F2F6EE;}
        .gdw-sampletitle{font-size:12.5px;font-weight:600;color:var(--ink);}
        .gdw-samplemeta{font-size:11px;color:#6b6350;line-height:1.35;}
        .gdw-loadempty{font-size:12px;color:#8a8065;padding:6px;}
        .gdw-savestatus{width:100%;font-size:12.5px;font-weight:600;padding:6px 10px;border-radius:6px;margin-top:2px;}
        .gdw-savestatus.ok{color:#2F6B2A;background:#E9F4E4;}
        .gdw-savestatus.warn{color:#8A5A0A;background:#FCF0DA;}
        .gdw-savestatus.error{color:#A33A1E;background:#FBE7E0;}
        .gdw-filepanel{width:100%;background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px;margin-top:6px;}
        .gdw-filepanel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13.5px;}
        .gdw-filetextarea{width:100%;min-height:130px;font-family:'IBM Plex Mono',monospace;font-size:11px;border:1px solid var(--line);border-radius:6px;padding:8px;resize:vertical;box-sizing:border-box;background:#FBFAF5;}
        .gdw-print-header{display:none;}
        details summary{cursor:pointer;font-weight:600;font-size:13px;color:var(--wood);margin-bottom:8px;}
        .gdw-svg{touch-action:none;}
        .gdw-three{height:460px;touch-action:none;}
        .gdw-tablewrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .gdw-bomhead{flex-wrap:wrap;gap:8px;}
        @media (max-width:640px){
          .gdw-root{padding:16px 12px;}
          .gdw-title{font-size:24px;}
          .gdw-sub{font-size:13px;margin-bottom:16px;}
          .gdw-panel{padding:14px 14px;}
          .gdw-canvaswrap,.gdw-bom{padding:14px 12px;}
          .gdw-btn{padding:8px 11px;font-size:13px;min-height:34px;}
          .gdw-three{height:320px;}
          table.gdw-table{font-size:12px;}
        }
        @media print{
          .gdw-noprint{display:none !important;}
          .gdw-root{background:#fff !important;color:#111 !important;padding:0;}
          .gdw-header{display:none !important;}
          .gdw-print-header{display:block !important;}
          .gdw-grid{grid-template-columns:1fr !important;display:block !important;}
          .gdw-canvaswrap,.gdw-bom{background:#fff !important;border:1px solid #ccc !important;box-shadow:none !important;break-inside:avoid;padding:0 0 14px 0 !important;margin-bottom:16px !important;}
          .gdw-legend{color:#333;}
          .gdw-swatch{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          .gdw-svg{max-height:720px;}
          table.gdw-table td{color:#111;}
          .gdw-grand .amt{color:#111 !important;}
        }
      `}</style>

      <div className="gdw-wrap">
        <div className="gdw-header">
          <Leaf size={28} color="#8FA888" />
          <h1 className="gdw-title">Raised Bed Garden Designer</h1>
        </div>
        <p className="gdw-sub gdw-noprint">Set your fence, add beds, drop in a patio if you want one — then take the priced shopping list below to Home Depot or Lowes. Toggle to 3D any time to see it in space.</p>

        <div className="gdw-print-header">
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, margin: "0 0 4px 0" }}>Raised Bed Garden Plan{reportName ? ` — ${reportName}` : ""}</h1>
          <p style={{ fontSize: 12, color: "#555", margin: "0 0 12px 0" }}>
            {new Date().toLocaleDateString()} · {enclosure.width}×{enclosure.length} ft enclosure · {fenceHeight} ft cattle-panel fence · {gates.length} gate{gates.length === 1 ? "" : "s"} · {bom.totalBedCount} raised bed{bom.totalBedCount === 1 ? "" : "s"}
            {patios.length > 0 ? ` · ${patios.length} patio${patios.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>

        <div className="gdw-toolbar gdw-noprint">
          <input className="gdw-inp" style={{ width: "auto", flex: "1 1 160px" }} placeholder="Name this design…" value={reportName} onChange={(e) => setReportName(e.target.value)} />
          <button className="gdw-btn primary" onClick={saveReport} disabled={!reportName.trim()} title="Save under this name inside the app"><Save size={13} style={{ verticalAlign: -2 }} /> Save</button>
          <button className="gdw-btn" onClick={undoChange} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">↶ Undo</button>
          <button className="gdw-btn" onClick={redoChange} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">↷ Redo</button>
          <div style={{ position: "relative" }}>
            <button className="gdw-btn" onClick={() => setShowLoadMenu((v) => !v)} title="Designs saved by name inside the app"><FolderOpen size={13} style={{ verticalAlign: -2 }} /> Load ({savedReports.length})</button>
            {showLoadMenu && (
              <div className="gdw-loadmenu">
                <div className="gdw-loadsection">Saved designs</div>
                {savedReports.length === 0 && <div className="gdw-loadempty">No saved designs yet</div>}
                {savedReports.map((name) => (
                  <div key={name} className="gdw-loadrow">
                    <button className="gdw-loadname" onClick={() => loadReport(name)}>{name}</button>
                    <button className="gdw-iconbtn" onClick={() => deleteReport(name)}><Trash2 size={14} /></button>
                  </div>
                ))}
                <div className="gdw-loadsection" style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 7 }}>Sample plans</div>
                {SAMPLE_PLANS.map((plan) => (
                  <div key={plan.file}>
                    <button className="gdw-samplecard" onClick={() => loadSamplePlan(plan.file)} title={plan.file}>
                      <span className="gdw-sampletitle">{plan.label}</span>
                      <span className="gdw-samplemeta">
                        {plan.size || "Custom size"}
                        {plan.hasOutsidePergola ? " · Pergola outside fence" : ""}
                      </span>
                      <span className="gdw-samplemeta">{plan.blurb}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button className="gdw-btn" onClick={() => setShowMoreMenu((v) => !v)}>More ▾</button>
            {showMoreMenu && (
              <div className="gdw-loadmenu">
                <button className="gdw-loadname" style={{ width: "100%" }} onClick={() => { handlePrint(); setShowMoreMenu(false); }}><Printer size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Print</button>
                <button className="gdw-loadname" style={{ width: "100%" }} onClick={() => { openExportPanel(); setShowMoreMenu(false); }}><Download size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Save to File…</button>
                <button className="gdw-loadname" style={{ width: "100%" }} onClick={() => { openImportPanel(); setShowMoreMenu(false); }}><FolderOpen size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Load From File…</button>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onFileSelected} />
          {saveStatus && <div className={`gdw-savestatus ${saveStatusType}`}>{saveStatus}</div>}
          {filePanel === "export" && (
            <div className="gdw-filepanel">
              <div className="gdw-filepanel-head">
                <strong>Save to file</strong>
                <button className="gdw-iconbtn" onClick={closeFilePanel}>✕</button>
              </div>
              <p className="gdw-note" style={{ margin: "0 0 8px 0" }}>Try the button below first — it works in most desktop browsers. If nothing happens (common inside sandboxed previews), copy the text and paste it into a plain text file yourself, saved with a <code>.json</code> ending.</p>
              <div className="gdw-row" style={{ marginBottom: 8 }}>
                <button className="gdw-btn primary" onClick={tryNativeSaveDialog}>Try Direct Save / Download</button>
                <button className="gdw-btn" onClick={copyExportText}><Copy size={13} style={{ verticalAlign: -2 }} /> Copy to Clipboard</button>
              </div>
              <textarea readOnly className="gdw-filetextarea" value={exportText} onFocus={(e) => e.target.select()} />
            </div>
          )}
          {filePanel === "import" && (
            <div className="gdw-filepanel">
              <div className="gdw-filepanel-head">
                <strong>Load from file</strong>
                <button className="gdw-iconbtn" onClick={closeFilePanel}>✕</button>
              </div>
              <p className="gdw-note" style={{ margin: "0 0 8px 0" }}>Try picking a file first. If the file picker doesn't respond, open the saved <code>.json</code> file in any text editor, copy everything, and paste it into the box below.</p>
              <div className="gdw-row" style={{ marginBottom: 8 }}>
                <button className="gdw-btn primary" onClick={triggerFileLoad}>Choose File…</button>
                <button className="gdw-btn" onClick={applyImportText} disabled={!importText.trim()}>Load Pasted Text</button>
              </div>
              <textarea className="gdw-filetextarea" placeholder="Paste design JSON here…" value={importText} onChange={(e) => setImportText(e.target.value)} />
            </div>
          )}
        </div>

        <div className="gdw-grid">
          {/* ---------- Left: controls ---------- */}
          <div className="gdw-noprint">
            <div className="gdw-tabbar">
              <button className={`gdw-tab ${activeTab === "enclosure" ? "active" : ""}`} onClick={() => setActiveTab("enclosure")}><Fence size={14} /> Enclosure</button>
              <button className={`gdw-tab ${activeTab === "beds" ? "active" : ""}`} onClick={() => setActiveTab("beds")}><Sprout size={14} /> Beds</button>
              <button className={`gdw-tab ${activeTab === "patio" ? "active" : ""}`} onClick={() => setActiveTab("patio")}><HomeIcon size={14} /> Patio</button>
              <button className={`gdw-tab ${activeTab === "landscaping" ? "active" : ""}`} onClick={() => setActiveTab("landscaping")}><Leaf size={14} /> Landscaping</button>
              <button className={`gdw-tab ${activeTab === "trellis" ? "active" : ""}`} onClick={() => setActiveTab("trellis")}><LayoutGrid size={14} /> Trellis</button>
              <button className={`gdw-tab ${activeTab === "irrigation" ? "active" : ""}`} onClick={() => setActiveTab("irrigation")}><Droplets size={14} /> Irrigation</button>
              <button className={`gdw-tab ${activeTab === "prices" ? "active" : ""}`} onClick={() => setActiveTab("prices")}><ShoppingCart size={14} /> Prices</button>
            </div>
            {activeTab === "enclosure" && (
            <div className="gdw-panel">
              <h2><Fence size={16} /> Enclosure &amp; Fencing</h2>
              <div className="gdw-label">Preset size (ft)</div>
              <div className="gdw-row">
                {ENCLOSURE_PRESETS.map((p) => (
                  <button key={p} className={`gdw-btn ${enclosure.width + "x" + enclosure.length === p ? "active" : ""}`} onClick={() => applyEnclosurePreset(p)}>{p}</button>
                ))}
              </div>
              <div className="gdw-label">Custom width × length (ft)</div>
              <div className="gdw-row">
                <input type="number" min={4} className="gdw-inp" value={enclosure.width} onChange={(e) => setEnclosure((s) => ({ ...s, width: Math.max(Number(e.target.value) || 0, 4) }))} />
                <span>×</span>
                <input type="number" min={4} className="gdw-inp" value={enclosure.length} onChange={(e) => setEnclosure((s) => ({ ...s, length: Math.max(Number(e.target.value) || 0, 4) }))} />
              </div>
              <div className="gdw-label">Fence height</div>
              <div className="gdw-row">
                <button className={`gdw-btn ${fenceHeight === 6 ? "active" : ""}`} onClick={() => setFenceHeight(6)}>6 ft</button>
                <button className={`gdw-btn ${fenceHeight === 8 ? "active" : ""}`} onClick={() => setFenceHeight(8)}>8 ft</button>
              </div>
              <div className="gdw-label">Post spacing (4×4 wood posts)</div>
              <div className="gdw-row">
                {[6, 7, 8].map((s) => (
                  <button key={s} className={`gdw-btn ${postSpacing === s ? "active" : ""}`} onClick={() => setPostSpacing(s)}>{s} ft</button>
                ))}
              </div>
              <div className="gdw-label" style={{ marginTop: 6 }}>Entrance gates</div>
              {gates.map((g) => {
                const wl = wallLength(g.wall);
                return (
                  <div key={g.id} className="gdw-bedrow">
                    <div className="gdw-bedrow-top" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Gate — {g.width} ft on {g.wall}</span>
                      <button className="gdw-iconbtn" onClick={() => removeGate(g.id)}><Trash2 size={15} /></button>
                    </div>
                    <div className="gdw-row" style={{ marginBottom: 6 }}>
                      {["top", "right", "bottom", "left"].map((w) => (
                        <button key={w} className={`gdw-btn ${g.wall === w ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateGate(g.id, { wall: w })}>{w}</button>
                      ))}
                    </div>
                    <div className="gdw-row" style={{ marginBottom: 6 }}>
                      <button className={`gdw-btn ${g.width <= 4 ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateGate(g.id, { width: 3.5 })}>Walk gate (3.5 ft)</button>
                      <button className={`gdw-btn ${g.width > 4 ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateGate(g.id, { width: 10 })}>Drive gate (10 ft)</button>
                    </div>
                    <div className="gdw-row">
                      <span style={{ fontSize: 11, color: "#6b6350" }}>Width</span>
                      <input type="number" min={2} step={0.5} className="gdw-inp" style={{ width: 48 }} value={g.width} onChange={(e) => updateGate(g.id, { width: Number(e.target.value) || 2 })} />
                      <span style={{ fontSize: 11, color: "#6b6350" }}>Offset from corner</span>
                      <input type="number" min={0} step={0.5} className="gdw-inp" style={{ width: 48 }} value={g.offset} onChange={(e) => updateGate(g.id, { offset: Number(e.target.value) || 0 })} />
                      <span style={{ fontSize: 11, color: "#8a8065" }}>of {wl} ft wall</span>
                    </div>
                  </div>
                );
              })}
              <button className="gdw-add" onClick={addGate}><Plus size={14} style={{ verticalAlign: -2 }} /> Add gate</button>
            </div>
            )}

            {activeTab === "beds" && (
            <div className="gdw-panel">
              <h2><Sprout size={16} /> Raised Beds</h2>
              <div className="gdw-label">Perimeter bed setback: beds marked "Perimeter" sit this far inside the fence</div>
              <div className="gdw-row">
                <input type="number" min={1} step={0.5} className="gdw-inp" value={perimeterInset} onChange={(e) => setPerimeterInset(Math.max(Number(e.target.value) || 1, 1))} />
                <span style={{ fontSize: 12 }}>ft</span>
              </div>
              <div className="gdw-label">Default wall height for new beds: {courses} courses of 2×12 ≈ {bedWallHeightFt} ft</div>
              <div className="gdw-row">
                {[2, 3, 4].map((c) => (
                  <button key={c} className={`gdw-btn ${courses === c ? "active" : ""}`} onClick={() => setCourses(c)}>{c} courses</button>
                ))}
              </div>
              <div className="gdw-note" style={{ margin: "0 0 10px 0" }}>Every bed below is fully custom — type any width, length, quantity, and wall height, or click "Make L-shaped" to cut a notch out of any corner for an L-shaped bed.</div>
              {beds.map((b) => {
                const bHeight = round1(((b.courses || courses) * boardActualIn) / 12);
                const isOpen = expandedBeds.has(b.id);
                const showAdvanced = advancedBeds.has(b.id) || b.shape === "L" || b.trellis;
                if (!isOpen) {
                  return (
                    <div key={b.id} className="gdw-bedrow" style={{ cursor: "pointer" }} onClick={() => toggleExpanded(b.id)}>
                      <div className="gdw-bedrow-top" style={{ marginBottom: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
                          <ChevronRight size={14} /> {b.label} — {b.width}×{b.length} ft{b.shape === "L" ? " (L)" : ""} ×{b.qty}{b.trellis ? ` · trellis ${b.trellisHeight || 6}′ on ${b.trellisSide === "length" ? "length" : "width"}` : ""}
                          <span style={{ fontWeight: 400, color: "#8a8065", fontSize: 12 }}>· {b.zone === "perimeter" ? "perimeter" : "center"}</span>
                          <span style={{ fontWeight: 400, color: "#8a8065", fontSize: 12 }}>· {(CROP_PROFILE_BY_KEY[b.cropKey] || CROP_PROFILE_BY_KEY.mixed).label}</span>
                        </span>
                        <button className="gdw-iconbtn" onClick={(e) => { e.stopPropagation(); removeBed(b.id); }}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={b.id} className="gdw-bedrow">
                    <div className="gdw-bedrow-top">
                      <span style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                        <button className="gdw-iconbtn" style={{ color: "var(--ink)" }} onClick={() => toggleExpanded(b.id)}><ChevronDown size={14} /></button>
                        <input className="gdw-name" value={b.label} onChange={(e) => updateBed(b.id, { label: e.target.value })} />
                      </span>
                      <button className="gdw-iconbtn" onClick={() => removeBed(b.id)}><Trash2 size={15} /></button>
                    </div>
                    <div className="gdw-row" style={{ marginBottom: 6 }}>
                      {BED_PRESETS.map((p) => (
                        <button key={p} className="gdw-btn" style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => applyBedPreset(b.id, p)}>{p}</button>
                      ))}
                    </div>
                    <div className="gdw-row">
                      <span style={{ fontSize: 11, width: "100%", color: "#6b6350" }}>{b.shape === "L" ? "Outer bounding box (ft)" : "Size (ft)"}</span>
                      <input type="number" min={0.5} step={0.5} className="gdw-inp" style={{ width: 48 }} value={b.width} onChange={(e) => updateBed(b.id, { width: Number(e.target.value) || 0.5 })} />
                      <span>×</span>
                      <input type="number" min={0.5} step={0.5} className="gdw-inp" style={{ width: 48 }} value={b.length} onChange={(e) => updateBed(b.id, { length: Number(e.target.value) || 0.5 })} />
                      <span style={{ fontSize: 12 }}>qty</span>
                      <input type="number" min={1} className="gdw-inp" style={{ width: 40 }} value={b.qty} onChange={(e) => updateBed(b.id, { qty: Number(e.target.value) || 1 })} />
                    </div>
                    <div className="gdw-row" style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "#6b6350" }}>Wall height</span>
                      {[2, 3, 4].map((c) => (
                        <button key={c} className={`gdw-btn ${(b.courses || courses) === c ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { courses: c })}>{c}× ≈ {round1((c * boardActualIn) / 12)}′</button>
                      ))}
                      <span style={{ fontSize: 11, color: "#8a8065" }}>({bHeight} ft)</span>
                    </div>
                    <div className="gdw-row" style={{ marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: "#6b6350" }}>Plant profile</span>
                      <select className="gdw-inp" style={{ width: "auto" }} value={b.cropKey || "mixed"} onChange={(e) => updateBed(b.id, { cropKey: e.target.value })}>
                        {CROP_PROFILES.map((crop) => (
                          <option key={crop.key} value={crop.key}>{crop.label}</option>
                        ))}
                      </select>
                    </div>
                    <button className="gdw-morebtn" onClick={() => toggleAdvanced(b.id)}>
                      {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {showAdvanced ? "Fewer options" : "More options (shape, placement, trellis)"}
                    </button>
                    {showAdvanced && (
                      <>
                        <div className="gdw-row" style={{ marginTop: 6 }}>
                          <button className={`gdw-btn ${b.shape === "L" ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { shape: b.shape === "L" ? "rect" : "L", notchWidth: b.notchWidth || Math.max(Math.min(2, b.width / 2), 0.5), notchDepth: b.notchDepth || Math.max(Math.min(2, b.length / 2), 0.5), notchCorner: b.notchCorner || "top-right", zone: b.shape === "L" ? b.zone : "perimeter" })}>{b.shape === "L" ? "L-shaped" : "Make L-shaped"}</button>
                        </div>
                        {b.shape === "L" && (
                          <div className="gdw-row">
                            <span style={{ fontSize: 11, width: "100%", color: "#6b6350" }}>Notch to remove (ft) &amp; corner — as seen on screen, even when rotated</span>
                            <input type="number" min={0.5} step={0.5} className="gdw-inp" style={{ width: 44 }} value={b.notchWidth} onChange={(e) => updateBed(b.id, { notchWidth: Math.min(Number(e.target.value) || 0.5, b.width - 0.5) })} />
                            <span>×</span>
                            <input type="number" min={0.5} step={0.5} className="gdw-inp" style={{ width: 44 }} value={b.notchDepth} onChange={(e) => updateBed(b.id, { notchDepth: Math.min(Number(e.target.value) || 0.5, b.length - 0.5) })} />
                            <select className="gdw-inp" value={b.notchCorner} onChange={(e) => updateBed(b.id, { notchCorner: e.target.value })}>
                              <option value="top-right">top-right</option>
                              <option value="top-left">top-left</option>
                              <option value="bottom-right">bottom-right</option>
                              <option value="bottom-left">bottom-left</option>
                            </select>
                          </div>
                        )}
                        <div className="gdw-row" style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: "#6b6350" }}>Auto-arrange zone</span>
                          <button className={`gdw-btn ${b.zone !== "perimeter" ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { zone: "center" })}>Center</button>
                          <button className={`gdw-btn ${b.zone === "perimeter" ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { zone: "perimeter" })}>Perimeter</button>
                        </div>
                        <div className="gdw-row" style={{ marginTop: 4 }}>
                          <button className={`gdw-btn ${b.trellis ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { trellis: !b.trellis })}>{b.trellis ? "Trellis on" : "Add trellis"}</button>
                          {b.trellis && (
                            <>
                              <span style={{ fontSize: 11, color: "#6b6350" }}>Height</span>
                              {[6, 8].map((h) => (
                                <button key={h} className={`gdw-btn ${(b.trellisHeight || 6) === h ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { trellisHeight: h })}>{h} ft</button>
                              ))}
                            </>
                          )}
                        </div>
                        {b.trellis && (
                          <div className="gdw-row" style={{ marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "#6b6350" }}>Matches</span>
                            <button className={`gdw-btn ${(b.trellisSide || "width") === "width" ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { trellisSide: "width" })}>Width ({b.width} ft)</button>
                            <button className={`gdw-btn ${b.trellisSide === "length" ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updateBed(b.id, { trellisSide: "length" })}>Length ({b.length} ft)</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              <button className="gdw-add" onClick={addBed}><Plus size={14} style={{ verticalAlign: -2 }} /> Add bed</button>
              <div className="gdw-label" style={{ marginTop: 14 }}>Planting intelligence</div>
              <div className="gdw-row">
                <span style={{ fontSize: 11, color: "#6b6350" }}>USDA zone</span>
                <input type="number" min={1} max={13} step={1} className="gdw-inp" style={{ width: 54 }} value={gardenSite.usdaZone} onChange={(e) => setGardenSite((s) => ({ ...s, usdaZone: Math.max(1, Math.min(Number(e.target.value) || 1, 13)) }))} />
                <span style={{ fontSize: 11, color: "#6b6350" }}>Sun hours/day</span>
                <input type="number" min={1} max={14} step={0.5} className="gdw-inp" style={{ width: 60 }} value={gardenSite.sunHours} onChange={(e) => setGardenSite((s) => ({ ...s, sunHours: Math.max(1, Math.min(Number(e.target.value) || 1, 14)) }))} />
                <span style={{ fontSize: 11, color: plantingGuidance.issuesCount ? "#B5502A" : "#2F6B2A" }}>
                  {plantingGuidance.issuesCount ? `${plantingGuidance.issuesCount} warning${plantingGuidance.issuesCount === 1 ? "" : "s"}` : "No zone/sun conflicts"}
                </span>
              </div>
              <div className="gdw-note" style={{ margin: "0 0 6px 0" }}>
                Estimated spacing and compatibility checks by bed crop profile.
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                {plantingGuidance.bedsSummary.map((row) => (
                  <li key={`plant-${row.bedId}`}>
                    <strong>{row.bedLabel}</strong>: {row.crop.label} · ~{row.plantsTotal} plant{row.plantsTotal === 1 ? "" : "s"} at {row.crop.spacingIn}" spacing
                    {row.issues.length > 0 && <span style={{ color: "#B5502A" }}> · {row.issues.join("; ")}</span>}
                  </li>
                ))}
              </ul>
            </div>
            )}

            {activeTab === "patio" && (
            <div className="gdw-panel">
              <h2><HomeIcon size={16} /> Patios &amp; Structures</h2>
              <p className="gdw-note" style={{ margin: "0 0 10px 0" }}>Add as many gathering areas as you want — a paver patio near the beds, a screened garden house elsewhere, whatever fits.</p>
              {patios.map((patio) => {
                const isOpen = expandedPatios.has(patio.id);
                const st = STRUCTURE_TYPES[patio.structureType] || STRUCTURE_TYPES.none;
                if (!isOpen) {
                  return (
                    <div key={patio.id} className="gdw-bedrow" style={{ cursor: "pointer" }} onClick={() => togglePatioExpanded(patio.id)}>
                      <div className="gdw-bedrow-top" style={{ marginBottom: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
                          <ChevronRight size={14} /> {patio.label} — {patio.width}×{patio.length} ft, {patio.surface}{patio.structureType !== "none" ? ` + ${st.label}` : ""}
                        </span>
                        <button className="gdw-iconbtn" onClick={(e) => { e.stopPropagation(); removePatio(patio.id); }}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={patio.id} className="gdw-bedrow">
                    <div className="gdw-bedrow-top">
                      <span style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                        <button className="gdw-iconbtn" style={{ color: "var(--ink)" }} onClick={() => togglePatioExpanded(patio.id)}><ChevronDown size={14} /></button>
                        <input className="gdw-name" value={patio.label} onChange={(e) => updatePatio(patio.id, { label: e.target.value })} />
                      </span>
                      <button className="gdw-iconbtn" onClick={() => removePatio(patio.id)}><Trash2 size={15} /></button>
                    </div>
                    <div className="gdw-row" style={{ marginBottom: 6 }}>
                      {PATIO_PRESETS.map((p) => (
                        <button key={p} className="gdw-btn" style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => { const [w, l] = p.split("x").map(Number); updatePatio(patio.id, { width: w, length: l }); }}>{p}</button>
                      ))}
                    </div>
                    <div className="gdw-row">
                      <span style={{ fontSize: 11, width: "100%", color: "#6b6350" }}>Size (ft)</span>
                      <input type="number" min={4} className="gdw-inp" style={{ width: 48 }} value={patio.width} onChange={(e) => updatePatio(patio.id, { width: Number(e.target.value) || 4 })} />
                      <span>×</span>
                      <input type="number" min={4} className="gdw-inp" style={{ width: 48 }} value={patio.length} onChange={(e) => updatePatio(patio.id, { length: Number(e.target.value) || 4 })} />
                    </div>
                    <div className="gdw-label">Surface</div>
                    <div className="gdw-row">
                      <button className={`gdw-btn ${patio.surface === "pavers" ? "active" : ""}`} onClick={() => updatePatio(patio.id, { surface: "pavers" })}>Pavers</button>
                      <button className={`gdw-btn ${patio.surface === "gravel" ? "active" : ""}`} onClick={() => updatePatio(patio.id, { surface: "gravel" })}>Gravel</button>
                    </div>
                    <div className="gdw-label">Structure (optional)</div>
                    <div className="gdw-structgrid">
                      {Object.entries(STRUCTURE_TYPES).map(([key, t]) => (
                        <button key={key} className={`gdw-structcard ${patio.structureType === key ? "active" : ""}`} onClick={() => updatePatio(patio.id, { structureType: key })}>
                          <StructureIcon type={key} />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                    {patio.structureType !== "none" && (
                      <>
                        <div className="gdw-note" style={{ margin: "0 0 6px 0" }}>{st.desc}</div>
                        <div className="gdw-row">
                          <span style={{ fontSize: 11, color: "#6b6350" }}>{patio.structureType === "cabin" ? "Wall height" : "Post/eave height"}</span>
                          {[7, 8, 9, 10].map((h) => (
                            <button key={h} className={`gdw-btn ${(patio.structureHeight || 8) === h ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updatePatio(patio.id, { structureHeight: h })}>{h} ft</button>
                          ))}
                        </div>
                        {patio.structureType !== "gazebo" && (
                          <div className="gdw-row">
                            <span style={{ fontSize: 11, color: "#6b6350" }}>Roof style</span>
                            {["hip", "gable", "flat"].map((r) => (
                              <button key={r} className={`gdw-btn ${(patio.roofStyle || "hip") === r ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11, textTransform: "capitalize" }} onClick={() => updatePatio(patio.id, { roofStyle: r })}>{r}</button>
                            ))}
                          </div>
                        )}
                        {patio.roofStyle === "gable" && (
                          <div className="gdw-row">
                            <span style={{ fontSize: 11, color: "#6b6350" }}>Ridge direction</span>
                            <button className={`gdw-btn ${(patio.roofDirection || "auto") === "auto" ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updatePatio(patio.id, { roofDirection: "auto" })}>Auto (long side)</button>
                            <button className={`gdw-btn ${patio.roofDirection === "rotated" ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updatePatio(patio.id, { roofDirection: "rotated" })}>Rotate 90°</button>
                          </div>
                        )}
                        {patio.structureType === "cabin" && (
                          <div className="gdw-row">
                            <span style={{ fontSize: 11, color: "#6b6350" }}>Door</span>
                            <button className={`gdw-btn ${(patio.doorWidth || 3) === 3 ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updatePatio(patio.id, { doorWidth: 3 })}>Single (3 ft)</button>
                            <button className={`gdw-btn ${patio.doorWidth === 6 ? "active" : ""}`} style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => updatePatio(patio.id, { doorWidth: 6 })}>Double (6 ft)</button>
                          </div>
                        )}
                      </>
                    )}
                    <div className="gdw-row" style={{ marginTop: 4 }}>
                      <button className={`gdw-btn ${patio.furnishings ? "active" : ""}`} onClick={() => updatePatio(patio.id, { furnishings: !patio.furnishings })}>{patio.furnishings ? "Furnishings included" : "Add table & chairs"}</button>
                      <span style={{ fontSize: 11, color: "#8a8065" }}>sitting/eating area allowance, editable in Prices</span>
                    </div>
                  </div>
                );
              })}
              <button className="gdw-add" onClick={addPatio}><Plus size={14} style={{ verticalAlign: -2 }} /> Add patio</button>
            </div>
            )}

            {activeTab === "landscaping" && (
            <div className="gdw-panel">
              <h2><Leaf size={16} /> Landscaping (outside the fence)</h2>
              <div className="gdw-label">Yard margin shown/usable around the fence</div>
              <div className="gdw-row">
                <input type="number" min={2} step={1} className="gdw-inp" value={yardMargin} onChange={(e) => setYardMargin(Math.max(Number(e.target.value) || 2, 2))} />
                <span style={{ fontSize: 12 }}>ft — the patio above can also be dragged out here</span>
              </div>
              <div className="gdw-note" style={{ margin: "0 0 10px 0" }}>Add trees, shrubs, flower beds, mulch borders, sod, or a walkway, then drag them into place in the yard around your garden.</div>
              <div className="gdw-row">
                {Object.entries(LANDSCAPE_TYPES).filter(([key]) => !STRUCTURAL_LANDSCAPE_TYPES.includes(key)).map(([key, t]) => (
                  <button key={key} className="gdw-btn" style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => addLandscape(key)}>+ {t.label}</button>
                ))}
              </div>
              {landscape.filter((l) => !STRUCTURAL_LANDSCAPE_TYPES.includes(l.type)).map(renderLandscapeItem)}
            </div>
            )}

            {activeTab === "trellis" && (
            <div className="gdw-panel">
              <h2><LayoutGrid size={16} /> Trellis &amp; Arches</h2>
              <div className="gdw-note" style={{ margin: "0 0 10px 0" }}>Freestanding arches and bed-to-bed tunnels. Drag them into place like any other item.</div>
              <div className="gdw-row">
                {Object.entries(LANDSCAPE_TYPES).filter(([key]) => STRUCTURAL_LANDSCAPE_TYPES.includes(key)).map(([key, t]) => (
                  <button key={key} className="gdw-btn" style={{ padding: "3px 7px", fontSize: 11 }} onClick={() => addLandscape(key)}>+ {t.label}</button>
                ))}
              </div>
              {landscape.filter((l) => STRUCTURAL_LANDSCAPE_TYPES.includes(l.type)).map(renderLandscapeItem)}
              <div className="gdw-label" style={{ marginTop: 14 }}>Per-bed trellises</div>
              <p className="gdw-note" style={{ margin: "0 0 6px 0" }}>A trellis attached along the back of a single bed is configured on that bed itself, in the Beds tab (look for "More options" on any bed) — it always matches that bed's width automatically.</p>
              {beds.filter((b) => b.trellis).length === 0 ? (
                <p className="gdw-note" style={{ margin: 0 }}>No beds have a trellis yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                  {beds.filter((b) => b.trellis).map((b) => (
                    <li key={b.id}>{b.label} — {b.trellisSide === "length" ? b.length : b.width} ft ({b.trellisSide === "length" ? "length" : "width"} side), {b.trellisHeight || 6} ft tall</li>
                  ))}
                </ul>
              )}
            </div>
            )}

            {activeTab === "irrigation" && (
            <div className="gdw-panel">
              <h2><Droplets size={16} /> Irrigation Planner</h2>
              <p className="gdw-note" style={{ margin: "0 0 10px 0" }}>Plan drip or soaker irrigation and automatically include components in the BOM.</p>
              <div className="gdw-row">
                <button className={`gdw-btn ${irrigation.enabled ? "active" : ""}`} onClick={() => setIrrigation((s) => ({ ...s, enabled: true }))}>Enabled</button>
                <button className={`gdw-btn ${!irrigation.enabled ? "active" : ""}`} onClick={() => setIrrigation((s) => ({ ...s, enabled: false }))}>Disabled</button>
              </div>
              {irrigation.enabled && (
                <>
                  <div className="gdw-row" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#6b6350" }}>Method</span>
                    <button className={`gdw-btn ${irrigation.method === "drip" ? "active" : ""}`} onClick={() => setIrrigation((s) => ({ ...s, method: "drip" }))}>Drip</button>
                    <button className={`gdw-btn ${irrigation.method === "soaker" ? "active" : ""}`} onClick={() => setIrrigation((s) => ({ ...s, method: "soaker" }))}>Soaker hose</button>
                  </div>
                  <div className="gdw-row">
                    <span style={{ fontSize: 11, color: "#6b6350" }}>Zones</span>
                    <input type="number" min={1} max={12} className="gdw-inp" style={{ width: 56 }} value={irrigation.zones} onChange={(e) => setIrrigation((s) => ({ ...s, zones: Math.max(1, Math.min(Number(e.target.value) || 1, 12)) }))} />
                    <span style={{ fontSize: 11, color: "#6b6350" }}>Row spacing (in)</span>
                    <input type="number" min={6} max={36} step={1} className="gdw-inp" style={{ width: 62 }} value={irrigation.rowSpacingIn} onChange={(e) => setIrrigation((s) => ({ ...s, rowSpacingIn: Math.max(6, Math.min(Number(e.target.value) || 6, 36)) }))} />
                    <span style={{ fontSize: 11, color: "#6b6350" }}>Run mins/day</span>
                    <input type="number" min={1} max={180} step={1} className="gdw-inp" style={{ width: 62 }} value={irrigation.minutesPerDay} onChange={(e) => setIrrigation((s) => ({ ...s, minutesPerDay: Math.max(1, Math.min(Number(e.target.value) || 1, 180)) }))} />
                  </div>
                  <div className="gdw-row">
                    <span style={{ fontSize: 11, color: "#6b6350" }}>Days/week</span>
                    <input type="number" min={1} max={7} step={1} className="gdw-inp" style={{ width: 56 }} value={irrigation.daysPerWeek} onChange={(e) => setIrrigation((s) => ({ ...s, daysPerWeek: Math.max(1, Math.min(Number(e.target.value) || 1, 7)) }))} />
                    {irrigation.method === "drip" && (
                      <>
                        <span style={{ fontSize: 11, color: "#6b6350" }}>Emitter spacing (in)</span>
                        <input type="number" min={4} max={24} step={1} className="gdw-inp" style={{ width: 62 }} value={irrigation.emitterSpacingIn} onChange={(e) => setIrrigation((s) => ({ ...s, emitterSpacingIn: Math.max(4, Math.min(Number(e.target.value) || 4, 24)) }))} />
                        <span style={{ fontSize: 11, color: "#6b6350" }}>Emitter GPH</span>
                        <input type="number" min={0.1} max={4} step={0.1} className="gdw-inp" style={{ width: 58 }} value={irrigation.emitterGph} onChange={(e) => setIrrigation((s) => ({ ...s, emitterGph: Math.max(0.1, Math.min(Number(e.target.value) || 0.1, 4)) }))} />
                      </>
                    )}
                  </div>
                  <div className="gdw-note" style={{ margin: "2px 0 0 0" }}>
                    Estimated system: {irrigationPlan.zones} zone{irrigationPlan.zones === 1 ? "" : "s"} · ~{irrigationPlan.mainlineFt} ft mainline · ~{irrigationPlan.lateralFt} ft bed runs{irrigation.method === "drip" ? ` · ~${irrigationPlan.emitterCount} emitters` : ""} · ~{irrigationPlan.gallonsPerWeek} gal/week.
                  </div>
                </>
              )}
            </div>
            )}

            {activeTab === "prices" && (
            <div className="gdw-panel">
              <h2><ShoppingCart size={16} /> Edit Unit Prices</h2>
              <p className="gdw-note" style={{ margin: "0 0 10px 0" }}>All prices used in the shopping list, editable to match your local Home Depot/Lowes pricing.</p>
                <div className="gdw-pricegrid">
                  {Object.keys(prices).map((k) => (
                    <React.Fragment key={k}>
                      <div>{k}</div>
                      <input className="gdw-inp" type="number" step="0.5" value={prices[k]} onChange={(e) => setPrice(k, e.target.value)} />
                    </React.Fragment>
                  ))}
                </div>
            </div>
            )}
          </div>

          {/* ---------- Right: layout + BOM ---------- */}
          <div>
            <div className="gdw-canvaswrap">
              <div className="gdw-noprint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 17, margin: 0 }}><Ruler size={16} style={{ verticalAlign: -2, marginRight: 6 }} />Layout preview</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className={`gdw-btn ${viewMode === "2d" ? "active" : ""}`} onClick={() => setViewMode("2d")}><Map size={13} style={{ verticalAlign: -2 }} /> 2D Plan</button>
                  <button className={`gdw-btn ${viewMode === "3d" ? "active" : ""}`} onClick={enter3dPreview}><Box size={13} style={{ verticalAlign: -2 }} /> 3D Preview</button>
                  {viewMode === "2d" && (
                    <>
                      <button className="gdw-btn" onClick={autoArrange}><LayoutGrid size={13} style={{ verticalAlign: -2 }} /> Auto-arrange</button>
                      <button className="gdw-btn" onClick={() => zoomPlan(1 / 1.2)} title="Zoom out 2D plan">−</button>
                      <button className="gdw-btn" onClick={() => zoomPlan(1.2)} title="Zoom in 2D plan">+</button>
                      <button className="gdw-btn" onClick={overviewPlanViewport} title="Zoom out for full overview">Wide</button>
                      <button className="gdw-btn" onClick={resetPlanViewport} title="Fit full plan in view">Fit</button>
                    </>
                  )}
                  {viewMode === "3d" && (
                    <>
                      <button className={`gdw-btn ${renderQuality3d === "standard" ? "active" : ""}`} onClick={() => setRenderQuality3d("standard")} title="Faster 3D rendering">Standard</button>
                      <button className={`gdw-btn ${renderQuality3d === "cinematic" ? "active" : ""}`} onClick={() => setRenderQuality3d("cinematic")} title="Higher quality physically based rendering">Cinematic</button>
                    </>
                  )}
                </div>
              </div>
              {viewMode === "2d" ? (
                <>
              <p className="gdw-note gdw-noprint" style={{ margin: "0 0 8px 0" }}>Drag to place freely — beds, patios, and landscaping can all go outside the fence, into the surrounding yard. Use mouse wheel (or the − / + buttons) to zoom the 2D plan, including extra zoom-out for large layouts; use <strong>Wide</strong> for a quick overview, then pan with arrows when zoomed in. Click an item to select it, then use the arrow buttons below (or keyboard arrows) to nudge it. Click empty ground or press Esc to deselect. Click the ↻ badge to rotate a bed 90°.</p>
              <div className="gdw-row gdw-noprint" style={{ margin: "0 0 8px 0", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#5b5342" }}>2D zoom: {Math.round(planViewport.zoom * 100)}%</span>
                {planViewport.zoom > 1.01 && (
                  <>
                    <span style={{ fontSize: 12, color: "#8a8065", marginLeft: 8 }}>Pan</span>
                    <button className="gdw-btn" onClick={() => panPlan(-planPanStep, 0)} title="Pan left">←</button>
                    <button className="gdw-btn" onClick={() => panPlan(0, -planPanStep)} title="Pan up">↑</button>
                    <button className="gdw-btn" onClick={() => panPlan(0, planPanStep)} title="Pan down">↓</button>
                    <button className="gdw-btn" onClick={() => panPlan(planPanStep, 0)} title="Pan right">→</button>
                  </>
                )}
              </div>
              <svg ref={svgRef} className="gdw-svg" onWheel={onPlanWheel} viewBox={`${planViewport.x} ${planViewport.y} ${planViewport.width} ${planViewport.height}`}>
                <rect x={-yardMargin} y={-yardMargin} width={enclosure.width + 2 * yardMargin} height={enclosure.length + 2 * yardMargin} fill="#8FBF6E" onClick={() => setSelected(null)} />
                <rect x={0} y={0} width={enclosure.width} height={enclosure.length} fill="#EFE9D6" onClick={() => setSelected(null)} />
                <text x={-yardMargin + 0.7} y={-yardMargin + 1.1} fontSize={0.52} fill="#35592F" fontFamily="Inter" style={{ paintOrder: "stroke", stroke: "#e9f4e3", strokeWidth: 0.08 }}>Exterior landscape zone</text>
                <text x={0.7} y={1.1} fontSize={0.5} fill="#7c6a49" fontFamily="Inter" style={{ paintOrder: "stroke", stroke: "#fff8e8", strokeWidth: 0.08 }}>Garden enclosure</text>
                {["top", "bottom", "left", "right"].map((wall) => {
                  const len = wallLength(wall);
                  const segs = wallSegments(len, gates.filter((g) => g.wall === wall));
                  return segs.map(([s, e], i) => {
                    let x1, y1, x2, y2;
                    if (wall === "top") { x1 = s; y1 = 0; x2 = e; y2 = 0; }
                    else if (wall === "bottom") { x1 = s; y1 = enclosure.length; x2 = e; y2 = enclosure.length; }
                    else if (wall === "left") { x1 = 0; y1 = s; x2 = 0; y2 = e; }
                    else { x1 = enclosure.width; y1 = s; x2 = enclosure.width; y2 = e; }
                    return <line key={`${wall}-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--wood)" strokeWidth={0.15} strokeDasharray="0.5,0.35" />;
                  });
                })}
                {gates.map((g) => {
                  const ep = gateEndpoints(g);
                  const midX = (ep.x1 + ep.x2) / 2, midY = (ep.y1 + ep.y2) / 2;
                  const labelX = midX + ep.nx * 0.9, labelY = midY + ep.ny * 0.9;
                  return (
                    <g key={`gate-${g.id}`}>
                      <line x1={ep.x1} y1={ep.y1} x2={ep.x2} y2={ep.y2} stroke="var(--gold)" strokeWidth={0.16} strokeDasharray="0.2,0.18" />
                      <circle cx={ep.x1} cy={ep.y1} r={0.1} fill="var(--gold)" />
                      <circle cx={ep.x2} cy={ep.y2} r={0.1} fill="var(--gold)" />
                      <text x={labelX} y={labelY} fontSize={0.42} textAnchor="middle" fill="#8a6a1a" fontFamily="Inter">gate</text>
                    </g>
                  );
                })}
                {fencePosts.map((p, i) => {
                  const inGate = gates.some((g) => g.wall === p.wall && p.wallOffset > g.offset && p.wallOffset < g.offset + g.width);
                  if (inGate) return null;
                  return (
                    <circle
                      key={`post-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={p.isCorner ? 0.23 : 0.16}
                      fill="var(--wood)"
                      stroke={p.isCorner ? "var(--gold)" : "none"}
                      strokeWidth={p.isCorner ? 0.06 : 0}
                    />
                  );
                })}
                {layout.ringActive && (
                  <rect x={layout.ringLine.x} y={layout.ringLine.y} width={layout.ringLine.w} height={layout.ringLine.h} fill="none" stroke="var(--gold)" strokeWidth={0.08} strokeDasharray="0.3,0.3" />
                )}
                {landscape.map((l) => {
                  const t = LANDSCAPE_TYPES[l.type];
                  const isSel = selected?.kind === "landscape" && selected.bedId === l.id;
                  const key = `ls-${l.id}`;
                  return (
                    <g key={key} style={{ cursor: "grab" }} opacity={dragKey === key ? 0.75 : 1} onPointerDown={(e) => startDrag(e, "landscape", l.id, null, l.width, l.length, false)}>
                      {t.circle ? (
                        <circle cx={l.x + l.width / 2} cy={l.y + l.length / 2} r={l.width / 2} fill={t.color} fillOpacity={0.85} stroke={isSel ? "var(--gold)" : "#2E4A2A"} strokeWidth={isSel ? 0.14 : 0.06} />
                      ) : (
                        <rect x={l.x} y={l.y} width={l.width} height={l.length} fill={t.color} fillOpacity={0.9} stroke={isSel ? "var(--gold)" : "#2E4A2A"} strokeWidth={isSel ? 0.14 : 0.06} rx={0.1} />
                      )}
                      {l.type === "arch" && (
                        <line x1={l.x + l.width * 0.12} y1={l.y - l.length * 0.15} x2={l.x + l.width * 0.88} y2={l.y - l.length * 0.15} stroke="#5C4023" strokeWidth={0.14} />
                      )}
                      {l.type === "doubleArch" && (
                        <g stroke="#5C4023">
                          <line x1={l.x + l.width * 0.08} y1={l.y} x2={l.x + l.width * 0.92} y2={l.y} strokeWidth={0.14} />
                          <line x1={l.x + l.width * 0.08} y1={l.y + l.length} x2={l.x + l.width * 0.92} y2={l.y + l.length} strokeWidth={0.14} />
                          <line x1={l.x + l.width * 0.08} y1={l.y} x2={l.x + l.width * 0.08} y2={l.y + l.length} strokeWidth={0.08} strokeDasharray="0.2,0.15" />
                          <line x1={l.x + l.width * 0.92} y1={l.y} x2={l.x + l.width * 0.92} y2={l.y + l.length} strokeWidth={0.08} strokeDasharray="0.2,0.15" />
                        </g>
                      )}
                      {l.type === "tunnel" && (
                        <g stroke="#4A5560" strokeWidth={0.05} opacity={0.8}>
                          {[0.2, 0.4, 0.6, 0.8].map((f, i) => <line key={i} x1={l.x + l.width * f} y1={l.y} x2={l.x + l.width * f} y2={l.y + l.length} />)}
                          {[0.25, 0.5, 0.75].map((f, i) => <line key={i} x1={l.x} y1={l.y + l.length * f} x2={l.x + l.width} y2={l.y + l.length * f} />)}
                        </g>
                      )}
                      <text x={l.x + l.width / 2} y={l.y + l.length / 2} fontSize={0.34} textAnchor="middle" fill="#1E2E1C" fontFamily="Inter" style={{ paintOrder: "stroke", stroke: "#F4F8EE", strokeWidth: 0.08 }}>
                        {landscapeLabelText(l, t)}
                      </text>
                    </g>
                  );
                })}
                {patios.map((patio) => {
                  const key = `pt-${patio.id}`;
                  const isSel = selected?.kind === "patio" && selected.bedId === patio.id;
                  return (
                    <g key={key} style={{ cursor: "grab" }} opacity={dragKey === key ? 0.75 : 1} onPointerDown={(e) => startDrag(e, "patio", patio.id, null, patio.width, patio.length, false)}>
                      <rect x={patio.x} y={patio.y} width={patio.width} height={patio.length} fill={patio.surface === "gravel" ? "#B9AF9C" : "#D9C9A8"} stroke={isSel ? "var(--gold)" : "#B5502A"} strokeWidth={isSel ? 0.16 : 0.08} />
                      {patio.structureType !== "none" && (
                        <rect x={patio.x + 0.35} y={patio.y + 0.35} width={patio.width - 0.7} height={patio.length - 0.7} fill="none" stroke="#8A6A45" strokeWidth={0.12} strokeDasharray="0.25,0.2" />
                      )}
                      <text x={patio.x + patio.width / 2} y={patio.y + patio.length / 2} fontSize={0.5} textAnchor="middle" fill="#5b4632" fontFamily="Inter">{patio.structureType !== "none" ? (STRUCTURE_TYPES[patio.structureType] || STRUCTURE_TYPES.none).label : patio.label}</text>
                    </g>
                  );
                })}
                {layout.placed.map((b, i) => {
                  const key = `${b.bedId}-${b.idx}`;
                  const isSel = selected?.kind === "bed" && selected.bedId === b.bedId && selected.idx === b.idx;
                  const canvasW = b.rotated ? b.length : b.width;
                  const canvasH = b.rotated ? b.width : b.length;
                  const strokeColor = isSel ? "var(--gold)" : "#5C4023";
                  const strokeW = isSel ? 0.16 : 0.32;
                  const verts = b.shape === "L" ? lShapeVertices(b.width, b.length, b.notchWidth, b.notchDepth, displayCornerToLocal(b.notchCorner, b.rotated)) : [[0, 0], [b.width, 0], [b.width, b.length], [0, b.length]];
                  const dots = plantDots(b.width, b.length, b.shape === "L", verts);
                  const shapeEl = (
                    <>
                      {b.shape === "L" ? (
                        <polygon points={verts.map(([px, py]) => `${px},${py}`).join(" ")} fill={b.outOfBounds ? "#D98A6E" : "#5B4632"} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />
                      ) : (
                        <rect x={0} y={0} width={b.width} height={b.length} fill={b.outOfBounds ? "#D98A6E" : "#5B4632"} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round" />
                      )}
                      {dots.map(([dx, dy], di) => (
                        <circle key={di} cx={dx} cy={dy} r={0.16} fill={di % 3 === 0 ? "#6B9950" : di % 3 === 1 ? "#8FBF6E" : "#5E8A46"} />
                      ))}
                    </>
                  );
                  const trellisLine = b.trellis ? (
                    b.trellisSide === "length"
                      ? <line x1={b.width} y1={0} x2={b.width} y2={b.length} stroke="#5C7A57" strokeWidth={0.22} strokeDasharray="0.35,0.15" />
                      : <line x1={0} y1={b.length} x2={b.width} y2={b.length} stroke="#5C7A57" strokeWidth={0.22} strokeDasharray="0.35,0.15" />
                  ) : null;
                  return (
                    <g key={key} style={{ cursor: "grab" }} opacity={dragKey === key ? 0.75 : 1} onPointerDown={(e) => startDrag(e, "bed", b.bedId, b.idx, b.width, b.length, b.rotated)}>
                      {b.rotated ? (
                        <g transform={`translate(${b.x + b.length},${b.y}) rotate(90)`}>{shapeEl}{trellisLine}</g>
                      ) : (
                        <g transform={`translate(${b.x},${b.y})`}>{shapeEl}{trellisLine}</g>
                      )}
                      <text x={b.x + canvasW / 2} y={b.y + canvasH / 2} fontSize={0.48} textAnchor="middle" fill="#FBF6EA" fontFamily="Inter" style={{ paintOrder: "stroke", stroke: "#3a2a1c", strokeWidth: 0.05 }}>{b.width}×{b.length}{b.shape === "L" ? " L" : ""}</text>
                      <g transform={`translate(${b.x + canvasW - 0.6}, ${b.y + 0.6})`} onPointerDown={(e) => e.stopPropagation()} onClick={() => rotateBed(b.bedId, b.idx)} style={{ cursor: "pointer" }}>
                        <circle r={0.55} fill="#FBF6EA" stroke="#3F5F3D" strokeWidth={0.06} />
                        <RotateCw x={-0.32} y={-0.32} width={0.64} height={0.64} color="#3F5F3D" />
                      </g>
                    </g>
                  );
                })}
              </svg>
              {!layout.fits && (
                <p className="gdw-note" style={{ color: "#B5502A" }}>One or more beds (shown in orange) fall outside the enclosure — drag them back inside, shrink them, or increase the enclosure footprint.</p>
              )}
              {selected && (
                <div className="gdw-row gdw-noprint" style={{ marginTop: 4, alignItems: "center", background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ fontSize: 12, color: "#5b5342" }}>
                    Move {selected.kind === "patio" ? (patios.find((p) => p.id === selected.bedId)?.label || "patio") : selected.kind === "landscape" ? (landscape.find((l) => l.id === selected.bedId)?.label || "item") : (beds.find((b) => b.id === selected.bedId)?.label || "bed")}:
                  </span>
                  <button className="gdw-btn" onClick={() => nudge(-nudgeStep, 0)} title="Nudge left">←</button>
                  <button className="gdw-btn" onClick={() => nudge(0, -nudgeStep)} title="Nudge up">↑</button>
                  <button className="gdw-btn" onClick={() => nudge(0, nudgeStep)} title="Nudge down">↓</button>
                  <button className="gdw-btn" onClick={() => nudge(nudgeStep, 0)} title="Nudge right">→</button>
                  <select className="gdw-inp" style={{ width: "auto" }} value={nudgeStep} onChange={(e) => setNudgeStep(Number(e.target.value))}>
                    <option value={0.25}>0.25 ft step</option>
                    <option value={0.5}>0.5 ft step</option>
                    <option value={1}>1 ft step</option>
                  </select>
                  <button className="gdw-btn" style={{ marginLeft: "auto" }} onClick={() => setSelected(null)}>Deselect</button>
                </div>
              )}
              <div className="gdw-legend">
                <span><i className="gdw-swatch" style={{ background: "#5B4632", border: "2px solid #5C4023" }} /> raised bed</span>
                {patios.length > 0 && <span><i className="gdw-swatch" style={{ background: "#D9C9A8" }} /> patio</span>}
                {landscape.length > 0 && <span><i className="gdw-swatch" style={{ background: "#3F6B3A" }} /> landscaping</span>}
                <span><i className="gdw-swatch" style={{ background: "var(--wood)", borderRadius: "50%" }} /> fence post</span>
                {layout.ringActive && <span><i className="gdw-swatch" style={{ background: "var(--gold)" }} /> {perimeterInset} ft setback line</span>}
                {layout.placed.some((b) => b.trellis) && <span><i className="gdw-swatch" style={{ background: "#5C7A57" }} /> trellis (back edge)</span>}
              </div>
                </>
              ) : (
                <>
                  <p className="gdw-note gdw-noprint" style={{ margin: "0 0 8px 0" }}>
                    Drag to orbit, scroll to zoom. {renderQuality3d === "cinematic" ? "Cinematic mode uses physically based shading, ACES tonemapping, cedar-style bed framing with mesh guards, soft shadows, and higher pixel density for a more realistic look." : "Standard mode is optimized for speed on older devices."} This web renderer is an approximation; Unreal Engine 5 features like Nanite/Lumen and full offline path tracing are not available directly in-browser.
                  </p>
                  <div ref={threeContainerRef} className="gdw-three gdw-noprint" style={{ width: "100%", borderRadius: 8, overflow: "hidden", background: "#BFE3D0" }} />
                </>
              )}
            </div>

            <div className="gdw-bom">
              <div className="gdw-bomhead">
                <h2><ShoppingCart size={17} style={{ verticalAlign: -3, marginRight: 6 }} />Bill of Materials</h2>
                <div className="gdw-actions gdw-noprint">
                  <button className="gdw-btn" onClick={copyList}><Copy size={13} style={{ verticalAlign: -2 }} /> Copy</button>
                  <button className="gdw-btn primary" onClick={exportCSV}><Download size={13} style={{ verticalAlign: -2 }} /> Export CSV</button>
                </div>
              </div>

              {bom.sections.map((s) => (
                <div className="gdw-section" key={s.name}>
                  <div className="gdw-section-title"><span>{s.name}</span><span>{fmt(s.subtotal)}</span></div>
                  {s.note && <div className="gdw-note">{s.note}</div>}
                  <div className="gdw-tablewrap">
                  <table className="gdw-table">
                    <tbody>
                      {s.items.map((it, i) => (
                        <tr key={i}>
                          <td>{it.desc}</td>
                          <td className="num">{it.qty} {it.unit}</td>
                          <td className="num">{fmt(it.price)}</td>
                          <td className="num">{it.range ? `${fmt(it.range[0])}–${fmt(it.range[1])}` : fmt(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))}

              <div className="gdw-grand">
                <span className="lbl">Estimated Total</span>
                <span className="amt">{fmt(bom.grandTotal)}</span>
              </div>
              <p className="gdw-note" style={{ marginTop: 8 }}>Prices are editable estimates — verify current pricing and stock at your local Home Depot or Lowes before ordering. Structure line items are rough DIY-kit ranges, not a materials takeoff.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
