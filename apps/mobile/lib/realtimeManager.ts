import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeLogger } from './logger';

type SubscriptionCallback = () => void;

type SubscriptionOptions = {
  table: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  schema?: string;
  debounceMs?: number;
  callback: SubscriptionCallback;
};

type Listener = {
  id: string;
  callback: SubscriptionCallback;
  debounceMs: number;
  timer: ReturnType<typeof setTimeout> | null;
};

type ChannelEntry = {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
};

let listenerCounter = 0;

function nextListenerId() {
  listenerCounter += 1;
  const now = Date.now();
  return `rt-listener-${now}-${listenerCounter}`;
}

const DEFAULT_SCHEMA = 'public';
const DEFAULT_EVENT: SubscriptionOptions['event'] = '*';

function buildKey(opts: SubscriptionOptions) {
  const schema = opts.schema || DEFAULT_SCHEMA;
  const event = opts.event || DEFAULT_EVENT;
  const filter = opts.filter || 'all';
  return `${schema}:${opts.table}:${event}:${filter}`;
}

class RealtimeManager {
  private channels: Map<string, ChannelEntry> = new Map();

  subscribe(opts: SubscriptionOptions): string {
    const key = buildKey(opts);
    const entry = this.channels.get(key) ?? this.createChannel(key, opts);

    const listener: Listener = {
      id: nextListenerId(),
      callback: opts.callback,
      debounceMs: opts.debounceMs ?? 300,
      timer: null,
    };

    entry.listeners.add(listener);
    this.channels.set(key, entry);
    return listener.id;
  }

  unsubscribe(listenerId: string) {
    for (const [key, entry] of this.channels.entries()) {
      const toRemove = [...entry.listeners].find((l) => l.id === listenerId);
      if (toRemove) {
        if (toRemove.timer) clearTimeout(toRemove.timer);
        entry.listeners.delete(toRemove);
        if (entry.listeners.size === 0) {
          supabase.removeChannel(entry.channel);
          this.channels.delete(key);
          realtimeLogger.debug(`Removed channel ${key}`);
        }
        break;
      }
    }
  }

  invalidateAll() {
    for (const [key, entry] of this.channels.entries()) {
      supabase.removeChannel(entry.channel);
      this.channels.delete(key);
    }
  }

  private createChannel(key: string, opts: SubscriptionOptions): ChannelEntry {
    const channelName = `rt-${key}`;
    const channel = (supabase.channel(channelName) as any)
      .on(
        'postgres_changes',
        {
          event: opts.event || DEFAULT_EVENT,
          schema: opts.schema || DEFAULT_SCHEMA,
          table: opts.table,
          filter: opts.filter,
        },
        () => {
          const entry = this.channels.get(key);
          if (!entry) return;
          entry.listeners.forEach((listener) => {
            if (listener.timer) clearTimeout(listener.timer);
            listener.timer = setTimeout(() => {
              listener.callback();
            }, listener.debounceMs);
          });
        },
      )
      .subscribe();

    realtimeLogger.info(`Created channel ${channelName}`);

    return { channel, listeners: new Set() };
  }
}

export const realtimeManager = new RealtimeManager();

