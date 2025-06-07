import React, { useState, useEffect } from 'react';
import type { GameState, SpectrumConcept } from '../../types';
import { useUserPacks } from '../../hooks/useUserPacks';
import { PackSelectionModal } from '../PackSelectionModal/PackSelectionModal';
import './ScoreReveal.css';

interface ScoreRevealProps {
  gameState: GameState;
  currentUsername?: string;
  onFinish: () => void;
  isRemoteMode?: boolean;
}

interface ScoreZone {
  label: string;
  color: string;
  start: number; // percentage
  end: number; // percentage
}

const SCORE_ZONES: ScoreZone[] = [
  { label: 'YIKES', color: '#ff4757', start: 0, end: 16.67 },
  { label: 'OK', color: '#ffa502', start: 16.67, end: 33.33 },
  { label: 'NICE', color: '#9E58CD', start: 33.33, end: 50 },
  { label: 'GOOD', color: '#5B56DB', start: 50, end: 66.67 },
  { label: 'GREAT', color: '#20c997', start: 66.67, end: 83.33 },
  { label: 'WOW!', color: '#28a745', start: 83.33, end: 100 }
];

export const ScoreReveal: React.FC<ScoreRevealProps> = ({ gameState, currentUsername, onFinish, isRemoteMode = false }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [revealedScore, setRevealedScore] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const {
    userPacks,
    username,
    setCurrentUsername,
    createPack,
    addToExistingPack,
  } = useUserPacks(currentUsername);

  const maxPossibleScore = gameState.totalRounds * 4; // 4 points max per round
  const totalScore = gameState.totalScore;


  // Get round data for animation
  const getRoundData = (roundIndex: number) => {
    if (roundIndex >= gameState.roundScores.length) return null;
    
    const score = gameState.roundScores[roundIndex];
    const roundClue = gameState.roundClues?.[roundIndex];
    
    let clue: string;
    let psychicName: string;
    
    if (typeof roundClue === 'string') {
      // Legacy format: just the clue string, use old logic for psychic
      clue = roundClue || `Round ${roundIndex + 1} clue`;
      const psychicIndex = roundIndex % gameState.players.length;
      psychicName = gameState.players[psychicIndex]?.name || 'Unknown';
    } else if (roundClue && typeof roundClue === 'object') {
      // New format: RoundHistory object with psychic info
      clue = roundClue.clue || `Round ${roundIndex + 1} clue`;
      psychicName = roundClue.psychicName || 'Unknown';
    } else {
      // No clue data available
      clue = `Round ${roundIndex + 1} clue`;
      const psychicIndex = roundIndex % gameState.players.length;
      psychicName = gameState.players[psychicIndex]?.name || 'Unknown';
    }
    
    return {
      score,
      psychic: psychicName,
      clue,
      roundNumber: roundIndex + 1
    };
  };

  const getDialPosition = (score: number) => {
    return Math.min((score / maxPossibleScore) * 100, 100);
  };


  useEffect(() => {
    if (currentRound < gameState.roundScores.length) {
      const timer = setTimeout(() => {
        const roundData = getRoundData(currentRound);
        if (roundData) {
          // Update revealed score to include this round - this triggers the dial animation
          const newScore = gameState.roundScores.slice(0, currentRound + 1).reduce((sum, score) => sum + score, 0);
          setRevealedScore(newScore);
          
          // Show points animation after dial starts moving (500ms into the 1.2s dial animation)
          setTimeout(() => {
            setIsAnimating(true);
          }, 500);
          
          // Start fade out transition before moving to next round
          setTimeout(() => {
            if (currentRound + 1 < gameState.roundScores.length) {
              setIsTransitioning(true);
            }
          }, 2800);
          
          // Move to next round after fade out completes
          setTimeout(() => {
            setCurrentRound(currentRound + 1);
            setIsAnimating(false);
            setIsTransitioning(false);
          }, 3100);
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else if (!showFinalMessage) {
      // All rounds revealed, start fade out transition before final message
      setRevealedScore(totalScore);
      setTimeout(() => {
        setIsTransitioning(true);
      }, 500);
      setTimeout(() => {
        setShowFinalMessage(true);
        setIsTransitioning(false);
      }, 800);
    }
  }, [currentRound, gameState.roundScores.length, showFinalMessage]);

  // Animate the dial movement
  useEffect(() => {
    const targetScore = showFinalMessage ? totalScore : revealedScore;
    
    if (targetScore !== animatedScore) {
      const startScore = animatedScore;
      const diff = targetScore - startScore;
      const duration = 1200; // 1.2 seconds
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        const easedProgress = easeInOutCubic(progress);
        
        const currentScore = startScore + (diff * easedProgress);
        setAnimatedScore(currentScore);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [revealedScore, totalScore, showFinalMessage]);

  const getFinalMessage = () => {
    const percentage = (totalScore / maxPossibleScore) * 100;
    if (percentage >= 83.34) return "You're mind readers! 🧠✨";
    if (percentage >= 66.67) return "You're in sync! 🎯";
    if (percentage >= 50) return "Great teamwork! 👏";
    if (percentage >= 33.33) return "Not bad. Get in sync! 🔥";
    if (percentage >= 16.67) return "Not bad. Room for improvement 🎷";
    return "Rough. Keep practicing 💪";
  };

  const handleCreatePack = async (packName: string, selectedPrompts: SpectrumConcept[]) => {
    await createPack(packName, selectedPrompts);
  };

  const handleAddToExistingPack = async (packId: string, selectedPrompts: SpectrumConcept[]) => {
    await addToExistingPack(packId, selectedPrompts);
  };

  // Check if this was a custom game with prompts to save
  const hasCustomPrompts = gameState.gameMode === 'custom' && gameState.customPrompts && gameState.customPrompts.length > 0;

  const currentRoundData = currentRound < gameState.roundScores.length ? getRoundData(currentRound) : null;

  return (
    <div className="score-reveal">
      <div className="score-reveal-container">
        <h1 className="score-reveal-title">🎉 Results 🎉</h1>
        {/* Wavelength-style dial */}
        <div className="wavelength-dial">
          <svg width="380" height="200" viewBox="0 0 300 160">
            {/* Draw the semicircle zones as proper wedges */}
            {SCORE_ZONES.map((zone) => {
              // Convert percentages to angles (0-180 degrees for semicircle)
              const startAngle = (zone.start / 100) * 180;
              const endAngle = (zone.end / 100) * 180;
              
              // Convert to radians
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              
              // Calculate points on the arc (radius 120, center at 150,160)
              const radius = 120;
              const centerX = 150;
              const centerY = 160;
              
              const x1 = centerX + radius * Math.cos(Math.PI - startRad);
              const y1 = centerY - radius * Math.sin(Math.PI - startRad);
              const x2 = centerX + radius * Math.cos(Math.PI - endRad);
              const y2 = centerY - radius * Math.sin(Math.PI - endRad);
              
              // Determine if this is a large arc (> 180 degrees)
              const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;
              
              // Create the path for the wedge
              const pathData = [
                `M ${centerX} ${centerY}`, // Move to center
                `L ${x1} ${y1}`, // Line to start point
                `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${x2} ${y2}`, // Arc to end point
                'Z' // Close path back to center
              ].join(' ');
              
              // Calculate text position (middle of the arc, at 85% radius)
              const midAngle = (startAngle + endAngle) / 2;
              const midRad = (midAngle * Math.PI) / 180;
              const textRadius = 88;
              const textX = centerX + textRadius * Math.cos(Math.PI - midRad);
              const textY = centerY - textRadius * Math.sin(Math.PI - midRad);
              
              return (
                <g key={zone.label}>
                  <path
                    d={pathData}
                    fill={zone.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dy="0.3em"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
                  >
                    {zone.label}
                  </text>
                </g>
              );
            })}
            
            {/* Dial pointer - calculated coordinates */}
            {(() => {
              const position = getDialPosition(animatedScore);
              const angle = (position / 100) * 180; // 0-180 degrees
              const angleRad = (angle * Math.PI) / 180;
              
              // Calculate pointer endpoint (90 pixel length from center)
              const pointerLength = 90;
              const endX = 150 + pointerLength * Math.cos(Math.PI - angleRad);
              const endY = 160 - pointerLength * Math.sin(Math.PI - angleRad);
              
              return (
                <g className="dial-pointer-group">
                  <line
                    x1="150"
                    y1="160"
                    x2={endX}
                    y2={endY}
                    stroke="#2c3e50"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="150"
                    cy="160"
                    r="8"
                    fill="#2c3e50"
                  />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Always render a container to maintain consistent size */}
        <div className="content-container">
          {/* Current round announcement */}
          {currentRoundData && !showFinalMessage && (
            <div className={`round-announcement ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
              <h2 className="round-title">
                Round {currentRoundData.roundNumber}
              </h2>
              <h3 className="round-clue">
                "{currentRoundData.clue}" - {currentRoundData.psychic}
              </h3>
              <div className="round-score">
                {isAnimating && (
                  <span className="points-earned">+{currentRoundData.score}</span>
                )}
              </div>
            </div>
          )}

          {/* Final message */}
          {showFinalMessage && (
            <div className="final-message">
              <h2>{getFinalMessage()}</h2>
              <div className="final-stats">
                <p>Final Score: {totalScore} / {maxPossibleScore} points</p>
                <p>Accuracy: {Math.round((totalScore / maxPossibleScore) * 100)}%</p>
              </div>
              <div className="final-actions">
                {hasCustomPrompts && (
                  <button 
                    className="save-to-pack-button" 
                    onClick={() => setShowPackModal(true)}
                  >
                    📦 Save Prompts to Pack
                  </button>
                )}
                <button className="play-again-button" onClick={onFinish}>
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* Invisible placeholder when transitioning */}
          {!currentRoundData && !showFinalMessage && (
            <div className="round-announcement" style={{ visibility: 'hidden' }}>
              <h2 className="round-title">Placeholder Round</h2>
              <h3 className="round-clue">Placeholder clue - Placeholder</h3>
            </div>
          )}
        </div>
      </div>

      {hasCustomPrompts && (
        <PackSelectionModal
          isOpen={showPackModal}
          prompts={gameState.customPrompts || []}
          userPacks={userPacks}
          currentUsername={username}
          onClose={() => setShowPackModal(false)}
          onCreatePack={handleCreatePack}
          onAddToExistingPack={handleAddToExistingPack}
          onSetUsername={setCurrentUsername}
          isRemoteMode={isRemoteMode}
        />
      )}
    </div>
  );
};