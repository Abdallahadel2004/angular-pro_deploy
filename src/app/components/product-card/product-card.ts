// import { Component, Input } from '@angular/core';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-product-card',
//   imports: [CommonModule],
//   templateUrl: './product-card.html',
//   styleUrl: './product-card.scss',
// })
// export class ProductCard {
//   @Input() product: any;
//   @Input() imageUrl: string = '';
//   @Input() name: string = '';
//   @Input() price: number = 0;
//   @Input() category: string = '';
//   @Input() rating: number = 0;

//   addToCart() {
//     console.log('Added to cart:', this.name);
//   }

//   viewDetails() {
//     console.log('View details for:', this.name);
//   }
// }

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { RouterLink } from '@angular/router';
import { CompareService } from '../../services/compare.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.scss'],
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() wowDelay: string = '0.1s';
  @Output() addToCart = new EventEmitter<Product>();
  @Output() addToWishlist = new EventEmitter<Product>();
  @Output() quickView = new EventEmitter<Product>();

  compareMessage = '';
  private messageTimer: any;

  constructor(public compareService: CompareService) {}

  get stars(): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < this.product.rating);
  }

  private get p(): any {
    return this.product as any;
  }

  get productId(): string {
    return String(this.p._id || this.p.id || '');
  }

  get isInCompare(): boolean {
    return this.compareService.isAdded(this.productId);
  }

  get compareDisabled(): boolean {
    return this.compareService.isFull() && !this.isInCompare;
  }

  onCompare(): void {
    if (this.compareDisabled) return;
    const rawPrice = this.p.price ?? this.p.newPrice;
    const price =
      typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^0-9.]/g, '')) : rawPrice || 0;

    const result = this.compareService.toggle({
      _id: this.productId,
      name: this.product.name,
      price,
      image: this.p.image || this.p.images?.[0]?.url || null,
      shortDescription: this.p.shortDescription,
      description: this.p.description,
      ratings: this.p.ratings,
      inventory: this.p.inventory,
      category: this.p.category,
      isFeatured: this.p.isFeatured,
      soldCount: this.p.soldCount,
    });

    this.compareMessage = result.message;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => (this.compareMessage = ''), 2500);
  }
}
