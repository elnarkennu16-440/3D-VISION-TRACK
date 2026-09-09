import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FilterType, PortalMode, HandData, Landmark } from '../types';
import { FILTER_LIST, applyFilterToImageData } from '../utils/filterEngine';
import { drawHandSkeleton, renderPortal, drawRetroHUD } from '../utils/canvasRenderer';
import { getSimulatedHands } from '../utils/handSimulator';

interface HandPortalCanvasProps {
  mode: PortalMode;
  setMode: React.Dispatch<React.SetStateAction<PortalMode>>;
  currentFilter: FilterType;
  setCurrentFilter: React.Dispatch<React.SetStateAction<FilterType>>;
  isWebcamActive: boolean;
  setIsWebcamActive: React.Dispatch<React.SetStateAction<boolean>>;
  isMirror: boolean;
  onSnapshotTriggered: (canvas: HTMLCanvasElement) => void;
  onHandsCountChange: (count: number) => void;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export const HandPortalCanvas: React.FC<HandPortalCanvasProps> = ({
  mode,
  setMode,
  currentFilter,
  setCurrentFilter,
  isWebcamActive,
  setIsWebcamActive,
  isMirror,
  onSnapshotTriggered,
  onHandsCountChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const filterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const synthBackgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gestureAlert, setGestureAlert] = useState<string>('');
  const [fps, setFps] = useState<number>(30);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoCycle, setAutoCycle] = useState<boolean>(true);

  // References for requestAnimationFrame loop and gesture timers
  const tickRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(performance.now());
  const lastFilterPinchTimeRef = useRef<number>(0);
  const lastHandsTogetherTimeRef = useRef<number>(0);
  const lastAutoCycleTimeRef = useRef<number>(performance.now());
  const alertTimeoutRef = useRef<any>(null);

  const handsDataRef = useRef<HandData[]>([]);
  const mediaPipeHandsRef = useRef<any>(null);

