import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export interface GameState {
  room_id: string;
  is_bot_game: boolean;
  game_type?: 'numbers' | 'words';
  state: 'WAITING_FOR_PLAYERS' | 'WAITING_FOR_SECRETS' | 'PLAYING' | 'FINISHED' | 'PLAYER_DISCONNECTED';
  current_turn: string | null;
  current_turn_name: string | null;
  players: { [key: string]: { name: string; has_secret: boolean; secret: string | null } };
  player_order: string[];
  guesses_history: Array<{
    player_id: string;
    player_name: string;
    guess: string;
    exact_matches: number;
    is_win: boolean;
    turn_number: number;
    round_number?: number;
    turn_in_round?: number;
    time_taken_seconds?: number;
  }>;
  past_games_history?: Array<{
    game_number: number;
    winner: string;
    winner_name: string;
    total_rounds: number;
    player_secrets: { [pid: string]: { name: string; secret: string } };
  }>;
  winner: string | null;
  winner_name: string | null;
}

export interface ChatMessage {
  sender_id: string;
  sender_name: string;
  text: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameSocketService {
  private socket: WebSocket | null = null;

  // Modern Angular Signals
  public gameState = signal<GameState | null>(null);
  public playerId = signal<string | null>(null);
  public chatMessages = signal<ChatMessage[]>([]);
  public errorMessage = signal<string | null>(null);
  public isConnected = signal<boolean>(false);

  private get backendHost(): string {
    const hostname = window.location.hostname || 'localhost';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${hostname}:8000`;
    }
    if ((window as any).BACKEND_URL) {
      return (window as any).BACKEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    return 'cifre4-0.onrender.com';
  }

  constructor(private http: HttpClient) {}

  async createRoom(isBot: boolean, gameType: string = 'numbers'): Promise<string> {
    const isHttps = window.location.protocol === 'https:';
    const httpProtocol = isHttps ? 'https:' : 'http:';
    const url = `${httpProtocol}//${this.backendHost}/api/rooms/create`;
    const res = await firstValueFrom(this.http.post<{ room_id: string }>(url, { is_bot: isBot, game_type: gameType }));
    return res.room_id;
  }

  async getWaitingRooms(gameType?: string): Promise<{ room_id: string; host_name: string; game_type?: string }[]> {
    const isHttps = window.location.protocol === 'https:';
    const httpProtocol = isHttps ? 'https:' : 'http:';
    const query = gameType ? `?game_type=${encodeURIComponent(gameType)}` : '';
    const url = `${httpProtocol}//${this.backendHost}/api/rooms/waiting${query}`;
    return await firstValueFrom(this.http.get<{ room_id: string; host_name: string; game_type?: string }[]>(url));
  }

  async getAllPlayers(): Promise<string[]> {
    const isHttps = window.location.protocol === 'https:';
    const httpProtocol = isHttps ? 'https:' : 'http:';
    const url = `${httpProtocol}//${this.backendHost}/api/players`;
    return await firstValueFrom(this.http.get<string[]>(url));
  }

  async savePlayer(name: string): Promise<string[]> {
    const isHttps = window.location.protocol === 'https:';
    const httpProtocol = isHttps ? 'https:' : 'http:';
    const url = `${httpProtocol}//${this.backendHost}/api/players`;
    const res = await firstValueFrom(this.http.post<{ success: boolean; players: string[] }>(url, { name }));
    return res.players;
  }

  async getGlobalStats(gameType?: string): Promise<{ [winner_name: string]: number }> {
    const isHttps = window.location.protocol === 'https:';
    const httpProtocol = isHttps ? 'https:' : 'http:';
    const query = gameType ? `?game_type=${encodeURIComponent(gameType)}` : '';
    const url = `${httpProtocol}//${this.backendHost}/api/stats${query}`;
    return await firstValueFrom(this.http.get<{ [winner_name: string]: number }>(url));
  }

  connectSocket(roomId: string, playerName: string) {
    this.disconnect();
    this.errorMessage.set(null);

    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${this.backendHost}/ws/${encodeURIComponent(roomId)}/${encodeURIComponent(playerName)}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected.set(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'CONNECTED') {
          this.playerId.set(msg.data.player_id);
        } else if (msg.type === 'GAME_STATE') {
          this.gameState.set(msg.data);
        } else if (msg.type === 'CHAT_MESSAGE') {
          this.chatMessages.update(msgs => [...msgs, msg.data]);
        } else if (msg.type === 'ERROR') {
          this.errorMessage.set(msg.message);
          setTimeout(() => this.errorMessage.set(null), 4000);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket Error:', err);
      this.errorMessage.set('Eroare de conexiune la serverul de joc!');
    };

    this.socket.onclose = () => {
      this.isConnected.set(false);
    };
  }

  setSecret(secret: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'SET_SECRET',
        payload: { secret }
      }));
    }
  }

  makeGuess(guess: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'MAKE_GUESS',
        payload: { guess }
      }));
    }
  }

  restartGame() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'RESTART_GAME'
      }));
    }
  }

  sendChat(text: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.socket.send(JSON.stringify({
        type: 'SEND_CHAT',
        payload: { text, timestamp }
      }));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.gameState.set(null);
    this.playerId.set(null);
    this.chatMessages.set([]);
    this.isConnected.set(false);
  }
}
