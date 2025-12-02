import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // ⭐ 一定要有這行

@Component({
  standalone: true,
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  imports: [
    RouterLink, // ⭐⭐ 一定要放在這裡，routerLink 才會動
  ],
})
export class NotFound {}
