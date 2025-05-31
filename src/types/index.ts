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

export interface GameState {
  gameId?: string;
  gameMode: 'normal' | 'custom';
  players: Player[];
  currentPsychicIndex: number;
  currentCard: SpectrumConcept | null;
  targetPosition: number;
  targetWidth: number;
  dialPosition: number;
  gamePhase: 'setup' | 'player-setup' | 'psychic' | 'guessing' | 'scoring' | 'ended';
  psychicClue: string;
  currentRound: number;
  totalRounds: number;
  totalScore: number;
  roundScores: number[];
  customPrompts?: SpectrumConcept[];
  currentPromptIndex?: number;
  currentPromptUse?: number;
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
  isPublic: boolean;
}