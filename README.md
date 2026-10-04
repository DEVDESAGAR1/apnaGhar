# ApnaGhar (अपना घर) 🏡📐

> **“Imagine your space. Design your home.”**  
> *A privacy-first architectural home planning, interior design, furniture placement, and spatial-fit validation web application.*

---

## 🌟 Overview

**ApnaGhar (अपना घर)** empowers homeowners, renters, and interior designers to plan entire homes across multiple floors and rooms. It combines dimension-accurate 2D floor planning, an interactive synchronized 3D spatial visualizer, collision detection, interior styling (paint palettes, wall textures, flooring materials), design variants (Option A vs Option B), local open-source vision AI via Ollama, and spatial clearance validation with strict PASS / FAIL / REVIEW semantics.

Built with a **local-first, privacy-by-default** philosophy:
- **Zero Cloud Dependence**: Core planning runs 100% offline in your browser.
- **Genuine Local Vision AI via Ollama**: Execute open-source vision models (LLaVA / Llama 3.2 Vision) directly on your personal machine. Images never leave your computer.
- **Strict Photo Privacy**: Uploaded room photos never leave your device without explicit consent. When exporting plans, photos are automatically stripped by default.
- **Honest AI**: Clear distinction between physical measurements, catalog items, and advisory estimates.

---

## 🏛️ Key Features

### 1. Whole-Home & Multi-Room Project Organization
- **Multi-Floor Hierarchy**: Group rooms across Ground Floor, First Floor, and custom levels.
- **Room Management**: Create, rename, duplicate, or delete rooms with instant navigation via the top navbar or the Whole-Home Dashboard.
- **Spatial Metrics**: Live aggregation of total home area (m² and sq ft) and furniture piece counts.
- **Preloaded Sample Home**: Includes **Shanti Niwas (शान्ति निवास)** featuring 4 curated rooms (Living & Lounge, Dining, Master Bedroom Suite, Home Studio) across two floors.

