import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  isRemoteMode?: boolean; // New prop to identify remote mode
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
  isRemoteMode = false,
}) => {
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [newPackName, setNewPackName] = useState('');
  const [selectedExistingPack, setSelectedExistingPack] = useState('');
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [usernameInput, setUsernameInput] = useState(currentUsername || '');
  const [showUsernameInput, setShowUsernameInput] = useState(!currentUsername);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsernameInput, setEditUsernameInput] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPrompts(new Set(prompts.map(p => p.id)));
      setNewPackName('');
      setSelectedExistingPack('');
      setMode('create'); // Always start with create tab
      setUsernameInput(currentUsername || '');
      setShowUsernameInput(!currentUsername);
    }
  }, [isOpen, prompts, currentUsername]);

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
    // Only select prompts that aren't already in the pack
    const existingPackPrompts = mode === 'existing' && selectedExistingPack 
      ? userPacks.find(p => p.id === selectedExistingPack)?.prompts || []
      : [];
    
    const selectablePrompts = prompts.filter(prompt => {
      const isAlreadyInPack = existingPackPrompts.some(existingPrompt =>
        `${existingPrompt.leftConcept} vs ${existingPrompt.rightConcept}` === 
        `${prompt.leftConcept} vs ${prompt.rightConcept}`
      );
      return !isAlreadyInPack;
    });
    
    setSelectedPrompts(new Set(selectablePrompts.map(p => p.id)));
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

  const handleStartEditingUsername = () => {
    setEditUsernameInput(currentUsername || '');
    setIsEditingUsername(true);
  };

  const handleConfirmUsernameChange = () => {
    if (editUsernameInput.trim() && onSetUsername) {
      onSetUsername(editUsernameInput.trim());
      setIsEditingUsername(false);
    }
  };

  const handleCancelUsernameEdit = () => {
    setIsEditingUsername(false);
    setEditUsernameInput('');
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

  const modalContent = (
    <div className="pack-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pack-modal">
        <div className="pack-modal-header">
          <h2>📦 Save Custom Spectrum Pack</h2>
          <div className="header-controls">
            {/* Username change button - only in non-remote mode and when user has a username */}
            {!isRemoteMode && currentUsername && !showUsernameInput && (
              <button 
                className="username-change-button"
                onClick={handleStartEditingUsername}
                title="Change username"
              >
                👤 {currentUsername}
              </button>
            )}
            <button className="pack-modal-close" onClick={onClose}>×</button>
          </div>
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

          {/* Username editing interface */}
          {!showUsernameInput && isEditingUsername && (
            <div className="username-edit-section">
              <h3>Change Username</h3>
              <div className="username-edit-group">
                <input
                  type="text"
                  value={editUsernameInput}
                  onChange={(e) => setEditUsernameInput(e.target.value)}
                  placeholder="Enter new username..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleConfirmUsernameChange();
                    if (e.key === 'Escape') handleCancelUsernameEdit();
                  }}
                  autoFocus
                />
                <div className="username-edit-buttons">
                  <button 
                    onClick={handleConfirmUsernameChange}
                    disabled={!editUsernameInput.trim()}
                    className="confirm-username-btn"
                  >
                    Save
                  </button>
                  <button 
                    onClick={handleCancelUsernameEdit}
                    className="cancel-username-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main pack selection interface */}
          {!showUsernameInput && !isEditingUsername && (
            <>
              {/* Pack mode selection */}
              <div className="pack-mode-selection">
                <button
                  className={`mode-button ${mode === 'create' ? 'active' : ''}`}
                  onClick={() => setMode('create')}
                >
                  Create pack
                </button>
                <button
                  className={`mode-button ${mode === 'existing' ? 'active' : ''}`}
                  onClick={() => setMode('existing')}
                >
                  Add to pack
                </button>
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
                    <p className="username-info">
                      Pack will be stored under username: <strong>{currentUsername || usernameInput}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="existing-pack-config">
                    {userPacks.length > 0 ? (
                      <>
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
                        
                        {/* Show existing pack prompts */}
                        {selectedExistingPack && (
                          <div className="existing-pack-prompts">
                            <h4>Current prompts in this pack:</h4>
                            <p className="pack-prompts-list">
                              {userPacks.find(p => p.id === selectedExistingPack)?.prompts.map(prompt => 
                                `${prompt.leftConcept} vs ${prompt.rightConcept}`
                              ).join(', ')}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="empty-pack-state">
                        <p>You don't have any existing packs yet.</p>
                        <p>Switch to "CREATE NEW PACK" to create your first pack!</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Prompt selection - now inside the tab container */}
                <div className="prompt-selection">
                  <div className="selection-header">
                    <h3>Select Prompts ({selectedPrompts.size}/{(() => {
                      if (mode === 'existing' && selectedExistingPack) {
                        const existingPackPrompts = userPacks.find(p => p.id === selectedExistingPack)?.prompts || [];
                        const selectableCount = prompts.filter(prompt => {
                          const isAlreadyInPack = existingPackPrompts.some(existingPrompt =>
                            `${existingPrompt.leftConcept} vs ${existingPrompt.rightConcept}` === 
                            `${prompt.leftConcept} vs ${prompt.rightConcept}`
                          );
                          return !isAlreadyInPack;
                        }).length;
                        return selectableCount;
                      }
                      return prompts.length;
                    })()})</h3>
                    <div className="selection-controls">
                      <button onClick={handleSelectAll} className="select-all-btn">
                        select all
                      </button>
                      <button onClick={handleSelectNone} className="select-none-btn">
                        select none
                      </button>
                    </div>
                  </div>

                  <div className="prompts-gallery">
                    {prompts.map((prompt, index) => {
                      // Check if this prompt already exists in the selected pack
                      const existingPackPrompts = mode === 'existing' && selectedExistingPack 
                        ? userPacks.find(p => p.id === selectedExistingPack)?.prompts || []
                        : [];
                      
                      const isAlreadyInPack = existingPackPrompts.some(existingPrompt =>
                        `${existingPrompt.leftConcept} vs ${existingPrompt.rightConcept}` === 
                        `${prompt.leftConcept} vs ${prompt.rightConcept}`
                      );

                      return (
                        <div
                          key={prompt.id}
                          className={`prompt-card ${selectedPrompts.has(prompt.id) ? 'selected' : ''} ${isAlreadyInPack ? 'disabled' : ''}`}
                          style={{ 
                            '--appear-delay': `${index * 0.05}s`,
                            '--float-delay': `${index * 0.15}s`
                          } as React.CSSProperties}
                          onClick={() => !isAlreadyInPack && handlePromptToggle(prompt.id)}
                        >
                          <div className="prompt-text">
                            {prompt.leftConcept} vs {prompt.rightConcept}
                          </div>
                          {selectedPrompts.has(prompt.id) && !isAlreadyInPack && (
                            <div className="selection-indicator">✓</div>
                          )}
                          {isAlreadyInPack && (
                            <div className="already-exists-indicator">Already in pack</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal footer */}
        {!showUsernameInput && !isEditingUsername && (
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

  return createPortal(modalContent, document.body);
};