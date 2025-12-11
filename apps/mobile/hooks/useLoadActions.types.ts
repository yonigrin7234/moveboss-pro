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





