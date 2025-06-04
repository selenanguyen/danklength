import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SpectrumConcept, PromptPack } from '../../types';
import { useUserPacks } from '../../hooks/useUserPacks';
import './PackManagementModal.css';

interface PackManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PackManagementModal: React.FC<PackManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [username, setUsername] = useState('');
  const [showUsernameInput, setShowUsernameInput] = useState(true);
  const [selectedPack, setSelectedPack] = useState<PromptPack | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'create'>('list');
  const [editingPackName, setEditingPackName] = useState('');
  const [newPromptLeft, setNewPromptLeft] = useState('');
  const [newPromptRight, setNewPromptRight] = useState('');

  const {
    userPacks,
    username: currentUsername,
    setCurrentUsername,
    createPack,
    deletePack,
    renamePack,
    addToExistingPack,
  } = useUserPacks();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowUsernameInput(true);
      setView('list');
      setSelectedPack(null);
      setUsername('');
    }
  }, [isOpen]);

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      setCurrentUsername(username.trim());
      setShowUsernameInput(false);
    }
  };

  const handleCreateNewPack = () => {
    setView('create');
    setEditingPackName('');
    setNewPromptLeft('');
    setNewPromptRight('');
  };

  const handleEditPack = (pack: PromptPack) => {
    setSelectedPack(pack);
    setEditingPackName(pack.name);
    setView('edit');
    setNewPromptLeft('');
    setNewPromptRight('');
  };

  const handleDeletePack = async (packId: string) => {
    if (confirm('Are you sure you want to delete this pack? This action cannot be undone.')) {
      await deletePack(packId);
    }
  };

  const handleSavePackName = async () => {
    if (selectedPack && editingPackName.trim()) {
      await renamePack(selectedPack.id, editingPackName.trim());
      setSelectedPack({ ...selectedPack, name: editingPackName.trim() });
    }
  };

  const handleAddPrompt = async () => {
    if (newPromptLeft.trim() && newPromptRight.trim()) {
      const newPrompt: SpectrumConcept = {
        id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        leftConcept: newPromptLeft.trim(),
        rightConcept: newPromptRight.trim(),
      };

      if (view === 'create') {
        // For create mode, we'll handle this in handleCreatePack
        setNewPromptLeft('');
        setNewPromptRight('');
      } else if (selectedPack) {
        await addToExistingPack(selectedPack.id, [newPrompt]);
        // Refresh the selected pack data
        const updatedPack = userPacks.find(p => p.id === selectedPack.id);
        if (updatedPack) {
          setSelectedPack(updatedPack);
        }
        setNewPromptLeft('');
        setNewPromptRight('');
      }
    }
  };

  const handleCreatePack = async () => {
    if (editingPackName.trim()) {
      const prompts: SpectrumConcept[] = [];
      if (newPromptLeft.trim() && newPromptRight.trim()) {
        prompts.push({
          id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          leftConcept: newPromptLeft.trim(),
          rightConcept: newPromptRight.trim(),
        });
      }
      
      await createPack(editingPackName.trim(), prompts);
      setView('list');
      setEditingPackName('');
      setNewPromptLeft('');
      setNewPromptRight('');
    }
  };

  const handleRemovePrompt = async (promptToRemove: SpectrumConcept) => {
    if (selectedPack) {
      const updatedPrompts = selectedPack.prompts.filter(p => p.id !== promptToRemove.id);
      // Since we don't have a direct "remove prompt" function, we'll recreate the pack
      await deletePack(selectedPack.id);
      if (updatedPrompts.length > 0) {
        const newPack = await createPack(selectedPack.name, updatedPrompts);
        setSelectedPack(newPack || null);
      } else {
        setView('list');
        setSelectedPack(null);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (view === 'create') {
        handleCreatePack();
      } else {
        handleAddPrompt();
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="pack-mgmt-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pack-mgmt-modal">
        <div className="pack-mgmt-modal-header">
          <h2>📦 My Custom Packs</h2>
          <button className="pack-mgmt-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="pack-mgmt-modal-content">
          {/* Username input section */}
          {showUsernameInput && (
            <div className="username-section">
              <h3>Enter Your Username</h3>
              <p>Enter your username to view and manage your custom packs:</p>
              <div className="username-input-group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username..."
                  onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                />
                <button 
                  onClick={handleUsernameSubmit}
                  disabled={!username.trim()}
                  className="username-submit-btn"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Pack management interface */}
          {!showUsernameInput && (
            <>
              {/* Header with navigation */}
              <div className="pack-mgmt-header">
                <div className="pack-mgmt-navigation">
                  {view !== 'list' && (
                    <button 
                      className="back-button"
                      onClick={() => {
                        setView('list');
                        setSelectedPack(null);
                      }}
                    >
                      ← Back to Packs
                    </button>
                  )}
                  <div className="user-info">
                    <span>Welcome, <strong>{currentUsername}</strong></span>
                  </div>
                </div>
              </div>

              {/* Pack list view */}
              {view === 'list' && (
                <div className="pack-list-view">
                  <div className="pack-list-header">
                    <h3>Your Custom Packs ({userPacks.length})</h3>
                    <button 
                      className="create-pack-btn"
                      onClick={handleCreateNewPack}
                    >
                      + Create New Pack
                    </button>
                  </div>

                  {userPacks.length === 0 ? (
                    <div className="empty-state">
                      <p>You don't have any custom packs yet.</p>
                      <p>Create your first pack to get started!</p>
                    </div>
                  ) : (
                    <div className="packs-grid">
                      {userPacks.map(pack => (
                        <div key={pack.id} className="pack-card">
                          <div className="pack-card-header">
                            <h4>{pack.name}</h4>
                            <span className="prompt-count">{pack.prompts.length} prompts</span>
                          </div>
                          <div className="pack-prompts-preview">
                            {pack.prompts.slice(0, 3).map((prompt, index) => (
                              <div key={index} className="preview-prompt">
                                {prompt.leftConcept} vs {prompt.rightConcept}
                              </div>
                            ))}
                            {pack.prompts.length > 3 && (
                              <div className="more-prompts">
                                +{pack.prompts.length - 3} more...
                              </div>
                            )}
                          </div>
                          <div className="pack-actions">
                            <button 
                              className="edit-btn"
                              onClick={() => handleEditPack(pack)}
                            >
                              Edit
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeletePack(pack.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Create pack view */}
              {view === 'create' && (
                <div className="pack-create-view">
                  <h3>Create New Pack</h3>
                  
                  <div className="pack-name-input">
                    <label>Pack Name:</label>
                    <input
                      type="text"
                      value={editingPackName}
                      onChange={(e) => setEditingPackName(e.target.value)}
                      placeholder="Enter pack name..."
                      maxLength={50}
                    />
                  </div>

                  <div className="add-prompt-section">
                    <h4>Add First Prompt (Optional)</h4>
                    <div className="prompt-input-group">
                      <input
                        type="text"
                        value={newPromptLeft}
                        onChange={(e) => setNewPromptLeft(e.target.value)}
                        placeholder="Left concept"
                        maxLength={20}
                        onKeyPress={handleKeyPress}
                      />
                      <span className="vs-divider">vs</span>
                      <input
                        type="text"
                        value={newPromptRight}
                        onChange={(e) => setNewPromptRight(e.target.value)}
                        placeholder="Right concept"
                        maxLength={20}
                        onKeyPress={handleKeyPress}
                      />
                    </div>
                  </div>

                  <div className="create-actions">
                    <button 
                      className="create-btn"
                      onClick={handleCreatePack}
                      disabled={!editingPackName.trim()}
                    >
                      Create Pack
                    </button>
                  </div>
                </div>
              )}

              {/* Edit pack view */}
              {view === 'edit' && selectedPack && (
                <div className="pack-edit-view">
                  <div className="pack-edit-header">
                    <div className="pack-name-edit">
                      <label>Pack Name:</label>
                      <div className="pack-name-input-group">
                        <input
                          type="text"
                          value={editingPackName}
                          onChange={(e) => setEditingPackName(e.target.value)}
                          maxLength={50}
                        />
                        <button 
                          className="save-name-btn"
                          onClick={handleSavePackName}
                          disabled={editingPackName === selectedPack.name || !editingPackName.trim()}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pack-prompts-section">
                    <h4>Prompts ({selectedPack.prompts.length})</h4>
                    
                    {selectedPack.prompts.length === 0 ? (
                      <div className="empty-prompts">
                        <p>No prompts in this pack yet. Add some below!</p>
                      </div>
                    ) : (
                      <div className="prompts-gallery">
                        {selectedPack.prompts.map((prompt, index) => (
                          <div
                            key={prompt.id}
                            className="prompt-card"
                            style={{ 
                              '--appear-delay': `${index * 0.05}s`,
                              '--float-delay': `${index * 0.15}s`
                            } as React.CSSProperties}
                          >
                            <div className="prompt-text">
                              {prompt.leftConcept} vs {prompt.rightConcept}
                            </div>
                            <button 
                              className="remove-prompt-btn"
                              onClick={() => handleRemovePrompt(prompt)}
                              title="Remove prompt"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="add-prompt-section">
                      <h5>Add New Prompt</h5>
                      <div className="prompt-input-group">
                        <input
                          type="text"
                          value={newPromptLeft}
                          onChange={(e) => setNewPromptLeft(e.target.value)}
                          placeholder="Left concept"
                          maxLength={20}
                          onKeyPress={handleKeyPress}
                        />
                        <span className="vs-divider">vs</span>
                        <input
                          type="text"
                          value={newPromptRight}
                          onChange={(e) => setNewPromptRight(e.target.value)}
                          placeholder="Right concept"
                          maxLength={20}
                          onKeyPress={handleKeyPress}
                        />
                        <button
                          className="add-prompt-btn"
                          onClick={handleAddPrompt}
                          disabled={!newPromptLeft.trim() || !newPromptRight.trim()}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};