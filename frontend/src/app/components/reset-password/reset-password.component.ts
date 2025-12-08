import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  error = '';
  message = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'];
    if (!this.token) {
      this.error = 'Invalid reset link.';
    }
  }

  onSubmit() {
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: (res: any) => {
        this.message = res.message;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err: any) => this.error = err.error.error || 'Reset failed'
    });
  }
}
