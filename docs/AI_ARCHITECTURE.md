# ApnaGhar (अपना घर) — AI Architecture & Vision Provider Specification

**Date**: 2026-10-04  
**Product**: ApnaGhar (अपना घर) — *“Imagine your space. Design your home.”*  
**Document**: AI Architecture, Open-Source Model Evaluation & Privacy Boundaries  

---

## 1. Executive Summary & Privacy Principles

Household room photographs contain sensitive personal information: family portraits, private belongings, architectural layout, window vantage points, and home security details. 

**ApnaGhar (अपना घर)** strictly guarantees:
1. **Local-First by Default**: The primary spatial vision engine runs 100% locally in the browser with zero external calls.
2. **Genuine Open-Source Vision via Ollama**: Users can execute local open-source vision models (e.g., LLaVA, Llama 3.2 Vision) directly on their personal GPU/CPU via the Ollama REST API. Images never leave the user's computer.
3. **No Silent Cloud Fallback**: If local Ollama is offline or unavailable, the application provides diagnostic feedback and offers an immediate fallback to the built-in offline heuristic engine. It **never** silently transmits images to a cloud service.
4. **Cloud AI is Strictly Opt-In**: Google Gemini 1.5 Flash Vision is supported only as an optional remote provider requiring an explicit user consent checkbox and a user-provided API key.
5. **Deterministic Geometry Authority**: AI suggestions are always provisional estimates (`isConfirmed: false`). The deterministic Separating Axis Theorem (SAT) collision math and door-clearance engine remain the sole authority for physical fit verification.

---

## 2. Supported AI Providers

