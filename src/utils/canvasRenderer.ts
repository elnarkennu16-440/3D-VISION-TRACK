import { HandData, Landmark, PortalMode, FilterType } from '../types';

// Standard MediaPipe Hand Connections (Pairs of landmark indices)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  canvasWidth: number,
  canvasHeight: number
) {
  const points = landmarks.map(lm => ({
    x: lm.x * canvasWidth,
    y: lm.y * canvasHeight
  }));

  // Draw skeletal bones in bright yellow matching video 2 and image.png
  ctx.strokeStyle = '#FFE600';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const p1 = points[startIdx];
    const p2 = points[endIdx];
    if (p1 && p2) {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw joint nodes (Knuckles & fingertips matching yellow markers in video 2)
  const fingertips = new Set([4, 8, 12, 16, 20]);
  points.forEach((pt, idx) => {
    if (fingertips.has(idx)) {
      // Fingertip golden marker with white ring
      ctx.fillStyle = '#FFE600';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function renderPortal(
  ctx: CanvasRenderingContext2D,
  filteredCanvas: HTMLCanvasElement,
  hands: HandData[],
  mode: PortalMode,
  canvasWidth: number,
  canvasHeight: number,
  tick: number
) {
  if (hands.length === 0) return;

  let tl_f: { x: number; y: number };
  let bl_f: { x: number; y: number };
  let tr_f: { x: number; y: number };
  let br_f: { x: number; y: number };
  let zLeft = 0;
  let zRight = 0;

  if (hands.length >= 2) {
    // Sort hands left to right across screen
    const sorted = [...hands].sort((a, b) => a.avgX - b.avgX);
    const leftHand = sorted[0].landmarks;
    const rightHand = sorted[1].landmarks;

    // Anchor 4 front points
    // Top-Left: Left Index fingertip (8)
    // Bottom-Left: Left Thumb tip (4)
    // Top-Right: Right Index fingertip (8)
    // Bottom-Right: Right Thumb tip (4)
    tl_f = { x: leftHand[8].x * canvasWidth, y: leftHand[8].y * canvasHeight };
    bl_f = { x: leftHand[4].x * canvasWidth, y: leftHand[4].y * canvasHeight };
    tr_f = { x: rightHand[8].x * canvasWidth, y: rightHand[8].y * canvasHeight };
    br_f = { x: rightHand[4].x * canvasWidth, y: rightHand[4].y * canvasHeight };
    zLeft = leftHand[8].z;
    zRight = rightHand[8].z;
  } else {
    // 1 Hand detected: anchor around the active hand
    const singleHand = hands[0].landmarks;
    tl_f = { x: singleHand[8].x * canvasWidth, y: singleHand[8].y * canvasHeight };
    bl_f = { x: singleHand[4].x * canvasWidth, y: singleHand[4].y * canvasHeight };
    tr_f = { x: singleHand[20].x * canvasWidth, y: singleHand[20].y * canvasHeight };
    br_f = { x: singleHand[0].x * canvasWidth, y: singleHand[0].y * canvasHeight };
    zLeft = singleHand[8].z;
    zRight = singleHand[20].z;
  }

  if (mode === '2D') {
    // -------------------------------------------------------------
    // 2D QUADRILATERAL PORTAL MODE
    // -------------------------------------------------------------
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl_f.x, tl_f.y);
    ctx.lineTo(tr_f.x, tr_f.y);
    ctx.lineTo(br_f.x, br_f.y);
    ctx.lineTo(bl_f.x, bl_f.y);
    ctx.closePath();
    ctx.clip();

    // Draw filtered video frame inside quadrilateral
    ctx.drawImage(filteredCanvas, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    // White outline border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tl_f.x, tl_f.y);
    ctx.lineTo(tr_f.x, tr_f.y);
    ctx.lineTo(br_f.x, br_f.y);
    ctx.lineTo(bl_f.x, bl_f.y);
    ctx.closePath();
    ctx.stroke();

    // Glowing corner anchor nodes
    [tl_f, tr_f, br_f, bl_f].forEach(pt => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    });

  } else {
    // -------------------------------------------------------------
    // 3D CUBOID PRISM MODE (Full 6 Sisi)
    // -------------------------------------------------------------
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    const handDist = Math.hypot(tr_f.x - tl_f.x, tr_f.y - tl_f.y);
    const boxDepth = handDist * 0.42;

    // Relative depth & angle from landmark Z
    const dz = (zRight - zLeft) * 220;

    const offsetX = (cx - (tl_f.x + tr_f.x) / 2) * 0.28 + dz;
    const offsetY = (cy - (tl_f.y + bl_f.y) / 2) * 0.28 - boxDepth * 0.3;
    const perspScale = 0.76;

    const projectBack = (pt: { x: number; y: number }) => ({
      x: cx + (pt.x - cx) * perspScale + offsetX,
      y: cy + (pt.y - cy) * perspScale + offsetY
    });

    const tl_b = projectBack(tl_f);
    const tr_b = projectBack(tr_f);
    const br_b = projectBack(br_f);
    const bl_b = projectBack(bl_f);

    // Plain transparent sides (rainbow removed per user request)
    // Only wireframe connecting lines are rendered for 3D depth

    // Render Back Face (subtle depth wireframe)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl_b.x, tl_b.y);
    ctx.lineTo(tr_b.x, tr_b.y);
    ctx.lineTo(br_b.x, br_b.y);
    ctx.lineTo(bl_b.x, bl_b.y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(200, 200, 220, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Render Front Face (Filtered Live Video Portal)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl_f.x, tl_f.y);
    ctx.lineTo(tr_f.x, tr_f.y);
    ctx.lineTo(br_f.x, br_f.y);
    ctx.lineTo(bl_f.x, bl_f.y);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(filteredCanvas, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    // 12 Wireframe Edges (Bold White)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;

    // Front Face outline
    ctx.beginPath();
    ctx.moveTo(tl_f.x, tl_f.y);
    ctx.lineTo(tr_f.x, tr_f.y);
    ctx.lineTo(br_f.x, br_f.y);
    ctx.lineTo(bl_f.x, bl_f.y);
    ctx.closePath();
    ctx.stroke();

    // Connecting pillars
    const pillars = [
      [tl_f, tl_b],
      [tr_f, tr_b],
      [br_f, br_b],
      [bl_f, bl_b]
    ];
    pillars.forEach(([p1, p2]) => {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // 8 Anchor Vertices with Glowing Nodes
    [tl_f, tr_f, br_f, bl_f].forEach(pt => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    });

    [tl_b, tr_b, br_b, bl_b].forEach(pt => {
      ctx.fillStyle = '#B0B0D0';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

export function drawRetroHUD(
  ctx: CanvasRenderingContext2D,
  mode: PortalMode,
  filterName: FilterType,
  handsDetectedCount: number,
  fps: number,
  gestureAlert: string,
  canvasWidth: number,
  canvasHeight: number,
  autoCycle = true
) {
  ctx.save();

  const drawOpenCVText = (text: string, x: number, y: number, color = '#FFFF00', fontSize = 16) => {
    ctx.font = `bold ${fontSize}px "Lucida Console", Monaco, monospace, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  // 1. Top-Left HUD (Line 1: Mode, Line 2: Filter)
  const modeStr =
    mode === '3D'
      ? "MODE: 3D [Full 6 Sides] [Press 'k' / Join Hands]"
      : "MODE: 2D RECTANGLE [Press 'k' / Join Hands]";

  const filterStr = `FILTER: ${filterName.toUpperCase()} [Touch Thumb-Pinky / 'a' / 'y']`;

  drawOpenCVText(modeStr, 18, 36, '#FFFF00', 16);
  drawOpenCVText(filterStr, 18, 64, '#FFFF00', 16);

  // 2. Top-Right Title matching video
  const brandText = 'RETROLENS Putra Python';
  const brandWidth = ctx.measureText(brandText).width;
  drawOpenCVText(brandText, canvasWidth - brandWidth - 28, 36, '#FFFF00', 16);

  // 3. Gesture Trigger Popup Alert (if any triggered)
  if (gestureAlert) {
    ctx.font = 'bold 14px "Lucida Console", monospace, sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(18, 80, 290, 26);
    ctx.strokeStyle = '#00FF66';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(18, 80, 290, 26);
    drawOpenCVText(`>> ${gestureAlert}`, 24, 98, '#00FF66', 13);
  }

  // 4. Bottom Left Status (FPS & Hands tracked)
  const statusStr = `FPS: ${fps.toFixed(0)} | Hands: ${handsDetectedCount}/2 ${
    handsDetectedCount >= 2 ? '(CONNECTED)' : '(Awaiting 2 Hands)'
  }`;
  drawOpenCVText(statusStr, 18, canvasHeight - 20, handsDetectedCount >= 2 ? '#00FF66' : '#FF9900', 12);

  ctx.restore();
}
