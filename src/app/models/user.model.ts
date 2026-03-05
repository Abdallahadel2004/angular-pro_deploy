export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  isConfirmed: boolean;
  role: 'customer' | 'admin';
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsersResponse {
  success: boolean;
  timestamps: string;
  page: number;
  pages: number;
  UsersNumber: number;
  users: User[];
}

export interface UserResponse {
  success: boolean;
  timestamps: string;
  user: User;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ChangeRolePayload {
  role: 'admin' | 'customer';
}
