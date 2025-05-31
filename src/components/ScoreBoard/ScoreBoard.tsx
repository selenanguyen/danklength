import React from 'react';
import './ScoreBoard.css';

interface ScoreBoardProps {
  team1Score: number;
  team2Score: number;
  currentTeam: 'team1' | 'team2';
  gamePhase: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  team1Score,
  team2Score,
  currentTeam,
  gamePhase
}) => {
  return (
    <div className="scoreboard">
      <div className={`team-score ${currentTeam === 'team1' ? 'active' : ''}`}>
        <div className="team-name">Team 1</div>
        <div className="score">{team1Score}</div>
        <div className="target">/ 10</div>
      </div>
      
      <div className="game-status">
        <div className="current-phase">{gamePhase}</div>
        <div className="vs">VS</div>
      </div>
      
      <div className={`team-score ${currentTeam === 'team2' ? 'active' : ''}`}>
        <div className="team-name">Team 2</div>
        <div className="score">{team2Score}</div>
        <div className="target">/ 10</div>
      </div>
    </div>
  );
};