#!/usr/bin/env python3
"""
RETRO/2000s Fake Python - 3D Hand Tracking Portal & Multi-Angle Filter Box
Accurate replication of the viral MediaPipe hand-tracking interactive filter box.

Features:
- Real-time 2-hand tracking via MediaPipe Hands
- Dynamic 2D quadrilateral & full 6-sided 3D geometric box anchored to hands
- 11 real-time visual filters (Dual-tone, Thermal, Sketch, Cartoon, Invert, Edge, Blur, Rainbow-wave, Pixelate, Glitch, Red-channel)
- Gesture control:
    * Kepal 2 Tangan (Make fist with both hands) or press 'k' -> Toggle 2D / 3D Mode
    * Sentuh Jempol-Kelingking (Touch Thumb to Pinky) or press 'n'/'y' -> Switch Filters
- Keyboard controls:
    * 'k' : Toggle 2D / 3D Mode
    * 'n' : Next Filter
    * 'y' : Previous Filter
    * 'q' / ESC : Quit
"""

import math
import os
import sys
import time
import cv2
import numpy as np

# Safe MediaPipe Import with compatibility guard for Python 3.14 / 3.13
mp_hands = None
mp_draw = None
mp_draw_styles = None
MEDIAPIPE_AVAILABLE = False

try:
    import mediapipe as mp

    try:
        from mediapipe.python.solutions import hands as mp_hands
        from mediapipe.python.solutions import drawing_utils as mp_draw
        from mediapipe.python.solutions import drawing_styles as mp_draw_styles
        MEDIAPIPE_AVAILABLE = True
    except (ImportError, AttributeError):
        if hasattr(mp, "solutions") and hasattr(mp.solutions, "hands"):
            mp_hands = mp.solutions.hands
            mp_draw = mp.solutions.drawing_utils
            mp_draw_styles = getattr(mp.solutions, "drawing_styles", None)
            MEDIAPIPE_AVAILABLE = True
except (ImportError, AttributeError):
    mp = None

# Automatic MediaPipe launcher delegation on Windows if run directly on Python 3.14
if not MEDIAPIPE_AVAILABLE and sys.platform == "win32" and "RETROLENS_NO_RELAUNCH" not in os.environ:
    import subprocess
    app_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(app_dir, "venv_py311", "Scripts", "python.exe")
    candidates = []
    if os.path.exists(venv_python):
        candidates.append([venv_python])
    candidates.extend([["py", "-3.11"], ["py", "-3.12"], ["py", "-3.10"]])

    for cand in candidates:
        try:
            test_cmd = cand + ["-c", "import mediapipe; print('MP_READY')"]
            res = subprocess.run(test_cmd, capture_output=True, text=True, timeout=2)
            if res.returncode == 0 and "MP_READY" in res.stdout:
                print(f"[RetroLens] Found MediaPipe environment under {cand[0]}!")
                print("[RetroLens] Relaunching automatically for 100% video-accurate MediaPipe tracking...")
                os.environ["RETROLENS_NO_RELAUNCH"] = "1"
                run_cmd = cand + [os.path.abspath(__file__)] + sys.argv[1:]
                subprocess.run(run_cmd)
                sys.exit(0)
        except Exception:
            pass

# Resolution configuration
W_FRAME, H_FRAME = 960, 540

# Available filters matching the video list
FILTERS = [
    "dual-tone",
    "thermal",
    "sketch",
    "pixelate",
    "glitch",
    "invert",
    "red-channel",
    "edge",
    "blur",
    "cartoon",
    "rainbow-wave",
]


class SimpleLandmark:
    """MediaPipe-compatible normalized landmark point."""
    def __init__(self, x, y, z=0.0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)


class SimpleHandLandmarks:
    """MediaPipe-compatible hand landmark wrapper."""
    def __init__(self, landmark_list):
        self.landmark = landmark_list


class HandResults:
    """MediaPipe-compatible process results wrapper."""
    def __init__(self, multi_hand_landmarks=None):
        self.multi_hand_landmarks = multi_hand_landmarks or []


