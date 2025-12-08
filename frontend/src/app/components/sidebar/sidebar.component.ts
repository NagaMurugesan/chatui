import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { SettingsModalComponent } from '../settings-modal/settings-modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, SettingsModalComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() chats: Chat[] = [];
  @Input() selectedChatId: string | null = null;
  @Output() chatSelected = new EventEmitter<string>();
  @Output() newChat = new EventEmitter<void>();

  userName: string | null = null;
  isAdmin = false;
  isMenuOpen = false;
  isSettingsOpen = false;

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
