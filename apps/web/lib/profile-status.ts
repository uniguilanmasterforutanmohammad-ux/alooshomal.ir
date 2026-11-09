'use client';

import { useEffect, useState } from 'react';

import { api } from './api';

export interface MyProfileStatus {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  nationalCode: string | null;
  profileCompleted: boolean;
}

/**
 * Reads the identity-completion flag of the signed-in user. Defaults to
 * `completed: true` while loading so a slow request never flashes a gate.
 */
export function useProfileStatus(enabled = true) {
  const [status, setStatus] = useState<MyProfileStatus | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api
      .get<MyProfileStatus>('/profile/me')
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    status,
    loading,
    completed: status?.profileCompleted ?? true,
  };
}
