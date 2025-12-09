import { useLoadActionBase } from './useLoadActionBase';
import { useLoadStatusActions } from './useLoadStatusActions';
import { useLoadPaymentActions } from './useLoadPaymentActions';
import { useLoadDamageActions } from './useLoadDamageActions';
export type { DeliveryOrderCheck, ActionResult } from './useLoadActions.types';

export function useLoadActions(loadId: string, onSuccess?: () => void) {
  const base = useLoadActionBase(loadId, onSuccess);

  const statusActions = useLoadStatusActions(base);
  const paymentActions = useLoadPaymentActions(base);
  const damageActions = useLoadDamageActions(base);

  return {
    loading: base.loading,
    ...statusActions,
    ...paymentActions,
    ...damageActions,
    checkDeliveryOrder: base.checkDeliveryOrder,
  };
}
