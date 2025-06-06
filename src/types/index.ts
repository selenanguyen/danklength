export interface SpectrumConcept {
  id: string;
  leftConcept: string;
  rightConcept: string;
}

export interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  isHost?: boolean;
}

export interface PromptVote {
  playerId: string;
  promptId: string;
  isLockedIn: boolean;
}

export interface GuessVote {
  playerId: string;
  playerName: string;
  isLockedIn: boolean;
  dialPosition: number;
}

export interface RoundHistory {
  clue: string;
  psychicName: string;
  psychicIndex: number; // For backwards compatibility
}

export interface GameState {
  gameId?: string;
  gameMode: 'normal' | 'custom';
  players: Player[];
  currentPsychicIndex: number;
  currentCard: SpectrumConcept | null;
  targetPosition: number;
  targetWidth: number;
  dialPosition: number;
  gamePhase: 'setup' | 'player-setup' | 'prompt-voting' | 'psychic-announcement' | 'psychic' | 'guessing' | 'scoring' | 'ended';
  psychicClue: string;
  currentRound: number;
  totalRounds: number;
  totalScore: number;
  roundScores: number[];
  roundClues: (string | RoundHistory)[]; // Store clues from each completed round - supports both legacy string format and new RoundHistory format
  customPrompts?: SpectrumConcept[];
  currentPromptIndex?: number;
  currentPromptUse?: number;
  promptVotes?: PromptVote[];
  votingTimeLeft?: number;
  selectedPromptForRound?: SpectrumConcept;
  guessVotes?: GuessVote[];
  skippedPlayers?: string[];
  isDefinitive?: boolean; // Flag for definitive server syncs
}

export interface ConnectionNotification {
  type: 'connected' | 'disconnected' | 'reconnected';
  playerName: string;
  timestamp: number;
  id?: string;
}

export interface SkipVoteStatus {
  playerNameToSkip: string;
  votesReceived: number;
  votesNeeded: number;
  voterNames: string[];
}

export interface GameConfig {
  mode: 'normal' | 'custom';
  players: string[];
  customPrompts?: (string | SpectrumConcept)[];
  packId?: string;
}

export interface ScoreResult {
  points: number;
  zone: 'center' | 'inner' | 'outer' | 'miss';
}

export interface PromptPack {
  id: string;
  name: string;
  prompts: SpectrumConcept[];
  createdBy: string;
  createdAt: string;
  isPublic: boolean;
}

export interface UserPackData {
  username: string;
  packs: PromptPack[];
  lastUpdated: string;
}

export interface PackSelectionModalProps {
  isOpen: boolean;
  prompts: SpectrumConcept[];
  currentUsername?: string;
  onClose: () => void;
  onSave: (packName: string, selectedPrompts: SpectrumConcept[], packId?: string) => void;
}