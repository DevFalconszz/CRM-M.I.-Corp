import { useAppUpdate } from '@/hooks/use-app-update';

export function AppUpdateWatcher() {
  useAppUpdate();
  return null;
}
