import { log } from "@/lib/utils/logging"
const logger = log.getLogger("session")

type MessageResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
}

// Safe chrome type for web build (solo se non già dichiarato)
declare global {
  interface Window {
    // chrome: any; // RIMOSSO: causa conflitto con @types/chrome
  }
}

export class SessionManager {
  private port: any = null;
  private messageHandlers: Map<string, (response: MessageResponse) => void> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
      this.port = window.chrome.runtime.connect({ name: 'session-manager' });
      this.port.onMessage.addListener((message: MessageResponse & { messageId?: string }) => {
        if (message.messageId) {
          const handler = this.messageHandlers.get(message.messageId);
          if (handler) {
            handler(message);
            this.messageHandlers.delete(message.messageId);
          }
        }
      });
    } else {
      logger.warn('SessionManager: chrome.runtime is not available. Running in web mode?');
      // No port in web mode
      this.port = null;
    }
  }

  private async sendMessage(type: string, payload?: any): Promise<MessageResponse> {
    if (!this.port) {
      // Web fallback: simulate extension session with localStorage
      switch (type) {
        case 'startSession': {
          try {
            localStorage.setItem('session-jwk', payload?.jwk || '');
            localStorage.setItem('session-expires', payload?.duration ? (Date.now() + payload.duration * 60 * 1000).toString() : '');
            return { success: true };
          } catch (e) {
            return { success: false, error: 'Failed to start session (web fallback)' };
          }
        }
        case 'extendSession': {
          try {
            const expires = localStorage.getItem('session-expires');
            if (expires && payload?.duration) {
              localStorage.setItem('session-expires', (Date.now() + payload.duration * 60 * 1000).toString());
              return { success: true };
            }
            return { success: false, error: 'No session to extend (web fallback)' };
          } catch (e) {
            return { success: false, error: 'Failed to extend session (web fallback)' };
          }
        }
        case 'checkSession': {
          const jwk = localStorage.getItem('session-jwk');
          const expires = localStorage.getItem('session-expires');
          const active = !!jwk && (!expires || Date.now() < Number(expires));
          return { success: true, data: { active, jwk: active ? jwk : undefined } };
        }
        case 'endSession': {
          localStorage.removeItem('session-jwk');
          localStorage.removeItem('session-expires');
          return { success: true };
        }
        case 'recordActivity': {
          // No-op in web fallback
          return { success: true };
        }
        default:
          return { success: false, error: 'chrome.runtime not available (web fallback)' };
      }
    }
    return new Promise((resolve) => {
      const messageId = crypto.randomUUID();
      this.messageHandlers.set(messageId, resolve);
      this.port.postMessage({
        type,
        payload,
        messageId
      });
    });
  }

  async startSession(jwk: string, duration?: number): Promise<void> {
    logger.info('SessionManager: Starting session', jwk, duration)
    const response = await this.sendMessage('startSession', { jwk, duration })
    if (!response.success) {
      logger.warn(response.error || 'Failed to start session (web fallback)');
    }
  }

  async extendSession(duration?: number): Promise<void> {
    const response = await this.sendMessage('extendSession', { duration })
    if (!response.success) {
      logger.warn(response.error || 'Failed to extend session (web fallback)');
    }
  }

  async checkSession(): Promise<{ active: boolean, jwk?: string }> {
    const response = await this.sendMessage('checkSession')
    if (!response.success) {
      logger.warn(response.error || 'Failed to check session (web fallback)');
      return { active: false };
    }
    return response.data
  }

  async endSession(): Promise<void> {
    const response = await this.sendMessage('endSession')
    if (!response.success) {
      logger.warn(response.error || 'Failed to end session (web fallback)');
    }
  }

  async recordActivity(): Promise<void> {
    try {
      await this.sendMessage('recordActivity')
    } catch (error) {
      logger.warn('Failed to record activity:', error)
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager()