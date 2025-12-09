import type { DamageItem } from '../types';
import { supabase } from '../lib/supabase';
import type { LoadActionBaseContext } from './useLoadActionBase';
import type { ActionResult } from './useLoadActions.types';

let damageIdCounter = 0;
function nextDamageId() {
  damageIdCounter += 1;
  return `damage_${Date.now()}_${damageIdCounter}`;
}

export function useLoadDamageActions(context: LoadActionBaseContext) {
  const { loadId, onSuccess, setLoading, getDriverInfo } = context;

  const getDamages = async (): Promise<DamageItem[]> => {
    try {
      const driver = await getDriverInfo();

      const { data: load, error } = await supabase
        .from('loads')
        .select('pre_existing_damages')
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (error) throw error;

      return (load?.pre_existing_damages as DamageItem[]) || [];
    } catch {
      return [];
    }
  };

  const addDamageItem = async (item: Omit<DamageItem, 'id' | 'documented_at'>): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const currentDamages = await getDamages();

      const newItem: DamageItem = {
        ...item,
        id: nextDamageId(),
        documented_at: new Date().toISOString(),
      };

      const updatedDamages = [...currentDamages, newItem];

      const { error } = await supabase
        .from('loads')
        .update({
          pre_existing_damages: updatedDamages,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add damage item' };
    } finally {
      setLoading(false);
    }
  };

  const removeDamageItem = async (itemId: string): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const currentDamages = await getDamages();
      const updatedDamages = currentDamages.filter((d) => d.id !== itemId);

      const { error } = await supabase
        .from('loads')
        .update({
          pre_existing_damages: updatedDamages,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove damage item' };
    } finally {
      setLoading(false);
    }
  };

  const updateDamageItem = async (
    itemId: string,
    updates: Partial<Omit<DamageItem, 'id' | 'documented_at'>>,
  ): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const currentDamages = await getDamages();

      const updatedDamages = currentDamages.map((d) => (d.id === itemId ? { ...d, ...updates } : d));

      const { error } = await supabase
        .from('loads')
        .update({
          pre_existing_damages: updatedDamages,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update damage item' };
    } finally {
      setLoading(false);
    }
  };

  return {
    getDamages,
    addDamageItem,
    removeDamageItem,
    updateDamageItem,
  };
}

