import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { 
  PhotoContext, 
  PhotoDetectionSuggestion, 
  RoomModel, 
  FurnitureItem, 
  UnitType,
  AppSettings,
  AiProviderType
} from '../../types/model';
import { analyzeRoomPhoto, type AnalysisResult } from '../../utils/aiVision';
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
  Film
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

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setAnalysisError('Image file exceeds 15MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const newContext: PhotoContext = {
          hasPhoto: true,
          photoDataUrl: dataUrl,
          photoName: file.name,
          uploadedAt: new Date().toISOString(),
          imageDimensions: { width: img.width, height: img.height },
          privacyConsentAcknowledged: true,
        };
        onUpdatePhotoContext(newContext);
        await runAnalysis(dataUrl, newContext, selectedProvider);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async (
    imageDataUrl: string, 
    currentContext: PhotoContext,
    providerToUse: AiProviderType = selectedProvider
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
        gemmaModel: settings.gemmaModel || 'paligemma:3b',
      });

      if (!isMountedRef.current) return;
      setAnalysisResult(result);
      setSuggestions(result.suggestions);

      const updatedContext: PhotoContext = {
        ...currentContext,
        detectedSuggestions: result.suggestions,
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
      privacyConsentAcknowledged: false,
    });
    setSuggestions([]);
    setAnalysisResult(null);
    setAnalysisError(null);
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
                Google Gemma ({settings.gemmaModel || 'paligemma:3b'})
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

                {/* Suggestions List */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                      AI-Assisted Object Proposals ({suggestions.length})
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
