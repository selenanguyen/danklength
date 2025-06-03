import { useState, useCallback } from 'react';
import type { GameState, GameConfig, Player, SpectrumConcept, ScoreResult, GuessVote } from '../types';
import { getRandomConcept } from '../data/spectrumConcepts';

const initialGameState: GameState = {
  gameMode: 'normal',
  players: [],
  currentPsychicIndex: 0,
  currentCard: null,
  targetPosition: 50,
  targetWidth: 25,
  dialPosition: 50,
  gamePhase: 'setup',
  psychicClue: '',
  currentRound: 0,
  totalRounds: 0,
  totalScore: 0,
  roundScores: [],
  guessVotes: [],
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const generateTarget = useCallback((): number => {
    return Math.floor(Math.random() * 101); // 0-100
  }, []);

  const generateTargetWidth = useCallback((): number => {
    return 25; // Fixed 25% width for consistent target size
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
      
      // Check if game should end (using the incremented round number)
      const nextRound = currentRound + 1;
      if (nextRound > totalRounds) {
        return { ...prev, gamePhase: 'ended' };
      }

      const target = generateTarget();
      const targetWidth = generateTargetWidth();
      
      // For custom mode, go to voting phase first
      if (gameMode === 'custom' && customPrompts && customPrompts.length > 0) {
        return {
          ...prev,
          targetPosition: target,
          targetWidth,
          dialPosition: 50,
          gamePhase: 'prompt-voting',
          psychicClue: '',
          currentRound: nextRound,
          currentPsychicIndex: players.length > 0 ? (prev.currentPsychicIndex + 1) % players.length : 0,
          promptVotes: [],
          votingTimeLeft: 10,
        };
      } else {
        // For normal mode, select random card and go to psychic phase
        const card = getRandomConcept();
        return {
          ...prev,
          currentCard: card,
          targetPosition: target,
          targetWidth,
          dialPosition: 50,
          gamePhase: 'psychic',
          psychicClue: '',
          currentRound: nextRound,
          currentPsychicIndex: players.length > 0 ? (prev.currentPsychicIndex + 1) % players.length : 0,
        };
      }
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
        dialPosition: 50, // Reset dial to center position for voters
        guessVotes: [], // Clear any previous guess votes
      };
    });
  }, []);

  // Shared function to calculate the adjusted target center (EXACT same logic as Dial component)
  const getAdjustedTargetCenter = useCallback((targetPos: number) => {
    let center = targetPos;
    const totalTargetWidth = 25; // Total target area is 25% of spectrum
    const halfWidth = totalTargetWidth / 2; // 12.5% on each side of center
    
    // Calculate the full target range
    const leftEdge = center - halfWidth;
    const rightEdge = center + halfWidth;
    
    // If only a small portion would wrap, adjust the center to avoid wrapping
    const wrapThreshold = halfWidth * 0.15; // 15% of target width (match Dial exactly)
    
    if (leftEdge < 0 && Math.abs(leftEdge) < wrapThreshold) {
      // Small overhang on left - shift right to keep everything visible
      center = halfWidth;
      console.log('SCORE CALC: Target adjusted left to right:', targetPos, '→', center);
    } else if (rightEdge > 100 && (rightEdge - 100) < wrapThreshold) {
      // Small overhang on right - shift left to keep everything visible  
      center = 100 - halfWidth;
      console.log('SCORE CALC: Target adjusted right to left:', targetPos, '→', center);
    } else {
      console.log('SCORE CALC: Target not adjusted:', targetPos);
    }
    
    return center;
  }, []);

  const calculateScore = useCallback((dialPos: number, targetPos: number, targetWidth: number): ScoreResult => {
    console.log('=== SCORE CALCULATION TARGET ===');
    console.log('Original target position:', targetPos, 'Target width:', targetWidth);
    
    // IMPORTANT: This uses GAME LOGIC target size (25%), NOT visual display size
    // The visual target in Dial component can be different for better UX
    const adjustedCenter = getAdjustedTargetCenter(targetPos);
    
    // Calculate distance considering wrapping around the spectrum
    const straightDistance = Math.abs(dialPos - adjustedCenter);
    const wrapAroundDistance = 100 - straightDistance; // Distance going the other way around
    const distance = Math.min(straightDistance, wrapAroundDistance);
    
    // Total target area should be 25% of the spectrum
    const totalTargetWidth = 25; // 25% of the spectrum (0-100)
    const halfTargetWidth = totalTargetWidth / 2; // 12.5% on each side of center
    
    // Divide the total target area into 5 equal zones (1 center + 2 inner + 2 outer)
    // Each zone = 5% of spectrum width
    const zoneWidth = 5; // 5% per zone
    const centerZone = zoneWidth / 2;                 // Center: 2.5% from center (4 points)
    const innerZone = centerZone + zoneWidth;         // Inner: extends to 7.5% from center (3 points) 
    const outerZone = centerZone + (zoneWidth * 2);   // Outer: extends to 12.5% from center (2 points)
    
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
      totalTargetWidth,
      halfTargetWidth,
      targetWidth,
      wasAdjusted: adjustedCenter !== targetPos
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
    console.log('submitGuess function called with position:', position);
    setGameState(prev => {
      const { targetPosition, targetWidth, totalScore, roundScores, currentRound, totalRounds } = prev;
      
      console.log('submitGuess state update:', { 
        position, 
        targetPosition, 
        targetWidth, 
        currentRound, 
        totalRounds, 
        currentPhase: prev.gamePhase 
      });
      
      const result = calculateScore(position, targetPosition, targetWidth);
      console.log('Score result:', result);
      
      const newTotalScore = totalScore + result.points;
      const newRoundScores = [...roundScores, result.points];
      
      // Always go to scoring phase first to show the score
      console.log('Transitioning to scoring phase');
      return {
        ...prev,
        dialPosition: position,
        totalScore: newTotalScore,
        roundScores: newRoundScores,
        gamePhase: 'scoring',
      };
    });
  }, [calculateScore]);

  const finishRound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gamePhase: 'ended',
    }));
  }, []);

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

  const lockInGuess = useCallback((playerId: string, playerName: string) => {
    setGameState(prev => {
      const currentVotes = prev.guessVotes || [];
      const existingVoteIndex = currentVotes.findIndex(vote => vote.playerId === playerId);
      
      let newVotes;
      if (existingVoteIndex >= 0) {
        // Update existing vote
        newVotes = [...currentVotes];
        newVotes[existingVoteIndex] = {
          ...newVotes[existingVoteIndex],
          isLockedIn: true,
          dialPosition: prev.dialPosition,
        };
      } else {
        // Add new vote
        newVotes = [...currentVotes, {
          playerId,
          playerName,
          isLockedIn: true,
          dialPosition: prev.dialPosition,
        }];
      }
      
      return {
        ...prev,
        guessVotes: newVotes,
      };
    });
  }, []);

  const unlockGuess = useCallback((playerId: string) => {
    setGameState(prev => {
      const currentVotes = prev.guessVotes || [];
      const newVotes = currentVotes.map(vote => 
        vote.playerId === playerId 
          ? { ...vote, isLockedIn: false, dialPosition: prev.dialPosition }
          : vote
      );
      
      return {
        ...prev,
        guessVotes: newVotes,
      };
    });
  }, []);

  const updateGuessVotePosition = useCallback((playerId: string, playerName: string, position: number) => {
    setGameState(prev => {
      const currentVotes = prev.guessVotes || [];
      const existingVoteIndex = currentVotes.findIndex(vote => vote.playerId === playerId);
      
      let newVotes;
      if (existingVoteIndex >= 0) {
        // Update existing vote
        newVotes = [...currentVotes];
        newVotes[existingVoteIndex] = {
          ...newVotes[existingVoteIndex],
          isLockedIn: false, // Moving dial unlocks the vote
          dialPosition: position,
        };
      } else {
        // Add new vote (not locked in initially)
        newVotes = [...currentVotes, {
          playerId,
          playerName,
          isLockedIn: false,
          dialPosition: position,
        }];
      }
      
      return {
        ...prev,
        guessVotes: newVotes,
      };
    });
  }, []);

  const checkAllPlayersLockedIn = useCallback((players: Player[], psychicIndex: number, guessVotes: GuessVote[]) => {
    // Get non-psychic players
    const nonPsychicPlayers = players.filter((_, index) => index !== psychicIndex);
    
    // Check if all non-psychic players have locked in votes
    const lockedInVotes = guessVotes.filter(vote => vote.isLockedIn);
    
    return lockedInVotes.length >= nonPsychicPlayers.length && nonPsychicPlayers.length > 0;
  }, []);

  const lockInRemotePlayerGuess = useCallback((playerId: string, playerName: string, position: number) => {
    return new Promise<boolean>((resolve) => {
      setGameState(prev => {
        const currentVotes = prev.guessVotes || [];
        const updatedVotes = [...currentVotes];
        const existingVoteIndex = updatedVotes.findIndex(vote => vote.playerId === playerId);
        
        if (existingVoteIndex >= 0) {
          updatedVotes[existingVoteIndex] = {
            ...updatedVotes[existingVoteIndex],
            isLockedIn: true,
            dialPosition: position,
          };
        } else {
          updatedVotes.push({
            playerId,
            playerName,
            isLockedIn: true,
            dialPosition: position,
          });
        }
        
        // Check if all players are now locked in
        const allLockedIn = checkAllPlayersLockedIn(prev.players, prev.currentPsychicIndex, updatedVotes);
        
        const newState = {
          ...prev,
          guessVotes: updatedVotes,
        };
        
        // Resolve the promise with whether all players are locked in
        setTimeout(() => resolve(allLockedIn), 0);
        
        return newState;
      });
    });
  }, [checkAllPlayersLockedIn]);

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
    lockInGuess,
    unlockGuess,
    updateGuessVotePosition,
    checkAllPlayersLockedIn,
    lockInRemotePlayerGuess,
  };
};