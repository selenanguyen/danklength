import React, { useState, useEffect } from 'react';
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
    submitCustomPrompt,
    updateGameMode,
  } = socketInstance;

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [gameCodeInput, setGameCodeInput] = useState('');
  const [localGameMode, setLocalGameMode] = useState<'normal' | 'custom'>('normal');
  
  // Use shared game mode for non-hosts, local for hosts
  const gameMode = multiplayerState.sharedGameMode || localGameMode;
  
  const setGameMode = (mode: 'normal' | 'custom') => {
    setLocalGameMode(mode);
    if (multiplayerState.isHost) {
      updateGameMode(mode);
    }
  };
  const [leftSide, setLeftSide] = useState('');
  const [rightSide, setRightSide] = useState('');
  const [autoStartTimer, setAutoStartTimer] = useState<number | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);

  // Use shared prompts from multiplayer state
  const submittedPrompts = multiplayerState.sharedPrompts;
  
  // Auto-start logic when reaching 8 prompts
  const ROUNDS_FOR_AUTO_START = 8;
  const AUTO_START_COUNTDOWN = 30;

  // Start countdown when we reach enough prompts
  useEffect(() => {
    if (multiplayerState.isHost && gameMode === 'custom' && submittedPrompts.length >= ROUNDS_FOR_AUTO_START) {
      if (autoStartTimer === null) {
        // Start the countdown
        setAutoStartTimer(AUTO_START_COUNTDOWN);
        
        const interval = setInterval(() => {
          setAutoStartTimer(prev => {
            if (prev === null) return null;
            if (prev <= 1) {
              // Auto-start the game
              handleStartGame();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        
        setCountdownInterval(interval);
      }
    } else if (submittedPrompts.length < ROUNDS_FOR_AUTO_START && autoStartTimer !== null) {
      // Clear timer if prompts go below threshold (shouldn't happen normally)
      setAutoStartTimer(null);
      if (countdownInterval) {
        clearInterval(countdownInterval);
        setCountdownInterval(null);
      }
    }
    
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [submittedPrompts.length, gameMode, multiplayerState.isHost]);

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

    if (gameMode === 'custom' && submittedPrompts.length === 0) {
      alert('Please submit at least one custom prompt');
      return;
    }

    const config: GameConfig = {
      mode: gameMode,
      players: multiplayerState.players.map(p => p.name),
      customPrompts: gameMode === 'custom' ? submittedPrompts : undefined,
    };

    console.log('Sending start game with config:', config);
    startGame(config);
    // Don't call onGameStart immediately - wait for 'game-started' event
  };

  const submitPrompt = () => {
    if (leftSide.trim() && rightSide.trim()) {
      const prompt = `${leftSide.trim()} vs ${rightSide.trim()}`;
      submitCustomPrompt(prompt);
      setLeftSide('');
      setRightSide('');
    }
  };

  const handlePromptKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitPrompt();
    }
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

  const copyGameCode = async () => {
    if (multiplayerState.gameCode) {
      try {
        await navigator.clipboard.writeText(multiplayerState.gameCode);
        setShowCopiedTooltip(true);
        setTimeout(() => setShowCopiedTooltip(false), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = multiplayerState.gameCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShowCopiedTooltip(true);
        setTimeout(() => setShowCopiedTooltip(false), 2000);
      }
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
            <div className="copy-button-container">
              <button onClick={copyGameCode} className="copy-button" title="Copy game code">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </button>
              {showCopiedTooltip && (
                <div className="copied-tooltip">Copied!</div>
              )}
            </div>
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

        {/* Game mode display for all players */}
        <div className="game-mode-display">
          <h3>Game Mode</h3>
          <div className="mode-options">
            <label className={`mode-option ${(multiplayerState.isHost ? gameMode === 'normal' : submittedPrompts.length === 0) ? 'selected' : ''} ${!multiplayerState.isHost ? 'read-only' : ''}`}>
              {multiplayerState.isHost && (
                <input
                  type="radio"
                  value="normal"
                  checked={gameMode === 'normal'}
                  onChange={(e) => setGameMode(e.target.value as 'normal')}
                />
              )}
              <div className="mode-content">
                <h4>Normal Mode</h4>
                <p>Built-in spectrum concepts</p>
              </div>
            </label>
            
            <label className={`mode-option ${(multiplayerState.isHost ? gameMode === 'custom' : submittedPrompts.length > 0) ? 'selected' : ''} ${!multiplayerState.isHost ? 'read-only' : ''}`}>
              {multiplayerState.isHost && (
                <input
                  type="radio"
                  value="custom"
                  checked={gameMode === 'custom'}
                  onChange={(e) => setGameMode(e.target.value as 'custom')}
                />
              )}
              <div className="mode-content">
                <h4>Custom Mode</h4>
                <p>Create your own concepts</p>
              </div>
            </label>
          </div>
        </div>

        {multiplayerState.isHost && (
          <div className="host-controls">

            {gameMode === 'custom' && (
              <div className="prompts-section">
                <h3>Spectrums</h3>
                
                {/* Submitted prompts display */}
                {submittedPrompts.length > 0 && (
                  <div className="prompts-gallery">
                    {submittedPrompts.map((prompt, index) => (
                      <div 
                        key={index} 
                        className="prompt-card" 
                        style={{ 
                          '--appear-delay': `${index * 0.1}s`,
                          '--float-delay': `${index * 0.3}s`
                        } as React.CSSProperties}
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                )}

                {/* Host-only prompt input section */}
                <div className="prompt-input-section">
                  <div className="dual-prompt-input-group">
                    <input
                      type="text"
                      value={leftSide}
                      onChange={(e) => setLeftSide(e.target.value)}
                      onKeyPress={handlePromptKeyPress}
                      placeholder="Left Side"
                      maxLength={25}
                      className="prompt-side-input"
                    />
                    <span className="vs-divider">vs</span>
                    <input
                      type="text"
                      value={rightSide}
                      onChange={(e) => setRightSide(e.target.value)}
                      onKeyPress={handlePromptKeyPress}
                      placeholder="Right Side"
                      maxLength={25}
                      className="prompt-side-input"
                    />
                    <button 
                      onClick={submitPrompt} 
                      disabled={!leftSide.trim() || !rightSide.trim()}
                      className="submit-prompt-button"
                    >
                      Submit
                    </button>
                  </div>
                </div>

                {/* Auto-start countdown display */}
                {autoStartTimer !== null && (
                  <div className="auto-start-countdown">
                    🚀 Game starting automatically in {autoStartTimer} seconds...
                  </div>
                )}
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

        {/* Show custom prompts section to non-hosts when in custom mode */}
        {!multiplayerState.isHost && gameMode === 'custom' && (
          <div className="prompts-section">
            <h3>Spectrums</h3>
            
            {/* Submitted prompts display */}
            {submittedPrompts.length > 0 && (
              <div className="prompts-gallery">
                {submittedPrompts.map((prompt, index) => (
                  <div 
                    key={index} 
                    className="prompt-card" 
                    style={{ 
                      '--appear-delay': `${index * 0.1}s`,
                      '--float-delay': `${index * 0.3}s`
                    } as React.CSSProperties}
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            )}
            
            {/* Show message when no prompts yet */}
            {submittedPrompts.length === 0 && (
              <p className="waiting-for-prompts">Add some custom spectrums below!</p>
            )}

            {/* Prompt input section for non-hosts */}
            <div className="prompt-input-section">
              <div className="dual-prompt-input-group">
                <input
                  type="text"
                  value={leftSide}
                  onChange={(e) => setLeftSide(e.target.value)}
                  onKeyPress={handlePromptKeyPress}
                  placeholder="Left Side"
                  maxLength={25}
                  className="prompt-side-input"
                />
                <span className="vs-divider">vs</span>
                <input
                  type="text"
                  value={rightSide}
                  onChange={(e) => setRightSide(e.target.value)}
                  onKeyPress={handlePromptKeyPress}
                  placeholder="Right Side"
                  maxLength={25}
                  className="prompt-side-input"
                />
                <button 
                  onClick={submitPrompt} 
                  disabled={!leftSide.trim() || !rightSide.trim()}
                  className="submit-prompt-button"
                >
                  Submit
                </button>
              </div>
            </div>
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