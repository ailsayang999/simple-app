import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserWithRolesDto {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAllRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/admin/roles`);
  }

  getUsersWithRoles(): Observable<UserWithRolesDto[]> {
    return this.http.get<UserWithRolesDto[]>(`${this.baseUrl}/admin/users`);
  }

  updateUserRoles(userId: string, roles: string[]) {
    return this.http.put<void>(`${this.baseUrl}/admin/users/${userId}/roles`, { roles });
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/users/${userId}`);
  }
}
