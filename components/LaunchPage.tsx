import React from 'react';
import { motion } from 'framer-motion';

interface LaunchPageProps {
  onEnter: () => void;
  themeColor?: string; // Optional dynamic theme color
}

export const LaunchPage: React.FC<LaunchPageProps> = ({ onEnter, themeColor }) => {
  // Use provided theme color or default purple/blue
  const accentColor = themeColor || '#8b5cf6'; // Default purple-500
  const secondaryColor = themeColor ? '#ffffff' : '#3b82f6'; // Default blue-500

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden text-white transition-colors duration-1000"
      style={{
        background: themeColor 
          ? `radial-gradient(circle at 30% 50%, ${themeColor}40, #000000 50%, ${themeColor}20)`
          : 'radial-gradient(circle at 30% 50%, #8b5cf640, #000000 50%, #3b82f620)'
      }}
    >
      {/* Background Ambient Animation - More Intense with Spectrum */}
      <div className="absolute inset-0 z-0">
         <motion.div 
            animate={{ 
              opacity: [0.5, 0.8, 0.5], 
              scale: [1, 1.2, 1],
              rotate: [0, 360]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full blur-[100px]" 
            style={{ 
              backgroundColor: accentColor, 
              opacity: 0.6,
              background: themeColor 
                ? `conic-gradient(from 0deg, ${themeColor}, ${themeColor}80, ${themeColor})`
                : 'conic-gradient(from 0deg, #8b5cf6, #3b82f6, #10b981, #f59e0b, #ef4444, #8b5cf6)'
            }}
         />
         <motion.div 
            animate={{ 
              opacity: [0.4, 0.7, 0.4], 
              scale: [1.1, 1, 1.1],
              rotate: [360, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-5%] w-[70%] h-[70%] rounded-full blur-[100px]" 
            style={{ 
              background: 'conic-gradient(from 0deg, #ec4899, #8b5cf6, #3b82f6, #10b981, #f59e0b, #ec4899)',
              opacity: 0.5 
            }}
         />
         <motion.div 
            animate={{ 
              opacity: [0.3, 0.6, 0.3], 
              x: [0, 50, 0], 
              y: [0, -30, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 30, repeat: Infinity }}
            className="absolute top-[40%] left-[50%] w-[50%] h-[50%] rounded-full blur-[120px]" 
            style={{ 
              background: 'conic-gradient(from 0deg, #06b6d4, #8b5cf6, #ec4899, #f59e0b, #06b6d4)',
              opacity: 0.4 
            }}
         />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-400 to-gray-600">
            GYRO
          </span>
          <br />
          <motion.span 
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="bg-clip-text text-transparent bg-gradient-to-r bg-[length:200%_auto]"
            style={{ backgroundImage: `linear-gradient(to right, ${accentColor}, ${secondaryColor}, ${accentColor})` }}
          >
            MORPH
          </motion.span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 font-light mb-12 leading-relaxed max-w-md">
          Interact with reality through motion.
          <br />
          <span className="text-sm opacity-60">Upload. Distort. Experience.</span>
        </p>

        <button
          onClick={onEnter}
          className="group relative px-12 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
          <span className="relative flex items-center gap-2 tracking-widest">
            ENTER EXPERIENCE
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </span>
        </button>

        <div className="mt-16 flex gap-8 text-gray-600 text-xs tracking-widest uppercase">
          <span>WebXR Ready</span>
          <span>•</span>
          <span>Motion Controls</span>
          <span>•</span>
          <span>Generative AI</span>
        </div>
      </div>
    </div>
  );
};

