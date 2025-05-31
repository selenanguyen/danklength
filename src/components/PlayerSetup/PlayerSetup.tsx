import React, { useState } from 'react';
import type { GameConfig } from '../../types';
import './PlayerSetup.css';

interface PlayerSetupProps {
  onStartGame: (config: GameConfig) => void;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
  const [gameMode, setGameMode] = useState<'normal' | 'custom'>('normal');
  const [players, setPlayers] = useState<string[]>(['']);
  const [customPrompts, setCustomPrompts] = useState<string[]>(['']);

  const addPlayer = () => {
    setPlayers([...players, '']);
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const addPrompt = () => {
    setCustomPrompts([...customPrompts, '']);
  };

  const removePrompt = (index: number) => {
    if (customPrompts.length > 1) {
      setCustomPrompts(customPrompts.filter((_, i) => i !== index));
    }
  };

  const updatePrompt = (index: number, prompt: string) => {
    const newPrompts = [...customPrompts];
    newPrompts[index] = prompt;
    setCustomPrompts(newPrompts);
  };

  const handleSubmit = () => {
    const validPlayers = players.filter(name => name.trim() !== '');
    const validPrompts = gameMode === 'custom' 
      ? customPrompts.filter(prompt => prompt.trim() !== '')
      : undefined;
    
    if (validPlayers.length < 2) {
      alert('Please add at least 2 players');
      return;
    }

    if (gameMode === 'custom' && (!validPrompts || validPrompts.length === 0)) {
      alert('Please add at least 1 custom prompt');
      return;
    }

    const config: GameConfig = {
      mode: gameMode,
      players: validPlayers,
      customPrompts: validPrompts,
    };

    onStartGame(config);
  };

  return (
    <div className="player-setup">
      <h1>Setup Wavelength Game</h1>
      
      <div className="game-mode-selection">
        <h3>Game Mode</h3>
        <div className="mode-options">
          <label className={`mode-option ${gameMode === 'normal' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="normal"
              checked={gameMode === 'normal'}
              onChange={(e) => setGameMode(e.target.value as 'normal')}
            />
            <div className="mode-content">
              <h4>Normal Mode</h4>
              <p>Use built-in spectrum concepts</p>
            </div>
          </label>
          
          <label className={`mode-option ${gameMode === 'custom' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="custom"
              checked={gameMode === 'custom'}
              onChange={(e) => setGameMode(e.target.value as 'custom')}
            />
            <div className="mode-content">
              <h4>Custom Mode</h4>
              <p>Create your own spectrum concepts</p>
            </div>
          </label>
        </div>
      </div>

      <div className="players-section">
        <h3>Players ({players.filter(p => p.trim()).length})</h3>
        <div className="players-list">
          {players.map((player, index) => (
            <div key={index} className="player-input">
              <input
                type="text"
                value={player}
                onChange={(e) => updatePlayer(index, e.target.value)}
                placeholder={`Player ${index + 1} name`}
                maxLength={20}
              />
              {players.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="remove-button"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addPlayer} className="add-button">
          + Add Player
        </button>
      </div>

      {gameMode === 'custom' && (
        <div className="prompts-section">
          <h3>Custom Prompts ({customPrompts.filter(p => p.trim()).length})</h3>
          <p className="prompts-hint">
            Create spectrum concepts like "Hot vs Cold" or "Expensive vs Cheap"
          </p>
          <div className="prompts-list">
            {customPrompts.map((prompt, index) => (
              <div key={index} className="prompt-input">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => updatePrompt(index, e.target.value)}
                  placeholder="e.g. Hot vs Cold"
                  maxLength={50}
                />
                {customPrompts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrompt(index)}
                    className="remove-button"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addPrompt} className="add-button">
            + Add Prompt
          </button>
        </div>
      )}

      <div className="game-info">
        <h3>Game Summary</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Players:</strong> {players.filter(p => p.trim()).length}
          </div>
          <div className="info-item">
            <strong>Mode:</strong> {gameMode === 'normal' ? 'Normal' : 'Custom'}
          </div>
          {gameMode === 'custom' && (
            <>
              <div className="info-item">
                <strong>Custom Prompts:</strong> {customPrompts.filter(p => p.trim()).length}
              </div>
              <div className="info-item">
                <strong>Total Rounds:</strong> {Math.max(8, customPrompts.filter(p => p.trim()).length * Math.ceil(8 / Math.max(1, customPrompts.filter(p => p.trim()).length)))}
              </div>
            </>
          )}
          {gameMode === 'normal' && (
            <div className="info-item">
              <strong>Total Rounds:</strong> 8
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSubmit} className="start-game-button">
        Start Game
      </button>
    </div>
  );
};