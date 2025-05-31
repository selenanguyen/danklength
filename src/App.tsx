import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useSocket } from './hooks/useSocket';
import { GameSetup } from './components/GameSetup/GameSetup';
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup';
import { MultiplayerLobby } from './components/MultiplayerLobby/MultiplayerLobby';
import { SpectrumCard } from './components/SpectrumCard/SpectrumCard';
import { Dial } from './components/Dial/Dial';
import type { GameConfig } from './types';
import './App.css';

function App() {
  const {
    gameState,
    initializeGame,
    initializeAndStartGame,
    startNewRound,
    submitClue,
    submitGuess,
    finishRound,
    resetGame,
    updateDialPosition,
    calculateScore,
    syncGameState,
  } = useGameState();

  const socketInstance = useSocket();
  const { multiplayerState, updateGameState, reconnectToGame, getCachedGameSession } = socketInstance;

  const [clueInput, setClueInput] = useState('');
  const [playMode, setPlayMode] = useState<'local' | 'remote' | null>(null);

  // Listen for multiplayer game start events
  useEffect(() => {
    if (multiplayerState.gameStarted && multiplayerState.gameConfig) {
      console.log('Game started, initializing:', multiplayerState.gameConfig);
      console.log('Synced game state:', multiplayerState.syncedGameState);
      initializeAndStartGame(multiplayerState.gameConfig, multiplayerState.syncedGameState || undefined);
    }
  }, [multiplayerState.gameStarted, multiplayerState.gameConfig, multiplayerState.syncedGameState, initializeAndStartGame]);

  // Listen for game state updates in multiplayer (non-host only)
  useEffect(() => {
    if (playMode === 'remote' && !multiplayerState.isHost && multiplayerState.syncedGameState && gameState.gamePhase !== 'setup') {
      console.log('Received game state update:', multiplayerState.syncedGameState);
      // Apply the synced game state updates
      syncGameState(multiplayerState.syncedGameState);
    }
  }, [multiplayerState.syncedGameState, playMode, multiplayerState.isHost, gameState.gamePhase, syncGameState]);

  // Sync game state changes to other players in multiplayer (for host only)
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.isHost && gameState.gamePhase !== 'setup') {
      console.log('Host syncing game state:', gameState);
      updateGameState(gameState);
    }
  }, [playMode, multiplayerState.isHost, gameState.currentPsychicIndex, gameState.currentRound, gameState.gamePhase, gameState.psychicClue, updateGameState]);

  // Listen for dial updates from other players (host only)
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.isHost && gameState.gamePhase === 'guessing') {
      const handleDialUpdate = (...args: unknown[]) => {
        const data = args[0] as { position: number; playerId: string };
        console.log('Host received dial update during guessing:', data);
        // Update local dial position and then process the guess
        updateDialPosition(data.position);
        setTimeout(() => {
          submitGuess(data.position);
          finishRound();
        }, 100); // Small delay to ensure dial position is updated
      };

      const { addEventListener, removeEventListener } = socketInstance;
      addEventListener('dial-updated', handleDialUpdate);
      
      return () => {
        removeEventListener('dial-updated', handleDialUpdate);
      };
    }
  }, [playMode, multiplayerState.isHost, gameState.gamePhase, socketInstance, submitGuess, finishRound, updateDialPosition]);

  const handleGameSetup = () => {
    setPlayMode('local');
    initializeGame({ mode: 'normal', players: [] });
  };

  const handleMultiplayerSetup = () => {
    setPlayMode('remote');
  };

  const handlePlayerSetup = (config: GameConfig) => {
    initializeAndStartGame(config);
  };

  const handleBackToWelcome = () => {
    setPlayMode(null);
    resetGame();
  };

  const handleReconnect = () => {
    const success = reconnectToGame();
    if (success) {
      setPlayMode('remote');
    }
  };

  const handleSubmitClue = () => {
    if (clueInput.trim()) {
      console.log('Submitting clue:', clueInput, 'Current phase:', gameState.gamePhase);
      submitClue(clueInput);
      setClueInput('');
      console.log('Clue submitted, local state should update to guessing phase');
      // Note: In multiplayer mode, state sync happens automatically via useEffect
      // after submitClue updates the local state
    }
  };

  const handleSubmitGuess = () => {
    console.log('handleSubmitGuess called with dial position:', gameState.dialPosition);
    
    if (playMode === 'remote') {
      if (multiplayerState.isHost) {
        // Host handles guess submission and scoring
        console.log('Host submitting guess at position:', gameState.dialPosition);
        submitGuess(gameState.dialPosition);
        finishRound();
      } else {
        // Non-host: send dial position to host, then host will process
        console.log('Non-host sending dial position to host:', gameState.dialPosition);
        const { updateDialPosition } = socketInstance;
        updateDialPosition(gameState.dialPosition);
        // Send a signal to host to process the guess
        // For now, we'll have host auto-process when they receive dial update during guessing phase
      }
    } else {
      // In local mode, submit guess and calculate score immediately
      submitGuess(gameState.dialPosition);
      finishRound();
    }
  };

  const handleNextRound = () => {
    if (playMode === 'remote') {
      // In multiplayer, only the host should start new rounds and sync
      if (multiplayerState.isHost) {
        startNewRound();
      }
    } else {
      // In local mode, anyone can advance
      startNewRound();
    }
  };

  const handleFinishGame = () => {
    finishRound();
  };

  // Welcome screen
  if (gameState.gamePhase === 'setup' && playMode === null) {
    const cachedSession = getCachedGameSession();
    return (
      <div className="game-container compact">
        <GameSetup 
          onStartGame={handleGameSetup} 
          onStartMultiplayer={handleMultiplayerSetup}
          onReconnect={cachedSession ? handleReconnect : undefined}
          cachedGameCode={cachedSession?.gameCode}
        />
      </div>
    );
  }

  // Multiplayer lobby
  if (playMode === 'remote' && gameState.gamePhase === 'setup') {
    return (
      <div className="game-container compact">
        <MultiplayerLobby 
          onBackToLocal={handleBackToWelcome}
          socketInstance={socketInstance}
        />
      </div>
    );
  }

  // Player setup screen (local only)
  if (gameState.gamePhase === 'player-setup' && playMode === 'local') {
    return (
      <div className="game-container compact">
        <PlayerSetup onStartGame={handlePlayerSetup} />
      </div>
    );
  }

  // Game ended screen
  if (gameState.gamePhase === 'ended') {
    const { totalScore, roundScores, players } = gameState;
    const maxPossibleScore = roundScores.length * 5;
    const percentage = Math.round((totalScore / maxPossibleScore) * 100);
    
    return (
      <div className="game-container compact">
        <div className="game-ended">
          <h1>🎉 Game Complete! 🎉</h1>
          
          <div className="final-score">
            <div className="score-display">
              <div className="total-score">{totalScore}</div>
              <div className="score-details">
                out of {maxPossibleScore} points ({percentage}%)
              </div>
            </div>
          </div>

          <div className="round-breakdown">
            <h3>Round Breakdown</h3>
            <div className="rounds-grid">
              {roundScores.map((score, index) => (
                <div key={index} className="round-score">
                  <span className="round-label">Round {index + 1}</span>
                  <span className="round-points">{score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="players-list-final">
            <h3>Players</h3>
            <div className="players">
              {players.map((player, index) => (
                <span key={player.id} className="player-name">
                  {player.name}
                  {index < players.length - 1 && ', '}
                </span>
              ))}
            </div>
          </div>

          <button className="action-button" onClick={resetGame}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPsychicIndex];
  
  // Determine if current user is the active psychic in multiplayer
  const currentMultiplayerPlayer = multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId);
  const isCurrentPlayerPsychic = playMode === 'local' || 
    (playMode === 'remote' && currentMultiplayerPlayer && currentPlayer && 
     gameState.players.findIndex(p => p.name === currentMultiplayerPlayer.name) === gameState.currentPsychicIndex);

  // Show target zones: for psychic during psychic phase, or for everyone during scoring
  const showTarget = (gameState.gamePhase === 'psychic' && isCurrentPlayerPsychic) || 
                    gameState.gamePhase === 'scoring';

  // Check if player is disconnected during remote play
  const isDisconnectedDuringGame = playMode === 'remote' && !multiplayerState.isConnected && gameState.gamePhase !== 'setup';

  return (
    <div className="game-container full-height">
      {/* Disconnection overlay */}
      {isDisconnectedDuringGame && (
        <div className="disconnection-overlay">
          <div className="disconnection-modal">
            <h2>⚠️ Connection Lost</h2>
            <p>You've been disconnected from the game.</p>
            <div className="reconnection-actions">
              <button className="reconnect-button" onClick={handleReconnect}>
                🔄 Reconnect
              </button>
              <button className="leave-game-button" onClick={handleBackToWelcome}>
                🏠 Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="game-header">
        <div className="game-progress">
          <span className="round-info">
            Round {gameState.currentRound} of {gameState.totalRounds}
          </span>
          <span className="score-info">
            Total Score: {gameState.totalScore}
          </span>
        </div>
      </div>

      {gameState.currentCard && (
        <SpectrumCard
          concept={gameState.currentCard}
          showConcepts={true}
        />
      )}

      <Dial
        position={gameState.dialPosition}
        targetPosition={gameState.targetPosition}
        targetWidth={gameState.targetWidth}
        showTarget={showTarget}
        onPositionChange={updateDialPosition}
        disabled={gameState.gamePhase === 'scoring' || (gameState.gamePhase === 'guessing' && isCurrentPlayerPsychic)}
        hidePointer={false}
        hideForNonPsychic={gameState.gamePhase === 'psychic' && !isCurrentPlayerPsychic}
        isPsychicPhase={gameState.gamePhase === 'psychic' && isCurrentPlayerPsychic}
        hideInstructions={gameState.gamePhase === 'guessing'}
      />

      <div className="game-controls">
        {gameState.gamePhase === 'psychic' && (
          <div className="psychic-phase">
            <h3>🔮 {currentPlayer?.name}'s Turn</h3>
            {playMode === 'local' && <p><strong>Others close your eyes!</strong></p>}
            {playMode === 'remote' && (
              <p>
                <strong>Psychic:</strong> {currentPlayer?.name} 
                {isCurrentPlayerPsychic ? ' (You!)' : ''}
              </p>
            )}
            
            {isCurrentPlayerPsychic ? (
              <>
                <p>Give your team a clue for where the target is on this spectrum:</p>
                <div className="clue-input">
                  <input
                    type="text"
                    value={clueInput}
                    onChange={(e) => setClueInput(e.target.value)}
                    placeholder="Enter your clue..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitClue()}
                  />
                  <button onClick={handleSubmitClue} disabled={!clueInput.trim()}>
                    Submit Clue
                  </button>
                </div>
              </>
            ) : (
              <p>Waiting for {currentPlayer?.name} to give a clue...</p>
            )}
          </div>
        )}

        {gameState.gamePhase === 'guessing' && (
          <div className="guessing-phase">
            <h3>🎯 Team Guessing</h3>
            <p><strong>Clue:</strong> "{gameState.psychicClue}"</p>
            {isCurrentPlayerPsychic ? (
              <p>Watch your team work together to guess the target position!</p>
            ) : (
              <>
                <p>Work together to position the dial where you think the target is!</p>
                <button className="action-button" onClick={handleSubmitGuess}>
                  Lock In Guess
                </button>
              </>
            )}
          </div>
        )}

        {gameState.gamePhase === 'scoring' && (
          <div className="scoring-phase">
            <h3>📊 Round Results</h3>
            {(() => {
              const result = calculateScore(
                gameState.dialPosition, 
                gameState.targetPosition, 
                gameState.targetWidth
              );
              return (
                <div className="score-result">
                  <div className="points-earned">+{result.points} points</div>
                  <div className="zone-hit">Zone: {result.zone}</div>
                </div>
              );
            })()}
            
            {gameState.currentRound < gameState.totalRounds ? (
              playMode === 'local' || multiplayerState.isHost ? (
                <button className="action-button" onClick={handleNextRound}>
                  Next Round
                </button>
              ) : (
                <p>Waiting for host to start next round...</p>
              )
            ) : (
              playMode === 'local' || multiplayerState.isHost ? (
                <button className="action-button" onClick={handleFinishGame}>
                  Finish Game
                </button>
              ) : (
                <p>Waiting for host to finish game...</p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
