import React, { useState, useRef, useEffect } from 'react';
import type { 
  PhotoContext, 
  PhotoDetectionSuggestion, 
  RoomModel, 
  FurnitureItem, 
  UnitType,
  AppSettings
} from '../../types/model';
import { analyzeRoomPhoto, type AnalysisResult } from '../../utils/aiVision';
import { formatDimension } from '../../utils/units';
import { 
  X, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  CheckCircle2
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [suggestions, setSuggestions] = useState<PhotoDetectionSuggestion[]>(
    photoContext.detectedSuggestions || []
  );
  const [selectedSugId, setSelectedSugId] = useState<string | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;

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

        // Run automatic privacy-preserving local analysis
        await runAnalysis(dataUrl, newContext);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async (imageDataUrl: string, currentContext: PhotoContext) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeRoomPhoto(imageDataUrl, {
        consentExternalAi: settings.enableExternalAi,
        apiKey: settings.customAiApiKey,
        room,
      });

      setAnalysisResult(result);
      setSuggestions(result.suggestions);

      const updatedContext: PhotoContext = {
        ...currentContext,
        detectedSuggestions: result.suggestions,
      };
      onUpdatePhotoContext(updatedContext);
    } catch (err) {
      console.error('Photo analysis error', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Render bounding box overlays on photo canvas
  useEffect(() => {
    if (!photoContext.photoDataUrl || !canvasOverlayRef.current) return;
    const canvas = canvasOverlayRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
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

        ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = Math.max(3, Math.round(img.width * 0.004));
        ctx.strokeRect(bx, by, bw, bh);

        // Fill highlight
        ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.08)';
        ctx.fillRect(bx, by, bw, bh);

        // Label pill
        ctx.fillStyle = isSelected ? '#0284c7' : '#d97706';
        ctx.font = `600 ${Math.max(14, Math.round(img.width * 0.02))}px Outfit, sans-serif`;
        const text = `${sug.label} (${Math.round(sug.confidence * 100)}%)`;
        const textMetrics = ctx.measureText(text);
        const pad = 6;
        ctx.fillRect(bx, by - 26, textMetrics.width + pad * 2, 26);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, bx + pad, by - 8);
      });
    };
    img.src = photoContext.photoDataUrl;
  }, [photoContext.photoDataUrl, suggestions, selectedSugId]);

  const handleAddSuggestionToRoom = (sug: PhotoDetectionSuggestion, markConfirmed: boolean) => {
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
      provenance: markConfirmed ? 'manual' : 'photo-estimate',
      isConfirmed: markConfirmed,
      confidence: sug.confidence,
      provenanceNotes: markConfirmed 
        ? 'Derived from photo and physically verified by user.' 
        : `Derived from room photo estimation (${Math.round(sug.confidence * 100)}% confidence). Not yet verified.`,
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
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(94vw, 840px)', height: 'min(90vh, 800px)' }}
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
            <Sparkles size={20} className="text-amber-400" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Room Photograph & Object Detection
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Privacy-first on-device object suggestion assistant
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Privacy Banner */}
        <div style={{
          margin: '12px 20px 0',
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <ShieldCheck size={20} className="text-emerald-400" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.775rem', color: '#a7f3d0' }}>
            <strong>Privacy Guarantee:</strong> Photos are processed locally on your device.
            They are never transmitted to external servers without explicit consent, and are stripped from exports by default.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!photoContext.hasPhoto ? (
            /* Upload Drop Area */
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
                accept="image/*"
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
                background: 'rgba(56, 189, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Upload size={24} className="text-sky-400" />
              </div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                Upload or Drop Room Photo
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>
                Upload a real photo of your room to receive automatic layout suggestions. All processing is on-device by default.
              </p>
            </div>
          ) : (
            /* Photo Viewer with Detected Bounding Boxes */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Active Photo: {photoContext.photoName}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => photoContext.photoDataUrl && runAnalysis(photoContext.photoDataUrl, photoContext)}
                    disabled={isAnalyzing}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{isAnalyzing ? 'Analyzing...' : 'Re-run Detection'}</span>
                  </button>
                  <button
                    onClick={handlePurgePhoto}
                    className="btn btn-danger"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    title="Permanently remove photo from browser storage"
                  >
                    <Trash2 size={14} />
                    <span>Delete Photo</span>
                  </button>
                </div>
              </div>

              {/* Canvas Overlay Preview */}
              <div style={{
                maxHeight: '320px',
                overflow: 'hidden',
                borderRadius: 'var(--radius-md)',
                background: '#000',
                display: 'flex',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)',
              }}>
                <canvas
                  ref={canvasOverlayRef}
                  style={{
                    maxHeight: '320px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Suggestions List Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    AI-Assisted Object Proposals ({suggestions.length})
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                    *All dimensions are photo estimates, not ground truth
                  </span>
                </div>

                {analysisResult && (
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginBottom: '10px' }}>
                    Engine: <strong style={{ color: 'var(--text-muted)' }}>{analysisResult.source}</strong> • {analysisResult.modelLicense}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                          border: selectedSugId === sug.id ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
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
          )}
        </div>
      </div>
    </div>
  );
};
