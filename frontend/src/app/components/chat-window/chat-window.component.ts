import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Chat, Message } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MessageBubbleComponent],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.css']
})
export class ChatWindowComponent implements OnInit, AfterViewChecked {
  chats: Chat[] = [];
  messages: Message[] = [];
  selectedChatId: string | null = null;
  selectedChat: Chat | null = null;
  newMessage = '';
  isLoading = false;
  userName: string | null = null;
  selectedModel = 'mistral-nemo';
  availableModels = [
    { value: 'mistral-nemo', label: 'Mistral NeMo' },
    { value: 'gemma2:9b', label: 'Gemma 2 9B' },
    { value: 'llama3.2', label: 'Llama 3.2' },
    { value: 'llama3', label: 'Llama 3' }
  ];

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(private chatService: ChatService, private authService: AuthService) { }

  ngOnInit() {
    this.userName = this.authService.getUserName();
    this.loadChats();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  loadChats() {
    this.chatService.getChats().subscribe(chats => {
      this.chats = chats;
      if (this.chats.length > 0 && !this.selectedChatId) {
        this.selectChat(this.chats[0].chatId);
      } else if (this.chats.length === 0) {
        this.createNewChat();
      } else if (this.selectedChatId) {
        // Refresh selected chat object if it exists in the list
        const current = this.chats.find(c => c.chatId === this.selectedChatId);
        if (current) this.selectedChat = current;
      }
    });
  }

  selectChat(chatId: string) {
    this.selectedChatId = chatId;
    this.selectedChat = this.chats.find(c => c.chatId === chatId) || null;
    this.chatService.getMessages(chatId).subscribe(messages => {
      this.messages = messages;
    });
  }

  updateTitle(newTitle: string) {
    console.log('Updating title to:', newTitle);
    if (!this.selectedChatId || !newTitle.trim()) return;

    this.chatService.updateChatTitle(this.selectedChatId, newTitle).subscribe({
      next: (updatedChat) => {
        console.log('Title updated successfully:', updatedChat);
        // Update local state
        if (this.selectedChat) {
          this.selectedChat.title = updatedChat.title;
        }
        // Update list
        const index = this.chats.findIndex(c => c.chatId === updatedChat.chatId);
        if (index !== -1) {
          this.chats[index] = updatedChat;
        }
      },
      error: (err) => console.error('Failed to update title:', err)
    });
  }

  createNewChat() {
    this.chatService.createChat().subscribe(chat => {
      this.chats.unshift(chat);
      this.selectChat(chat.chatId);
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChatId) return;

    const content = this.newMessage;
    this.newMessage = '';
    this.isLoading = true;

    // Optimistic update (optional, but good for UX)
    const tempUserMessage: Message = {
      chatId: this.selectedChatId,
      role: 'user',
      content: content,
      timestamp: new Date().toISOString()
    };
    this.messages.push(tempUserMessage);

    this.chatService.sendMessage(this.selectedChatId, content, this.selectedModel).subscribe({
      next: (response) => {
        // Replace temp message or just append assistant message
        // Here we just append assistant message since we pushed user message
        this.messages.push(response.assistantMessage);
        this.isLoading = false;
        this.loadChats(); // Refresh chat list to update titles/order
      },
      error: (err) => {
        console.error('Failed to send message', err);
        this.isLoading = false;
        // Handle error (remove temp message, show alert, etc.)
      }
    });
  }

  onEnter(event: Event) {
    (event.target as HTMLInputElement).blur();
  }

  deleteChat(chatId: string) {
    // TODO: Add backend API call to delete chat
    // For now, just remove from local list
    this.chats = this.chats.filter(c => c.chatId !== chatId);

    // If deleted chat was selected, select another or create new
    if (this.selectedChatId === chatId) {
      if (this.chats.length > 0) {
        this.selectChat(this.chats[0].chatId);
      } else {
        this.createNewChat();
      }
    }
  }

  renameChat(event: { chatId: string, newTitle: string }) {
    this.chatService.updateChatTitle(event.chatId, event.newTitle).subscribe({
      next: (updatedChat) => {
        // Update local state
        const index = this.chats.findIndex(c => c.chatId === event.chatId);
        if (index !== -1) {
          this.chats[index] = updatedChat;
        }
        if (this.selectedChat && this.selectedChat.chatId === event.chatId) {
          this.selectedChat.title = updatedChat.title;
        }
      },
      error: (err) => console.error('Failed to rename chat:', err)
    });
  }

  logout() {
    this.authService.logout();
  }
}
