import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GyroData, AnalysisResult, Particle } from '../types';
import { audio } from '../utils/audio';
import { SponsorFooter } from './SponsorFooter';
import { Scene3D } from './Scene3D';

interface DistortionViewProps {
  imageSrc?: string; // Optional now, as we might just have a model
  videoSrc?: string; // New: Background Video
  modelSrc?: string; // New: 3D Model
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
  radiusVelocity: number; 
}

interface TargetZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  emoji: string;
  timeLeft: number; 
  maxTime: number;
  matchedDuration: number; 
  rewardClaimed: boolean;
}

const DistortionView: React.FC<DistortionViewProps> = ({ 
  imageSrc, 
  videoSrc,
  modelSrc,
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
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  
  // Game State
  const [particles, setParticles] = useState<Particle[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [targets, setTargets] = useState<TargetZone[]>([]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [shaderSeed, setShaderSeed] = useState<number>(0);
  
  // Onboarding Specific State
  const [calibrationText, setCalibrationText] = useState<string>("");

  // Refs for loop
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const targetsRef = useRef<TargetZone[]>([]);
  const nextSpawnTimeRef = useRef<number>(0);
  const nextObstacleRotationTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const lastHitSoundTimeRef = useRef<number>(0);
  
  // Onboarding Refs
  const onboardingStepRef = useRef<number>(0); 
  const onboardingStartTimeRef = useRef<number>(0);
  const hasOnboardingFinishedRef = useRef<boolean>(false);

  // Physics Constants (Affected by Difficulty)
  const DAMPING = 0.98;
  const SENSITIVITY = 0.8 * (isOnboarding ? 0.6 : difficultyMultiplier); 
  const TARGET_LIFESPAN = 5000;
  const OBSTACLE_ROTATION_MS = 7000;

  // --- RANDOMIZED SHADER VARIATIONS ---
  const shaderVars = useMemo(() => ({
      liquidFreqX: (0.005 + Math.random() * 0.015).toFixed(4),
      liquidFreqY: (0.01 + Math.random() * 0.04).toFixed(4),
      glitchFreq: (0.3 + Math.random() * 0.6).toFixed(2),
      warpFreq: (0.002 + Math.random() * 0.008).toFixed(4),
      octaves: 2 + Math.floor(Math.random() * 2),
      seedOffset: Math.floor(Math.random() * 10000)
  }), [shaderSeed]);

  const handleRefreshShaders = () => {
    setShaderSeed(prev => prev + 1);
    audio.playSpawn();
  };

  // Initialize Audio & Cleanup
  useEffect(() => {
    const initAudio = () => audio.resume();
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
    return () => {
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
      audio.stopTension(); 
    };
  }, []);

  // Handle Stream
  useEffect(() => {
    if (videoStream && videoRef.current) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.play().catch(e => console.error("Video play failed", e));
    }
  }, [videoStream]);

  // Handle Background Looping Video
  useEffect(() => {
    if (videoSrc && bgVideoRef.current) {
        bgVideoRef.current.play().catch(e => console.error("BG Video play failed", e));
    }
  }, [videoSrc]);
  
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

    // 1. Create Floating Particles 
    const newParticles: Particle[] = [createParticle('init-0', width / 2 - 20, height / 2 - 20)];
    setParticles(newParticles);
    audio.playSpawn();

    // 2. Create Static Obstacles 
    const newObstacles: Obstacle[] = [];
    
    const obstacleCount = isOnboarding ? 2 : 3; 
    
    for(let i = 0; i < obstacleCount; i++) {
        const r = 40 + Math.random() * 30;
        newObstacles.push({
            id: `obs-init-${i}`,
            x: isOnboarding 
               ? (i === 0 ? width * 0.2 : width * 0.8) 
               : (width * 0.2) + Math.random() * (width * 0.6),
            y: isOnboarding 
               ? (i === 0 ? height * 0.2 : height * 0.8) 
               : (height * 0.2) + Math.random() * (height * 0.6),
            radius: r,
            targetRadius: r,
            isShrinking: false,
            radiusVelocity: 0
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
    const dt = Math.min(time - lastTimeRef.current, 64);
    lastTimeRef.current = time;
    
    const width = window.innerWidth;
    const height = window.innerHeight;

    // --- AUDIO TENSION LFO SYSTEM ---
    const tiltXRaw = gyro.gamma || 0;
    const tiltYRaw = (gyro.beta || 0) - 45;
    const tiltMagnitude = Math.sqrt(tiltXRaw*tiltXRaw + tiltYRaw*tiltYRaw);
    
    const safeZone = 25; 
    const dangerZone = 50; 
    
    let tensionIntensity = 0;
    if (tiltMagnitude > safeZone) {
        tensionIntensity = Math.min((tiltMagnitude - safeZone) / (dangerZone - safeZone), 1);
    }
    audio.updateTension(tensionIntensity);

    // ==========================================
    // ONBOARDING LOGIC
    // ==========================================
    if (isOnboarding && !hasOnboardingFinishedRef.current) {
        const timeSinceStart = time - onboardingStartTimeRef.current;
        if (timeSinceStart > 30000) {
             hasOnboardingFinishedRef.current = true;
             setCalibrationText("TIMEOUT: SKIPPING SETUP");
             setTimeout(() => {
                onOnboardingComplete(0.8); 
             }, 1500);
             return; 
        }

        if (targetsRef.current.length === 0) {
            const step = onboardingStepRef.current;
            const radius = 70; 
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
                const totalTime = timeSinceStart;
                
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
                return; 
            }

            if (step < 3) {
                 const newTarget: TargetZone = {
                    id: `calib-${step}`,
                    x: tx,
                    y: ty,
                    radius: radius,
                    emoji: analysis.elements[0], 
                    timeLeft: 999999,
                    maxTime: 999999,
                    matchedDuration: 0,
                    rewardClaimed: false
                };
                targetsRef.current = [newTarget];
                setTargets([newTarget]);
                audio.playSpawn(); 
            }
        }
    } 
    // ==========================================
    // NORMAL GAME LOGIC
    // ==========================================
    else {
        setCalibrationText(""); 

        if (!nextObstacleRotationTimeRef.current) nextObstacleRotationTimeRef.current = time + OBSTACLE_ROTATION_MS;

        // --- OBSTACLE ROTATION ---
        if (time > nextObstacleRotationTimeRef.current) {
            const candidates = obstaclesRef.current.filter(o => !o.isShrinking);
            if (candidates.length > 0) {
                const toShrink = candidates[Math.floor(Math.random() * candidates.length)];
                toShrink.isShrinking = true;
            }

            const newTargetRadius = 40 + Math.random() * 30;
            const newObs: Obstacle = {
                id: `obs-${time}`,
                x: (width * 0.1) + Math.random() * (width * 0.8),
                y: (height * 0.1) + Math.random() * (height * 0.8),
                radius: 1, 
                targetRadius: newTargetRadius,
                isShrinking: false,
                radiusVelocity: 0
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
                timeLeft: TARGET_LIFESPAN / difficultyMultiplier, 
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
                audio.playSpawn();
                const spawnDelay = (3000 + Math.random() * 2000) / difficultyMultiplier; 
                nextSpawnTimeRef.current = time + spawnDelay;
            }
        }
    }

    // --- ANIMATE OBSTACLE SIZES ---
    obstaclesRef.current = obstaclesRef.current.map(obs => {
        const tension = 0.0004; 
        const friction = 0.012; 

        if (obs.isShrinking) {
            obs.radius -= 0.15 * dt; 
        } else {
            const displacement = obs.targetRadius - obs.radius;
            const acceleration = displacement * tension;
            obs.radiusVelocity += acceleration * dt;
            obs.radiusVelocity *= (1 - Math.min(friction * dt, 0.5));
            obs.radius += obs.radiusVelocity * dt;
        }
        return obs;
    }).filter(obs => obs.radius > 0);

    // --- UPDATE TARGETS ---
    let currentCombo = 0;
    targetsRef.current = targetsRef.current.filter(target => {
        target.timeLeft -= dt;
        return target.timeLeft > 0;
    });

    // --- UPDATE PARTICLES ---
    setParticles(prevParticles => {
      const activeObstacles = obstaclesRef.current;
      const activeTargets = targetsRef.current;
      const newParticlesToAdd: Particle[] = [];

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
        vx *= DAMPING;
        vy *= DAMPING;

        // --- OBSTACLE COLLISION ---
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
            
            if (time - lastHitSoundTimeRef.current > 100) {
                const intensity = Math.min(Math.sqrt(vx*vx + vy*vy) / 10, 1);
                audio.playHit(intensity);
                lastHitSoundTimeRef.current = time;
            }
          }
        });

        // --- TARGET INTERACTION ---
        activeTargets.forEach(tgt => {
            const dx = centerX - tgt.x;
            const dy = centerY - tgt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < tgt.radius) {
                if (p.emoji === tgt.emoji || isOnboarding) {
                    currentCombo++;
                    scoreRef.current += (0.1 * difficultyMultiplier);
                    tgt.matchedDuration += dt;
                    
                    if (tgt.matchedDuration > 500 && !tgt.rewardClaimed) {
                        tgt.rewardClaimed = true;
                        audio.playMatch();
                        
                        if (isOnboarding) {
                            onboardingStepRef.current += 1;
                            targetsRef.current = []; 
                            scoreRef.current += 500;
                        } else {
                            newParticlesToAdd.push(createParticle(`spawn-${Date.now()}-${Math.random()}`, centerX, centerY));
                            scoreRef.current += 100 * difficultyMultiplier;
                            audio.playSpawn();
                        }
                    }
                }
            }
        });

        // --- WALL COLLISION ---
        let wallHit = false;
        if (x < 0) { x = 0; vx *= -0.8; wallHit = true; }
        if (x > width - p.size) { x = width - p.size; vx *= -0.8; wallHit = true; }
        if (y < 0) { y = 0; vy *= -0.8; wallHit = true; }
        if (y > height - p.size) { y = height - p.size; vy *= -0.8; wallHit = true; }
        
        if (wallHit && time - lastHitSoundTimeRef.current > 150) {
            audio.playHit(0.5); 
            lastHitSoundTimeRef.current = time;
        }

        x += vx;
        y += vy;

        return { ...p, x, y, vx, vy };
      });

      return [...updatedParticles, ...newParticlesToAdd];
    });

    if (currentCombo >= 2) scoreRef.current += 0.2 * currentCombo;
    
    setScore(Math.floor(scoreRef.current));
    setCombo(currentCombo);
    setTargets([...targetsRef.current]); 
    setObstacles([...obstaclesRef.current]); 

    if (!hasOnboardingFinishedRef.current || !isOnboarding) {
        requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gyro, isOnboarding]);

  const tiltX = (gyro.gamma || 0) / 2;
  const tiltY = ((gyro.beta || 0) - 45) / 2;
  const displacementScale = Math.min(Math.abs(gyro.gamma) + Math.abs(gyro.beta - 45), 100) * 2;
  const seed = Math.floor((gyro.alpha || 0) / 10) + shaderVars.seedOffset;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black touch-none font-sans">
      <style>{`
        @keyframes edge-pulse {
          0%, 100% { box-shadow: inset 0 0 50px 20px #000; opacity: 0.8; }
          50% { box-shadow: inset 0 0 120px 60px #000; opacity: 1; }
        }
        @keyframes spawn-ring {
          0% { transform: scale(0.8); opacity: 1; border-width: 4px; }
          100% { transform: scale(1.4); opacity: 0; border-width: 0px; }
        }
      `}</style>

      {/* SVG Filters */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="liquidFilter">
            <feTurbulence type="fractalNoise" baseFrequency={`${shaderVars.liquidFreqX} ${shaderVars.liquidFreqY}`} numOctaves={shaderVars.octaves} result="warp" seed={seed} />
            <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale={displacementScale} in="SourceGraphic" in2="warp" />
          </filter>
          <filter id="glitchFilter">
             <feTurbulence type="turbulence" baseFrequency={shaderVars.glitchFreq} numOctaves={shaderVars.octaves} result="turbulence" seed={seed} />
             <feDisplacementMap in2="turbulence" in="SourceGraphic" scale={displacementScale / 2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="warpFilter">
            <feTurbulence type="fractalNoise" baseFrequency={shaderVars.warpFreq} numOctaves={shaderVars.octaves} result="noise" seed={seed} />
             <feDisplacementMap in="SourceGraphic" in2="noise" scale={displacementScale * 1.5} xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>

      {/* BACKGROUND LAYER: Video or Image */}
      <div 
        className="absolute inset-0 flex items-center justify-center transition-transform duration-100 ease-linear will-change-transform z-0"
        style={{
          transform: `perspective(1000px) rotateY(${tiltX}deg) rotateX(${-tiltY}deg) scale(1.1)`,
        }}
      >
        {videoStream ? (
            <video 
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{
                  filter: `url(#${analysis.distortionType}Filter)`,
                  transform: 'scale(1.2)'
                }}
                muted
                playsInline
                autoPlay
            />
        ) : videoSrc ? (
            <video 
                ref={bgVideoRef}
                src={videoSrc}
                className="w-full h-full object-cover opacity-60"
                style={{
                  filter: `url(#${analysis.distortionType}Filter)`,
                  transform: 'scale(1.2)'
                }}
                muted
                loop
                playsInline
                autoPlay
            />
        ) : (
            <img 
              src={imageSrc} 
              alt="Distorted"
              className="w-full h-full object-cover"
              style={{
                filter: `url(#${analysis.distortionType}Filter)`,
                transform: 'scale(1.2)'
              }}
            />
        )}
      </div>

      {/* GRADIENT OVERLAY */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-40 z-10"
        style={{
          background: `radial-gradient(circle at ${50 + tiltX}% ${50 + tiltY}%, ${analysis.colorHex}, transparent 70%)`
        }}
      />

      {/* 3D MODEL LAYER (Above BG, Below UI) */}
      {modelSrc && (
         <Scene3D modelUrl={modelSrc} gyro={gyro} />
      )}
      
      {/* VIGNETTE */}
      <div 
        className="absolute inset-0 pointer-events-none z-40"
        style={{ animation: 'edge-pulse 4s ease-in-out infinite' }}
      />

      {/* OBSTACLES */}
      {obstacles.map(obs => (
        <div
            key={obs.id}
            className="absolute flex items-center justify-center pointer-events-none z-30"
            style={{
                left: obs.x - obs.radius,
                top: obs.y - obs.radius,
                width: obs.radius * 2,
                height: obs.radius * 2,
                color: analysis.colorHex,
                filter: `drop-shadow(0 0 10px ${analysis.colorHex})`,
                opacity: obs.isShrinking ? 0.7 : 0.9,
                transition: 'opacity 0.2s'
            }}
        >
             {!obs.isShrinking && (
                <div 
                    className="absolute inset-0 rounded-full border-white border-solid pointer-events-none"
                    style={{ animation: 'spawn-ring 0.6s ease-out forwards' }}
                ></div>
             )}

             <svg 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="w-full h-full animate-[spin_4s_linear_infinite] opacity-90"
             >
                 <path d="M12.9,2.1c-0.8-0.1-1.7-0.1-2.6,0.1C5.6,3.3,2,7.7,2.1,12.5c0.1,4.7,3.6,8.8,8.3,9.7c0.8,0.2,1.7,0.2,2.5,0.1 c4.7-1,8.3-5.5,8.1-10.2c0-0.6-0.1-1.3-0.3-1.9L20,9.9c0.2,0.8,0.3,1.6,0.2,2.4c0.2,4.8-3.4,9.2-8.2,10.2 c-4.8,1-9.4-2.2-10.4-7c-1-4.8,2.2-9.4,7-10.4c3.2-0.7,6.4,0.6,8.5,3.1l1.5-1.4C16.2,3.9,12.9,2.1,12.9,2.1z M14.3,6.8 c-0.5-0.1-1-0.1-1.5,0c-3.8,0.8-6.3,4.4-5.5,8.2c0.8,3.8,4.4,6.3,8.2,5.5c2.3-0.5,4.2-2.1,5-4.2l-1.9-0.7 c-0.5,1.5-1.8,2.6-3.4,2.9c-2.7,0.6-5.3-1.2-5.9-3.9c-0.6-2.7,1.2-5.3,3.9-5.9c1.9-0.4,3.8,0.5,4.8,2.1l1.7-1.1 C18.3,8.1,16.4,6.8,14.3,6.8z" />
             </svg>
        </div>
      ))}

      {/* TARGETS */}
      {targets.map(tgt => {
          const progress = tgt.timeLeft / tgt.maxTime; 
          const dashOffset = 2 * Math.PI * (tgt.radius - 4) * (1 - progress);
          
          return (
            <div
                key={tgt.id}
                className="absolute rounded-full pointer-events-none flex items-center justify-center z-30"
                style={{
                    left: tgt.x - tgt.radius,
                    top: tgt.y - tgt.radius,
                    width: tgt.radius * 2,
                    height: tgt.radius * 2
                }}
            >
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="50%" cy="50%" r={tgt.radius - 4}
                        fill={tgt.rewardClaimed ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.5)"}
                        stroke={analysis.colorHex}
                        strokeWidth="2"
                        strokeDasharray="4, 4"
                        className="opacity-30"
                    />
                    <circle
                        cx="50%" cy="50%" r={tgt.radius - 4}
                        fill="none"
                        stroke={tgt.rewardClaimed ? "#ffffff" : analysis.colorHex}
                        strokeWidth={tgt.rewardClaimed ? "4" : "3"}
                        strokeDasharray={2 * Math.PI * (tgt.radius - 4)}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-75 linear"
                        style={{ filter: 'drop-shadow(0 0 4px white)' }}
                    />
                </svg>
                
                <div className="relative z-10 flex flex-col items-center animate-pulse">
                    <span className="text-3xl filter drop-shadow-md transform hover:scale-110 transition-transform">{tgt.emoji}</span>
                </div>
            </div>
          );
      })}

      {/* PARTICLES */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute select-none pointer-events-none will-change-transform z-30"
          style={{
            transform: `translate3d(${p.x}px, ${p.y}px, 50px)`,
            fontSize: `${p.size}px`,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* ONBOARDING */}
      {isOnboarding && (
         <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-[100]">
            <div className="mt-64 bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-center animate-pulse">
                <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1">
                   {calibrationText}
                </h2>
                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-white transition-all duration-300" 
                        style={{ width: `${(Math.min(onboardingStepRef.current, 3) / 3) * 100}%`}}
                    ></div>
                </div>
            </div>
         </div>
      )}

      {/* HUD / UI */}
      {!isOnboarding && (
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-white drop-shadow-lg leading-none" style={{ color: analysis.colorHex }}>
            {analysis.theme}
          </h1>
          <div className="mt-2 flex flex-col items-start gap-1">
              <div className="flex items-center gap-4">
                  <div className="bg-white/10 backdrop-blur border border-white/20 px-3 py-1 rounded-md">
                     <span className="text-xs text-gray-400 font-bold mr-2">XP</span>
                     <span className="text-xl font-mono text-white">{score}</span>
                  </div>
                  {combo > 1 && (
                     <div className="animate-bounce text-yellow-400 font-black italic text-xl drop-shadow-glow">
                        {combo}x COMBO!
                     </div>
                  )}
              </div>
          </div>
        </div>
        <div className="flex gap-3">
            <button
                onClick={handleRefreshShaders}
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full p-3 active:scale-90 transition-all hover:bg-white/20"
                title="Remix Distortion"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            </button>
            <button 
              onClick={onBack}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full p-3 active:scale-90 transition-all hover:bg-red-500/20 hover:border-red-500/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
        </div>
      </div>
      )}

      {/* BRANDING FOOTER */}
      <div className="absolute bottom-0 left-0 right-0 z-[60]">
        <SponsorFooter />
      </div>

    </div>
  );
};

export default DistortionView;