import { useState, useEffect, useCallback, useRef } from 'react';
import { GyroData } from '../types';

export const useGyroscope = () => {
  const [data, setData] = useState<GyroData>({ alpha: 0, beta: 0, gamma: 0 });
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(false);

  // Refs for raw data and timing to be used inside the animation loop
  const rawDataRef = useRef<GyroData>({ alpha: 0, beta: 0, gamma: 0 });
  const lastMoveTimeRef = useRef<number>(Date.now());
  const rafRef = useRef<number>();

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const alpha = event.alpha || 0;
    const beta = event.beta || 0;
    const gamma = event.gamma || 0;

    // Check magnitude of change to detect user interaction vs sensor noise
    const prev = rawDataRef.current;
    const dBeta = Math.abs(beta - prev.beta);
    const dGamma = Math.abs(gamma - prev.gamma);
    
    // Update raw data storage
    rawDataRef.current = { alpha, beta, gamma };

    // Reset auto-mode timer if significant movement detected (> 0.5 degrees)
    // We primarily check Beta/Gamma as they control the main tilt effects
    if (dBeta > 0.5 || dGamma > 0.5) {
        lastMoveTimeRef.current = Date.now();
    }
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Simulate gyro with mouse on desktop
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Map mouse X to Gamma (-45 to 45)
    const gamma = ((event.clientX / width) - 0.5) * 90;
    // Map mouse Y to Beta (-45 to 45, centered around 45 tilt usually)
    const beta = ((event.clientY / height) - 0.5) * 90 + 45; 

    rawDataRef.current = {
      alpha: 0,
      beta,
      gamma,
    };
    lastMoveTimeRef.current = Date.now(); // Mouse movement counts as interaction
  }, []);

  const requestAccess = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const state = await (DeviceOrientationEvent as any).requestPermission();
        if (state === 'granted') {
          setPermissionGranted(true);
        } else {
          alert('Gyroscope permission denied. Visuals will be static.');
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      // Non-iOS devices usually allow it by default or don't support the API the same way
      setPermissionGranted(true);
    }
  };

  // Main Loop: Decides whether to use Raw Sensor Data or Auto-Generated Data
  useEffect(() => {
    const loop = () => {
        const now = Date.now();
        const timeSinceInteraction = now - lastMoveTimeRef.current;

        if (timeSinceInteraction > 2000) {
            // AUTO MODE: User has been still for 2s.
            // Generate smooth "Patx Axis" movement (Lissajous-like figures)
            const t = now * 0.0008; // Speed factor
            
            setIsAutoMode(true);
            setData({
                alpha: (t * 10) % 360,
                beta: 45 + Math.sin(t * 2.1) * 20, // Oscillate around 45 degrees
                gamma: Math.cos(t * 1.5) * 25      // Oscillate Left/Right
            });
        } else {
            // MANUAL MODE: User is moving.
            setIsAutoMode(false);
            setData(rawDataRef.current);
        }

        rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Event Listeners setup
  useEffect(() => {
    // Check if device orientation is supported
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      return;
    }

    // Desktop fallback
    const isDesktop = !('ontouchstart' in window);
    if (isDesktop) {
        setPermissionGranted(true); // Auto grant on desktop to use mouse simulation
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }

    if (permissionGranted) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionGranted, handleOrientation, handleMouseMove]);

  return { data, requestAccess, permissionGranted, isSupported, isAutoMode };
};