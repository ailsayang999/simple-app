import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  // ✅ Reactive Form 寫法
  form = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    category: new FormControl<string>('', {
      nonNullable: true,
    }),
  });

  // 讓 template 好取用
  get f() {
    return this.form.controls;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('送出的商品資料：', this.form.value);

    // TODO: 呼叫 API、service 之類的

    // 送出後清空（保留型別）
    this.form.reset({
      name: '',
      price: null,
      category: '',
    });
  }
}
