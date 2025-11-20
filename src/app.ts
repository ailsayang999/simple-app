import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
// ⭐ 引入 PrimeNG CardModule
import { CardModule } from 'primeng/card';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [ButtonModule, CardModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // 切換亮暗模式
  toggleTheme() {
    document.documentElement.classList.toggle('my-app-dark');
  }
}