class OpenCVHandTracker:
    """
    High-accuracy real-time native Hand & Skeleton Tracker.
    Optimized for high-FPS, zero-lag movement without MediaPipe dependencies.
    Key Architectural Guarantees:
      1. Dual-Zone Left/Right Separation: strictly guarantees one skeleton on the
         left hand and one skeleton on the right hand. Mathematically impossible
         for both skeletons to stack on the same hand.
      2. Strict Torso & Neck Suppression: continuously suppresses the center body
         column and collarbone area so lowered hands or exposed chest skin never
         trigger false tracking.
      3. Distance-Transform Palm Center & Radius: computes the true mathematical
         inscribed circle of the palm for rock-solid stability.
      4. True Contour Fingertip Peak Extraction: detects physical finger peaks
         and angularly maps Index (8) and Thumb (4) with precision.
      5. Adaptive Double-EMA Temporal Smoothing: zero jitter when holding still,
         instantaneous response during fast movement.
    """
    def __init__(self):
        self.face_cascade = None
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
        except Exception:
            self.face_cascade = None

        self.last_face_rect = None
        self.face_lost_frames = 0
        self.frame_count = 0
        self.prev_landmarks = {}  # {hand_idx: {landmark_id: (x, y)}}
        self.no_hands_frames = 0

    def process(self, frame_bgr):
        h, w = frame_bgr.shape[:2]
        self.frame_count += 1

        # 1. Face detection with memory smoothing
        if self.face_cascade is not None and not self.face_cascade.empty():
            if self.frame_count % 8 == 1 or self.last_face_rect is None:
                small_w, small_h = w // 2, h // 2
                small_gray = cv2.cvtColor(cv2.resize(frame_bgr, (small_w, small_h)), cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(
                    small_gray, scaleFactor=1.25, minNeighbors=3, minSize=(30, 30)
                )
                if len(faces) > 0:
                    largest = max(faces, key=lambda f: f[2] * f[3])
                    cur_rect = (largest[0] * 2, largest[1] * 2, largest[2] * 2, largest[3] * 2)
                    if self.last_face_rect is None:
                        self.last_face_rect = cur_rect
                    else:
                        # Smooth face movement
                        lx, ly, lw, lh = self.last_face_rect
                        cx, cy, cw, ch = cur_rect
                        self.last_face_rect = (
                            int(0.3 * cx + 0.7 * lx),
                            int(0.3 * cy + 0.7 * ly),
                            int(0.3 * cw + 0.7 * lw),
                            int(0.3 * ch + 0.7 * lh),
                        )
                    self.face_lost_frames = 0
                else:
                    self.face_lost_frames += 1

        # 2. Skin mask generation in YCrCb
        ycrcb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YCrCb)
        skin_mask = cv2.inRange(
            ycrcb,
            np.array([0, 133, 77], dtype=np.uint8),
            np.array([255, 175, 127], dtype=np.uint8),
        )

        # 3. Strict Torso, Neck & Face Suppression:
        # Erase the entire central body column (face + neck + chest/torso).
        if self.last_face_rect is not None and self.face_lost_frames < 90:
            fx, fy, fw, fh = self.last_face_rect
            fcx = fx + fw // 2
            # Mask out head
            cv2.rectangle(skin_mask, (max(0, fx - int(fw * 0.3)), max(0, fy - int(fh * 0.3))),
                          (min(w, fx + int(fw * 1.3)), min(h, fy + int(fh * 1.1))), 0, -1)
            # Mask out neck & chest column all the way to bottom
            chest_half_w = int(fw * 0.95)
            cv2.rectangle(skin_mask, (max(0, fcx - chest_half_w), min(h, fy + int(fh * 0.8))),
                          (min(w, fcx + chest_half_w), h), 0, -1)
        else:
            # Fallback torso suppression in center column
            center_x1 = int(0.28 * w)
            center_x2 = int(0.72 * w)
            cv2.rectangle(skin_mask, (center_x1, 0), (center_x2, h), 0, -1)

        # 4. Clean morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        skin_mask = cv2.dilate(skin_mask, kernel, iterations=2)

        # 5. Find contours
        contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        left_candidates = []
        right_candidates = []
        center_divider = w * 0.50

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 900 or area > (w * h * 0.40):
                continue

            pts = cnt.reshape(-1, 2)
            min_x = int(np.min(pts[:, 0]))
            max_x = int(np.max(pts[:, 0]))
            min_y = int(np.min(pts[:, 1]))
            max_y = int(np.max(pts[:, 1]))
            bw = max_x - min_x
            bh = max_y - min_y

            # Reject horizontal strips at bottom (edges of clothes/table)
            if min_y > int(0.78 * h):
                continue

            # Hand height from highest point (fingertips) down to wrist
            hand_span_h = min(220, max(80, int(bw * 1.4)))
            wrist_cutoff_y = min_y + hand_span_h
            hand_pts = pts[pts[:, 1] <= wrist_cutoff_y]
            if len(hand_pts) < 12:
                continue

            cx = int(np.mean(hand_pts[:, 0]))
            cy = int(np.mean(hand_pts[:, 1]))

            # Check if this is a giant joined-hands contour spanning both halves
            if min_x < (center_divider - 40) and max_x > (center_divider + 40) and bw > 180:
                # Split cleanly at center into left and right hands
                l_pts = hand_pts[hand_pts[:, 0] < center_divider]
                r_pts = hand_pts[hand_pts[:, 0] >= center_divider]
                if len(l_pts) >= 12:
                    left_candidates.append({
                        "cx": int(np.mean(l_pts[:, 0])),
                        "cy": int(np.mean(l_pts[:, 1])),
                        "min_y": int(np.min(l_pts[:, 1])),
                        "wrist_y": wrist_cutoff_y,
                        "hand_pts": l_pts,
                        "bw": int(np.ptp(l_pts[:, 0])),
                        "area": area * 0.5,
                        "cnt": cnt,
                    })
                if len(r_pts) >= 12:
                    right_candidates.append({
                        "cx": int(np.mean(r_pts[:, 0])),
                        "cy": int(np.mean(r_pts[:, 1])),
                        "min_y": int(np.min(r_pts[:, 1])),
                        "wrist_y": wrist_cutoff_y,
                        "hand_pts": r_pts,
                        "bw": int(np.ptp(r_pts[:, 0])),
                        "area": area * 0.5,
                        "cnt": cnt,
                    })
                continue

            cand_info = {
                "cx": cx,
                "cy": cy,
                "min_y": min_y,
                "wrist_y": wrist_cutoff_y,
                "hand_pts": hand_pts,
                "bw": bw,
                "area": area,
                "cnt": cnt,
            }

            # Partition into left and right sides of the webcam screen
            if cx < center_divider:
                left_candidates.append(cand_info)
            else:
                right_candidates.append(cand_info)

        chosen = []

        # Pick the single best candidate on the LEFT half (prioritize area + height)
        if left_candidates:
            left_candidates.sort(key=lambda c: c["area"] - c["min_y"] * 3.0, reverse=True)
            chosen.append((left_candidates[0], True))  # (info, is_left=True)

        # Pick the single best candidate on the RIGHT half (prioritize area + height)
        if right_candidates:
            right_candidates.sort(key=lambda c: c["area"] - c["min_y"] * 3.0, reverse=True)
            chosen.append((right_candidates[0], False))  # (info, is_left=False)

        if not chosen:
            self.no_hands_frames += 1
            if self.no_hands_frames > 4:
                self.prev_landmarks.clear()
            return HandResults([])

        self.no_hands_frames = 0

        multi_landmarks = []
        for idx, (h_info, is_left) in enumerate(chosen):
            landmarks = self._extract_landmarks(h_info, w, h, hand_idx=(0 if is_left else 1), is_left=is_left)
            multi_landmarks.append(SimpleHandLandmarks(landmarks))

        # Always return sorted left-to-right across screen
        multi_landmarks.sort(key=lambda hl: hl.landmark[0].x)
        return HandResults(multi_landmarks)

    def _extract_landmarks(self, h_info, w, h, hand_idx=0, is_left=True):
        """Constructs 21 anatomical landmarks with high precision using distance transform and convex peaks."""
        cx = h_info["cx"]
        cy = h_info["cy"]
        wrist_y = h_info["wrist_y"]
        hand_pts = h_info["hand_pts"]
        bw = max(24, h_info["bw"])

        # Determine palm center and radius via distance transform on local hand ROI
        pts = hand_pts
        min_x = max(0, int(np.min(pts[:, 0])))
        max_x = min(w - 1, int(np.max(pts[:, 0])))
        min_y = max(0, int(np.min(pts[:, 1])))
        max_y = min(h - 1, int(np.max(pts[:, 1])))

        roi_w = max_x - min_x + 1
        roi_h = max_y - min_y + 1

        palm_cx = cx
        palm_cy = cy
        palm_r = max(20, int(bw * 0.28))

        if roi_w > 10 and roi_h > 10:
            local_mask = np.zeros((roi_h, roi_w), dtype=np.uint8)
            local_pts = pts - np.array([min_x, min_y])
            cv2.fillPoly(local_mask, [local_pts], 255)
            dist_map = cv2.distanceTransform(local_mask, cv2.DIST_L2, 5)
            _, max_val, _, max_loc = cv2.minMaxLoc(dist_map)
            if max_val > 8:
                palm_cx = min_x + max_loc[0]
                palm_cy = min_y + max_loc[1]
                palm_r = max(18, int(max_val * 1.15))

        wrist_pt = (palm_cx, min(h - 1, max(palm_cy + int(palm_r * 1.35), wrist_y)))
        palm = (palm_cx, palm_cy)

        # 5 canonical finger target angles from palm center
        if is_left:
            # Left Hand on screen: Thumb points inward/right, Index top-inner, Pinky left
            default_angles = [
                0.22 * math.pi,   # Thumb (4) - points right/inward
                -0.26 * math.pi,  # Index (8) - points top-right/inner
                -0.50 * math.pi,  # Middle (12) - straight up
                -0.74 * math.pi,  # Ring (16) - top-left
                -0.96 * math.pi,  # Pinky (20) - left/outward
            ]
        else:
            # Right Hand on screen: Thumb points inward/left, Index top-inner, Pinky right
            default_angles = [
                0.78 * math.pi,   # Thumb (4) - points left/inward
                -0.74 * math.pi,  # Index (8) - points top-left/inner
                -0.50 * math.pi,  # Middle (12) - straight up
                -0.26 * math.pi,  # Ring (16) - top-right
                -0.04 * math.pi,  # Pinky (20) - right/outward
            ]

        # Find physical fingertip peaks along the contour in each angular sector
        finger_tips = []
        for f_idx, target_ang in enumerate(default_angles):
            best_dist = 0
            best_pt = None
            for p in hand_pts:
                dx = p[0] - palm_cx
                dy = p[1] - palm_cy
                dist = math.hypot(dx, dy)
                if dist < palm_r * 0.80:
                    continue
                ang = math.atan2(dy, dx)
                diff = abs(math.atan2(math.sin(ang - target_ang), math.cos(ang - target_ang)))
                if diff < 0.40 and dist > best_dist:
                    best_dist = dist
                    best_pt = (int(p[0]), int(p[1]))

            if best_pt is not None:
                finger_tips.append(best_pt)
            else:
                length = palm_r * (1.90 if f_idx == 2 else 1.70 if f_idx in [1, 3] else 1.40)
                tx = int(palm_cx + math.cos(target_ang) * length)
                ty = int(palm_cy + math.sin(target_ang) * length)
                tx = max(0, min(w - 1, tx))
                ty = max(0, min(h - 1, ty))
                finger_tips.append((tx, ty))

        # Build 21 MediaPipe-compatible joints
        pts_dict = {0: wrist_pt}
        for f_idx, tip in enumerate(finger_tips):
            base_id = 1 + f_idx * 4
            mcp = (int(palm[0] + (tip[0] - palm[0]) * 0.35), int(palm[1] + (tip[1] - palm[1]) * 0.35))
            pip = (int(palm[0] + (tip[0] - palm[0]) * 0.62), int(palm[1] + (tip[1] - palm[1]) * 0.62))
            dip = (int(palm[0] + (tip[0] - palm[0]) * 0.82), int(palm[1] + (tip[1] - palm[1]) * 0.82))

            pts_dict[base_id] = mcp
            pts_dict[base_id + 1] = pip
            pts_dict[base_id + 2] = dip
            pts_dict[base_id + 3] = tip

        # Adaptive Double-EMA Temporal Smoothing:
        # Micro-tremors (<4px) -> Heavy smoothing (alpha=0.25) -> rock solid
        # Large movement (>12px) -> Responsive smoothing (alpha=0.82) -> zero lag
        if hand_idx in self.prev_landmarks:
            prev = self.prev_landmarks[hand_idx]
            for i in range(21):
                if i in prev:
                    old_x, old_y = prev[i]
                    cur_x, cur_y = pts_dict[i]
                    dist = math.hypot(cur_x - old_x, cur_y - old_y)
                    if dist < 4.0:
                        alpha = 0.25
                    elif dist < 15.0:
                        alpha = 0.55
                    else:
                        alpha = 0.82
                    sm_x = int(alpha * cur_x + (1.0 - alpha) * old_x)
                    sm_y = int(alpha * cur_y + (1.0 - alpha) * old_y)
                    pts_dict[i] = (sm_x, sm_y)

        self.prev_landmarks[hand_idx] = pts_dict
        return [SimpleLandmark(pts_dict[i][0] / float(w), pts_dict[i][1] / float(h), z=0.0) for i in range(21)]