  // Trigger alert banner
  const triggerAlert = useCallback((msg: string) => {
    setGestureAlert(msg);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setGestureAlert('');
    }, 1200);
  }, []);

  // Cycle filters
  const cycleFilter = useCallback((step: number, reason = '') => {
    setCurrentFilter(prev => {
      const idx = FILTER_LIST.findIndex(f => f.id === prev);
      const nextIdx = (idx + step + FILTER_LIST.length) % FILTER_LIST.length;
      return FILTER_LIST[nextIdx].id;
    });
    if (reason) triggerAlert(reason);
  }, [setCurrentFilter, triggerAlert]);

  // Toggle Mode
  const toggleMode = useCallback((reason = '') => {
    setMode(prev => (prev === '3D' ? '2D' : '3D'));
    if (reason) triggerAlert(reason);
  }, [setMode, triggerAlert]);

  // Check Gestures on Hand Data
  const checkGestures = useCallback((hands: HandData[]) => {
    const now = performance.now();

    // Helper: is hand making a closed fist
    const isFist = (lm: Landmark[]) => {
      if (!lm || lm.length < 21) return false;
      const wrist = lm[0];
      const tips = [8, 12, 16, 20];
      const pips = [6, 10, 14, 18];
      let closedCount = 0;
      for (let i = 0; i < 4; i++) {
        const tip = lm[tips[i]];
        const pip = lm[pips[i]];
        const dTip = (tip.x - wrist.x) ** 2 + (tip.y - wrist.y) ** 2;
        const dPip = (pip.x - wrist.x) ** 2 + (pip.y - wrist.y) ** 2;
        if (dTip < dPip) closedCount++;
      }
      return closedCount >= 3;
    };

    // 1. Sentuh Jempol-Kelingking (Thumb-Pinky Pinch) -> Switch Filter
    for (const h of hands) {
      const lm = h.landmarks;
      if (!lm || lm.length < 21) continue;
      const thumb = lm[4];
      const pinky = lm[20];
      const wrist = lm[0];
      const middleMcp = lm[9];

      const pinchDist = Math.hypot((thumb.x - pinky.x) * CANVAS_WIDTH, (thumb.y - pinky.y) * CANVAS_HEIGHT);
      const handScale = Math.max(30, Math.hypot((wrist.x - middleMcp.x) * CANVAS_WIDTH, (wrist.y - middleMcp.y) * CANVAS_HEIGHT));

      if (pinchDist < handScale * 0.45) {
        if (now - lastFilterPinchTimeRef.current > 750) {
          lastFilterPinchTimeRef.current = now;
          cycleFilter(1, 'Sentuh Jempol-Kelingking');
          break;
        }
      }
    }

    // 2. Kepal 2 Tangan (Dual Fist) OR Rapat 2 Tangan -> Toggle Mode
    if (hands.length >= 2) {
      const h1 = hands[0].landmarks;
      const h2 = hands[1].landmarks;

      const bothFists = isFist(h1) && isFist(h2);
      const dIndex = Math.hypot((h1[8].x - h2[8].x) * CANVAS_WIDTH, (h1[8].y - h2[8].y) * CANVAS_HEIGHT);
      const dWrist = Math.hypot((h1[0].x - h2[0].x) * CANVAS_WIDTH, (h1[0].y - h2[0].y) * CANVAS_HEIGHT);
      const touching = dIndex < 85 || dWrist < 95;

      if (bothFists || touching) {
        if (now - lastHandsTogetherTimeRef.current > 1200) {
          lastHandsTogetherTimeRef.current = now;
          toggleMode(bothFists ? 'Kepal 2 Tangan' : 'Rapat 2 Tangan');
        }
      }
    }
  }, [cycleFilter, toggleMode]);

  // Handle Keyboard Shortcuts matching 3d.py
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'k') {
        toggleMode("Key 'k'");
      } else if (key === 'n' || key === 'f') {
        cycleFilter(1, "Key 'n' (Next)");
        lastAutoCycleTimeRef.current = performance.now();
      } else if (key === 'y' || key === 'b') {
        cycleFilter(-1, "Key 'y' (Prev)");
        lastAutoCycleTimeRef.current = performance.now();
      } else if (key === 'a') {
        setAutoCycle(prev => {
          const nextVal = !prev;
          triggerAlert(`Auto Filter: ${nextVal ? 'ON (2.0s)' : 'OFF'}`);
          return nextVal;
        });
      } else if (key === 's') {
        if (canvasRef.current) {
          onSnapshotTriggered(canvasRef.current);
          triggerAlert('Snapshot Captured!');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode, cycleFilter, onSnapshotTriggered, triggerAlert]);

  // Initialize MediaPipe Hands
  useEffect(() => {
    let handsInstance: any = null;

    if (window.Hands) {
      try {
        handsInstance = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        handsInstance.onResults((results: any) => {
          if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            handsDataRef.current = [];
            onHandsCountChange(0);
            return;
          }

          const detected: HandData[] = results.multiHandLandmarks.map((landmarks: Landmark[]) => {
            const avgX = landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
            return {
              landmarks,
              avgX,
              isLeftOnScreen: avgX < 0.5,
            };
          });

          handsDataRef.current = detected;
          onHandsCountChange(detected.length);
          checkGestures(detected);
        });

        mediaPipeHandsRef.current = handsInstance;
      } catch (err) {
        console.warn('MediaPipe initialization warning:', err);
      }
    }

    return () => {
      if (handsInstance) {
        try {
          handsInstance.close();
        } catch {
          // ignore
        }
      }
    };
  }, [checkGestures, onHandsCountChange]);

  // Handle Webcam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isActive = true;

    async function startCamera() {
      if (!isWebcamActive) {
        if (videoRef.current && videoRef.current.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          currentStream.getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = null;
        }
        return;
      }

      setCameraError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: CANVAS_WIDTH },
            height: { ideal: CANVAS_HEIGHT },
            facingMode: 'user',
          },
          audio: false,
        });

        if (isActive && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        console.warn('Webcam access error:', err);
        setCameraError(err.message || 'Unable to access webcam. Switched to Simulation Mode.');
        setIsWebcamActive(false);
      }
    }

    startCamera();

    return () => {
      isActive = false;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isWebcamActive, setIsWebcamActive]);

  // Synthetic Background Generator for Demo Mode
  const drawSyntheticFeed = useCallback((ctx: CanvasRenderingContext2D, tick: number) => {
    // Room background simulation with subtle ambient gradient
    const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    grad.addColorStop(0, '#1c1e28');
    grad.addColorStop(0.5, '#141620');
    grad.addColorStop(1, '#0e0f16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle background furniture / door frames as seen in developer room
    ctx.strokeStyle = '#272a38';
    ctx.lineWidth = 3;
    ctx.strokeRect(120, 60, 240, 420); // Door frame
    ctx.strokeRect(620, 140, 260, 260); // Window / poster frame

    // Simulated avatar silhouette in center
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2 + 50;

    // Body shoulders
    ctx.fillStyle = '#1e2130';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 140, 180, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#c89a74';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30, 48, 64, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#181920';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 65, 52, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(cx - 16, cy - 30, 4, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy - 30, 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Main Animation & Render Loop
  useEffect(() => {
    let animId: number;

    const render = async () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      tickRef.current++;
      const tick = tickRef.current;

      // Calculate FPS
      const now = performance.now();
      const elapsed = now - prevTimeRef.current;
      if (elapsed > 0) {
        setFps(prev => 0.92 * prev + 0.08 * (1000 / elapsed));
      }
      prevTimeRef.current = now;

      // 1. Draw raw camera frame onto display canvas
      ctx.save();
      if (isWebcamActive && video && video.readyState >= 2) {
        if (isMirror) {
          ctx.translate(CANVAS_WIDTH, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Process MediaPipe Hands every other frame for high performance
        if (mediaPipeHandsRef.current && tick % 2 === 0) {
          try {
            await mediaPipeHandsRef.current.send({ image: video });
          } catch {
            // ignore frame drops
          }
        }
      } else {
        // Run Simulated Interactive Demo
        drawSyntheticFeed(ctx, tick);

        // Generate synthetic hands
        const simHands = getSimulatedHands(tick);
        handsDataRef.current = simHands;
        onHandsCountChange(2);
      }
      ctx.restore();

      // 2. Prepare Filtered Frame in offscreen canvas
      if (!filterCanvasRef.current) {
        filterCanvasRef.current = document.createElement('canvas');
        filterCanvasRef.current.width = CANVAS_WIDTH;
        filterCanvasRef.current.height = CANVAS_HEIGHT;
      }
      const fCtx = filterCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (fCtx) {
        fCtx.drawImage(canvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        applyFilterToImageData(fCtx, CANVAS_WIDTH, CANVAS_HEIGHT, currentFilter, tick);
      }

      // Auto filter cycle timer (video: WAKTU JEDA: 2.0 DETIK)
      if (autoCycle && now - lastAutoCycleTimeRef.current >= 2000) {
        cycleFilter(1);
        lastAutoCycleTimeRef.current = now;
      }

      // 3. Render Hand Skeletons
      const currentHands = handsDataRef.current;
      currentHands.forEach(h => {
        drawHandSkeleton(ctx, h.landmarks, CANVAS_WIDTH, CANVAS_HEIGHT);
      });

      // 4. Render 2D / 3D Portal between hands
      if (filterCanvasRef.current && currentHands.length >= 1) {
        renderPortal(
          ctx,
          filterCanvasRef.current,
          currentHands,
          mode,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          tick
        );
      }

      // 5. Draw Retro HUD Overlay matching the video
      drawRetroHUD(
        ctx,
        mode,
        currentFilter,
        currentHands.length,
        fps,
        gestureAlert,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        autoCycle
      );

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, [
    isWebcamActive,
    isMirror,
    currentFilter,
    mode,
    gestureAlert,
    fps,
    autoCycle,
    cycleFilter,
    drawSyntheticFeed,
    onHandsCountChange,
  ]);

  return (
    <div id="hand-portal-canvas-wrapper" className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      
      {/* Hidden Video for Webcam Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Main Interactive Canvas */}
      <canvas
        id="retrolens-main-canvas"
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full max-h-full object-contain shadow-2xl rounded-sm border border-neutral-800"
      />

      {/* Camera Error / Permission Notice banner */}
      {cameraError && (
        <div id="camera-error-banner" className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-950/90 text-amber-200 border border-amber-600 px-4 py-2 rounded-lg text-xs font-mono shadow-lg flex items-center gap-2 z-20">
          <span>{cameraError}</span>
          <button
            id="retry-camera-btn"
            onClick={() => setIsWebcamActive(true)}
            className="px-2 py-0.5 bg-amber-500 text-neutral-950 font-bold rounded hover:bg-amber-400 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Floating Mode Indicator Badge */}
      <div className="absolute top-3 right-4 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 bg-black/75 border border-neutral-700/80 rounded-md text-[11px] font-mono text-neutral-300 backdrop-blur-sm">
          {isWebcamActive ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              WEBCAM ACTIVE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              DEMO SIMULATION
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
