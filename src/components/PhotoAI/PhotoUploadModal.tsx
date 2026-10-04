import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { 
  PhotoContext, 
  PhotoDetectionSuggestion, 
  RoomModel, 
  FurnitureItem, 
  UnitType,
  AppSettings,
  AiProviderType,
  UserDesignGoal,
  PersonalizedRecommendation
} from '../../types/model';
import { analyzeRoomPhoto, type AnalysisResult } from '../../utils/aiVision';
import { validateImageFile } from '../../utils/imageValidation';
import { formatDimension } from '../../utils/units';
import { 
  extractKeyframesFromVideoBlob, 
  getSupportedVideoMimeType, 
  type ExtractedKeyframe 
} from '../../utils/videoKeyframes';
import { 
  X, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Camera,
  Video,
  Play,
  Square,
  RotateCcw,
  Check,
  Film,
  Info,
  Sliders,
  CheckSquare,
  Layers,
  Lightbulb,
  HelpCircle
} from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomModel;
  photoContext: PhotoContext;
  settings: AppSettings;
  displayUnit: UnitType;
  onUpdatePhotoContext: (context: PhotoContext) => void;
  onAddFurniture: (item: FurnitureItem) => void;
  onUpdateFurniture?: (items: FurnitureItem[]) => void;
}

