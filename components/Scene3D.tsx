import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { GyroData } from '../types';

interface Scene3DProps {
  modelUrl: string;
  gyro: GyroData;
}

// Internal component to handle the specific model logic
const Model = ({ url, gyro }: { url: string; gyro: GyroData }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  // Play the first animation found (usually the mocap idle/dance)
  useEffect(() => {
    if (actions && animations.length > 0) {
      const firstAnim = Object.keys(actions)[0];
      actions[firstAnim]?.fadeIn(0.5).play();
    }
    return () => {
      actions && Object.values(actions).forEach((action) => (action as THREE.AnimationAction | null)?.stop());
    };
  }, [actions, animations]);

  // Apply Gyro Data to Model Position/Rotation per frame
  useFrame((state, delta) => {
    if (group.current) {
      // Smooth interpolation for rotation
      // Gamma (Left/Right Tilt) -> Rotation Y
      const targetRotY = (gyro.gamma || 0) * (Math.PI / 180) * 1.5;
      
      // Beta (Front/Back Tilt) -> Rotation X
      // We subtract 45 because phone is usually held at 45deg
      const targetRotX = ((gyro.beta || 0) - 45) * (Math.PI / 180) * 0.5;

      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.1);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.1);

      // "Bounce" Effect based on tilt severity
      // If user tilts hard, model moves to sides
      const targetX = (gyro.gamma || 0) * 0.05;
      const targetY = -1.5 + ((gyro.beta || 0) - 45) * 0.05; // Base Y is -1.5 to fit screen

      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, 0.1);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, 0.1);
    }
  });

  return (
    <group ref={group} dispose={null} position={[0, -1.5, 0]}>
      <primitive object={scene} scale={2} />
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({ modelUrl, gyro }) => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.8} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        
        {/* Environment reflection for metallic textures */}
        <Environment preset="city" />

        {/* Float creates a subtle hovering idle movement independent of Gyro */}
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <Model url={modelUrl} gyro={gyro} />
        </Float>
      </Canvas>
    </div>
  );
};