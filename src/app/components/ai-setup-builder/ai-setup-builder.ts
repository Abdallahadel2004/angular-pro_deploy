import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CompareBar } from '../compare-bar/compare-bar';
import { ProductCardComponent } from '../product-card/product-card';
import { Product } from '../../models/product.model';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    bootstrap: any;
  }
}

interface SetupProduct {
  componentId: string;
  componentLabel: string;
  icon: string;
  _id: string;
  name: string;
  price: number;
  image: string | null;
  shortDescription: string;
  rating: number;
  ratingCount: number;
  inStock: boolean;
}
interface SetupTemplate {
  key: string;
  label: string;
  components: { id: string; icon: string }[];
}

@Component({
  selector: 'app-ai-setup-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CompareBar, ProductCardComponent],
  templateUrl: './ai-setup-builder.html',
  styleUrls: ['./ai-setup-builder.scss'],
})
export class AiSetupBuilderComponent implements OnInit, OnDestroy {
  mode: 'preset' | 'custom' = 'preset';

  selectedSetup = '';
  customPrompt = '';
  budget: number | null = null;

  isLoading = false;
  hasResult = false;
  addingToCart = false;
  cartSuccess = false;
  errorMsg = '';
  showAuthToast = false;

  // Quick view
  selectedProductForQuickView: Product | null = null;

  private seenProductIds: string[] = [];

