/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { FilterType, PortalMode } from './types';
import { HandPortalCanvas } from './components/HandPortalCanvas';
import { MacDesktopIDE } from './components/MacDesktopIDE';
import { PythonGuideModal } from './components/PythonGuideModal';
import { FILTER_LIST } from './utils/filterEngine';

export default function App() {
  const [mode, setMode] = useState<PortalMode>('3D');
  const [currentFilter, setCurrentFilter] = useState<FilterType>('dual-tone');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(true);
  const [isMirror, setIsMirror] = useState<boolean>(true);
  const [handsCount, setHandsCount] = useState<number>(0);
  const [isPythonGuideOpen, setIsPythonGuideOpen] = useState<boolean>(false);

  const handleToggleMode = useCallback(() => {
    setMode(prev => (prev === '3D' ? '2D' : '3D'));
  }, []);

  const handleCycleFilter = useCallback((step: number) => {
    setCurrentFilter(prev => {
      const idx = FILTER_LIST.findIndex(f => f.id === prev);
      const nextIdx = (idx + step + FILTER_LIST.length) % FILTER_LIST.length;
      return FILTER_LIST[nextIdx].id;
    });
  }, []);

  const handleSnapshot = useCallback((canvas: HTMLCanvasElement) => {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `retrolens_snapshot_${Date.now()}.jpg`;
      a.click();
    } catch (err) {
      console.warn('Snapshot error:', err);
    }
  }, []);

  return (
    <div id="retrolens-app-root" className="flex flex-col h-screen w-screen bg-[#18181b] overflow-hidden select-none">
      <MacDesktopIDE
        mode={mode}
        onToggleMode={handleToggleMode}
        currentFilter={currentFilter}
        onSelectFilter={setCurrentFilter}
        onCycleFilter={handleCycleFilter}
        isWebcamActive={isWebcamActive}
        onToggleWebcam={() => setIsWebcamActive(prev => !prev)}
        isMirror={isMirror}
        onToggleMirror={() => setIsMirror(prev => !prev)}
        onSnapshot={() => {
          const canvas = document.getElementById('retrolens-main-canvas') as HTMLCanvasElement;
          if (canvas) handleSnapshot(canvas);
        }}
        onOpenPythonGuide={() => setIsPythonGuideOpen(true)}
        handsCount={handsCount}
      >
        <HandPortalCanvas
          mode={mode}
          setMode={setMode}
          currentFilter={currentFilter}
          setCurrentFilter={setCurrentFilter}
          isWebcamActive={isWebcamActive}
          setIsWebcamActive={setIsWebcamActive}
          isMirror={isMirror}
          onSnapshotTriggered={handleSnapshot}
          onHandsCountChange={setHandsCount}
        />
      </MacDesktopIDE>

      {/* Python Code & Setup Guide Modal */}
      <PythonGuideModal
        isOpen={isPythonGuideOpen}
        onClose={() => setIsPythonGuideOpen(false)}
      />
    </div>
  );
}