export type InputMode = 'upload' | 'camera' | 'video';

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  room,
  photoContext,
  settings,
  displayUnit,
  onUpdatePhotoContext,
  onAddFurniture,
  onUpdateFurniture,
}) => {
  // -------------------------------------------------------------
  // 1. ALL HOOKS UNCONDITIONALLY AT TOP LEVEL (React Hook Safety)
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<InputMode>('upload');
  const [selectedProvider, setSelectedProvider] = useState<AiProviderType>(
    settings.aiProvider === 'custom-gemini-key' ? 'cloud-gemini' : (settings.aiProvider || 'local-heuristic')
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [suggestions, setSuggestions] = useState<PhotoDetectionSuggestion[]>(
    photoContext.detectedSuggestions || []
  );
  const [selectedSugId, setSelectedSugId] = useState<string | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  // User Design Goals (Section 5)
  const [userGoal, setUserGoal] = useState<UserDesignGoal>(
    photoContext.userGoal || {
      primaryGoal: 'general',
      preferredStyle: 'Warm Minimalist',
      budget: 'moderate',
      furnitureStrategy: 'open-to-few-additions',
    }
  );
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [activeSummaryTab, setActiveSummaryTab] = useState<'overview' | 'review' | 'recommendations' | 'checklist'>('overview');
  const [appliedRecIds, setAppliedRecIds] = useState<Set<string>>(new Set());
  const [checkedChecklist, setCheckedChecklist] = useState<Set<number>>(new Set());
  const [acceptedPartialNotice, setAcceptedPartialNotice] = useState(false);

  // Camera Live Capture State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraSnapshot, setCameraSnapshot] = useState<string | null>(null);

  // Video Recording State
  const [isVideoPreviewActive, setIsVideoPreviewActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [extractedKeyframes, setExtractedKeyframes] = useState<ExtractedKeyframe[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [extractStatus, setExtractStatus] = useState<string>('');

  // Explicit Cloud AI Consent State (Priority 4)
  const [hasUserConsentedCloud, setHasUserConsentedCloud] = useState(settings.enableExternalAi);

  // Refs for DOM elements, hardware media streams, and cleanup
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRecordPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Synchronize suggestions when photoContext changes
  useEffect(() => {
    if (photoContext.detectedSuggestions) {
      setSuggestions(photoContext.detectedSuggestions);
    }
  }, [photoContext.detectedSuggestions]);

  // Clean up all active media tracks (camera and microphone)
  const stopAllMediaTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // ignore already stopped tracks
        }
      });
      mediaStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    if (videoRecordPreviewRef.current) {
      videoRecordPreviewRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsVideoPreviewActive(false);
  }, []);

  // Stop recording timer helper
  const stopRecordingTimer = useCallback(() => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  // Clean up media streams and timers when modal closes or unmounts
  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) {
      stopAllMediaTracks();
      stopRecordingTimer();
      if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setIsRecording(false);
    }

    return () => {
      isMountedRef.current = false;
      stopAllMediaTracks();
      stopRecordingTimer();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [isOpen, stopAllMediaTracks, stopRecordingTimer, isRecording, recordedVideoUrl]);

  // When tab changes, stop media tracks from previous mode
  useEffect(() => {
    stopAllMediaTracks();
    stopRecordingTimer();
    setCameraError(null);
    setVideoError(null);
  }, [activeTab, stopAllMediaTracks, stopRecordingTimer]);

  // Render bounding box overlays on photo canvas
  useEffect(() => {
    if (!isOpen || !photoContext.photoDataUrl || !canvasOverlayRef.current) return;
    const canvas = canvasOverlayRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isEffectValid = true;
    const img = new Image();
    img.onload = () => {
      if (!isEffectValid || !canvasOverlayRef.current) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes for detected suggestions
      suggestions.forEach(sug => {
        if (!sug.box2D) return;
        const bx = sug.box2D.x * img.width;
        const by = sug.box2D.y * img.height;
        const bw = sug.box2D.width * img.width;
        const bh = sug.box2D.height * img.height;

        const isSelected = sug.id === selectedSugId;

        ctx.strokeStyle = isSelected ? '#C26D53' : 'rgba(194, 109, 83, 0.85)';
        ctx.lineWidth = Math.max(3, Math.round(img.width * 0.004));
        ctx.strokeRect(bx, by, bw, bh);

        // Fill highlight
        ctx.fillStyle = isSelected ? 'rgba(194, 109, 83, 0.22)' : 'rgba(194, 109, 83, 0.08)';
        ctx.fillRect(bx, by, bw, bh);

        // Label pill
        ctx.fillStyle = '#C26D53';
        ctx.font = `600 ${Math.max(14, Math.round(img.width * 0.02))}px Outfit, sans-serif`;
        const text = `${sug.label} (${Math.round(sug.confidence * 100)}%)`;
        const textMetrics = ctx.measureText(text);
        const pad = 6;
        ctx.fillRect(bx, Math.max(0, by - 26), textMetrics.width + pad * 2, 26);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, bx + pad, Math.max(18, by - 8));
      });
    };
    img.src = photoContext.photoDataUrl;

    return () => {
      isEffectValid = false;
    };
  }, [isOpen, photoContext.photoDataUrl, suggestions, selectedSugId]);

  // -------------------------------------------------------------
  // 2. CAMERA AND MEDIA ACTIONS
  // -------------------------------------------------------------

  // Enumerate available video inputs for camera switcher
  const refreshCameraDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      if (isMountedRef.current) {
        setCameraDevices(videoInputs);
        if (!selectedCameraId && videoInputs.length > 0) {
          setSelectedCameraId(videoInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Could not enumerate media devices:', err);
    }
  };

  // Start live camera stream
  const startCamera = async () => {
    stopAllMediaTracks();
    setCameraError(null);
    setCameraSnapshot(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Please upload a photo instead.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false, // Strictly false: never request microphone for still photo
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (cameraVideoRef.current && isMountedRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
        setIsCameraActive(true);
        refreshCameraDevices();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please grant camera access in your browser or address bar to use this feature.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another application or tab.';
      }
      if (isMountedRef.current) {
        setCameraError(msg);
        setIsCameraActive(false);
      }
    }
  };

  // Capture snapshot from live camera feed
  const captureSnapshot = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCameraSnapshot(dataUrl);
    stopAllMediaTracks();
  };

  // Confirm camera snapshot as the active room photo
  const confirmSnapshot = async () => {
    if (!cameraSnapshot) return;

    const newContext: PhotoContext = {
      hasPhoto: true,
      photoDataUrl: cameraSnapshot,
      photoName: `Camera_Capture_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.jpg`,
      uploadedAt: new Date().toISOString(),
      privacyConsentAcknowledged: true,
    };
    onUpdatePhotoContext(newContext);
    setCameraSnapshot(null);
    setActiveTab('upload');

    // Run vision analysis
    await runAnalysis(cameraSnapshot, newContext, selectedProvider);
  };

  // Retake camera snapshot
  const retakeSnapshot = () => {
    setCameraSnapshot(null);
    startCamera();
  };

  // -------------------------------------------------------------
  // 3. VIDEO WALKTHROUGH RECORDING ACTIONS
  // -------------------------------------------------------------

  // Start video recording preview
  const startVideoPreview = async () => {
    stopAllMediaTracks();
    setVideoError(null);
    setRecordedBlob(null);
    setExtractedKeyframes([]);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVideoError('Video recording is not supported in this browser. Please upload a photo instead.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false, // Audio false by default for privacy
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRecordPreviewRef.current && isMountedRef.current) {
        videoRecordPreviewRef.current.srcObject = stream;
        await videoRecordPreviewRef.current.play();
        setIsVideoPreviewActive(true);
      }
    } catch (err: any) {
      console.error('Video preview error:', err);
      let msg = 'Could not access camera for video recording.';
      if (err.name === 'NotAllowedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser.';
      }
      if (isMountedRef.current) {
        setVideoError(msg);
        setIsVideoPreviewActive(false);
      }
    }
  };

  // Start MediaRecorder recording
  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];
    setRecordingSeconds(0);
    setVideoError(null);

    const mimeType = getSupportedVideoMimeType();

    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (isMountedRef.current) {
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          stopAllMediaTracks();
        }
      };

      recorder.start(500); // 500ms chunk intervals
      setIsRecording(true);

      // Start timer: automatically stop at 30 seconds max duration
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(sec => {
          if (sec >= 29) {
            stopRecording();
            return 30;
          }
          return sec + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('MediaRecorder initialization failed:', err);
      setVideoError(`Recording failed: ${err.message || 'MediaRecorder unsupported'}`);
      setIsRecording(false);
    }
  };

  // Stop MediaRecorder recording
  const stopRecording = () => {
    stopRecordingTimer();
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  };

  // Extract representative keyframes from the recorded video blob
  const handleExtractKeyframes = async () => {
    if (!recordedBlob) return;
    setIsExtractingFrames(true);
    setVideoError(null);
    setExtractStatus('Sampling keyframes from recording...');

    try {
      const frames = await extractKeyframesFromVideoBlob(
        recordedBlob, 
        4, 
        (_ratio, text) => {
          if (isMountedRef.current) setExtractStatus(text);
        }
      );

      if (isMountedRef.current) {
        setExtractedKeyframes(frames);
        setIsExtractingFrames(false);
        setExtractStatus('');
      }
    } catch (err: any) {
      console.error('Keyframe extraction failed:', err);
      if (isMountedRef.current) {
        setVideoError(err.message || 'Failed to extract keyframes from recorded video.');
        setIsExtractingFrames(false);
        setExtractStatus('');
      }
    }
  };

  // Toggle selection of an individual keyframe
  const toggleKeyframeSelected = (frameId: string) => {
    setExtractedKeyframes(prev => 
      prev.map(f => f.id === frameId ? { ...f, selected: !f.selected } : f)
    );
  };

  // Remove a keyframe permanently from the gallery
  const removeKeyframe = (frameId: string) => {
    setExtractedKeyframes(prev => prev.filter(f => f.id !== frameId));
  };

  // Submit approved keyframes for vision analysis
  const handleAnalyzeApprovedKeyframes = async () => {
    const approvedFrames = extractedKeyframes.filter(f => f.selected);
    if (approvedFrames.length === 0) {
      setVideoError('Please select at least one approved keyframe to analyze.');
      return;
    }

    // Use the primary approved keyframe for spatial analysis
    const primaryFrame = approvedFrames[0];
    const newContext: PhotoContext = {
      hasPhoto: true,
      photoDataUrl: primaryFrame.dataUrl,
      photoName: `Walkthrough_Frame_${Math.round(primaryFrame.timestamp)}s.jpg`,
      uploadedAt: new Date().toISOString(),
      privacyConsentAcknowledged: true,
    };
    onUpdatePhotoContext(newContext);
    setActiveTab('upload');

    await runAnalysis(primaryFrame.dataUrl, newContext, selectedProvider);
  };

  // -------------------------------------------------------------
  // 4. FILE UPLOAD & VISION ANALYSIS
  // -------------------------------------------------------------

  const handleFileUpload = async (file: File) => {
    // Stage A: Local file format, size, decoding, and corruption validation
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      setAnalysisError(validation.error || 'Invalid or corrupted image file.');
      return;
    }

    const dataUrl = validation.dataUrl!;
    const newContext: PhotoContext = {
      hasPhoto: true,
      photoDataUrl: dataUrl,
      photoName: file.name,
      uploadedAt: new Date().toISOString(),
      imageDimensions: validation.dimensions,
      privacyConsentAcknowledged: true,
      userGoal,
    };
    onUpdatePhotoContext(newContext);
    await runAnalysis(dataUrl, newContext, selectedProvider, file.name);
  };

  const runAnalysis = async (
    imageDataUrl: string, 
    currentContext: PhotoContext,
    providerToUse: AiProviderType = selectedProvider,
    fileName?: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeRoomPhoto(imageDataUrl, {
        provider: providerToUse,
        room,
        consentExternalAi: hasUserConsentedCloud,
        apiKey: settings.customAiApiKey,
        ollamaBaseUrl: settings.ollamaBaseUrl || 'http://localhost:11434',
        ollamaModel: settings.ollamaModel || 'llama3.2-vision',
        gemmaModel: settings.gemmaModel || 'gemma3:4b',
        userGoal,
        fileName: fileName || currentContext.photoName,
      });

      if (!isMountedRef.current) return;
      setAnalysisResult(result);
      setSuggestions(result.suggestions);

      const updatedContext: PhotoContext = {
        ...currentContext,
        detectedSuggestions: result.suggestions,
        validationResult: result.validation,
        detailedAnalysis: result.detailedAnalysis,
        userGoal,
      };
      onUpdatePhotoContext(updatedContext);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Photo analysis error', err);
      setAnalysisError(err.message || 'Vision analysis failed.');
    } finally {
      if (isMountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  };

  const handleApplyRecommendation = (rec: PersonalizedRecommendation) => {
    // 1. If recommendation is a rearrangement (e.g. shift seating away from door)
    if (rec.category === 'rearrange' && onUpdateFurniture && room.furniture && room.furniture.length > 0) {
      const updated = room.furniture.map(item => {
        if (item.category === 'seating') {
          return {
            ...item,
            x: Math.max(item.width / 2 + 15, Math.min(room.width - item.width / 2 - 15, item.x + 25)),
          };
        }
        return item;
      });
      onUpdateFurniture(updated);
      setAppliedRecIds(prev => new Set(prev).add(rec.id));
    } else if (rec.category === 'add') {
      // Create proposed item
      const newItem: FurnitureItem = {
        id: `rec-item-${Date.now()}`,
        name: rec.action.includes('bookcase') ? 'Vertical Bookcase' : (rec.action.includes('desk') ? 'Study Desk' : 'Side Accent Table'),
        category: rec.action.includes('bookcase') ? 'storage' : (rec.action.includes('desk') ? 'desk' : 'table'),
        width: rec.action.includes('bookcase') ? 90 : (rec.action.includes('desk') ? 110 : 45),
        depth: rec.action.includes('bookcase') ? 38 : (rec.action.includes('desk') ? 55 : 45),
        height: rec.action.includes('bookcase') ? 180 : (rec.action.includes('desk') ? 75 : 55),
        x: Math.round(room.width * 0.25),
        y: Math.round(room.length * 0.25),
        z: 0,
        rotation: 0,
        color: '#8d99ae',
        modelType: rec.action.includes('bookcase') ? 'bookcase' : (rec.action.includes('desk') ? 'desk' : 'coffee_table'),
        clearances: { front: 50 },
        provenance: 'ai-suggestion',
        isConfirmed: false,
        confidence: 0.85,
        provenanceNotes: `Added via AI recommendation: ${rec.action}. Requires dimension confirmation.`,
      };
      onAddFurniture(newItem);
      setAppliedRecIds(prev => new Set(prev).add(rec.id));
    } else {
      setAppliedRecIds(prev => new Set(prev).add(rec.id));
    }
  };

  const handleAddSuggestionToRoom = (sug: PhotoDetectionSuggestion, markConfirmed: boolean) => {
    const isAiSource = analysisResult?.source === 'local-gemma' || analysisResult?.source === 'local-ollama';
    const sourceLabel = analysisResult?.source === 'local-gemma' 
      ? 'Google PaliGemma Vision' 
      : (analysisResult?.source === 'local-ollama' ? 'Ollama Vision' : 'Photo AI');

    const newItem: FurnitureItem = {
      id: `item-photo-${Date.now()}-${sug.id}`,
      name: sug.label.replace(' (Photo Est.)', ''),
      category: sug.category,
      width: sug.estimatedWidth,
      depth: sug.estimatedDepth,
      height: sug.estimatedHeight,
      x: sug.suggestedX,
      y: sug.suggestedY,
      z: 0,
      rotation: sug.rotation,
      color: sug.color,
      modelType: sug.modelType,
      clearances: { front: 50 },
      provenance: markConfirmed ? 'manual' : (isAiSource ? 'ai-suggestion' : 'photo-estimate'),
      isConfirmed: markConfirmed,
      confidence: sug.confidence,
      provenanceNotes: markConfirmed 
        ? 'Derived from photo and physically verified by user.' 
        : `Provisional estimate from ${sourceLabel} (${Math.round(sug.confidence * 100)}% confidence). Not yet verified.`,
    };

    onAddFurniture(newItem);
    setAddedItemIds(prev => new Set(prev).add(sug.id));
  };

  const handlePurgePhoto = () => {
    onUpdatePhotoContext({
      hasPhoto: false,
      photoDataUrl: undefined,
      photoName: undefined,
      uploadedAt: undefined,
      imageDimensions: undefined,
      detectedSuggestions: undefined,
      validationResult: undefined,
      detailedAnalysis: undefined,
      privacyConsentAcknowledged: false,
    });
    setSuggestions([]);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAppliedRecIds(new Set());
    setCheckedChecklist(new Set());
    setAcceptedPartialNotice(false);
  };

  // -------------------------------------------------------------
  // 5. RENDER MODAL ONLY AFTER ALL HOOKS HAVE EXECUTED
  // -------------------------------------------------------------
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(94vw, 880px)', height: 'min(92vh, 840px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} className="text-terracotta" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                Room Capture & Spatial Analysis
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                ApnaGhar (अपना घर) — Privacy-First Spatial Vision Assistant
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Priority 3: Three Clear Input Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'upload' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'upload' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={14} />
            <span>1. Upload Photo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'camera' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'camera' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Camera size={14} />
            <span>2. Take Picture</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('video');
              startVideoPreview();
            }}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'video' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'video' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Video size={14} />
            <span>3. Video Walkthrough</span>
          </button>
        </div>

        {/* AI Provider Switcher Bar */}
        <div style={{
          padding: '8px 20px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={15} className="text-terracotta" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Vision Engine:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('local-heuristic');
                  if (photoContext.photoDataUrl) runAnalysis(photoContext.photoDataUrl, photoContext, 'local-heuristic');
                }}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedProvider === 'local-heuristic' ? 'var(--primary-clay)' : 'transparent',
                  color: selectedProvider === 'local-heuristic' ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Built-in Heuristic (Offline)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('local-gemma');
                  if (photoContext.photoDataUrl) runAnalysis(photoContext.photoDataUrl, photoContext, 'local-gemma');
                }}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedProvider === 'local-gemma' ? 'var(--primary-clay)' : 'transparent',
                  color: selectedProvider === 'local-gemma' ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Google Gemma ({settings.gemmaModel || 'gemma3:4b'})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('local-ollama');
                  if (photoContext.photoDataUrl) runAnalysis(photoContext.photoDataUrl, photoContext, 'local-ollama');
                }}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedProvider === 'local-ollama' ? 'var(--primary-clay)' : 'transparent',
                  color: selectedProvider === 'local-ollama' ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Local Ollama ({settings.ollamaModel || 'llama3.2-vision'})
              </button>
              {settings.enableExternalAi && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider('cloud-gemini');
                    if (photoContext.photoDataUrl) runAnalysis(photoContext.photoDataUrl, photoContext, 'cloud-gemini');
                  }}
                  className="btn btn-ghost"
                  style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: selectedProvider === 'cloud-gemini' ? 'var(--primary-clay)' : 'transparent',
                    color: selectedProvider === 'cloud-gemini' ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Cloud Gemini
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: selectedProvider === 'cloud-gemini' ? '#fbbf24' : '#10b981' }}>
            <ShieldCheck size={15} />
            <span>{selectedProvider === 'cloud-gemini' ? 'External Cloud Network Active' : '100% On-Device / Private'}</span>
          </div>
        </div>

        {/* Priority 4: Cloud Gemini Affirmative Consent Banner */}
        {selectedProvider === 'cloud-gemini' && !hasUserConsentedCloud && (
          <div style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} className="text-amber-400" />
              <span style={{ fontSize: '0.775rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                Cloud Vision requires transmitting your room imagery to Google servers. Do you consent?
              </span>
            </div>
            <button
              onClick={() => {
                setHasUserConsentedCloud(true);
                if (photoContext.photoDataUrl) runAnalysis(photoContext.photoDataUrl, photoContext, 'cloud-gemini');
              }}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
            >
              I Affirm & Consent
            </button>
          </div>
        )}

        {/* Error Diagnostics Banner */}
        {analysisError && (
          <div style={{
            margin: '12px 20px 0',
            padding: '12px 16px',
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, fontSize: '0.85rem' }}>
              <AlertTriangle size={16} />
              <span>Vision Analysis Error ({selectedProvider})</span>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
              {analysisError}
            </p>
            {(selectedProvider === 'local-gemma' || selectedProvider === 'local-ollama') && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    setSelectedProvider('local-heuristic');
                    if (photoContext.photoDataUrl) runAnalysis(photoContext.photoDataUrl, photoContext, 'local-heuristic');
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <span>Switch to Built-in Heuristic (Offline)</span>
                </button>
                <button
                  onClick={() => photoContext.photoDataUrl && runAnalysis(photoContext.photoDataUrl, photoContext, selectedProvider)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <RefreshCw size={12} />
                  <span>Retry {selectedProvider === 'local-gemma' ? 'Gemma Vision' : 'Ollama'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Body Content based on Active Tab */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            !photoContext.hasPhoto ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'border-color 0.2s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(194, 109, 83, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Upload size={24} className="text-terracotta" />
                </div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                  Upload Room Photograph
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '440px', margin: 0, lineHeight: 1.45 }}>
                  Select or drag a room photo (JPEG, PNG, or WebP). Your image is processed locally on-device with{' '}
                  <strong style={{ color: 'var(--text-main)' }}>{selectedProvider === 'local-ollama' ? 'Local Ollama' : 'Built-in Heuristic'}</strong>.
                </p>
              </div>
            ) : (
              /* Photo Viewer with Detected Bounding Boxes */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Active Photo: {photoContext.photoName}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => photoContext.photoDataUrl && runAnalysis(photoContext.photoDataUrl, photoContext, selectedProvider)}
                      disabled={isAnalyzing}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                    >
                      <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                      <span>{isAnalyzing ? 'Analyzing...' : 'Re-run Detection'}</span>
                    </button>
                    <button
                      onClick={handlePurgePhoto}
                      className="btn btn-danger"
                      style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                      title="Permanently remove photo from browser storage"
                    >
                      <Trash2 size={13} />
                      <span>Delete Photo</span>
                    </button>
                  </div>
                </div>

                {/* Canvas Overlay Preview */}
                <div style={{
                  maxHeight: '340px',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-md)',
                  background: '#0d1117',
                  display: 'flex',
                  justifyContent: 'center',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <canvas
                    ref={canvasOverlayRef}
                    style={{
                      maxHeight: '340px',
                      maxWidth: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>

                {/* Stage B: Semantic Image Suitability Verification (Section 1) */}
                {(() => {
                  const validation = analysisResult?.validation || photoContext.validationResult;
                  if (!validation) return null;

                  const isSuitable = validation.suitability === 'suitable';
                  const isPartial = validation.suitability === 'partially_suitable';
                  const isUnsuitable = validation.suitability === 'unsuitable';
                  const isUncertain = validation.suitability === 'uncertain';

                  const badgeBg = isSuitable 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : (isPartial ? 'rgba(245, 158, 11, 0.15)' : (isUnsuitable ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)'));
                  const badgeBorder = isSuitable 
                    ? 'rgba(16, 185, 129, 0.35)' 
                    : (isPartial ? 'rgba(245, 158, 11, 0.35)' : (isUnsuitable ? 'rgba(239, 68, 68, 0.35)' : 'rgba(249, 115, 22, 0.35)'));
                  const badgeColor = isSuitable 
                    ? '#10b981' 
                    : (isPartial ? '#fbbf24' : (isUnsuitable ? '#f87171' : '#fb923c'));
                  const label = isSuitable 
                    ? 'Suitable Room Photograph' 
                    : (isPartial ? 'Partially Suitable (Visual Limitations)' : (isUnsuitable ? 'Unsuitable Image (Not an Indoor Room)' : 'Uncertain Room Context'));

                  return (
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: badgeBg,
                      border: `1px solid ${badgeBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isSuitable && <CheckCircle2 size={16} style={{ color: badgeColor }} />}
                          {isPartial && <AlertTriangle size={16} style={{ color: badgeColor }} />}
                          {isUnsuitable && <AlertTriangle size={16} style={{ color: badgeColor }} />}
                          {isUncertain && <HelpCircle size={16} style={{ color: badgeColor }} />}
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: badgeColor }}>
                            Stage B Check: {label}
                          </span>
                        </div>
                        {validation.confidence && (
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                            Confidence: {Math.round(validation.confidence * 100)}%
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.45 }}>
                        {validation.explanation}
                      </p>

                      {validation.qualityIssues.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Quality Factors:</span>
                          {validation.qualityIssues.map((issue, idx) => (
                            <span 
                              key={idx} 
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 8px', 
                                borderRadius: 'var(--radius-full)', 
                                background: 'rgba(0,0,0,0.25)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: badgeColor,
                                textTransform: 'capitalize'
                              }}
                            >
                              {issue.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Recommended Next Action: {validation.recommendedAction}
                      </div>

                      {/* If Unsuitable: Prohibit recommendations and offer Upload Another Image */}
                      {isUnsuitable && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.775rem', color: '#fca5a5' }}>
                            Room layout recommendations are prohibited for unrelated subjects to prevent hallucinated spatial dimensions.
                          </span>
                          <button
                            onClick={handlePurgePhoto}
                            className="btn btn-primary"
                            style={{ fontSize: '0.775rem', padding: '6px 14px', gap: '6px' }}
                          >
                            <Upload size={13} />
                            <span>Upload Another Image</span>
                          </button>
                        </div>
                      )}

                      {/* If Partially Suitable: Give warning notice with continue option */}
                      {isPartial && !acceptedPartialNotice && (
                        <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                          <button
                            onClick={() => setAcceptedPartialNotice(true)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          >
                            <span>Continue with Provisional Recommendations</span>
                          </button>
                          <button
                            onClick={handlePurgePhoto}
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--text-muted)' }}
                          >
                            <span>Upload Clearer Photo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* If image is unsuitable, stop rendering room recommendations */}
                {((analysisResult?.validation?.suitability || photoContext.validationResult?.suitability) === 'unsuitable') ? null : (
                  <>
                    {/* User Design Goals Customizer (Section 5: Ask for User's Goal) */}
                    <div className="glass-panel" style={{ padding: '12px 16px' }}>
                      <div 
                        onClick={() => setIsGoalsOpen(prev => !prev)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sliders size={16} className="text-terracotta" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            Personalize Your Design Goals & Preferences
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(194, 109, 83, 0.15)', color: 'var(--primary-clay)' }}>
                            {userGoal.primaryGoal?.replace('-', ' ') || 'General'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-clay)', cursor: 'pointer' }}>
                          {isGoalsOpen ? 'Hide Preferences' : 'Customize Goals'}
                        </span>
                      </div>

                      {isGoalsOpen && (
                        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Primary Space Goal:
                            </label>
                            <select
                              value={userGoal.primaryGoal || 'general'}
                              onChange={e => setUserGoal(prev => ({ ...prev, primaryGoal: e.target.value as any }))}
                              className="input-field"
                              style={{ width: '100%', fontSize: '0.775rem', padding: '6px' }}
                            >
                              <option value="general">Balanced Room Planning</option>
                              <option value="improve-circulation">Improve Circulation & Clear Walkways</option>
                              <option value="maximize-storage">Maximize Storage & Organization</option>
                              <option value="cozy-aesthetic">Cozy & Inviting Atmosphere</option>
                              <option value="work-study-zone">Add Dedicated Work/Study Zone</option>
                              <option value="open-space">Maximize Open Floor Space</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Preferred Style:
                            </label>
                            <select
                              value={userGoal.preferredStyle || 'Warm Minimalist'}
                              onChange={e => setUserGoal(prev => ({ ...prev, preferredStyle: e.target.value }))}
                              className="input-field"
                              style={{ width: '100%', fontSize: '0.775rem', padding: '6px' }}
                            >
                              <option value="Warm Minimalist">Warm Minimalist</option>
                              <option value="Scandinavian Natural">Scandinavian Natural</option>
                              <option value="Contemporary Indian">Contemporary Indian</option>
                              <option value="Japandi Serenity">Japandi Serenity</option>
                              <option value="Modern Luxury">Modern Luxury</option>
                              <option value="Industrial Modern">Industrial Modern</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Budget Level:
                            </label>
                            <select
                              value={userGoal.budget || 'moderate'}
                              onChange={e => setUserGoal(prev => ({ ...prev, budget: e.target.value as any }))}
                              className="input-field"
                              style={{ width: '100%', fontSize: '0.775rem', padding: '6px' }}
                            >
                              <option value="zero-cost">Zero-Cost (Rearrange Existing Only)</option>
                              <option value="low-cost">Low-Cost (Accents, Lighting, Textiles)</option>
                              <option value="moderate">Moderate (Selective New Pieces)</option>
                              <option value="flexible">Flexible / Complete Redesign</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Existing Furniture Strategy:
                            </label>
                            <select
                              value={userGoal.furnitureStrategy || 'open-to-few-additions'}
                              onChange={e => setUserGoal(prev => ({ ...prev, furnitureStrategy: e.target.value as any }))}
                              className="input-field"
                              style={{ width: '100%', fontSize: '0.775rem', padding: '6px' }}
                            >
                              <option value="keep-all-existing">Keep 100% Existing Furniture</option>
                              <option value="open-to-few-additions">Keep Existing + Targeted Additions</option>
                              <option value="complete-makeover">Open to Replacing Obsolete Pieces</option>
                            </select>
                          </div>

                          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              onClick={() => photoContext.photoDataUrl && runAnalysis(photoContext.photoDataUrl, photoContext, selectedProvider)}
                              disabled={isAnalyzing}
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '6px 14px', gap: '6px' }}
                            >
                              <RefreshCw size={12} className={isAnalyzing ? 'animate-spin' : ''} />
                              <span>Update Recommendations with Selected Goals</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 6 & 7: Comprehensive Summary Tabs */}
                    {analysisResult?.detailedAnalysis && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Segmented Control Tabs */}
                        <div style={{
                          display: 'flex',
                          gap: '6px',
                          borderBottom: '1px solid var(--border-subtle)',
                          paddingBottom: '8px',
                          overflowX: 'auto',
                        }}>
                          <button
                            onClick={() => setActiveSummaryTab('overview')}
                            className="btn btn-ghost"
                            style={{
                              fontSize: '0.775rem',
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: activeSummaryTab === 'overview' ? 'var(--primary-clay)' : 'transparent',
                              color: activeSummaryTab === 'overview' ? '#fff' : 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                              gap: '6px',
                            }}
                          >
                            <Info size={13} />
                            <span>1. Room Summary</span>
                          </button>

                          <button
                            onClick={() => setActiveSummaryTab('review')}
                            className="btn btn-ghost"
                            style={{
                              fontSize: '0.775rem',
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: activeSummaryTab === 'review' ? 'var(--primary-clay)' : 'transparent',
                              color: activeSummaryTab === 'review' ? '#fff' : 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                              gap: '6px',
                            }}
                          >
                            <Layers size={13} />
                            <span>2. Existing Furniture Review ({analysisResult.detailedAnalysis.existingFurnitureReview.length})</span>
                          </button>

                          <button
                            onClick={() => setActiveSummaryTab('recommendations')}
                            className="btn btn-ghost"
                            style={{
                              fontSize: '0.775rem',
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: activeSummaryTab === 'recommendations' ? 'var(--primary-clay)' : 'transparent',
                              color: activeSummaryTab === 'recommendations' ? '#fff' : 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                              gap: '6px',
                            }}
                          >
                            <Lightbulb size={13} />
                            <span>3. Top Recommendations ({analysisResult.detailedAnalysis.recommendations.length})</span>
                          </button>

                          <button
                            onClick={() => setActiveSummaryTab('checklist')}
                            className="btn btn-ghost"
                            style={{
                              fontSize: '0.775rem',
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: activeSummaryTab === 'checklist' ? 'var(--primary-clay)' : 'transparent',
                              color: activeSummaryTab === 'checklist' ? '#fff' : 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                              gap: '6px',
                            }}
                          >
                            <CheckSquare size={13} />
                            <span>4. Measurement Checklist</span>
                          </button>
                        </div>

                        {/* TAB CONTENT 1: ROOM SUMMARY */}
                        {activeSummaryTab === 'overview' && analysisResult.detailedAnalysis.roomCharacteristics && (
                          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                              <div>
                                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Room Type & Style
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                                  {analysisResult.detailedAnalysis.roomCharacteristics.roomType} • {analysisResult.detailedAnalysis.roomCharacteristics.apparentStyle}
                                </div>
                                <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                  Congestion Level: <strong style={{ color: analysisResult.detailedAnalysis.roomCharacteristics.congestion === 'congested' ? '#f87171' : '#10b981', textTransform: 'capitalize' }}>{analysisResult.detailedAnalysis.roomCharacteristics.congestion}</strong>
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Lighting & Daylight
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: 1.4 }}>
                                  {analysisResult.detailedAnalysis.roomCharacteristics.lighting}
                                </div>
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Functional Spatial Zones
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {analysisResult.detailedAnalysis.roomCharacteristics.functionalZones.map((zone, i) => (
                                  <span key={i} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)' }}>
                                    {zone}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Architectural Features & Openings
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.775rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                                {analysisResult.detailedAnalysis.roomCharacteristics.architecturalFeatures.map((feat, i) => (
                                  <li key={i}>{feat}</li>
                                ))}
                              </ul>
                            </div>

                            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.725rem', color: '#fbbf24', fontWeight: 600, marginBottom: '2px' }}>
                                Spatial Uncertainties & Limitations:
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                {analysisResult.detailedAnalysis.roomCharacteristics.limitations.map((lim, i) => (
                                  <li key={i}>{lim}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* TAB CONTENT 2: EXISTING FURNITURE REVIEW (Section 3: Core Feature) */}
                        {activeSummaryTab === 'review' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                              We prioritize retaining, repositioning, and enhancing furniture you already own before recommending purchases.
                            </div>

                            {analysisResult.detailedAnalysis.existingFurnitureReview.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No specific furniture pieces currently detected. Add furniture to the room editor to view placement evaluations.
                              </div>
                            ) : (
                              analysisResult.detailedAnalysis.existingFurnitureReview.map(rev => {
                                const statusColor = rev.placementStatus === 'useful' 
                                  ? '#10b981' 
                                  : (rev.placementStatus === 'inefficient' ? '#fbbf24' : (rev.placementStatus === 'obstructive' ? '#f87171' : '#94a3b8'));
                                const recColor = rev.recommendation === 'keep' 
                                  ? '#38bdf8' 
                                  : (rev.recommendation === 'move' || rev.recommendation === 'reposition' ? '#c084fc' : '#f43f5e');

                                return (
                                  <div 
                                    key={rev.id} 
                                    className="glass-panel" 
                                    style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: `3px solid ${statusColor}` }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rev.name}</span>
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', color: statusColor, textTransform: 'capitalize' }}>
                                          Status: {rev.placementStatus}
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '0.725rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: recColor, textTransform: 'uppercase' }}>
                                        Action: {rev.recommendation}
                                      </span>
                                    </div>

                                    <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>
                                      <strong>Role:</strong> {rev.apparentRole}
                                    </div>

                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                                      <strong>Rationale:</strong> {rev.reason}
                                    </div>

                                    <div style={{ fontSize: '0.725rem', color: '#fbbf24', fontStyle: 'italic' }}>
                                      <strong>Verification Needed:</strong> {rev.additionalInfoNeeded}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}

                        {/* TAB CONTENT 3: PERSONALIZED RECOMMENDATIONS (Section 4) */}
                        {activeSummaryTab === 'recommendations' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                              Prioritized actions across Keep, Rearrange, Add, Improve, and Avoid based on your spatial dimensions and goals.
                            </div>

                            {analysisResult.detailedAnalysis.recommendations.map(rec => {
                              const isApplied = appliedRecIds.has(rec.id);
                              const catColor = rec.category === 'keep' 
                                ? '#38bdf8' 
                                : (rec.category === 'rearrange' ? '#c084fc' : (rec.category === 'add' ? '#10b981' : (rec.category === 'avoid' ? '#f43f5e' : '#f59e0b')));
                              const priorityColor = rec.priority === 'high' ? '#f87171' : (rec.priority === 'medium' ? '#fbbf24' : '#94a3b8');

                              return (
                                <div 
                                  key={rec.id} 
                                  className="glass-panel" 
                                  style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: `3px solid ${catColor}` }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.08)', color: catColor, textTransform: 'uppercase' }}>
                                        {rec.category}
                                      </span>
                                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rec.action}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.675rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: priorityColor, fontWeight: 600, textTransform: 'uppercase' }}>
                                        {rec.priority} Priority
                                      </span>
                                      <span style={{ fontSize: '0.675rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                        {rec.effortCost === 'free' ? 'Free (0 Cost)' : (rec.effortCost === 'low-cost' ? 'Low-Cost' : 'Purchase Required')}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                                    {rec.reason}
                                  </div>

                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                    <strong>Expected Benefit:</strong> {rec.expectedBenefit}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.725rem', color: '#fbbf24' }}>
                                      Required: {rec.requiredMeasurements}
                                    </span>
                                    {(rec.category === 'rearrange' || rec.category === 'add') && (
                                      <button
                                        onClick={() => handleApplyRecommendation(rec)}
                                        disabled={isApplied}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '4px 10px', gap: '6px' }}
                                      >
                                        <Check size={12} />
                                        <span>{isApplied ? 'Applied to Layout' : 'Apply to 2D/3D Plan'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* TAB CONTENT 4: MEASUREMENT CHECKLIST (Section 6.6) */}
                        {activeSummaryTab === 'checklist' && (
                          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              On-Site Physical Tape-Measure Verification Checklist
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                              Automated vision suggestions are advisory estimates. Always verify these critical physical dimensions on site before moving heavy furniture or ordering items:
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                              {analysisResult.detailedAnalysis.measurementChecklist.map((item, idx) => {
                                const isChecked = checkedChecklist.has(idx);
                                return (
                                  <label 
                                    key={idx}
                                    onClick={() => {
                                      setCheckedChecklist(prev => {
                                        const next = new Set(prev);
                                        if (next.has(idx)) next.delete(idx);
                                        else next.add(idx);
                                        return next;
                                      });
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      padding: '8px 12px',
                                      borderRadius: 'var(--radius-sm)',
                                      background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                      border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      color: isChecked ? '#10b981' : 'var(--text-main)',
                                      textDecoration: isChecked ? 'line-through' : 'none',
                                    }}
                                  >
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked} 
                                      onChange={() => {}} 
                                      style={{ cursor: 'pointer' }}
                                    />
                                    <span>{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggestions List */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                          Detected Spatial Objects ({suggestions.length})
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                          *All dimensions are provisional visual estimates, not ground truth
                        </span>
                      </div>

                      {analysisResult && (
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                          Engine: <strong style={{ color: 'var(--text-muted)' }}>{analysisResult.source}</strong> {analysisResult.providerDetails?.modelName ? `(${analysisResult.providerDetails.modelName})` : ''} • {analysisResult.modelLicense}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {suggestions.length === 0 && !isAnalyzing && (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No furniture items currently identified. Click &quot;Re-run Detection&quot; above or select an alternative provider.
                          </div>
                        )}

                        {suggestions.map(sug => {
                          const isAdded = addedItemIds.has(sug.id);

                          return (
                            <div
                              key={sug.id}
                              onMouseEnter={() => setSelectedSugId(sug.id)}
                              onMouseLeave={() => setSelectedSugId(null)}
                              className="glass-panel"
                              style={{
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                border: selectedSugId === sug.id ? '1px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: sug.color }} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sug.label}</span>
                                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                                      {Math.round(sug.confidence * 100)}% match
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                                    Est: {formatDimension(sug.estimatedWidth, displayUnit, false)} × {formatDimension(sug.estimatedDepth, displayUnit, false)} × {formatDimension(sug.estimatedHeight, displayUnit)}
                                  </div>
                                  {sug.notes && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                      {sug.notes}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleAddSuggestionToRoom(sug, false)}
                                  disabled={isAdded}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                                  title="Add to room marked as unconfirmed photo-estimate"
                                >
                                  <Plus size={13} />
                                  <span>{isAdded ? 'Added' : 'Add as Estimate'}</span>
                                </button>
                                <button
                                  onClick={() => handleAddSuggestionToRoom(sug, true)}
                                  disabled={isAdded}
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                                  title="Confirm dimensions and add to room"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Confirm & Add</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          )}

          {/* TAB 2: TAKE PICTURE (LIVE CAMERA) */}
          {activeTab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cameraError && (
                <div style={{ padding: '12px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.85rem' }}>
                  {cameraError}
                </div>
              )}

              {!cameraSnapshot ? (
                /* Live Camera View */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  {/* Camera selector if multiple cameras exist */}
                  {cameraDevices.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Camera:</span>
                      <select
                        value={selectedCameraId}
                        onChange={e => {
                          setSelectedCameraId(e.target.value);
                          startCamera();
                        }}
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        {cameraDevices.map((dev, i) => (
                          <option key={dev.deviceId} value={dev.deviceId}>
                            {dev.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: '380px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    background: '#0d1117',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <video
                      ref={cameraVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ maxHeight: '380px', maxWidth: '100%', objectFit: 'contain' }}
                    />
                    {!isCameraActive && (
                      <div style={{ position: 'absolute', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Camera is initializing or stopped...
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={captureSnapshot}
                      disabled={!isCameraActive}
                      className="btn btn-primary"
                      style={{ padding: '10px 24px', fontSize: '0.9rem', gap: '8px' }}
                    >
                      <Camera size={16} />
                      <span>Take Photo</span>
                    </button>
                    <button
                      onClick={stopAllMediaTracks}
                      className="btn btn-secondary"
                      style={{ padding: '10px 16px', fontSize: '0.9rem' }}
                    >
                      Stop Camera
                    </button>
                  </div>
                </div>
              ) : (
                /* Snapshot Review Screen */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Review Captured Photo</div>
                  <div style={{
                    maxHeight: '380px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <img
                      src={cameraSnapshot}
                      alt="Captured snapshot"
                      style={{ maxHeight: '380px', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={retakeSnapshot}
                      className="btn btn-secondary"
                      style={{ padding: '8px 18px', fontSize: '0.85rem', gap: '6px' }}
                    >
                      <RotateCcw size={15} />
                      <span>Retake</span>
                    </button>
                    <button
                      onClick={confirmSnapshot}
                      className="btn btn-primary"
                      style={{ padding: '8px 24px', fontSize: '0.85rem', gap: '6px' }}
                    >
                      <Check size={15} />
                      <span>Use this Photo & Analyze</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VIDEO WALKTHROUGH */}
          {activeTab === 'video' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {videoError && (
                <div style={{ padding: '12px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.85rem' }}>
                  {videoError}
                </div>
              )}

              {/* Guidance Banner */}
              <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: '3px solid var(--primary-clay)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Room Walkthrough Guidance
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                  Slowly pan across the room. Show the walls, floor, windows, doors, and main furniture. Avoid rapid movements.
                  ApnaGhar samples representative frames on-device for spatial object inference.
                </p>
              </div>

              {!recordedBlob ? (
                /* Live Video Recording Area */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: '340px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    background: '#0d1117',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <video
                      ref={videoRecordPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ maxHeight: '340px', maxWidth: '100%', objectFit: 'contain' }}
                    />
                    
                    {/* Live Recording Indicator and Timer */}
                    {isRecording && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                      }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                          REC 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:30
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={!isVideoPreviewActive}
                        className="btn btn-primary"
                        style={{ padding: '10px 24px', fontSize: '0.9rem', gap: '8px' }}
                      >
                        <Play size={16} />
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="btn btn-danger"
                        style={{ padding: '10px 24px', fontSize: '0.9rem', gap: '8px' }}
                      >
                        <Square size={16} />
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Recorded Video Review and Keyframe Gallery */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Review Walkthrough Recording</span>
                    <button
                      onClick={() => {
                        setRecordedBlob(null);
                        setExtractedKeyframes([]);
                        startVideoPreview();
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', gap: '4px' }}
                    >
                      <RotateCcw size={12} />
                      <span>Retake Walkthrough</span>
                    </button>
                  </div>

                  {recordedVideoUrl && (
                    <div style={{ maxHeight: '240px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center' }}>
                      <video
                        src={recordedVideoUrl}
                        controls
                        style={{ maxHeight: '240px', maxWidth: '100%' }}
                      />
                    </div>
                  )}

                  {/* Keyframe Extraction Action */}
                  {extractedKeyframes.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px' }}>
                      <button
                        onClick={handleExtractKeyframes}
                        disabled={isExtractingFrames}
                        className="btn btn-primary"
                        style={{ padding: '8px 20px', fontSize: '0.85rem', gap: '8px' }}
                      >
                        <Film size={15} />
                        <span>{isExtractingFrames ? 'Extracting Frames...' : 'Extract Keyframes for AI Analysis'}</span>
                      </button>
                      {extractStatus && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{extractStatus}</span>
                      )}
                    </div>
                  ) : (
                    /* Keyframe Review Gallery (User can uncheck or delete private/irrelevant frames) */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                          Select Approved Keyframes for Room Analysis ({extractedKeyframes.filter(f => f.selected).length}/{extractedKeyframes.length})
                        </h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Deselect or delete any unwanted frames
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                        {extractedKeyframes.map(frame => (
                          <div
                            key={frame.id}
                            style={{
                              position: 'relative',
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                              border: frame.selected ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                              background: '#0d1117',
                            }}
                          >
                            <img
                              src={frame.dataUrl}
                              alt={frame.label}
                              style={{ width: '100%', height: '110px', objectFit: 'cover' }}
                            />
                            <div style={{
                              padding: '6px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(0, 0, 0, 0.65)',
                            }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.725rem' }}>
                                <input
                                  type="checkbox"
                                  checked={frame.selected}
                                  onChange={() => toggleKeyframeSelected(frame.id)}
                                />
                                <span>{frame.label}</span>
                              </label>
                              <button
                                onClick={() => removeKeyframe(frame.id)}
                                className="btn btn-ghost btn-icon"
                                style={{ padding: '2px' }}
                                title="Remove frame"
                              >
                                <Trash2 size={12} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleAnalyzeApprovedKeyframes}
                        disabled={isAnalyzing || extractedKeyframes.filter(f => f.selected).length === 0}
                        className="btn btn-primary"
                        style={{ alignSelf: 'flex-end', padding: '8px 20px', fontSize: '0.85rem', gap: '8px' }}
                      >
                        <Sparkles size={14} />
                        <span>Analyze Room from Approved Frames</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
