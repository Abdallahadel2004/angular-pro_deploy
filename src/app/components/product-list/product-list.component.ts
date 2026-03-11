import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card';
import { CompareBar } from '../compare-bar/compare-bar';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { CompareService } from '../../services/compare.service';
import { Observable } from 'rxjs';

type TabId = 'all' | 'new' | 'featured' | 'top';
interface Tab {
  id: TabId;
  label: string;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, CompareBar],
  templateUrl: './product-list.component.html',
})
export class ProductListComponent implements OnInit {
  activeTab: TabId = 'all';

  tabs: Tab[] = [
    { id: 'all', label: 'All Products' },
    { id: 'new', label: 'New Arrivals' },
    { id: 'featured', label: 'Featured' },
    { id: 'top', label: 'Top Selling' },
  ];

  products: Product[] = [];
  wowDelays = ['0.1s', '0.3s', '0.5s', '0.7s'];

  // Pagination state
  page = 1;
  limit = 8;
  hasMore = true;
  isLoading = false;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    public compareService: CompareService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.loadTab('all');
  }

  loadTab(tab: TabId): void {
    this.activeTab = tab;
    this.page = 1;
    this.hasMore = true;
    this.isLoading = true;

    this.productService.getPaginatedByTab(tab, this.page, this.limit).subscribe({
      next: (res) => {
        this.products = res.products;
        this.hasMore = this.products.length >= this.limit && res.page < res.pages;
        this.isLoading = false;

        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            const WOW = (window as any).WOW;
            if (WOW) new WOW({ live: true }).init();
          }, 100);
        }
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.isLoading = false;
      },
    });
  }

  loadMore(): void {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    this.page++;

    this.productService.getPaginatedByTab(this.activeTab, this.page, this.limit).subscribe({
      next: (res) => {
        this.products = [...this.products, ...res.products];
        // If the returned products are less than the limit, or we hit max pages, we have no more to load
        this.hasMore = res.products.length >= this.limit && res.page < res.pages;
        this.isLoading = false;

        // Re-initialize WOW on new elements
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            const WOW = (window as any).WOW;
            if (WOW) new WOW({ live: true }).init();
          }, 100);
        }
      },
      error: (err) => {
         console.error('Failed to load more products', err);
         this.isLoading = false;
      }
    });
  }

  getDelay(index: number): string {
    return this.wowDelays[index % this.wowDelays.length];
  }

  onAddToCart(product: Product): void {
    // Cart addition is already handled inside ProductCardComponent.onAddToCart()
    // This handler only receives the event notification — no need to add again.
    console.log('Added to cart via product card:', product.name);
  }

  onAddToWishlist(product: Product): void {
    console.log('❤️ Wishlist:', product.name);
  }

  onQuickView(product: Product): void {
    console.log('👁️ Quick view:', product.name);
  }

  // Kept as a no-op so existing HTML (compare)="onCompare($event)" doesn't error.
  // The real compare logic runs inside ProductCardComponent via CompareService.
  onCompare(_product: Product): void {}
}
