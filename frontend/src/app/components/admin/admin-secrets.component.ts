import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-secrets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-gray-900 min-h-screen text-white">
      <h2 class="text-2xl font-bold mb-6">Manage Secrets</h2>
      <div class="bg-gray-800 p-6 rounded-lg max-w-2xl">
        <div class="mb-4">
          <label class="block text-gray-400 text-sm font-bold mb-2">Secret Name</label>
          <input [(ngModel)]="name" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="e.g., API_KEY">
        </div>
        <div class="mb-6">
          <label class="block text-gray-400 text-sm font-bold mb-2">Value</label>
          <input [(ngModel)]="value" type="password" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500">
        </div>
        <div class="flex gap-4">
          <button (click)="saveSecret()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Save Secret
          </button>
          <button (click)="cancel()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
            Cancel
          </button>
        </div>
        <p *ngIf="message" class="mt-4 text-green-400">{{ message }}</p>
        <p *ngIf="error" class="mt-4 text-red-400">{{ error }}</p>
      </div>
    </div>
  `
})
export class AdminSecretsComponent {
  name = '';
  value = '';
  message = '';
  error = '';

  constructor(private http: HttpClient, private router: Router) { }

  cancel() {
    this.router.navigate(['/chat']);
  }

  saveSecret() {
    this.message = '';
    this.error = '';
    const token = localStorage.getItem('auth_token');
    this.http.post('http://localhost:3000/admin/secrets',
      { name: this.name, value: this.value },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.message = 'Secret saved successfully';
        this.name = '';
        this.value = '';
      },
      error: (err) => this.error = err.error.error || 'Failed to save secret'
    });
  }
}
