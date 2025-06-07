import { useState, useEffect, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { useSocket } from './hooks/useSocket';
import { GameSetup } from './components/GameSetup/GameSetup';
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup';
import { MultiplayerLobby } from './components/MultiplayerLobby/MultiplayerLobby';
import { PromptVoting } from './components/PromptVoting/PromptVoting';
import { PsychicAnnouncement } from './components/PsychicAnnouncement/PsychicAnnouncement';
import { SpectrumCard } from './components/SpectrumCard/SpectrumCard';
import { Dial } from './components/Dial/Dial';
import { ScoreReveal } from './components/ScoreReveal/ScoreReveal';
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
    unlockAllPlayerGuesses,
    checkAllPlayersLockedIn,
    lockInRemotePlayerGuess,
    startPsychicPhase,
    voteForPromptLocal,
    lockInPromptVote,
    unlockPromptVote,
    addCustomPromptDuringVoting,
    finishPromptVoting,
  } = useGameState();

  const socketInstance = useSocket();
  const { multiplayerState, updateGameState, reconnectToGame, getCachedGameSession, sendPlayerAction, voteForPrompt, lockInVote, nextRound, resetGameKeepRoom, voteToSkipPlayer } = socketInstance;

  const [clueInput, setClueInput] = useState('');
  const [playMode, setPlayMode] = useState<'local' | 'remote' | null>(null);
  const [lastGameConfig, setLastGameConfig] = useState<GameConfig | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hostRecentlyReconnected, setHostRecentlyReconnected] = useState(false);

  // Emoji reaction system
  const [fallingEmojis, setFallingEmojis] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
  }>>([]);

  const EMOJIS = ['😍', '😭', '😠', '🪩', '😘', '💩'];

  // Emoji reaction functions
  const createFallingEmoji = useCallback((emoji: string) => {
    const newEmoji = {
      id: Date.now() + Math.random().toString(),
      emoji,
      x: Math.random() * (window.innerWidth - 50) + 25, // Random x position with padding
      y: -50 // Start above screen
    };
    
    setFallingEmojis(prev => [...prev, newEmoji]);
    
    // Remove emoji after animation completes
    setTimeout(() => {
      setFallingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 3000);
  }, []);

  const handleEmojiClick = useCallback((emoji: string) => {
    // Create local falling emoji immediately
    createFallingEmoji(emoji);
    
    // Send to other players if connected
    if (playMode === 'remote' && multiplayerState.isConnected) {
      sendPlayerAction('emoji-reaction', { emoji });
    }
  }, [playMode, multiplayerState.isConnected, sendPlayerAction, createFallingEmoji]);

  // Listen for emoji reactions from other players
  useEffect(() => {
    if (playMode !== 'remote') return;

    const handleEmojiReaction = (...args: unknown[]) => {
      const data = args[0] as { emoji: string };
      createFallingEmoji(data.emoji);
    };

    const { addEventListener, removeEventListener } = socketInstance;
    addEventListener('emoji-reaction', handleEmojiReaction);
    return () => {
      removeEventListener('emoji-reaction', handleEmojiReaction);
    };
  }, [playMode, socketInstance, createFallingEmoji]);

  // Listen for host transfer events to detect when original host reconnects
  useEffect(() => {
    if (playMode !== 'remote') return;

    const handleHostTransferred = (...args: unknown[]) => {
      const data = args[0] as { newHostId: string; newHostName: string };
      const currentPlayerId = multiplayerState.currentPlayerId;
      
      // If we (the current player) just became host, mark as recently reconnected
      if (currentPlayerId === data.newHostId) {
        console.log('CLIENT: We just became host (likely reconnected), setting reconnection flag');
        setHostRecentlyReconnected(true);
      }
    };

    const { addEventListener, removeEventListener } = socketInstance;
    addEventListener('host-transferred', handleHostTransferred);
    return () => {
      removeEventListener('host-transferred', handleHostTransferred);
    };
  }, [playMode, socketInstance, multiplayerState.currentPlayerId]);

  // Listen for multiplayer game start events
  useEffect(() => {
    if (multiplayerState.gameStarted && multiplayerState.gameConfig) {
      console.log('Game started, initializing:', multiplayerState.gameConfig);
      console.log('Synced game state:', multiplayerState.syncedGameState);
      initializeAndStartGame(multiplayerState.gameConfig, multiplayerState.syncedGameState || undefined);
    }
  }, [multiplayerState.gameStarted, multiplayerState.gameConfig, multiplayerState.syncedGameState, initializeAndStartGame]);

  // Listen for game state updates in multiplayer
  useEffect(() => {
    if (playMode === 'remote' && multiplayerState.syncedGameState && gameState.gamePhase !== 'setup') {
      console.log('CLIENT: Received game state update:', multiplayerState.syncedGameState);
      console.log('CLIENT: Current local skippedPlayers:', gameState.skippedPlayers);
      console.log('CLIENT: Incoming skippedPlayers:', multiplayerState.syncedGameState.skippedPlayers);
      
      if (multiplayerState.isHost) {
        // Host only syncs connection-related fields to avoid overriding their own game state
        const connectionFields = {
          players: multiplayerState.syncedGameState.players,
          skippedPlayers: multiplayerState.syncedGameState.skippedPlayers
        };
        console.log('CLIENT: Host syncing connection fields:', connectionFields);
        console.log('CLIENT: Host local state BEFORE sync - skippedPlayers:', gameState.skippedPlayers);
        syncGameState(connectionFields);
        console.log('CLIENT: Host should now have updated local state');
        
        // If host was just marked as recently reconnected, clear that flag after state sync
        if (hostRecentlyReconnected) {
          console.log('CLIENT: Host state synced after reconnection, clearing reconnection flag');
          setHostRecentlyReconnected(false);
        }
      } else {
        // Non-host players apply the full synced game state
        console.log('CLIENT: Non-host syncing full game state');
        syncGameState(multiplayerState.syncedGameState);
      }
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
      
      // Don't sync if the host recently reconnected and hasn't synced server state yet
      if (hostRecentlyReconnected) {
        console.log('Host recently reconnected and hasn\'t synced server state yet, skipping sync to prevent overriding server state');
        return;
      }
      
      // Also don't sync if the host's local state has themselves in skippedPlayers - this indicates stale state
      const hostPlayerName = multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name;
      const hostIsInSkippedList = hostPlayerName && gameState.skippedPlayers?.includes(hostPlayerName);
      
      if (hostIsInSkippedList) {
        console.log('Host has stale local state (self in skippedPlayers), skipping sync to prevent overriding server state');
        return;
      }
      
      // Don't sync promptVotes during voting phase - those are managed by voting system
      const stateToSync = gameState.gamePhase === 'prompt-voting' 
        ? { ...gameState, promptVotes: undefined }
        : gameState;
      updateGameState(stateToSync);
    }
  }, [playMode, multiplayerState.isHost, gameState.currentPsychicIndex, gameState.currentRound, gameState.gamePhase, gameState.psychicClue, gameState.skippedPlayers, multiplayerState.players, multiplayerState.currentPlayerId, hostRecentlyReconnected, updateGameState]);

  // Handle automatic progression from prompt voting in local mode
  useEffect(() => {
    if (playMode === 'local' && gameState.gamePhase === 'prompt-voting' && !isTransitioning) {
      const promptVotes = gameState.promptVotes || [];
      const votingTimeLeft = gameState.votingTimeLeft || 0;
      
      // Check if voting should finish (timer expired OR player locked in)
      const playerLockedIn = promptVotes.some(vote => vote.playerId === 'local-player' && vote.isLockedIn);
      
      if (votingTimeLeft <= 0 || playerLockedIn) {
        setIsTransitioning(true);
        
        // If timer expired and player has a vote but hasn't locked in, lock it in first
        const playerVote = promptVotes.find(vote => vote.playerId === 'local-player');
        const needsLockIn = votingTimeLeft <= 0 && playerVote && !playerVote.isLockedIn && playerVote.promptId !== '';
        
        if (needsLockIn) {
          lockInPromptVote('local-player');
          // Then finish voting after a short delay
          setTimeout(() => {
            finishPromptVoting();
          }, 500);
        } else {
          // Small delay to show the locked in state before transitioning
          const delay = playerLockedIn ? 1000 : 0;
          setTimeout(() => {
            finishPromptVoting();
          }, delay);
        }
      }
    }
  }, [playMode, gameState.gamePhase, gameState.promptVotes, gameState.votingTimeLeft, isTransitioning]);

  // Reset transitioning flag when game phase changes
  useEffect(() => {
    if (gameState.gamePhase !== 'prompt-voting') {
      setIsTransitioning(false);
    }
  }, [gameState.gamePhase]);

  // Listen for dial updates from all players for real-time synchronization
  useEffect(() => {
    if (playMode === 'remote') {
      const handleDialUpdate = (...args: unknown[]) => {
        const data = args[0] as { position: number; playerId: string };
        console.log('Received dial update:', data);
        // Update dial position for all players in real-time
        updateDialPosition(data.position);
        // Unlock all players when ANY player moves the dial
        if (gameState.gamePhase === 'guessing') {
          unlockAllPlayerGuesses();
        }
      };

      const { addEventListener, removeEventListener } = socketInstance;
      addEventListener('dial-updated', handleDialUpdate);
      
      return () => {
        removeEventListener('dial-updated', handleDialUpdate);
      };
    }
  }, [playMode, socketInstance, updateDialPosition, unlockAllPlayerGuesses, gameState.gamePhase]);

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
    setLastGameConfig(null); // Clear any previous game config for fresh start
  };

  const handlePlayerSetup = (config: GameConfig) => {
    setLastGameConfig(config); // Store config for play again
    initializeAndStartGame(config);
  };

  const handleBackToWelcome = () => {
    setPlayMode(null);
    setLastGameConfig(null); // Clear any previous game config
    resetGame();
  };

  const handlePlayAgain = () => {
    setPlayMode(null);
    setLastGameConfig(null); // Clear any previous game config
    resetGame();
  };

  const handlePlayAgainWithConfig = () => {
    if (lastGameConfig) {
      // Get all custom prompts that were used during the game (including those added during voting)
      const allCustomPrompts = playMode === 'remote' 
        ? (multiplayerState.syncedGameState?.customPrompts || gameState.customPrompts || [])
        : (gameState.customPrompts || []);

      // Convert SpectrumConcept objects back to string format for config
      const promptStrings = allCustomPrompts.map(prompt => `${prompt.leftConcept} vs ${prompt.rightConcept}`);

      // Update the config with all prompts that were accumulated during the game
      const updatedConfig = {
        ...lastGameConfig,
        customPrompts: promptStrings
      };
      
      // Update the stored config for future "Play Again" clicks
      setLastGameConfig(updatedConfig);
      
      setPlayMode('local');
      initializeGame(updatedConfig);
    } else {
      handlePlayAgain();
    }
  };

  const handlePlayAgainRemote = () => {
    // For remote games, go back to lobby with all settings preserved
    // Get all custom prompts that were used during the game (including those added during voting)
    const allCustomPrompts = multiplayerState.syncedGameState?.customPrompts || gameState.customPrompts || [];
    
    // Convert SpectrumConcept objects back to string format for config
    const promptStrings = allCustomPrompts.map(prompt => `${prompt.leftConcept} vs ${prompt.rightConcept}`);

    // Create config with current game settings
    const gameConfig: GameConfig = {
      mode: gameState.gameMode as 'normal' | 'custom',
      players: gameState.players.map(p => p.name),
      customPrompts: promptStrings
    };
    
    // Store config for the lobby to use
    setLastGameConfig(gameConfig);
    
    // Reset the local game state
    resetGame();
    
    // Reset only the game state while preserving room connection
    resetGameKeepRoom();
    
    // playMode stays 'remote', connection and room info preserved
    // This should show the MultiplayerLobby with the preserved config
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
    const allLockedIn = checkAllPlayersLockedIn(gameState.players, gameState.currentPsychicIndex, updatedVotes, gameState.skippedPlayers);
    
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
      startNewRound(playMode || 'local');
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
        {/* Connection Notifications - positioned relative to container */}
        {multiplayerState.connectionNotifications.length > 0 && (
          <div className="connection-notifications">
            {multiplayerState.connectionNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`notification notification-${notification.type}`}
              >
                <span className="notification-text">
                  {notification.playerName} {notification.type === 'connected' ? 'connected' : 
                    notification.type === 'disconnected' ? 'disconnected' : 're-connected'}
                </span>
              </div>
            ))}
          </div>
        )}


        <MultiplayerLobby 
          onBackToLocal={handleBackToWelcome}
          socketInstance={socketInstance}
          initialConfig={lastGameConfig}
        />
      </div>
    );
  }

  // Player setup screen (local only)
  if (gameState.gamePhase === 'player-setup' && playMode === 'local') {
    return (
      <div className="game-container compact">
        <PlayerSetup onStartGame={handlePlayerSetup} onBackToMain={handleBackToWelcome} initialConfig={lastGameConfig} />
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
    const currentUsername = playMode === 'remote' 
      ? multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name
      : undefined;

    return (
      <div className="game-container full-height">
        {/* Connection Notifications - positioned relative to container */}
        {playMode === 'remote' && multiplayerState.connectionNotifications.length > 0 && (
          <div className="connection-notifications">
            {multiplayerState.connectionNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`notification notification-${notification.type}`}
              >
                <span className="notification-text">
                  {notification.playerName} {notification.type === 'connected' ? 'connected' : 
                    notification.type === 'disconnected' ? 'disconnected' : 're-connected'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Game Code - positioned relative to container */}
        {playMode === 'remote' && multiplayerState.gameCode && (
          <div className="absolute-game-code">
            <div className="game-code-display">Code: {multiplayerState.gameCode}</div>
            <div className="player-count-display">
              {multiplayerState.players.filter(p => p.isConnected).length} players active
            </div>
          </div>
        )}

        <PromptVoting
          customPrompts={customPrompts}
          promptVotes={promptVotes}
          votingTimeLeft={votingTimeLeft}
          currentPlayerId={currentPlayerId}
          currentUsername={currentUsername}
          onVotePrompt={playMode === 'remote' ? voteForPrompt : voteForPromptLocal}
          onLockIn={playMode === 'remote' ? lockInVote : lockInPromptVote}
          onUnlockVote={() => {
            if (playMode === 'remote') {
              const { unlockVote } = socketInstance;
              unlockVote();
            } else {
              unlockPromptVote();
            }
          }}
          onAddNewPrompt={(prompt) => {
            if (playMode === 'remote') {
              const { submitCustomPromptDuringVoting } = socketInstance;
              submitCustomPromptDuringVoting(prompt);
            } else {
              addCustomPromptDuringVoting(prompt);
            }
          }}
          currentRound={gameState.currentRound}
        />
      </div>
    );
  }

  // Psychic announcement phase (local mode only)
  if (gameState.gamePhase === 'psychic-announcement' && playMode === 'local') {
    const currentPlayer = gameState.players[gameState.currentPsychicIndex];
    if (!currentPlayer) {
      return <div>Error: No current player found</div>;
    }
    return (
      <PsychicAnnouncement
        currentPsychic={currentPlayer}
        currentRound={gameState.currentRound}
        onContinue={startPsychicPhase}
      />
    );
  }

  // Game ended screen - Wavelength-style score reveal
  if (gameState.gamePhase === 'ended') {
    const endGameUsername = playMode === 'remote' 
      ? multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name
      : undefined;

    // Get all custom prompts that were used during the game
    // For remote mode, prefer synced state; for local mode, use game state
    const allCustomPrompts = playMode === 'remote' 
      ? (multiplayerState.syncedGameState?.customPrompts || gameState.customPrompts || [])
      : (gameState.customPrompts || []);

    // Create a modified game state with all the prompts for saving
    const gameStateWithAllPrompts = {
      ...gameState,
      customPrompts: allCustomPrompts
    };
      
    return (
      <ScoreReveal 
        gameState={gameStateWithAllPrompts}
        currentUsername={endGameUsername}
        onFinish={playMode === 'local' ? handlePlayAgainWithConfig : handlePlayAgainRemote}
        isRemoteMode={playMode === 'remote'}
      />
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

  // Show emoji reactions during active gameplay (not during setup screens)
  const showEmojiReactions = gameState.gamePhase !== 'setup' && gameState.gamePhase !== 'player-setup' && playMode !== null;

  return (
    <>
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
          
          // Handle guess vote tracking and unlocking
          if (gameState.gamePhase === 'guessing') {
            // Unlock ALL players when ANY player moves the dial
            unlockAllPlayerGuesses();
          }
          
          // Send to other players in multiplayer mode
          if (playMode === 'remote') {
            const { updateDialPosition: sendDialUpdate } = socketInstance;
            sendDialUpdate(position);
          }
        }}
        disabled={gameState.gamePhase === 'scoring' || 
                  (gameState.gamePhase === 'guessing' && playMode === 'remote' && isCurrentPlayerPsychic) ||
                  (gameState.gamePhase === 'guessing' && playMode === 'remote' && checkAllPlayersLockedIn(gameState.players, gameState.currentPsychicIndex, gameState.guessVotes || [], gameState.skippedPlayers))}
        hidePointer={false}
        hideForNonPsychic={gameState.gamePhase === 'psychic' && !isCurrentPlayerPsychic}
        isPsychicPhase={gameState.gamePhase === 'psychic' && isCurrentPlayerPsychic}
        hideInstructions={gameState.gamePhase === 'guessing'}
      />

      <div className="game-controls">
        {/* Connection Notifications - positioned relative to game controls */}
        {playMode === 'remote' && multiplayerState.connectionNotifications.length > 0 && (
          <div className="connection-notifications">
            {multiplayerState.connectionNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`notification notification-${notification.type}`}
              >
                <span className="notification-text">
                  {notification.playerName} {notification.type === 'connected' ? 'connected' : 
                    notification.type === 'disconnected' ? 'disconnected' : 're-connected'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Game Code - positioned relative to game controls */}
        {playMode === 'remote' && multiplayerState.gameCode && gameState.gamePhase !== 'setup' && (
          <div className="absolute-game-code">
            <div className="game-code-display">Code: {multiplayerState.gameCode}</div>
            <div className="player-count-display">
              {multiplayerState.players.filter(p => p.isConnected).length} players active
            </div>
          </div>
        )}

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
              <>
                {/* Show different message based on whether psychic is disconnected */}
                {playMode === 'remote' && currentPlayer && multiplayerState.disconnectedPlayers.includes(currentPlayer.name) ? (
                  <p style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                    🔌 {currentPlayer.name} is disconnected and cannot give a clue.
                  </p>
                ) : (
                  <p>Waiting for {currentPlayer?.name} to give a clue...</p>
                )}
                
                {/* Skip button - shown inline when psychic is disconnected */}
                {playMode === 'remote' && currentPlayer && multiplayerState.disconnectedPlayers.includes(currentPlayer.name) && (
                  <div style={{ marginTop: '10px' }}>
                    {multiplayerState.skipVoteStatus?.playerNameToSkip === currentPlayer.name && (
                      <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                        Skip votes: {multiplayerState.skipVoteStatus.votesReceived}/{multiplayerState.skipVoteStatus.votesNeeded}
                      </div>
                    )}
                    <button 
                      className="skip-button"
                      onClick={() => voteToSkipPlayer(currentPlayer.name)}
                      disabled={multiplayerState.skipVoteStatus?.voterNames.includes(
                        multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name || ''
                      )}
                    >
                      {multiplayerState.skipVoteStatus?.voterNames.includes(
                        multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name || ''
                      ) ? 'Vote Recorded' : `Skip ${currentPlayer.name}'s Turn`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {gameState.gamePhase === 'guessing' && (
          <div className="guessing-phase">
            <h3>🎯 Team Guessing</h3>
            <p><strong>Clue:</strong> "{gameState.psychicClue}"</p>
            
            {/* Show voting status for multiplayer */}
            {playMode === 'remote' && (
              <div className="voting-status">
                <h4>Player Status:</h4>
                <div className="player-votes">
                  {gameState.players
                    .filter((_, index) => index !== gameState.currentPsychicIndex)
                    .filter((player) => {
                      const isDisconnected = multiplayerState.disconnectedPlayers.includes(player.name);
                      const isSkipped = gameState.skippedPlayers?.includes(player.name);
                      // Hide players who are both disconnected and skipped
                      return !(isDisconnected && isSkipped);
                    })
                    .map((player) => {
                      const vote = gameState.guessVotes?.find(v => 
                        gameState.players.find(p => p.name === player.name && 
                          (v.playerId === multiplayerState.players.find(mp => mp.name === p.name)?.id || v.playerId.includes(p.name)))
                      );
                      const isDisconnected = multiplayerState.disconnectedPlayers.includes(player.name);
                      const isSkipped = gameState.skippedPlayers?.includes(player.name);
                      
                      return (
                        <div key={player.id} className={`player-vote-status ${vote?.isLockedIn ? 'locked-in' : 'waiting'} ${isDisconnected ? 'player-status-disconnected' : ''}`}>
                          {player.name}: {
                            isSkipped ? '⏭️ Skipped' :
                            isDisconnected ? '🔌 Disconnected' :
                            vote?.isLockedIn ? '✅ Locked In' : '⏳ Thinking...'
                          }
                        </div>
                      );
                    })}
                </div>
                
                {/* Skip interface for disconnected guessers */}
                {(() => {
                  const disconnectedGuessers = multiplayerState.disconnectedPlayers.filter(name => {
                    const playerIndex = gameState.players.findIndex(p => p.name === name);
                    return playerIndex !== gameState.currentPsychicIndex && !gameState.skippedPlayers?.includes(name);
                  });
                  
                  if (disconnectedGuessers.length === 0) return null;
                  
                  return (
                    <div className="disconnected-guessers-single">
                      <p style={{ color: '#e74c3c', fontWeight: 'bold', marginTop: '20px', marginBottom: '8px' }}>
                        🔌 {disconnectedGuessers.length} player(s) disconnected and cannot vote.
                      </p>
                      {multiplayerState.skipVoteStatus && (
                        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                          Skip votes: {multiplayerState.skipVoteStatus.votesReceived}/{multiplayerState.skipVoteStatus.votesNeeded}
                        </div>
                      )}
                      <button 
                        className="skip-button"
                        style={{ marginTop: '12px' }}
                        onClick={() => {
                          // Vote to skip the first disconnected guesser (they'll all be skipped together)
                          if (disconnectedGuessers.length > 0) {
                            voteToSkipPlayer(disconnectedGuessers[0]);
                          }
                        }}
                        disabled={multiplayerState.skipVoteStatus?.voterNames.includes(
                          multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name || ''
                        )}
                      >
                        {multiplayerState.skipVoteStatus?.voterNames.includes(
                          multiplayerState.players.find(p => p.id === multiplayerState.currentPlayerId)?.name || ''
                        ) ? 'Vote Recorded' : `Skip Disconnected Player${disconnectedGuessers.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
            
            {(playMode === 'remote' && isCurrentPlayerPsychic) ? (
              <p>Watch your team work together to guess the target position! You can see live updates as they move the dial.</p>
            ) : (
              <>
                <p>
                  {playMode === 'local' 
                    ? 'Work together to position the dial where you think the target is! Discuss and agree on your guess.'
                    : 'Work together to position the dial where you think the target is! All players can move the dial simultaneously - work together!'
                  }
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
                  
                  if (playMode === 'local') {
                    // Local mode: simple single button to submit guess
                    return (
                      <button 
                        className="action-button" 
                        onClick={handleSubmitGuess}
                      >
                        Submit Guess
                      </button>
                    );
                  } else {
                    // Remote mode: complex voting logic
                    const currentPlayerVote = gameState.guessVotes?.find(vote => vote.playerId === currentPlayerId);
                    const isLockedIn = currentPlayerVote?.isLockedIn || false;
                    const allPlayersLockedIn = checkAllPlayersLockedIn(gameState.players, gameState.currentPsychicIndex, gameState.guessVotes || [], gameState.skippedPlayers);
                    
                    if (allPlayersLockedIn) {
                      return <p>🔒 All players have locked in their guesses! Calculating score...</p>;
                    } else if (isLockedIn) {
                      return (
                        <p><em>Move the dial to unlock and change your guess.</em></p>
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

    {/* Emoji Reaction System - Available during active gameplay */}
    {showEmojiReactions && (
      <div className="emoji-reactions">
        {/* Left side emoji buttons */}
        <div className="emoji-buttons-left">
          {EMOJIS.slice(0, 3).map((emoji, index) => (
            <button
              key={`left-${index}`}
              className="emoji-button"
              onClick={() => handleEmojiClick(emoji)}
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Right side emoji buttons */}
        <div className="emoji-buttons-right">
          {EMOJIS.slice(3, 6).map((emoji, index) => (
            <button
              key={`right-${index}`}
              className="emoji-button"
              onClick={() => handleEmojiClick(emoji)}
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Falling emojis */}
        {fallingEmojis.map((fallingEmoji) => (
          <div
            key={fallingEmoji.id}
            className="falling-emoji"
            style={{
              left: `${fallingEmoji.x}px`,
              top: `${fallingEmoji.y}px`,
            }}
          >
            {fallingEmoji.emoji}
          </div>
        ))}
      </div>
    )}

    </>
  );
}

export default App;
