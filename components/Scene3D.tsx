import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';

interface ModelProps {
  url: string;
  scale?: number;
  position?: [number, number, number];
}

const Model: React.FC<ModelProps> = ({ url, scale = 1, position = [0, 0, 0] }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={scale} position={position} />;
};

const PlaceholderBox = () => (
  <mesh rotation={[0.5, 0.5, 0]}>
    <boxGeometry args={[2, 2, 2]} />
    <meshStandardMaterial color="#6366f1" wireframe />
  </mesh>
);

interface Scene3DProps {
  modelUrl?: string;
}

const Scene3D: React.FC<Scene3DProps> = ({ modelUrl }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-48 z-10 pointer-events-none opacity-50 mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Suspense fallback={null}>
          {modelUrl ? <Model url={modelUrl} /> : <PlaceholderBox />}
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
};

export default Scene3D;

