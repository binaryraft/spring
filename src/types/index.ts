
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
  defaultPurchaseItemNetPercentage: number; 
  defaultPurchaseItemNetFixedValue: number; // New setting for default fixed net price
  cgstRate: number; // Percentage
  sgstRate: number; // Percentage
  customItemNames: string[]; // For storing unique item names for suggestions
}

export interface BillItem {
  id: string;
  valuableId: string; // links to Valuable.id
  name: string; // editable, defaults from Valuable.name, stored for history
  weightOrQuantity: number;
  unit: string; // copied from Valuable.unit
  rate: number; // For sales: price per unit. For purchases (market_rate type): supplier's rate.
  makingCharge?: number; // can be percentage or fixed amount based on context (Sales only)
  makingChargeType?: 'percentage' | 'fixed'; // (Sales only)
  amount: number; // (weightOrQuantity * effective_rate) + makingCharge (for sales)

  // For Purchase Items Only:
  purchaseNetType?: 'market_rate' | 'net_percentage' | 'fixed_net_price';
  purchaseNetPercentValue?: number; // Percentage value if type is 'net_percentage'
  purchaseNetFixedValue?: number;   // Fixed rate if type is 'fixed_net_price' (this becomes the effective rate)
}

export type BillType = 'purchase' | 'sales-bill';

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
  defaultPurchaseItemNetPercentage: 10, 
  defaultPurchaseItemNetFixedValue: 0, // Default for new setting
  cgstRate: 9,
  sgstRate: 9,
  customItemNames: ["Gold Ring", "Silver Chain", "Diamond Pendant", "Gold Bangle"], 
};
