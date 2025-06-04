import React, { useState, useEffect } from 'react';
import type { Player } from '../../types';
import './PsychicAnnouncement.css';

interface PsychicAnnouncementProps {
  currentPsychic: Player;
  currentRound: number;
  onContinue: () => void;
}

export const PsychicAnnouncement: React.FC<PsychicAnnouncementProps> = ({ 
  currentPsychic, 
  currentRound, 
  onContinue 
}) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onContinue]);

  return (
    <div className="psychic-announcement">
      <div className="announcement-container">
        <h1 className="announcement-title">Round {currentRound}</h1>
        <div className="psychic-info">
          <p className="psychic-role">The psychic is...</p>
          <h2 className="psychic-name">{currentPsychic.name}!</h2>
        </div>
        <div className="instruction-text">
          <p>Everyone else must look away while the psychic sees the spectrum and gives their clue.</p>
        </div>
        <div className="countdown-display">
          <div className="countdown-circle">
            <span className="countdown-number">{countdown}</span>
          </div>
        </div>
        <button className="continue-button" onClick={onContinue}>
          GO
        </button>
      </div>
    </div>
  );
};