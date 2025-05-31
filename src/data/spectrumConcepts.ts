import type { SpectrumConcept } from '../types';

export const spectrumConcepts: SpectrumConcept[] = [
  { id: '1', leftConcept: 'Hot', rightConcept: 'Cold' },
  { id: '2', leftConcept: 'Underrated', rightConcept: 'Overrated' },
  { id: '3', leftConcept: 'Scary', rightConcept: 'Not Scary' },
  { id: '4', leftConcept: 'Round', rightConcept: 'Pointy' },
  { id: '5', leftConcept: 'Smells Bad', rightConcept: 'Smells Good' },
  { id: '6', leftConcept: 'Loud', rightConcept: 'Quiet' },
  { id: '7', leftConcept: 'Expensive', rightConcept: 'Cheap' },
  { id: '8', leftConcept: 'Fast', rightConcept: 'Slow' },
  { id: '9', leftConcept: 'Big', rightConcept: 'Small' },
  { id: '10', leftConcept: 'Soft', rightConcept: 'Hard' },
  { id: '11', leftConcept: 'Masculine', rightConcept: 'Feminine' },
  { id: '12', leftConcept: 'Young', rightConcept: 'Old' },
  { id: '13', leftConcept: 'Wet', rightConcept: 'Dry' },
  { id: '14', leftConcept: 'Heavy', rightConcept: 'Light' },
  { id: '15', leftConcept: 'Boring', rightConcept: 'Exciting' },
  { id: '16', leftConcept: 'Dark', rightConcept: 'Bright' },
  { id: '17', leftConcept: 'Rough', rightConcept: 'Smooth' },
  { id: '18', leftConcept: 'Unhealthy', rightConcept: 'Healthy' },
  { id: '19', leftConcept: 'Fantasy', rightConcept: 'Sci-Fi' },
  { id: '20', leftConcept: 'Risky', rightConcept: 'Safe' },
];

export const getRandomConcept = (): SpectrumConcept => {
  const randomIndex = Math.floor(Math.random() * spectrumConcepts.length);
  return spectrumConcepts[randomIndex];
};