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

export interface Model3D {
  id: string;
  name: string;
  url: string;
  thumbnail_url?: string;
  category?: string;
  created_at?: string;
}
