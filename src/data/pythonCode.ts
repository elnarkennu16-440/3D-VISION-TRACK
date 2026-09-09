export const PYTHON_3D_SCRIPT = `#!/usr/bin/env python3
"""
RETROLENS Putra Python - 2D & 3D Interactive Hand Tracking Portal
Based on MediaPipe Hands & OpenCV
Real-time hand tracking with multi-angle 3D prism / 2D portal perspective and 12 visual filters.

Controls:
  - Toggle 2D / 3D Mode: Press 'k' OR bring both hands close together ('Rapat 2 Tangan')
  - Cycle Filters: Press 'y' (next) / 'b' (prev) OR touch Thumb to Pinky ('Sentuh Jempol-Kelingking')
  - Take Snapshot: Press 's'
  - Toggle Mirror: Press 'm'
  - Quit: Press 'q' or ESC
"""

import cv2
import mediapipe as mp
import numpy as np
import time
import math
import sys
import os

# -------------------------------------------------------------
# Configuration & Constants
# -------------------------------------------------------------
FRAME_W = 960
FRAME_H = 540

FILTER_NAMES = [
    "normal",
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
    "dual-tone"
]

# MediaPipe Setup
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils
mp_draw_styles = mp.solutions.drawing_styles

# -------------------------------------------------------------
# Filter Implementations
# -------------------------------------------------------------
def apply_filter(img, filter_name, tick=0):
    """Apply the selected visual filter to an image frame."""
    h, w = img.shape[:2]
    
    if filter_name == "normal":
        return img.copy()

    elif filter_name == "thermal":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        thermal = cv2.applyColorMap(gray, cv2.COLORMAP_JET)
        return thermal

    elif filter_name == "sketch":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        inv = 255 - gray
        blur = cv2.GaussianBlur(inv, (21, 21), 0)
        sketch = cv2.divide(gray, 255 - blur, scale=256)
        return cv2.cvtColor(sketch, cv2.COLOR_GRAY2BGR)

    elif filter_name == "pixelate":
        pixel_size = 14
        small = cv2.resize(img, (max(1, w // pixel_size), max(1, h // pixel_size)), interpolation=cv2.INTER_LINEAR)
        return cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)

    elif filter_name == "glitch":
        out = img.copy()
        shift = int(12 * math.sin(tick * 0.15)) + 8
        b, g, r = cv2.split(out)
        b_shifted = np.roll(b, shift, axis=1)
        r_shifted = np.roll(r, -shift, axis=1)
        merged = cv2.merge([b_shifted, g, r_shifted])
        scanlines = np.zeros_like(merged)
        scanlines[::4, :] = 25
        return cv2.subtract(merged, scanlines)

    elif filter_name == "invert":
        return cv2.bitwise_not(img)

    elif filter_name == "red-channel":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        out = np.zeros_like(img)
        out[:, :, 2] = cv2.equalizeHist(gray)
        out[:, :, 0] = cv2.addWeighted(gray, 0.15, 0, 0, 0)
        return out

    elif filter_name == "edge":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 60, 150)
        edges_col = np.zeros_like(img)
        edges_col[edges > 0] = [80, 240, 255]
        return edges_col

    elif filter_name == "blur":
        return cv2.GaussianBlur(img, (35, 35), 0)

    elif filter_name == "cartoon":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray_blur = cv2.medianBlur(gray, 5)
        edges = cv2.adaptiveThreshold(gray_blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
        color = cv2.bilateralFilter(img, 9, 250, 250)
        edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        return cv2.bitwise_and(color, edges_bgr)

    elif filter_name == "rainbow-wave":
        y_indices, x_indices = np.indices((h, w))
        wave = ((x_indices + y_indices * 1.5 + tick * 14) % 180).astype(np.uint8)
        hsv = np.zeros((h, w, 3), dtype=np.uint8)
        hsv[:, :, 0] = wave
        hsv[:, :, 1] = 230
        hsv[:, :, 2] = 255
        rainbow = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        return cv2.addWeighted(img, 0.35, rainbow, 0.65, 0)

    elif filter_name == "dual-tone":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        norm = gray.astype(np.float32) / 255.0
        b = (norm * 255 + (1 - norm) * 40).astype(np.uint8)
        g = (norm * 180 + (1 - norm) * 10).astype(np.uint8)
        r = (norm * 40 + (1 - norm) * 240).astype(np.uint8)
        return cv2.merge([b, g, r])

    return img


def get_rainbow_texture(width=300, height=300, tick=0):
    """Generates diagonal rainbow stripes for 3D prism sides."""
    y_idx, x_idx = np.indices((height, width))
    hue = ((x_idx * 1.2 + y_idx * 1.2 + tick * 8) % 180).astype(np.uint8)
    hsv = np.zeros((height, width, 3), dtype=np.uint8)
    hsv[:, :, 0] = hue
    hsv[:, :, 1] = 240
    hsv[:, :, 2] = 255
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)


def warp_quad_texture(target_canvas, src_texture, dst_quad):
    """Warps src_texture into dst_quad on target_canvas."""
    th, tw = src_texture.shape[:2]
    src_pts = np.array([[0, 0], [tw - 1, 0], [tw - 1, th - 1], [0, th - 1]], dtype=np.float32)
    dst_pts = np.array(dst_quad, dtype=np.float32)
    
    min_x = max(0, int(np.min(dst_pts[:, 0])))
    max_x = min(target_canvas.shape[1], int(np.max(dst_pts[:, 0])) + 1)
    min_y = max(0, int(np.min(dst_pts[:, 1])))
    max_y = min(target_canvas.shape[0], int(np.max(dst_pts[:, 1])) + 1)
    
    if max_x <= min_x or max_y <= min_y:
        return
        
    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(src_texture, M, (target_canvas.shape[1], target_canvas.shape[0]))
    
    mask = np.zeros(target_canvas.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(mask, dst_pts.astype(np.int32), 255)
    mask_3ch = cv2.merge([mask, mask, mask])
    np.copyto(target_canvas, warped, where=(mask_3ch > 0))


class RetroLensApp:
    def __init__(self, camera_id=0):
        self.camera_id = camera_id
        self.cap = cv2.VideoCapture(camera_id)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
        
        self.mode = "3D"  # "3D" or "2D"
        self.filter_idx = 2  # Default to "sketch"
        self.mirror = True
        self.tick = 0
        
        self.last_mode_switch_time = 0.0
        self.last_filter_switch_time = 0.0
        self.gesture_alert = ""
        self.gesture_alert_time = 0.0

        self.prev_time = time.time()
        self.fps = 30.0

        self.hands = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.65,
            min_tracking_confidence=0.65
        )

    def cycle_filter(self, step=1, gesture_name=""):
        self.filter_idx = (self.filter_idx + step) % len(FILTER_NAMES)
        if gesture_name:
            self.gesture_alert = f"TRIGGER: {gesture_name}"
            self.gesture_alert_time = time.time()

    def toggle_mode(self, gesture_name=""):
        self.mode = "2D" if self.mode == "3D" else "3D"
        if gesture_name:
            self.gesture_alert = f"TRIGGER: {gesture_name}"
            self.gesture_alert_time = time.time()

    def check_gestures(self, hand_list, w, h):
        now = time.time()

        # 1. Thumb to Pinky Pinch on either hand
        for hand in hand_list:
            lm = hand["landmarks"]
            p_thumb = np.array([lm[4].x * w, lm[4].y * h])
            p_pinky = np.array([lm[20].x * w, lm[20].y * h])
            dist_pinch = np.linalg.norm(p_thumb - p_pinky)
            
            p_wrist = np.array([lm[0].x * w, lm[0].y * h])
            p_middle_mcp = np.array([lm[9].x * w, lm[9].y * h])
            hand_scale = max(30.0, np.linalg.norm(p_wrist - p_middle_mcp))

            if dist_pinch < (hand_scale * 0.42):
                if now - self.last_filter_switch_time > 0.65:
                    self.last_filter_switch_time = now
                    self.cycle_filter(1, "Sentuh Jempol-Kelingking")
                    break

        # 2. Rapat 2 Tangan (Two hands close together)
        if len(hand_list) >= 2:
            h1 = hand_list[0]["landmarks"]
            h2 = hand_list[1]["landmarks"]
            d_index = np.linalg.norm(
                np.array([h1[8].x * w, h1[8].y * h]) - np.array([h2[8].x * w, h2[8].y * h])
            )
            d_wrist = np.linalg.norm(
                np.array([h1[0].x * w, h1[0].y * h]) - np.array([h2[0].x * w, h2[0].y * h])
            )
            
            if d_index < 75 or d_wrist < 90:
                if now - self.last_mode_switch_time > 1.2:
                    self.last_mode_switch_time = now
                    self.toggle_mode("Rapat 2 Tangan")

    def draw_hud(self, frame):
        h, w = frame.shape[:2]
        title_text = "RETROLENS Putra Python"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.58
        thickness = 2
        (tw, th), _ = cv2.getTextSize(title_text, font, font_scale, thickness)
        tx = (w - tw) // 2
        ty = 28

        overlay = frame.copy()
        cv2.rectangle(overlay, (tx - 18, 8), (tx + tw + 18, 38), (15, 15, 20), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)
        cv2.putText(frame, title_text, (tx, ty), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

        if self.mode == "3D":
            mode_str = "MODE: 3D (Full 6 Sisi) [Tekan 'k' / Rapat 2 Tangan]"
        else:
            mode_str = "MODE: PERSEGI 2D [Tekan 'k' / Rapat 2 Tangan]"

        filter_curr = FILTER_NAMES[self.filter_idx].upper()
        filter_str = f"FILTER: {filter_curr} [Sentuh Jempol-Kelingking / 'b' / 'y']"

        cv2.putText(frame, mode_str, (18, 55), font, 0.48, (0, 230, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, filter_str, (18, 76), font, 0.48, (0, 230, 255), 1, cv2.LINE_AA)

        fps_str = f"FPS: {int(self.fps)} | 2 Hands Required"
        cv2.putText(frame, fps_str, (18, h - 18), font, 0.42, (180, 180, 180), 1, cv2.LINE_AA)

        if time.time() - self.gesture_alert_time < 1.0:
            glow_y = 104
            cv2.putText(frame, f">> {self.gesture_alert}", (18, glow_y), font, 0.52, (50, 255, 120), 2, cv2.LINE_AA)

    def draw_custom_landmarks(self, frame, hand_landmarks, w, h):
        connections = mp_hands.HAND_CONNECTIONS
        coords = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks.landmark]

        for start_idx, end_idx in connections:
            pt1 = coords[start_idx]
            pt2 = coords[end_idx]
            cv2.line(frame, pt1, pt2, (200, 200, 200), 1, cv2.LINE_AA)

        fingertips = {4, 8, 12, 16, 20}
        for idx, pt in enumerate(coords):
            if idx in fingertips:
                cv2.circle(frame, pt, 5, (0, 215, 255), -1, cv2.LINE_AA)
                cv2.circle(frame, pt, 7, (255, 255, 255), 1, cv2.LINE_AA)
            else:
                cv2.circle(frame, pt, 3, (255, 180, 50), -1, cv2.LINE_AA)

    def run(self):
        print("=" * 60)
        print("   RETROLENS Putra Python - Starting Hand Tracking Camera")
        print("=" * 60)

        while self.cap.isOpened():
            success, raw_frame = self.cap.read()
            if not success:
                time.sleep(0.1)
                continue

            self.tick += 1
            raw_frame = cv2.resize(raw_frame, (FRAME_W, FRAME_H))
            if self.mirror:
                raw_frame = cv2.flip(raw_frame, 1)

            h, w = raw_frame.shape[:2]
            display_frame = raw_frame.copy()

            current_filter = FILTER_NAMES[self.filter_idx]
            filtered_frame = apply_filter(raw_frame, current_filter, self.tick)

            rgb_frame = cv2.cvtColor(raw_frame, cv2.COLOR_BGR2RGB)
            results = self.hands.process(rgb_frame)

            hands_data = []
            if results.multi_hand_landmarks:
                for idx, hand_lms in enumerate(results.multi_hand_landmarks):
                    avg_x = sum([lm.x for lm in hand_lms.landmark]) / len(hand_lms.landmark)
                    hands_data.append({
                        "landmarks": hand_lms.landmark,
                        "raw_lms": hand_lms,
                        "avg_x": avg_x
                    })
                    self.draw_custom_landmarks(display_frame, hand_lms, w, h)

                self.check_gestures(hands_data, w, h)

            if len(hands_data) >= 2:
                hands_data.sort(key=lambda item: item["avg_x"])
                left_lms = hands_data[0]["landmarks"]
                right_lms = hands_data[1]["landmarks"]

                tl_f = np.array([int(left_lms[8].x * w), int(left_lms[8].y * h)])
                bl_f = np.array([int(left_lms[0].x * w), int(left_lms[0].y * h)])
                tr_f = np.array([int(right_lms[8].x * w), int(right_lms[8].y * h)])
                br_f = np.array([int(right_lms[0].x * w), int(right_lms[0].y * h)])

                z_left = left_lms[8].z
                z_right = right_lms[8].z
                dz = (z_right - z_left)

                hand_dist = np.linalg.norm(tl_f - tr_f)
                box_depth = int(hand_dist * 0.42)

                if self.mode == "2D":
                    quad_pts = np.array([tl_f, tr_f, br_f, bl_f], dtype=np.int32)
                    mask = np.zeros((h, w), dtype=np.uint8)
                    cv2.fillConvexPoly(mask, quad_pts, 255)
                    mask_3ch = cv2.merge([mask, mask, mask])

                    np.copyto(display_frame, filtered_frame, where=(mask_3ch > 0))
                    cv2.polylines(display_frame, [quad_pts], isClosed=True, color=(255, 255, 255), thickness=2, lineType=cv2.LINE_AA)

                    for pt in [tl_f, tr_f, br_f, bl_f]:
                        cv2.circle(display_frame, tuple(pt), 6, (255, 255, 255), -1, cv2.LINE_AA)
                        cv2.circle(display_frame, tuple(pt), 8, (0, 220, 255), 2, cv2.LINE_AA)

                else:
                    cx, cy = w // 2, h // 2
                    tilt_x = int(dz * 240)
                    offset_x = int((cx - (tl_f[0] + tr_f[0]) // 2) * 0.28) + tilt_x
                    offset_y = int((cy - (tl_f[1] + bl_f[1]) // 2) * 0.28) - int(box_depth * 0.3)

                    persp_scale = 0.78
                    def project_back(pt):
                        rel_x = pt[0] - cx
                        rel_y = pt[1] - cy
                        bx = int(cx + rel_x * persp_scale + offset_x)
                        by = int(cy + rel_y * persp_scale + offset_y)
                        return np.array([bx, by])

                    tl_b = project_back(tl_f)
                    tr_b = project_back(tr_f)
                    br_b = project_back(br_f)
                    bl_b = project_back(bl_f)

                    rainbow_tex = get_rainbow_texture(240, 240, self.tick)

                    side_quads = [
                        [tl_b, tr_b, tr_f, tl_f], # Top
                        [bl_f, br_f, br_b, bl_b], # Bottom
                        [tl_b, tl_f, bl_f, bl_b], # Left
                        [tr_f, tr_b, br_b, br_f], # Right
                    ]

                    for quad in side_quads:
                        warp_quad_texture(display_frame, rainbow_tex, quad)

                    back_pts = np.array([tl_b, tr_b, br_b, bl_b], dtype=np.int32)
                    back_overlay = display_frame.copy()
                    cv2.fillConvexPoly(back_overlay, back_pts, (20, 20, 30))
                    cv2.addWeighted(back_overlay, 0.45, display_frame, 0.55, 0, display_frame)
                    cv2.polylines(display_frame, [back_pts], isClosed=True, color=(160, 160, 180), thickness=2, lineType=cv2.LINE_AA)

                    front_pts = np.array([tl_f, tr_f, br_f, bl_f], dtype=np.int32)
                    front_mask = np.zeros((h, w), dtype=np.uint8)
                    cv2.fillConvexPoly(front_mask, front_pts, 255)
                    mask_3ch = cv2.merge([front_mask, front_mask, front_mask])
                    np.copyto(display_frame, filtered_frame, where=(mask_3ch > 0))

                    cv2.polylines(display_frame, [front_pts], isClosed=True, color=(255, 255, 255), thickness=2, lineType=cv2.LINE_AA)
                    for p_f, p_b in zip([tl_f, tr_f, br_f, bl_f], [tl_b, tr_b, br_b, bl_b]):
                        cv2.line(display_frame, tuple(p_f), tuple(p_b), (255, 255, 255), 2, cv2.LINE_AA)

                    for pt in [tl_f, tr_f, br_f, bl_f]:
                        cv2.circle(display_frame, tuple(pt), 6, (255, 255, 255), -1, cv2.LINE_AA)
                        cv2.circle(display_frame, tuple(pt), 9, (0, 235, 255), 2, cv2.LINE_AA)
                    for pt in [tl_b, tr_b, br_b, bl_b]:
                        cv2.circle(display_frame, tuple(pt), 4, (200, 200, 220), -1, cv2.LINE_AA)

            self.draw_hud(display_frame)

            curr_time = time.time()
            time_diff = curr_time - self.prev_time
            if time_diff > 0:
                self.fps = 0.9 * self.fps + 0.1 * (1.0 / time_diff)
            self.prev_time = curr_time

            cv2.imshow("RETROLENS Putra Python", display_frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                break
            elif key == ord('k') or key == ord('K'):
                self.toggle_mode("Key 'k'")
            elif key == ord('y') or key == ord('Y') or key == ord('f'):
                self.cycle_filter(1, "Key 'y'")
            elif key == ord('b') or key == ord('B'):
                self.cycle_filter(-1, "Key 'b'")
            elif key == ord('m') or key == ord('M'):
                self.mirror = not self.mirror
            elif key == ord('s') or key == ord('S'):
                filename = f"retrolens_snapshot_{int(time.time())}.jpg"
                cv2.imwrite(filename, display_frame)
                self.gesture_alert = f"SAVED: {filename}"
                self.gesture_alert_time = time.time()
                print(f"[Snapshot] Saved to {filename}")

        self.cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    camera_index = 0
    if len(sys.argv) > 1:
        try:
            camera_index = int(sys.argv[1])
        except ValueError:
            pass

    app = RetroLensApp(camera_id=camera_index)
    app.run()
`;

export const REQUIREMENTS_TXT = `opencv-python>=4.8.0.76
mediapipe>=0.10.9
numpy>=1.24.0
`;
