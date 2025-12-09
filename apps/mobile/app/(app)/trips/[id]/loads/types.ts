import type { Load } from '../../../../../types';
import type { useLoadActions } from '../../../../../hooks/useLoadActions';

export type LoadDetail = Load & {
  companies?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    trust_level?: string | null;
  } | null;
};

export type LoadActions = ReturnType<typeof useLoadActions>;

