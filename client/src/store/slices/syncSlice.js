/**
 * Sync Slice - Manages offline sync state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';
import { db } from '@/db';

const initialState = {
  isOnline: navigator.onLine,
  pendingCount: 0,
  lastSyncTime: null,
  isSyncing: false,
  syncError: null,
};

// Sync pending items to server
export const syncPendingItems = createAsyncThunk(
  'sync/syncPending',
  async (_, { rejectWithValue }) => {
    try {
      // Get pending items from IndexedDB
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
      
      if (pendingItems.length === 0) {
        return { synced: 0 };
      }
      
      // Send to server
      const response = await api.post('/sync/batch', { items: pendingItems });
      
      // Update local status based on results
      for (const result of response.data.data.results) {
        if (result.status === 'success') {
          await db.syncQueue.update(result.client_id, { 
            status: 'completed',
            server_id: result.server_id,
            synced_at: new Date()
          });
        }
      }
      
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    setPendingCount: (state, action) => {
      state.pendingCount = action.payload;
    },
    incrementPendingCount: (state) => {
      state.pendingCount += 1;
    },
    decrementPendingCount: (state) => {
      state.pendingCount = Math.max(0, state.pendingCount - 1);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncPendingItems.pending, (state) => {
        state.isSyncing = true;
        state.syncError = null;
      })
      .addCase(syncPendingItems.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.lastSyncTime = new Date().toISOString();
        state.pendingCount = Math.max(0, state.pendingCount - (action.payload.synced || 0));
      })
      .addCase(syncPendingItems.rejected, (state, action) => {
        state.isSyncing = false;
        state.syncError = action.payload;
      });
  },
});

export const {
  setOnlineStatus,
  setPendingCount,
  incrementPendingCount,
  decrementPendingCount,
} = syncSlice.actions;

export default syncSlice.reducer;
