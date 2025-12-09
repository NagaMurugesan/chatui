import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';
  private tokenKey = 'auth_token';
  private userIdKey = 'user_id';
  private userNameKey = 'user_name';

  public isAuthenticated$ = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient, private router: Router) { }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  register(email: string, password: string, firstName: string, lastName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { email, password, firstName, lastName });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<{ token: string, userId: string, name: string, role: string }>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.userIdKey, response.userId);
          localStorage.setItem(this.userNameKey, response.name);
          if (response.role) localStorage.setItem('user_role', response.role);
          this.isAuthenticated$.next(true);
        })
      );
  }

  ssoLogin(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sso/login`, { email });
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userIdKey);
    localStorage.removeItem(this.userNameKey);
    this.isAuthenticated$.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.userIdKey);
  }

  getUserName(): string | null {
    return localStorage.getItem(this.userNameKey);
  }

  getUserEmail(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      // Simple decode without verification (verification happens on backend)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload).email;
    } catch (e) {
      return null;
    }
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  updateProfile(firstName: string, lastName: string): Observable<any> {
    const token = this.getToken();
    return this.http.put(`${this.apiUrl}/profile`,
      { firstName, lastName },
      { headers: { Authorization: `Bearer ${token}` } }
    ).pipe(
      tap((response: any) => {
        if (response.name) {
          localStorage.setItem(this.userNameKey, response.name);
        }
      })
    );
  }

  changePassword(newPassword: string): Observable<any> {
    const token = this.getToken();
    return this.http.put(`${this.apiUrl}/change-password`,
      { newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
}
