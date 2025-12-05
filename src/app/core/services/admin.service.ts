import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserWithRolesDto {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  getAllRoles(): Observable<string[]> {
    return this.http.get<string[]>('http://localhost:5225/api/admin/roles');
  }

  getUsersWithRoles(): Observable<UserWithRolesDto[]> {
    return this.http.get<UserWithRolesDto[]>('http://localhost:5225/api/admin/users');
  }

  updateUserRoles(userId: string, roles: string[]) {
    return this.http.put<void>(`http://localhost:5225/api/admin/users/${userId}/roles`, { roles });
  }
}
