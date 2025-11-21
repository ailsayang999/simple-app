import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // 切換亮暗模式
  toggleTheme() {
    document.documentElement.classList.toggle('my-app-dark');
  }
}
