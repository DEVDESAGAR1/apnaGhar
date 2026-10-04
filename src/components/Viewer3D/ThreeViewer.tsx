import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { RoomModel, FurnitureItem, FitReport, UnitType } from '../../types/model';
import { Eye, Layers, Compass, Download } from 'lucide-react';

interface ThreeViewerProps {
  room: RoomModel;
  furniture: FurnitureItem[];
  fitReport: FitReport;
  displayUnit: UnitType;
  selectedItemId: string | null;
  onSelectItem?: (item: FurnitureItem | null) => void;
}

export const ThreeViewer: React.FC<ThreeViewerProps> = ({
  room,
  furniture,
  fitReport,
  selectedItemId,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Camera Orbit State
  const cameraState = useRef({
    radius: Math.max(room.width, room.length) * 1.5,
    theta: Math.PI / 4, // azimuth
    phi: Math.PI / 3,   // polar
    target: new THREE.Vector3(0, room.height * 0.35, 0),
    isDragging: false,
    isPanning: false,
    lastX: 0,
    lastY: 0,
  });

  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'eye' | 'front'>('iso');

  // Set Camera Preset
  const applyCameraPreset = (preset: 'iso' | 'top' | 'eye' | 'front') => {
    setActivePreset(preset);
    const maxDim = Math.max(room.width, room.length);

    if (preset === 'iso') {
      cameraState.current.radius = maxDim * 1.4;
      cameraState.current.theta = Math.PI / 4;
      cameraState.current.phi = Math.PI / 3.2;
      cameraState.current.target.set(0, room.height * 0.3, 0);
    } else if (preset === 'top') {
      cameraState.current.radius = maxDim * 1.5;
      cameraState.current.theta = 0;
      cameraState.current.phi = 0.05; // almost straight down
      cameraState.current.target.set(0, 0, 0);
    } else if (preset === 'eye') {
      cameraState.current.radius = maxDim * 0.45;
      cameraState.current.theta = 0;
      cameraState.current.phi = Math.PI / 2.05; // horizontal
      cameraState.current.target.set(0, 140, 0); // eye level at 140-160cm
    } else if (preset === 'front') {
      cameraState.current.radius = maxDim * 1.5;
      cameraState.current.theta = 0;
      cameraState.current.phi = Math.PI / 2.2;
      cameraState.current.target.set(0, room.height * 0.3, 0);
    }
  };

  // Helper to construct stylized procedural 3D furniture
  const createFurniture3D = (item: FurnitureItem, isFailing: boolean, isReview: boolean, isSelected: boolean) => {
    const group = new THREE.Group();
    group.name = item.id;

    // Convert canonical dimensions from cm
    const w = item.width;
    const d = item.depth;
    const h = item.height;

    const baseColor = new THREE.Color(item.color || '#3d5a80');
    let displayColor = baseColor;

    if (isFailing) {
      displayColor = new THREE.Color('#f43f5e');
    } else if (isReview) {
      displayColor = new THREE.Color('#f59e0b');
    }

    const material = new THREE.MeshStandardMaterial({
      color: displayColor,
      roughness: 0.45,
      metalness: 0.1,
    });

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.6,
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Procedural geometry based on modelType
    if (item.modelType.startsWith('sofa')) {
      // Sofa Base
      const seatH = h * 0.45;
      const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d), material);
      seatMesh.position.y = seatH / 2;
      group.add(seatMesh);

      // Backrest
      const backH = h * 0.55;
      const backD = d * 0.25;
      const backMesh = new THREE.Mesh(new THREE.BoxGeometry(w, backH, backD), material);
      backMesh.position.set(0, seatH + backH / 2, -d / 2 + backD / 2);
      group.add(backMesh);

      // Left & Right Armrests
      const armW = w * 0.12;
      const armH = h * 0.35;
      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), material);
      leftArm.position.set(-w / 2 + armW / 2, seatH + armH / 2, 0);
      const rightArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), material);
      rightArm.position.set(w / 2 - armW / 2, seatH + armH / 2, 0);
      group.add(leftArm, rightArm);

    } else if (item.modelType.startsWith('bed')) {
      // Bed Frame
      const frameH = h * 0.35;
      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), woodMaterial);
      frameMesh.position.y = frameH / 2;
      group.add(frameMesh);

      // Mattress
      const matH = h * 0.3;
      const matMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
      const matMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, matH, d * 0.94), matMat);
      matMesh.position.y = frameH + matH / 2;
      group.add(matMesh);

      // Headboard
      const headH = h * 0.8;
      const headD = 12;
      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(w, headH, headD), material);
      headMesh.position.set(0, headH / 2, -d / 2 + headD / 2);
      group.add(headMesh);

      // Pillows
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
      const pilW = w * 0.38;
      const pilD = d * 0.2;
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(pilW, 12, pilD), pillowMat);
      p1.position.set(-w * 0.24, frameH + matH + 6, -d * 0.3);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(pilW, 12, pilD), pillowMat);
      p2.position.set(w * 0.24, frameH + matH + 6, -d * 0.3);
      group.add(p1, p2);

    } else if (item.modelType === 'dining_table' || item.modelType === 'desk' || item.modelType === 'desk_compact') {
      // Tabletop
      const topThick = 6;
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), item.modelType.includes('desk') ? material : woodMaterial);
      topMesh.position.y = h - topThick / 2;
      group.add(topMesh);

      // 4 Legs
      const legThick = 6;
      const legH = h - topThick;
      const legMat = item.modelType.includes('desk') ? metalMaterial : woodMaterial;
      const legGeom = new THREE.BoxGeometry(legThick, legH, legThick);

      const legPositions = [
        [-w / 2 + legThick, -d / 2 + legThick],
        [w / 2 - legThick, -d / 2 + legThick],
        [-w / 2 + legThick, d / 2 - legThick],
        [w / 2 - legThick, d / 2 - legThick],
      ];

      for (const [lx, lz] of legPositions) {
        const leg = new THREE.Mesh(legGeom, legMat);
        leg.position.set(lx, legH / 2, lz);
        group.add(leg);
      }

    } else if (item.modelType === 'bookcase') {
      // Tall Shelving Unit
      const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMaterial);
      caseMesh.position.y = h / 2;
      group.add(caseMesh);

      // Visual horizontal shelves
      const numShelves = 4;
      const shelfMat = new THREE.MeshStandardMaterial({ color: 0x4a3525 });
      for (let s = 1; s <= numShelves; s++) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 4, d * 0.95), shelfMat);
        sh.position.set(0, (h / (numShelves + 1)) * s, 0);
        group.add(sh);
      }

    } else if (item.modelType === 'plant') {
      // Ceramic Pot
      const potH = h * 0.35;
      const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.3, potH, 16), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      potMesh.position.y = potH / 2;
      group.add(potMesh);

      // Plant Foliage
      const plantMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
      const foliage1 = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.48), plantMat);
      foliage1.position.set(0, potH + h * 0.25, 0);
      const foliage2 = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.35), plantMat);
      foliage2.position.set(0, potH + h * 0.5, 0);
      group.add(foliage1, foliage2);

    } else if (item.modelType === 'lamp') {
      // Floor Lamp
      const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.45, 5, 16), metalMaterial);
      base.position.y = 2.5;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, h * 0.85, 8), metalMaterial);
      stem.position.y = h * 0.45;
      const shade = new THREE.Mesh(new THREE.ConeGeometry(w * 0.4, h * 0.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.4 }));
      shade.position.y = h * 0.9;
      group.add(base, stem, shade);

    } else {
      // Generic Furniture Box with Bevel
      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      boxMesh.position.y = h / 2;
      group.add(boxMesh);
    }

    // Add Wireframe / Outline if failing or selected
    if (isFailing || isSelected) {
      const outlineGeom = new THREE.BoxGeometry(w + 3, h + 3, d + 3);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: isFailing ? 0xf43f5e : 0x38bdf8,
        wireframe: true,
      });
      const outline = new THREE.Mesh(outlineGeom, outlineMat);
      outline.position.y = h / 2;
      group.add(outline);
    }

    // Position and Rotation in Room Coordinate Space
    // Center at room center: (0, 0, 0)
    const posX = item.x - room.width / 2;
    const posZ = item.y - room.length / 2;
    const posY = item.z || 0;

    group.position.set(posX, posY, posZ);
    // Clockwise 2D rotation corresponds to negative Y rotation in Three.js
    group.rotation.y = -item.rotation * (Math.PI / 180);

    return group;
  };

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.0006);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);

    // Architectural Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(room.width * 0.8, room.height * 2.5, room.length * 0.8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.4);
    scene.add(fillLight);

    // 1. Floor Mesh
    const floorGeom = new THREE.PlaneGeometry(room.width, room.length);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.7,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid on floor
    const gridHelper = new THREE.GridHelper(Math.max(room.width, room.length), Math.round(Math.max(room.width, room.length) / 50), 0x38bdf8, 0x1e293b);
    gridHelper.position.y = 0.5;
    scene.add(gridHelper);

    // 2. Room Perimeter Walls
    const wallHeight = room.height || 260;
    const wallThick = room.wallThickness || 15;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      transparent: true,
      opacity: 0.5,
    });

    // North Wall (Z = -room.length / 2)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(room.width + wallThick * 2, wallHeight, wallThick), wallMat);
    northWall.position.set(0, wallHeight / 2, -room.length / 2 - wallThick / 2);
    // South Wall (Z = room.length / 2)
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(room.width + wallThick * 2, wallHeight, wallThick), wallMat);
    southWall.position.set(0, wallHeight / 2, room.length / 2 + wallThick / 2);
    // West Wall (X = -room.width / 2)
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, room.length), wallMat);
    westWall.position.set(-room.width / 2 - wallThick / 2, wallHeight / 2, 0);
    // East Wall (X = room.width / 2)
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, room.length), wallMat);
    eastWall.position.set(room.width / 2 + wallThick / 2, wallHeight / 2, 0);

    scene.add(northWall, southWall, westWall, eastWall);

    // 3. Furniture 3D Objects
    const failingIds = new Set(fitReport.checks.filter(c => c.status === 'FAIL').flatMap(c => c.affectedItemIds));
    const reviewIds = new Set(fitReport.checks.filter(c => c.status === 'REVIEW').flatMap(c => c.affectedItemIds));

    for (const item of furniture) {
      const isFailing = failingIds.has(item.id);
      const isReview = reviewIds.has(item.id) || !item.isConfirmed;
      const isSelected = item.id === selectedItemId;

      const obj3D = createFurniture3D(item, isFailing, isReview, isSelected);
      scene.add(obj3D);
    }

    // Animation / Render Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      // Update camera position based on spherical coordinates
      const { radius, theta, phi, target } = cameraState.current;
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
    };
  }, [room, furniture, fitReport, selectedItemId]);

  // Pointer Interaction Handlers for Camera Orbit & Pan
  const handlePointerDown = (e: React.PointerEvent) => {
    cameraState.current.isDragging = true;
    cameraState.current.isPanning = e.button === 2 || e.shiftKey; // right click or shift -> pan
    cameraState.current.lastX = e.clientX;
    cameraState.current.lastY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cameraState.current.isDragging) return;

    const dx = e.clientX - cameraState.current.lastX;
    const dy = e.clientY - cameraState.current.lastY;

    if (cameraState.current.isPanning) {
      // Pan camera target
      const panSpeed = 0.5;
      cameraState.current.target.x -= dx * panSpeed;
      cameraState.current.target.z -= dy * panSpeed;
    } else {
      // Orbit camera
      const rotSpeed = 0.005;
      cameraState.current.theta -= dx * rotSpeed;
      cameraState.current.phi = Math.max(0.05, Math.min(Math.PI / 2.05, cameraState.current.phi - dy * rotSpeed));
    }

    cameraState.current.lastX = e.clientX;
    cameraState.current.lastY = e.clientY;
  };

  const handlePointerUp = () => {
    cameraState.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.0015;
    const factor = 1 + e.deltaY * zoomSpeed;
    const maxDim = Math.max(room.width, room.length);
    cameraState.current.radius = Math.max(maxDim * 0.2, Math.min(maxDim * 3.5, cameraState.current.radius * factor));
  };

  // Download 3D Snapshot
  const handleDownloadSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `fitcheck-3d-${room.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#07090e',
      }}
    >
      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />

      {/* Floating 3D Camera Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 20,
      }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '4px', gap: '2px' }}>
          <button
            onClick={() => applyCameraPreset('iso')}
            className={`btn btn-ghost ${activePreset === 'iso' ? 'bg-sky-500/20 text-sky-400' : ''}`}
            style={{ fontSize: '0.75rem', padding: '6px 10px', justifyContent: 'flex-start' }}
            title="Isometric 45° Architectural View"
          >
            <Compass size={14} />
            <span>Isometric</span>
          </button>
          <button
            onClick={() => applyCameraPreset('top')}
            className={`btn btn-ghost ${activePreset === 'top' ? 'bg-sky-500/20 text-sky-400' : ''}`}
            style={{ fontSize: '0.75rem', padding: '6px 10px', justifyContent: 'flex-start' }}
            title="Top-Down Plan View"
          >
            <Layers size={14} />
            <span>Top-Down</span>
          </button>
          <button
            onClick={() => applyCameraPreset('eye')}
            className={`btn btn-ghost ${activePreset === 'eye' ? 'bg-sky-500/20 text-sky-400' : ''}`}
            style={{ fontSize: '0.75rem', padding: '6px 10px', justifyContent: 'flex-start' }}
            title="Eye-Level Walkthrough View (160cm Height)"
          >
            <Eye size={14} />
            <span>Eye-Level</span>
          </button>
        </div>

        {/* Snapshot Download Button */}
        <button
          onClick={handleDownloadSnapshot}
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', padding: '6px 10px' }}
          title="Download High-Resolution 3D Snapshot"
        >
          <Download size={14} />
          <span>Snapshot</span>
        </button>
      </div>

      {/* 3D Navigation Guide Pill */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <div className="glass-panel" style={{
          padding: '6px 12px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          gap: '12px',
        }}>
          <span>Left-Drag: Orbit</span>
          <span>Right-Drag: Pan</span>
          <span>Scroll: Zoom</span>
        </div>
      </div>
    </div>
  );
};
