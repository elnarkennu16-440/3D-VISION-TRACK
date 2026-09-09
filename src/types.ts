export type FilterType =
  | 'sketch'
  | 'cartoon'
  | 'invert'
  | 'edge'
  | 'thermal'
  | 'blur'
  | 'rainbow-wave'
  | 'pixelate'
  | 'glitch'
  | 'dual-tone'
  | 'red-channel'
  | 'normal';

export type PortalMode = '3D' | '2D';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: Landmark[];
  avgX: number;
  isLeftOnScreen: boolean;
}

export interface FilterInfo {
  id: FilterType;
  label: string;
  description: string;
}

declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}
