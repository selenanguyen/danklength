import React from 'react';
import type { SpectrumConcept, PromptVote } from '../../types';
import './PromptVoting.css';

interface PromptVotingProps {
  customPrompts: SpectrumConcept[];
  promptVotes: PromptVote[];
  votingTimeLeft: number;
  currentPlayerId: string;
  onVotePrompt: (promptId: string) => void;
  onLockIn: () => void;
  currentRound: number;
}

export const PromptVoting: React.FC<PromptVotingProps> = ({
  customPrompts,
  promptVotes,
  votingTimeLeft,
  currentPlayerId,
  onVotePrompt,
  onLockIn,
  currentRound,
}) => {
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
    if (isLockedIn) return;
    onVotePrompt(promptId);
  };

  const handleLockIn = () => {
    if (isLockedIn) return;
    onLockIn();
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
              className={`prompt-card ${isSelected ? 'selected' : ''} ${isLockedIn && !isSelected ? 'locked' : ''}`}
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

      <div className="voting-actions" style={{ marginTop: '40px' }}>
        <button
          className={`lock-in-button ${isLockedIn ? 'locked' : ''}`}
          onClick={handleLockIn}
          disabled={isLockedIn}
        >
          {isLockedIn ? '✓ Locked In' : 'Lock In'}
        </button>
        {selectedPromptId === '' && !isLockedIn && (
          <p className="abstain-info">Lock in without voting to abstain</p>
        )}
      </div>

      <div className="voting-status">
        <p>{promptVotes.filter(v => v.isLockedIn).length} players locked in</p>
      </div>
    </div>
  );
};