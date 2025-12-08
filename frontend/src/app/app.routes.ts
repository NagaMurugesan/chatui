import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

import { AdminSSOComponent } from './components/admin/admin-sso.component';
import { AdminUsersComponent } from './components/admin/admin-users.component';
import { AdminSecretsComponent } from './components/admin/admin-secrets.component';

const authGuard = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.getToken()) {
        return true;
    }
    return router.parseUrl('/login');
};

const adminGuard = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const role = localStorage.getItem('user_role');

    if (authService.getToken() && role === 'admin') {
        return true;
    }
    return router.parseUrl('/chat');
};

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
            { path: 'sso', component: AdminSSOComponent },
            { path: 'users', component: AdminUsersComponent },
            { path: 'secrets', component: AdminSecretsComponent }
        ]
    },
    { path: 'chat', component: ChatWindowComponent, canActivate: [authGuard] },
    { path: '', redirectTo: 'chat', pathMatch: 'full' },
    { path: '**', redirectTo: 'chat' }
];
