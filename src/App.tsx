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
  const { multiplayerState, updateGameState } = socketInstance;

  const [clueInput, setClueInput] = useState('');
  const [playMode, setPlayMode] = useState<'local' | 'remote' | null>(null);

  // Listen for multiplayer game start events
  useEffect(() => {
    if (multiplayerState.gameStarted && multiplayerState.gameConfig) {
      console.log('Game started, initializing:', multiplayerState.gameConfig);
      console.log('Synced game state:', multiplayerState.syncedGameState);
      initializeAndStartGame(multiplayerState.gameConfig, multiplayerState.syncedGameState);
    }
  }, [multiplayerState.gameStarted, multiplayerState.gameConfig, multiplayerState.syncedGameState, initializeAndStartGame]);

  // Listen for game state updates in multiplayer
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.syncedGameState && gameState.gamePhase !== 'setup') {
      console.log('Received game state update:', multiplayerState.syncedGameState);
      // Apply the synced game state updates
      syncGameState(multiplayerState.syncedGameState);
    }
  }, [multiplayerState.syncedGameState, playMode, gameState.gamePhase, syncGameState]);

  // Sync game state changes to other players in multiplayer (for host only)
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.isHost && gameState.gamePhase !== 'setup') {
      console.log('Host syncing game state:', gameState);
      updateGameState(gameState);
    }
  }, [playMode, multiplayerState.isHost, gameState.currentPsychicIndex, gameState.currentRound, gameState.gamePhase, updateGameState]);

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

  const handleSubmitClue = () => {
    if (clueInput.trim()) {
      submitClue(clueInput);
      setClueInput('');
      
      // Sync state to other players in multiplayer mode
      if (playMode === 'remote') {
        const newGameState = {
          ...gameState,
          psychicClue: clueInput,
          gamePhase: 'guessing' as const,
        };
        updateGameState(newGameState);
      }
    }
  };

  const handleSubmitGuess = () => {
    submitGuess(gameState.dialPosition);
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
    return (
      <div className="game-container compact">
        <GameSetup onStartGame={handleGameSetup} onStartMultiplayer={handleMultiplayerSetup} />
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
  const showTarget = gameState.gamePhase === 'scoring';
  
  // Determine if current user is the active psychic in multiplayer
  const currentMultiplayerPlayer = multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId);
  const isCurrentPlayerPsychic = playMode === 'local' || 
    (playMode === 'remote' && currentMultiplayerPlayer && currentPlayer && 
     gameState.players.findIndex(p => p.name === currentMultiplayerPlayer.name) === gameState.currentPsychicIndex);

  return (
    <div className="game-container full-height">
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
        showTarget={showTarget || (gameState.gamePhase === 'psychic' && isCurrentPlayerPsychic)}
        onPositionChange={updateDialPosition}
        disabled={gameState.gamePhase === 'psychic' || gameState.gamePhase === 'scoring' || (gameState.gamePhase === 'guessing' && isCurrentPlayerPsychic)}
        hidePointer={gameState.gamePhase === 'psychic' && isCurrentPlayerPsychic}
        hideForNonPsychic={gameState.gamePhase === 'psychic' && !isCurrentPlayerPsychic}
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
