import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { SettingsModalComponent } from '../settings-modal/settings-modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, SettingsModalComponent, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() chats: Chat[] = [];
  @Input() selectedChatId: string | null = null;
  @Output() chatSelected = new EventEmitter<string>();
  @Output() newChat = new EventEmitter<void>();
  @Output() deleteChat = new EventEmitter<string>();
  @Output() renameChat = new EventEmitter<{ chatId: string, newTitle: string }>();

  userName: string | null = null;
  isAdmin = false;
  isMenuOpen = false;
  isSettingsOpen = false;
  openChatMenuId: string | null = null;
  renamingChatId: string | null = null;
  renameTitle: string = '';

  constructor(private authService: AuthService, private router: Router) {
    this.userName = this.authService.getUserName();
    this.isAdmin = localStorage.getItem('user_role') === 'admin';
  }

  navigateToAdmin(page: string) {
    this.router.navigate(['/admin', page]);
  }

  selectChat(chatId: string) {
    this.chatSelected.emit(chatId);
  }

  createNewChat() {
    this.newChat.emit();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleChatMenu(event: Event, chatId: string) {
    event.stopPropagation();
    this.openChatMenuId = this.openChatMenuId === chatId ? null : chatId;
  }

  startRename(event: Event, chat: Chat) {
    event.stopPropagation();
    this.renamingChatId = chat.chatId;
    this.renameTitle = chat.title || 'New Chat';
    this.openChatMenuId = null;
  }

  saveRename(chatId: string) {
    if (this.renameTitle.trim()) {
      this.renameChat.emit({ chatId, newTitle: this.renameTitle.trim() });
    }
    this.renamingChatId = null;
  }

  cancelRename() {
    this.renamingChatId = null;
    this.renameTitle = '';
  }

  confirmDelete(event: Event, chatId: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      this.deleteChat.emit(chatId);
    }
    this.openChatMenuId = null;
  }

  openSettings() {
    this.isSettingsOpen = true;
    this.isMenuOpen = false;
  }

  closeSettings() {
    this.isSettingsOpen = false;
    // Refresh username in case it changed
    this.userName = this.authService.getUserName();
  }

  logout() {
    this.authService.logout();
  }
}
