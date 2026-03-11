// services/compare.service.ts
// Manages up to 3 products selected for comparison.
// State is kept in a signal so any component can react to changes.

import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface CompareProduct {
  _id: string;
  name: string;
  price: number;
  image: string | null;
  shortDescription?: string;
  description?: string;
  ratings?: { average: number; count: number };
  inventory?: { quantity: number };
  category?: any;
  isFeatured?: boolean;
  soldCount?: number;
  [key: string]: any; // allow extra fields from API
}

const MAX = 3;
const STORAGE_KEY = 'electro_compare';

@Injectable({ providedIn: 'root' })
export class CompareService {
  // Reactive signal — components read this directly
  private _products = signal<CompareProduct[]>(this.loadFromStorage());

  readonly products = this._products.asReadonly();
  readonly count = computed(() => this._products().length);
  readonly isFull = computed(() => this._products().length >= MAX);
  readonly canCompare = computed(() => this._products().length >= 2);

  constructor(private router: Router) {}

  // Returns true if product is already in compare list
  isAdded(id: string): boolean {
    return this._products().some((p) => p._id === id);
  }

  // Toggle — add if not present, remove if present
  toggle(product: CompareProduct): { added: boolean; message: string } {
    const current = this._products();

    if (this.isAdded(product._id)) {
      this._products.set(current.filter((p) => p._id !== product._id));
      this.saveToStorage();
      return { added: false, message: `"${product.name}" removed from comparison.` };
    }

    if (current.length >= MAX) {
      return {
        added: false,
        message: `You can compare up to ${MAX} products at once. Remove one first.`,
      };
    }

    this._products.set([...current, product]);
    this.saveToStorage();
    return { added: true, message: `"${product.name}" added to comparison.` };
  }

  remove(id: string): void {
    this._products.set(this._products().filter((p) => p._id !== id));
    this.saveToStorage();
  }

  clear(): void {
    this._products.set([]);
    this.saveToStorage();
  }

  navigateToCompare(): void {
    if (this.canCompare()) {
      this.router.navigate(['/compare']);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._products()));
    } catch {}
  }

  private loadFromStorage(): CompareProduct[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
