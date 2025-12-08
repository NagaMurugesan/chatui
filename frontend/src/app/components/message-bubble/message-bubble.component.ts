import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../services/chat.service';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.css']
})
export class MessageBubbleComponent {
  @Input() message!: Message;
}
