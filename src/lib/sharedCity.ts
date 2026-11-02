import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { LinkStatus } from '@/game/types';

const CITY_CHANNEL = 'swift-drop-city';
const RIDER_EVENT = 'rider';
const STALE_AFTER_MS = 3000;
const MAX_ABS_COORD = 5000;
const MAX_NAME_LENGTH = 24;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export interface RiderPose {
  name: string;
  x: number;
  z: number;
  heading: number;
  paintHex: string;
}

export interface RemoteRider extends RiderPose {
  id: string;
  receivedAt: number;
}

export interface SharedCity {
  send(pose: RiderPose): void;
  riders(): RemoteRider[];
  status(): LinkStatus;
  close(): void;
}

export function createRiderId(): string {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function parseRider(payload: unknown): (RiderPose & { id: string }) | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { id, name, x, z, heading, paintHex } = payload as Record<string, unknown>;
  if (typeof id !== 'string' || id.length === 0 || id.length > 40) return null;
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  if (typeof x !== 'number' || !Number.isFinite(x) || Math.abs(x) > MAX_ABS_COORD) return null;
  if (typeof z !== 'number' || !Number.isFinite(z) || Math.abs(z) > MAX_ABS_COORD) return null;
  if (typeof heading !== 'number' || !Number.isFinite(heading)) return null;
  if (typeof paintHex !== 'string' || !HEX_PATTERN.test(paintHex)) return null;
  return { id, name, x, z, heading, paintHex };
}

function offlineCity(): SharedCity {
  return {
    send() {},
    riders() {
      return [];
    },
    status() {
      return 'offline';
    },
    close() {},
  };
}

export function connectSharedCity(selfId: string): SharedCity {
  if (!isSupabaseConfigured) return offlineCity();

  const remotes = new Map<string, RemoteRider>();
  let status: LinkStatus = 'connecting';

  const channel = supabase.channel(CITY_CHANNEL, { config: { broadcast: { self: false } } });
  channel.on('broadcast', { event: RIDER_EVENT }, ({ payload }) => {
    const rider = parseRider(payload);
    if (!rider || rider.id === selfId) return;
    remotes.set(rider.id, { ...rider, receivedAt: performance.now() });
  });
  channel.subscribe((state) => {
    if (state === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
      status = 'live';
      return;
    }
    if (
      state === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
      state === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
      state === REALTIME_SUBSCRIBE_STATES.CLOSED
    ) {
      status = 'offline';
      remotes.clear();
    }
  });

  return {
    send(pose) {
      if (status !== 'live') return;
      void channel.send({ type: 'broadcast', event: RIDER_EVENT, payload: { id: selfId, ...pose } });
    },
    riders() {
      const now = performance.now();
      for (const [id, rider] of remotes) {
        if (now - rider.receivedAt > STALE_AFTER_MS) remotes.delete(id);
      }
      return [...remotes.values()];
    },
    status() {
      return status;
    },
    close() {
      remotes.clear();
      status = 'offline';
      void supabase.removeChannel(channel);
    },
  };
}
