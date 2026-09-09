import React, { useState } from 'react';
import { PYTHON_3D_SCRIPT, REQUIREMENTS_TXT } from '../data/pythonCode';
import { Copy, Check, Download, Terminal, BookOpen, Key, AlertTriangle, X } from 'lucide-react';

interface PythonGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonGuideModal: React.FC<PythonGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'code' | 'requirements'>('guide');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedReqs, setCopiedReqs] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(PYTHON_3D_SCRIPT);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyReqs = () => {
    navigator.clipboard.writeText(REQUIREMENTS_TXT);
    setCopiedReqs(true);
    setTimeout(() => setCopiedReqs(false), 2000);
  };

  const handleDownloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="python-guide-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div id="python-guide-modal-card" className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-neutral-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">RETROLENS Python - Full Setup & Code</h2>
              <p className="text-xs text-neutral-400">Run the exact OpenCV & MediaPipe 3D Hand Tracking script on your computer</p>
            </div>
          </div>
          <button
            id="close-guide-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-800 bg-neutral-900/60">
          <button
            id="tab-btn-guide"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Setup Guide (Mac / Win / Linux)
          </button>
          <button
            id="tab-btn-code"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'code'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> 3d.py Source Code
          </button>
          <button
            id="tab-btn-reqs"
            onClick={() => setActiveTab('requirements')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === 'requirements'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Key className="w-4 h-4" /> requirements.txt
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-neutral-300">
          {activeTab === 'guide' && (
            <div className="space-y-6">
              {/* Python 3.14 Error Callout Banner */}
              <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Fix for: module 'mediapipe' has no attribute 'solutions'</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  If you see this error, you are running <strong className="text-amber-200">Python 3.14</strong>. Google MediaPipe requires precompiled C++ binaries that currently support <strong className="text-emerald-300">Python 3.9, 3.10, 3.11, and 3.12</strong>.
                </p>
                <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1">
                  <p className="text-neutral-500"># Windows PowerShell fix (Use Python 3.11):</p>
                  <p className="text-emerald-400">py -3.11 -m venv venv</p>
                  <p className="text-emerald-400">.\venv\Scripts\Activate.ps1</p>
                  <p className="text-emerald-400">pip install opencv-python mediapipe numpy</p>
                  <p className="text-amber-300 font-bold">python 3d.py</p>
                </div>
                <p className="text-[11px] text-neutral-400">
                  <em>Note: <code>3d.py</code> has also been updated with a safe fallback so it won't crash on Python 3.14.</em>
                </p>
              </div>

              {/* Quick Start Box */}
              <div className="p-4 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400 text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> 3-Step Quick Run (Terminal / VS Code)
                  </span>
                  <div className="flex gap-2">
                    <button
                      id="download-3d-py-btn-guide"
                      onClick={() => handleDownloadFile(PYTHON_3D_SCRIPT, '3d.py')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-medium text-xs rounded-md transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download 3d.py
                    </button>
                    <button
                      id="download-reqs-btn-guide"
                      onClick={() => handleDownloadFile(REQUIREMENTS_TXT, 'requirements.txt')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-md border border-neutral-700 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> requirements.txt
                    </button>
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs text-neutral-300 bg-neutral-900 p-3 rounded-md border border-neutral-800">
                  <p className="text-neutral-500"># 1. Create and activate a Python virtual environment</p>
                  <p className="text-emerald-400">python3 -m venv venv</p>
                  <p className="text-emerald-400">source venv/bin/activate  <span className="text-neutral-500"># On Windows: .\venv\Scripts\activate</span></p>
                  <p className="text-neutral-500 pt-2"># 2. Install required packages</p>
                  <p className="text-emerald-400">pip install opencv-python mediapipe numpy</p>
                  <p className="text-neutral-500 pt-2"># 3. Run the script</p>
                  <p className="text-amber-300 font-bold">python 3d.py</p>
                </div>
              </div>

              {/* Controls & Gestures Table */}
              <div>
                <h3 className="text-base font-semibold text-neutral-100 mb-3">Controls & Gestures</h3>
                <div className="border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                      <tr>
                        <th className="px-4 py-2.5">Action</th>
                        <th className="px-4 py-2.5">Hand Gesture</th>
                        <th className="px-4 py-2.5">Keyboard Key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 bg-neutral-900/40 font-mono">
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-neutral-200">Switch 2D / 3D Mode</td>
                        <td className="px-4 py-2.5 text-amber-400">Rapat 2 Tangan (Bring both hands touching)</td>
                        <td className="px-4 py-2.5 text-cyan-400">'k'</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-neutral-200">Next Visual Filter</td>
                        <td className="px-4 py-2.5 text-amber-400">Sentuh Jempol-Kelingking (Thumb-Pinky pinch)</td>
                        <td className="px-4 py-2.5 text-cyan-400">'y' or 'f'</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-neutral-200">Previous Filter</td>
                        <td className="px-4 py-2.5 text-neutral-500">-</td>
                        <td className="px-4 py-2.5 text-cyan-400">'b'</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-neutral-200">Toggle Mirror Camera</td>
                        <td className="px-4 py-2.5 text-neutral-500">-</td>
                        <td className="px-4 py-2.5 text-cyan-400">'m'</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-neutral-200">Save Snapshot Image</td>
                        <td className="px-4 py-2.5 text-neutral-500">-</td>
                        <td className="px-4 py-2.5 text-cyan-400">'s'</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-neutral-200">Quit Application</td>
                        <td className="px-4 py-2.5 text-neutral-500">-</td>
                        <td className="px-4 py-2.5 text-red-400">'q' or ESC</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Troubleshooting Note */}
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-start gap-3 text-xs text-amber-200/90">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300">MacBook / macOS Camera Permission Note:</p>
                  <p>
                    If running on macOS (like shown in the video), ensure Terminal or VS Code has camera permissions in:
                    <strong className="text-white"> System Settings &gt; Privacy &amp; Security &gt; Camera</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-mono">File: 3d.py (Ready to run)</span>
                <div className="flex gap-2">
                  <button
                    id="copy-code-btn"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded-md border border-neutral-700 transition"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    id="download-code-btn"
                    onClick={() => handleDownloadFile(PYTHON_3D_SCRIPT, '3d.py')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-xs text-neutral-950 font-medium rounded-md transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download 3d.py
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 overflow-x-auto max-h-[55vh] leading-relaxed select-all">
                {PYTHON_3D_SCRIPT}
              </pre>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-mono">File: requirements.txt</span>
                <div className="flex gap-2">
                  <button
                    id="copy-reqs-btn"
                    onClick={handleCopyReqs}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded-md border border-neutral-700 transition"
                  >
                    {copiedReqs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedReqs ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    id="download-reqs-btn"
                    onClick={() => handleDownloadFile(REQUIREMENTS_TXT, 'requirements.txt')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-xs text-neutral-950 font-medium rounded-md transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download requirements.txt
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all">
                {REQUIREMENTS_TXT}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-neutral-950 text-xs text-neutral-400">
          <span>Python 3.9+ compatible • OpenCV &amp; MediaPipe Hands</span>
          <button
            id="done-guide-modal-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
