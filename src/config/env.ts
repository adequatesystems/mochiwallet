interface EnvConfig {
  apiUrl: string
  isDevelopment: boolean
  isProduction: boolean
}

// Get API URL from localStorage if available, otherwise use the default from .env
const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const savedEndpoint = localStorage.getItem('api-endpoint');
    return savedEndpoint || import.meta.env.VITE_MESH_API_URL || 'https://api.mochimo.org';
  }
  return import.meta.env.VITE_MESH_API_URL || 'https://api.mochimo.org';
};

// Create a reactive environment object that can update
let currentEnv: EnvConfig = {
  apiUrl: getApiUrl(),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
};

// Export a getter for the environment
export const env = currentEnv;

// Function to update the API URL dynamically
export const updateApiUrl = (newUrl: string): void => {
  currentEnv.apiUrl = newUrl;
};
