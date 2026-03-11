/**
 * @component VisualSearchComponent
 * @description Main visual product search UI component.
 *
 * Features:
 *  - Drag & drop + click-to-upload image input
 *  - Camera capture (mobile)
 *  - Live preview with similarity score overlay
 *  - Category filter chips
 *  - Price range filter
 *  - Keyword hybrid search
 *  - Product grid with animated results
 */

import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, finalize } from 'rxjs';

import { VisualSearchService, Product, SearchQuery } from '../../services/visual-search.service';

// ─── State ────────────────────────────────────────────────────────────────────

type SearchState = 'idle' | 'loading' | 'results' | 'error';

interface FilterState {
  keyword: string;
  selectedCategories: Set<string>;
  minPrice: number | null;
  maxPrice: number | null;
  limit: number;
  minScore: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-visual-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './visual-search.html',
  styleUrls: ['./visual-search.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualSearchComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('dropZone') dropZoneRef!: ElementRef<HTMLDivElement>;

  // ── State ──────────────────────────────────────────────────────────────────
  state: SearchState = 'idle';
  isDragging = false;

  selectedFile: File | null = null;
  previewUrl: string | null = null;

  products: Product[] = [];
  categories: string[] = [];
  totalFound = 0;
  searchTimeMs = 0;
  errorMessage = '';

  filters: FilterState = {
    keyword: '',
    selectedCategories: new Set(),
    minPrice: null,
    maxPrice: null,
    limit: 10,
    minScore: 0.6,
  };

  showFilters = false;

  private destroy$ = new Subject<void>();

  constructor(
    private searchService: VisualSearchService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  // ── Category Loading ───────────────────────────────────────────────────────

  private loadCategories(): void {
    this.searchService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cats) => {
          this.categories = cats;
          this.cdr.markForCheck();
        },
        error: () => {
          // Non-critical — filters still work without categories
        },
      });
  }

  // ── File Handling ──────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
    input.value = ''; // allow re-selecting same file
  }

  openFilePicker(): void {
    this.fileInputRef.nativeElement.click();
  }

  openCamera(): void {
    this.cameraInputRef.nativeElement.click();
  }

  private async handleFile(file: File): Promise<void> {
    const validation = this.searchService.validateFile(file);
    if (!validation.valid) {
      this.setError(validation.error!);
      return;
    }

    // Revoke previous object URL
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
    this.state = 'idle';
    this.products = [];
    this.cdr.markForCheck();
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDropZoneDragEnter(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = true;
    this.cdr.markForCheck();
  }

  onDropZoneDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  onDropZoneDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;

    const file = e.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
    this.cdr.markForCheck();
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  search(): void {
    if (!this.selectedFile) {
      this.setError('Please upload an image first.');
      return;
    }

    this.state = 'loading';
    this.errorMessage = '';
    this.cdr.markForCheck();

    const query: SearchQuery = {
      keyword: this.filters.keyword || undefined,
      categories: this.filters.selectedCategories.size
        ? [...this.filters.selectedCategories]
        : undefined,
      minPrice: this.filters.minPrice ?? undefined,
      maxPrice: this.filters.maxPrice ?? undefined,
      limit: this.filters.limit,
      minScore: this.filters.minScore,
    };

    this.searchService
      .search(this.selectedFile, query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cdr.markForCheck()),
      )
      .subscribe({
        next: (res) => {
          this.products = res.products;
          this.totalFound = res.count;
          this.searchTimeMs = res.searchTimeMs;
          this.state = 'results';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.setError(err.message);
        },
      });
  }

  reset(): void {
    this.selectedFile = null;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
    this.products = [];
    this.state = 'idle';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  toggleCategory(cat: string): void {
    if (this.filters.selectedCategories.has(cat)) {
      this.filters.selectedCategories.delete(cat);
    } else {
      this.filters.selectedCategories.add(cat);
    }
    this.cdr.markForCheck();
  }

  isCategorySelected(cat: string): boolean {
    return this.filters.selectedCategories.has(cat);
  }

  clearFilters(): void {
    this.filters = {
      keyword: '',
      selectedCategories: new Set(),
      minPrice: null,
      maxPrice: null,
      limit: 10,
      minScore: 0.6,
    };
    this.cdr.markForCheck();
  }

  get hasActiveFilters(): boolean {
    return (
      !!this.filters.keyword ||
      this.filters.selectedCategories.size > 0 ||
      this.filters.minPrice != null ||
      this.filters.maxPrice != null
    );
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────────

  formatScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  getScoreClass(score: number): string {
    if (score >= 0.85) return 'score-high';
    if (score >= 0.7) return 'score-medium';
    return 'score-low';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  get isLoading(): boolean {
    return this.state === 'loading';
  }

  trackProduct(_: number, p: Product): string {
    return p._id;
  }

  private setError(message: string): void {
    this.errorMessage = message;
    this.state = 'error';
    this.cdr.markForCheck();
  }
}
