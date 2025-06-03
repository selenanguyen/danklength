import React, { useState, useEffect } from 'react';
import type { SpectrumConcept, PromptPack } from '../../types';
import './PackSelectionModal.css';

interface PackSelectionModalProps {
  isOpen: boolean;
  prompts: SpectrumConcept[];
  userPacks: PromptPack[];
  currentUsername?: string;
  onClose: () => void;
  onCreatePack: (packName: string, selectedPrompts: SpectrumConcept[]) => void;
  onAddToExistingPack: (packId: string, selectedPrompts: SpectrumConcept[]) => void;
  onSetUsername?: (username: string) => void;
}

export const PackSelectionModal: React.FC<PackSelectionModalProps> = ({
  isOpen,
  prompts,
  userPacks,
  currentUsername,
  onClose,
  onCreatePack,
  onAddToExistingPack,
  onSetUsername,
}) => {
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [newPackName, setNewPackName] = useState('');
  const [selectedExistingPack, setSelectedExistingPack] = useState('');
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [usernameInput, setUsernameInput] = useState(currentUsername || '');
  const [showUsernameInput, setShowUsernameInput] = useState(!currentUsername);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPrompts(new Set(prompts.map(p => p.id)));
      setNewPackName('');
      setSelectedExistingPack('');
      setMode(userPacks.length > 0 ? 'existing' : 'create');
      setUsernameInput(currentUsername || '');
      setShowUsernameInput(!currentUsername);
    }
  }, [isOpen, prompts, userPacks.length, currentUsername]);

  const handlePromptToggle = (promptId: string) => {
    const newSelected = new Set(selectedPrompts);
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId);
    } else {
      newSelected.add(promptId);
    }
    setSelectedPrompts(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedPrompts(new Set(prompts.map(p => p.id)));
  };

  const handleSelectNone = () => {
    setSelectedPrompts(new Set());
  };

  const handleUsernameSubmit = () => {
    if (usernameInput.trim() && onSetUsername) {
      onSetUsername(usernameInput.trim());
      setShowUsernameInput(false);
    }
  };

  const handleSave = () => {
    const selectedPromptObjects = prompts.filter(p => selectedPrompts.has(p.id));
    
    if (selectedPromptObjects.length === 0) return;
    
    if (mode === 'create') {
      if (newPackName.trim()) {
        onCreatePack(newPackName.trim(), selectedPromptObjects);
        onClose();
      }
    } else {
      if (selectedExistingPack) {
        onAddToExistingPack(selectedExistingPack, selectedPromptObjects);
        onClose();
      }
    }
  };

  const canSave = () => {
    if (selectedPrompts.size === 0) return false;
    if (mode === 'create') return newPackName.trim().length > 0;
    return selectedExistingPack.length > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="pack-modal-overlay" onClick={onClose}>
      <div className="pack-modal" onClick={e => e.stopPropagation()}>
        <div className="pack-modal-header">
          <h2>📦 Save Prompts to Pack</h2>
          <button className="pack-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="pack-modal-content">
          {/* Username input section */}
          {showUsernameInput && (
            <div className="username-section">
              <h3>Enter Your Username</h3>
              <p>We need a username to save your packs:</p>
              <div className="username-input-group">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter username..."
                  onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                />
                <button 
                  onClick={handleUsernameSubmit}
                  disabled={!usernameInput.trim()}
                  className="username-submit-btn"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Main pack selection interface */}
          {!showUsernameInput && (
            <>
              {/* Pack mode selection */}
              <div className="pack-mode-selection">
                <button
                  className={`mode-button ${mode === 'create' ? 'active' : ''}`}
                  onClick={() => setMode('create')}
                >
                  Create New Pack
                </button>
                {userPacks.length > 0 && (
                  <button
                    className={`mode-button ${mode === 'existing' ? 'active' : ''}`}
                    onClick={() => setMode('existing')}
                  >
                    Add to Existing Pack
                  </button>
                )}
              </div>

              {/* Pack configuration */}
              <div className="pack-config">
                {mode === 'create' ? (
                  <div className="new-pack-config">
                    <label htmlFor="pack-name">Pack Name:</label>
                    <input
                      id="pack-name"
                      type="text"
                      value={newPackName}
                      onChange={(e) => setNewPackName(e.target.value)}
                      placeholder="Enter pack name..."
                      maxLength={50}
                    />
                  </div>
                ) : (
                  <div className="existing-pack-config">
                    <label htmlFor="existing-pack">Select Pack:</label>
                    <select
                      id="existing-pack"
                      value={selectedExistingPack}
                      onChange={(e) => setSelectedExistingPack(e.target.value)}
                    >
                      <option value="">Choose a pack...</option>
                      {userPacks.map(pack => (
                        <option key={pack.id} value={pack.id}>
                          {pack.name} ({pack.prompts.length} prompts)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Prompt selection */}
              <div className="prompt-selection">
                <div className="selection-header">
                  <h3>Select Prompts ({selectedPrompts.size}/{prompts.length})</h3>
                  <div className="selection-controls">
                    <button onClick={handleSelectAll} className="select-all-btn">
                      Select All
                    </button>
                    <button onClick={handleSelectNone} className="select-none-btn">
                      Select None
                    </button>
                  </div>
                </div>

                <div className="prompts-list">
                  {prompts.map(prompt => (
                    <div
                      key={prompt.id}
                      className={`prompt-item ${selectedPrompts.has(prompt.id) ? 'selected' : ''}`}
                      onClick={() => handlePromptToggle(prompt.id)}
                    >
                      <div className="prompt-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedPrompts.has(prompt.id)}
                          onChange={() => handlePromptToggle(prompt.id)}
                        />
                      </div>
                      <div className="prompt-text">
                        {prompt.leftConcept} vs {prompt.rightConcept}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal footer */}
        {!showUsernameInput && (
          <div className="pack-modal-footer">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="save-btn" 
              onClick={handleSave}
              disabled={!canSave()}
            >
              {mode === 'create' ? 'Create Pack' : 'Add to Pack'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};