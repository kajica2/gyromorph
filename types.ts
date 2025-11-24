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

export interface Friend {
  id: string;
  username: string;
  emoji: string;
  color: string;
  lastActive: number;
  status: 'idle' | 'morphing' | 'scanning';
}
