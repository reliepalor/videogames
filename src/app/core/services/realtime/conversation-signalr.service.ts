import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConversationSignalRService {
  private platformId = inject(PLATFORM_ID);
  private hub?: HubConnection;
  private connectionState$ = new BehaviorSubject<HubConnectionState>(HubConnectionState.Disconnected);

  message$ = new BehaviorSubject<any>(null);
  typing$ = new BehaviorSubject<boolean>(false);
  onlineUsers$ = new BehaviorSubject<Set<string>>(new Set());
  seen$ = new BehaviorSubject<boolean>(false);

  get connectionState(): Observable<HubConnectionState> {
    return this.connectionState$.asObservable();
  }

  get isConnected(): boolean {
    return this.hub?.state === HubConnectionState.Connected;
  }

  async connect(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.hub && this.isConnected) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found for SignalR connection');
        return;
      }

      this.hub = new HubConnectionBuilder()
        .withUrl('http://localhost:5019/hubs/conversations', {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.elapsedMilliseconds < 60000) {
              return Math.random() * 10000;
            } else {
              return null;
            }
          }
        })
        .build();

      this.setupEventHandlers();

      await this.hub.start();
      this.connectionState$.next(HubConnectionState.Connected);
      console.log('SignalR connected successfully');
    } catch (error) {
      console.error('SignalR connection failed:', error);
      this.connectionState$.next(HubConnectionState.Disconnected);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.hub) return;

    this.hub.onclose(() => {
      this.connectionState$.next(HubConnectionState.Disconnected);
      console.log('SignalR connection closed');
    });

    this.hub.onreconnecting(() => {
      this.connectionState$.next(HubConnectionState.Reconnecting);
      console.log('SignalR reconnecting...');
    });

    this.hub.onreconnected(() => {
      this.connectionState$.next(HubConnectionState.Connected);
      console.log('SignalR reconnected');
    });

    this.hub.on('ReceiveMessage', (message) => {
      if (message) {
        this.message$.next(message);
      }
    });

    this.hub.on('UserTyping', () => {
      this.typing$.next(true);
      // Reset typing after 2 seconds
      setTimeout(() => this.typing$.next(false), 2000);
    });

    this.hub.on('MessagesSeen', () => {
      this.seen$.next(true);
    });

    this.hub.on('UserOnline', (id: string) => {
      if (id) {
        const users = new Set(this.onlineUsers$.value);
        users.add(id);
        this.onlineUsers$.next(users);
      }
    });

    this.hub.on('UserOffline', (id: string) => {
      if (id) {
        const users = new Set(this.onlineUsers$.value);
        users.delete(id);
        this.onlineUsers$.next(users);
      }
    });
  }

  async joinConversation(id: number): Promise<void> {
    if (!this.isConnected || !id) return;

    try {
      await this.hub!.invoke('JoinConversation', id);
    } catch (error) {
      console.error('Failed to join conversation:', error);
    }
  }

  async typing(id: number): Promise<void> {
    if (!this.isConnected || !id) return;

    try {
      await this.hub!.invoke('Typing', id);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  async seen(id: number): Promise<void> {
    if (!this.isConnected || !id) return;

    try {
      await this.hub!.invoke('Seen', id);
    } catch (error) {
      console.error('Failed to mark messages as seen:', error);
    }
  }

  async leaveConversation(id: number): Promise<void> {
    if (!this.isConnected || !id) return;

    try {
      await this.hub!.invoke('LeaveConversation', id);
    } catch (error) {
      console.error('Failed to leave conversation:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.hub) {
      await this.hub.stop();
      this.connectionState$.next(HubConnectionState.Disconnected);
    }
  }
}
