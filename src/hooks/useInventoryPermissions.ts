import { usePermissions, PermissionKey } from './usePermissions';

// Extended permission keys for inventory module
export type InventoryPermissionKey =
  | 'VIEW_INVENTORY'
  | 'VIEW_STOCK_MOVEMENTS'
  | 'CREATE_PURCHASE_ORDER'
  | 'RECEIVE_GOODS'
  | 'CREATE_CONSUMPTION'
  | 'CREATE_MANUAL_OUT'
  | 'CREATE_TRANSFER'
  | 'MANAGE_COMPLAINTS'
  | 'APPROVE_WRITE_OFF'
  | 'CONDUCT_INVENTORY'
  | 'APPROVE_INVENTORY'
  | 'MANAGE_SUPPLIERS';

export function useInventoryPermissions() {
  const { permissions, loading } = usePermissions();

  const canView = permissions.includes('VIEW_INVENTORY');
  const canViewMovements = permissions.includes('VIEW_STOCK_MOVEMENTS');
  const canCreatePurchaseOrder = permissions.includes('CREATE_PURCHASE_ORDER');
  const canReceiveGoods = permissions.includes('RECEIVE_GOODS');
  const canCreateConsumption = permissions.includes('CREATE_CONSUMPTION');
  const canCreateManualOut = permissions.includes('CREATE_MANUAL_OUT');
  const canCreateTransfer = permissions.includes('CREATE_TRANSFER');
  const canManageComplaints = permissions.includes('MANAGE_COMPLAINTS');
  const canApproveWriteOff = permissions.includes('APPROVE_WRITE_OFF');
  const canConductInventory = permissions.includes('CONDUCT_INVENTORY');
  const canApproveInventory = permissions.includes('APPROVE_INVENTORY');
  const canManageSuppliers = permissions.includes('MANAGE_SUPPLIERS');

  const can = (permission: InventoryPermissionKey): boolean => {
    return permissions.includes(permission);
  };

  return {
    loading,
    canView,
    canViewMovements,
    canCreatePurchaseOrder,
    canReceiveGoods,
    canCreateConsumption,
    canCreateManualOut,
    canCreateTransfer,
    canManageComplaints,
    canApproveWriteOff,
    canConductInventory,
    canApproveInventory,
    canManageSuppliers,
    can,
  };
}
