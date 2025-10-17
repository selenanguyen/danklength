// Configuration for different environments
export const config = {
  serverUrl: import.meta.env.VITE_SERVER_URL || (
    import.meta.env.PROD
      ? 'https://your-render-app.onrender.com'
      : 'http://localhost:3001'
  ),

  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
