import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../services/chat.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ContentPart {
  type: 'text' | 'code';
  content: string;
  id?: string;
}

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.css']
})
export class MessageBubbleComponent implements OnInit {
  @Input() message!: Message;
  contentParts: ContentPart[] = [];
  copiedCodeId: string | null = null;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.parseContent();
  }

  parseContent() {
    const content = this.message.content;
    const parts: ContentPart[] = [];
    let lastIndex = 0;
    let codeBlockIndex = 0;

    // Find all code blocks
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.substring(lastIndex, match.index);
        parts.push({
          type: 'text',
          content: this.formatText(textContent)
        });
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[1].trim(),
        id: `code-${this.message.timestamp}-${codeBlockIndex++}`
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: this.formatText(content.substring(lastIndex))
      });
    }

    // If no code blocks found, treat entire content as text
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: this.formatText(content)
      });
    }

    this.contentParts = parts;
  }

  formatText(text: string): string {
    let formatted = text;

    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    formatted = formatted.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Inline code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-red-600 px-1 py-0.5 rounded text-sm">$1</code>');

    // Headings
    formatted = formatted.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

    // Lists
    formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4">$1</li>');

    // Paragraphs
    formatted = formatted.replace(/\n\n/g, '</p><p class="mb-3">');
    if (formatted.trim()) {
      formatted = '<p class="mb-3">' + formatted + '</p>';
    }

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  copyCode(codeId: string): void {
    const part = this.contentParts.find(p => p.id === codeId);
    if (part && part.type === 'code') {
      navigator.clipboard.writeText(part.content).then(() => {
        this.copiedCodeId = codeId;
        setTimeout(() => {
          this.copiedCodeId = null;
        }, 2000);
      });
    }
  }
}
