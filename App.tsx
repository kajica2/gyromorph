import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import ImageUploader from './components/ImageUploader';
import DistortionView from './components/DistortionView';
import { ModelLibrary } from './components/ModelLibrary';
import { AuthOverlay } from './components/AuthOverlay';
import { useGyroscope } from './hooks/useGyroscope';
import { analyzeImage } from './services/geminiService';
import { supabase, getCurrentUser, uploadUserFile } from './services/supabase';
import { AnalysisResult } from './types';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // New Assets
  const [modelSrc, setModelSrc] = useState<string | undefined>(undefined);
  const [bgVideoSrc, setBgVideoSrc] = useState<string | undefined>(undefined);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Onboarding & Difficulty State
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [difficultyMultiplier, setDifficultyMultiplier] = useState<number>(1.0);

  // Destructure isAutoMode from the hook
  const { data: gyroData, requestAccess, permissionGranted, isAutoMode } = useGyroscope();

  useEffect(() => {
    // Auth Subscription
    getCurrentUser().then(setUser);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsAuthOpen(false);
    });

    const storedOnboarded = localStorage.getItem('gyromorph_onboarded');
    const storedDifficulty = localStorage.getItem('gyromorph_difficulty');
    
    if (storedOnboarded === 'true') {
      setIsOnboarded(true);
    }
    if (storedDifficulty) {
      setDifficultyMultiplier(parseFloat(storedDifficulty));
    }

    return () => subscription.unsubscribe();
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

  const handleImageSelect = async (base64: string, file?: File) => {
    setImageSrc(base64);

    if (user && file) {
      console.log('Uploading user file...');
      uploadUserFile(file, user.id, 'images')
        .then(url => console.log('File saved:', url))
        .catch(err => console.error('Upload failed:', err));
    }

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
    setIsLibraryOpen(false);
  };

  const handleLibrarySelect = (url: string) => {
    handleAssetsSelect(url);
    setIsLibraryOpen(false);
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
    <>
      <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <ImageUploader 
        onImageSelect={handleImageSelect} 
        onVideoSelect={handleVideoSelect}
        onAssetsSelect={handleAssetsSelect}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        isLoading={isAnalyzing}
        user={user}
        onLoginClick={() => setIsAuthOpen(true)}
      />
      <ModelLibrary 
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </>
  );
};

export default App;