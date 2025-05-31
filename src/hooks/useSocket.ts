import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, GameConfig, Player } from '../types';
import { config } from '../config';

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
  syncedGameState: any | null;
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
};

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerState>(initialState);

  useEffect(() => {
    // Connect to server with ngrok bypass header
    socketRef.current = io(config.serverUrl, {
      transportOptions: {
        polling: {
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true'
          }
        },
        websocket: {
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true'
          }
        }
      },
      // Additional options for better connection stability
      forceNew: true,
      reconnection: true,
      timeout: 20000,
      // Try polling first, then upgrade to websocket
      transports: ['polling', 'websocket']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
      setMultiplayerState(prev => ({
        ...prev,
        isConnected: true,
        currentPlayerId: socket.id || null,
      }));
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setMultiplayerState(prev => ({
        ...prev,
        isConnected: false,
      }));
    });

    // Game events
    socket.on('game-created', (data) => {
      setMultiplayerState(prev => ({
        ...prev,
        gameCode: data.gameCode,
        isHost: true,
        players: data.room.players,
      }));
    });

    socket.on('game-joined', (data) => {
      setMultiplayerState(prev => ({
        ...prev,
        gameCode: data.room.code,
        isHost: false,
        players: data.room.players,
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

    socket.on('player-disconnected', (data) => {
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
      setMultiplayerState(prev => ({
        ...prev,
        isHost: prev.currentPlayerId === data.newHostId,
        players: prev.players.map(p => ({
          ...p,
          isHost: p.id === data.newHostId,
        })),
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
      }));
    });

    // Real-time dial position updates
    socket.on('dial-updated', (data) => {
      console.log('Dial position updated:', data);
      // This will be handled by the app component
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

  const sendPlayerAction = (action: string, data: any = {}) => {
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

  const addEventListener = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const removeEventListener = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
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
    addEventListener,
    removeEventListener,
  };
};