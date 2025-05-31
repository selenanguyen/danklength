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
  const [animatingToPosition, setAnimatingToPosition] = useState(position);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update animating position when position prop changes
  useEffect(() => {
    setAnimatingToPosition(position);
  }, [position]);

  const updatePosition = useCallback((clientX: number, clientY: number, smooth: boolean = false) => {
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
    const newPosition = Math.round(percentage);
    
    if (smooth) {
      setAnimatingToPosition(newPosition);
      // Use a small delay to let the animation complete before updating the actual position
      setTimeout(() => {
        onPositionChange(newPosition);
      }, 100);
    } else {
      onPositionChange(newPosition);
    }
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
    updatePosition(e.clientX, e.clientY, true); // Smooth animation for clicks
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
    updatePosition(touch.clientX, touch.clientY, true); // Smooth animation for touches
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
    
    // Helper function to wrap zones that go below 0 or above 100
    const wrapZone = (start: number, end: number) => {
      const zones = [];
      
      if (start < 0) {
        // Part of the zone wraps to the right side (80-100)
        zones.push({ start: 100 + start, end: 100 }); // Right side wrap
        zones.push({ start: 0, end: Math.min(end, 100) }); // Left side remainder
      } else if (end > 100) {
        // Part of the zone wraps to the left side (0-20)
        zones.push({ start: Math.max(start, 0), end: 100 }); // Right side remainder
        zones.push({ start: 0, end: end - 100 }); // Left side wrap
      } else {
        // Normal zone, no wrapping needed
        zones.push({ start: Math.max(start, 0), end: Math.min(end, 100) });
      }
      
      return zones;
    };
    
    return {
      center: wrapZone(center - halfWidth/3, center + halfWidth/3),
      inner: wrapZone(center - halfWidth*2/3, center + halfWidth*2/3),
      outer: wrapZone(center - halfWidth, center + halfWidth)
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
        onMouseDown={handleDialAreaClick}
        onTouchStart={handleDialAreaTouch}
      >
        {showTarget && zones && (
          <>
            {/* Outer zones */}
            {zones.outer.map((zone, index) => (
              <div 
                key={`outer-${index}`}
                className="target-zone outer"
                style={{
                  background: `conic-gradient(from 180deg, 
                    transparent ${zone.start * 1.8}deg, 
                    #ffb3b3 ${zone.start * 1.8}deg, 
                    #ffb3b3 ${zone.end * 1.8}deg, 
                    transparent ${zone.end * 1.8}deg)`
                }}
              />
            ))}
            {/* Inner zones */}
            {zones.inner.map((zone, index) => (
              <div 
                key={`inner-${index}`}
                className="target-zone inner"
                style={{
                  background: `conic-gradient(from 180deg, 
                    transparent ${zone.start * 1.8}deg, 
                    #e6e6fa ${zone.start * 1.8}deg, 
                    #e6e6fa ${zone.end * 1.8}deg, 
                    transparent ${zone.end * 1.8}deg)`
                }}
              />
            ))}
            {/* Center zones */}
            {zones.center.map((zone, index) => (
              <div 
                key={`center-${index}`}
                className="target-zone center"
                style={{
                  background: `conic-gradient(from 180deg, 
                    transparent ${zone.start * 1.8}deg, 
                    #4a90e2 ${zone.start * 1.8}deg, 
                    #4a90e2 ${zone.end * 1.8}deg, 
                    transparent ${zone.end * 1.8}deg)`
                }}
              />
            ))}
          </>
        )}
      </div>
      

      {!hidePointer && (
        <div
          className={`dial-pointer ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{ transform: `rotate(${getRotation(animatingToPosition)}deg)` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      )}
      
      <div className="dial-center" />
      
      {!disabled && !hidePointer && (
        <div className="dial-instructions">
          Click and drag the red dial to set your guess
        </div>
      )}
    </div>
  );
};