import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import type { GameConfig, SpectrumConcept } from '../../types';
import { useUserPacks } from '../../hooks/useUserPacks';
import { PackSelectionModal } from '../PackSelectionModal/PackSelectionModal';
import './MultiplayerLobby.css';

interface MultiplayerLobbyProps {
  onBackToLocal: () => void;
  socketInstance: ReturnType<typeof useSocket>;
  initialConfig?: GameConfig | null;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onBackToLocal,
  socketInstance,
  initialConfig,
}) => {
  const { 
    multiplayerState, 
    createGame, 
    joinGame, 
    startGame,
    clearErrors,
    leaveGame,
    submitCustomPrompt,
    updateGameMode,
  } = socketInstance;

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [gameCodeInput, setGameCodeInput] = useState('');
  const [localGameMode, setLocalGameMode] = useState<'normal' | 'custom'>(initialConfig?.mode || 'normal');
  
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
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);

  const {
    userPacks,
    username,
    setCurrentUsername,
    createPack,
    addToExistingPack,
    loadPackPrompts,
  } = useUserPacks();

  // Set username when we have multiplayer player info
  useEffect(() => {
    const currentPlayer = multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId);
    if (currentPlayer?.name) {
      setCurrentUsername(currentPlayer.name);
    }
  }, [multiplayerState.players, multiplayerState.currentPlayerId, setCurrentUsername]);

  // Use shared prompts from multiplayer state
  const submittedPrompts = multiplayerState.sharedPrompts;

  // Populate initial prompts from config (only once when component mounts)
  const [initialPromptsLoaded, setInitialPromptsLoaded] = useState(false);
  useEffect(() => {
    if (initialConfig?.customPrompts && !initialPromptsLoaded && multiplayerState.isHost) {
      // Add each prompt from initial config
      initialConfig.customPrompts.forEach(prompt => {
        submitCustomPrompt(prompt);
      });
      setInitialPromptsLoaded(true);
    }
  }, [initialConfig?.customPrompts, initialPromptsLoaded, multiplayerState.isHost, submitCustomPrompt]);
  

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

  const handleCreatePack = async (packName: string, selectedPrompts: SpectrumConcept[]) => {
    await createPack(packName, selectedPrompts);
  };

  const handleAddToExistingPack = async (packId: string, selectedPrompts: SpectrumConcept[]) => {
    await addToExistingPack(packId, selectedPrompts);
  };

  const handleLoadFromPack = (packId: string) => {
    const packPrompts = loadPackPrompts(packId);
    if (packPrompts) {
      // Filter out duplicates by checking against existing prompts
      const newUniquePrompts = packPrompts.filter(prompt => {
        const promptString = `${prompt.leftConcept} vs ${prompt.rightConcept}`;
        return !submittedPrompts.includes(promptString);
      });
      
      if (newUniquePrompts.length > 0) {
        // Load prompts one by one for multiplayer synchronization
        // Both hosts and non-hosts can submit prompts via submitCustomPrompt
        newUniquePrompts.forEach(prompt => {
          const promptString = `${prompt.leftConcept} vs ${prompt.rightConcept}`;
          submitCustomPrompt(promptString);
        });
      } else {
        alert('All prompts from this pack are already added to your game!');
      }
    }
  };

  // Convert submitted prompts to SpectrumConcept objects for pack saving
  const getSpectrumConceptsFromPrompts = (): SpectrumConcept[] => {
    return submittedPrompts.map((prompt, index) => {
      const parts = prompt.split(' vs ');
      return {
        id: `multiplayer-${Date.now()}-${index}`,
        leftConcept: parts[0]?.trim() || 'Left',
        rightConcept: parts[1]?.trim() || 'Right',
      };
    });
  };

  const handleBack = () => {
    if (multiplayerState.gameCode) {
      leaveGame();
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
      } catch {
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
                {player.isConnected && player.isHost && <span className="host-badge">Host</span>}
                {!player.isConnected && <span className="status-badge">Disconnected</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Game mode display for all players */}
        <div className="game-mode-display">
          <h3>Game Mode</h3>
          <div className="mode-options">
            <label className={`mode-option ${gameMode === 'normal' ? 'selected' : ''} ${!multiplayerState.isHost ? 'read-only' : ''}`}>
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
            
            <label className={`mode-option ${gameMode === 'custom' ? 'selected' : ''} ${!multiplayerState.isHost ? 'read-only' : ''}`}>
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
                
                {/* Show message when no prompts yet */}
                {submittedPrompts.length === 0 && (
                  <p className="waiting-for-prompts">Add some custom spectrums below!</p>
                )}

                {/* Host-only prompt input section */}
                <div className="prompt-input-section">
                  <div className="dual-prompt-input-group">
                    <input
                      type="text"
                      value={leftSide}
                      onChange={(e) => setLeftSide(e.target.value)}
                      onKeyPress={handlePromptKeyPress}
                      placeholder="Small"
                      maxLength={25}
                      className="prompt-side-input"
                    />
                    <span className="vs-divider">vs</span>
                    <input
                      type="text"
                      value={rightSide}
                      onChange={(e) => setRightSide(e.target.value)}
                      onKeyPress={handlePromptKeyPress}
                      placeholder="Big"
                      maxLength={25}
                      className="prompt-side-input"
                    />
                    <button 
                      onClick={submitPrompt} 
                      disabled={!leftSide.trim() || !rightSide.trim()}
                      className="submit-prompt-button"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>
            )}

            {gameMode === 'custom' && (userPacks.length > 0 || submittedPrompts.length > 0) && (
              <div className="pack-buttons-section">
                {userPacks.length > 0 && (
                  <select 
                    onChange={(e) => e.target.value && handleLoadFromPack(e.target.value)}
                    value=""
                    className="load-pack-button-compact"
                  >
                    <option value="">📦 Load Pack</option>
                    {userPacks.map(pack => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} ({pack.prompts.length})
                      </option>
                    ))}
                  </select>
                )}
                {submittedPrompts.length > 0 && (
                  <button
                    onClick={() => setShowPackModal(true)}
                    className="save-pack-button-compact"
                  >
                    💾 Save to Pack
                  </button>
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
            <div className="prompts-header">
              <h3>Spectrums</h3>
            </div>
            
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
                  placeholder="Small"
                  maxLength={25}
                  className="prompt-side-input"
                />
                <span className="vs-divider">vs</span>
                <input
                  type="text"
                  value={rightSide}
                  onChange={(e) => setRightSide(e.target.value)}
                  onKeyPress={handlePromptKeyPress}
                  placeholder="Big"
                  maxLength={25}
                  className="prompt-side-input"
                />
                <button 
                  onClick={submitPrompt} 
                  disabled={!leftSide.trim() || !rightSide.trim()}
                  className="submit-prompt-button"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {!multiplayerState.isHost && gameMode === 'custom' && (userPacks.length > 0 || submittedPrompts.length > 0) && (
          <div className="pack-buttons-section">
            {userPacks.length > 0 && (
              <select 
                onChange={(e) => e.target.value && handleLoadFromPack(e.target.value)}
                value=""
                className="load-pack-button-compact"
              >
                <option value="">📦 Load Pack</option>
                {userPacks.map(pack => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} ({pack.prompts.length})
                  </option>
                ))}
              </select>
            )}
            {submittedPrompts.length > 0 && (
              <button
                onClick={() => setShowPackModal(true)}
                className="save-pack-button-compact"
              >
                💾 Save to Pack
              </button>
            )}
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

        <PackSelectionModal
          isOpen={showPackModal}
          prompts={getSpectrumConceptsFromPrompts()}
          userPacks={userPacks}
          currentUsername={username || multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name}
          onClose={() => setShowPackModal(false)}
          onCreatePack={handleCreatePack}
          onAddToExistingPack={handleAddToExistingPack}
          onSetUsername={setCurrentUsername}
          isRemoteMode={true}
        />
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