import React, { useState } from 'react';
import type { SpectrumConcept, PromptVote } from '../../types';
import './PromptVoting.css';

interface PromptVotingProps {
  customPrompts: SpectrumConcept[];
  promptVotes: PromptVote[];
  votingTimeLeft: number;
  currentPlayerId: string;
  currentUsername?: string;
  onVotePrompt: (promptId: string) => void;
  onLockIn: () => void;
  onUnlockVote: () => void;
  onAddNewPrompt: (prompt: string) => void;
  currentRound: number;
}

export const PromptVoting: React.FC<PromptVotingProps> = ({
  customPrompts,
  promptVotes,
  votingTimeLeft,
  currentPlayerId,
  onVotePrompt,
  onLockIn,
  onUnlockVote,
  onAddNewPrompt,
  currentRound,
}) => {
  const [newPromptLeft, setNewPromptLeft] = useState('');
  const [newPromptRight, setNewPromptRight] = useState('');
  
  const currentPlayerVote = promptVotes.find(vote => vote.playerId === currentPlayerId);
  const selectedPromptId = currentPlayerVote?.promptId || '';
  const isLockedIn = currentPlayerVote?.isLockedIn || false;

  const getVoteCount = (promptId: string) => {
    const count = promptVotes.filter(vote => vote.promptId === promptId && vote.promptId !== '').length;
    if (count > 0) {
      console.log(`CLIENT: Vote count for prompt ${promptId}: ${count}`);
      console.log('CLIENT: All votes received:', JSON.stringify(promptVotes, null, 2));
      console.log('CLIENT: Current player ID:', currentPlayerId);
    }
    return count;
  };

  const handlePromptClick = (promptId: string) => {
    // If player is locked in and clicking a different prompt, unlock first
    if (isLockedIn && selectedPromptId !== promptId) {
      onUnlockVote();
    }
    onVotePrompt(promptId);
  };

  const handleLockIn = () => {
    if (isLockedIn) return;
    onLockIn();
  };

  const handleSubmitNewPrompt = () => {
    if (newPromptLeft.trim() && newPromptRight.trim()) {
      const newPrompt = `${newPromptLeft.trim()} vs ${newPromptRight.trim()}`;
      onAddNewPrompt(newPrompt);
      setNewPromptLeft('');
      setNewPromptRight('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitNewPrompt();
    }
  };


  return (
    <div className="prompt-voting">
      <div className="voting-header">
        <h2>Round {currentRound} - Choose Your Prompt!</h2>
        <div className="voting-timer">
          <div className="timer-circle">
            <span className="timer-text">{votingTimeLeft}</span>
          </div>
        </div>
      </div>

      <div className="voting-instructions">
        <p>Click on a prompt to vote for it this round. Click "Lock In" when you're ready!</p>
      </div>

      <div className="prompts-gallery">
        {customPrompts.map((prompt, index) => {
          const voteCount = getVoteCount(prompt.id);
          const isSelected = selectedPromptId === prompt.id;
          
          return (
            <div
              key={prompt.id}
              className={`prompt-card ${isSelected ? 'selected' : ''}`}
              style={{ 
                '--appear-delay': `${index * 0.1}s`,
                '--float-delay': `${index * 0.3}s`
              } as React.CSSProperties}
              onClick={() => handlePromptClick(prompt.id)}
            >
              <div className="prompt-text">
                {prompt.leftConcept} vs {prompt.rightConcept}
                {voteCount > 0 && (
                  <span className="vote-count">
                    {voteCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New prompt input section */}
      <div className="new-prompt-section" style={{ marginTop: '20px' }}>
        <div className="new-prompt-input">
          <div className="compact-prompt-input-group">
            <input
              type="text"
              className="compact-prompt-input"
              placeholder="Small"
              value={newPromptLeft}
              onChange={(e) => setNewPromptLeft(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={15}
              disabled={votingTimeLeft <= 0}
            />
            <span className="compact-vs-divider">vs</span>
            <input
              type="text"
              className="compact-prompt-input"
              placeholder="Big"
              value={newPromptRight}
              onChange={(e) => setNewPromptRight(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={15}
              disabled={votingTimeLeft <= 0}
            />
            <button
              className="compact-submit-button"
              onClick={handleSubmitNewPrompt}
              disabled={!newPromptLeft.trim() || !newPromptRight.trim() || votingTimeLeft <= 0}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="voting-actions" style={{ marginTop: '30px' }}>
        <div className="main-actions">
          <button
            className={`lock-in-button ${isLockedIn ? 'locked' : ''}`}
            onClick={handleLockIn}
            disabled={isLockedIn}
          >
            {isLockedIn ? '✓ Locked In' : 'Lock In'}
          </button>
        </div>
        {selectedPromptId === '' && !isLockedIn && (
          <p className="abstain-info">Lock in without voting to abstain</p>
        )}
        {isLockedIn && (
          <p className="change-vote-info">Click any prompt to change your vote</p>
        )}
      </div>

      <div className="voting-status">
        <p>{promptVotes.filter(v => v.isLockedIn).length} players locked in</p>
      </div>

    </div>
  );
};