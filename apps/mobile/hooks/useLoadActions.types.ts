import type { DamageItem, ZelleRecipient } from '../types';

export type ActionResult = { success: boolean; error?: string };

export interface DeliveryOrderCheck {
  allowed: boolean;
  reason?: string;
  nextLoad?: {
    id: string;
    delivery_order: number;
    customer_name: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
  };
  currentDeliveryIndex: number | null;
  thisLoadDeliveryOrder: number | null;
}

export interface DriverInfo {
  id: string;
  owner_id: string;
}

// Payment method type
type PaymentMethod = 'cashier_check' | 'money_order' | 'personal_check' | 'cash' | 'zelle' | 'already_paid';

// Type for load actions - matches return type of useLoadActions hook
export interface LoadActions {
  loading: boolean;
  // Status actions
  acceptLoad: () => Promise<ActionResult>;
  startLoading: (startingCuft?: number, photoUrl?: string) => Promise<ActionResult>;
  finishLoading: (endingCuft?: number, photoUrl?: string) => Promise<ActionResult>;
  startDelivery: (data?: { amountCollected?: number; paymentMethod?: string }) => Promise<ActionResult>;
  completeDelivery: () => Promise<ActionResult>;
  requiresContractDetails: () => Promise<{ required: boolean; loadSource?: string }>;
  requiresPickupCompletion: () => Promise<{ required: boolean; postingType?: string }>;
  // Payment actions
  collectPaymentAndStartDelivery: (data: {
    paymentMethod: PaymentMethod;
    amountCollected: number;
    zelleRecipient?: ZelleRecipient | null;
    paymentPhotoFrontUrl?: string | null;
    paymentPhotoBackUrl?: string | null;
    paymentNotes?: string | null;
    authorizationName?: string | null;
  }) => Promise<ActionResult>;
  saveContractDetails: (data: {
    contractBalanceDue: number;
    contractJobNumber?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    deliveryAddressFull?: string | null;
    contractLinehaulTotal: number;
    amountCompanyOwes: number;
    accessorials: {
      shuttle: number;
      longCarry: number;
      stairs: number;
      bulky: number;
      packing: number;
      other: number;
      notes?: string | null;
    };
    loadingReportPhotoUrl?: string | null;
    contractPhotoUrl?: string | null;
  }) => Promise<ActionResult>;
  completePickup: (data: {
    contractActualCuft: number;
    contractRatePerCuft: number;
    contractLinehaulTotal: number;
    contractBalanceDue: number;
    accessorials?: {
      shuttle?: number;
      longCarry?: number;
      stairs?: number;
      bulky?: number;
      packing?: number;
      other?: number;
      notes?: string | null;
    };
    amountCollectedAtPickup: number;
    paymentMethod?: PaymentMethod | null;
    zelleRecipient?: ZelleRecipient | null;
    paymentPhotoFrontUrl?: string | null;
    paymentPhotoBackUrl?: string | null;
    customerRfdDate: string;
    customerRfdDateEnd?: string | null;
    deliveryNotes?: string | null;
    contractPhotoUrl?: string | null;
    additionalDocsUrls?: string[];
  }) => Promise<ActionResult>;
  // Damage actions
  getDamages: () => Promise<DamageItem[]>;
  addDamageItem: (item: Omit<DamageItem, 'id' | 'documented_at'>) => Promise<ActionResult>;
  removeDamageItem: (itemId: string) => Promise<ActionResult>;
  updateDamageItem: (itemId: string, updates: Partial<Omit<DamageItem, 'id' | 'documented_at'>>) => Promise<ActionResult>;
  // Base actions
  checkDeliveryOrder: () => Promise<DeliveryOrderCheck>;
}









