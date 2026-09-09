# RETROLENS 3D Python - Full Setup & Running Guide

This guide explains how to install and run the exact **`3d.py`** hand tracking script shown in the video on your local computer (macOS, Windows, or Linux) with full webcam access.

---

## 1. Prerequisites
- **Python 3.9, 3.10, or 3.11** installed on your system.
  - Check with: `python3 --version` or `python --version`
- A working webcam / FaceTime HD camera.

---

## 2. Step-by-Step Installation

### Option A: macOS (Apple Silicon M1/M2/M3/M4 or Intel)
*(This is the exact system shown in the video!)*

1. Open your **Terminal** app.
2. Navigate to your project folder:
   ```bash
   cd path/to/retrolens-app
   ```
3. Create a clean Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
4. Upgrade `pip` and install the required libraries:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
   *Or install directly:*
   ```bash
   pip install opencv-python mediapipe numpy
   ```
5. *(macOS Only)* Grant camera permission to Terminal or VS Code:
   - Go to **System Settings > Privacy & Security > Camera**
   - Make sure **Terminal** (or **Visual Studio Code**) is enabled.

---

### Option B: Windows 10 / 11

1. Open **Command Prompt** or **PowerShell** as Administrator or standard user.
2. Navigate to the project folder:
   ```cmd
   cd C:\path\to\retrolens-app
   ```
3. Create and activate a virtual environment:
   ```cmd
   python -m venv venv
   .\venv\Scripts\activate
   ```
4. Install requirements:
   ```cmd
   pip install -r requirements.txt
   ```

---

### Option C: Linux (Ubuntu / Debian / Fedora)

1. Open your terminal:
   ```bash
   sudo apt update
   sudo apt install -y python3-pip python3-venv libgl1-mesa-glx libglib2.0-0
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

---

## 3. Running the Application

To start the application with default camera:
```bash
python 3d.py
```

If you have multiple webcams (e.g. external USB camera or iPhone Continuity Camera):
```bash
python 3d.py 1
# or
python 3d.py 0
```

---

## 4. Interactive Controls & Gestures

| Control / Action | Keyboard Shortcut | Hand Gesture |
| :--- | :--- | :--- |
| **Toggle 2D / 3D Mode** | Press **`k`** | **Rapat 2 Tangan** (Bring both hands together/touching) |
| **Next Filter** | Press **`y`** (or `f`) | **Sentuh Jempol-Kelingking** (Pinch Thumb to Pinky) |
| **Previous Filter** | Press **`b`** | - |
| **Toggle Mirror Mode** | Press **`m`** | - |
| **Take Snapshot** | Press **`s`** (Saves to JPG) | - |
| **Quit Program** | Press **`q`** or **`ESC`** | - |

---

## 5. Visual Filters Included

1. **`sketch`**: High-contrast inverted pencil drawing
2. **`cartoon`**: Bilateral color smoothing + ink outlines
3. **`invert`**: Negative color inversion
4. **`edge`**: Neon edge detection on dark canvas
5. **`thermal`**: False-color infrared thermal heat map
6. **`blur`**: Frosted Gaussian blur
7. **`rainbow-wave`**: Animated multi-spectrum rainbow wave
8. **`pixelate`**: 8-bit retro block pixelation
9. **`glitch`**: RGB chromatic aberration + scanline jitter
10. **`dual-tone`**: Cyberpunk hot pink and cyan duotone
11. **`red-channel`**: Night-vision crimson matrix
12. **`normal`**: Clean unedited video feed

---

## 6. How the 3D Prism Works
- **Hand Anchors**: Left index fingertip and wrist form the left pillar; Right index fingertip and wrist form the right pillar.
- **Perspective Projection**: Depth is computed dynamically from hand separation and 3D Z-coordinates. When you tilt one hand forward and the other back, the 3D cuboid rotates in space.
- **6 Full Sides**:
  - **Front Face**: Warps the live filtered video portal.
  - **Connecting Sides (Top, Bottom, Left, Right)**: Rendered with animated diagonal rainbow stripes as seen in the video.
  - **Back Face**: Shaded 3D perspective quad with wireframe borders.
