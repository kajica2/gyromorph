import React, { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import DistortionView from './components/DistortionView';
import FriendOverlay from './components/FriendOverlay';
import Scene3D from './components/Scene3D';
import { useGyroscope } from './hooks/useGyroscope';
import { useRealtimeFriends } from './hooks/useRealtimeFriends';
import { analyzeImage } from './services/geminiService';
import { AnalysisResult } from './types';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Onboarding & Difficulty State
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [difficultyMultiplier, setDifficultyMultiplier] = useState<number>(1.0);

  // Realtime Friends
  const { friends, me, updateStatus } = useRealtimeFriends('lobby');

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

  // Sync status with app state
  useEffect(() => {
    if (isAnalyzing) {
        updateStatus('scanning');
    } else if (imageSrc) {
        updateStatus('morphing');
    } else {
        updateStatus('idle');
    }
  }, [isAnalyzing, imageSrc, updateStatus]);

  const handleImageSelect = async (base64: string) => {
    setIsAnalyzing(true);
    if (!permissionGranted) {
       await requestAccess();
    }

    try {
      setImageSrc(base64);
      const result = await analyzeImage(base64);
      setAnalysis(result);
    } catch (error) {
      console.error("Processing failed", error);
      alert("Failed to process image. Please try again.");
      setImageSrc(null);
      setVideoStream(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVideoSelect = (stream: MediaStream, base64Frame: string) => {
    setVideoStream(stream);
    // Reuse analysis logic with the captured frame
    handleImageSelect(base64Frame);
  };

  const handleReset = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setImageSrc(null);
    setAnalysis(null);
  };

  const handleOnboardingComplete = (calculatedDifficulty: number) => {
    localStorage.setItem('gyromorph_onboarded', 'true');
    localStorage.setItem('gyromorph_difficulty', calculatedDifficulty.toString());
    setDifficultyMultiplier(calculatedDifficulty);
    setIsOnboarded(true);
  };
  
  return (
    <>
      <Scene3D />
      <FriendOverlay friends={friends} me={me} />
      
      {imageSrc && analysis ? (
        <DistortionView 
          imageSrc={imageSrc} 
          videoStream={videoStream || undefined}
          gyro={gyroData} 
          analysis={analysis}
          onBack={handleReset}
          isOnboarding={!isOnboarded}
          difficultyMultiplier={difficultyMultiplier}
          onOnboardingComplete={handleOnboardingComplete}
          isAutoMode={isAutoMode}
        />
      ) : (
        <ImageUploader 
          onImageSelect={handleImageSelect} 
          onVideoSelect={handleVideoSelect}
          isLoading={isAnalyzing}
        />
      )}
    </>
  );
};

export default App;
