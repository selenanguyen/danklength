import React from 'react';
import type { SpectrumConcept } from '../../types';
import './SpectrumCard.css';

interface SpectrumCardProps {
  concept: SpectrumConcept;
  showConcepts?: boolean;
}

export const SpectrumCard: React.FC<SpectrumCardProps> = ({ 
  concept, 
  showConcepts = true 
}) => {
  return (
    <div className="spectrum-card">
      {showConcepts ? (
        <div className="concept-display">
          <div className="left-concept">{concept.leftConcept}</div>
          <div className="spectrum-divider">↔</div>
          <div className="right-concept">{concept.rightConcept}</div>
        </div>
      ) : (
        <div className="concept-hidden">
          <div className="hidden-text">Spectrum concepts hidden</div>
        </div>
      )}
    </div>
  );
};