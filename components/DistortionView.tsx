import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GyroData, AnalysisResult, Particle } from '../types';

interface DistortionViewProps {
  imageSrc: string;
  videoStream?: MediaStream;
  gyro: GyroData;
  analysis: AnalysisResult;
  onBack: () => void;
  isOnboarding: boolean;
  difficultyMultiplier: number;
  onOnboardingComplete: (difficulty: number) => void;
  isAutoMode?: boolean;
}

interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  isShrinking: boolean;
}

interface TargetZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  emoji: string;
  timeLeft: number; // in ms
  maxTime: number;
  matchedDuration: number; // How long correct particle has been inside
  rewardClaimed: boolean;
}

const DistortionView: React.FC<DistortionViewProps> = ({ 
  imageSrc, 
  videoStream,
  gyro, 
  analysis, 
  onBack,
  isOnboarding,
  difficultyMultiplier,
  onOnboardingComplete,
  isAutoMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Game State
  const [particles, setParticles] = useState<Particle[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [targets, setTargets] = useState<TargetZone[]>([]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  
  // Onboarding Specific State
  const [calibrationText, setCalibrationText] = useState<string>("");

  // Refs for loop
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const targetsRef = useRef<TargetZone[]>([]);
  const nextSpawnTimeRef = useRef<number>(0);
  const nextObstacleRotationTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  
  // Onboarding Refs
  const onboardingStepRef = useRef<number>(0); // 0, 1, 2 = targets, 3 = done
  const onboardingStartTimeRef = useRef<number>(0);
  const hasOnboardingFinishedRef = useRef<boolean>(false);

  // Physics Constants (Affected by Difficulty)
  const DAMPING = 0.98;
  const SENSITIVITY = 0.8 * (isOnboarding ? 0.6 : difficultyMultiplier); // Lower sensitivity during training
  const TARGET_LIFESPAN = 5000;
  const OBSTACLE_ROTATION_MS = 7000;

  // Handle Video Stream
  useEffect(() => {
    if (videoStream && videoRef.current) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.play().catch(e => console.error("Video play failed", e));
    }
  }, [videoStream]);
  
  // Helper to create a particle
  const createParticle = (idSuffix: string, x?: number, y?: number): Particle => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      return {
        id: `p-${idSuffix}`,
        emoji: analysis.elements[Math.floor(Math.random() * analysis.elements.length)],
        x: x ?? Math.random() * (width - 60),
        y: y ?? Math.random() * (height - 60),
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        size: 32 + Math.random() * 24
      };
  };

  // Initialize particles and obstacles
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Create Floating Particles (Start with 1)
    const newParticles: Particle[] = [createParticle('init-0', width / 2 - 20, height / 2 - 20)];
    setParticles(newParticles);

    // 2. Create Static Obstacles (Voids)
    const newObstacles: Obstacle[] = [];
    
    // In onboarding, create fewer, static obstacles to not overwhelm
    const obstacleCount = isOnboarding ? 2 : 3; 
    
    for(let i = 0; i < obstacleCount; i++) {
        const r = 40 + Math.random() * 30;
        newObstacles.push({
            id: `obs-${i}`,
            x: isOnboarding 
               ? (i === 0 ? width * 0.2 : width * 0.8) // Fixed positions for onboarding
               : (width * 0.2) + Math.random() * (width * 0.6),
            y: isOnboarding 
               ? (i === 0 ? height * 0.2 : height * 0.8) 
               : (height * 0.2) + Math.random() * (height * 0.6),
            radius: r,
            targetRadius: r,
            isShrinking: false
        });
    }
    setObstacles(newObstacles);
    obstaclesRef.current = newObstacles;
    
    // Reset Score & Timers
    scoreRef.current = 0;
    setScore(0);
    nextObstacleRotationTimeRef.current = 0; 
    onboardingStepRef.current = 0;
    hasOnboardingFinishedRef.current = false;
    onboardingStartTimeRef.current = performance.now();

  }, [analysis, isOnboarding]);

  // Animation Loop
  const animate = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    
    const width = window.innerWidth;
    const height = window.innerHeight;

    // ==========================================
    // ONBOARDING LOGIC
    // ==========================================
    if (isOnboarding && !hasOnboardingFinishedRef.current) {
        if (targetsRef.current.length === 0) {
            const step = onboardingStepRef.current;
            const radius = 70; // Larger targets for calibration
            let tx = 0, ty = 0;

            if (step === 0) { // Center
                tx = width / 2;
                ty = height / 2;
                setCalibrationText("CALIBRATION: CENTER");
            } else if (step === 1) { // Top Left
                tx = width * 0.2;
                ty = height * 0.25;
                setCalibrationText("CALIBRATION: TILT LEFT UP");
            } else if (step === 2) { // Bottom Right
                tx = width * 0.8;
                ty = height * 0.75;
                setCalibrationText("CALIBRATION: TILT RIGHT DOWN");
            } else if (step === 3) {
                // FINISHED
                hasOnboardingFinishedRef.current = true;
                const totalTime = (time - onboardingStartTimeRef.current);
                
                // Calculate Difficulty
                // Fast (< 6s total) = Hard (1.2)
                // Avg (6s - 12s) = Medium (1.0)
                // Slow (> 12s) = Easy (0.8)
                let calculatedDiff = 1.0;
                let diffText = "BALANCED";
                
                if (totalTime < 8000) {
                    calculatedDiff = 1.2;
                    diffText = "EXPERT";
                } else if (totalTime > 15000) {
                    calculatedDiff = 0.8;
                    diffText = "RELAXED";
                }

                setCalibrationText(`CALIBRATION COMPLETE: ${diffText}`);
                setTimeout(() => {
                    onOnboardingComplete(calculatedDiff);
                }, 1500);
                return; // Skip rest of frame
            }

            if (step < 3) {
                 const newTarget: TargetZone = {
                    id: `calib-${step}`,
                    x: tx,
                    y: ty,
                    radius: radius,
                    emoji: analysis.elements[0], // Use first element
                    timeLeft: 999999, // Infinite time for calibration
                    maxTime: 999999,
                    matchedDuration: 0,
                    rewardClaimed: false
                };
                targetsRef.current = [newTarget];
                setTargets([newTarget]);
            }
        }
    } 
    // ==========================================
    // NORMAL GAME LOGIC
    // ==========================================
    else {
        setCalibrationText(""); 

        // Initialize obstacle rotation timer if needed
        if (!nextObstacleRotationTimeRef.current) nextObstacleRotationTimeRef.current = time + OBSTACLE_ROTATION_MS;

        // --- OBSTACLE ROTATION / LIFECYCLE ---
        if (time > nextObstacleRotationTimeRef.current) {
            // 1. Shrink one existing non-shrinking obstacle
            const candidates = obstaclesRef.current.filter(o => !o.isShrinking);
            if (candidates.length > 0) {
                const toShrink = candidates[Math.floor(Math.random() * candidates.length)];
                toShrink.isShrinking = true;
            }

            // 2. Spawn a new obstacle
            const newTargetRadius = 40 + Math.random() * 30;
            const newObs: Obstacle = {
                id: `obs-${time}`,
                x: (width * 0.1) + Math.random() * (width * 0.8),
                y: (height * 0.1) + Math.random() * (height * 0.8),
                radius: 0, 
                targetRadius: newTargetRadius,
                isShrinking: false
            };
            obstaclesRef.current.push(newObs);

            nextObstacleRotationTimeRef.current = time + OBSTACLE_ROTATION_MS;
        }

        // --- TARGET SPAWNING LOGIC ---
        if (time > nextSpawnTimeRef.current) {
            const radius = 60;
            const newTarget: TargetZone = {
                id: `tgt-${time}`,
                x: Math.random() * (width - 120) + 60,
                y: Math.random() * (height - 120) + 60,
                radius: radius,
                emoji: analysis.elements[Math.floor(Math.random() * analysis.elements.length)],
                timeLeft: TARGET_LIFESPAN / difficultyMultiplier, // Shorter time on hard difficulty
                maxTime: TARGET_LIFESPAN / difficultyMultiplier,
                matchedDuration: 0,
                rewardClaimed: false
            };
            
            const isSafe = obstaclesRef.current.every(obs => {
                const dx = newTarget.x - obs.x;
                const dy = newTarget.y - obs.y;
                return Math.sqrt(dx*dx + dy*dy) > (obs.radius + radius + 20);
            });

            if (isSafe) {
                targetsRef.current = [...targetsRef.current, newTarget];
                setTargets(targetsRef.current);
                // Faster spawns on higher difficulty
                const spawnDelay = (3000 + Math.random() * 2000) / difficultyMultiplier; 
                nextSpawnTimeRef.current = time + spawnDelay;
            }
        }
    }

    // --- ANIMATE OBSTACLE SIZES (Common) ---
    obstaclesRef.current = obstaclesRef.current.map(obs => {
        const growthSpeed = 0.05 * dt; 
        if (obs.isShrinking) {
            obs.radius -= growthSpeed;
        } else if (obs.radius < obs.targetRadius) {
            obs.radius += growthSpeed;
            if (obs.radius > obs.targetRadius) obs.radius = obs.targetRadius;
        }
        return obs;
    }).filter(obs => obs.radius > 0);

    // --- UPDATE TARGETS (Common) ---
    let currentCombo = 0;
    
    targetsRef.current = targetsRef.current.filter(target => {
        target.timeLeft -= dt;
        return target.timeLeft > 0;
    });

    // --- UPDATE PARTICLES (Common) ---
    setParticles(prevParticles => {
      const activeObstacles = obstaclesRef.current;
      const activeTargets = targetsRef.current;
      const newParticlesToAdd: Particle[] = [];

      // Calculate gravity from gyro
      const gx = (gyro.gamma || 0) * SENSITIVITY;
      const gy = ((gyro.beta || 0) - 45) * SENSITIVITY;

      const updatedParticles = prevParticles.map(p => {
        let { x, y, vx, vy } = p;
        const radius = p.size / 2;
        const centerX = x + radius;
        const centerY = y + radius;

        // Apply gravity
        vx += gx * 0.05;
        vy += gy * 0.05;

        // Apply damping
        vx *= DAMPING;
        vy *= DAMPING;

        // --- OBSTACLE COLLISION (Repel) ---
        activeObstacles.forEach(obs => {
          if (obs.radius < 5) return;
          const dx = centerX - obs.x;
          const dy = centerY - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = radius + obs.radius; 

          if (dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            x += nx * overlap;
            y += ny * overlap;
            const dot = vx * nx + vy * ny;
            vx = vx - 2 * dot * nx;
            vy = vy - 2 * dot * ny;
            vx *= 0.9;
            vy *= 0.9;
          }
        });

        // --- TARGET INTERACTION ---
        activeTargets.forEach(tgt => {
            const dx = centerX - tgt.x;
            const dy = centerY - tgt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < tgt.radius) {
                // For onboarding, we don't check strict emoji match if only 1 exists
                if (p.emoji === tgt.emoji || isOnboarding) {
                    currentCombo++;
                    scoreRef.current += (0.1 * difficultyMultiplier);
                    tgt.matchedDuration += dt;
                    
                    // Trigger Logic
                    if (tgt