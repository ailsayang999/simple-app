import { Component, OnInit, inject } from '@angular/core';
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

  // list
  accounts = this.accountService.accounts; // signal<AccountDto[]>

  // dialog 顯示控制
  displayCreateDialog = false;

  // 下拉選項
  accountTypeOptions = [
    { label: '現金帳戶（活存 / 數位帳戶）', value: 'CASH' },
    { label: '券商 / 證券帳戶', value: 'BROKERAGE' },
    { label: '加密貨幣錢包', value: 'CRYPTO' },
    { label: '其他', value: 'OTHER' },
  ];

  currencyOptions = [
    { label: '新台幣 (TWD)', value: 'TWD' },
    { label: '美金 (USD)', value: 'USD' },
    { label: '日圓 (JPY)', value: 'JPY' },
    { label: '歐元 (EUR)', value: 'EUR' },
  ];

  // Reactive Form
  createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    accountType: ['CASH', [Validators.required]],
    baseCurrency: ['TWD', [Validators.required]],
  });

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
    this.displayCreateDialog = true;
  }

  // 👉 Dialog 按「取消」
  cancelCreate() {
    this.displayCreateDialog = false;
  }

  // 👉 Dialog 按「建立帳戶」
  submitCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const dto: CreateAccountDto = this.createForm.getRawValue();

    this.accountService.createAccount(dto).subscribe({
      next: (created) => {
        this.displayCreateDialog = false;

        // ✅ 改用你自己的 ToastService
        this.toast.success(`已建立帳戶：${created.name}`);

        // 重新載入列表（也可以選擇直接 push 進 signal）
        this.accountService.loadAccounts();
      },
      error: (err) => {
        console.error('createAccount error:', err);
        this.toast.error(err?.error?.message ?? '無法建立帳戶，請稍後再試');
      },
    });
  }

  // 小工具：顯示驗證錯誤用
  hasError(controlName: keyof typeof this.createForm.controls, error: string) {
    const ctrl = this.createForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }
}
