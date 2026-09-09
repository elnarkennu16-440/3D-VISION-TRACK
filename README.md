# RetroLens 3D Hand Tracking Portal (`3d.py`)

A high-performance computer vision application inspired by viral OpenCV & MediaPipe demos. It tracks both hands in real-time to span an interactive 2D quadrilateral or 3D 6-sided geometric box between your fingertips, applying 11 dynamic visual filters (Cartoon, Sketch, Thermal, Dual-Tone, Rainbow Wave, Glitch, etc.) to your body and room through the geometric portal.

---

## 🚀 Quick Start (Python)

### 1. Requirements
- Python 3.9, 3.10, or 3.11 recommended
- A working webcam
- macOS, Windows, or Linux

### 2. Setup Virtual Environment (Recommended)

#### On macOS / Linux:
```bash
# Clone or navigate to the project directory
cd /path/to/project

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

#### On Windows (PowerShell or Command Prompt):
```powershell
# Create a virtual environment
python -m venv venv

# Activate the virtual environment (PowerShell)
.\venv\Scripts\Activate.ps1
# OR (Command Prompt)
.\venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt
```

---

## 🎮 Running the Application

Ensure your webcam is connected, then run:

```bash
python 3d.py
```

---

## 🖐️ Gesture & Keyboard Controls

| Control | Action | Details |
| :--- | :--- | :--- |
| **Kepal 2 Tangan** (Dual Fist) | **Toggle 2D / 3D Mode** | Clench both hands into fists to switch between `3D [Full 6 Sisi]` and `PERSEGI 2D`. |
| **Sentuh Jempol-Kelingking** | **Next Filter** | Touch your thumb tip to your pinky tip on either hand to cycle to the next filter. |
| **'k' key** | **Toggle 2D / 3D Mode** | Keyboard shortcut to toggle between 2D Quad and 3D Box. |
| **'n' key** | **Next Filter** | Cycle forward to the next visual filter. |
| **'y' key** | **Previous Filter** | Cycle backward to the previous visual filter. |
| **'q' / ESC** | **Quit** | Close the application window cleanly. |

---

## 🎨 11 Real-Time Visual Filters

1. **DUAL-TONE**: Retro futuristic mapping of luminance to vibrant contrast hues.
2. **THERMAL**: False-color infrared heatmap simulation using OpenCV Jet colormap.
3. **SKETCH**: High-contrast black & white pencil sketch outline with inverted gaussian division.
4. **CARTOON**: Ink outlines combined with bilateral color smoothing for comic-book aesthetic.
5. **INVERT**: Negative color inversion with high-contrast luminance.
6. **EDGE**: Neon Canny edge detection highlighting outlines on a dark backdrop.
7. **BLUR**: Frosted glass depth-of-field Gaussian blur.
8. **RAINBOW-WAVE**: Procedural animated diagonal chromatic spectrum wave.
9. **PIXELATE**: 8-bit retro arcade mosaic downsampling.
10. **GLITCH**: Dynamic RGB channel offset and horizontal scanline distortion.
11. **RED-CHANNEL**: Monochrome night-vision high-contrast red sensor simulation.

---

## 🛠️ Troubleshooting & Tips

- **Camera Permission on macOS**:
  If macOS blocks the webcam, open **System Settings > Privacy & Security > Camera** and ensure your Terminal, iTerm2, or VS Code is toggled ON.
- **Multiple Webcams**:
  If you have an external webcam or Continuity Camera, change `cv2.VideoCapture(0)` to `cv2.VideoCapture(1)` or `2` inside `3d.py`.
- **Apple Silicon (M1/M2/M3/M4)**:
  `mediapipe` works natively on ARM64 using Python 3.10. If you encounter an architecture issue, make sure you are using native arm64 Python rather than an x86 Rosetta instance.
