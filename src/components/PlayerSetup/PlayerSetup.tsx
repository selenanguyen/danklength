import React, { useState, useEffect, useCallback } from 'react';
import type { GameConfig, SpectrumConcept, PromptPack } from '../../types';
import { useUserPacks } from '../../hooks/useUserPacks';
import { PackSelectionModal } from '../PackSelectionModal/PackSelectionModal';
import { config } from '../../config';
import './PlayerSetup.css';

interface PlayerSetupProps {
  onStartGame: (config: GameConfig) => void;
  onBackToMain?: () => void;
  initialConfig?: GameConfig | null;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame, onBackToMain, initialConfig }) => {
  const [gameMode, setGameMode] = useState<'normal' | 'custom'>('normal');
  const [addedPlayers, setAddedPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [leftSide, setLeftSide] = useState('');
  const [rightSide, setRightSide] = useState('');
  const [showPackModal, setShowPackModal] = useState(false);
  const [allPlayerPacks, setAllPlayerPacks] = useState<{username: string, packs: PromptPack[]}[]>([]);

  const {
    userPacks,
    username,
    setCurrentUsername,
    createPack,
    addToExistingPack,
    loadPackPrompts,
  } = useUserPacks();

  // Load packs from any username
  const loadUserPacksForUsername = useCallback(async (usernameToLoad: string): Promise<PromptPack[]> => {
    try {
      const response = await fetch(`${config.serverUrl}/api/packs/${encodeURIComponent(usernameToLoad)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error loading user packs:', error);
    }
    return [];
  }, []);

  // Load packs from all added players whenever the player list changes
  useEffect(() => {
    const loadAllPlayerPacks = async () => {
      const allPacks: {username: string, packs: PromptPack[]}[] = [];
      
      // Load packs for each added player
      for (const playerName of addedPlayers) {
        const packs = await loadUserPacksForUsername(playerName);
        if (packs.length > 0) {
          allPacks.push({ username: playerName, packs });
        }
      }
      
      setAllPlayerPacks(allPacks);
    };

    if (addedPlayers.length > 0) {
      loadAllPlayerPacks();
    } else {
      setAllPlayerPacks([]);
    }
  }, [addedPlayers, loadUserPacksForUsername]);

  // Populate initial values when initialConfig is provided
  useEffect(() => {
    if (initialConfig) {
      setGameMode(initialConfig.mode);
      setAddedPlayers(initialConfig.players);
      if (initialConfig.mode === 'custom' && initialConfig.customPrompts) {
        const promptStrings = initialConfig.customPrompts.map(prompt => 
          typeof prompt === 'string' ? prompt : `${prompt.leftConcept} vs ${prompt.rightConcept}`
        );
        setCustomPrompts(promptStrings);
      }
    }
  }, [initialConfig]);

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

  const submitPrompt = () => {
    if (leftSide.trim() && rightSide.trim()) {
      const prompt = `${leftSide.trim()} vs ${rightSide.trim()}`;
      setCustomPrompts([...customPrompts, prompt]);
      setLeftSide('');
      setRightSide('');
    }
  };

  const handlePromptKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitPrompt();
    }
  };

  const handleCreatePack = async (packName: string, selectedPrompts: SpectrumConcept[]) => {
    await createPack(packName, selectedPrompts);
  };

  const handleAddToExistingPack = async (packId: string, selectedPrompts: SpectrumConcept[]) => {
    await addToExistingPack(packId, selectedPrompts);
  };

  const handleLoadFromPack = (packId: string) => {
    // First try to find pack in current user's packs
    let packPrompts = loadPackPrompts(packId);
    
    // If not found, search in all player packs
    if (!packPrompts || packPrompts.length === 0) {
      for (const playerPackGroup of allPlayerPacks) {
        const pack = playerPackGroup.packs.find(p => p.id === packId);
        if (pack) {
          packPrompts = pack.prompts;
          break;
        }
      }
    }
    
    if (packPrompts && packPrompts.length > 0) {
      const promptStrings = packPrompts.map(p => `${p.leftConcept} vs ${p.rightConcept}`);
      
      // Filter out duplicates by checking against existing prompts
      const newUniquePrompts = promptStrings.filter(newPrompt => 
        !customPrompts.includes(newPrompt)
      );
      
      if (newUniquePrompts.length > 0) {
        setCustomPrompts([...customPrompts, ...newUniquePrompts]);
        setGameMode('custom');
      } else {
        alert('All prompts from this pack are already added to your game!');
      }
    }
  };

  // Convert custom prompt strings to SpectrumConcept objects for pack saving
  const getSpectrumConceptsFromPrompts = (): SpectrumConcept[] => {
    return customPrompts.map((prompt, index) => {
      const parts = prompt.split(' vs ');
      return {
        id: `custom-${Date.now()}-${index}`,
        leftConcept: parts[0]?.trim() || 'Left',
        rightConcept: parts[1]?.trim() || 'Right',
      };
    });
  };

  const handleSubmit = () => {
    if (addedPlayers.length < 2) {
      alert('Please add at least 2 players');
      return;
    }

    if (gameMode === 'custom' && customPrompts.length === 0) {
      alert('Please add at least 1 custom prompt');
      return;
    }

    const config: GameConfig = {
      mode: gameMode,
      players: addedPlayers,
      customPrompts: gameMode === 'custom' ? customPrompts : undefined,
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
          <h3>Spectrums</h3>
          
          {/* Submitted prompts display */}
          {customPrompts.length > 0 && (
            <div className="prompts-gallery">
              {customPrompts.map((prompt, index) => (
                <div 
                  key={index} 
                  className="prompt-card" 
                  style={{ 
                    '--appear-delay': `${index * 0.1}s`,
                    '--float-delay': `${index * 0.3}s`
                  } as React.CSSProperties}
                >
                  {prompt}
                </div>
              ))}
            </div>
          )}
          
          {/* Show message when no prompts yet */}
          {customPrompts.length === 0 && (
            <p className="waiting-for-prompts">Add some custom spectrums below!</p>
          )}

          {/* Prompt input section */}
          <div className="prompt-input-section">
            <div className="dual-prompt-input-group">
              <input
                type="text"
                value={leftSide}
                onChange={(e) => setLeftSide(e.target.value)}
                onKeyPress={handlePromptKeyPress}
                placeholder="Small"
                maxLength={25}
                className="prompt-side-input"
              />
              <span className="vs-divider">vs</span>
              <input
                type="text"
                value={rightSide}
                onChange={(e) => setRightSide(e.target.value)}
                onKeyPress={handlePromptKeyPress}
                placeholder="Big"
                maxLength={25}
                className="prompt-side-input"
              />
              <button 
                onClick={submitPrompt} 
                disabled={!leftSide.trim() || !rightSide.trim()}
                className="submit-prompt-button"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {gameMode === 'custom' && ((userPacks.length > 0 || allPlayerPacks.length > 0) || customPrompts.length > 0) && (
        <div className="pack-buttons-section">
          {(userPacks.length > 0 || allPlayerPacks.length > 0) && (
            <select 
              onChange={(e) => e.target.value && handleLoadFromPack(e.target.value)}
              value=""
              className="load-pack-button-compact"
            >
              <option value="">📦 Load Pack</option>
              {/* Current user's packs */}
              {userPacks.length > 0 && (
                <optgroup label="Your Packs">
                  {userPacks.map(pack => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} ({pack.prompts.length})
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Other players' packs */}
              {allPlayerPacks.map(playerGroup => (
                <optgroup key={playerGroup.username} label={`${playerGroup.username}'s Packs`}>
                  {playerGroup.packs.map(pack => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} ({pack.prompts.length})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {customPrompts.length > 0 && (
            <button
              onClick={() => setShowPackModal(true)}
              className="save-pack-button-compact"
            >
              💾 Save to Pack
            </button>
          )}
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
                <strong>Custom Prompts:</strong> {customPrompts.length}
              </div>
              <div className="info-item">
                <strong>Total Rounds:</strong> {Math.max(8, customPrompts.length * Math.ceil(8 / Math.max(1, customPrompts.length)))}
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
        isRemoteMode={false}
      />
    </div>
  );
};