/**
 * @service VisualSearchService
 * @description Angular service for the Visual Product Search API.
 * Handles image upload, search, and category fetching.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ProductRating {
  average: number;
  count: number;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand?: string;
  tags?: string[];
  rating?: ProductRating;
  stock?: number;
  similarityScore?: number;
  createdAt?: string;
}

export interface SearchQuery {
  keyword?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  minScore?: number;
}

export interface SearchResponse {
  success: boolean;
  count: number;
  searchTimeMs: number;
  query: SearchQuery;
  products: Product[];
  error?: string;
}

export interface CategoriesResponse {
  success: boolean;
  categories: string[];
}

export interface HealthResponse {
  success: boolean;
  status: string;
  cache: {
    hits: number;
    misses: number;
    keys: number;
  };
  timestamp: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class VisualSearchService {
  private readonly apiUrl = `${environment.apiUrl}/api/visual-search`;

  constructor(private http: HttpClient) {}

  /**
   * Performs a visual search by uploading an image file.
   * Optionally combines with keyword and filter parameters.
   *
   * @param imageFile  - The image File object to search with
   * @param options    - Optional search parameters
   * @returns Observable<SearchResponse>
   */
  search(imageFile: File, options: SearchQuery = {}): Observable<SearchResponse> {
    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name);

    if (options.keyword?.trim()) {
      formData.append('keyword', options.keyword.trim());
    }

    if (options.categories?.length) {
      options.categories.forEach((cat) => formData.append('categories', cat));
    }

    if (options.minPrice != null) {
      formData.append('minPrice', String(options.minPrice));
    }

    if (options.maxPrice != null) {
      formData.append('maxPrice', String(options.maxPrice));
    }

    if (options.limit != null) {
      formData.append('limit', String(options.limit));
    }

    if (options.minScore != null) {
      formData.append('minScore', String(options.minScore));
    }

    return this.http.post<SearchResponse>(this.apiUrl, formData).pipe(catchError(this.handleError));
  }

  /**
   * Returns available product categories for the filter UI.
   */
  getCategories(): Observable<string[]> {
    return this.http.get<CategoriesResponse>(`${this.apiUrl}/categories`).pipe(
      map((res) => res.categories),
      catchError(this.handleError),
    );
  }

  /**
   * Triggers embedding generation for a single product.
   * @param productId  MongoDB ObjectId
   * @param imageUrl   Optional override image URL
   */
  embedProduct(productId: string, imageUrl?: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/embed/${productId}`, { imageUrl })
      .pipe(catchError(this.handleError));
  }

  /**
   * Returns service health and cache stats.
   */
  healthCheck(): Observable<HealthResponse> {
    return this.http
      .get<HealthResponse>(`${this.apiUrl}/health`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Validates a file before upload (client-side pre-check).
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE_MB = 10;
    const ALLOWED_TYPES = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
    ]);

    if (!ALLOWED_TYPES.has(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.`,
      };
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return {
        valid: false,
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is ${MAX_SIZE_MB}MB.`,
      };
    }

    return { valid: true };
  }

  /**
   * Converts a File to a data URL for preview.
   */
  fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // ─── Error Handling ─────────────────────────────────────────────────────────

  private handleError(error: any): Observable<never> {
    let message = 'An unexpected error occurred.';

    if (error.error?.error) {
      message = error.error.error;
    } else if (error.status === 0) {
      message = 'Cannot connect to server. Check your connection.';
    } else if (error.status === 429) {
      message = 'Too many requests. Please wait and try again.';
    } else if (error.status === 413) {
      message = 'Image file is too large.';
    } else if (error.status >= 500) {
      message = 'Server error. Please try again later.';
    }

    return throwError(() => new Error(message));
  }
}
