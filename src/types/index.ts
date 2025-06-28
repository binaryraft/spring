

declare global {
  interface Window {
    electronAPI?: {
      print: () => void;
    };
  }
}

export interface Valuable {
  id: string;
  name: string;
  price: number;
  lastUpdated?: string;
  icon: string; 
  iconColor?: string; 
  selectedInHeader: boolean;
  unit: string; 
  isDefault?: boolean; 
}

export interface MakingChargeSetting {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CurrencyDefinition {
  symbol: string; 
  code: string; 
  name: string; 
}

export type PdfLogoPosition = 'top-center' | 'top-left' | 'inline-left';

export interface ProductSuggestion {
  name: string;
  hsnCode: string;
}

export interface Settings {
  companyName: string;
  slogan: string;
  place: string;
  phoneNumber: string;
  gstin?: string; 
  companyLogo?: string; 
  showCompanyLogo: boolean;
  valuables: Valuable[];
  defaultMakingCharge: MakingChargeSetting;
  defaultPurchaseItemNetPercentage: number;
  defaultPurchaseItemNetFixedValue: number;
  cgstRate: number; 
  sgstRate: number; 
  productSuggestions: ProductSuggestion[]; 
  currencySymbol: string; 
  theme: 'light' | 'dark';
  enableColorBilling: boolean;
  pdfLogoPosition: PdfLogoPosition;
  enableGstReport: boolean;
  enableHsnCode: boolean;
  enablePurchase: boolean;
}

export interface BillItem {
  id: string;
  valuableId: string; 
  name: string; 
  hsnCode?: string; 
  weightOrQuantity: number;
  unit: string; 
  rate: number; 
  makingCharge?: number; 
  makingChargeType?: 'percentage' | 'fixed'; 
  amount: number; 

  purchaseNetType?: 'net_percentage' | 'fixed_net_price';
  purchaseNetPercentValue?: number;
  purchaseNetFixedValue?: number;

  itemCgstAmount?: number;
  itemSgstAmount?: number;
}

export type BillType = 'purchase' | 'sales-bill' | 'delivery-voucher';

export interface Bill {
  id: string;
  billNumber: string;
  type: BillType;
  date: string; 
  customerName?: string;
  customerPlace?: string;
  customerPhone?: string;
  customerGstin?: string;
  items: BillItem[];
  subTotal: number; 
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  netAmountAfterDiscount?: number;
  cgstAmount?: number; 
  sgstAmount?: number; 
  totalAmount: number; 
  notes?: string;
  companyGstin?: string; 
}

export const DEFAULT_VALUABLES: Valuable[] = [
  { id: 'gold-18k', name: '18K Gold', price: 5000, icon: 'gold', selectedInHeader: true, unit: 'gram', isDefault: true },
  { id: 'gold-bis', name: 'BIS 916', price: 5500, icon: 'gold', selectedInHeader: true, unit: 'gram', isDefault: true },
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
  { symbol: 'د.إ', code: 'AED', name: 'UAE Dirham' },
  { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar' },
];

export const DEFAULT_SETTINGS: Settings = {
  companyName: 'Your Company Name',
  slogan: 'Quality you can trust',
  place: '123 Main St, City, Country',
  phoneNumber: '+1234567890',
  gstin: '', 
  companyLogo: undefined,
  showCompanyLogo: true,
  valuables: DEFAULT_VALUABLES,
  defaultMakingCharge: { type: 'percentage', value: 10 },
  defaultPurchaseItemNetPercentage: 10,
  defaultPurchaseItemNetFixedValue: 4500,
  cgstRate: 1.5, 
  sgstRate: 1.5, 
  productSuggestions: [
    { name: "Gold Ring", hsnCode: "7113" },
    { name: "Silver Chain", hsnCode: "7113" },
    { name: "Diamond Pendant", hsnCode: "7113" },
    { name: "Gold Bangle", hsnCode: "7113" },
    { name: "Bangles", hsnCode: "7113" },
    { name: "Rings", hsnCode: "7113" },
    { name: "Necklace", hsnCode: "7113" },
    { name: "Platinum Band", hsnCode: "7114" },
    { name: "Ruby Earrings", hsnCode: "7113" }
  ],
  currencySymbol: '₹', 
  theme: 'light',
  enableColorBilling: true,
  pdfLogoPosition: 'inline-left', 
  enableGstReport: true,
  enableHsnCode: true,
  enablePurchase: true,
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
