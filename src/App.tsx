import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
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
  } = useGameState();

  const [clueInput, setClueInput] = useState('');
  const [playMode, setPlayMode] = useState<'local' | 'remote' | null>(null);

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

  const handleMultiplayerGameStart = (config: GameConfig) => {
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
    }
  };

  const handleSubmitGuess = () => {
    submitGuess(gameState.dialPosition);
  };

  const handleNextRound = () => {
    startNewRound();
  };

  const handleFinishGame = () => {
    finishRound();
  };

  // Welcome screen
  if (gameState.gamePhase === 'setup' && playMode === null) {
    return <GameSetup onStartGame={handleGameSetup} onStartMultiplayer={handleMultiplayerSetup} />;
  }

  // Multiplayer lobby
  if (playMode === 'remote' && gameState.gamePhase === 'setup') {
    return (
      <MultiplayerLobby 
        onGameStart={handleMultiplayerGameStart}
        onBackToLocal={handleBackToWelcome}
      />
    );
  }

  // Player setup screen (local only)
  if (gameState.gamePhase === 'player-setup' && playMode === 'local') {
    return <PlayerSetup onStartGame={handlePlayerSetup} />;
  }

  // Game ended screen
  if (gameState.gamePhase === 'ended') {
    const { totalScore, roundScores, players } = gameState;
    const maxPossibleScore = roundScores.length * 5;
    const percentage = Math.round((totalScore / maxPossibleScore) * 100);
    
    return (
      <div className="game-container">
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

  return (
    <div className="game-container">
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
          showConcepts={gameState.gamePhase !== 'guessing'}
        />
      )}

      <Dial
        position={gameState.dialPosition}
        targetPosition={gameState.targetPosition}
        targetWidth={gameState.targetWidth}
        showTarget={showTarget}
        onPositionChange={updateDialPosition}
        disabled={gameState.gamePhase === 'psychic' || gameState.gamePhase === 'scoring'}
      />

      <div className="game-controls">
        {gameState.gamePhase === 'psychic' && (
          <div className="psychic-phase">
            <h3>🔮 {currentPlayer?.name}'s Turn</h3>
            <p><strong>Others close your eyes!</strong></p>
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
          </div>
        )}

        {gameState.gamePhase === 'guessing' && (
          <div className="guessing-phase">
            <h3>🎯 Team Guessing</h3>
            <p><strong>Clue:</strong> "{gameState.psychicClue}"</p>
            <p>Work together to position the dial where you think the target is!</p>
            <button className="action-button" onClick={handleSubmitGuess}>
              Lock In Guess
            </button>
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
              <button className="action-button" onClick={handleNextRound}>
                Next Round
              </button>
            ) : (
              <button className="action-button" onClick={handleFinishGame}>
                Finish Game
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
