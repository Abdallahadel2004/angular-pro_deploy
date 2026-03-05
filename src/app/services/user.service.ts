import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  User,
  UsersResponse,
  UserResponse,
  UpdateUserPayload,
  ChangeRolePayload,
} from '../models/user.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  // Change this to your actual backend URL
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAllUsers(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Observable<UsersResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search);

    return this.http.get<UsersResponse>(this.baseUrl, { params });
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}`, payload);
  }

  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  changeUserRole(id: string, payload: ChangeRolePayload): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}/role`, payload);
  }
}
