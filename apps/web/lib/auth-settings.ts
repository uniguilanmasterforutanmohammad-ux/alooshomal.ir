'use client';

import { useEffect, useState } from 'react';

import { api } from './api';

interface PublicAuthSettings {
  phoneLoginEnabled: boolean;
  emailLoginEnabled: boolean;
}

/**
 * Which sign-in / sign-up methods the admin has enabled. Both default to ON so
 * the login page renders the full form until the public settings answer arrives
 * (or when the request fails) — the API is the source of truth and rejects a
 * disabled method anyway.
 */
export function useAuthMethods(): PublicAuthSettings & { loaded: boolean } {
  const [state, setState] = useState<PublicAuthSettings>({
    phoneLoginEnabled: true,
    emailLoginEnabled: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<PublicAuthSettings>('/settings/public')
      .then((result) => {
        if (!active) return;
        setState({
          phoneLoginEnabled: result.phoneLoginEnabled !== false,
          emailLoginEnabled: result.emailLoginEnabled !== false,
        });
      })
      .catch(() => {
        // keep both enabled
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { ...state, loaded };
}
