import React from 'react';
import { FilterType, PortalMode } from '../types';
import { FILTER_LIST } from '../utils/filterEngine';
import {
  Box,
  Square,
  Camera,
  FlipHorizontal,
  Download,
  Terminal,
  Sparkles,
  Sliders,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface ControlsBarProps {
  mode: PortalMode;
  onToggleMode: () => void;
  currentFilter: FilterType;
  onSelectFilter: (f: FilterType) => void;
  onCycleFilter: (step: number) => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  isMirror: boolean;
  onToggleMirror: () => void;
  onSnapshot: () => void;
  onOpenPythonGuide: () => void;
  handsCount: number;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
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
  return (
    <div id="retrolens-controls-bar" className="w-full bg-neutral-950/90 border-t border-neutral-800/80 p-3 flex flex-col gap-3 text-neutral-200">
      
      {/* Primary Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left Side: Mode & Filter Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Toggle Button */}
          <button
            id="toggle-mode-btn"
            onClick={onToggleMode}
            title="Toggle 2D / 3D Mode (or press 'k' or bring hands together)"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition border ${
              mode === '3D'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            }`}
          >
            {mode === '3D' ? <Box className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span>MODE: {mode === '3D' ? '3D (Full 6 Sisi)' : 'PERSEGI 2D'}</span>
            <span className="text-[10px] opacity-70 border border-current px-1 rounded">Key: K</span>
          </button>

          {/* Filter Prev/Next Cycle Buttons */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              id="prev-filter-btn"
              onClick={() => onCycleFilter(-1)}
              title="Previous Filter (Key: 'b')"
              className="p-2 hover:bg-neutral-800 text-neutral-300 rounded-md transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-mono font-medium text-amber-300 tracking-wider">
              {currentFilter.toUpperCase()}
            </span>
            <button
              id="next-filter-btn"
              onClick={() => onCycleFilter(1)}
              title="Next Filter (Key: 'y' or Pinch Thumb-Pinky)"
              className="p-2 hover:bg-neutral-800 text-neutral-300 rounded-md transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Hands Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${handsCount >= 2 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-neutral-400">Hands:</span>
            <span className="font-semibold text-neutral-200">{handsCount}/2</span>
          </div>
        </div>

        {/* Right Side: Camera, Snapshot, and Python Guide */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Webcam Toggle */}
          <button
            id="toggle-webcam-btn"
            onClick={onToggleWebcam}
            title={isWebcamActive ? "Switch to Interactive Simulated Demo" : "Turn on Live Webcam"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
              isWebcamActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isWebcamActive ? 'Webcam Live' : 'Demo Mode'}</span>
          </button>

          {/* Mirror Toggle */}
          <button
            id="toggle-mirror-btn"
            onClick={onToggleMirror}
            title="Toggle Mirror Camera (Key: 'm')"
            className={`p-2 rounded-lg text-xs border transition ${
              isMirror
                ? 'bg-neutral-800 text-cyan-300 border-cyan-500/30'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Snapshot Button */}
          <button
            id="snapshot-btn"
            onClick={onSnapshot}
            title="Save Snapshot to JPG (Key: 's')"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg text-xs font-medium transition"
          >
            <Download className="w-4 h-4" />
            <span>Snapshot</span>
          </button>

          {/* Python Code & Guide Modal Trigger */}
          <button
            id="open-python-guide-btn"
            onClick={onOpenPythonGuide}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold rounded-lg text-xs tracking-wide transition shadow-lg shadow-amber-500/20"
          >
            <Terminal className="w-4 h-4" />
            <span>Python Source &amp; Setup Guide</span>
          </button>
        </div>

      </div>

      {/* Filter Quick Pills Scroller */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800">
        <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1 shrink-0 mr-1">
          <Sliders className="w-3 h-3" /> Filters:
        </span>
        {FILTER_LIST.map(f => {
          const isActive = currentFilter === f.id;
          return (
            <button
              key={f.id}
              id={`filter-pill-${f.id}`}
              onClick={() => onSelectFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono tracking-wider shrink-0 transition border ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

    </div>
  );
};
