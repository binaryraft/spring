
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
  companyLogo?: string; // Base64 data URI for the logo
  showCompanyLogo: boolean;
  valuables: Valuable[];
  defaultMakingCharge: MakingChargeSetting;
  defaultPurchaseItemNetPercentage: number;
  defaultPurchaseItemNetFixedValue: number;
  cgstRate: number; // Percentage
  sgstRate: number; // Percentage
  productNames: string[]; // Stores unique product names for suggestions
}

export interface BillItem {
  id: string;
  valuableId: string; // links to Valuable.id
  name: string; // User-editable product name (e.g., "Ring", "Bangle")
  weightOrQuantity: number;
  unit: string; // copied from Valuable.unit
  rate: number; // For sales: price per unit.
  makingCharge?: number; // (Sales only)
  makingChargeType?: 'percentage' | 'fixed'; // (Sales only)
  amount: number; // Taxable amount: (weightOrQuantity * effective_rate) + makingCharge (for sales)

  // For Purchase Items Only:
  purchaseNetType?: 'net_percentage' | 'fixed_net_price';
  purchaseNetPercentValue?: number;
  purchaseNetFixedValue?: number;

  // Item-level GST (for Sales bills)
  itemCgstAmount?: number;
  itemSgstAmount?: number;
}

export type BillType = 'purchase' | 'sales-bill';

export interface Bill {
  id: string;
  billNumber?: string;
  type: BillType;
  date: string; // ISO string
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  items: BillItem[];
  subTotal: number; // Sum of all item.amount (total taxable value)
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  netAmountAfterDiscount?: number;
  cgstAmount?: number; // Sum of all item.itemCgstAmount
  sgstAmount?: number; // Sum of all item.itemSgstAmount
  totalAmount: number; // subTotal + cgstAmount + sgstAmount
  notes?: string;
}

export const DEFAULT_VALUABLES: Valuable[] = [
  { id: 'gold-18k', name: '18K Gold', price: 5000, icon: 'gold', selectedInHeader: true, unit: 'gram' },
  { id: 'gold-bis', name: 'BIS Gold', price: 5500, icon: 'gold', selectedInHeader: true, unit: 'gram' },
  { id: 'gold-22k', name: '22K Gold', price: 6000, icon: 'gold', selectedInHeader: true, unit: 'gram' },
  { id: 'gold-24k', name: '24K Gold', price: 6500, icon: 'gold', selectedInHeader: false, unit: 'gram' },
  { id: 'silver', name: 'Silver', price: 70, icon: 'silver', selectedInHeader: true, unit: 'gram' },
  { id: 'diamond', name: 'Diamond', price: 50000, icon: 'diamond', iconColor: 'blue', selectedInHeader: true, unit: 'carat' },
];

export const DEFAULT_SETTINGS: Settings = {
  companyName: 'Your Company Name',
  slogan: 'Quality you can trust',
  address: '123 Main St, City, Country',
  phoneNumber: '+1234567890',
  companyLogo: undefined,
  showCompanyLogo: true,
  valuables: DEFAULT_VALUABLES,
  defaultMakingCharge: { type: 'percentage', value: 10 },
  defaultPurchaseItemNetPercentage: 10,
  defaultPurchaseItemNetFixedValue: 4500,
  cgstRate: 9,
  sgstRate: 9,
  productNames: ["Gold Ring", "Silver Chain", "Diamond Pendant", "Gold Bangle", "Bangles", "Rings", "Necklace"],
};
