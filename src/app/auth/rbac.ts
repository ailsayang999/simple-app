// 這個檔專門放 角色 / 權限 / 對應表，整個專案統一從這裡拿，不要每個地方自己寫字串 👇
// 之後如果公司改權限，只要改這一個檔，全專案一起生效 ✅

// ✅ 角色 enum
export enum Role {
  Admin = 'ADMIN',
  Manager = 'MANAGER',
  ReportViewer = 'REPORT_VIEWER',
  User = 'USER',
}

// ✅ 權限 enum（用字串比較好 debug）
export enum Permission {
  FundRead = 'fund.read',
  FundWrite = 'fund.write',
  ProductView = 'product.view',
  ProductEdit = 'product.edit',
  // ...未來要加在這裡
}

// ✅ 角色 -> 擁有哪些權限
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.Admin]: [
    Permission.FundRead,
    Permission.FundWrite,
    Permission.ProductView,
    Permission.ProductEdit,
    // ... Admin 通常最多
  ],
  [Role.Manager]: [Permission.FundRead, Permission.ProductView, Permission.ProductEdit],
  [Role.ReportViewer]: [Permission.FundRead, Permission.ProductView],
  [Role.User]: [
    Permission.FundRead,
    // 一般使用者可能沒有這些敏感權限
  ],
};
