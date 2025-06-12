
export interface Valuable {
  id: string;
  name: string;
  price: number;
  icon?: 'gold' | 'silver' | 'diamond' | 'custom';
  iconColor?: string; // e.g., 'blue' for diamond
  selectedInHeader: boolean;
  unit: string; // e.g., 'gram', 'carat', 'piece'
}

export interface MakingChargeSetting {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface Settings {
  companyName: string;
  slogan: string;
  address: string;
  phoneNumber: string;
  valuables: Valuable[];
  defaultMakingCharge: MakingChargeSetting;
  netPurchaseMode: 'percentage' | 'fixed_price';
  netPurchasePercentage: number; // Default net percentage for purchases
  netPurchaseFixedPrice: number; // Default net fixed price for purchases
  cgstRate: number; // Percentage
  sgstRate: number; // Percentage
}

export interface BillItem {
  id: string;
  valuableId: string; // links to Valuable.id
  name: string; // copied from Valuable.name for history
  weightOrQuantity: number;
  unit: string; // copied from Valuable.unit
  rate: number; // price per unit at the time of billing
  makingCharge?: number; // can be percentage or fixed amount based on context
  makingChargeType?: 'percentage' | 'fixed';
  amount: number; // (weightOrQuantity * rate) + makingCharge
}

export type BillType = 'purchase' | 'sales-bill'; // Removed 'sales-estimate'

export interface Bill {
  id: string;
  billNumber?: string; // Auto-generated or manual
  type: BillType;
  date: string; // ISO string
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  items: BillItem[];
  subTotal: number;
  discount?: number; // Overall discount amount
  discountType?: 'percentage' | 'fixed';
  netAmountAfterDiscount?: number; // Subtotal - Discount
  cgstAmount?: number;
  sgstAmount?: number;
  totalAmount: number;
  notes?: string;
  // For purchases specifically
  purchaseNetApplied?: 'percentage' | 'fixed_price';
  purchaseNetValueApplied?: number;
}

export const DEFAULT_VALUABLES: Valuable[] = [
  { id: 'gold-18k', name: '18K Gold', price: 5000, icon: 'gold', selectedInHeader: true, unit: 'gram' },
  { id: 'gold-bis', name: 'BIS Gold', price: 5500, icon: 'gold', selectedInHeader: true, unit: 'gram' },
  { id: 'silver', name: 'Silver', price: 70, icon: 'silver', selectedInHeader: true, unit: 'gram' },
  { id: 'diamond', name: 'Diamond', price: 50000, icon: 'diamond', iconColor: 'blue', selectedInHeader: true, unit: 'carat' },
];

export const DEFAULT_SETTINGS: Settings = {
  companyName: 'Your Company Name',
  slogan: 'Quality you can trust',
  address: '123 Main St, City, Country',
  phoneNumber: '+1234567890',
  valuables: DEFAULT_VALUABLES,
  defaultMakingCharge: { type: 'percentage', value: 10 },
  netPurchaseMode: 'percentage',
  netPurchasePercentage: 10,
  netPurchaseFixedPrice: 0,
  cgstRate: 9,
  sgstRate: 9,
};
