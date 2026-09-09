import { HandData, Landmark } from '../types';

/**
 * Generates synthetic realistic 2-hand MediaPipe landmarks with natural oscillation,
 * depth tilt, and interactive gesture triggers for instant demo preview.
 */
export function getSimulatedHands(tick: number): HandData[] {
  const t = tick * 0.035;

  // Left hand motion
  const leftX = 0.28 + Math.sin(t * 0.7) * 0.05;
  const leftY = 0.52 + Math.cos(t * 0.9) * 0.04;
  const leftZ = Math.sin(t * 0.6) * 0.12;

  // Right hand motion (different phase to show 3D multi-angle rotation)
  const rightX = 0.72 + Math.sin(t * 0.7 + 2.5) * 0.05;
  const rightY = 0.52 + Math.sin(t * 0.8) * 0.04;
  const rightZ = Math.sin(t * 0.6 + Math.PI) * 0.12;

  const createHandLandmarks = (cx: number, cy: number, cz: number, isLeft: boolean): Landmark[] => {
    const lms: Landmark[] = [];
    const spread = isLeft ? 1 : -1;

    // Landmark 0: Wrist
    lms.push({ x: cx, y: cy + 0.16, z: cz });

    // Thumb 1..4
    lms.push({ x: cx - 0.03 * spread, y: cy + 0.11, z: cz });
    lms.push({ x: cx - 0.05 * spread, y: cy + 0.07, z: cz });
    lms.push({ x: cx - 0.07 * spread, y: cy + 0.04, z: cz });
    lms.push({ x: cx - 0.08 * spread, y: cy + 0.01, z: cz }); // Thumb tip (4)

    // Index 5..8
    lms.push({ x: cx - 0.03 * spread, y: cy + 0.03, z: cz });
    lms.push({ x: cx - 0.03 * spread, y: cy - 0.03, z: cz });
    lms.push({ x: cx - 0.03 * spread, y: cy - 0.08, z: cz });
    lms.push({ x: cx - 0.03 * spread, y: cy - 0.14, z: cz }); // Index tip (8)

    // Middle 9..12
    lms.push({ x: cx, y: cy + 0.02, z: cz });
    lms.push({ x: cx, y: cy - 0.04, z: cz });
    lms.push({ x: cx, y: cy - 0.10, z: cz });
    lms.push({ x: cx, y: cy - 0.16, z: cz }); // Middle tip (12)

    // Ring 13..16
    lms.push({ x: cx + 0.03 * spread, y: cy + 0.03, z: cz });
    lms.push({ x: cx + 0.03 * spread, y: cy - 0.03, z: cz });
    lms.push({ x: cx + 0.03 * spread, y: cy - 0.08, z: cz });
    lms.push({ x: cx + 0.03 * spread, y: cy - 0.13, z: cz }); // Ring tip (16)

    // Pinky 17..20
    lms.push({ x: cx + 0.06 * spread, y: cy + 0.05, z: cz });
    lms.push({ x: cx + 0.06 * spread, y: cy, z: cz });
    lms.push({ x: cx + 0.06 * spread, y: cy - 0.05, z: cz });
    lms.push({ x: cx + 0.06 * spread, y: cy - 0.09, z: cz }); // Pinky tip (20)

    return lms;
  };

  return [
    {
      landmarks: createHandLandmarks(leftX, leftY, leftZ, true),
      avgX: leftX,
      isLeftOnScreen: true,
    },
    {
      landmarks: createHandLandmarks(rightX, rightY, rightZ, false),
      avgX: rightX,
      isLeftOnScreen: false,
    },
  ];
}
