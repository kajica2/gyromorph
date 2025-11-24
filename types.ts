export interface GyroData {
  alpha: number; // Z-axis rotation (0-360)
  beta: number;  // X-axis rotation (-180 to 180)
  gamma: number; // Y-axis rotation (-90 to 90)
}

export interface Particle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface AnalysisResult {
  theme: string;
  elements: string[];
  distortionType: 'liquid' | 'glitch' | 'pixelate' | 'warp';
  colorHex: string;
}

export type AssetType = 'model' | 'video' | 'audio' | 'image';

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: AssetType;
  thumbnail_url?: string;
  category?: string;
  created_at?: string;
  size?: number;
  is_public?: boolean;
}

// Deprecated: Use Asset with type='model'
export interface Model3D extends Asset {
  type: 'model';
}
