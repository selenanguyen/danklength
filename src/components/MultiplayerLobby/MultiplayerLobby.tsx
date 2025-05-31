import React, { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import type { GameConfig } from '../../types';
import './MultiplayerLobby.css';

interface MultiplayerLobbyProps {
  onBackToLocal: () => void;
  socketInstance: ReturnType<typeof useSocket>;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onBackToLocal,
  socketInstance,
}) => {
  const { 
    multiplayerState, 
    createGame, 
    joinGame, 
    startGame,
    clearErrors,
    resetMultiplayer,
  } = socketInstance;

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [gameCodeInput, setGameCodeInput] = useState('');
  const [gameMode, setGameMode] = useState<'normal' | 'custom'>('normal');
  const [customPrompts, setCustomPrompts] = useState<string[]>(['']);

  const handleCreateGame = () => {
    if (playerName.trim()) {
      createGame(playerName.trim());
    }
  };

  const handleJoinGame = () => {
    if (playerName.trim() && gameCodeInput.trim()) {
      joinGame(gameCodeInput.trim().toUpperCase(), playerName.trim());
    }
  };

  const handleStartGame = () => {
    console.log('Start Game button clicked');
    const validPrompts = gameMode === 'custom' 
      ? customPrompts.filter(p => p.trim() !== '')
      : undefined;

    if (gameMode === 'custom' && (!validPrompts || validPrompts.length === 0)) {
      alert('Please add at least one custom prompt');
      return;
    }

    const config: GameConfig = {
      mode: gameMode,
      players: multiplayerState.players.map(p => p.name),
      customPrompts: validPrompts,
    };

    console.log('Sending start game with config:', config);
    startGame(config);
    // Don't call onGameStart immediately - wait for 'game-started' event
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

  const handleBack = () => {
    if (multiplayerState.gameCode) {
      resetMultiplayer();
    }
    if (mode !== 'menu') {
      setMode('menu');
    } else {
      onBackToLocal();
    }
  };

  // Show connection status
  if (!multiplayerState.isConnected) {
    return (
      <div className="multiplayer-lobby">
        <div className="connection-status">
          <h2>Connecting to server...</h2>
          {multiplayerState.errors.length > 0 && (
            <div className="error-messages">
              {multiplayerState.errors.map((error, index) => (
                <div key={index} className="error-message">
                  {error}
                </div>
              ))}
              <button onClick={clearErrors} className="clear-errors-button">
                Clear Errors
              </button>
            </div>
          )}
          <div className="loading-spinner"></div>
          <button onClick={onBackToLocal} className="back-button">
            Back to Local Play
          </button>
        </div>
      </div>
    );
  }

  // Show lobby if in a game
  if (multiplayerState.gameCode) {
    return (
      <div className="multiplayer-lobby">
        <div className="lobby-header">
          <h1>Game Lobby</h1>
          <div className="game-code">
            Game Code: <span className="code">{multiplayerState.gameCode}</span>
          </div>
        </div>

        <div className="players-section">
          <h3>Players ({multiplayerState.players.length})</h3>
          <div className="players-list">
            {multiplayerState.players.map((player) => (
              <div key={player.id} className={`player-item ${!player.isConnected ? 'disconnected' : ''}`}>
                <span className="player-name">{player.name}</span>
                {player.isHost && <span className="host-badge">Host</span>}
                {!player.isConnected && <span className="status-badge">Disconnected</span>}
              </div>
            ))}
          </div>
        </div>

        {multiplayerState.isHost && (
          <div className="host-controls">
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
                    <p>Built-in spectrum concepts</p>
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
                    <p>Create your own concepts</p>
                  </div>
                </label>
              </div>
            </div>

            {gameMode === 'custom' && (
              <div className="prompts-section">
                <h3>Custom Prompts</h3>
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

            <button 
              onClick={handleStartGame} 
              className="start-game-button"
              disabled={multiplayerState.players.length < 2}
            >
              Start Game
            </button>
          </div>
        )}

        {!multiplayerState.isHost && (
          <div className="waiting-message">
            <p>Waiting for host to start the game...</p>
          </div>
        )}

        <button onClick={handleBack} className="back-button">
          Leave Game
        </button>

        {multiplayerState.errors.length > 0 && (
          <div className="error-messages">
            {multiplayerState.errors.map((error, index) => (
              <div key={index} className="error-message">
                {error}
              </div>
            ))}
            <button onClick={clearErrors} className="clear-errors">
              Clear
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show main menu
  return (
    <div className="multiplayer-lobby">
      <h1>Remote Multiplayer</h1>
      
      {mode === 'menu' && (
        <div className="menu-options">
          <button onClick={() => setMode('create')} className="menu-button">
            Create Game
          </button>
          <button onClick={() => setMode('join')} className="menu-button">
            Join Game
          </button>
          <button onClick={onBackToLocal} className="back-button">
            Back to Local Play
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="create-form">
          <h2>Create New Game</h2>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
            maxLength={20}
          />
          <button onClick={handleCreateGame} disabled={!playerName.trim()}>
            Create Game
          </button>
          <button onClick={() => setMode('menu')} className="back-button">
            Back
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="join-form">
          <h2>Join Game</h2>
          <input
            type="text"
            value={gameCodeInput}
            onChange={(e) => setGameCodeInput(e.target.value.toUpperCase())}
            placeholder="Game Code"
            maxLength={4}
          />
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
            maxLength={20}
          />
          <button 
            onClick={handleJoinGame} 
            disabled={!playerName.trim() || !gameCodeInput.trim()}
          >
            Join Game
          </button>
          <button onClick={() => setMode('menu')} className="back-button">
            Back
          </button>
        </div>
      )}

      {multiplayerState.errors.length > 0 && (
        <div className="error-messages">
          {multiplayerState.errors.map((error, index) => (
            <div key={index} className="error-message">
              {error}
            </div>
          ))}
          <button onClick={clearErrors} className="clear-errors">
            Clear
          </button>
        </div>
      )}
    </div>
  );
};