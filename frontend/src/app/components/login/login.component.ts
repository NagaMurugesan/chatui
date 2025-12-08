import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  isLogin = true;
  isForgotPassword = false;
  authType: 'local' | 'sso' = 'local';
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) { }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.isForgotPassword = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  toggleForgotPassword() {
    this.isForgotPassword = !this.isForgotPassword;
    this.isLogin = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onLogin() {
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Login failed';
      }
    });
  }

  onSSOLogin() {
    this.errorMessage = '';
    this.authService.ssoLogin().subscribe({
      next: (res: any) => {
        if (res.ssoUrl) {
          window.location.href = res.ssoUrl;
        }
      },
      error: (err) => this.errorMessage = 'SSO Login failed'
    });
  }

  onRegister() {
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.register(this.email, this.password, this.firstName, this.lastName).subscribe({
      next: () => {
        this.successMessage = 'Registration successful! Please login.';
        this.isLogin = true;
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Registration failed';
      }
    });
  }

  onForgotPassword() {
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => this.successMessage = res.message,
      error: (err) => this.errorMessage = err.error.error || 'Request failed'
    });
  }
}