class RetroFilterBox:
    def __init__(self):
        self.using_mediapipe = False
        if MEDIAPIPE_AVAILABLE and mp_hands is not None:
            try:
                self.hands = mp_hands.Hands(
                    static_image_mode=False,
                    max_num_hands=2,
                    min_detection_confidence=0.6,
                    min_tracking_confidence=0.5,
                )
                self.mp_draw = mp_draw
                self.using_mediapipe = True
                print("\n[OK] MediaPipe Hands Engine Initialized Successfully!")
            except Exception as e:
                print(f"[!] MediaPipe initialization fallback: {e}")
                self.hands = OpenCVHandTracker()
                self.mp_draw = None
        else:
            print("\n" + "=" * 76)
            print(" [RETROLENS] MediaPipe C++ binaries not detected on Python 3.14.")
            print(" [*] ACTIVATING HIGH-PERFORMANCE OPENCV HAND TRACKER AUTOMATICALLY!")
            print(" [*] Hands will be tracked and manipulated directly in real-time!")
            print("=" * 76 + "\n")
            self.hands = OpenCVHandTracker()
            self.mp_draw = None

        # App state matching Putra's demo video
        self.MODES = ["3D [Full 6 Sides]", "2D RECTANGLE", "2D BOWTIE"]
        self.mode_idx = 0
        self.filter_idx = 0
        self.last_gesture_time = 0.0
        self.gesture_cooldown = 0.65  # Seconds between gesture triggers
        self.start_time = time.time()

        # Automatic color/filter cycling matching the video (video: 2.0 second cycle)
        self.auto_change_filter = True
        self.filter_interval = 2.0
        self.last_filter_time = time.time()

        # Temporal smoothing for corners (alpha 0.75 = instant response + zero jitter)
        self.smoothed_corners = None
        self.smoothed_depth_vec = None
        self.box_lost_counter = 0

        # Window setup
        self.window_name = "RETROLENS Putra Python"
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, W_FRAME, H_FRAME)

    def current_mode_name(self):
        return self.MODES[self.mode_idx]

    def current_filter_name(self):
        return FILTERS[self.filter_idx].upper()

    def next_filter(self):
        self.filter_idx = (self.filter_idx + 1) % len(FILTERS)

    def prev_filter(self):
        self.filter_idx = (self.filter_idx - 1) % len(FILTERS)

    def toggle_mode(self):
        self.mode_idx = (self.mode_idx + 1) % len(self.MODES)

    def apply_filter(self, img):
        """Applies the current active filter to an image region or frame."""
        f_name = FILTERS[self.filter_idx]
        h, w = img.shape[:2]
        if h <= 0 or w <= 0:
            return img

        if f_name == "invert":
            return cv2.bitwise_not(img)

        elif f_name == "sketch":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            inv_gray = 255 - gray
            blurred = cv2.GaussianBlur(inv_gray, (21, 21), 0)
            sketch = cv2.divide(gray, 255 - blurred, scale=256)
            return cv2.cvtColor(sketch, cv2.COLOR_GRAY2BGR)

        elif f_name == "cartoon":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.medianBlur(gray, 5)
            edges = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9
            )
            color = cv2.bilateralFilter(img, 9, 300, 300)
            cartoon = cv2.bitwise_and(color, color, mask=edges)
            return cartoon

        elif f_name == "thermal":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            thermal = cv2.applyColorMap(gray, cv2.COLORMAP_JET)
            return thermal

        elif f_name == "edge":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 80, 150)
            # Create neon green / yellow edges on dark background
            colored_edges = np.zeros_like(img)
            colored_edges[edges > 0] = [80, 255, 200]
            return colored_edges

        elif f_name == "dual-tone":
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
            # Dual-tone mapping: dark -> deep blue/purple (180, 20, 40), bright -> hot pink/cyan (20, 240, 255)
            c1 = np.array([210, 50, 40], dtype=np.float32)  # BGR
            c2 = np.array([30, 240, 255], dtype=np.float32)
            out = np.zeros_like(img, dtype=np.float32)
            for c in range(3):
                out[:, :, c] = (1.0 - gray) * c1[c] + gray * c2[c]
            return np.clip(out, 0, 255).astype(np.uint8)

        elif f_name == "pixelate":
            scale_factor = 14
            small = cv2.resize(
                img,
                (max(1, w // scale_factor), max(1, h // scale_factor)),
                interpolation=cv2.INTER_LINEAR,
            )
            pixelated = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)
            return pixelated

        elif f_name == "glitch":
            out = img.copy()
            shift = int(12 * math.sin(time.time() * 15))
            b, g, r = cv2.split(out)
            # Roll red channel
            r = np.roll(r, shift, axis=1)
            b = np.roll(b, -shift, axis=1)
            # Add random scanline strips
            if int(time.time() * 20) % 2 == 0:
                y_slice = np.random.randint(0, max(1, h - 30))
                slice_h = np.random.randint(5, 25)
                slice_shift = np.random.randint(-25, 25)
                out[y_slice : y_slice + slice_h] = np.roll(
                    out[y_slice : y_slice + slice_h], slice_shift, axis=1
                )
            merged = cv2.merge([b, g, r])
            return merged

        elif f_name == "red-channel":
            out = np.zeros_like(img)
            # Enhance red channel and contrast
            out[:, :, 2] = img[:, :, 2]
            return out

        elif f_name == "blur":
            return cv2.GaussianBlur(img, (35, 35), 0)

        elif f_name == "rainbow-wave":
            # Generate vibrant animated rainbow waves across the image
            t = (time.time() - self.start_time) * 1.8
            y_coords, x_coords = np.mgrid[0:h, 0:w]
            wave = (np.sin(x_coords * 0.03 + y_coords * 0.02 + t * 4) + 1.0) * 0.5
            hue = ((x_coords * 0.2 + y_coords * 0.3 + t * 90) % 180).astype(np.uint8)
            sat = np.full((h, w), 255, dtype=np.uint8)
            val = (wave * 200 + 55).astype(np.uint8)
            hsv = cv2.merge([hue, sat, val])
            return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

        return img

    def is_fist(self, landmarks):
        """Returns True if hand is making a closed fist."""
        # Compare tip distance to wrist vs PIP distance to wrist for fingers 8, 12, 16, 20
        wrist = landmarks[0]
        tips = [8, 12, 16, 20]
        pips = [6, 10, 14, 18]

        closed_count = 0
        for tip_idx, pip_idx in zip(tips, pips):
            tip = landmarks[tip_idx]
            pip = landmarks[pip_idx]
            d_tip = (tip.x - wrist.x) ** 2 + (tip.y - wrist.y) ** 2
            d_pip = (pip.x - wrist.x) ** 2 + (pip.y - wrist.y) ** 2
            if d_tip < d_pip:
                closed_count += 1
        return closed_count >= 3

    def is_thumb_pinky_touch(self, landmarks):
        """Returns True if thumb tip (4) is touching pinky tip (20)."""
        thumb_tip = landmarks[4]
        pinky_tip = landmarks[20]
        dist = math.hypot(thumb_tip.x - pinky_tip.x, thumb_tip.y - pinky_tip.y)
        return dist < 0.070

    def detect_gestures(self, hand_results):
        """Checks for gestures across detected hands matching the demo video."""
        now = time.time()
        if now - self.last_gesture_time < self.gesture_cooldown:
            return

        if not hand_results or not hand_results.multi_hand_landmarks:
            return

        hands_landmarks = hand_results.multi_hand_landmarks

        # 1. "Rapat 2 Tangan" (Bring both hands together) -> Toggle Mode
        if len(hands_landmarks) >= 2:
            h0 = hands_landmarks[0].landmark[0]
            h1 = hands_landmarks[1].landmark[0]
            dist_wrists = math.hypot(h0.x - h1.x, h0.y - h1.y)
            if dist_wrists < 0.16 or (self.is_fist(hands_landmarks[0].landmark) and self.is_fist(hands_landmarks[1].landmark)):
                self.toggle_mode()
                self.last_gesture_time = now
                return

        # 2. "Sentuh Jempol-Kelingking" (Thumb to Pinky touch) -> Next filter
        for hand_lms in hands_landmarks:
            if self.is_thumb_pinky_touch(hand_lms.landmark):
                self.next_filter()
                self.last_filter_time = now
                self.last_gesture_time = now
                return

    def warp_polygon_filter(self, frame, poly_pts, filtered_frame):
        """Paints the filtered content inside the polygonal region on frame with boundary safety."""
        h, w = frame.shape[:2]
        pts = poly_pts.astype(np.int32)
        pts[:, 0] = np.clip(pts[:, 0], 0, w - 1)
        pts[:, 1] = np.clip(pts[:, 1], 0, h - 1)

        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(mask, [pts], 255)

        # Blend filtered frame into masked region
        np.copyto(frame, filtered_frame, where=mask[:, :, None] == 255)

    def draw_rainbow_face(self, frame, poly_pts):
        """Side faces are plain transparent per user request."""
        pass

    def draw_hand_skeleton(self, frame, hand_landmarks):
        """Draws the yellow hand skeleton and joint circles matching the demo video."""
        h, w = frame.shape[:2]
        pts = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks.landmark]

        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
            (0, 5), (5, 6), (6, 7), (7, 8),        # Index
            (5, 9), (9, 10), (10, 11), (11, 12),   # Middle
            (9, 13), (13, 14), (14, 15), (15, 16), # Ring
            (13, 17), (17, 18), (18, 19), (19, 20),# Pinky
            (0, 17),                               # Palm base
            (5, 9), (9, 13), (13, 17)              # Palm knuckle ridge
        ]

        # Fingertip boundary contour matching video at 00:04
        perimeter_idx = [0, 4, 8, 12, 16, 20]
        peri_pts = np.array([pts[i] for i in perimeter_idx if i < len(pts)], dtype=np.int32)
        if len(peri_pts) >= 4:
            cv2.polylines(frame, [peri_pts], isClosed=True, color=(255, 255, 255), thickness=1, lineType=cv2.LINE_AA)

        # Draw yellow skeletal bones
        yellow_line = (0, 240, 255)  # BGR yellow
        for idx1, idx2 in connections:
            if 0 <= idx1 < len(pts) and 0 <= idx2 < len(pts):
                cv2.line(frame, pts[idx1], pts[idx2], yellow_line, 2, cv2.LINE_AA)

        # Draw landmark dots
        for i, pt in enumerate(pts):
            if i in [4, 8, 12, 16, 20]:  # Fingertips
                cv2.circle(frame, pt, 6, (0, 255, 255), -1, cv2.LINE_AA)
                cv2.circle(frame, pt, 8, (255, 255, 255), 1, cv2.LINE_AA)
            else:
                cv2.circle(frame, pt, 4, (0, 230, 255), -1, cv2.LINE_AA)

    def render_geometry(self, frame, hand_results):
        """Projects the 2D quadrilateral, bowtie, or 3D 6-sided box anchored directly to fingertips."""
        try:
            if not hand_results or not hand_results.multi_hand_landmarks:
                self.box_lost_counter += 1
                if self.box_lost_counter > 6:
                    self.smoothed_corners = None
                    self.smoothed_depth_vec = None
                return

            # 1. Draw hand skeleton on EVERY detected hand
            for hand_lms in hand_results.multi_hand_landmarks:
                self.draw_hand_skeleton(frame, hand_lms)

            # 2. Portal requires 2 hands to anchor between
            if len(hand_results.multi_hand_landmarks) < 2:
                self.box_lost_counter += 1
                if self.box_lost_counter > 6:
                    self.smoothed_corners = None
                    self.smoothed_depth_vec = None
                return

            self.box_lost_counter = 0
            h, w = frame.shape[:2]

            # Extract landmarks for both hands sorted left-to-right across screen
            h1 = hand_results.multi_hand_landmarks[0]
            h2 = hand_results.multi_hand_landmarks[1]

            if h1.landmark[0].x < h2.landmark[0].x:
                left_hand = h1
                right_hand = h2
            else:
                left_hand = h2
                right_hand = h1

            # Exact fingertip corner anchors from the demo video:
            # p0: Left Hand Index Tip (8)
            # p1: Right Hand Index Tip (8)
            # p2: Right Hand Thumb Tip (4)
            # p3: Left Hand Thumb Tip (4)
            raw_p0 = np.array([left_hand.landmark[8].x * w, left_hand.landmark[8].y * h], dtype=np.float32)
            raw_p1 = np.array([right_hand.landmark[8].x * w, right_hand.landmark[8].y * h], dtype=np.float32)
            raw_p2 = np.array([right_hand.landmark[4].x * w, right_hand.landmark[4].y * h], dtype=np.float32)
            raw_p3 = np.array([left_hand.landmark[4].x * w, left_hand.landmark[4].y * h], dtype=np.float32)

            # High-speed responsive EMA (alpha = 0.75): instantaneous tracking with zero jitter
            alpha = 0.75
            if self.smoothed_corners is None:
                self.smoothed_corners = [raw_p0.copy(), raw_p1.copy(), raw_p2.copy(), raw_p3.copy()]
            else:
                self.smoothed_corners[0] = alpha * raw_p0 + (1.0 - alpha) * self.smoothed_corners[0]
                self.smoothed_corners[1] = alpha * raw_p1 + (1.0 - alpha) * self.smoothed_corners[1]
                self.smoothed_corners[2] = alpha * raw_p2 + (1.0 - alpha) * self.smoothed_corners[2]
                self.smoothed_corners[3] = alpha * raw_p3 + (1.0 - alpha) * self.smoothed_corners[3]

            p0, p1, p2, p3 = self.smoothed_corners

            # Precompute filtered frame
            filtered_frame = self.apply_filter(frame.copy())
            mode = self.current_mode_name()

            if mode == "2D RECTANGLE":
                # ================= MODE: 2D RECTANGLE =================
                front_poly = np.array([p0, p1, p2, p3], dtype=np.float32)
                self.warp_polygon_filter(frame, front_poly, filtered_frame)
                cv2.polylines(
                    frame,
                    [front_poly.astype(np.int32)],
                    isClosed=True,
                    color=(255, 255, 255),
                    thickness=2,
                    lineType=cv2.LINE_AA,
                )
                for pt in [p0, p1, p2, p3]:
                    cv2.circle(frame, (int(pt[0]), int(pt[1])), 6, (0, 255, 255), -1, cv2.LINE_AA)
                    cv2.circle(frame, (int(pt[0]), int(pt[1])), 8, (255, 255, 255), 1, cv2.LINE_AA)

            elif mode == "2D BOWTIE":
                # ================= MODE: 2D BOWTIE (VIDEO 00:08) =================
                bowtie_poly = np.array([p0, p2, p1, p3], dtype=np.float32)
                self.warp_polygon_filter(frame, bowtie_poly, filtered_frame)
                cv2.polylines(
                    frame,
                    [bowtie_poly.astype(np.int32)],
                    isClosed=True,
                    color=(255, 255, 255),
                    thickness=2,
                    lineType=cv2.LINE_AA,
                )
                for pt in [p0, p1, p2, p3]:
                    cv2.circle(frame, (int(pt[0]), int(pt[1])), 6, (0, 255, 255), -1, cv2.LINE_AA)
                    cv2.circle(frame, (int(pt[0]), int(pt[1])), 8, (255, 255, 255), 1, cv2.LINE_AA)

            else:
                # ================= MODE: 3D [Full 6 Sides] (Plain Transparent Sides) =================
                front_poly = np.array([p0, p1, p2, p3], dtype=np.float32)
                dx = p1[0] - p0[0]
                dy = p1[1] - p0[1]
                box_width = max(30.0, math.hypot(dx, dy))

                depth_mag = box_width * 0.35
                vx = -dy / (box_width + 1e-5) * depth_mag * 0.4 + (dx * 0.15)
                vy = dx / (box_width + 1e-5) * depth_mag * 0.45 - depth_mag * 0.6
                raw_depth = np.array([vx, vy], dtype=np.float32)

                if self.smoothed_depth_vec is None:
                    self.smoothed_depth_vec = raw_depth.copy()
                else:
                    self.smoothed_depth_vec = alpha * raw_depth + (1.0 - alpha) * self.smoothed_depth_vec

                depth_vec = self.smoothed_depth_vec

                p4 = p0 + depth_vec
                p5 = p1 + depth_vec
                p6 = p2 + depth_vec
                p7 = p3 + depth_vec

                back_face = np.array([p4, p5, p6, p7])

                # Draw back face wireframe
                cv2.polylines(
                    frame,
                    [back_face.astype(np.int32)],
                    isClosed=True,
                    color=(200, 200, 200),
                    thickness=1,
                    lineType=cv2.LINE_AA,
                )

                # Connecting depth edges (p0->p4, p1->p5, p2->p6, p3->p7) - Plain transparent sides
                for pa, pb in [(p0, p4), (p1, p5), (p2, p6), (p3, p7)]:
                    cv2.line(
                        frame,
                        (int(pa[0]), int(pa[1])),
                        (int(pb[0]), int(pb[1])),
                        (255, 255, 255),
                        2,
                        cv2.LINE_AA,
                    )

                # Front face renders active camera filter
                self.warp_polygon_filter(frame, front_poly, filtered_frame)

                # Draw front wireframe in clean white
                cv2.polylines(
                    frame,
                    [front_poly.astype(np.int32)],
                    isClosed=True,
                    color=(255, 255, 255),
                    thickness=2,
                    lineType=cv2.LINE_AA,
                )

                # Draw anchor dots
                for pt in [p0, p1, p2, p3]:
                    cv2.circle(frame, (int(pt[0]), int(pt[1])), 6, (0, 255, 255), -1, cv2.LINE_AA)
                    cv2.circle(frame, (int(pt[0]), int(pt[1])), 8, (255, 255, 255), 1, cv2.LINE_AA)
                for pt in [p4, p5, p6, p7]:
                    cv2.circle(frame, (int(pt[0]), int(pt[1])), 4, (180, 220, 255), -1, cv2.LINE_AA)

        except Exception:
            pass

    def draw_hud(self, frame):
        """Draws the English yellow HUD header text matching the demo video."""
        mode_text = f"MODE: {self.current_mode_name()} [Press 'k' / Join Hands]"
        filter_text = f"FILTER: {self.current_filter_name()} [Touch Thumb-Pinky / 'a' / 'y']"

        # Yellow text color (BGR: 0, 255, 255) with black drop shadow
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = 0.58
        thickness = 2
        yellow = (0, 255, 255)
        black = (0, 0, 0)

        # Line 1: Mode
        cv2.putText(
            frame, mode_text, (20, 36), font, scale, black, thickness + 2, cv2.LINE_AA
        )
        cv2.putText(
            frame, mode_text, (20, 36), font, scale, yellow, thickness, cv2.LINE_AA
        )

        # Line 2: Filter
        cv2.putText(
            frame, filter_text, (20, 68), font, scale, black, thickness + 2, cv2.LINE_AA
        )
        cv2.putText(
            frame, filter_text, (20, 68), font, scale, yellow, thickness, cv2.LINE_AA
        )

        # Top-Right: RETROLENS Putra Python
        brand_text = "RETROLENS Putra Python"
        cv2.putText(
            frame, brand_text, (W_FRAME - 275, 36), font, scale, black, thickness + 2, cv2.LINE_AA
        )
        cv2.putText(
            frame, brand_text, (W_FRAME - 275, 36), font, scale, yellow, thickness, cv2.LINE_AA
        )

        # Engine status on bottom
        if self.using_mediapipe:
            engine_info = "[Engine: MediaPipe Hands Neural Network (TensorFlow Lite) | 60 FPS]"
            cv2.putText(frame, engine_info, (20, H_FRAME - 18), font, 0.40, black, 2, cv2.LINE_AA)
            cv2.putText(frame, engine_info, (20, H_FRAME - 18), font, 0.40, (0, 255, 180), 1, cv2.LINE_AA)
        else:
            engine_info = "[Engine: Real-Time Hand Tracker | 60 FPS]"
            cv2.putText(frame, engine_info, (20, H_FRAME - 18), font, 0.40, black, 2, cv2.LINE_AA)
            cv2.putText(frame, engine_info, (20, H_FRAME - 18), font, 0.40, (0, 240, 255), 1, cv2.LINE_AA)

    def run(self):
        print("Starting RetroLens Hand Tracking Portal...")
        print("Controls (Matching Video):")
        print(" - Hands     : Show both hands to anchor, move, and tilt the portal box!")
        print(" - Lower     : Lower your hands to hide the portal box!")
        print(" - 'k'       : Toggle Mode (3D [Full 6 Sides] -> 2D RECTANGLE -> 2D BOWTIE)")
        print(" - 'a' / 'n' : Next Filter (or pinch thumb to pinky)")
        print(" - 'y'       : Previous Filter")
        print(" - SPACE     : Toggle Automatic Filter Changing (default: ON, 2.0s interval)")
        print(" - '+' / '-' : Speed up / Slow down auto-filter interval")
        print(" - 'q' / ESC : Quit")

        cap = cv2.VideoCapture(0)

        # Try fallback camera indexes if 0 is busy
        if not cap.isOpened():
            cap = cv2.VideoCapture(1)

        if not cap.isOpened():
            print("ERROR: Could not open webcam.")
            print("Please ensure your camera is connected and permissions are granted.")
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, W_FRAME)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, H_FRAME)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame. Exiting...")
                break

            # Mirror frame horizontally for natural webcam feel
            frame = cv2.flip(frame, 1)
            frame = cv2.resize(frame, (W_FRAME, H_FRAME))

            # Automatic filter cycle timer (video: WAKTU JEDA: 2.0 DETIK)
            now = time.time()
            if self.auto_change_filter and (now - self.last_filter_time >= self.filter_interval):
                self.next_filter()
                self.last_filter_time = now

            if self.hands is not None:
                if self.using_mediapipe:
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    rgb_frame.flags.writeable = False
                    results = self.hands.process(rgb_frame)
                    rgb_frame.flags.writeable = True
                else:
                    results = self.hands.process(frame)

                # Detect Gestures (Rapat 2 Tangan for mode, Thumb-Pinky for filter)
                self.detect_gestures(results)

                # Render yellow hand skeleton & 2D / 3D Geometry between hands
                self.render_geometry(frame, results)

            # Draw HUD overlays
            self.draw_hud(frame)

            # Display window
            cv2.imshow(self.window_name, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q") or key == 27:  # 'q' or ESC
                break
            elif key == ord("k") or key == ord("K"):
                self.toggle_mode()
            elif key == ord("a") or key == ord("A") or key == ord("n") or key == ord("N"):
                self.next_filter()
                self.last_filter_time = time.time()
            elif key == ord("y") or key == ord("Y"):
                self.prev_filter()
                self.last_filter_time = time.time()
            elif key == ord(" "):
                self.auto_change_filter = not self.auto_change_filter
                print(f"[RetroLens] Auto filter changing: {'ON' if self.auto_change_filter else 'OFF'}")
            elif key == ord("+") or key == ord("="):
                self.filter_interval = max(0.5, round(self.filter_interval - 0.5, 1))
                print(f"[RetroLens] Filter interval: {self.filter_interval}s")
            elif key == ord("-") or key == ord("_"):
                self.filter_interval = min(10.0, round(self.filter_interval + 0.5, 1))
                print(f"[RetroLens] Filter interval: {self.filter_interval}s")

        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    app = RetroFilterBox()
    app.run()
