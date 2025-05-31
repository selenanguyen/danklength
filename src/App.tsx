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
    resetGame,
    updateDialPosition,
    calculateScore,
    syncGameState,
  } = useGameState();

  const socketInstance = useSocket();
  const { multiplayerState, updateGameState, reconnectToGame, getCachedGameSession, sendPlayerAction } = socketInstance;

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

  // Listen for dial updates from all players for real-time synchronization
  useEffect(() => {
    if (playMode === 'remote') {
      const handleDialUpdate = (...args: unknown[]) => {
        const data = args[0] as { position: number; playerId: string };
        console.log('Received dial update:', data);
        // Update dial position for all players in real-time
        updateDialPosition(data.position);
      };

      const { addEventListener, removeEventListener } = socketInstance;
      addEventListener('dial-updated', handleDialUpdate);
      
      return () => {
        removeEventListener('dial-updated', handleDialUpdate);
      };
    }
  }, [playMode, socketInstance, updateDialPosition]);

  // Listen for player actions (like lock-in-guess) - host only
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.isHost) {
      const handlePlayerAction = (...args: unknown[]) => {
        const eventData = args[0] as { playerId: string; action: string; data: { position?: number; clue?: string } };
        console.log('=== HOST RECEIVED PLAYER ACTION ===');
        console.log('Player action data:', eventData);
        
        if (eventData.action === 'lock-in-guess' && eventData.data.position !== undefined) {
          console.log('HOST: Processing lock-in-guess from player:', eventData.playerId, 'at position:', eventData.data.position);
          submitGuess(eventData.data.position);
        } else if (eventData.action === 'submit-clue' && eventData.data.clue !== undefined) {
          console.log('HOST: Processing submit-clue from player:', eventData.playerId, 'clue:', eventData.data.clue);
          submitClue(eventData.data.clue);
        } else {
          console.log('HOST: Unhandled action or missing data:', eventData.action, eventData.data);
        }
      };

      const { addEventListener, removeEventListener } = socketInstance;
      addEventListener('player-action', handlePlayerAction);
      
      return () => {
        removeEventListener('player-action', handlePlayerAction);
      };
    }
  }, [playMode, multiplayerState.isHost, socketInstance, submitGuess]);

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
      console.log('=== HANDLE SUBMIT CLUE CALLED ===');
      console.log('Clue:', clueInput, 'Current phase:', gameState.gamePhase);
      console.log('Is host:', multiplayerState.isHost, 'Play mode:', playMode);
      
      if (playMode === 'remote') {
        if (multiplayerState.isHost) {
          // Host submits clue directly
          console.log('Host submitting clue:', clueInput);
          submitClue(clueInput);
        } else {
          // Non-host: send clue to host for processing
          console.log('Non-host sending clue to host:', clueInput);
          sendPlayerAction('submit-clue', { clue: clueInput });
        }
      } else {
        // Local mode: submit directly
        console.log('Local mode: submitting clue:', clueInput);
        submitClue(clueInput);
      }
      
      setClueInput('');
    }
  };

  const handleSubmitGuess = () => {
    console.log('=== HANDLE SUBMIT GUESS CALLED ===');
    console.log('Current game state:', {
      phase: gameState.gamePhase,
      round: gameState.currentRound,
      totalRounds: gameState.totalRounds,
      dialPosition: gameState.dialPosition,
      playMode,
      isHost: multiplayerState.isHost
    });
    
    if (playMode === 'remote') {
      if (multiplayerState.isHost) {
        // Host handles guess submission and scoring
        console.log('Host submitting guess at position:', gameState.dialPosition);
        submitGuess(gameState.dialPosition);
      } else {
        // Non-host: emit a "lock-in-guess" event to the host
        console.log('Non-host locking in guess at position:', gameState.dialPosition);
        console.log('Sending lock-in-guess action to host...');
        sendPlayerAction('lock-in-guess', { position: gameState.dialPosition });
      }
    } else {
      // In local mode, submit guess and calculate score immediately
      console.log('Local mode: submitting guess at position:', gameState.dialPosition);
      submitGuess(gameState.dialPosition);
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
    // This should not be needed anymore since submitGuess automatically 
    // transitions to 'ended' when currentRound >= totalRounds
    console.log('handleFinishGame called - this should not happen');
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
        <PlayerSetup onStartGame={handlePlayerSetup} onBackToMain={handleBackToWelcome} />
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

  // Debug logging for psychic role detection
  console.log('=== PSYCHIC ROLE DEBUG ===');
  console.log('Game state:', {
    phase: gameState.gamePhase,
    round: gameState.currentRound,
    psychicIndex: gameState.currentPsychicIndex,
    currentPlayer: currentPlayer?.name,
    players: gameState.players.map(p => p.name)
  });
  console.log('Multiplayer state:', {
    currentPlayerId: multiplayerState.currentPlayerId,
    currentPlayerName: currentMultiplayerPlayer?.name,
    isHost: multiplayerState.isHost
  });
  console.log('Role calculation:', {
    isCurrentPlayerPsychic,
    playMode,
    playerIndexInGame: currentMultiplayerPlayer && currentPlayer ? 
      gameState.players.findIndex(p => p.name === currentMultiplayerPlayer.name) : -1
  });

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
        onPositionChange={(position) => {
          // Update local position
          updateDialPosition(position);
          // Send to other players in multiplayer mode
          if (playMode === 'remote') {
            const { updateDialPosition: sendDialUpdate } = socketInstance;
            sendDialUpdate(position);
          }
        }}
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
              <p>Watch your team work together to guess the target position! You can see live updates as they move the dial.</p>
            ) : (
              <>
                <p>Work together to position the dial where you think the target is! 
                   {playMode === 'remote' && ' All players can move the dial simultaneously - work together!'}
                </p>
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
