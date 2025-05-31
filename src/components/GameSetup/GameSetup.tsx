import React from 'react';
import './GameSetup.css';

interface GameSetupProps {
  onStartGame: () => void;
  onStartMultiplayer: () => void;
  onReconnect?: () => void;
  cachedGameCode?: string;
}

export const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, onStartMultiplayer, onReconnect, cachedGameCode }) => {
  return (
    <div className="game-setup">
      <h1 className="game-title">Wavelength</h1>
      
      <div className="game-description">
        <p>A social guessing game where you work together to read each other's minds!</p>
        
        <div className="rules-summary">
          <h3>How to Play:</h3>
          <ol>
            <li>Players take turns giving clues</li>
            <li>The Psychic sees the target and gives a clue</li>
            <li>Everyone else positions the dial based on the clue</li>
            <li>Score points based on accuracy</li>
            <li>Work together to get the highest score possible!</li>
          </ol>
        </div>

        <div className="scoring-info">
          <h3>Scoring:</h3>
          <div className="score-zones">
            <div className="zone-info">
              <span className="zone-color bullseye"></span>
              <span>Bullseye: 5 points</span>
            </div>
            <div className="zone-info">
              <span className="zone-color close"></span>
              <span>Close: 3 points</span>
            </div>
            <div className="zone-info">
              <span className="zone-color okay"></span>
              <span>Okay: 2 points</span>
            </div>
            <div className="zone-info">
              <span className="zone-color miss"></span>
              <span>Miss: 0 points</span>
            </div>
          </div>
        </div>
      </div>

      <div className="play-mode-selection">
        {cachedGameCode && onReconnect && (
          <button className="reconnect-button" onClick={onReconnect}>
            🔄 Reconnect to Game {cachedGameCode}
          </button>
        )}
        
        <div className="button-row">
          <button className="start-button local" onClick={onStartGame}>
            🏠 Local Play
          </button>
          <button className="start-button remote" onClick={onStartMultiplayer}>
            🌐 Remote Play
          </button>
        </div>
      </div>
    </div>
  );
};