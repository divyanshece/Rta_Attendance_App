import type { WebSocketMessage } from '@/types';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, ((data: WebSocketMessage) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: number | null = null;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const wsUrl = `${WS_BASE_URL}/ws/attendance/?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect after maximum attempts'));
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect(token);
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message:', message);
          
          const handlers = this.messageHandlers.get(message.type);
          if (handlers) {
            handlers.forEach((handler) => handler(message));
          }

          const allHandlers = this.messageHandlers.get('*');
          if (allHandlers) {
            allHandlers.forEach((handler) => handler(message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    });
  }

  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectTimer = window.setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.connect(token).catch(() => {});
      }, this.reconnectDelay);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.messageHandlers.clear();
    }
  }

  on(event: string, handler: (data: WebSocketMessage) => void): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: (data: WebSocketMessage) => void): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(data: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  }

  joinSession(sessionId: number): void {
    this.send({ type: 'join_session', session_id: sessionId });
  }

  submitOTP(sessionId: number, otp: string): void {
    this.send({ type: 'submit_otp', session_id: sessionId, otp });
  }

  ping(): void {
    this.send({ type: 'ping' });
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();