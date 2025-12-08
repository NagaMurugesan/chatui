import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-sso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-gray-900 min-h-screen text-white">
      <h2 class="text-2xl font-bold mb-6">Configure SSO (SAML)</h2>
      
      <!-- Tabs -->
      <div class="flex border-b border-gray-700 mb-6">
        <button (click)="activeTab = 'add'" 
          [class.border-blue-500]="activeTab === 'add'"
          [class.text-blue-400]="activeTab === 'add'"
          class="py-2 px-4 font-medium text-gray-400 border-b-2 border-transparent hover:text-blue-300 focus:outline-none">
          Add Configuration
        </button>
        <button (click)="activeTab = 'list'; loadConfigs()" 
          [class.border-blue-500]="activeTab === 'list'"
          [class.text-blue-400]="activeTab === 'list'"
          class="py-2 px-4 font-medium text-gray-400 border-b-2 border-transparent hover:text-blue-300 focus:outline-none">
          Configuration List
        </button>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg max-w-4xl">
        
        <!-- Add Configuration Tab -->
        <div *ngIf="activeTab === 'add'">
            <!-- Metadata Import -->
            <div class="mb-8 p-4 border border-gray-700 rounded bg-gray-800">
                <h3 class="text-lg font-semibold mb-4 text-blue-400">Import from Metadata</h3>
                <div class="flex gap-2">
                    <input [(ngModel)]="metadataUrl" class="flex-1 bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="https://idp.example.com/metadata.xml">
                    <button (click)="fetchMetadata()" [disabled]="!metadataUrl" class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                        Fetch
                    </button>
                </div>
                <p class="text-xs text-gray-500 mt-2">Enter your IdP's Metadata URL to automatically populate the fields below.</p>
            </div>

            <div class="mb-4">
            <label class="block text-gray-400 text-sm font-bold mb-2">Entry Point</label>
            <input [(ngModel)]="entryPoint" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="https://idp.example.com/sso">
            </div>
            <div class="mb-4">
            <label class="block text-gray-400 text-sm font-bold mb-2">Issuer</label>
            <input [(ngModel)]="issuer" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="gravity-chat">
            </div>
            <div class="mb-6">
            <label class="block text-gray-400 text-sm font-bold mb-2">Certificate</label>
            <textarea [(ngModel)]="cert" rows="5" class="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="-----BEGIN CERTIFICATE-----..."></textarea>
            </div>
            <div class="flex gap-4">
            <button (click)="saveConfig()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Save Configuration
            </button>
            <button (click)="cancel()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                Cancel
            </button>
            </div>
        </div>

        <!-- Configuration List Tab -->
        <div *ngIf="activeTab === 'list'">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm text-gray-400">
                    <thead class="bg-gray-700 text-gray-200 uppercase">
                        <tr>
                            <th class="px-4 py-3">Issuer</th>
                            <th class="px-4 py-3">Entry Point</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let config of configs" class="border-b border-gray-700 hover:bg-gray-750">
                            <td class="px-4 py-3 font-medium text-white">{{ config.issuer }}</td>
                            <td class="px-4 py-3 truncate max-w-xs">{{ config.entryPoint }}</td>
                            <td class="px-4 py-3">
                                <span [class.bg-green-900]="config.isActive" [class.text-green-300]="config.isActive"
                                      [class.bg-gray-700]="!config.isActive" [class.text-gray-300]="!config.isActive"
                                      class="px-2 py-1 rounded text-xs font-semibold">
                                    {{ config.isActive ? 'ACTIVE' : 'INACTIVE' }}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-right flex justify-end gap-2">
                                <button *ngIf="!config.isActive" (click)="activateConfig(config.id)" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded">
                                    Activate
                                </button>
                                <button (click)="deleteConfig(config.id)" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-700 transition-colors" title="Delete Configuration">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </td>
                        </tr>
                        <tr *ngIf="configs.length === 0">
                            <td colspan="4" class="px-4 py-8 text-center text-gray-500">No configurations found.</td>
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

        <p *ngIf="message" class="mt-4 text-green-400">{{ message }}</p>
        <p *ngIf="error" class="mt-4 text-red-400">{{ error }}</p>
      </div>
    </div>
  `
})
export class AdminSSOComponent implements OnInit {
  activeTab: 'add' | 'list' = 'add';
  configs: any[] = [];

  metadataUrl = '';
  entryPoint = '';
  issuer = '';
  cert = '';
  message = '';
  error = '';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    // If we wanted to load list on init, we could. But default is 'add'.
  }

  cancel() {
    this.router.navigate(['/chat']);
  }

  fetchMetadata() {
    this.message = '';
    this.error = '';
    const token = localStorage.getItem('auth_token');
    this.http.post('http://localhost:3000/admin/sso-metadata',
      { url: this.metadataUrl },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (res: any) => {
        this.entryPoint = res.entryPoint || '';
        this.issuer = res.issuer || '';
        this.cert = res.cert || '';
        this.message = 'Metadata fetched successfully';
      },
      error: (err) => this.error = err.error.error || 'Failed to fetch metadata'
    });
  }

  saveConfig() {
    this.message = '';
    this.error = '';
    const token = localStorage.getItem('auth_token');
    this.http.post('http://localhost:3000/admin/sso-config',
      { entryPoint: this.entryPoint, issuer: this.issuer, cert: this.cert },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.message = 'Configuration saved successfully';
        this.entryPoint = '';
        this.issuer = '';
        this.cert = '';
        this.metadataUrl = '';
        setTimeout(() => {
          this.message = '';
          this.activeTab = 'list';
          this.loadConfigs();
        }, 1500);
      },
      error: (err) => this.error = err.error.error || 'Failed to save configuration'
    });
  }

  loadConfigs() {
    const token = localStorage.getItem('auth_token');
    this.http.get('http://localhost:3000/admin/sso-config', { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: (res: any) => this.configs = res,
        error: (err) => console.error('Failed to load configs', err)
      });
  }

  deleteConfig(id: string) {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    const token = localStorage.getItem('auth_token');
    this.http.delete(`http://localhost:3000/admin/sso-config/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => {
          this.loadConfigs();
          this.message = 'Configuration deleted successfully';
          setTimeout(() => this.message = '', 3000);
        },
        error: (err) => {
          this.error = err.error.error || 'Failed to delete configuration';
          setTimeout(() => this.error = '', 3000);
        }
      });
  }

  activateConfig(id: string) {
    const token = localStorage.getItem('auth_token');
    this.http.post(`http://localhost:3000/admin/sso-config/${id}/activate`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => {
          this.loadConfigs();
          this.message = 'Configuration activated successfully';
          setTimeout(() => this.message = '', 3000);
        },
        error: (err) => {
          this.error = err.error.error || 'Failed to activate configuration';
          setTimeout(() => this.error = '', 3000);
        }
      });
  }
}