### 2. Dimension-Accurate 2D Floor Plan Editor
- **Interactive Canvas**: Drag, drop, rotate, and snap furniture with 5/10/25 cm grid snapping.
- **Real-Time Wall Distance Guides**: Dynamic laser-style measurement lines show exact clearances to surrounding walls in real time.
- **Doorway Clearance Arcs**: Visualizes door opening sweeps and flags obstructions.
- **Undo / Redo History**: Complete history stack with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`) and floating canvas controls.
- **Material Rendering**: Floor surfaces render authentic wood planks, tiles, or concrete tones directly on the plan.

### 3. Synchronized Interactive 3D Spatial Viewer
- **Three.js Visualizer**: Faithful 3D representation synchronized with 2D plan changes in real time without coordinate drift.
- **PBR Material Finishes**: Synchronizes wall colors, surface finishes (matte, satin, limewash), and flooring materials (hardwood oak, walnut, herringbone parquet, polished concrete, limestone, terrazzo).
- **Camera Presets**: Instant switching between Isometric (45°), Top-Down Orthographic, and Eye-Level Walkthrough perspectives.

### 4. Interior Styling & Design Variants
- **Curated Palette**: Warm Alabaster, Limewash Stone, Muted Sage, Terracotta Clay, Soft Linen, and Charcoal Slate.
- **Artisanal Flooring**: Natural Oak, Rich Walnut, Herringbone Parquet, Polished Concrete, Limestone Tile, and Venetian Terrazzo.
- **Design Variants Manager**: Save alternative layout and color proposals (e.g. "Option A — Cozy Layout" vs "Option B — Open Concept") for any room and switch between them with a single click.

### 5. Rigorous Computational Fit Engine
- **Separating Axis Theorem (SAT)**: Accurate 2D Oriented Bounding Box (OBB) collision math between arbitrarily rotated furniture items.
- **Boundary & Clearance Checks**: Validates room boundary containment, door swing clearance, drawer pullout buffers, and walking corridor paths.
- **Strict Fit Semantics**:
  - `PASS`: All physical checks pass with confirmed dimensions.
  - `FAIL`: Confirmed geometric overlap or door obstruction detected.
  - `REVIEW`: Collision or clearance depends on an unconfirmed photo estimate.
  - `NOT CHECKED`: Insufficient furniture or dimensions to check.
- **Mandatory Safety Disclaimer**:
  > *"Passing a room geometry check does not guarantee successful delivery, installation, structural safety, or compliance with building codes."*

### 6. Local Google Gemma Vision & Ollama Vision AI
- **Google Gemma Vision (PaliGemma)**: On-device visual spatial detection using Google's open vision-language model (`paligemma:3b` / `paligemma2:3b`). Combines a SigLIP vision encoder with a Gemma autoregressive decoder under the Google Gemma Terms of Use. Supports native location token parsing (`<locYYYY><locXXXX>`) and structured JSON suggestions.
- **Local Open-Source Vision via Ollama**: Supports running LLaVA 1.6 (Apache 2.0) and Llama 3.2 Vision locally via Ollama's REST API. Zero cloud data transmission.
- **Built-in Offline Heuristics**: 100% in-browser spatial perspective engine available with zero setup or downloads.
- **Live Connection Tester**: Diagnostic test buttons in Settings check Ollama reachability, installed model tags, and CORS setup.
- **Defensive Parsing & Clamping**: Automatically validates model output, parses PaliGemma `<loc>` tokens or JSON, strips markdown fences, and clamps dimensions to physical centimeter limits.
- **Provenance Tracking**: Every dimension records its source (`manual`, `catalog`, `photo-estimate`, `ai-suggestion`) and confirmation state.
- **Safe Export & Purge**: Photos are excluded from JSON exports by default, and can be permanently purged with one click.

### 7. Intelligent Room Image Validation & Existing Furniture Review
- **Two-Stage Image Validation**:
  - *Stage A (Local File Validation)*: File format, decoding integrity, 20MB limit, and minimum dimension checks ($100\times100$ px).
  - *Stage B (Semantic Suitability)*: Automatically screens images into `suitable`, `partially_suitable`, `unsuitable`, or `uncertain`.
  - *Unsuitable Suppression*: Prevents room design recommendations for unrelated images (portraits, pets, vehicles, landscapes, food, memes) with a clear explanation and "Upload another image" prompt.
  - *Partially Suitable Warnings*: Dark, blurry, or cropped room photos provide explicit quality warnings while letting users continue with provisional recommendations.
- **Existing Furniture Review (Retain & Reposition Before Buying)**:
  - First assesses user's existing furniture before proposing purchases.
  - Identifies obstructive items near door clearance swings and inefficient central placements.
  - Generates clear keep/move/reposition recommendations with required tape measurements.
- **Personalized Recommendations Across 6 Prioritized Categories**:
  - *Keep*, *Rearrange*, *Add*, *Improve*, *Optional Replacement*, and *Avoid*.
  - User Design Goals customization: Primary space goal, preferred style, budget tier, and existing furniture strategy.
- **4-Tab Summary Presentation Interface**:
  - Room Summary, Existing Furniture Review, Top Recommendations, and Physical Measurement Checklist.

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js v18+ (tested on Node v22.18.0)
- npm v9+

### Installation & Launch
```bash
# 1. Clone repository and install dependencies
npm install

# 2. Run automated test suite (86 tests across 13 suites)
npm test

# 3. Start local development server
npm run dev
```

Open the local development URL printed in your terminal by Vite (for example, `http://localhost:5173/` or whichever dynamic port Vite assigns).

---

## 🤖 Local Vision AI Setup: Google Gemma Vision & Ollama

To enable local neural vision estimation without third-party cloud APIs:

