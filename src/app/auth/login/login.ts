import { Component, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router'; // ⭐ 要加 ActivatedRoute
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [CommonModule, FormsModule, RouterLink],
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // ⭐ 注入 route 來讀 query string

  email = '';
  password = '';
  error = '';

  submit() {
    this.error = '';
    const ok = this.auth.login(this.email, this.password);
    if (!ok) {
      this.error = 'Login failed.';
      return;
    }

    // ⭐ 正確存取 returnUrl
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    this.router.navigateByUrl(returnUrl);
  }
}
