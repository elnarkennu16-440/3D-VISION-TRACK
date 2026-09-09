import React, { useState } from 'react';
import { FilterType, PortalMode } from '../types';
import { FILTER_LIST } from '../utils/filterEngine';
import {
  Maximize2,
  Minimize2,
  Terminal,
  FileCode,
  FolderTree,
  Search,
  GitBranch,
  Play,
  Package,
  Settings,
  X,
  Copy,
  Check,
  Download,
  Camera,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders
} from 'lucide-react';

interface MacDesktopIDEProps {
  children: React.ReactNode;
  mode: PortalMode;
  onToggleMode: () => void;
  currentFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  onCycleFilter: (step: number) => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  isMirror: boolean;
  onToggleMirror: () => void;
  onSnapshot: () => void;
  onOpenPythonGuide: () => void;
  handsCount: number;
}

export const MacDesktopIDE: React.FC<MacDesktopIDEProps> = ({
  children,
  mode,
  onToggleMode,
  currentFilter,
  onSelectFilter,
  onCycleFilter,
  isWebcamActive,
  onToggleWebcam,
  isMirror,
  onToggleMirror,
  onSnapshot,
  onOpenPythonGuide,
  handsCount,
}) => {
  const [viewMode, setViewMode] = useState<'studio' | 'fullscreen' | 'code'>('studio');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'3d.py' | 'terminal' | 'requirements.txt'>('3d.py');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyPython = () => {
    fetch('/3d.py')
      .then(res => res.text())
      .then(text => {
        navigator.clipboard.writeText(text);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      })
      .catch(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      });
  };

  const handleDownloadPython = () => {
    const a = document.createElement('a');
    a.href = '/3d.py';
    a.download = '3d.py';
    a.click();
  };

  return (
    <div id="mac-desktop-root" className="relative flex flex-col w-full h-full bg-[#18181b] select-none overflow-hidden font-sans text-neutral-200">
      
      {/* 1. macOS Top Menu Bar */}
      <header id="mac-menu-bar" className="flex items-center justify-between px-3 h-7 bg-[#1c1c1e]/90 backdrop-blur border-b border-black/40 text-[12px] text-neutral-300 z-30 font-medium">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold text-sm cursor-pointer hover:opacity-80"></span>
          <span className="font-semibold text-white">Code</span>
          <span className="hidden sm:inline hover:text-white cursor-pointer">File</span>
          <span className="hidden sm:inline hover:text-white cursor-pointer">Edit</span>
          <span className="hidden md:inline hover:text-white cursor-pointer">Selection</span>
          <span className="hidden md:inline hover:text-white cursor-pointer">View</span>
          <span className="hidden lg:inline hover:text-white cursor-pointer">Go</span>
          <span className="hidden lg:inline hover:text-white cursor-pointer">Run</span>
          <span className="hidden sm:inline text-amber-400 font-semibold cursor-pointer">Terminal</span>
          <span className="hidden xl:inline hover:text-white cursor-pointer">Window</span>
          <span className="hidden xl:inline hover:text-white cursor-pointer">Help</span>
        </div>

        {/* Center: View Switcher Tabs */}
        <div className="flex items-center bg-neutral-900/90 border border-neutral-700/80 rounded-md p-0.5 text-[11px]">
          <button
            id="view-mode-studio-btn"
            onClick={() => setViewMode('studio')}
            className={`px-2.5 py-0.5 rounded transition ${
              viewMode === 'studio'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            MacBook Studio (Video View)
          </button>
          <button
            id="view-mode-fullscreen-btn"
            onClick={() => setViewMode('fullscreen')}
            className={`px-2.5 py-0.5 rounded transition ${
              viewMode === 'fullscreen'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            OpenCV Camera Window
          </button>
          <button
            id="view-mode-code-btn"
            onClick={() => setViewMode('code')}
            className={`px-2.5 py-0.5 rounded transition ${
              viewMode === 'code'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Python Source (3d.py)
          </button>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
          <span className="hidden sm:inline font-mono text-emerald-400">● Python 3.10</span>
          <span className="hidden md:inline font-mono">100% ⚡</span>
          <span className="text-neutral-300 font-mono">Sun 5:38 PM</span>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div id="mac-workspace-container" className="flex-1 relative flex overflow-hidden">
        
        {/* If user picked "Fullscreen Camera Window", only display the OpenCV window */}
        {viewMode === 'fullscreen' ? (
          <div className="flex-1 flex flex-col bg-black">
            {/* Window bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#333] text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                <span className="ml-2 font-mono text-neutral-300 font-bold">RETROLENS Putra Python</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400">960 x 540 | 30 FPS</span>
                <button
                  onClick={() => setViewMode('studio')}
                  className="p-1 text-neutral-400 hover:text-white rounded"
                  title="Return to Studio View"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
              {children}
            </div>
          </div>
        ) : viewMode === 'code' ? (
          /* Pure Python Code Viewer */
          <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-amber-400 font-bold">3d.py</span>
                <span className="text-xs text-neutral-400">— Full MediaPipe & OpenCV Python Script</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPython}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded transition border border-neutral-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={handleDownloadPython}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded transition shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 3d.py</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-neutral-300 bg-[#1e1e1e] leading-relaxed">
              <pre className="text-neutral-300">
                {`#!/usr/bin/env python3
"""
RETROLENS Putra Python - 3D Hand Tracking Portal & Multi-Angle Filter Box
Replication of MediaPipe Hand Tracking with 11 real-time filters and 6-sided 3D geometric box.
"""

import math
import time
import cv2
import mediapipe as mp
import numpy as np

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

class RetroFilterBox:
    def __init__(self):
        # MediaPipe Hands initialization
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.5,
        )
        self.mode_3d = True  # True = 3D [Full 6 Sisi], False = PERSEGI 2D
        self.filter_idx = 0
        self.window_name = "RETROLENS Putra Python"
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, W_FRAME, H_FRAME)

    # Full script available in root /3d.py`}
              </pre>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STUDIO VIEW: The Exact Scene from the Video!
             VS Code Desktop in Background with Floating OpenCV Camera Window in Front
             ========================================================================= */
          <div className="flex-1 flex flex-row overflow-hidden bg-[#1e1e1e]">
            
            {/* VS Code Left Activity Bar */}
            <div className="w-12 bg-[#333333] flex flex-col items-center py-2 justify-between border-r border-[#252526] z-10">
              <div className="flex flex-col items-center gap-4 text-neutral-400">
                <button
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  className="p-2 text-white border-l-2 border-amber-400 hover:text-white transition"
                  title="Explorer"
                >
                  <FolderTree className="w-5 h-5" />
                </button>
                <button className="p-2 hover:text-white transition" title="Search">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2 hover:text-white transition" title="Source Control">
                  <GitBranch className="w-5 h-5" />
                </button>
                <button className="p-2 hover:text-white transition" title="Run & Debug">
                  <Play className="w-5 h-5" />
                </button>
                <button className="p-2 hover:text-white transition" title="Extensions">
                  <Package className="w-5 h-5" />
                </button>
              </div>
              <div className="text-neutral-400 hover:text-white cursor-pointer p-2">
                <Settings className="w-5 h-5" />
              </div>
            </div>

            {/* VS Code File Explorer Sidebar (Collapsible) */}
            {isSidebarOpen && (
              <div className="hidden lg:flex flex-col w-52 bg-[#252526] border-r border-[#1e1e1e] text-xs font-sans">
                <div className="px-4 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Explorer: RETROLENS
                </div>
                <div className="flex flex-col py-1">
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#37373d] text-white font-medium cursor-pointer">
                    <span className="text-amber-400 font-bold font-mono">🐍</span>
                    <span className="truncate">3d.py</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 text-neutral-400 hover:text-neutral-200 cursor-pointer">
                    <span className="text-cyan-400 font-mono">⚙️</span>
                    <span className="truncate">requirements.txt</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 text-neutral-400 hover:text-neutral-200 cursor-pointer">
                    <span className="text-blue-400 font-mono">📄</span>
                    <span className="truncate">README.md</span>
                  </div>
                </div>
              </div>
            )}

            {/* Main VS Code Editor Workspace */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              
              {/* VS Code Editor Tabs */}
              <div className="flex items-center justify-between bg-[#2d2d2d] border-b border-[#1e1e1e] px-2 h-9 text-xs">
                <div className="flex items-center">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] text-white border-t-2 border-amber-400 font-mono">
                    <span className="text-amber-400 font-bold">🐍</span>
                    <span>3d.py</span>
                    <span className="text-neutral-500 hover:text-white cursor-pointer text-sm ml-1">×</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-neutral-200 font-mono cursor-pointer">
                    <span>requirements.txt</span>
                  </div>
                </div>

                {/* Quick IDE Action Buttons */}
                <div className="flex items-center gap-2 pr-2">
                  <button
                    onClick={handleCopyPython}
                    className="flex items-center gap-1 px-2 py-0.5 bg-neutral-700/80 hover:bg-neutral-600 text-neutral-200 text-[11px] rounded transition"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy 3d.py'}</span>
                  </button>
                  <button
                    onClick={handleDownloadPython}
                    className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] rounded transition shadow"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Breadcrumbs */}
              <div className="px-4 py-1 bg-[#1e1e1e] border-b border-[#252526] text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                <span>retrolens</span>
                <span>&gt;</span>
                <span className="text-neutral-300">3d.py</span>
                <span>&gt;</span>
                <span className="text-amber-400">class RetroFilterBox</span>
              </div>

              {/* Background Code Area (Visible behind / around floating OpenCV window) */}
              <div className="flex-1 relative flex flex-col bg-[#1e1e1e] overflow-hidden font-mono text-xs text-neutral-400 select-text">
                <div className="p-4 space-y-1 opacity-70 leading-relaxed overflow-hidden">
                  <div className="text-neutral-500"># PENGATURAN KECEPATAN GANTI FILTER</div>
                  <div className="text-purple-400">import <span className="text-blue-300">cv2</span></div>
                  <div className="text-purple-400">import <span className="text-blue-300">mediapipe as mp</span></div>
                  <div className="text-purple-400">import <span className="text-blue-300">numpy as np</span></div>
                  <div className="text-neutral-500"># DAFTAR FILTER LENGKAP:</div>
                  <div className="text-amber-300">FILTERS = ["dual-tone", "thermal", "sketch", "pixelate", "glitch", "invert", "red-channel", "edge", "blur", "cartoon", "rainbow-wave"]</div>
                  <div className="text-blue-400">class <span className="text-yellow-300">RetroFilterBox</span>:</div>
                  <div className="pl-4 text-neutral-300">def __init__(self):</div>
                  <div className="pl-8 text-neutral-400">self.mp_hands = mp.solutions.hands</div>
                  <div className="pl-8 text-neutral-400">self.hands = self.mp_hands.Hands(max_num_hands=2)</div>
                  <div className="pl-8 text-neutral-400">self.window_name = "RETROLENS Putra Python"</div>
                </div>

                {/* Floating Foreground: The OpenCV Window titled "RETROLENS Putra Python" */}
                <div
                  id="opencv-window-card"
                  className="absolute inset-4 lg:inset-x-8 lg:top-3 lg:bottom-40 z-20 flex flex-col bg-black rounded-lg border border-neutral-700 shadow-2xl overflow-hidden"
                >
                  {/* macOS / OpenCV Window Titlebar */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#333] text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer" title="Close" />
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-pointer" title="Minimize" />
                      <div
                        onClick={() => setViewMode('fullscreen')}
                        className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-pointer"
                        title="Maximize / Fullscreen"
                      />
                      <span className="ml-2 font-mono text-neutral-200 font-bold tracking-tight">
                        RETROLENS Putra Python
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-[11px] font-mono">
                        <span className="text-neutral-500">Mode:</span>
                        <span className={mode === '3D' ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                          {mode === '3D' ? '3D [Full 6 Sisi]' : 'PERSEGI 2D'}
                        </span>
                      </div>
                      <button
                        onClick={() => setViewMode('fullscreen')}
                        className="p-1 text-neutral-400 hover:text-white rounded"
                        title="Expand to Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* OpenCV Video Canvas Viewport */}
                  <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                    {children}
                  </div>
                </div>

                {/* Bottom Integrated Terminal Panel (Matching Video Terminal) */}
                <div
                  id="vs-code-terminal-panel"
                  className="hidden lg:flex flex-col h-36 bg-[#181818] border-t border-[#333] font-mono text-xs z-10"
                >
                  <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#333] text-[11px]">
                    <div className="flex items-center gap-4">
                      <span className="text-neutral-400 hover:text-white cursor-pointer">PROBLEMS 0</span>
                      <span className="text-neutral-400 hover:text-white cursor-pointer">OUTPUT</span>
                      <span className="text-neutral-400 hover:text-white cursor-pointer">DEBUG CONSOLE</span>
                      <span className="text-white font-bold border-b border-amber-400 pb-0.5 cursor-pointer flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-amber-400" />
                        <span>TERMINAL (bash)</span>
                      </span>
                    </div>
                    <span className="text-neutral-500 text-[10px]">python3 3d.py</span>
                  </div>

                  {/* Terminal Log Output */}
                  <div className="flex-1 p-2.5 overflow-y-auto font-mono text-[11px] leading-relaxed select-text space-y-0.5">
                    <div className="text-neutral-400">
                      <span className="text-emerald-400 font-bold">user@MacBook-Pro</span>
                      <span className="text-neutral-500">:</span>
                      <span className="text-blue-400">~/Downloads/retrolens</span>
                      <span className="text-neutral-500">$</span> python3 3d.py
                    </div>
                    <div className="text-neutral-300">
                      INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
                    </div>
                    <div className="text-neutral-300">
                      [MediaPipe Hands] Ready. Real-time 3D hand tracking pipeline initialized.
                    </div>
                    <div className="text-emerald-400 font-semibold">
                      [OpenCV] VideoCapture(0) opened: 960x540 @ 30 FPS. Window: "RETROLENS Putra Python"
                    </div>
                    <div className="text-amber-400">
                      Ready: Press 'k' / Kepal 2 Tangan to toggle 2D/3D | 'n'/'y' / Sentuh Jempol-Kelingking for filters.
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* 3. Bottom Interactive Control Bar */}
      <footer id="mac-controls-toolbar" className="flex items-center justify-between px-4 py-2 bg-[#252526] border-t border-[#333] z-20 gap-2 flex-wrap">
        
        {/* Left: Mode & Filter Navigation */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <button
            id="control-mode-toggle-btn"
            onClick={onToggleMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition shadow ${
              mode === '3D'
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 shadow-cyan-500/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mode === '3D' ? 'MODE: 3D [Full 6 Sisi]' : 'MODE: PERSEGI 2D'}</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-bold ml-1">k</span>
          </button>

          {/* Filter Prev/Next */}
          <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-md overflow-hidden text-xs">
            <button
              id="filter-prev-btn"
              onClick={() => onCycleFilter(-1)}
              className="px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
              title="Previous Filter (Key 'y')"
            >
              ← Prev (y)
            </button>
            <span className="px-2 font-mono font-bold text-amber-400 border-x border-neutral-700">
              {currentFilter.toUpperCase()}
            </span>
            <button
              id="filter-next-btn"
              onClick={() => onCycleFilter(1)}
              className="px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
              title="Next Filter (Key 'n')"
            >
              Next (n) →
            </button>
          </div>
        </div>

        {/* Center: Filter Selector Badges */}
        <div className="hidden xl:flex items-center gap-1 overflow-x-auto max-w-xl py-0.5">
          {FILTER_LIST.map(f => (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id)}
              className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition ${
                currentFilter === f.id
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Right: Camera, Mirror, Snapshot, Python Guide */}
        <div className="flex items-center gap-2">
          {/* Webcam vs Simulation */}
          <button
            id="control-webcam-toggle-btn"
            onClick={onToggleWebcam}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition border ${
              isWebcamActive
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-purple-950/80 border-purple-500/50 text-purple-300'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isWebcamActive ? 'Webcam Live' : 'Demo 3D Hands'}</span>
          </button>

          {/* Mirror Flip */}
          <button
            id="control-mirror-toggle-btn"
            onClick={onToggleMirror}
            className={`p-1.5 rounded text-xs border transition ${
              isMirror
                ? 'bg-neutral-700 border-neutral-600 text-white'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
            title="Toggle Camera Mirror"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Snapshot */}
          <button
            id="control-snapshot-btn"
            onClick={onSnapshot}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-mono rounded transition border border-neutral-600"
            title="Save Snapshot (Key 's')"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap (s)</span>
          </button>

          {/* Python Guide */}
          <button
            id="control-python-guide-btn"
            onClick={onOpenPythonGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded transition shadow"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Python Setup</span>
          </button>
        </div>

      </footer>

    </div>
  );
};
