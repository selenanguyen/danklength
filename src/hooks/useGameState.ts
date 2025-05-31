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
    setGameState(prev => ({
      ...prev,
      psychicClue: clue,
      gamePhase: 'guessing',
    }));
  }, []);

  const submitGuess = useCallback((position: number) => {
    setGameState(prev => ({
      ...prev,
      dialPosition: position,
      gamePhase: 'scoring',
    }));
  }, []);

  const calculateScore = useCallback((dialPos: number, targetPos: number, targetWidth: number): ScoreResult => {
    const distance = Math.abs(dialPos - targetPos);
    const centerZone = targetWidth / 6;
    const innerZone = targetWidth * 2 / 3;
    const outerZone = targetWidth;
    
    if (distance <= centerZone) {
      return { points: 5, zone: 'center' };
    } else if (distance <= innerZone) {
      return { points: 3, zone: 'inner' };
    } else if (distance <= outerZone) {
      return { points: 2, zone: 'outer' };
    } else {
      return { points: 0, zone: 'miss' };
    }
  }, []);

  const finishRound = useCallback(() => {
    const { dialPosition, targetPosition, targetWidth, totalScore, roundScores, currentRound, totalRounds } = gameState;
    
    const result = calculateScore(dialPosition, targetPosition, targetWidth);
    const newTotalScore = totalScore + result.points;
    const newRoundScores = [...roundScores, result.points];
    
    if (currentRound >= totalRounds) {
      setGameState(prev => ({
        ...prev,
        totalScore: newTotalScore,
        roundScores: newRoundScores,
        gamePhase: 'ended',
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        totalScore: newTotalScore,
        roundScores: newRoundScores,
        gamePhase: 'scoring',
      }));
    }
  }, [gameState, calculateScore]);

  const initializeAndStartGame = useCallback((config: GameConfig, syncedGameState?: any) => {
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
      // Use synchronized values from server
      card = syncedGameState.currentCard;
      target = syncedGameState.targetPosition;
      targetWidth = syncedGameState.targetWidth;
    } else {
      // Generate locally for single-player mode
      card = config.mode === 'custom' && customPrompts.length > 0 
        ? customPrompts[0] 
        : getRandomConcept();
      target = generateTarget();
      targetWidth = generateTargetWidth();
    }

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