ApnaGhar provides a modular multi-provider architecture managed via [`src/utils/aiVision.ts`](file:///c:/Users/devde/Downloads/first/src/utils/aiVision.ts):

```
                                  ┌───────────────────────────────┐
                                  │      User Uploads Photo       │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                   ┌─────────────────────────────┐
                                   │   Active Provider Check     │
                                   └──────────────┬──────────────┘
                                                  │
                 ┌─────────────────────────┼─────────────────────────┼─────────────────────────┐
                 ▼                         ▼                         ▼                         ▼
     ┌────────────────────────┐┌────────────────────────┐┌────────────────────────┐┌────────────────────────┐
     │  Built-in Heuristics   ││  Google Gemma Vision   ││   Local Ollama Vision  ││  Google Gemini Cloud   │
     │  (100% In-Browser)     ││  (PaliGemma on Ollama) ││   (LLaVA / Llama 3.2)  ││  (External API)        │
     └───────────┬────────────┘└───────────┬────────────┘└────────────┬───────────┘└────────────┬───────────┘
                 │                         │                          │                         │
                 │ 0ms network             │ POST /api/generate       │ POST /api/generate      │ Requires Key & Consent
                 │ Rule-based spatial      │ paligemma:3b (Private)   │ localhost:11434 (Priv)  │ Remote inference
                 │                         │                          │                         │
                 └─────────────────────────┴────────────┬─────────────┴─────────────────────────┘
                                                        │
                                                        ▼
                                        ┌───────────────────────────────┐
                                        │  Schema Validation & Clamping │
                                        │  (Physical cm Dimensions)     │
                                        └───────────────┬───────────────┘
                                                        │
                                                        ▼
                                        ┌───────────────────────────────┐
                                        │   Provisional Suggestions     │
                                        │   (Provenance: 'ai-suggestion'│
                                        │    isConfirmed: false)        │
                                        └───────────────┬───────────────┘
                                                        │ User clicks "Confirm & Add"
                                                        ▼
                                        ┌───────────────────────────────┐
                                        │  Deterministic SAT Fit Engine │
                                        │  (PASS / FAIL / REVIEW)       │
                                        └───────────────────────────────┘
```

### Provider Matrix

| Provider | Inference Location | Network Access | API Key Needed | Provenance Tag | Model License |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Built-in Heuristic** | Browser JavaScript | None (0 KB) | No | `photo-estimate` | MIT License |
| **Google Gemma Vision** | User Machine (GPU/CPU) | Localhost only | No | `ai-suggestion` | Google Gemma Terms of Use / PaliGemma Additional Terms of Use |
| **Local Ollama** | User Machine (GPU/CPU) | Localhost only | No | `ai-suggestion` | Apache 2.0 / Llama 3.2 Community |
| **Google Gemini** | Google Cloud Datacenter | Internet required | Yes (User-provided) | `ai-suggestion` | Google Cloud Terms of Service |

---

## 3. Real Google Gemma Vision (PaliGemma) Architecture

### 3.1 Overview & Model Details
Google's **PaliGemma** (and PaliGemma 2) is a lightweight, open vision-language model (VLM) developed by Google DeepMind and Google Research. It integrates:
- **Vision Encoder**: Contrastive SigLIP-So400m/14 (operating at $224 \times 224$ or $448 \times 448$ resolution) that processes image patch embeddings.
- **Language Decoder**: Gemma-2B / Gemma-2-2B autoregressive transformer decoder that produces text and specialized token sequences.
- **Parameters**: ~3 Billion parameters (quantized to ~3.5 GB on Ollama).
- **License**: **Google Gemma Terms of Use** and **PaliGemma Additional Terms of Use** (permissive open-model terms allowing responsible commercial and research use).
- **System Requirements**: 8 GB+ System RAM or NVIDIA/AMD/Apple GPU with 4–6 GB VRAM.

### 3.2 Dual Response Parsing Architecture
PaliGemma was pre-trained and fine-tuned on diverse spatial tasks including object detection and spatial grounding. In ApnaGhar, [`src/utils/aiVision.ts`](file:///c:/Users/devde/Downloads/first/src/utils/aiVision.ts) implements dual response parsing in `parseAndValidateGemmaVisionResponse`:

1. **Native Location Token Parsing (`<locYYYY><locXXXX><locYYYY><locXXXX> {label}`)**:
   PaliGemma represents bounding boxes using 1024 discrete spatial bins from `<loc0000>` to `<loc1023>` representing $[y_{\min}, x_{\min}, y_{\max}, x_{\max}]$.
   ApnaGhar detects this pattern, extracts the 2D bounding boxes normalized to $[0, 1]$, maps them to physical room centimeter coordinates $(x, y)$, and correlates object labels (`sofa`, `table`, `bed`, `chair`, `storage`) to catalog dimensions and 3D models.
2. **Structured JSON Fallback & Markdown Fence Stripping**:
   When prompted for structured JSON, PaliGemma or instruction-tuned variants output standard JSON arrays. ApnaGhar detects JSON blocks, strips markdown code fences, and validates and clamps all measurements.

### 3.3 Physical Clamping & Safety Invariants
- Vision models estimate appearance, not tape-measure millimeters.
- Every suggestion is tagged with `provenance: 'ai-suggestion'` and `isConfirmed: false`.
- Dimensions are clamped to physical boundaries ($X \in [W/2, \text{RoomW}-W/2]$, $Y \in [D/2, \text{RoomL}-D/2]$).
- All fit checks remain authoritative in the deterministic Separating Axis Theorem (SAT) engine.

---

## 4. Other Open-Source Vision Models for Ollama

ApnaGhar also supports general multimodal vision models compatible with Ollama's image generation endpoint (`/api/generate` with `images: [base64]`):

### Recommended Models:

1. **Google PaliGemma (`paligemma:3b` / `paligemma2:3b`)**:
   - Google's official open vision model. Runs efficiently on consumer hardware (~3.5 GB).
   - Command: `ollama run paligemma:3b`

2. **Meta Llama 3.2 Vision (`llama3.2-vision:11b`)**:
   - Multimodal transformer combining Llama 3 text model with cross-attention vision adapter.
   - Command: `ollama run llama3.2-vision`

3. **LLaVA 1.6 (`llava:7b` / `llava:13b`)**:
   - Large Language and Vision Assistant combining CLIP ViT with Vicuna/Mistral LLM.
   - Command: `ollama run llava:7b`

3. **Moondream 2 (`moondream:1.8b`)**:
   - **Architecture**: Lightweight compact vision model designed for resource-constrained edge devices.
   - **Parameters**: 1.8 Billion (~1.5 GB download).
   - **License**: **Apache 2.0** (Open Source).
   - **System Requirements**: Runs comfortably on modern CPUs with 4 GB RAM.
   - **Installation**: `ollama run moondream`

---

## 4. Ollama Installation & Setup Guide

To run local vision inference with ApnaGhar:

### Step 1: Install Ollama
Download and install Ollama from [https://ollama.com](https://ollama.com) for Windows, macOS, or Linux.

### Step 2: Pull a Vision Model
Open your terminal and run:
```bash
ollama run llama3.2-vision
# Or for lighter machines:
ollama run llava:7b
```

### Step 3: Configure Browser CORS
Browsers enforce Cross-Origin Resource Sharing (CORS) on fetch requests to `http://localhost:11434`. By default, Ollama only permits localhost origins. To allow ApnaGhar to query Ollama from your local browser:

- **Windows (Command Prompt / PowerShell)**:
  ```cmd
  set OLLAMA_ORIGINS=*
  ollama serve
  ```
- **macOS / Linux**:
  ```bash
  OLLAMA_ORIGINS="*" ollama serve
  ```
- **Ollama Desktop App (macOS/Windows)**:
  Add `OLLAMA_ORIGINS="*"` to your system environment variables.

### Step 4: Verify in ApnaGhar
1. Open **Settings** in ApnaGhar.
2. Under **AI Provider & Privacy Settings**, select **Local Ollama Vision (Open-Source)**.
3. Click **Test Connection**. A green badge will confirm connectivity and list all installed models.

---

## 5. Structured Output & Physical Validation

Vision models frequently produce varying formatting and non-physical measurements. ApnaGhar implements defensive parsing in [`parseAndValidateSuggestions`](file:///c:/Users/devde/Downloads/first/src/utils/aiVision.ts):

1. **Markdown Fence Stripping**: Automatically detects and unwraps ` ```json ... ``` ` blocks.
2. **Schema Enforcement**: Normalizes both array format `[...]` and object format `{"suggestions": [...]}`.
3. **Physical Clamping**:
   - Width: Clamped to $[30\text{ cm}, 350\text{ cm}]$.
   - Depth: Clamped to $[30\text{ cm}, 250\text{ cm}]$.
   - Height: Clamped to $[30\text{ cm}, 240\text{ cm}]$.
   - Position: Clamped strictly inside room bounds:
     $$X \in \left[\frac{\text{Width}}{2}, \text{RoomWidth} - \frac{\text{Width}}{2}\right]$$
     $$Y \in \left[\frac{\text{Depth}}{2}, \text{RoomLength} - \frac{\text{Depth}}{2}\right]$$
4. **Catalog Model Mapping**: Validates `modelType` against physical 3D meshes (`sofa_3seater`, `coffee_table`, `tv_unit`, `armchair`, `dining_table`, `bed_queen`, `nightstand`, `desk`, `bookcase`, `plant`).

---

## 6. Deterministic Spatial Independence

**Critical Safety Property**: AI never directly decides whether furniture fits.

1. When an AI suggestion is added to a room without confirmation, it is saved with `provenance: 'ai-suggestion'` and `isConfirmed: false`.
2. The spatial fit engine flags all unconfirmed items with a **`REVIEW`** status under the `measurement-confidence` category.
3. Overlaps involving unconfirmed items trigger `REVIEW` rather than premature failure, signaling to the user that measurements must be verified on site.
4. Only after physical confirmation by the user (`isConfirmed: true`, `provenance: 'manual'`) does the item become eligible for definitive **`PASS`** evaluation.

---

## 7. Camera Capture, Video Walkthrough & Keyframe Sampling

To capture spaces accurately without third-party mobile apps, ApnaGhar supports three on-device capture methods directly in the browser:

### 7.1 Input Methods
1. **Existing Photo Upload**: Supports JPEG, PNG, and WebP up to 15 MB with client-side canvas preview and bounding box overlays.
2. **Live Camera Capture (`getUserMedia`)**:
   - Uses `navigator.mediaDevices.getUserMedia` with `facingMode: { ideal: 'environment' }` for mobile rear cameras.
   - Enumerate available video input devices for quick switching.
   - Requires user initiation (no automatic camera turn-on).
   - Instant capture, live preview, retake, and confirm workflows.
   - All media stream tracks are immediately stopped (`track.stop()`) on capture completion, modal close, or tab change.
3. **Room Video Walkthrough Recording**:
   - Records via browser `MediaRecorder` API with auto-detected codecs (`video/webm;codecs=vp9`, `video/webm;codecs=vp8`, `video/mp4`).
   - Recording timer with visible pulsating red recording badge (maximum 30s limit).
   - Audio is disabled by default for privacy (room layout inference needs only spatial visuals).
   - User reviews recorded video with native playback controls before any analysis.

### 7.2 Why Video-to-Keyframe Sampling?
Current local multimodal models (such as `llama3.2-vision:11b` and `llava:7b`) and cloud vision models process discrete images rather than continuous video streams. 

To process video walkthroughs effectively without heavy external video transcoding servers, ApnaGhar implements an **on-device keyframe extraction engine** in [`src/utils/videoKeyframes.ts`](file:///c:/Users/devde/Downloads/first/src/utils/videoKeyframes.ts):
1. **Duration Inspection**: Inspects the recorded video duration and computes 3–6 evenly distributed timestamps across the recording (accounting for initial and final camera stabilization margins).
2. **Offscreen Seeking & Canvas Rasterization**: Seeks the video to each timestamp and captures the frame to an offscreen `<canvas>` converted to a high-quality JPEG data URL.
3. **Interactive Review Gallery**: Presents the extracted keyframes to the user before inference. The user can inspect each view, uncheck unwanted angles, or permanently delete frames containing private details.
4. **Targeted Inference**: The approved keyframes are submitted to the chosen vision provider (Ollama, Built-in Heuristic, or Gemini) with physical room dimension context.

