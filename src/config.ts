// Configuration for different environments
export const config = {
  serverUrl: import.meta.env.PROD 
    ? 'https://a518-141-239-239-18.ngrok-free.app'
    : 'http://localhost:3001',
  
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
