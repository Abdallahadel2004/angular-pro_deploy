import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { CompareService } from '../../services/compare.service';
import { environment } from '../../environments/environment';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-compare-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './compare-page.html',
  styleUrls: ['./compare-page.scss'],
})
export class ComparePage implements OnInit, OnDestroy {
  @ViewChild('chatMessages') chatMessages!: ElementRef;

  products: any[] = [];
  specRows: any[] = [];
  summary: string = '';
  isLoading = true;
  activeTab: 'table' | 'chat' = 'table';

  messages: ChatMessage[] = [];
  inputText = '';
  isTyping = false;

  suggestions = [
    'Which one is better value for money?',
    'Which has the best rating?',
    'Which one should I buy for daily use?',
    'What are the key differences?',
    'Which one is in stock?',
  ];

  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}/api/compare`;

  constructor(
    public compareService: CompareService,
    public router: Router, // ← public so template can call it
    private http: HttpClient,
  ) {}

  ngOnInit() {
    const products = this.compareService.products();
    if (products.length < 2) {
      this.router.navigate(['/']);
      return;
    }

    const ids = products.map((p) => p._id).join(',');
    this.http
      .get<any>(`${this.apiUrl}?ids=${ids}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products = res.products;
          this.specRows = res.specRows;
          this.summary = res.summary;
          this.isLoading = false;
          this.messages.push({
            role: 'assistant',
            text: `I've analyzed ${this.products.length} products for you. Ask me anything to help you decide — like "which is better value?" or "which should I buy for daily use?"`,
          });
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Template helper — parseFloat not available in templates ──────────────
  toFloat(value: string): number {
    return parseFloat(value) || 0;
  }

  clearAndGoHome(): void {
    this.compareService.clear();
    this.router.navigate(['/']);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  sendMessage(text?: string): void {
    const q = (text || this.inputText).trim();
    if (!q || this.isTyping) return;

    this.messages.push({ role: 'user', text: q });
    this.inputText = '';
    this.isTyping = true;
    this.scrollChat();

    const history = this.messages.slice(1, -1).map((m) => ({ role: m.role, text: m.text }));

    this.http
      .post<any>(`${this.apiUrl}/ask`, {
        productIds: this.products.map((p) => p._id),
        question: q,
        history,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.messages.push({ role: 'assistant', text: res.reply });
          this.isTyping = false;
          this.scrollChat();
        },
        error: () => {
          this.messages.push({
            role: 'assistant',
            text: 'Sorry, I had trouble answering that. Please try again.',
          });
          this.isTyping = false;
          this.scrollChat();
        },
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollChat(): void {
    setTimeout(() => {
      if (this.chatMessages) {
        this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
      }
    }, 50);
  }

  getStars(rating: number): string {
    const r = Math.round(rating);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  removeProduct(id: string): void {
    this.compareService.remove(id);
    if (this.compareService.count() < 2) {
      this.router.navigate(['/']);
    } else {
      this.ngOnInit();
    }
  }
}