  templates: SetupTemplate[] = [];
  products: Product[] = [];
  totalPrice = 0;
  explanation = '';
  setupLabel = '';
  generatedIn = '';
  skeletonSlots = [1, 2, 3, 4];

  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}/api/ai/setup-builder`;

  readonly gradients: Record<string, string> = {
    gaming_setup: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
    home_office_setup: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    streaming_setup: 'linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%)',
    photography_setup: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    content_creator_setup: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    custom: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
  };

  readonly setupIcons: Record<string, string> = {
    gaming_setup: '🎮',
    home_office_setup: '🏠',
    streaming_setup: '📡',
    photography_setup: '📸',
    content_creator_setup: '🎬',
    custom: '✨',
  };

  readonly examplePrompts = [
    'A budget photography setup under $800',
    'Podcast recording kit for beginners',
    'Music production studio setup',
    'Competitive esports setup',
    'Work from home productivity setup',
    'YouTube creator starter kit',
  ];

  readonly wowDelays = ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s'];

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    this.http
      .get<any>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.templates = res.templates;
        },
        error: () => {
          this.templates = this.fallbackTemplates();
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canGenerate(): boolean {
    if (this.isLoading) return false;
    return this.mode === 'preset' ? !!this.selectedSetup : this.customPrompt.trim().length >= 5;
  }

  generateSetup() {
    if (!this.canGenerate) return;
    if (!this.hasResult) this.seenProductIds = [];

    this.isLoading = true;
    this.hasResult = false;
    this.errorMsg = '';
    this.cartSuccess = false;

    const body: any = {
      budget: this.budget || undefined,
      excludeProductIds: this.seenProductIds.length ? this.seenProductIds : undefined,
    };
    if (this.mode === 'preset') {
      body.setupType = this.selectedSetup;
    } else {
      body.customPrompt = this.customPrompt.trim();
    }

    this.http
      .post<any>(this.apiUrl, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products = (res.products || []).map((p: SetupProduct) => this.mapToProduct(p));
          this.totalPrice = res.totalPrice;
          this.explanation = res.explanation;
          this.setupLabel = res.label;
          this.generatedIn = res.generatedIn;
          this.isLoading = false;
          this.hasResult = true;
          this.skeletonSlots = Array.from({ length: res.products.length }, (_, i) => i);
          const newIds = (res.products || []).map((p: SetupProduct) => p._id).filter(Boolean);
          this.seenProductIds = [...new Set([...this.seenProductIds, ...newIds])];
        },
        error: (err) => {
          this.errorMsg = err.error?.message || 'Failed to generate setup. Please try again.';
          this.isLoading = false;
        },
      });
  }

  useExample(prompt: string) {
    this.customPrompt = prompt;
  }

  onSetupTypeChange() {
    this.seenProductIds = [];
    this.hasResult = false;
  }

  // ── Quick View ─────────────────────────────────────────────────────────────

  get selectedProductDescription(): string {
    return (this.selectedProductForQuickView as any)?.shortDescription || '';
  }

  // ── Cart ───────────────────────────────────────────────────────────────────
  private get isLoggedIn(): boolean {
    return !!this.authService.currentUser();
  }

  private triggerAuthToast() {
    this.showAuthToast = true;
    setTimeout(() => (this.showAuthToast = false), 4000);
  }

  addAllToCart() {
    if (this.addingToCart) return;
    this.addingToCart = true;
    Promise.all(
      this.products.map((p) => {
        const id = (p as any)._id || p.id;
        const rawPrice = (p as any).price ?? p.newPrice;
        const price = typeof rawPrice === 'string'
          ? parseFloat(rawPrice.replace(/[^0-9.]/g, ''))
          : rawPrice || 0;
        
        const meta = {
          name: p.name,
          price: price,
          image: p.image || (p as any).images?.[0]?.url || 'assets/img/product-1.png',
        };

        return this.cartService
          .addToCart(String(id), 1, meta)
          .toPromise()
          .catch(() => null);
      }),
    ).then(() => {
      this.addingToCart = false;
      this.cartSuccess = true;
      setTimeout(() => (this.cartSuccess = false), 3000);
    });
  }

  getDelay(index: number): string {
    return this.wowDelays[index % this.wowDelays.length];
  }

  getBudgetPercent(): number {
    if (!this.budget) return 0;
    return Math.min((this.totalPrice / this.budget) * 100, 100);
  }

  get headerGradient(): string {
    const key = this.mode === 'custom' ? 'custom' : this.selectedSetup || 'gaming_setup';
    return this.gradients[key] || this.gradients['gaming_setup'];
  }

  get savingsVsBudget(): number | null {
    if (!this.budget || this.totalPrice >= this.budget) return null;
    return parseFloat((this.budget - this.totalPrice).toFixed(2));
  }

  mapToProduct(p: SetupProduct): Product {
    const price = p.price || 0;
    return {
      id: p._id,
      image: p.image || 'assets/img/product-1.png',
      category: (p as any).category || p.componentLabel,
      name: p.name,
      oldPrice: '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      newPrice: '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      rating: p.rating ? Math.round(p.rating) : 4,
      badge: null,
      tab: ['all'],
      _id: p._id,
      price: p.price,
      shortDescription: p.shortDescription,
      ratingCount: p.ratingCount,
      ratings: { average: p.rating, count: p.ratingCount },
      inventory: { quantity: p.inStock ? 1 : 0 },
    } as any;
  }

  goToSignIn() {
    this.showAuthToast = false;
    this.router.navigate(['/signin']);
  }

  private fallbackTemplates(): SetupTemplate[] {
    return [
      { key: 'gaming_setup', label: 'Gaming Setup', components: [] },
      { key: 'home_office_setup', label: 'Home Office Setup', components: [] },
      { key: 'streaming_setup', label: 'Streaming Setup', components: [] },
      { key: 'photography_setup', label: 'Photography Starter Kit', components: [] },
      { key: 'content_creator_setup', label: 'Content Creator Setup', components: [] },
    ];
  }
  onAddToCart(product: Product): void {
    console.log('Added to cart:', product.name);
  }
  loadTab(tabId: string): void {
    this.activeTab = tabId;
  }
  onAddToWishlist(product: Product): void {
    console.log('❤️ Wishlist:', product.name);
  }

  onQuickView(product: Product): void {
    console.log('👁️ Quick view:', product.name);
  }
  tabs: { id: string; label: string }[] = [];
  activeTab = '';
}
