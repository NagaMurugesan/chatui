import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-gray-900 min-h-screen text-white">
      <h2 class="text-2xl font-bold mb-6">Manage Users</h2>
      
      <!-- Tabs -->
      <div class="flex border-b border-gray-700 mb-6">
        <button (click)="activeTab = 'list'; loadUsers()" 
          [class.border-blue-500]="activeTab === 'list'"
          [class.text-blue-400]="activeTab === 'list'"
          class="py-2 px-4 font-medium text-gray-400 border-b-2 border-transparent hover:text-blue-300 focus:outline-none">
          User List
        </button>
        <button (click)="activeTab = 'add'" 
          [class.border-blue-500]="activeTab === 'add'"
          [class.text-blue-400]="activeTab === 'add'"
          class="py-2 px-4 font-medium text-gray-400 border-b-2 border-transparent hover:text-blue-300 focus:outline-none">
          Add User
        </button>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg max-w-4xl">
        
        <!-- User List Tab -->
        <div *ngIf="activeTab === 'list'">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm text-gray-400">
                    <thead class="bg-gray-700 text-gray-200 uppercase">
                        <tr>
                            <th class="px-4 py-3">Name</th>
                            <th class="px-4 py-3">Email</th>
                            <th class="px-4 py-3">Role</th>
                            <th class="px-4 py-3">Auth Type</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let user of users" class="border-b border-gray-700 hover:bg-gray-750">
                            <td class="px-4 py-3 font-medium text-white">{{ user.firstName }} {{ user.lastName }}</td>
                            <td class="px-4 py-3">{{ user.email }}</td>
                            <td class="px-4 py-3">
                                <span [class.bg-purple-900]="user.role === 'admin'" [class.text-purple-300]="user.role === 'admin'"
                                      [class.bg-gray-700]="user.role !== 'admin'" [class.text-gray-300]="user.role !== 'admin'"
                                      class="px-2 py-1 rounded text-xs font-semibold">
                                    {{ user.role | uppercase }}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span [class.bg-blue-900]="user.authType === 'sso'" [class.text-blue-300]="user.authType === 'sso'"
                                      [class.bg-green-900]="user.authType === 'local'" [class.text-green-300]="user.authType === 'local'"
                                      class="px-2 py-1 rounded text-xs font-semibold">
                                    {{ user.authType | uppercase }}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <button (click)="deleteUser(user.email)" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-700 transition-colors" title="Delete User">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </td>
                        </tr>
                        <tr *ngIf="users.length === 0">
                            <td colspan="5" class="px-4 py-8 text-center text-gray-500">No users found.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="mt-4 flex justify-end">
                 <button (click)="cancel()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                    Back to Chat
                  </button>
            </div>
        </div>

        <!-- Add User Tab -->
        <div *ngIf="activeTab === 'add'">
            <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-gray-400 text-sm font-bold mb-2">First Name</label>
                <input [(ngModel)]="firstName" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
            </div>
            <div>
                <label class="block text-gray-400 text-sm font-bold mb-2">Last Name</label>
                <input [(ngModel)]="lastName" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
            </div>
            </div>
            <div class="mb-4">
            <label class="block text-gray-400 text-sm font-bold mb-2">Email</label>
            <input [(ngModel)]="email" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
            </div>
            <div class="mb-4">
            <label class="block text-gray-400 text-sm font-bold mb-2">Role</label>
            <select [(ngModel)]="role" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
            </div>
            <div class="mb-4">
            <label class="block text-gray-400 text-sm font-bold mb-2">Auth Type</label>
            <select [(ngModel)]="authType" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="local">Local</option>
                <option value="sso">SSO</option>
            </select>
            </div>
            <div class="mb-6" *ngIf="authType === 'local'">
            <label class="block text-gray-400 text-sm font-bold mb-2">Password</label>
            <input [(ngModel)]="password" type="password" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
            </div>
            <div class="flex gap-4">
            <button (click)="createUser()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Create User
            </button>
            <button (click)="cancel()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                Cancel
            </button>
            </div>
        </div>

        <p *ngIf="message" class="mt-4 text-green-400">{{ message }}</p>
        <p *ngIf="error" class="mt-4 text-red-400">{{ error }}</p>
      </div>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  activeTab: 'list' | 'add' = 'list';
  users: any[] = [];

  firstName = '';
  lastName = '';
  email = '';
  role = 'user';
  authType = 'local';
  password = '';
  message = '';
  error = '';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.loadUsers();
  }

  cancel() {
    this.router.navigate(['/chat']);
  }

  loadUsers() {
    const token = localStorage.getItem('auth_token');
    this.http.get('http://localhost:3000/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: (res: any) => this.users = res,
        error: (err) => console.error('Failed to load users', err)
      });
  }

  deleteUser(email: string) {
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return;

    const token = localStorage.getItem('auth_token');
    this.http.delete(`http://localhost:3000/admin/users/${email}`, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => {
          this.loadUsers();
          this.message = 'User deleted successfully';
          setTimeout(() => this.message = '', 3000);
        },
        error: (err) => {
          this.error = err.error.error || 'Failed to delete user';
          setTimeout(() => this.error = '', 3000);
        }
      });
  }

  createUser() {
    this.message = '';
    this.error = '';
    const token = localStorage.getItem('auth_token');
    this.http.post('http://localhost:3000/admin/users',
      {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        role: this.role,
        authType: this.authType,
        password: this.password
      },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.message = 'User created successfully';
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.password = '';
        setTimeout(() => {
          this.message = '';
          this.activeTab = 'list';
          this.loadUsers();
        }, 1500);
      },
      error: (err) => this.error = err.error.error || 'Failed to create user'
    });
  }
}
