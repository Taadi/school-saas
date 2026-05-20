import { ReactNode } from 'react';

/**
 * Wrapper for cross-module providers. Currently a passthrough; reserved for
 * future tenant-wide providers (notifications, websocket, feature flags, etc.).
 */
export function ModulesProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
