import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NetworkProvider, MeshNetworkService } from 'mochimo-wallet';
import { updateApiUrl } from '@/config/env';
import { log } from '@/lib/utils/logging';

const logger = log.getLogger("wallet-settings");

interface ApiEndpointContextType {
  currentEndpoint: string;
  setApiEndpoint: (url: string) => boolean;
  isCustomEndpoint: boolean;
}

// Default endpoint
const DEFAULT_ENDPOINT = 'https://api.mochimo.org';

// Create the context
const ApiEndpointContext = createContext<ApiEndpointContextType | undefined>(undefined);

interface ApiEndpointProviderProps {
  children: ReactNode;
}

export function ApiEndpointProvider({ children }: ApiEndpointProviderProps) {
  const [currentEndpoint, setCurrentEndpoint] = useState<string>('');
  const [isCustomEndpoint, setIsCustomEndpoint] = useState<boolean>(false);

  // Initialize the endpoint from localStorage on first load
  useEffect(() => {
    const storedEndpoint = localStorage.getItem('api-endpoint') || DEFAULT_ENDPOINT;
    setCurrentEndpoint(storedEndpoint);
    
    // Check if it's a custom endpoint (not in the default list)
    const endpoints = [
      'https://api.mochimo.org',
      'https://dev-api.mochiscan.org:8443',
      'https://api-usc.mochimo.org',
      'https://api-sgp.mochimo.org',
      'https://api-deu.mochimo.org',
      'http://api-aus.mochimo.org:8080',
    ];
    setIsCustomEndpoint(!endpoints.includes(storedEndpoint));
  }, []);

  // Function to update the API endpoint
  const setApiEndpoint = (url: string): boolean => {
    try {
      // Save to localStorage
      localStorage.setItem('api-endpoint', url);
      
      // Create and set new network instance
      const newNetwork = new MeshNetworkService(url);
      NetworkProvider.setNetwork(newNetwork);
      
      // Update the env config
      updateApiUrl(url);
      
      // Update state
      setCurrentEndpoint(url);
      
      // Check if it's a custom endpoint
      const endpoints = [
        'https://api.mochimo.org',
        'https://dev-api.mochiscan.org:8443',
        'https://api-usc.mochimo.org',
        'https://api-sgp.mochimo.org',
        'https://api-deu.mochimo.org',
        'http://api-aus.mochimo.org:8080',
      ];
      setIsCustomEndpoint(!endpoints.includes(url));
      
      logger.info(`API endpoint changed to: ${url}`);
      
      return true;
    } catch (error) {
      logger.error('Error updating API endpoint:', error);
      return false;
    }
  };

  return (
    <ApiEndpointContext.Provider value={{ currentEndpoint, setApiEndpoint, isCustomEndpoint }}>
      {children}
    </ApiEndpointContext.Provider>
  );
}

// Hook for using the API endpoint context
export function useApiEndpoint(): ApiEndpointContextType {
  const context = useContext(ApiEndpointContext);
  if (context === undefined) {
    throw new Error('useApiEndpoint must be used within an ApiEndpointProvider');
  }
  return context;
}
