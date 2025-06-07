import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, GameConfig, Player, PromptVote, ConnectionNotification, SkipVoteStatus } from '../types';
import { config } from '../config';
import { PROMPT_VOTING_TIME_SECONDS } from '../constants';

// Socket event interfaces for documentation
// interface SocketEvents {
//   'game-created': (data: { gameCode: string; room: any }) => void;
//   'game-joined': (data: { room: any }) => void;
//   'join-error': (data: { message: string }) => void;
//   'player-joined': (data: { player: Player; room: any }) => void;
//   'player-disconnected': (data: { playerId: string; playerName: string }) => void;
//   'game-started': (data: { gameConfig: GameConfig; gameState: any }) => void;
//   'game-state-updated': (data: { gameState: GameState }) => void;
//   'dial-updated': (data: { position: number; playerId: string }) => void;
//   'player-action': (data: { playerId: string; action: string; data: any }) => void;
//   'host-transferred': (data: { newHostId: string; newHostName: string }) => void;
//   'error': (data: { message: string }) => void;
// }

export interface MultiplayerState {
  isConnected: boolean;
  gameCode: string | null;
  isHost: boolean;
  players: Player[];
  currentPlayerId: string | null;
  errors: string[];
  gameStarted: boolean;
  gameConfig: GameConfig | null;
  syncedGameState: Partial<GameState> | null;
  sharedPrompts: string[];
  sharedGameMode: 'normal' | 'custom' | null;
  promptVotes: PromptVote[];
  votingTimeLeft: number;
  connectionNotifications: ConnectionNotification[];
  skipVoteStatus: SkipVoteStatus | null;
  disconnectedPlayers: string[];
}

const initialState: MultiplayerState = {
  isConnected: false,
  gameCode: null,
  isHost: false,
  players: [],
  currentPlayerId: null,
  errors: [],
  gameStarted: false,
  gameConfig: null,
  syncedGameState: null,
  sharedPrompts: [],
  sharedGameMode: null,
  promptVotes: [],
  votingTimeLeft: 0,
  connectionNotifications: [],
  skipVoteStatus: null,
  disconnectedPlayers: [],
};

