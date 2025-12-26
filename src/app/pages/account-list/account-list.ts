import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
//import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { SharedModule } from 'primeng/api';
import { SelectModule } from 'primeng/select';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AccountService } from '../../core/services/account.service';
import { AccountDto } from '../../core/models/account.model';
import { CreateAccountDto } from '../../core/models/create-account.model';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-account-list-page',
  standalone: true,
  templateUrl: './account-list.html',
  styleUrl: './account-list.scss',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    SharedModule,
  ],
  // ✅ 不再需要 providers: [MessageService]，因為你用自己的 ToastService
})
export class AccountListPage implements OnInit {
  private accountService = inject(AccountService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  // list
  accounts = this.accountService.accounts; // signal<AccountDto[]>

  // dialog 顯示控制
  // ✅ Angular 20：用 signal 讓 UI state 更乾淨、可追蹤
  displayCreateDialog = signal(false);

  // ✅ Angular 20：送出中狀態（用來控制 button loading / disabled）
  submitting = signal(false);

  // 下拉選項
  accountTypeOptions = [
    // 💰 現金 / 銀行
    { label: '現金帳戶（活存 / 數位帳戶）', value: 'CASH' },
    { label: '外幣帳戶', value: 'FOREIGN_CURRENCY' },
    { label: '定存帳戶', value: 'TIME_DEPOSIT' },
    { label: '薪資帳戶', value: 'PAYROLL' },

    // 📈 投資
    { label: '證券帳戶', value: 'BROKERAGE' },
    { label: '基金帳戶', value: 'FUND' },
    { label: 'ETF 專戶', value: 'ETF_ACCOUNT' },
    { label: '期貨帳戶', value: 'FUTURES' },
    { label: '選擇權帳戶', value: 'OPTIONS' },

    // 🪙 加密資產
    { label: '加密貨幣錢包', value: 'CRYPTO' },
    { label: '加密貨幣交易所', value: 'CRYPTO_EXCHANGE' },
    { label: '冷錢包（硬體錢包）', value: 'CRYPTO_COLD_WALLET' },

    // 🏠 實體資產
    { label: '不動產', value: 'REAL_ESTATE' },
    { label: '貴金屬', value: 'PRECIOUS_METAL' },
    { label: '收藏品', value: 'COLLECTIBLE' },

    // 🧾 負債 / 保險 / 退休
    { label: '信用卡', value: 'CREDIT_CARD' },
    { label: '貸款（房貸 / 信貸）', value: 'LOAN' },
    { label: '保險', value: 'INSURANCE' },
    { label: '退休帳戶', value: 'RETIREMENT' },

    // 其他
    { label: '其他', value: 'OTHER' },
  ];

  currencyOptions = [
    { label: '新台幣 (TWD)', value: 'TWD' },
    { label: '美金 (USD)', value: 'USD' },
    { label: '日圓 (JPY)', value: 'JPY' },
    { label: '歐元 (EUR)', value: 'EUR' },
  ];

  // Reactive Form
  // ✅ 仍然維持 Reactive Forms（Angular 20 正統用法），但外圍狀態 signal 化
  createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    accountType: ['CASH', [Validators.required]],
    baseCurrency: ['TWD', [Validators.required]],
  });

  // ✅ Angular 20：derived state 用 computed
  // 你原本是 template 直接 [disabled]="createForm.invalid"
  // 這裡升級成：invalid 或 submitting 時都不能送出
  submitDisabled = computed(() => this.createForm.invalid || this.submitting());

  ngOnInit(): void {
    this.accountService.loadAccounts();
  }

  // 👉 點「新增帳戶」按鈕
  openCreateDialog() {
    this.createForm.reset({
      name: '',
      accountType: 'CASH',
      baseCurrency: 'TWD',
    });
    this.displayCreateDialog.set(true);
  }

  // 👉 Dialog 按「取消」
  cancelCreate() {
    this.displayCreateDialog.set(false);
  }

  // 👉 Dialog 按「建立帳戶」
  submitCreate() {
    if (this.submitDisabled()) {
      this.createForm.markAllAsTouched(); // 告訴 Angular：「這個表單裡 所有欄位 都被使用者『碰過』了」目的是：👉 強制顯示驗證錯誤訊息
      return;
    }

    const dto: CreateAccountDto = this.createForm.getRawValue();

    this.submitting.set(true);

    this.accountService
      .createAccount(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.displayCreateDialog.set(false);

          // ✅ 改用你自己的 ToastService
          this.toast.success(`已建立帳戶：${created.name}`);

          // 重新載入列表（也可以選擇直接 push 進 signal）
          this.accountService.loadAccounts();

          // ✅ 送出成功後可選：reset（避免下次開啟殘留）
          this.createForm.reset({
            name: '',
            accountType: 'CASH',
            baseCurrency: 'TWD',
          });
        },
        error: (err) => {
          console.error('createAccount error:', err);
        },
        complete: () => {
          this.submitting.set(false);
        },
      });
  }

  // 小工具：顯示驗證錯誤用
  // ✅ Angular 20：更 typed 的寫法（不用 .get() 也可以）
  hasError(controlName: keyof typeof this.createForm.controls, error: string) {
    const ctrl = this.createForm.controls[controlName];
    return ctrl.touched && ctrl.hasError(error);
  }
}
