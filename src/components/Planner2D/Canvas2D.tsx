import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { 
  RoomModel, 
  FurnitureItem, 
  FitReport,
  AppSettings 
} from '../../types/model';
import { 
  getFurnitureCorners, 
  transformPoint, 
  degToRad, 
  snapToGrid, 
  getClearancePolygon, 
  getDoorSwingPolygon 
} from '../../utils/geometry';
import { formatDimension, fromCm, toCm } from '../../utils/units';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  Trash2, 
  Copy, 
  CheckCircle, 
  Compass
} from 'lucide-react';

interface Canvas2DProps {
  room: RoomModel;
  furniture: FurnitureItem[];
  settings: AppSettings;
  fitReport: FitReport;
  onUpdateFurniture: (items: FurnitureItem[]) => void;
  onSelectItem: (item: FurnitureItem | null) => void;
  selectedItemId: string | null;
}

export const Canvas2D: React.FC<Canvas2DProps> = ({
  room,
  furniture,
  settings,
  fitReport,
  onUpdateFurniture,
  onSelectItem,
  selectedItemId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // View transform state: pan (offset in screen pixels) and zoom (scale factor: pixels per cm)
  const [zoom, setZoom] = useState<number>(1.2); // screen pixels per cm
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 80 });

  // Dragging and interaction state
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [itemInitialPos, setItemInitialPos] = useState<{ x: number; y: number; rotation: number }>({ x: 0, y: 0, rotation: 0 });

  const selectedItem = furniture.find(f => f.id === selectedItemId) || null;

  // Convert room coordinates (cm) to canvas screen coordinates (px)
  const roomToScreen = useCallback((rx: number, ry: number) => {
    return {
      x: pan.x + rx * zoom,
      y: pan.y + ry * zoom,
    };
  }, [pan, zoom]);

  // Convert canvas screen coordinates (px) to room coordinates (cm)
  const screenToRoom = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - pan.x) / zoom,
      y: (sy - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Auto-fit room into viewport on initial mount or room size change
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const margin = 100;
    const availableW = clientWidth - margin * 2;
    const availableH = clientHeight - margin * 2;

    const scaleX = availableW / room.width;
    const scaleY = availableH / room.length;
    const newZoom = Math.min(Math.max(scaleX, scaleY) > 0 ? Math.min(scaleX, scaleY) : 1, 3.5);

    const newPanX = (clientWidth - room.width * newZoom) / 2;
    const newPanY = (clientHeight - room.length * newZoom) / 2;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [room.width, room.length]);

  useEffect(() => {
    fitToScreen();
  }, [fitToScreen]);

  // Find item under mouse cursor (point in rotated rectangle)
  const findItemAtPoint = (roomX: number, roomY: number): FurnitureItem | null => {
    for (let i = furniture.length - 1; i >= 0; i--) {
      const item = furniture[i];
      // Transform test point into item's local unrotated space
      const dx = roomX - item.x;
      const dy = roomY - item.y;
      const rad = degToRad(-item.rotation);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      const hw = item.width / 2;
      const hd = item.depth / 2;

      if (Math.abs(localX) <= hw && Math.abs(localY) <= hd) {
        return item;
      }
    }
    return null;
  };

  // Check if mouse is on rotation handle (located 35cm in front of item's center)
  const isOverRotationHandle = (roomX: number, roomY: number, item: FurnitureItem): boolean => {
    const handleDistance = item.depth / 2 + 25; // 25cm in front of item
    const handlePos = transformPoint(0, handleDistance, item.x, item.y, item.rotation);
    const dist = Math.hypot(roomX - handlePos.x, roomY - handlePos.y);
    return dist <= 16 / zoom; // 16px radius in screen space
  };

  // Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 1. Draw Architectural Grid
    const gridSizeCm = 50; // 50cm major grid
    const startX = pan.x % (gridSizeCm * zoom);
    const startY = pan.y % (gridSizeCm * zoom);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < rect.width; x += gridSizeCm * zoom) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
    }
    for (let y = startY; y < rect.height; y += gridSizeCm * zoom) {
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
    }
    ctx.stroke();

    // 2. Draw Room Interior Floor
    const roomScreenOrigin = roomToScreen(0, 0);
    const roomScreenW = room.width * zoom;
    const roomScreenL = room.length * zoom;

    // Floor fill
    ctx.fillStyle = '#0f1422';
    ctx.fillRect(roomScreenOrigin.x, roomScreenOrigin.y, roomScreenW, roomScreenL);

    // Subtle hardwood-style plank lines or grid on floor
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let rx = 50; rx < room.width; rx += 50) {
      const p1 = roomToScreen(rx, 0);
      const p2 = roomToScreen(rx, room.length);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    for (let ry = 50; ry < room.length; ry += 50) {
      const p1 = roomToScreen(0, ry);
      const p2 = roomToScreen(room.width, ry);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // 3. Draw Doors and Swing Arcs
    const doors = (room.openings || []).filter(o => o.type === 'door');
    for (const door of doors) {
      const swingPoly = getDoorSwingPolygon(door, room);
      if (swingPoly && swingPoly.length > 2) {
        // Draw translucent swing arc
        ctx.beginPath();
        const start = roomToScreen(swingPoly[0].x, swingPoly[0].y);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < swingPoly.length; i++) {
          const pt = roomToScreen(swingPoly[i].x, swingPoly[i].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 4. Draw Clearance Zones for Furniture (if enabled)
    if (settings.showClearanceZones) {
      for (const item of furniture) {
        const isSelected = item.id === selectedItemId;
        const zones: ('front' | 'back' | 'left' | 'right')[] = ['front', 'back', 'left', 'right'];
        for (const zone of zones) {
          const poly = getClearancePolygon(item, zone);
          if (poly && poly.length >= 3) {
            ctx.beginPath();
            const p0 = roomToScreen(poly[0].x, poly[0].y);
            ctx.moveTo(p0.x, p0.y);
            for (let k = 1; k < poly.length; k++) {
              const p = roomToScreen(poly[k].x, poly[k].y);
              ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)';
            ctx.fill();
            ctx.strokeStyle = isSelected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)';
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // 5. Draw Furniture Items
    const failingItemIds = new Set(
      fitReport.checks.filter(c => c.status === 'FAIL').flatMap(c => c.affectedItemIds)
    );
    const reviewItemIds = new Set(
      fitReport.checks.filter(c => c.status === 'REVIEW').flatMap(c => c.affectedItemIds)
    );

    for (const item of furniture) {
      const corners = getFurnitureCorners(item);
      const isSelected = item.id === selectedItemId;
      const isFailing = failingItemIds.has(item.id);
      const isReview = reviewItemIds.has(item.id) || !item.isConfirmed;

      const screenCorners = corners.map(c => roomToScreen(c.x, c.y));

      // Draw item polygon footprint
      ctx.beginPath();
      ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
      for (let c = 1; c < screenCorners.length; c++) {
        ctx.lineTo(screenCorners[c].x, screenCorners[c].y);
      }
      ctx.closePath();

      // Base fill
      ctx.fillStyle = item.color || '#2d3748';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Stroke highlight
      if (isFailing) {
        ctx.strokeStyle = '#f43f5e'; // Crimson error
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
        ctx.shadowBlur = 10;
      } else if (isReview) {
        ctx.strokeStyle = '#f59e0b'; // Amber review
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.setLineDash([4, 4]);
      } else if (isSelected) {
        ctx.strokeStyle = '#38bdf8'; // Cyan active select
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
      }

      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Draw Orientation Arrow pointing to item's "front"
      const centerScreen = roomToScreen(item.x, item.y);
      const frontArrowTip = transformPoint(0, item.depth / 2 - 8, item.x, item.y, item.rotation);
      const frontScreen = roomToScreen(frontArrowTip.x, frontArrowTip.y);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerScreen.x, centerScreen.y);
      ctx.lineTo(frontScreen.x, frontScreen.y);
      ctx.stroke();

      // Draw item label
      const itemWDisplay = formatDimension(item.width, settings.displayUnit, false);
      const itemDDisplay = formatDimension(item.depth, settings.displayUnit, false);

      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Only draw text if item is large enough in screen space
      if (item.width * zoom > 40 && item.depth * zoom > 30) {
        ctx.fillText(item.name, 0, -6);
        ctx.font = '500 10px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`${itemWDisplay} × ${itemDDisplay} ${settings.displayUnit}`, 0, 8);
      }
      ctx.restore();

      // If selected, draw interactive rotation handle
      if (isSelected) {
        const handleDistance = item.depth / 2 + 25;
        const handleRoom = transformPoint(0, handleDistance, item.x, item.y, item.rotation);
        const handleScreen = roomToScreen(handleRoom.x, handleRoom.y);

        // Stalk line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(frontScreen.x, frontScreen.y);
        ctx.lineTo(handleScreen.x, handleScreen.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Handle knob
        ctx.beginPath();
        ctx.arc(handleScreen.x, handleScreen.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 6. Draw Distance Guideline Lines while Dragging selected item
    if (isDraggingItem && selectedItem) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const sc = roomToScreen(selectedItem.x, selectedItem.y);

      // Distance to West wall (x = 0)
      const westP = roomToScreen(0, selectedItem.y);
      ctx.beginPath();
      ctx.moveTo(sc.x, sc.y);
      ctx.lineTo(westP.x, westP.y);
      ctx.stroke();

      // Distance to North wall (y = 0)
      const northP = roomToScreen(selectedItem.x, 0);
      ctx.beginPath();
      ctx.moveTo(sc.x, sc.y);
      ctx.lineTo(northP.x, northP.y);
      ctx.stroke();

      // Distance labels
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 11px JetBrains Mono, monospace';
      ctx.fillText(formatDimension(selectedItem.x, settings.displayUnit), (sc.x + westP.x) / 2, sc.y - 6);
      ctx.fillText(formatDimension(selectedItem.y, settings.displayUnit), sc.x + 8, (sc.y + northP.y) / 2);

      ctx.setLineDash([]);
    }

    // 7. Draw Room Boundary Walls
    const wallThickPx = (room.wallThickness || 15) * zoom;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(3, wallThickPx);
    ctx.strokeRect(roomScreenOrigin.x, roomScreenOrigin.y, roomScreenW, roomScreenL);

    // Outer boundary glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      roomScreenOrigin.x - wallThickPx / 2, 
      roomScreenOrigin.y - wallThickPx / 2, 
      roomScreenW + wallThickPx, 
      roomScreenL + wallThickPx
    );

    // 8. Draw Windows on Walls
    const windows = (room.openings || []).filter(o => o.type === 'window');
    for (const win of windows) {
      let winStart = { x: 0, y: 0 };
      let winEnd = { x: 0, y: 0 };
      if (win.wall === 'north') {
        winStart = roomToScreen(win.offset, 0);
        winEnd = roomToScreen(win.offset + win.width, 0);
      } else if (win.wall === 'south') {
        winStart = roomToScreen(win.offset, room.length);
        winEnd = roomToScreen(win.offset + win.width, room.length);
      } else if (win.wall === 'west') {
        winStart = roomToScreen(0, win.offset);
        winEnd = roomToScreen(0, win.offset + win.width);
      } else if (win.wall === 'east') {
        winStart = roomToScreen(room.width, win.offset);
        winEnd = roomToScreen(room.width, win.offset + win.width);
      }

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(4, wallThickPx + 2);
      ctx.beginPath();
      ctx.moveTo(winStart.x, winStart.y);
      ctx.lineTo(winEnd.x, winEnd.y);
      ctx.stroke();
    }

    // 9. Dimension Indicators along Walls (if enabled)
    if (settings.showDimensionsOnPlan) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      // North Wall dimension
      ctx.fillText(formatDimension(room.width, settings.displayUnit), roomScreenOrigin.x + roomScreenW / 2, roomScreenOrigin.y - 14);
      // South Wall dimension
      ctx.fillText(formatDimension(room.width, settings.displayUnit), roomScreenOrigin.x + roomScreenW / 2, roomScreenOrigin.y + roomScreenL + 24);
      // West Wall dimension
      ctx.save();
      ctx.translate(roomScreenOrigin.x - 20, roomScreenOrigin.y + roomScreenL / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(formatDimension(room.length, settings.displayUnit), 0, 0);
      ctx.restore();
    }

  }, [
    room, 
    furniture, 
    settings, 
    fitReport, 
    selectedItemId, 
    zoom, 
    pan, 
    isDraggingItem, 
    roomToScreen
  ]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const roomCoords = screenToRoom(clientX, clientY);

    // Check if middle click or space key held -> pan canvas
    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Check if clicking on rotation handle of selected item
    if (selectedItem && isOverRotationHandle(roomCoords.x, roomCoords.y, selectedItem)) {
      setIsRotating(true);
      setDragStartPos({ x: clientX, y: clientY });
      setItemInitialPos({ x: selectedItem.x, y: selectedItem.y, rotation: selectedItem.rotation });
      return;
    }

    // Check if clicking on any furniture item
    const clickedItem = findItemAtPoint(roomCoords.x, roomCoords.y);
    if (clickedItem) {
      onSelectItem(clickedItem);
      setIsDraggingItem(true);
      setDragStartPos({ x: roomCoords.x, y: roomCoords.y });
      setItemInitialPos({ x: clickedItem.x, y: clickedItem.y, rotation: clickedItem.rotation });
    } else {
      // Clicked background -> deselect and initiate pan
      onSelectItem(null);
      setIsPanning(true);
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (isPanning) {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStartPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDraggingItem && selectedItem) {
      const currentRoomPos = screenToRoom(clientX, clientY);
      const deltaX = currentRoomPos.x - dragStartPos.x;
      const deltaY = currentRoomPos.y - dragStartPos.y;

      let newX = itemInitialPos.x + deltaX;
      let newY = itemInitialPos.y + deltaY;

      if (settings.gridSnap) {
        newX = snapToGrid(newX, settings.gridSnapSizeCm);
        newY = snapToGrid(newY, settings.gridSnapSizeCm);
      }

      const updated = furniture.map(f => {
        if (f.id === selectedItem.id) {
          return { ...f, x: Math.round(newX), y: Math.round(newY) };
        }
        return f;
      });
      onUpdateFurniture(updated);
      return;
    }

    if (isRotating && selectedItem) {
      const currentRoomPos = screenToRoom(clientX, clientY);
      // Angle from item center to pointer
      const dx = currentRoomPos.x - selectedItem.x;
      const dy = currentRoomPos.y - selectedItem.y;
      let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI) - 90;
      if (angleDeg < 0) angleDeg += 360;

      // Snap to 15 degrees if grid snap enabled
      if (settings.gridSnap) {
        angleDeg = Math.round(angleDeg / 15) * 15;
      }

      const updated = furniture.map(f => {
        if (f.id === selectedItem.id) {
          return { ...f, rotation: angleDeg % 360 };
        }
        return f;
      });
      onUpdateFurniture(updated);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDraggingItem(false);
    setIsRotating(false);
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    const newZoom = Math.min(Math.max(zoom * factor, 0.2), 6.0);

    // Zoom centered around cursor
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setPan({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      });
    }
    setZoom(newZoom);
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (!selectedItem) {
        if (e.key === 'Tab' && furniture.length > 0) {
          e.preventDefault();
          onSelectItem(furniture[0]);
        }
        return;
      }

      const nudgeStep = e.shiftKey ? 10 : 1; // 1cm or 10cm nudge

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, x: f.x - nudgeStep } : f));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, x: f.x + nudgeStep } : f));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, y: f.y - nudgeStep } : f));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, y: f.y + nudgeStep } : f));
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const deltaRot = e.shiftKey ? -45 : 45;
        const newRot = (selectedItem.rotation + deltaRot + 360) % 360;
        onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, rotation: newRot } : f));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onUpdateFurniture(furniture.filter(f => f.id !== selectedItem.id));
        onSelectItem(null);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = furniture.findIndex(f => f.id === selectedItem.id);
        const nextIndex = (currentIndex + 1) % furniture.length;
        onSelectItem(furniture[nextIndex]);
      } else if (e.key === 'Escape') {
        onSelectItem(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, furniture, onUpdateFurniture, onSelectItem]);

  // Quick Action Helpers
  const handleRotateQuarter = () => {
    if (!selectedItem) return;
    const newRot = (selectedItem.rotation + 90) % 360;
    onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, rotation: newRot } : f));
  };

  const handleDuplicate = () => {
    if (!selectedItem) return;
    const copyItem: FurnitureItem = {
      ...selectedItem,
      id: `item-${Date.now()}`,
      name: `${selectedItem.name} (Copy)`,
      x: Math.min(room.width - selectedItem.width / 2, selectedItem.x + 20),
      y: Math.min(room.length - selectedItem.depth / 2, selectedItem.y + 20),
    };
    onUpdateFurniture([...furniture, copyItem]);
    onSelectItem(copyItem);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    onUpdateFurniture(furniture.filter(f => f.id !== selectedItem.id));
    onSelectItem(null);
  };

  const handleConfirmProvenance = () => {
    if (!selectedItem) return;
    onUpdateFurniture(
      furniture.map(f => f.id === selectedItem.id ? { ...f, isConfirmed: true, provenance: 'manual', provenanceNotes: 'Confirmed by user.' } : f)
    );
  };

  return (
    <div 
      ref={containerRef} 
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#07090e',
      }}
    >
      {/* Interactive 2D Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isPanning ? 'grab' : isDraggingItem ? 'grabbing' : isRotating ? 'crosshair' : 'default',
          touchAction: 'none',
        }}
      />

      {/* Floating View Controls (Zoom, Fit, Compass) */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 20,
      }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '4px' }}>
          <button 
            onClick={() => setZoom(z => Math.min(z * 1.2, 5.0))} 
            className="btn btn-ghost btn-icon" 
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))} 
            className="btn btn-ghost btn-icon" 
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={fitToScreen} 
            className="btn btn-ghost btn-icon" 
            title="Reset View / Fit Room to Screen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Mini Compass / Orientation Indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <div className="glass-panel" style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
        }}>
          <Compass size={14} className="text-sky-400" />
          <span>North Wall (Top)</span>
        </div>
      </div>

      {/* Floating Item Inspector Drawer (when an item is selected) */}
      {selectedItem && (
        <div className="glass-panel" style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 680px)',
          padding: '12px 18px',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: selectedItem.color,
                display: 'inline-block',
                boxShadow: `0 0 8px ${selectedItem.color}`,
              }} />
              <input
                type="text"
                value={selectedItem.name}
                onChange={e => {
                  const updated = furniture.map(f => f.id === selectedItem.id ? { ...f, name: e.target.value } : f);
                  onUpdateFurniture(updated);
                }}
                className="input-field"
                style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '4px 8px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderBottom: '1px solid var(--border-medium)',
                  width: '180px',
                }}
              />
              {/* Provenance Badge */}
              <span style={{
                fontSize: '0.7rem',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                background: selectedItem.isConfirmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: selectedItem.isConfirmed ? '#34d399' : '#fbbf24',
                border: `1px solid ${selectedItem.isConfirmed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              }}>
                {selectedItem.isConfirmed ? 'Confirmed' : `${selectedItem.provenance} (Unverified)`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {!selectedItem.isConfirmed && (
                <button
                  onClick={handleConfirmProvenance}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderColor: 'rgba(245, 158, 11, 0.5)',
                    color: '#fbbf24',
                  }}
                  title="Mark this item as physically measured and confirmed"
                >
                  <CheckCircle size={14} />
                  <span>Confirm</span>
                </button>
              )}
              <button onClick={handleRotateQuarter} className="btn btn-secondary btn-icon" title="Rotate 90° (or press R)">
                <RotateCw size={15} />
              </button>
              <button onClick={handleDuplicate} className="btn btn-secondary btn-icon" title="Duplicate item">
                <Copy size={15} />
              </button>
              <button onClick={handleDelete} className="btn btn-danger btn-icon" title="Delete item (or press Delete)">
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Dimension Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '10px', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                Width ({settings.displayUnit})
              </label>
              <input
                type="number"
                value={fromCm(selectedItem.width, settings.displayUnit)}
                onChange={e => {
                  const val = toCm(parseFloat(e.target.value) || 0, settings.displayUnit);
                  if (val > 0) {
                    onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, width: Math.round(val) } : f));
                  }
                }}
                className="input-field font-mono"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                Depth ({settings.displayUnit})
              </label>
              <input
                type="number"
                value={fromCm(selectedItem.depth, settings.displayUnit)}
                onChange={e => {
                  const val = toCm(parseFloat(e.target.value) || 0, settings.displayUnit);
                  if (val > 0) {
                    onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, depth: Math.round(val) } : f));
                  }
                }}
                className="input-field font-mono"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                Height ({settings.displayUnit})
              </label>
              <input
                type="number"
                value={fromCm(selectedItem.height, settings.displayUnit)}
                onChange={e => {
                  const val = toCm(parseFloat(e.target.value) || 0, settings.displayUnit);
                  if (val > 0) {
                    onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, height: Math.round(val) } : f));
                  }
                }}
                className="input-field font-mono"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                Rotation (°)
              </label>
              <input
                type="number"
                min={0}
                max={359}
                value={selectedItem.rotation}
                onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, rotation: (val % 360 + 360) % 360 } : f));
                }}
                className="input-field font-mono"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                Color
              </label>
              <input
                type="color"
                value={selectedItem.color}
                onChange={e => {
                  onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, color: e.target.value } : f));
                }}
                style={{
                  width: '32px',
                  height: '30px',
                  padding: 0,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
