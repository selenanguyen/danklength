import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useSocket } from './hooks/useSocket';
import { GameSetup } from './components/GameSetup/GameSetup';
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup';
import { MultiplayerLobby } from './components/MultiplayerLobby/MultiplayerLobby';
import { PromptVoting } from './components/PromptVoting/PromptVoting';
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
    lockInGuess,
    updateGuessVotePosition,
    checkAllPlayersLockedIn,
    lockInRemotePlayerGuess,
  } = useGameState();

  const socketInstance = useSocket();
  const { multiplayerState, updateGameState, reconnectToGame, getCachedGameSession, sendPlayerAction, voteForPrompt, lockInVote, nextRound } = socketInstance;

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

  // Listen for custom prompts updates in multiplayer (host included)
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.syncedGameState?.customPrompts && gameState.gamePhase === 'prompt-voting') {
      console.log('Host receiving custom prompts update:', multiplayerState.syncedGameState.customPrompts);
      // Update host's game state with new custom prompts
      syncGameState({ customPrompts: multiplayerState.syncedGameState.customPrompts });
    }
  }, [multiplayerState.syncedGameState?.customPrompts, playMode, gameState.gamePhase, syncGameState]);

  // Sync game state changes to other players in multiplayer (for host only)
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.isHost && gameState.gamePhase !== 'setup') {
      console.log('Host syncing game state:', gameState);
      // Don't sync promptVotes during voting phase - those are managed by voting system
      const stateToSync = gameState.gamePhase === 'prompt-voting' 
        ? { ...gameState, promptVotes: undefined }
        : gameState;
      updateGameState(stateToSync);
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
        const eventData = args[0] as { playerId: string; action: string; data: { position?: number; clue?: string; allPlayersReady?: boolean } };
        console.log('=== HOST RECEIVED PLAYER ACTION ===');
        console.log('Player action data:', eventData);
        
        if (eventData.action === 'lock-in-guess' && eventData.data.position !== undefined) {
          console.log('HOST: Processing lock-in-guess from player:', eventData.playerId, 'at position:', eventData.data.position);
          
          // Get player name from socket players
          const player = multiplayerState.players.find(p => p.id === eventData.playerId);
          if (!player) return;
          
          // Lock in this remote player's guess and check if all are ready
          lockInRemotePlayerGuess(eventData.playerId, player.name, eventData.data.position).then((allLockedIn) => {
            if (allLockedIn || eventData.data.allPlayersReady) {
              console.log('HOST: All players locked in, submitting guess at position:', gameState.dialPosition);
              submitGuess(gameState.dialPosition);
            }
          });
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
    console.log('=== HANDLE SUBMIT GUESS (LOCK IN) CALLED ===');
    
    // Get current player info
    let currentPlayerId: string;
    let currentPlayerName: string;
    
    if (playMode === 'remote') {
      const currentMultiplayerPlayer = multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId);
      if (!currentMultiplayerPlayer) return;
      currentPlayerId = currentMultiplayerPlayer.id;
      currentPlayerName = currentMultiplayerPlayer.name;
    } else {
      // For local mode, we need to determine which player is currently guessing
      // In local mode, all non-psychic players can vote
      currentPlayerId = 'local-guesser';
      currentPlayerName = 'Local Players';
    }
    
    // Lock in this player's guess
    lockInGuess(currentPlayerId, currentPlayerName);
    
    // Check if all players are now locked in
    const updatedVotes = [...(gameState.guessVotes || [])];
    const existingVoteIndex = updatedVotes.findIndex(vote => vote.playerId === currentPlayerId);
    if (existingVoteIndex >= 0) {
      updatedVotes[existingVoteIndex] = {
        ...updatedVotes[existingVoteIndex],
        isLockedIn: true,
        dialPosition: gameState.dialPosition,
      };
    } else {
      updatedVotes.push({
        playerId: currentPlayerId,
        playerName: currentPlayerName,
        isLockedIn: true,
        dialPosition: gameState.dialPosition,
      });
    }
    
    // Check if all non-psychic players have locked in
    const allLockedIn = checkAllPlayersLockedIn(gameState.players, gameState.currentPsychicIndex, updatedVotes);
    
    if (allLockedIn || playMode === 'local') {
      // All players locked in or local mode - submit the guess
      console.log('All players locked in, submitting guess at position:', gameState.dialPosition);
      
      if (playMode === 'remote') {
        if (multiplayerState.isHost) {
          // Host submits the guess
          submitGuess(gameState.dialPosition);
        } else {
          // Non-host sends lock-in action to host
          sendPlayerAction('lock-in-guess', { position: gameState.dialPosition, allPlayersReady: true });
        }
      } else {
        // Local mode - submit immediately
        submitGuess(gameState.dialPosition);
      }
    } else {
      console.log('Waiting for other players to lock in their guesses...');
      
      if (playMode === 'remote' && !multiplayerState.isHost) {
        // Send lock-in event to other players
        sendPlayerAction('lock-in-guess', { position: gameState.dialPosition });
      }
    }
  };

  const handleNextRound = () => {
    if (playMode === 'remote') {
      // In multiplayer, only the host should start new rounds and emit to server
      if (multiplayerState.isHost) {
        nextRound();
      }
    } else {
      // In local mode, anyone can advance
      startNewRound();
    }
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

  // Prompt voting phase (custom mode only)
  if (gameState.gamePhase === 'prompt-voting') {
    // For multiplayer, use synced state prompts; for local, use game state prompts
    const customPrompts = playMode === 'remote' 
      ? (multiplayerState.syncedGameState?.customPrompts || gameState.customPrompts || [])
      : (gameState.customPrompts || []);
    const promptVotes = playMode === 'remote' ? multiplayerState.promptVotes : (gameState.promptVotes || []);
    const votingTimeLeft = playMode === 'remote' ? multiplayerState.votingTimeLeft : (gameState.votingTimeLeft || 0);
    const currentPlayerId = playMode === 'remote' ? (multiplayerState.currentPlayerId || '') : 'local-player';

    return (
      <div className="game-container full-height">
        <PromptVoting
          customPrompts={customPrompts}
          promptVotes={promptVotes}
          votingTimeLeft={votingTimeLeft}
          currentPlayerId={currentPlayerId}
          onVotePrompt={voteForPrompt}
          onLockIn={lockInVote}
          onUnlockVote={() => {
            if (playMode === 'remote') {
              const { unlockVote } = socketInstance;
              unlockVote();
            }
          }}
          onAddNewPrompt={(prompt) => {
            if (playMode === 'remote') {
              const { submitCustomPromptDuringVoting } = socketInstance;
              submitCustomPromptDuringVoting(prompt);
            }
          }}
          currentRound={gameState.currentRound}
        />
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
          
          // Handle guess vote tracking
          if (gameState.gamePhase === 'guessing') {
            let currentPlayerId: string;
            let currentPlayerName: string;
            
            if (playMode === 'remote') {
              const currentMultiplayerPlayer = multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId);
              if (currentMultiplayerPlayer) {
                currentPlayerId = currentMultiplayerPlayer.id;
                currentPlayerName = currentMultiplayerPlayer.name;
                
                // Update this player's vote position and unlock if they were locked in
                updateGuessVotePosition(currentPlayerId, currentPlayerName, position);
              }
            } else {
              // For local mode, track position for all guessers
              currentPlayerId = 'local-guesser';
              currentPlayerName = 'Local Players';
              updateGuessVotePosition(currentPlayerId, currentPlayerName, position);
            }
          }
          
          // Send to other players in multiplayer mode
          if (playMode === 'remote') {
            const { updateDialPosition: sendDialUpdate } = socketInstance;
            sendDialUpdate(position);
          }
        }}
        disabled={gameState.gamePhase === 'scoring' || 
                  (gameState.gamePhase === 'guessing' && isCurrentPlayerPsychic) ||
                  (gameState.gamePhase === 'guessing' && checkAllPlayersLockedIn(gameState.players, gameState.currentPsychicIndex, gameState.guessVotes || []))}
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
            
            {/* Show voting status for multiplayer */}
            {playMode === 'remote' && gameState.guessVotes && gameState.guessVotes.length > 0 && (
              <div className="voting-status">
                <h4>Player Status:</h4>
                <div className="player-votes">
                  {gameState.players
                    .filter((_, index) => index !== gameState.currentPsychicIndex)
                    .map((player) => {
                      const vote = gameState.guessVotes?.find(v => 
                        gameState.players.find(p => p.name === player.name && 
                          (v.playerId === multiplayerState.players.find(mp => mp.name === p.name)?.id || v.playerId.includes(p.name)))
                      );
                      return (
                        <div key={player.id} className={`player-vote-status ${vote?.isLockedIn ? 'locked-in' : 'waiting'}`}>
                          {player.name}: {vote?.isLockedIn ? '✅ Locked In' : '⏳ Thinking...'}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            
            {isCurrentPlayerPsychic ? (
              <p>Watch your team work together to guess the target position! You can see live updates as they move the dial.</p>
            ) : (
              <>
                <p>Work together to position the dial where you think the target is! 
                   {playMode === 'remote' && ' All players can move the dial simultaneously - work together!'}
                </p>
                
                {(() => {
                  // Check if current player is locked in
                  let currentPlayerId = '';
                  if (playMode === 'remote') {
                    const currentMultiplayerPlayer = multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId);
                    currentPlayerId = currentMultiplayerPlayer?.id || '';
                  } else {
                    currentPlayerId = 'local-guesser';
                  }
                  
                  const currentPlayerVote = gameState.guessVotes?.find(vote => vote.playerId === currentPlayerId);
                  const isLockedIn = currentPlayerVote?.isLockedIn || false;
                  const allPlayersLockedIn = checkAllPlayersLockedIn(gameState.players, gameState.currentPsychicIndex, gameState.guessVotes || []);
                  
                  if (allPlayersLockedIn) {
                    return <p>🔒 All players have locked in their guesses! Calculating score...</p>;
                  } else if (isLockedIn) {
                    return (
                      <>
                        <p>✅ You've locked in your guess! Waiting for other players...</p>
                        <p><em>Move the dial to unlock and change your guess.</em></p>
                      </>
                    );
                  } else {
                    return (
                      <button 
                        className="action-button" 
                        onClick={handleSubmitGuess}
                        disabled={allPlayersLockedIn}
                      >
                        Lock In Guess
                      </button>
                    );
                  }
                })()}
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
            
            {playMode === 'local' || multiplayerState.isHost ? (
              <button className="action-button" onClick={handleNextRound}>
                {gameState.currentRound < gameState.totalRounds ? 'Next Round' : 'Finish Game'}
              </button>
            ) : (
              <p>{gameState.currentRound < gameState.totalRounds ? 'Waiting for host to start next round...' : 'Waiting for host to finish game...'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
