// Configuration for different environments
export const config = {
  serverUrl: import.meta.env.PROD 
    ? 'https://wavelength-game-server.railway.app'
    : 'http://localhost:3001',
  
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};