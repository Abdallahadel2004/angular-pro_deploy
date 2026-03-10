// components/compare-bar/compare-bar.ts
// Floating bottom bar — appears when 1+ products are selected for comparison.

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompareService } from '../../services/compare.service';

@Component({
  selector: 'app-compare-bar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './compare-bar.html',
  styleUrls: ['./compare-bar.scss'],
})
export class CompareBar {
  constructor(public compareService: CompareService) {}
}