// Helper functions for localStorage cache
const saveGameSession = (gameCode: string, playerName: string, isHost: boolean) => {
  try {
    localStorage.setItem('danklength_cached_game', JSON.stringify({
      gameCode,
      playerName,
      isHost,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to save game session to localStorage:', e);
  }
};

const getCachedGameSession = () => {
  try {
    const cached = localStorage.getItem('danklength_cached_game');
    if (cached) {
      const session = JSON.parse(cached);
      // Only return session if it's less than 24 hours old
      if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
        return session;
      } else {
        clearCachedGameSession();
      }
    }
  } catch (e) {
    console.warn('Failed to load cached game session:', e);
  }
  return null;
};

const clearCachedGameSession = () => {
  try {
    localStorage.removeItem('danklength_cached_game');
  } catch (e) {
    console.warn('Failed to clear cached game session:', e);
  }
};

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerState>(initialState);

  useEffect(() => {
    console.log('Connecting to server:', config.serverUrl);
    
    // For ngrok URLs, append bypass parameter directly to URL
    let serverUrl = config.serverUrl;
    if (serverUrl.includes('ngrok-free.app') || serverUrl.includes('ngrok.io')) {
      // Add ngrok bypass parameter to the base URL
      const separator = serverUrl.includes('?') ? '&' : '?';
      serverUrl = `${serverUrl}${separator}ngrok-skip-browser-warning=true`;
    }
    
    console.log('Modified server URL:', serverUrl);
    
    // Connect to server with comprehensive ngrok bypass configuration
    socketRef.current = io(serverUrl, {
      withCredentials: true,
      transportOptions: {
        polling: {
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'any'
          },
          withCredentials: true
        }
      },
      // Additional options for better connection stability and ngrok compatibility
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
      timeout: 15000,
      // Disable upgrade to avoid websocket issues with ngrok
      upgrade: false,
      // Force polling only for ngrok compatibility
      transports: ['polling'],
      // Additional query parameters to bypass ngrok
      query: {
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true'
      }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Connected to server successfully');
      setMultiplayerState(prev => ({
        ...prev,
        isConnected: true,
        currentPlayerId: socket.id || null,
      }));
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setMultiplayerState(prev => ({
        ...prev,
        isConnected: false,
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setMultiplayerState(prev => ({
        ...prev,
        errors: [...prev.errors, `Connection failed: ${error.message}`],
      }));
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ All reconnection attempts failed');
      setMultiplayerState(prev => ({
        ...prev,
        errors: [...prev.errors, 'Unable to connect to server'],
      }));
    });

    // Game events
    socket.on('game-created', (data) => {
      const hostPlayer = data.room.players.find((p: Player) => p.isHost);
      if (hostPlayer) {
        saveGameSession(data.gameCode, hostPlayer.name, true);
      }
      setMultiplayerState(prev => ({
        ...prev,
        gameCode: data.gameCode,
        isHost: true,
        players: data.room.players,
      }));
    });

    socket.on('game-joined', (data) => {
      const currentPlayer = data.room.players.find((p: Player) => p.id === socket.id);
      if (currentPlayer) {
        saveGameSession(data.room.code, currentPlayer.name, currentPlayer.isHost);
      }
      console.log('Game joined event:', { 
        gameCode: data.room.code, 
        currentPlayer, 
        allPlayers: data.room.players.map((p: Player) => ({ name: p.name, id: p.id, isHost: p.isHost, isConnected: p.isConnected }))
      });
      setMultiplayerState(prev => ({
        ...prev,
        gameCode: data.room.code,
        isHost: currentPlayer?.isHost || false, // Use actual host status from server
        currentPlayerId: socket.id || null, // Ensure currentPlayerId is set
        players: data.room.players,
        gameStarted: data.room.isGameStarted || false, // Set game started status for reconnection
      }));
    });

    socket.on('join-error', (data) => {
      setMultiplayerState(prev => ({
        ...prev,
        errors: [...prev.errors, data.message],
      }));
    });

    socket.on('player-joined', (data) => {
      setMultiplayerState(prev => ({
        ...prev,
        players: data.room.players,
      }));
    });

    socket.on('player-reconnected', (data) => {
      console.log('Player reconnected:', data.player?.name || data);
      setMultiplayerState(prev => ({
        ...prev,
        players: data.room.players,
        syncedGameState: data.gameState,
        disconnectedPlayers: data.disconnectedPlayers || []
      }));
    });

    socket.on('player-disconnected', (data) => {
      console.log('Player disconnected:', data);
      setMultiplayerState(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.id === data.playerId 
            ? { ...p, isConnected: false }
            : p
        ),
      }));
    });

    socket.on('host-transferred', (data) => {
      console.log('Host transferred:', data);
      console.log('Current player ID:', socketRef.current?.id);
      console.log('New host ID:', data.newHostId);
      setMultiplayerState(prev => ({
        ...prev,
        isHost: socketRef.current?.id === data.newHostId,
        players: data.room.players, // Use the updated players list from server
        syncedGameState: data.room.gameState || prev.syncedGameState, // Sync game state to preserve cleared skip status
      }));
    });

    socket.on('error', (data) => {
      setMultiplayerState(prev => ({
        ...prev,
        errors: [...prev.errors, data.message],
      }));
    });

    // Game started event - notify when host starts the game
    socket.on('game-started', (data) => {
      console.log('Game started event received:', data);
      console.log('Current multiplayer state before game-started:', {
        isConnected: multiplayerState.isConnected,
        gameCode: multiplayerState.gameCode,
        currentPlayerId: multiplayerState.currentPlayerId,
        gameStarted: multiplayerState.gameStarted
      });
      setMultiplayerState(prev => ({
        ...prev,
        gameStarted: true,
        gameConfig: data.gameConfig,
        syncedGameState: data.gameState,
      }));
    });

    // Game state synchronization events
    socket.on('game-state-updated', (data) => {
      console.log('Game state updated:', data);
      setMultiplayerState(prev => ({
        ...prev,
        syncedGameState: data.gameState,
        disconnectedPlayers: data.disconnectedPlayers || [],
      }));
    });

    // Real-time dial position updates
    socket.on('dial-updated', (data) => {
      console.log('Dial position updated:', data);
      // This will be handled by the app component
    });

    // Custom prompt synchronization
    socket.on('prompt-added', (data) => {
      console.log('Prompt added:', data);
      setMultiplayerState(prev => ({
        ...prev,
        sharedPrompts: data.prompts,
      }));
    });

    // Custom prompt added during voting
    socket.on('prompt-added-during-voting', (data) => {
      console.log('Prompt added during voting:', data);
      setMultiplayerState(prev => {
        const newState = {
          ...prev,
          sharedPrompts: data.prompts,
          syncedGameState: {
            ...prev.syncedGameState,
            customPrompts: data.customPrompts,
          },
        };
        console.log('Updated multiplayer state with new prompts:', newState.syncedGameState?.customPrompts);
        return newState;
      });
    });

    // Game mode synchronization
    socket.on('game-mode-updated', (data) => {
      console.log('Game mode updated:', data);
      setMultiplayerState(prev => ({
        ...prev,
        sharedGameMode: data.mode,
      }));
    });

    // Voting events
    socket.on('new-round-voting', (data) => {
      console.log('New round voting started:', data);
      setMultiplayerState(prev => ({
        ...prev,
        syncedGameState: data.gameState,
        promptVotes: [],
        votingTimeLeft: PROMPT_VOTING_TIME_SECONDS,
      }));
    });

    socket.on('vote-updated', (data) => {
      console.log('CLIENT SOCKET: Votes updated received');
      console.log('CLIENT SOCKET: Raw data:', JSON.stringify(data, null, 2));
      console.log('CLIENT SOCKET: promptVotes array:', JSON.stringify(data.promptVotes, null, 2));
      setMultiplayerState(prev => {
        console.log('CLIENT SOCKET: Previous votes:', JSON.stringify(prev.promptVotes, null, 2));
        console.log('CLIENT SOCKET: New votes:', JSON.stringify(data.promptVotes, null, 2));
        return {
          ...prev,
          promptVotes: data.promptVotes,
        };
      });
    });

    socket.on('voting-time-update', (data) => {
      setMultiplayerState(prev => ({
        ...prev,
        votingTimeLeft: data.timeLeft,
      }));
    });

    socket.on('voting-finished', (data) => {
      console.log('Voting finished:', data);
      setMultiplayerState(prev => ({
        ...prev,
        syncedGameState: data.gameState,
        promptVotes: [],
        votingTimeLeft: 0,
      }));
    });

    // Handle new round events from server
    socket.on('new-round-data', (data) => {
      console.log('New round data received:', data);
      setMultiplayerState(prev => ({
        ...prev,
        syncedGameState: {
          ...prev.syncedGameState,
          currentCard: data.currentCard,
          targetPosition: data.targetPosition,
          currentRound: data.currentRound,
          gamePhase: 'psychic',
        },
      }));
    });

    // Handle connection notifications
    socket.on('connection-notification', (data) => {
      console.log('Connection notification:', data);
      
      // Add the new notification
      const newNotification = {
        type: data.type,
        playerName: data.playerName,
        timestamp: data.timestamp,
        id: `${data.playerName}-${data.timestamp}` // Unique ID for tracking
      };
      
      setMultiplayerState(prev => ({
        ...prev,
        connectionNotifications: [...prev.connectionNotifications, newNotification],
      }));
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setMultiplayerState(prev => ({
          ...prev,
          connectionNotifications: prev.connectionNotifications.filter(n => n.id !== newNotification.id),
        }));
      }, 3000);
    });

    // Handle skip vote updates
    socket.on('skip-vote-update', (data) => {
      console.log('Skip vote update:', data);
      setMultiplayerState(prev => ({
        ...prev,
        skipVoteStatus: data.clear ? null : data,
      }));
    });


    return () => {
      socket.disconnect();
    };
  }, []);

  const createGame = (playerName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('create-game', { playerName });
    }
  };

  const joinGame = (gameCode: string, playerName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-game', { gameCode, playerName });
    }
  };

  const startGame = (gameConfig: GameConfig) => {
    console.log('startGame called with:', gameConfig);
    console.log('Socket connected:', !!socketRef.current);
    console.log('Game code:', multiplayerState.gameCode);
    
    if (socketRef.current && multiplayerState.gameCode) {
      console.log('Emitting start-game event');
      socketRef.current.emit('start-game', {
        gameCode: multiplayerState.gameCode,
        gameConfig,
      });
    } else {
      console.log('Cannot start game - missing socket or game code');
    }
  };

  const updateGameState = (gameState: GameState) => {
    if (socketRef.current && multiplayerState.gameCode) {
      socketRef.current.emit('update-game-state', {
        gameCode: multiplayerState.gameCode,
        gameState,
      });
    }
  };

  const updateDialPosition = (position: number) => {
    if (socketRef.current && multiplayerState.gameCode && multiplayerState.currentPlayerId) {
      socketRef.current.emit('update-dial', {
        gameCode: multiplayerState.gameCode,
        position,
        playerId: multiplayerState.currentPlayerId,
      });
    }
  };

  const sendPlayerAction = (action: string, data: Record<string, unknown> = {}) => {
    if (socketRef.current && multiplayerState.gameCode && multiplayerState.currentPlayerId) {
      socketRef.current.emit('player-ready', {
        gameCode: multiplayerState.gameCode,
        playerId: multiplayerState.currentPlayerId,
        action,
        ...data,
      });
    }
  };

  const clearErrors = () => {
    setMultiplayerState(prev => ({
      ...prev,
      errors: [],
    }));
  };

  const resetMultiplayer = () => {
    setMultiplayerState(prev => ({
      ...initialState,
      isConnected: prev.isConnected,
      currentPlayerId: prev.currentPlayerId,
    }));
  };

  const resetGameKeepRoom = () => {
    setMultiplayerState(prev => ({
      ...prev,
      gameStarted: false,
      gameConfig: null,
      syncedGameState: null,
      promptVotes: [],
      votingTimeLeft: 0,
      connectionNotifications: [],
      skipVoteStatus: null,
      disconnectedPlayers: [],
    }));
  };

  const leaveGame = () => {
    if (socketRef.current && multiplayerState.gameCode) {
      socketRef.current.emit('leave-game', {
        gameCode: multiplayerState.gameCode,
      });
    }
    clearCachedGameSession();
    resetMultiplayer();
  };

  const reconnectToGame = () => {
    const cachedSession = getCachedGameSession();
    if (cachedSession) {
      joinGame(cachedSession.gameCode, cachedSession.playerName);
      return true;
    }
    return false;
  };

  const submitCustomPrompt = (prompt: string) => {
    if (socketRef.current && multiplayerState.gameCode && prompt.trim()) {
      socketRef.current.emit('add-prompt', {
        gameCode: multiplayerState.gameCode,
        prompt: prompt.trim(),
        playerId: multiplayerState.currentPlayerId,
      });
    }
  };

  const updateGameMode = (mode: 'normal' | 'custom') => {
    if (socketRef.current && multiplayerState.gameCode) {
      socketRef.current.emit('update-game-mode', {
        gameCode: multiplayerState.gameCode,
        mode,
      });
    }
  };

  const addEventListener = (event: string, callback: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const removeEventListener = (event: string, callback: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const voteForPrompt = (promptId: string) => {
    if (socketRef.current && multiplayerState.gameCode && multiplayerState.currentPlayerId) {
      socketRef.current.emit('vote-prompt', {
        gameCode: multiplayerState.gameCode,
        promptId,
        playerId: multiplayerState.currentPlayerId,
      });
    }
  };

  const lockInVote = () => {
    if (socketRef.current && multiplayerState.gameCode && multiplayerState.currentPlayerId) {
      socketRef.current.emit('lock-in-vote', {
        gameCode: multiplayerState.gameCode,
        playerId: multiplayerState.currentPlayerId,
      });
    }
  };

  const unlockVote = () => {
    if (socketRef.current && multiplayerState.gameCode && multiplayerState.currentPlayerId) {
      socketRef.current.emit('unlock-vote', {
        gameCode: multiplayerState.gameCode,
        playerId: multiplayerState.currentPlayerId,
      });
    }
  };

  const submitCustomPromptDuringVoting = (prompt: string) => {
    if (socketRef.current && multiplayerState.gameCode && multiplayerState.currentPlayerId && prompt.trim()) {
      socketRef.current.emit('add-prompt-during-voting', {
        gameCode: multiplayerState.gameCode,
        prompt: prompt.trim(),
        playerId: multiplayerState.currentPlayerId,
      });
    }
  };

  const nextRound = () => {
    if (socketRef.current && multiplayerState.gameCode) {
      socketRef.current.emit('next-round', {
        gameCode: multiplayerState.gameCode,
      });
    }
  };

  const voteToSkipPlayer = (playerNameToSkip: string) => {
    if (socketRef.current && multiplayerState.gameCode) {
      socketRef.current.emit('vote-to-skip-player', {
        gameCode: multiplayerState.gameCode,
        playerNameToSkip,
      });
    }
  };

  return {
    multiplayerState,
    createGame,
    joinGame,
    startGame,
    updateGameState,
    updateDialPosition,
    sendPlayerAction,
    clearErrors,
    resetMultiplayer,
    resetGameKeepRoom,
    leaveGame,
    reconnectToGame,
    getCachedGameSession,
    submitCustomPrompt,
    updateGameMode,
    addEventListener,
    removeEventListener,
    voteForPrompt,
    lockInVote,
    unlockVote,
    submitCustomPromptDuringVoting,
    nextRound,
    voteToSkipPlayer,
  };
};