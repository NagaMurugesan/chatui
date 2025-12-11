import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Chat {
  chatId: string;
  userId: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface Message {
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:3000/chats';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  createChat(): Observable<Chat> {
    return this.http.post<Chat>(this.apiUrl, {}, { headers: this.getHeaders() });
  }

  getMessages(chatId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/${chatId}`, { headers: this.getHeaders() });
  }

  sendMessage(chatId: string, content: string, model?: string): Observable<{ userMessage: Message, assistantMessage: Message }> {
    const payload: any = { content };
    if (model) {
      payload.model = model;
    }
    return this.http.post<{ userMessage: Message, assistantMessage: Message }>(
      `${this.apiUrl}/${chatId}/message`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  updateChatTitle(chatId: string, title: string): Observable<Chat> {
    return this.http.put<Chat>(
      `${this.apiUrl}/${chatId}`,
      { title },
      { headers: this.getHeaders() }
    );
  }
}
