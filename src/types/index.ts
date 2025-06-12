
export interface Valuable {
  id: string;
  name: string;
  price: number;
  icon: 'gold' | 'silver' | 'diamond' | 'ruby' | 'emerald' | 'sapphire' | 'pearl' | 'platinum' | 'custom-gem' | 'other'; // Extended icon types
  iconColor?: string; // e.g., 'blue' for diamond, or for custom-gem
  selectedInHeader: boolean;
  unit: string; // e.g., 'gram', 'carat', 'piece'
  isDefault?: boolean; // To differentiate default from user-added
}

export interface MakingChargeSetting {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CurrencyDefinition {
  symbol: string; // Direct character like '₹', '$', '€'
  code: string; // e.g., "INR", "USD"
  name: string; // e.g., "Indian Rupee", "US Dollar"
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
  currencySymbol: string; // Will hold the selected symbol (e.g., '₹', '$')
  availableCurrencies: CurrencyDefinition[];
}

export interface BillItem {
  id: string;
  valuableId: string; // links to Valuable.id
  name: string; // User-editable product name (e.g., "Ring", "Bangle")
  hsnCode?: string; // HSN code for the item
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
  subTotal: number; // Sum of all item.amount (total taxable value of all items)
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  netAmountAfterDiscount?: number;
  cgstAmount?: number; // Sum of all item.itemCgstAmount
  sgstAmount?: number; // Sum of all item.itemSgstAmount
  totalAmount: number; // subTotal + cgstAmount + sgstAmount (for sales) or subTotal (for purchase)
  notes?: string;
}

export const DEFAULT_VALUABLES: Valuable[] = [
  { id: 'gold-18k', name: '18K Gold', price: 5000, icon: 'gold', selectedInHeader: true, unit: 'gram', isDefault: true },
  { id: 'gold-bis', name: 'BIS Gold', price: 5500, icon: 'gold', selectedInHeader: true, unit: 'gram', isDefault: true },
  { id: 'gold-22k', name: '22K Gold', price: 6000, icon: 'gold', selectedInHeader: true, unit: 'gram', isDefault: true },
  { id: 'gold-24k', name: '24K Gold', price: 6500, icon: 'gold', selectedInHeader: false, unit: 'gram', isDefault: true },
  { id: 'silver', name: 'Silver', price: 70, icon: 'silver', selectedInHeader: true, unit: 'gram', isDefault: true },
  { id: 'diamond', name: 'Diamond', price: 50000, icon: 'diamond', iconColor: 'deepskyblue', selectedInHeader: true, unit: 'carat', isDefault: true },
  { id: 'platinum', name: 'Platinum', price: 2500, icon: 'platinum', iconColor: 'slategray', selectedInHeader: false, unit: 'gram', isDefault: true },
  { id: 'ruby', name: 'Ruby', price: 20000, icon: 'ruby', iconColor: 'crimson', selectedInHeader: false, unit: 'carat', isDefault: true },
  { id: 'emerald', name: 'Emerald', price: 15000, icon: 'emerald', iconColor: 'mediumseagreen', selectedInHeader: false, unit: 'carat', isDefault: true },
  { id: 'sapphire', name: 'Sapphire', price: 18000, icon: 'sapphire', iconColor: 'royalblue', selectedInHeader: false, unit: 'carat', isDefault: true },
  { id: 'pearl', name: 'Pearl', price: 500, icon: 'pearl', iconColor: '#F0F0F0', selectedInHeader: false, unit: 'piece', isDefault: true },
];

export const AVAILABLE_CURRENCIES: CurrencyDefinition[] = [
  { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
  { symbol: '$', code: 'USD', name: 'US Dollar' },
  { symbol: '€', code: 'EUR', name: 'Euro' },
  { symbol: '£', code: 'GBP', name: 'British Pound' },
  // Add more currencies as needed
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
  cgstRate: 1.5, // As per Indian standards for gold jewellery
  sgstRate: 1.5, // As per Indian standards for gold jewellery
  productNames: ["Gold Ring", "Silver Chain", "Diamond Pendant", "Gold Bangle", "Bangles", "Rings", "Necklace", "Platinum Band", "Ruby Earrings"],
  currencySymbol: '₹', // Default to INR direct character
  availableCurrencies: AVAILABLE_CURRENCIES,
};

export const AVAILABLE_ICONS: Array<{value: Valuable['icon'], label: string}> = [
    { value: 'gold', label: 'Gold Coin' },
    { value: 'silver', label: 'Silver Coin' },
    { value: 'diamond', label: 'Diamond (Clear)' },
    { value: 'ruby', label: 'Ruby (Red Gem)' },
    { value: 'emerald', label: 'Emerald (Green Gem)' },
    { value: 'sapphire', label: 'Sapphire (Blue Gem)' },
    { value: 'pearl', label: 'Pearl' },
    { value: 'platinum', label: 'Platinum Badge' },
    { value: 'custom-gem', label: 'Custom Gem (Specify Color)' },
    { value: 'other', label: 'Other/Generic' },
];
