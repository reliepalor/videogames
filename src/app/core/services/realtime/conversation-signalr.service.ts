import { Injectable, inject } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState
} from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConversationSignalRService {

  private platformId = inject(PLATFORM_ID);
  private hub?: HubConnection;

  private connected = false;
  private connectPromise?: Promise<void>;

  message$ = new BehaviorSubject<any>(null);
  typing$ = new BehaviorSubject<boolean>(false);
  seen$ = new BehaviorSubject<boolean>(false);
  onlineUsers$ = new BehaviorSubject<Set<string>>(new Set());
  conversationListUpdated$ = new BehaviorSubject<boolean>(false);

  async connect(): Promise<void> {
    // Return existing promise if already connecting/connected
    if (this.connectPromise) {
      return this.connectPromise;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }
    if (this.connected && this.hub) {
      return Promise.resolve();
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return Promise.resolve();
    }

    this.connectPromise = this.doConnect(token);
    return this.connectPromise;
  }

  private async doConnect(token: string): Promise<void> {
    try {
      this.hub = new HubConnectionBuilder()
        .withUrl('http://localhost:5019/hubs/conversations', {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

      this.registerHandlers();

      await this.hub.start();
      this.connected = true;

      console.log('[SignalR] Connected');
    } catch (err) {
      console.error('[SignalR] Connection failed:', err);
      this.connectPromise = undefined;
      throw err;
    }
  }

  private registerHandlers(): void {
    if (!this.hub) return;

    this.hub.on('ReceiveMessage', msg => {
      console.log('[SignalR] ReceiveMessage event received:', msg);
      this.message$.next(msg);
      this.conversationListUpdated$.next(true);
    });

    this.hub.on('UserTyping', () => {
      this.typing$.next(true);
      setTimeout(() => this.typing$.next(false), 1500);
    });

    this.hub.on('MessagesSeen', () => {
      this.seen$.next(true);
    });
  }

  async joinConversation(id: number): Promise<void> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) {
      console.warn('[SignalR] Cannot join conversation: not connected');
      return;
    }
    try {
      await this.hub.invoke('JoinConversation', id);
      console.log('[SignalR] Joined conversation:', id);
    } catch (err) {
      console.error('[SignalR] Failed to join conversation:', err);
    }
  }

  async leaveConversation(id: number): Promise<void> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) return;
    await this.hub.invoke('LeaveConversation', id);
  }

  async typing(id: number): Promise<void> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) return;
    await this.hub.invoke('Typing', id);
  }

  async seen(id: number): Promise<void> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) return;
    await this.hub.invoke('Seen', id);
  }

  async disconnect(): Promise<void> {
    if (this.hub) {
      await this.hub.stop();
      this.hub = undefined;
      this.connected = false;
      this.connectPromise = undefined;
      console.log('[SignalR] Disconnected');
    }
  }
}
