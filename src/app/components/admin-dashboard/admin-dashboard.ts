import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
}

interface Order {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'], // keep if you have custom styles; otherwise can remove
})
export class AdminDashboard {
  stats: Stats = {
    totalProducts: 1234,
    totalOrders: 567,
    totalUsers: 8901,
    totalRevenue: 234567,
  };

  recentOrders: Order[] = [
    { id: 'ORD-001', customer: 'John Doe', date: '2024-03-05', total: 299.99, status: 'Completed' },
    {
      id: 'ORD-002',
      customer: 'Jane Smith',
      date: '2024-03-05',
      total: 149.5,
      status: 'Processing',
    },
    {
      id: 'ORD-003',
      customer: 'Bob Johnson',
      date: '2024-03-04',
      total: 549.99,
      status: 'Pending',
    },
    {
      id: 'ORD-004',
      customer: 'Alice Williams',
      date: '2024-03-04',
      total: 89.99,
      status: 'Completed',
    },
    {
      id: 'ORD-005',
      customer: 'Charlie Brown',
      date: '2024-03-03',
      total: 399.99,
      status: 'Cancelled',
    },
  ];

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'dot-confirmed';
      case 'Processing':
      case 'Pending':
      case 'Cancelled':
        return 'dot-pending';
      default:
        return 'dot-pending';
    }
  }

  trackById(index: number, order: Order): string {
    return order.id;
  }
}
