import { useState, useCallback, useEffect } from 'react';
import type { PromptPack, SpectrumConcept } from '../types';
import { config } from '../config';

export const useUserPacks = (currentUsername?: string) => {
  const [userPacks, setUserPacks] = useState<PromptPack[]>([]);
  const [username, setUsername] = useState<string>(currentUsername || '');

  // Load user packs from server
  const loadUserPacks = useCallback(async (usernameToLoad: string): Promise<PromptPack[]> => {
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

  // Save user packs to server
  const saveUserPacks = useCallback(async (usernameToSave: string, packs: PromptPack[]) => {
    try {
      const response = await fetch(`${config.serverUrl}/api/packs/${encodeURIComponent(usernameToSave)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packs }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save packs');
      }
    } catch (error) {
      console.error('Error saving user packs:', error);
    }
  }, []);

  // Load packs when username changes
  useEffect(() => {
    if (username) {
      loadUserPacks(username).then(packs => {
        setUserPacks(packs);
      });
    }
  }, [username, loadUserPacks]);

  // Set the current username
  const setCurrentUsername = useCallback((newUsername: string) => {
    setUsername(newUsername);
  }, []);

  // Create a new pack
  const createPack = useCallback(async (packName: string, prompts: SpectrumConcept[]) => {
    if (!username) {
      console.error('Cannot create pack: username not set');
      alert('Error: Username not set. Please try again.');
      return;
    }

    const newPack: PromptPack = {
      id: `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: packName,
      prompts: [...prompts],
      createdBy: username,
      createdAt: new Date().toISOString(),
      isPublic: false,
    };

    const updatedPacks = [...userPacks, newPack];
    setUserPacks(updatedPacks);
    await saveUserPacks(username, updatedPacks);
    
    return newPack;
  }, [username, userPacks, saveUserPacks]);

  // Add prompts to an existing pack
  const addToExistingPack = useCallback(async (packId: string, newPrompts: SpectrumConcept[]) => {
    if (!username) {
      console.error('Cannot add to pack: username not set');
      alert('Error: Username not set. Please try again.');
      return;
    }

    const updatedPacks = userPacks.map(pack => {
      if (pack.id === packId) {
        // Merge prompts, avoiding duplicates based on content
        const existingPromptStrings = pack.prompts.map(p => `${p.leftConcept} vs ${p.rightConcept}`);
        const filteredNewPrompts = newPrompts.filter(p => 
          !existingPromptStrings.includes(`${p.leftConcept} vs ${p.rightConcept}`)
        );
        
        return {
          ...pack,
          prompts: [...pack.prompts, ...filteredNewPrompts],
        };
      }
      return pack;
    });

    setUserPacks(updatedPacks);
    await saveUserPacks(username, updatedPacks);
  }, [username, userPacks, saveUserPacks]);

  // Delete a pack
  const deletePack = useCallback(async (packId: string) => {
    if (!username) return;

    const updatedPacks = userPacks.filter(pack => pack.id !== packId);
    setUserPacks(updatedPacks);
    await saveUserPacks(username, updatedPacks);
  }, [username, userPacks, saveUserPacks]);

  // Rename a pack
  const renamePack = useCallback(async (packId: string, newName: string) => {
    if (!username) return;

    const updatedPacks = userPacks.map(pack => 
      pack.id === packId ? { ...pack, name: newName } : pack
    );
    
    setUserPacks(updatedPacks);
    await saveUserPacks(username, updatedPacks);
  }, [username, userPacks, saveUserPacks]);

  // Load prompts from a specific pack
  const loadPackPrompts = useCallback((packId: string): SpectrumConcept[] => {
    const pack = userPacks.find(p => p.id === packId);
    return pack?.prompts || [];
  }, [userPacks]);

  // Get all users for potential sharing features (removed - would need separate API endpoint)

  return {
    userPacks,
    username,
    setCurrentUsername,
    createPack,
    addToExistingPack,
    deletePack,
    renamePack,
    loadPackPrompts,
  };
};