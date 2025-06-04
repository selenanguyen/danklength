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
  roundClues: string[]; // Store clues from each completed round
  customPrompts?: SpectrumConcept[];
  currentPromptIndex?: number;
  currentPromptUse?: number;
  promptVotes?: PromptVote[];
  votingTimeLeft?: number;
  selectedPromptForRound?: SpectrumConcept;
  guessVotes?: GuessVote[];
}

export interface GameConfig {
  mode: 'normal' | 'custom';
  players: string[];
  customPrompts?: string[];
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