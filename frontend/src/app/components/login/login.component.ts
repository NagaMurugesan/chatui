import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  isLogin = true;
  isForgotPassword = false;
  authType: 'local' | 'sso' = 'sso';
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Check for SSO callback params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        const userId = params['userId'];
        const name = params['name'];
        const role = params['role'];

        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_name', name);
        localStorage.setItem('user_role', role);

        this.router.navigate(['/chat']);
      }
    });
  }

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
    if (!this.email) {
      this.errorMessage = 'Please enter your email';
      return;
    }
    this.authService.ssoLogin(this.email).subscribe({
      next: (res: any) => {
        if (res.ssoUrl) {
          window.location.href = res.ssoUrl;
        }
      },
      error: (err) => this.errorMessage = err.error.error || 'SSO Login failed'
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
