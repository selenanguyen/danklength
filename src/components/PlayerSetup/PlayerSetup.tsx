import React, { useState } from 'react';
import type { GameConfig, SpectrumConcept } from '../../types';
import { useUserPacks } from '../../hooks/useUserPacks';
import { PackSelectionModal } from '../PackSelectionModal/PackSelectionModal';
import './PlayerSetup.css';

interface PlayerSetupProps {
  onStartGame: (config: GameConfig) => void;
  onBackToMain?: () => void;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame, onBackToMain }) => {
  const [gameMode, setGameMode] = useState<'normal' | 'custom'>('normal');
  const [addedPlayers, setAddedPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [customPrompts, setCustomPrompts] = useState<string[]>(['']);
  const [showPackModal, setShowPackModal] = useState(false);

  const {
    userPacks,
    username,
    setCurrentUsername,
    createPack,
    addToExistingPack,
    loadPackPrompts,
  } = useUserPacks();

  const addPlayer = () => {
    if (newPlayerName.trim() !== '') {
      setAddedPlayers([...addedPlayers, newPlayerName.trim()]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (index: number) => {
    setAddedPlayers(addedPlayers.filter((_, i) => i !== index));
  };

  const handleNewPlayerKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addPlayer();
    }
  };

  const addPrompt = () => {
    setCustomPrompts([...customPrompts, '']);
  };

  const removePrompt = (index: number) => {
    if (customPrompts.length > 1) {
      setCustomPrompts(customPrompts.filter((_, i) => i !== index));
    }
  };

  const updatePrompt = (index: number, prompt: string) => {
    const newPrompts = [...customPrompts];
    newPrompts[index] = prompt;
    setCustomPrompts(newPrompts);
  };

  const handleCreatePack = async (packName: string, selectedPrompts: SpectrumConcept[]) => {
    await createPack(packName, selectedPrompts);
  };

  const handleAddToExistingPack = async (packId: string, selectedPrompts: SpectrumConcept[]) => {
    await addToExistingPack(packId, selectedPrompts);
  };

  const handleLoadFromPack = (packId: string) => {
    const packPrompts = loadPackPrompts(packId);
    if (packPrompts) {
      const promptStrings = packPrompts.map(p => `${p.leftConcept} vs ${p.rightConcept}`);
      setCustomPrompts([...promptStrings, '']); // Add empty one for new additions
      setGameMode('custom');
    }
  };

  // Convert custom prompt strings to SpectrumConcept objects for pack saving
  const getSpectrumConceptsFromPrompts = (): SpectrumConcept[] => {
    return customPrompts
      .filter(prompt => prompt.trim())
      .map((prompt, index) => {
        const parts = prompt.split(' vs ');
        return {
          id: `custom-${Date.now()}-${index}`,
          leftConcept: parts[0]?.trim() || 'Left',
          rightConcept: parts[1]?.trim() || 'Right',
        };
      });
  };

  const handleSubmit = () => {
    const validPrompts = gameMode === 'custom' 
      ? customPrompts.filter(prompt => prompt.trim() !== '')
      : undefined;
    
    if (addedPlayers.length < 2) {
      alert('Please add at least 2 players');
      return;
    }

    if (gameMode === 'custom' && (!validPrompts || validPrompts.length === 0)) {
      alert('Please add at least 1 custom prompt');
      return;
    }

    const config: GameConfig = {
      mode: gameMode,
      players: addedPlayers,
      customPrompts: validPrompts,
    };

    onStartGame(config);
  };

  return (
    <div className="player-setup">
      <h1>Setup Wavelength Game</h1>
      
      <div className="game-mode-selection">
        <h3>Game Mode</h3>
        <div className="mode-options">
          <label className={`mode-option ${gameMode === 'normal' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="normal"
              checked={gameMode === 'normal'}
              onChange={(e) => setGameMode(e.target.value as 'normal')}
            />
            <div className="mode-content">
              <h4>Normal Mode</h4>
              <p>Use built-in spectrum concepts</p>
            </div>
          </label>
          
          <label className={`mode-option ${gameMode === 'custom' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="custom"
              checked={gameMode === 'custom'}
              onChange={(e) => setGameMode(e.target.value as 'custom')}
            />
            <div className="mode-content">
              <h4>Custom Mode</h4>
              <p>Create your own spectrum concepts</p>
            </div>
          </label>
        </div>
      </div>

      <div className="players-section">
        <h3>Players ({addedPlayers.length})</h3>
        
        {/* Added players gallery */}
        {addedPlayers.length > 0 && (
          <div className="added-players-gallery">
            {addedPlayers.map((player, index) => (
              <div 
                key={index} 
                className="player-card"
                style={{
                  '--appear-delay': `${index * 0.1}s`,
                  '--float-delay': `${index * 0.3}s`
                } as React.CSSProperties}
              >
                {player}
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="player-card-remove"
                  title="Remove player"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* New player input */}
        <div className="new-player-input">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={handleNewPlayerKeyPress}
            placeholder="Enter player name"
            maxLength={20}
          />
          <button 
            onClick={addPlayer} 
            className="add-button"
            disabled={!newPlayerName.trim()}
          >
            + Add Player
          </button>
        </div>
      </div>

      {gameMode === 'custom' && (
        <div className="prompts-section">
          <div className="prompts-header">
            <h3>Custom Prompts ({customPrompts.filter(p => p.trim()).length})</h3>
            <div className="pack-actions">
              {userPacks.length > 0 && (
                <select 
                  onChange={(e) => e.target.value && handleLoadFromPack(e.target.value)}
                  value=""
                  className="load-pack-select"
                >
                  <option value="">📦 Load from Pack</option>
                  {userPacks.map(pack => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} ({pack.prompts.length} prompts)
                    </option>
                  ))}
                </select>
              )}
              {customPrompts.some(p => p.trim()) && (
                <button
                  onClick={() => setShowPackModal(true)}
                  className="save-pack-button"
                >
                  💾 Save to Pack
                </button>
              )}
            </div>
          </div>
          <p className="prompts-hint">
            Create spectrum concepts like "Hot vs Cold" or "Expensive vs Cheap"
          </p>
          <div className="prompts-list">
            {customPrompts.map((prompt, index) => (
              <div key={index} className="prompt-input">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => updatePrompt(index, e.target.value)}
                  placeholder="e.g. Hot vs Cold"
                  maxLength={50}
                />
                {customPrompts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrompt(index)}
                    className="remove-button"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addPrompt} className="add-button">
            + Add Prompt
          </button>
        </div>
      )}

      <div className="game-info">
        <h3 className="game-summary-title">Game Summary</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Players:</strong> {addedPlayers.length}
          </div>
          <div className="info-item">
            <strong>Mode:</strong> {gameMode === 'normal' ? 'Normal' : 'Custom'}
          </div>
          {gameMode === 'custom' && (
            <>
              <div className="info-item">
                <strong>Custom Prompts:</strong> {customPrompts.filter(p => p.trim()).length}
              </div>
              <div className="info-item">
                <strong>Total Rounds:</strong> {Math.max(8, customPrompts.filter(p => p.trim()).length * Math.ceil(8 / Math.max(1, customPrompts.filter(p => p.trim()).length)))}
              </div>
            </>
          )}
          {gameMode === 'normal' && (
            <div className="info-item">
              <strong>Total Rounds:</strong> 8
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSubmit} className="start-game-button">
        Start Game
      </button>
      
      {onBackToMain && (
        <button onClick={onBackToMain} className="back-button">
          MAIN MENU
        </button>
      )}

      <PackSelectionModal
        isOpen={showPackModal}
        prompts={getSpectrumConceptsFromPrompts()}
        userPacks={userPacks}
        currentUsername={username}
        onClose={() => setShowPackModal(false)}
        onCreatePack={handleCreatePack}
        onAddToExistingPack={handleAddToExistingPack}
        onSetUsername={setCurrentUsername}
      />
    </div>
  );
};