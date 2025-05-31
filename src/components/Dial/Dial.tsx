import React, { useState, useCallback, useEffect, useRef } from 'react';
import './Dial.css';

interface DialProps {
  position: number;
  targetPosition?: number;
  targetWidth?: number;
  showTarget?: boolean;
  onPositionChange: (position: number) => void;
  disabled?: boolean;
  hidePointer?: boolean;
  hideForNonPsychic?: boolean;
}

export const Dial: React.FC<DialProps> = ({
  position,
  targetPosition,
  targetWidth = 20,
  showTarget = false,
  onPositionChange,
  disabled = false,
  hidePointer = false,
  hideForNonPsychic = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || disabled) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height; // Bottom center of semicircle
    
    // Calculate vector from center to mouse
    const deltaX = clientX - centerX;
    const deltaY = centerY - clientY; // Flip Y since screen coordinates are inverted
    
    // Calculate angle in radians
    let angleRadians = Math.atan2(deltaY, deltaX);
    
    // Convert to degrees and adjust range
    let angleDegrees = angleRadians * (180 / Math.PI);
    
    // Normalize to 0-180 range (left to right on semicircle)
    if (angleDegrees < 0) angleDegrees += 360;
    if (angleDegrees > 180 && angleDegrees < 360) {
      angleDegrees = angleDegrees > 270 ? 0 : 180;
    }
    
    // Convert angle to percentage (0% = leftmost, 100% = rightmost)
    const percentage = Math.max(0, Math.min(100, (angleDegrees / 180) * 100));
    const newPosition = Math.round(percentage);
    
    onPositionChange(newPosition);
  }, [onPositionChange, disabled]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  }, [disabled, updatePosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    updatePosition(e.clientX, e.clientY);
  }, [isDragging, disabled, updatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }, [disabled, updatePosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }, [isDragging, disabled, updatePosition]);

  const handleTouchEnd = useCallback(() => {
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

  // Convert position (0-100) to rotation angle (-90 to 90 degrees)
  const getRotation = (pos: number) => (pos / 100) * 180 - 90;
  
  const getTargetZones = () => {
    if (!showTarget || targetPosition === undefined) return null;
    
    const center = targetPosition;
    const halfWidth = targetWidth / 2;
    
    const centerWidth = halfWidth / 2.5;
    const innerWidth = halfWidth / 2.5;
    
    return {
      center: { start: Math.max(0, center - centerWidth/2), end: Math.min(100, center + centerWidth/2) },
      leftInner: { start: Math.max(0, center - centerWidth/2 - innerWidth), end: Math.max(0, center - centerWidth/2) },
      rightInner: { start: Math.min(100, center + centerWidth/2), end: Math.min(100, center + centerWidth/2 + innerWidth) },
      leftOuter: { start: Math.max(0, center - halfWidth), end: Math.max(0, center - centerWidth/2 - innerWidth) },
      rightOuter: { start: Math.min(100, center + centerWidth/2 + innerWidth), end: Math.min(100, center + halfWidth) }
    };
  };

  const zones = getTargetZones();

  // Hide entire dial for non-psychic players during psychic phase
  if (hideForNonPsychic) {
    return null;
  }

  return (
    <div className="dial-container" ref={containerRef}>
      <div 
        className="dial-background"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {showTarget && zones && (
          <>
            {/* Target zones */}
            {zones.leftOuter.start < zones.leftOuter.end && (
              <div 
                className="target-zone outer"
                style={{
                  left: `${zones.leftOuter.start}%`,
                  width: `${zones.leftOuter.end - zones.leftOuter.start}%`
                }}
              />
            )}
            {zones.leftInner.start < zones.leftInner.end && (
              <div 
                className="target-zone inner"
                style={{
                  left: `${zones.leftInner.start}%`,
                  width: `${zones.leftInner.end - zones.leftInner.start}%`
                }}
              />
            )}
            {zones.center.start < zones.center.end && (
              <div 
                className="target-zone center"
                style={{
                  left: `${zones.center.start}%`,
                  width: `${zones.center.end - zones.center.start}%`
                }}
              />
            )}
            {zones.rightInner.start < zones.rightInner.end && (
              <div 
                className="target-zone inner"
                style={{
                  left: `${zones.rightInner.start}%`,
                  width: `${zones.rightInner.end - zones.rightInner.start}%`
                }}
              />
            )}
            {zones.rightOuter.start < zones.rightOuter.end && (
              <div 
                className="target-zone outer"
                style={{
                  left: `${zones.rightOuter.start}%`,
                  width: `${zones.rightOuter.end - zones.rightOuter.start}%`
                }}
              />
            )}
          </>
        )}
      </div>
      
      {!hidePointer && (
        <div
          className={`dial-pointer ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{ transform: `rotate(${getRotation(position)}deg)` }}
        />
      )}
      
      <div className="dial-center" />
      
      {!disabled && !hidePointer && (
        <div className="dial-instructions">
          Click anywhere on the dial to move the pointer
        </div>
      )}
    </div>
  );
};