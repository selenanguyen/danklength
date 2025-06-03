import { useState, useCallback, useEffect } from 'react';
import type { PromptPack, UserPackData, SpectrumConcept } from '../types';

const STORAGE_KEY = 'danklength-user-packs';

export const useUserPacks = (currentUsername?: string) => {
  const [userPacks, setUserPacks] = useState<PromptPack[]>([]);
  const [username, setUsername] = useState<string>(currentUsername || '');

  // Load user packs from localStorage
  const loadUserPacks = useCallback((usernameToLoad: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allUserData: UserPackData[] = JSON.parse(stored);
        const userData = allUserData.find(data => data.username === usernameToLoad);
        return userData?.packs || [];
      }
    } catch (error) {
      console.error('Error loading user packs:', error);
    }
    return [];
  }, []);

  // Save user packs to localStorage
  const saveUserPacks = useCallback((usernameToSave: string, packs: PromptPack[]) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let allUserData: UserPackData[] = stored ? JSON.parse(stored) : [];
      
      // Update or add user data
      const existingUserIndex = allUserData.findIndex(data => data.username === usernameToSave);
      const userData: UserPackData = {
        username: usernameToSave,
        packs,
        lastUpdated: new Date().toISOString(),
      };

      if (existingUserIndex >= 0) {
        allUserData[existingUserIndex] = userData;
      } else {
        allUserData.push(userData);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allUserData));
    } catch (error) {
      console.error('Error saving user packs:', error);
    }
  }, []);

  // Load packs when username changes
  useEffect(() => {
    if (username) {
      const packs = loadUserPacks(username);
      setUserPacks(packs);
    }
  }, [username, loadUserPacks]);

  // Set the current username
  const setCurrentUsername = useCallback((newUsername: string) => {
    setUsername(newUsername);
  }, []);

  // Create a new pack
  const createPack = useCallback((packName: string, prompts: SpectrumConcept[]) => {
    if (!username) return;

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
    saveUserPacks(username, updatedPacks);
    
    return newPack;
  }, [username, userPacks, saveUserPacks]);

  // Add prompts to an existing pack
  const addToExistingPack = useCallback((packId: string, newPrompts: SpectrumConcept[]) => {
    if (!username) return;

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
    saveUserPacks(username, updatedPacks);
  }, [username, userPacks, saveUserPacks]);

  // Delete a pack
  const deletePack = useCallback((packId: string) => {
    if (!username) return;

    const updatedPacks = userPacks.filter(pack => pack.id !== packId);
    setUserPacks(updatedPacks);
    saveUserPacks(username, updatedPacks);
  }, [username, userPacks, saveUserPacks]);

  // Rename a pack
  const renamePack = useCallback((packId: string, newName: string) => {
    if (!username) return;

    const updatedPacks = userPacks.map(pack => 
      pack.id === packId ? { ...pack, name: newName } : pack
    );
    
    setUserPacks(updatedPacks);
    saveUserPacks(username, updatedPacks);
  }, [username, userPacks, saveUserPacks]);

  // Get all users for potential sharing features
  const getAllUsers = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allUserData: UserPackData[] = JSON.parse(stored);
        return allUserData.map(data => data.username);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    return [];
  }, []);

  return {
    userPacks,
    username,
    setCurrentUsername,
    createPack,
    addToExistingPack,
    deletePack,
    renamePack,
    getAllUsers,
  };
};