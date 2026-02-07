
import React, { useState, useRef, useEffect } from 'react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ beforeImage, afterImage }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
    const offset = Math.max(0, Math.min(x - rect.left, rect.width));
    const percent = (offset / rect.width) * 100;
    setSliderPos(percent);
  };

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', () => setIsDragging(false));
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video md:aspect-[16/9] overflow-hidden rounded-xl shadow-2xl bg-gray-200 cursor-col-resize select-none group"
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
    >
      {/* Before Image */}
      <img 
        src={beforeImage} 
        alt="Original Room" 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* After Image Container (Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
          src={afterImage} 
          alt="Reimagined Room" 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPos / 100)}%` }} // Counter the container squeeze logic if needed, but simple width:100% on image often works if the image is scaled correctly
        />
        {/* We need to ensure the image doesn't scale with the container width change */}
        <div className="absolute inset-0 w-[100vw] h-full">
            <img 
                src={afterImage} 
                alt="Reimagined Room" 
                className="w-full h-full object-cover"
                style={{ width: containerRef.current?.clientWidth || '100%' }}
            />
        </div>
      </div>

      {/* Slider Bar */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-indigo-500">
          <i className="fa-solid fa-arrows-left-right text-indigo-600 text-sm"></i>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
        Reimagined
      </div>
      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
        Original
      </div>
    </div>
  );
};

export default ComparisonSlider;
