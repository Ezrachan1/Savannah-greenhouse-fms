/**
 * Offline Indicator Component
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setOnlineStatus, syncPendingItems } from '@/store/slices/syncSlice';

export default function OfflineIndicator() {
  const dispatch = useDispatch();
  const { isOnline, pendingCount, isSyncing } = useSelector((state) => state.sync);

  useEffect(() => {
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));
      // Auto-sync when coming back online
      if (pendingCount > 0) {
        dispatch(syncPendingItems());
      }
    };

    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status
    dispatch(setOnlineStatus(navigator.onLine));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, pendingCount]);

  // Don't show anything if online and no pending items
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${isOnline ? 'animate-fade-in' : ''}`}>
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="font-medium">You're offline</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
              {pendingCount} pending
            </span>
          )}
        </div>
      )}
      
      {isOnline && isSyncing && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="spinner border-white" />
          <span className="font-medium">Syncing...</span>
        </div>
      )}
    </div>
  );
}
