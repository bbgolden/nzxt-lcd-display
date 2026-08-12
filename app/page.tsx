"use client";

import { useEffect, useState } from 'react';
import CustomKrakenImage from '@/components/CustomKrakenImage';

export default function KrakenDisplayPage() {
  const [dimensions, setDimensions] = useState({ width: '100vw', height: '100vh' });
  const [isCircle, setIsCircle] = useState(false);

  useEffect(() => {
    // Safely check for NZXT CAM's injected hardware hooks on mount
    if (typeof window !== 'undefined' && (window as any).nzxt?.v1) {
      const kraken = (window as any).nzxt.v1;
      setDimensions({
        width: `${kraken.width}px`,
        height: `${kraken.height}px`,
      });
      if (kraken.shape === 'circle') {
        setIsCircle(true);
      }
    }
  }, []);

  return (
    <main className="w-full h-full flex justify-center items-center">
      {/* 
        This wrapper container strictly dictates the boundaries 
        of the physical screen. Flex centering forces it into 
        the exact horizontal and vertical middle.
      */}
      <div 
        className="relative flex justify-center items-center overflow-hidden"
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
          borderRadius: isCircle ? '50%' : '0%' 
        }}
      >
        <CustomKrakenImage />
      </div>
    </main>
  );
}
