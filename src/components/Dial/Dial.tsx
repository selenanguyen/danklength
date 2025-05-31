import React, { useState, useCallback, useEffect, useRef } from 'react';
import './Dial.css';

interface DialProps {
  position: number;
  targetPosition?: number;
  targetWidth?: number;
  showTarget?: boolean;
  onPositionChange: (position: number) => void;
  disabled?: boolean;
}

export const Dial: React.FC<DialProps> = ({
  position,
  targetPosition,
  targetWidth = 20,
  showTarget = false,
  onPositionChange,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.bottom - 4; // Account for border, center at bottom of semicircle
    
    // Calculate vector from center to cursor
    const deltaX = clientX - centerX;
    const deltaY = centerY - clientY; // Flip Y axis (screen coordinates are inverted)
    
    // Calculate angle in radians, then convert to degrees
    let angleRadians = Math.atan2(deltaY, deltaX);
    let angleDegrees = angleRadians * (180 / Math.PI);
    
    // Normalize angle to 0-180 range for semicircle
    // Math.atan2 returns -180 to 180, we want 0 (left) to 180 (right)
    // Where 0° is pointing left (-X), 90° is pointing up (+Y), 180° is pointing right (+X)
    angleDegrees = angleDegrees + 180; // Now 0-360 range with 0° = left
    
    // Clamp to semicircle (0° to 180°)
    if (angleDegrees < 0) angleDegrees = 0;
    if (angleDegrees > 180) angleDegrees = 180;
    
    // Convert to percentage (0% = leftmost, 100% = rightmost)
    const percentage = (angleDegrees / 180) * 100;
    onPositionChange(Math.round(percentage));
  }, [onPositionChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  }, [disabled, updatePosition]);

  const handleDialAreaClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    updatePosition(e.clientX, e.clientY);
  }, [disabled, updatePosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    updatePosition(e.clientX, e.clientY);
  }, [isDragging, disabled, updatePosition]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }, [disabled, updatePosition]);

  const handleDialAreaTouch = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }, [disabled, updatePosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }, [isDragging, disabled, updatePosition]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const getRotation = (pos: number) => (pos / 100) * 180 - 90;
  
  const getTargetZones = () => {
    if (!showTarget || targetPosition === undefined) return null;
    
    const center = targetPosition;
    const halfWidth = targetWidth / 2;
    
    return {
      center: { start: center - halfWidth/3, end: center + halfWidth/3 },
      inner: { start: center - halfWidth*2/3, end: center + halfWidth*2/3 },
      outer: { start: center - halfWidth, end: center + halfWidth }
    };
  };

  const zones = getTargetZones();

  return (
    <div className="dial-container" ref={containerRef}>
      <div 
        className="dial-background"
        onMouseDown={handleDialAreaClick}
        onTouchStart={handleDialAreaTouch}
      >
        {showTarget && zones && (
          <>
            <div 
              className="target-zone outer"
              style={{
                background: `conic-gradient(from 180deg, 
                  transparent ${zones.outer.start * 1.8}deg, 
                  #ffb3b3 ${zones.outer.start * 1.8}deg, 
                  #ffb3b3 ${zones.outer.end * 1.8}deg, 
                  transparent ${zones.outer.end * 1.8}deg)`
              }}
            />
            <div 
              className="target-zone inner"
              style={{
                background: `conic-gradient(from 180deg, 
                  transparent ${zones.inner.start * 1.8}deg, 
                  #e6e6fa ${zones.inner.start * 1.8}deg, 
                  #e6e6fa ${zones.inner.end * 1.8}deg, 
                  transparent ${zones.inner.end * 1.8}deg)`
              }}
            />
            <div 
              className="target-zone center"
              style={{
                background: `conic-gradient(from 180deg, 
                  transparent ${zones.center.start * 1.8}deg, 
                  #4a90e2 ${zones.center.start * 1.8}deg, 
                  #4a90e2 ${zones.center.end * 1.8}deg, 
                  transparent ${zones.center.end * 1.8}deg)`
              }}
            />
          </>
        )}
      </div>
      
      <div className="dial-scale">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className="scale-mark"
            style={{ transform: `rotate(${(i * 18) - 90}deg)` }}
          >
            <div className="scale-number">{i * 10}</div>
          </div>
        ))}
      </div>

      <div
        className={`dial-pointer ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ transform: `rotate(${getRotation(position)}deg)` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />
      
      <div className="dial-center" />
      
      {!disabled && (
        <div className="dial-instructions">
          Click and drag the red dial to set your guess
        </div>
      )}
    </div>
  );
};