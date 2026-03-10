import { Component, signal } from '@angular/core';
import { Navbar } from './components/navbar/navbar';
import { CarouselComponent } from './components/carousel/carousel';
import { ServicesComponent } from './components/services/services.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { FooterComponent } from './components/footer/footer';
import { RouterOutlet } from '@angular/router';
import { Chatbot } from './components/chatbot/chatbot';
import { CompareBar } from './components/compare-bar/compare-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Navbar,
    CarouselComponent,
    ProductListComponent,
    ServicesComponent,
    FooterComponent,
    RouterOutlet,
    Chatbot,
    CompareBar,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('E-commerece-project');
}