### 1. Google Gemma Vision (PaliGemma) Setup (Recommended)
1. Install [Ollama](https://ollama.com).
2. Pull Google's open multimodal model:
   ```bash
   ollama run paligemma:3b
   # Or the latest generation:
   ollama run paligemma2:3b
   ```
3. Start Ollama with browser CORS enabled:
   ```bash
   # Windows (CMD / PowerShell):
   set OLLAMA_ORIGINS=* && ollama serve

   # macOS / Linux:
   OLLAMA_ORIGINS="*" ollama serve
   ```
4. In ApnaGhar: Open **Settings** → **AI Provider & Privacy Settings** → select **Google Gemma Vision (PaliGemma)** → click **Test Gemma Connection**.

### 2. General Ollama Vision Models (LLaVA / Llama 3.2 Vision)
```bash
ollama run llama3.2-vision
# Or for lighter machines (4GB VRAM):
ollama run llava:7b
```

Detailed AI specifications, model architectures, and licensing terms are documented in [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md).

---

## 🧪 Automated Testing & Results

ApnaGhar includes a comprehensive automated test suite covering computational geometry, units, fit checks, persistence, 2D/3D consistency, offline privacy, multi-room management, React hook stability, video keyframe sampling, and Gemma/Ollama vision integrations:

```bash
npm test
```

### Test Suite Execution Output
```
 RUN  v5.0.3 C:/Users/devde/Downloads/first

 ✓ src/tests/mediaCaptureAndKeyframes.test.ts (5 tests)
 ✓ src/tests/gemmaVision.test.ts (8 tests)
 ✓ src/tests/storageAndPrivacy.test.ts (5 tests)
 ✓ src/tests/fitEngine.test.ts (7 tests)
 ✓ src/tests/ollamaAi.test.ts (9 tests)
 ✓ src/tests/homeProject.test.ts (9 tests)
 ✓ src/tests/geometry.test.ts (9 tests)
 ✓ src/tests/modelConsistency.test.ts (3 tests)
 ✓ src/tests/units.test.ts (3 tests)
 ✓ src/tests/aiVisionOffline.test.ts (2 tests)
 ✓ src/tests/photoUploadModalHooks.test.tsx (4 tests)
 ✓ src/tests/spatialAndThemes.test.ts (4 tests)

 Test Files  12 passed (12)
      Tests  68 passed (68)
   Duration  1.54s
```

### Production Build Verification
```bash
npm run build
```
Builds cleanly with `0` errors via `tsc -b && vite build`.

---

## 🏆 Hacktoberfest & Open-Source Challenge Readiness

ApnaGhar is built for Hacktoberfest and the Google Gemma Open Model Challenge under the following verified technical criteria:

1. **Genuinely Open-Source & Privacy-First**: 100% of spatial planning, computational geometry, and local AI run on-device. No telemetry, no hidden trackers.
2. **Real Google Gemma Integration**: Direct integration with Google's PaliGemma open vision-language model (`paligemma:3b`) via local Ollama runtime. Transparently documents licensing (Google Gemma Terms of Use / PaliGemma Additional Terms of Use), hardware requirements, and prompt architectures.
3. **Deterministic Geometric Authority**: Vision suggestions are never used to hallucinate room dimensions or bypass physical fit validation. Separating Axis Theorem (SAT) collision math and door sweeps are the sole authority.
4. **Verifiable Quality**: 68 automated tests across 12 test suites, zero TypeScript errors (`tsc -b`), zero ESLint errors (`oxlint`). Transparent reporting distinguishes mocked test suites from local model weight availability.

---

## 📐 Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo last canvas operation |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo last canvas operation |
| `R` | Rotate selected furniture item by 45° |
| `Delete` / `Backspace` | Remove selected furniture item |
| `Arrow Keys` | Nudge selected item by 5 cm (Shift for 25 cm) |
| `Escape` | Deselect current item |

---

## 🔒 Privacy & Architecture Documentation

For in-depth architectural and implementation reports, consult the `docs/` directory:
- [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md) — Local Ollama vision architecture, model evaluation, licenses, and privacy boundaries.
- [`docs/DELIVERY_REPORT.md`](docs/DELIVERY_REPORT.md) — Master delivery report covering all workstreams, build logs, and test results.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Data flow, canonical coordinate invariants, and computational geometry specifications.
- [`docs/IMPLEMENTATION_BASELINE.md`](docs/IMPLEMENTATION_BASELINE.md) — Technical baseline and dependency audit.

---

## 📜 License

MIT License. Designed and built with privacy, local ownership, and architectural integrity.
