import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
  onVideoSelect?: (stream: MediaStream, base64Frame: string) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, onVideoSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        onImageSelect(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  const handleDemoSelect = async () => {
    setIsDemoLoading(true);
    try {
      // Use a high-quality abstract cyberpunk image from Unsplash
      const response = await fetch('https://images.unsplash.com/photo-1614850523060-8da1d56ae167?q=80&w=800&auto=format&fit=crop', {
        mode: 'cors'
      });
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setIsDemoLoading(false);
        if (typeof reader.result === 'string') {
          onImageSelect(reader.result);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to load demo image:", error);
      alert("Could not load preset image. Please check your internet connection.");
      setIsDemoLoading(false);
    }
  };

  const handleCameraStart = async () => {
    if (!onVideoSelect) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      // We need to capture one frame to send to Gemini for analysis
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.play();
      
      video.onloadeddata = () => {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          // Pass both the live stream and the still frame
          onVideoSelect(stream, base64);
        }
        
        // Clean up the temp video element, but keep stream active
        video.pause();
        video.srcObject = null;
        video.remove();
      };

    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-6 relative overflow-hidden">
      {/* Main Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop" 
          alt="Background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/50 to-neutral-950/90"></div>
      </div>

      {/* Background Effects - Kept for atmosphere */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob z-0"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 z-0"></div>

      <div className="z-10 text-center space-y-8 max-w-md w-full relative">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 drop-shadow-lg">
            GYRO<br/>MORPH
          </h1>
          <p className="text-gray-300 font-light drop-shadow-md">
            Reality is subjective. <br/> Capture it, then break it.
          </p>
        </div>

        <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
               <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <span className="text-sm font-mono text-blue-400 animate-pulse">ANALYZING REALITY...</span>
            </div>
          ) : (
            <div className="space-y-4">
               <button 
                onClick={triggerInput}
                className="w-full group relative overflow-hidden rounded-xl bg-white text-black font-bold py-4 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <span className="flex items-center justify-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                      <path fillRule="evenodd" d="M9.344 3.071a4.988 4.988 0 015.312 0c.21.166.417.358.614.575.194.213.423.428.675.61a2.99 2.99 0 001.77.575h2.03a3.992 3.992 0 014 4v9a3.992 3.992 0 01-4 4h-13a3.992 3.992 0 01-4-4v-9a3.992 3.992 0 014-4h2.03c.662 0 1.293-.232 1.77-.575.253-.182.482-.397.676-.61a4.98 4.98 0 01.613-.575z" clipRule="evenodd" />
                   </svg>
                   UPLOAD PHOTO
                </span>
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold tracking-widest drop-shadow-sm">QUICK START</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleDemoSelect}
                  disabled={isDemoLoading}
                  className="rounded-xl bg-white/5 text-white font-medium py-3 border border-white/10 hover:bg-white/10 transition-all text-[10px] tracking-wider flex flex-col items-center justify-center gap-2 hover:border-white/20 h-20 backdrop-blur-sm"
                >
                  {isDemoLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                      <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 opacity-70">
                              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                          </svg>
                          PRESET BG
                      </>
                  )}
                </button>

                <button 
                  onClick={handleCameraStart}
                  className="rounded-xl bg-white/5 text-white font-medium py-3 border border-white/10 hover:bg-white/10 transition-all text-[10px] tracking-wider flex flex-col items-center justify-center gap-2 hover:border-white/20 h-20 backdrop-blur-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 opacity-70">
                      <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                    </svg>
                    LIVE CAMERA
                </button>
              </div>

              <p className="text-xs text-gray-400 uppercase tracking-widest pt-2">
                Powered by Gemini 2.5 Flash
              </p>
            </div>
          )}
        </div>
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default ImageUploader;
