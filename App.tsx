import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import DistortionView from './components/DistortionView';
import { useGyroscope } from './hooks/useGyroscope';
import { analyzeImage } from './services/geminiService';
import { AnalysisResult } from './types';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // New Assets
  const [modelSrc, setModelSrc] = useState<string | undefined>(undefined);
  const [bgVideoSrc, setBgVideoSrc] = useState<string | undefined>(undefined);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Onboarding & Difficulty State
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [difficultyMultiplier, setDifficultyMultiplier] = useState<number>(1.0);

  // Destructure isAutoMode from the hook
  const { data: gyroData, requestAccess, permissionGranted, isAutoMode } = useGyroscope();

  useEffect(() => {
    const storedOnboarded = localStorage.getItem('gyromorph_onboarded');
    const storedDifficulty = localStorage.getItem('gyromorph_difficulty');
    
    if (storedOnboarded === 'true') {
      setIsOnboarded(true);
    }
    if (storedDifficulty) {
      setDifficultyMultiplier(parseFloat(storedDifficulty));
    }
  }, []);

  const handleAnalysis = async (base64Image: string) => {
    setIsAnalyzing(true);
    if (!permissionGranted) {
       await requestAccess();
    }
    try {
      const result = await analyzeImage(base64Image);
      setAnalysis(result);
    } catch (error) {
       // Mock fallback if asset analysis fails (e.g. if we uploaded a GLB first and just used a mock BG)
       setAnalysis({
         theme: "Holographic Layer",
         elements: ["👾", "🧊", "🌌", "⚡", "💠"],
         distortionType: "glitch",
         colorHex: "#00ccff"
       });
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleImageSelect = async (base64: string) => {
    setImageSrc(base64);
    await handleAnalysis(base64);
  };

  const handleVideoSelect = (stream: MediaStream, base64Frame: string) => {
    setVideoStream(stream);
    // Reuse analysis logic with the captured frame
    handleImageSelect(base64Frame);
  };

  // New Handler for multi-asset upload
  const handleAssetsSelect = async (newModelUrl?: string, newBgVideoUrl?: string, newBgImgBase64?: string) => {
      if (newModelUrl) setModelSrc(newModelUrl);
      if (newBgVideoUrl) setBgVideoSrc(newBgVideoUrl);
      
      // If we are adding assets but haven't analyzed a theme yet, we need a "seed" image to analyze
      // If the user uploaded a GLB but no image, we might need to trigger a default analysis or wait for image
      // For now, if we have a model but no analysis, we trigger a mock analysis to enter the view
      if (!analysis) {
        setIsAnalyzing(true);
        // Wait a small tick
        setTimeout(() => {
            setAnalysis({
                theme: "3D Motion Link",
                elements: ["🤖", "✨", "📡", "🛸", "💾"],
                distortionType: "warp",
                colorHex: "#bf00ff"
            });
            setIsAnalyzing(false);
            if (!permissionGranted) requestAccess();
        }, 1500);
      }
  };

  const handleReset = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setImageSrc(null);
    setAnalysis(null);
    setModelSrc(undefined);
    setBgVideoSrc(undefined);
  };

  const handleOnboardingComplete = (calculatedDifficulty: number) => {
    localStorage.setItem('gyromorph_onboarded', 'true');
    localStorage.setItem('gyromorph_difficulty', calculatedDifficulty.toString());
    setDifficultyMultiplier(calculatedDifficulty);
    setIsOnboarded(true);
  };
  
  if (analysis) {
    return (
      <DistortionView 
        imageSrc={imageSrc || undefined} 
        videoSrc={bgVideoSrc}
        modelSrc={modelSrc}
        videoStream={videoStream || undefined}
        gyro={gyroData} 
        analysis={analysis}
        onBack={handleReset}
        isOnboarding={!isOnboarded}
        difficultyMultiplier={difficultyMultiplier}
        onOnboardingComplete={handleOnboardingComplete}
        isAutoMode={isAutoMode}
      />
    );
  }

  return (
    <ImageUploader 
      onImageSelect={handleImageSelect} 
      onVideoSelect={handleVideoSelect}
      onAssetsSelect={handleAssetsSelect}
      isLoading={isAnalyzing}
    />
  );
};

export default App;