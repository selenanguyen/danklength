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
  isPsychicPhase?: boolean;
  hideInstructions?: boolean;
}

export const Dial: React.FC<DialProps> = ({
  position,
  targetPosition,
  targetWidth: _targetWidth = 20, // Renamed to indicate it's intentionally unused
  showTarget = false,
  onPositionChange,
  disabled = false,
  hidePointer = false,
  hideForNonPsychic = false,
  isPsychicPhase = false,
  hideInstructions = false
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
    const angleRadians = Math.atan2(deltaY, deltaX);
    
    // Convert to degrees and adjust range
    let angleDegrees = angleRadians * (180 / Math.PI);
    
    // Normalize to 0-180 range (left to right on semicircle)
    if (angleDegrees < 0) angleDegrees += 360;
    if (angleDegrees > 180 && angleDegrees < 360) {
      angleDegrees = angleDegrees > 270 ? 0 : 180;
    }
    
    // Convert angle to percentage (flip so 0° = rightmost, 180° = leftmost)
    const percentage = Math.max(0, Math.min(100, 100 - (angleDegrees / 180) * 100));
    const newPosition = Math.round(percentage);
    
    console.log('Dial click:', {
      clientX, clientY,
      centerX, centerY,
      deltaX, deltaY,
      angleRadians: angleRadians * (180 / Math.PI),
      angleDegrees,
      percentage,
      newPosition
    });
    
    onPositionChange(newPosition);
  }, [onPositionChange, disabled]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('handleMouseDown called, disabled:', disabled);
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
  // Match the flipped position calculation
  const getRotation = (pos: number) => -90 + (pos / 100) * 180;
  
  const getTargetStyle = () => {
    if (!showTarget || targetPosition === undefined) return {};
    
    console.log('=== DIAL TARGET RENDERING ===');
    console.log('Target position:', targetPosition, 'Show target:', showTarget);
    
    let center = targetPosition;
    const halfWidth = 35 / 2; // VISUAL ONLY: Display size (can be adjusted for better UX without affecting scoring)
    
    // Calculate the full target range
    const leftEdge = center - halfWidth;
    const rightEdge = center + halfWidth;
    
    // If only a small portion would wrap, adjust the center to avoid wrapping
    const wrapThreshold = halfWidth * 0.15; // 15% of target width
    
    if (leftEdge < 0 && Math.abs(leftEdge) < wrapThreshold) {
      // Small overhang on left - shift right to keep everything visible
      center = halfWidth;
      console.log('Target adjusted left to right:', targetPosition, '→', center);
    } else if (rightEdge > 100 && (rightEdge - 100) < wrapThreshold) {
      // Small overhang on right - shift left to keep everything visible  
      center = 100 - halfWidth;
      console.log('Target adjusted right to left:', targetPosition, '→', center);
    }
    
    // Create 5 zones with slightly forgiving proportions for higher-value zones (match scoring exactly)
    const centerWidth = halfWidth / 4.5;      // Blue center: slightly larger (4 points)
    const innerWidth = halfWidth / 4.8;       // Purple zones: slightly larger (3 points)
    const outerWidth = halfWidth / 5.5;       // Red zones: smaller (2 points)
    
    // Calculate zone boundaries (allow negative and >100 values)
    const leftOuterStart = center - centerWidth/2 - innerWidth - outerWidth;
    const leftOuterEnd = center - centerWidth/2 - innerWidth;
    const leftInnerStart = leftOuterEnd;
    const leftInnerEnd = center - centerWidth/2;
    const centerStart = center - centerWidth/2;
    const centerEnd = center + centerWidth/2;
    const rightInnerStart = centerEnd;
    const rightInnerEnd = center + centerWidth/2 + innerWidth;
    const rightOuterStart = rightInnerEnd;
    const rightOuterEnd = center + centerWidth/2 + innerWidth + outerWidth;
    
    // Clamp only when converting to angles to keep zones visible on semicircle
    const clampAndConvert = (percent: number) => {
      const clamped = Math.max(0, Math.min(100, percent));
      return clamped * 1.8;
    };
    
    // Convert percentages to degrees (0-180 degrees for semicircle)
    // const toAngle = (percent: number) => percent * 1.8;
    
    // Helper function to wrap zones that extend beyond 0-100 range
    const wrapZone = (start: number, end: number, color: string) => {
      const wrappedPieces = [];
      
      if (start < 0 && end > 0) {
        // Zone spans across the left boundary - split it
        wrappedPieces.push({ start: 0, end: end, color }); // Visible portion on left
        wrappedPieces.push({ start: 100 + start, end: 100, color }); // Wrapped portion on right
      } else if (start < 0 && end <= 0) {
        // Entire zone is left of 0 - wrap to right side  
        wrappedPieces.push({ start: 100 + start, end: 100 + end, color });
      } else if (start >= 100 && end > 100) {
        // Entire zone is right of 100 - wrap to left side
        wrappedPieces.push({ start: start - 100, end: end - 100, color });
      } else if (start < 100 && end > 100) {
        // Zone spans across the right boundary - split it
        wrappedPieces.push({ start: start, end: 100, color }); // Visible portion on right
        wrappedPieces.push({ start: 0, end: end - 100, color }); // Wrapped portion on left
      } else if (start >= 0 && end <= 100) {
        // Normal zone within bounds
        wrappedPieces.push({ start, end, color });
      }
      
      return wrappedPieces;
    };
    
    // Create all zones with wrapping
    const allZonePieces = [
      ...wrapZone(leftOuterStart, leftOuterEnd, 'var(--tama-pink)'),
      ...wrapZone(leftInnerStart, leftInnerEnd, 'var(--tama-purple)'),
      ...wrapZone(centerStart, centerEnd, 'var(--tama-blue)'),
      ...wrapZone(rightInnerStart, rightInnerEnd, 'var(--tama-purple)'),
      ...wrapZone(rightOuterStart, rightOuterEnd, 'var(--tama-pink)')
    ];
    
    // Sort zone pieces by start position to avoid gradient conflicts
    allZonePieces.sort((a, b) => a.start - b.start);
    
    const gradientStops = [`transparent 0deg`];
    
    allZonePieces.forEach(zone => {
      if (zone.start >= 0 && zone.end <= 100 && zone.start < zone.end) {
        gradientStops.push(`transparent ${clampAndConvert(zone.start)}deg`);
        gradientStops.push(`${zone.color} ${clampAndConvert(zone.start)}deg`);
        gradientStops.push(`${zone.color} ${clampAndConvert(zone.end)}deg`);
        gradientStops.push(`transparent ${clampAndConvert(zone.end)}deg`);
      }
    });
    
    gradientStops.push(`transparent 180deg`);
    
    return {
      background: `conic-gradient(from 270deg, ${gradientStops.join(', ')})`
    };
  };

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
        {showTarget && (
          <div 
            className="target-zone"
            style={getTargetStyle()}
          />
        )}
      </div>
      
      {!hidePointer && !isPsychicPhase && (
        <div
          className={`dial-pointer ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{ transform: `rotate(${getRotation(position)}deg)` }}
        />
      )}
      
      <div className="dial-center" />
      
      {!disabled && !hidePointer && !isPsychicPhase && !hideInstructions && (
        <div className="dial-instructions">
          Click anywhere on the dial to move the pointer
        </div>
      )}
    </div>
  );
};