import { useState, useCallback } from 'react';
import type { GameState, GameConfig, Player, SpectrumConcept, ScoreResult } from '../types';
import { getRandomConcept } from '../data/spectrumConcepts';

const initialGameState: GameState = {
  gameMode: 'normal',
  players: [],
  currentPsychicIndex: 0,
  currentCard: null,
  targetPosition: 50,
  targetWidth: 20,
  dialPosition: 50,
  gamePhase: 'setup',
  psychicClue: '',
  currentRound: 0,
  totalRounds: 0,
  totalScore: 0,
  roundScores: [],
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const generateTarget = useCallback((): number => {
    return Math.floor(Math.random() * 101); // 0-100
  }, []);

  const generateTargetWidth = useCallback((): number => {
    return Math.floor(Math.random() * 20) + 15; // 15-35 width
  }, []);

  const initializeGame = useCallback((config: GameConfig) => {
    const players: Player[] = config.players.map((name, index) => ({
      id: `player-${index}`,
      name,
      isConnected: true,
    }));

    let customPrompts: SpectrumConcept[] = [];
    let totalRounds = 8;

    if (config.mode === 'custom' && config.customPrompts) {
      customPrompts = config.customPrompts.map((prompt, index) => ({
        id: `custom-${index}`,
        leftConcept: prompt.split(' vs ')[0] || 'Left',
        rightConcept: prompt.split(' vs ')[1] || 'Right',
      }));
      
      const promptsPerPlayer = Math.ceil(totalRounds / customPrompts.length);
      totalRounds = customPrompts.length * promptsPerPlayer;
    }

    setGameState(prev => ({
      ...prev,
      gameMode: config.mode,
      players,
      totalRounds,
      customPrompts: config.mode === 'custom' ? customPrompts : undefined,
      gamePhase: 'player-setup',
      currentRound: 0, // Reset round counter
    }));
  }, []);

  const startNewRound = useCallback(() => {
    setGameState(prev => {
      const { gameMode, customPrompts, currentRound, totalRounds, players } = prev;
      
      // Check if game should end
      if (currentRound >= totalRounds) {
        return { ...prev, gamePhase: 'ended' };
      }

      // Select card based on game mode
      let card: SpectrumConcept;
      if (gameMode === 'custom' && customPrompts && customPrompts.length > 0) {
        const promptIndex = Math.floor(currentRound / Math.ceil(totalRounds / customPrompts.length));
        card = customPrompts[promptIndex] || customPrompts[0];
      } else {
        card = getRandomConcept();
      }
      
      const target = generateTarget();
      const targetWidth = generateTargetWidth();
      
      return {
        ...prev,
        currentCard: card,
        targetPosition: target,
        targetWidth,
        dialPosition: 50,
        gamePhase: 'psychic',
        psychicClue: '',
        currentRound: prev.currentRound + 1,
        currentPsychicIndex: players.length > 0 ? (prev.currentPsychicIndex + 1) % players.length : 0,
      };
    });
  }, [generateTarget, generateTargetWidth]);

  const submitClue = useCallback((clue: string) => {
    console.log('useGameState.submitClue called with:', clue);
    setGameState(prev => {
      console.log('Transitioning from phase:', prev.gamePhase, 'to: guessing');
      return {
        ...prev,
        psychicClue: clue,
        gamePhase: 'guessing',
      };
    });
  }, []);

  // Shared function to calculate the adjusted target center (same logic as Dial component)
  const getAdjustedTargetCenter = useCallback((targetPos: number, targetWidth: number) => {
    let center = targetPos;
    const halfWidth = (targetWidth * 0.9) / 2; // Match the display scaling
    
    // Calculate the full target range
    const leftEdge = center - halfWidth;
    const rightEdge = center + halfWidth;
    
    // If only a small portion would wrap, adjust the center to avoid wrapping
    const wrapThreshold = halfWidth * 0.15; // 15% of target width
    
    if (leftEdge < 0 && Math.abs(leftEdge) < wrapThreshold) {
      // Small overhang on left - shift right to keep everything visible
      center = halfWidth;
    } else if (rightEdge > 100 && (rightEdge - 100) < wrapThreshold) {
      // Small overhang on right - shift left to keep everything visible  
      center = 100 - halfWidth;
    }
    
    return center;
  }, []);

  const calculateScore = useCallback((dialPos: number, targetPos: number, targetWidth: number): ScoreResult => {
    // Use the same adjusted center position as the visual display
    const adjustedCenter = getAdjustedTargetCenter(targetPos, targetWidth);
    
    // Calculate distance considering wrapping around the spectrum
    const straightDistance = Math.abs(dialPos - adjustedCenter);
    const wrapAroundDistance = 100 - straightDistance; // Distance going the other way around
    const distance = Math.min(straightDistance, wrapAroundDistance);
    
    const halfWidth = (targetWidth * 0.9) / 2; // Match the display scaling
    const centerWidth = halfWidth / 3;        // Blue center: 1/3 of half
    const innerWidth = halfWidth / 3.5;       // Purple zones: slightly smaller  
    const outerWidth = halfWidth / 4;         // Red zones: larger than before
    
    // Zone boundaries from center outward (total radius from center)
    const centerZone = centerWidth / 2;                    // Half of center width
    const innerZone = centerWidth / 2 + innerWidth;        // Center + one inner zone
    const outerZone = centerWidth / 2 + innerWidth + outerWidth; // Center + inner + outer
    
    console.log('Score calculation:', {
      dialPos,
      originalTarget: targetPos,
      adjustedCenter,
      straightDistance,
      wrapAroundDistance,
      distance,
      centerZone,
      innerZone,
      outerZone,
      halfWidth,
      targetWidth
    });
    
    if (distance <= centerZone) {
      return { points: 4, zone: 'center' }; // Blue center
    } else if (distance <= innerZone) {
      return { points: 3, zone: 'inner' }; // Purple zones
    } else if (distance <= outerZone) {
      return { points: 2, zone: 'outer' }; // Pink/red zones
    } else {
      return { points: 0, zone: 'miss' };
    }
  }, [getAdjustedTargetCenter]);

  const submitGuess = useCallback((position: number) => {
    setGameState(prev => ({
      ...prev,
      dialPosition: position,
      gamePhase: 'scoring',
    }));
  }, []);

  const finishRound = useCallback(() => {
    setGameState(prev => {
      const { dialPosition, targetPosition, targetWidth, totalScore, roundScores, currentRound, totalRounds } = prev;
      
      console.log('finishRound called:', { dialPosition, targetPosition, targetWidth });
      const result = calculateScore(dialPosition, targetPosition, targetWidth);
      console.log('Score result:', result);
      
      const newTotalScore = totalScore + result.points;
      const newRoundScores = [...roundScores, result.points];
      
      if (currentRound >= totalRounds) {
        return {
          ...prev,
          totalScore: newTotalScore,
          roundScores: newRoundScores,
          gamePhase: 'ended',
        };
      } else {
        return {
          ...prev,
          totalScore: newTotalScore,
          roundScores: newRoundScores,
          gamePhase: 'scoring',
        };
      }
    });
  }, [calculateScore]);

  const initializeAndStartGame = useCallback((config: GameConfig, syncedGameState?: Partial<GameState>) => {
    const players: Player[] = config.players.map((name, index) => ({
      id: `player-${index}`,
      name,
      isConnected: true,
    }));

    let customPrompts: SpectrumConcept[] = [];
    let totalRounds = 8;

    if (config.mode === 'custom' && config.customPrompts) {
      customPrompts = config.customPrompts.map((prompt, index) => ({
        id: `custom-${index}`,
        leftConcept: prompt.split(' vs ')[0] || 'Left',
        rightConcept: prompt.split(' vs ')[1] || 'Right',
      }));
      
      const promptsPerPlayer = Math.ceil(totalRounds / customPrompts.length);
      totalRounds = customPrompts.length * promptsPerPlayer;
    }

    // Use synced game state if provided (multiplayer), otherwise generate locally (local play)
    let card: SpectrumConcept;
    let target: number;
    let targetWidth: number;

    if (syncedGameState) {
      // Use the complete synchronized game state from server
      setGameState(prev => ({
        ...prev,
        ...syncedGameState,
        customPrompts: config.mode === 'custom' ? customPrompts : undefined,
      }));
    } else {
      // Generate locally for single-player mode
      card = config.mode === 'custom' && customPrompts.length > 0 
        ? customPrompts[0] 
        : getRandomConcept();
      target = generateTarget();
      targetWidth = generateTargetWidth();

      setGameState(prev => ({
        ...prev,
        gameMode: config.mode,
        players,
        totalRounds,
        customPrompts: config.mode === 'custom' ? customPrompts : undefined,
        currentCard: card,
        targetPosition: target,
        targetWidth,
        dialPosition: 50,
        gamePhase: 'psychic',
        psychicClue: '',
        currentRound: 1, // Start with round 1
        currentPsychicIndex: 0, // Start with first player
        totalScore: 0,
        roundScores: [],
      }));
    }
  }, [generateTarget, generateTargetWidth]);

  const resetGame = useCallback(() => {
    setGameState(initialGameState);
  }, []);

  const updateDialPosition = useCallback((position: number) => {
    setGameState(prev => ({
      ...prev,
      dialPosition: position,
    }));
  }, []);

  const syncGameState = useCallback((newGameState: Partial<GameState>) => {
    setGameState(prev => ({
      ...prev,
      ...newGameState,
    }));
  }, []);

  return {
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
  };
};