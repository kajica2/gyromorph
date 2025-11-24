import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const MobileGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState<boolean>(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }

    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|iPad|iPhone|iPod/i.test(userAgent);
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;

      // Consider it mobile if it identifies as mobile OS, or has touch AND is small screen
      setIsMobile(isMobileDevice || (isTouch && isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-8 text-center">
        <div className="max-w-md space-y-8 relative z-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              GYRO<br/>MORPH
            </h1>
            <p className="text-xl font-light text-gray-300">
              Mobile Experience Required
            </p>
          </div>
          
          <p className="text-gray-400">
            This experience uses your device's gyroscope to distort reality. 
            Please open it on your smartphone.
          </p>
          
          <div className="bg-white p-4 rounded-2xl shadow-2xl mx-auto w-fit animate-in fade-in zoom-in duration-500">
            {currentUrl && (
              <QRCodeSVG 
                value={currentUrl} 
                size={180}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          <p className="text-xs text-gray-600 font-mono">
            SCAN TO PLAY
          </p>
        </div>

        {/* Background ambiance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] -z-10" />
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileGuard;

