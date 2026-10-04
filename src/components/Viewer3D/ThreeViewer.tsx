import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { RoomModel, FurnitureItem, FitReport, UnitType, RoomOpening } from '../../types/model';
import { formatDimension } from '../../utils/units';
import { 
  Compass, 
  Layers, 
  RotateCw, 
  Trash2, 
  CheckCircle, 
  Download, 
  Move
} from 'lucide-react';

interface ThreeViewerProps {
  room: RoomModel;
  furniture: FurnitureItem[];
  fitReport: FitReport;
  displayUnit: UnitType;
  selectedItemId: string | null;
  onSelectItem?: (item: FurnitureItem | null) => void;
  onUpdateFurniture?: (items: FurnitureItem[]) => void;
}

export const ThreeViewer: React.FC<ThreeViewerProps> = ({
  room,
  furniture,
  fitReport,
  displayUnit,
  selectedItemId,
  onSelectItem,
  onUpdateFurniture,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);

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

  // 3D Furniture Manipulation Drag State
  const dragInteraction = useRef({
    isDraggingFurniture: false,
    draggedItemId: null as string | null,
    plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    dragOffset: new THREE.Vector3(),
    hasMoved: false,
  });

  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'eye' | 'front'>('iso');

  const selectedItem = furniture.find(f => f.id === selectedItemId) || null;

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
      seatMesh.castShadow = true;
      group.add(seatMesh);

      // Backrest
      const backH = h * 0.55;
      const backD = d * 0.25;
      const backMesh = new THREE.Mesh(new THREE.BoxGeometry(w, backH, backD), material);
      backMesh.position.set(0, seatH + backH / 2, -d / 2 + backD / 2);
      backMesh.castShadow = true;
      group.add(backMesh);

      // Left & Right Armrests
      const armW = w * 0.12;
      const armH = h * 0.35;
      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), material);
      leftArm.position.set(-w / 2 + armW / 2, seatH + armH / 2, 0);
      const rightArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), material);
      rightArm.position.set(w / 2 - armW / 2, seatH + armH / 2, 0);
      leftArm.castShadow = true;
      rightArm.castShadow = true;
      group.add(leftArm, rightArm);

    } else if (item.modelType.startsWith('bed')) {
      // Bed Frame
      const frameH = h * 0.35;
      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), woodMaterial);
      frameMesh.position.y = frameH / 2;
      frameMesh.castShadow = true;
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
      headMesh.castShadow = true;
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
      const topThick = 5;
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), woodMaterial);
      topMesh.position.y = h - topThick / 2;
      topMesh.castShadow = true;
      group.add(topMesh);

      // 4 Legs
      const legThick = 5;
      const legH = h - topThick;
      const legGeom = new THREE.BoxGeometry(legThick, legH, legThick);

      const l1 = new THREE.Mesh(legGeom, metalMaterial);
      l1.position.set(-w / 2 + legThick, legH / 2, -d / 2 + legThick);
      const l2 = new THREE.Mesh(legGeom, metalMaterial);
      l2.position.set(w / 2 - legThick, legH / 2, -d / 2 + legThick);
      const l3 = new THREE.Mesh(legGeom, metalMaterial);
      l3.position.set(-w / 2 + legThick, legH / 2, d / 2 - legThick);
      const l4 = new THREE.Mesh(legGeom, metalMaterial);
      l4.position.set(w / 2 - legThick, legH / 2, d / 2 - legThick);
      group.add(l1, l2, l3, l4);

    } else if (item.modelType === 'coffee_table') {
      // Low Coffee Table
      const topH = 4;
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, topH, d), woodMaterial);
      topMesh.position.y = h - topH / 2;
      topMesh.castShadow = true;
      group.add(topMesh);

      const legH = h - topH;
      const legGeom = new THREE.CylinderGeometry(2, 2, legH, 8);
      const legMat = metalMaterial;
      const l1 = new THREE.Mesh(legGeom, legMat);
      l1.position.set(-w * 0.4, legH / 2, -d * 0.4);
      const l2 = new THREE.Mesh(legGeom, legMat);
      l2.position.set(w * 0.4, legH / 2, -d * 0.4);
      const l3 = new THREE.Mesh(legGeom, legMat);
      l3.position.set(-w * 0.4, legH / 2, d * 0.4);
      const l4 = new THREE.Mesh(legGeom, legMat);
      l4.position.set(w * 0.4, legH / 2, d * 0.4);
      group.add(l1, l2, l3, l4);

    } else if (item.modelType === 'chair' || item.modelType === 'office_chair') {
      // Seat
      const seatH = 4;
      const seatY = h * 0.5;
      const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d), material);
      seatMesh.position.y = seatY;
      seatMesh.castShadow = true;
      group.add(seatMesh);

      // Back
      const backH = h * 0.5;
      const backMesh = new THREE.Mesh(new THREE.BoxGeometry(w, backH, 4), material);
      backMesh.position.set(0, seatY + backH / 2, -d / 2 + 2);
      group.add(backMesh);

      // Legs
      const legGeom = new THREE.CylinderGeometry(1.5, 1.5, seatY, 8);
      const l1 = new THREE.Mesh(legGeom, metalMaterial);
      l1.position.set(-w * 0.4, seatY / 2, -d * 0.4);
      const l2 = new THREE.Mesh(legGeom, metalMaterial);
      l2.position.set(w * 0.4, seatY / 2, -d * 0.4);
      const l3 = new THREE.Mesh(legGeom, metalMaterial);
      l3.position.set(-w * 0.4, seatY / 2, d * 0.4);
      const l4 = new THREE.Mesh(legGeom, metalMaterial);
      l4.position.set(w * 0.4, seatY / 2, d * 0.4);
      group.add(l1, l2, l3, l4);

    } else if (item.modelType === 'wardrobe' || item.modelType === 'bookcase') {
      // Tall Cabinet
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMaterial);
      bodyMesh.position.y = h / 2;
      bodyMesh.castShadow = true;
      group.add(bodyMesh);

      // Division Line
      const divGeom = new THREE.BoxGeometry(1, h * 0.95, 2);
      const divMesh = new THREE.Mesh(divGeom, metalMaterial);
      divMesh.position.set(0, h / 2, d / 2 + 1);
      group.add(divMesh);

    } else if (item.modelType === 'tv_unit') {
      // TV Console
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMaterial);
      baseMesh.position.y = h / 2;
      baseMesh.castShadow = true;
      group.add(baseMesh);

      // Flat Screen TV on top
      const tvW = w * 0.75;
      const tvH = tvW * 0.56;
      const tvD = 4;
      const tvMesh = new THREE.Mesh(new THREE.BoxGeometry(tvW, tvH, tvD), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 }));
      tvMesh.position.set(0, h + tvH / 2 + 3, 0);
      group.add(tvMesh);

    } else if (item.modelType === 'floor_lamp') {
      // Lamp Base & Stem
      const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.35, w * 0.35, 4, 16), metalMaterial);
      base.position.y = 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, h * 0.85, 8), metalMaterial);
      stem.position.y = h * 0.45;
      const shade = new THREE.Mesh(new THREE.ConeGeometry(w * 0.4, h * 0.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.4 }));
      shade.position.y = h * 0.9;
      group.add(base, stem, shade);

    } else {
      // Generic Furniture Box
      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      boxMesh.position.y = h / 2;
      boxMesh.castShadow = true;
      group.add(boxMesh);
    }

    // Add Highlight / Selection Bounding Box
    if (isFailing || isSelected) {
      const outlineGeom = new THREE.BoxGeometry(w + 4, h + 4, d + 4);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: isFailing ? 0xf43f5e : 0x38bdf8,
        wireframe: true,
      });
      const outline = new THREE.Mesh(outlineGeom, outlineMat);
      outline.position.y = h / 2;
      group.add(outline);
    }

    // Position and Rotation in Room Coordinate Space
    const posX = item.x - room.width / 2;
    const posZ = item.y - room.length / 2;
    const posY = item.z || 0;

    group.position.set(posX, posY, posZ);
    // Clockwise 2D rotation corresponds to negative Y rotation in Three.js
    group.rotation.y = -item.rotation * (Math.PI / 180);

    return group;
  };

  // Helper to construct architectural Door in 3D
  const createDoor3D = (door: RoomOpening) => {
    const doorGroup = new THREE.Group();
    const frameThick = 8;
    const frameDepth = room.wallThickness || 15;
    const doorW = door.width;
    const doorH = door.height || 210;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.6 }); // Warm natural oak leaf
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }); // Brass lever

    // Door frame jambs & lintel
    const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH, frameDepth + 2), frameMat);
    leftJamb.position.set(-doorW / 2 + frameThick / 2, doorH / 2, 0);

    const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH, frameDepth + 2), frameMat);
    rightJamb.position.set(doorW / 2 - frameThick / 2, doorH / 2, 0);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, frameThick, frameDepth + 2), frameMat);
    lintel.position.set(0, doorH - frameThick / 2, 0);

    doorGroup.add(leftJamb, rightJamb, lintel);

    // Door Leaf (rendered open at 60° angle into the room)
    const leafThick = 4;
    const leafW = doorW - frameThick * 2;
    const leafH = doorH - frameThick;
    const leafMesh = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, leafThick), leafMat);
    leafMesh.position.set(leafW / 2, leafH / 2, 0);

    const hingePivot = new THREE.Group();
    hingePivot.position.set(-doorW / 2 + frameThick, 0, 0);
    hingePivot.rotation.y = Math.PI / 3; // 60 degrees open
    hingePivot.add(leafMesh);

    // Door Handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 4), brassMat);
    handle.position.set(leafW - 8, leafH * 0.48, leafThick / 2 + 2);
    hingePivot.add(handle);

    doorGroup.add(hingePivot);

    // Position door along the appropriate wall
    positionOpeningGroup(doorGroup, door);
    return doorGroup;
  };

  // Helper to construct architectural Window in 3D
  const createWindow3D = (win: RoomOpening) => {
    const winGroup = new THREE.Group();
    const frameThick = 6;
    const wallThick = room.wallThickness || 15;
    const winW = win.width;
    const winH = win.height || 120;
    const sillY = win.sillHeight || 85;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c3338, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4,
    });
    const sillMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.8 });

    // Window Outer Frame
    const frameGeom = new THREE.BoxGeometry(winW, winH, wallThick + 2);
    const frameMesh = new THREE.Mesh(frameGeom, frameMat);
    frameMesh.position.y = sillY + winH / 2;
    winGroup.add(frameMesh);

    // Translucent Glazing
    const glassGeom = new THREE.BoxGeometry(winW - frameThick * 2, winH - frameThick * 2, 2);
    const glassMesh = new THREE.Mesh(glassGeom, glassMat);
    glassMesh.position.y = sillY + winH / 2;
    winGroup.add(glassMesh);

    // Architectural Window Sill
    const sillGeom = new THREE.BoxGeometry(winW + 12, 5, wallThick + 10);
    const sillMesh = new THREE.Mesh(sillGeom, sillMat);
    sillMesh.position.y = sillY - 2.5;
    winGroup.add(sillMesh);

    positionOpeningGroup(winGroup, win);
    return winGroup;
  };

  // Helper to position door/window groups along walls
  const positionOpeningGroup = (group: THREE.Group, opening: RoomOpening) => {
    const halfW = room.width / 2;
    const halfL = room.length / 2;

    if (opening.wall === 'north') {
      // Along North Wall (Z = -halfL)
      const posX = -halfW + opening.offset + opening.width / 2;
      group.position.set(posX, 0, -halfL);
      group.rotation.y = 0;
    } else if (opening.wall === 'south') {
      // Along South Wall (Z = halfL)
      const posX = -halfW + opening.offset + opening.width / 2;
      group.position.set(posX, 0, halfL);
      group.rotation.y = Math.PI;
    } else if (opening.wall === 'west') {
      // Along West Wall (X = -halfW)
      const posZ = -halfL + opening.offset + opening.width / 2;
      group.position.set(-halfW, 0, posZ);
      group.rotation.y = -Math.PI / 2;
    } else if (opening.wall === 'east') {
      // Along East Wall (X = halfW)
      const posZ = -halfL + opening.offset + opening.width / 2;
      group.position.set(halfW, 0, posZ);
      group.rotation.y = Math.PI / 2;
    }
  };

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x07090e);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 15000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);

    // 2. Architectural Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8f0, 1.2);
    dirLight.position.set(room.width * 0.8, room.height * 2.2, room.length * 0.8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
    fillLight.position.set(-room.width * 0.8, room.height * 1.5, -room.length * 0.8);
    scene.add(fillLight);

    // 3. Room Floor & Finishing
    const floorGeom = new THREE.PlaneGeometry(room.width, room.length);
    const floorColor = room.finishes?.floorColor ? new THREE.Color(room.finishes.floorColor) : new THREE.Color(0x232a38);
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: room.finishes?.floorType?.includes('hardwood') ? 0.45 : 0.65,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Grid
    const gridHelper = new THREE.GridHelper(Math.max(room.width, room.length), Math.round(Math.max(room.width, room.length) / 50), 0xc26d53, 0x334155);
    gridHelper.position.y = 0.5;
    scene.add(gridHelper);

    // 4. Room Perimeter Walls
    const wallHeight = room.height || 260;
    const wallThick = room.wallThickness || 15;
    const wallColor = room.finishes?.wallColor ? new THREE.Color(room.finishes.wallColor) : new THREE.Color(0x2d3748);
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: room.finishes?.wallFinish === 'limewash' ? 0.95 : 0.75,
      transparent: true,
      opacity: 0.68,
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

    // 5. Priority 11: Render Visible Architectural Doors & Windows in 3D
    const openings = room.openings || [];
    for (const op of openings) {
      if (op.type === 'door') {
        const doorObj = createDoor3D(op);
        scene.add(doorObj);
      } else if (op.type === 'window') {
        const winObj = createWindow3D(op);
        scene.add(winObj);
      }
    }

    // 6. Furniture 3D Objects in a dedicated raycastable group
    const furnitureContainer = new THREE.Group();
    furnitureContainer.name = 'furnitureContainer';
    furnitureGroupRef.current = furnitureContainer;
    scene.add(furnitureContainer);

    const failingIds = new Set(fitReport.checks.filter(c => c.status === 'FAIL').flatMap(c => c.affectedItemIds));
    const reviewIds = new Set(fitReport.checks.filter(c => c.status === 'REVIEW').flatMap(c => c.affectedItemIds));

    for (const item of furniture) {
      const isFailing = failingIds.has(item.id);
      const isReview = reviewIds.has(item.id) || !item.isConfirmed;
      const isSelected = item.id === selectedItemId;

      const obj3D = createFurniture3D(item, isFailing, isReview, isSelected);
      furnitureContainer.add(obj3D);
    }

    // 7. Animation / Render Loop
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

  // -------------------------------------------------------------
  // Priority 8: Raycasting & Floor-Plane Dragging / Rotation in 3D
  // -------------------------------------------------------------

  const getPointerRaycaster = (clientX: number, clientY: number) => {
    if (!mountRef.current || !cameraRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    return { raycaster, x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 2) return;

    const rayData = getPointerRaycaster(e.clientX, e.clientY);
    if (!rayData) return;

    // Left click: test if clicking a furniture object
    if (e.button === 0 && furnitureGroupRef.current) {
      const intersects = rayData.raycaster.intersectObjects(furnitureGroupRef.current.children, true);
      if (intersects.length > 0) {
        // Find top-level furniture group
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && hitObj.parent && hitObj.parent !== furnitureGroupRef.current) {
          hitObj = hitObj.parent;
        }

        if (hitObj && hitObj.name) {
          const hitItem = furniture.find(f => f.id === hitObj!.name);
          if (hitItem) {
            onSelectItem?.(hitItem);

            // Setup floor-plane dragging
            const intersectFloor = new THREE.Vector3();
            rayData.raycaster.ray.intersectPlane(dragInteraction.current.plane, intersectFloor);

            dragInteraction.current.isDraggingFurniture = true;
            dragInteraction.current.draggedItemId = hitItem.id;
            dragInteraction.current.hasMoved = false;

            const itemSceneX = hitItem.x - room.width / 2;
            const itemSceneZ = hitItem.y - room.length / 2;
            dragInteraction.current.dragOffset.set(
              intersectFloor.x - itemSceneX,
              0,
              intersectFloor.z - itemSceneZ
            );
            return;
          }
        }
      } else {
        // Clicked outside furniture on floor
        onSelectItem?.(null);
      }
    }

    // Default to camera orbit/pan
    cameraState.current.isDragging = true;
    cameraState.current.isPanning = e.button === 2 || e.shiftKey;
    cameraState.current.lastX = e.clientX;
    cameraState.current.lastY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. If dragging furniture in 3D:
    if (dragInteraction.current.isDraggingFurniture && dragInteraction.current.draggedItemId && onUpdateFurniture) {
      const rayData = getPointerRaycaster(e.clientX, e.clientY);
      if (!rayData) return;

      const floorPoint = new THREE.Vector3();
      const hit = rayData.raycaster.ray.intersectPlane(dragInteraction.current.plane, floorPoint);
      if (!hit) return;

      dragInteraction.current.hasMoved = true;
      const targetItem = furniture.find(f => f.id === dragInteraction.current.draggedItemId);
      if (!targetItem) return;

      const newSceneX = floorPoint.x - dragInteraction.current.dragOffset.x;
      const newSceneZ = floorPoint.z - dragInteraction.current.dragOffset.z;

      // Convert scene coordinates back to canonical room coordinates (cm)
      const rawRoomX = newSceneX + room.width / 2;
      const rawRoomY = newSceneZ + room.length / 2;

      // Clamp within room boundaries
      const clampedX = Math.max(targetItem.width / 2, Math.min(room.width - targetItem.width / 2, rawRoomX));
      const clampedY = Math.max(targetItem.depth / 2, Math.min(room.length - targetItem.depth / 2, rawRoomY));

      const updated = furniture.map(f => 
        f.id === targetItem.id ? { ...f, x: Math.round(clampedX), y: Math.round(clampedY) } : f
      );
      onUpdateFurniture(updated);
      return;
    }

    // 2. Otherwise Orbit/Pan camera:
    if (!cameraState.current.isDragging) return;

    const dx = e.clientX - cameraState.current.lastX;
    const dy = e.clientY - cameraState.current.lastY;

    if (cameraState.current.isPanning) {
      const panSpeed = 0.5;
      cameraState.current.target.x -= dx * panSpeed;
      cameraState.current.target.z -= dy * panSpeed;
    } else {
      const rotSpeed = 0.005;
      cameraState.current.theta -= dx * rotSpeed;
      cameraState.current.phi = Math.max(0.05, Math.min(Math.PI / 2.05, cameraState.current.phi - dy * rotSpeed));
    }

    cameraState.current.lastX = e.clientX;
    cameraState.current.lastY = e.clientY;
  };

  const handlePointerUp = () => {
    dragInteraction.current.isDraggingFurniture = false;
    dragInteraction.current.draggedItemId = null;
    cameraState.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.0015;
    const factor = 1 + e.deltaY * zoomSpeed;
    const maxDim = Math.max(room.width, room.length);
    cameraState.current.radius = Math.max(maxDim * 0.2, Math.min(maxDim * 3.5, cameraState.current.radius * factor));
  };

  // 3D Selected Furniture Actions: Rotate 90°, Confirm, Delete
  const handleRotateQuarter = useCallback(() => {
    if (!selectedItem || !onUpdateFurniture) return;
    const newRot = (selectedItem.rotation + 90) % 360;
    onUpdateFurniture(furniture.map(f => f.id === selectedItem.id ? { ...f, rotation: newRot } : f));
  }, [selectedItem, furniture, onUpdateFurniture]);

  const handleConfirmItem = useCallback(() => {
    if (!selectedItem || !onUpdateFurniture) return;
    onUpdateFurniture(furniture.map(f => 
      f.id === selectedItem.id ? { ...f, isConfirmed: true, provenance: 'manual', provenanceNotes: 'Confirmed by user.' } : f
    ));
  }, [selectedItem, furniture, onUpdateFurniture]);

  const handleDeleteItem = useCallback(() => {
    if (!selectedItem || !onUpdateFurniture) return;
    onUpdateFurniture(furniture.filter(f => f.id !== selectedItem.id));
    onSelectItem?.(null);
  }, [selectedItem, furniture, onUpdateFurniture, onSelectItem]);

  // Download 3D Snapshot
  const handleDownloadSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `apnaghar-3d-${room.name.toLowerCase().replace(/\s+/g, '-')}.png`;
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
          cursor: dragInteraction.current.isDraggingFurniture ? 'grabbing' : 'grab',
          touchAction: 'none',
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
            <Move size={14} />
            <span>Eye Level</span>
          </button>
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
          <button
            onClick={handleDownloadSnapshot}
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '6px 10px', justifyContent: 'flex-start' }}
            title="Export High-Resolution 3D Snapshot"
          >
            <Download size={14} />
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* Mini Compass / Room Indicator */}
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
          <Compass size={14} className="text-terracotta" />
          <span>3D: {room.name} ({room.width}×{room.length} cm) • {room.openings?.length || 0} Openings</span>
        </div>
      </div>

      {/* Floating 3D Furniture Quick Actions Inspector (Priority 8) */}
      {selectedItem && (
        <div className="glass-panel" style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 560px)',
          padding: '10px 16px',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: selectedItem.color,
              display: 'inline-block',
              boxShadow: `0 0 8px ${selectedItem.color}`,
              flexShrink: 0,
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {selectedItem.name}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  background: selectedItem.isConfirmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: selectedItem.isConfirmed ? '#34d399' : '#fbbf24',
                }}>
                  {selectedItem.isConfirmed ? 'Confirmed' : 'Estimate'}
                </span>
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {formatDimension(selectedItem.width, displayUnit, false)} × {formatDimension(selectedItem.depth, displayUnit, false)} × {formatDimension(selectedItem.height, displayUnit)} • {selectedItem.rotation}°
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!selectedItem.isConfirmed && (
              <button
                onClick={handleConfirmItem}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.5)' }}
                title="Confirm dimensions"
              >
                <CheckCircle size={13} />
                <span>Confirm</span>
              </button>
            )}
            <button
              onClick={handleRotateQuarter}
              className="btn btn-secondary btn-icon"
              title="Rotate 90° clockwise in 3D"
            >
              <RotateCw size={14} />
            </button>
            <button
              onClick={handleDeleteItem}
              className="btn btn-danger btn-icon"
              title="Delete item from room"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
