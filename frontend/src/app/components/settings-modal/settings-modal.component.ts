import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.css']
})
export class SettingsModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  firstName = '';
  lastName = '';
  email = '';
  newPassword = '';
  confirmPassword = '';

  message = '';
  error = '';

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.email = this.authService.getUserEmail() || '';
    const fullName = this.authService.getUserName() || '';
    const parts = fullName.split(' ');
    if (parts.length > 0) this.firstName = parts[0];
    if (parts.length > 1) this.lastName = parts.slice(1).join(' ');
  }

  onClose() {
    this.close.emit();
  }

  updateProfile() {
    this.message = '';
    this.error = '';

    this.authService.updateProfile(this.firstName, this.lastName).subscribe({
      next: (res) => {
        this.message = res.message;
        // Optional: emit event to refresh parent if needed, but AuthService updates localStorage
      },
      error: (err) => this.error = err.error.error || 'Failed to update profile'
    });
  }

  updatePassword() {
    this.message = '';
    this.error = '';

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.authService.changePassword(this.newPassword).subscribe({
      next: (res) => {
        this.message = res.message;
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => this.error = err.error.error || 'Failed to update password'
    });
  }
}
