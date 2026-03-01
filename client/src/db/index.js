/**
 * ============================================
 * Dexie.js - IndexedDB Database for Offline
 * ============================================
 */

import Dexie from 'dexie';

// Create database instance
export const db = new Dexie('FarmManagementDB');

// Define database schema
db.version(1).stores({
  // Sync queue for offline operations
  syncQueue: '++id, client_id, entity_type, operation, status, created_at',
  
  // Cached data from server
  greenhouses: 'id, name, code, status, updated_at',
  crops: 'id, name, code, category, updated_at',
  seedlingBatches: 'id, batch_number, crop_id, greenhouse_id, status, updated_at',
  productionLogs: 'id, batch_id, activity_type, log_date, updated_at',
  inventoryItems: 'id, name, code, category_id, updated_at',
  customers: 'id, name, customer_code, phone, updated_at',
  sales: 'id, sale_number, customer_id, sale_date, updated_at',
  
  // Local drafts
  draftSales: '++id, created_at',
  draftBatches: '++id, created_at',
  draftExpenses: '++id, created_at',
});

/**
 * Add item to sync queue for later sync
 */
export const addToSyncQueue = async (entityType, operation, payload) => {
  const clientId = `${entityType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await db.syncQueue.add({
    client_id: clientId,
    entity_type: entityType,
    operation,
    payload,
    status: 'pending',
    created_at: new Date().toISOString(),
    attempts: 0,
  });
  
  return clientId;
};

/**
 * Get pending sync items count
 */
export const getPendingCount = async () => {
  return db.syncQueue.where('status').equals('pending').count();
};

/**
 * Cache server data locally
 */
export const cacheData = async (tableName, data) => {
  const table = db.table(tableName);
  if (Array.isArray(data)) {
    await table.bulkPut(data);
  } else {
    await table.put(data);
  }
};

/**
 * Get cached data
 */
export const getCachedData = async (tableName, query = {}) => {
  const table = db.table(tableName);
  
  if (query.id) {
    return table.get(query.id);
  }
  
  let collection = table.toCollection();
  
  if (query.where) {
    collection = table.where(query.where.field).equals(query.where.value);
  }
  
  if (query.limit) {
    collection = collection.limit(query.limit);
  }
  
  return collection.toArray();
};

/**
 * Clear all cached data
 */
export const clearCache = async () => {
  await db.greenhouses.clear();
  await db.crops.clear();
  await db.seedlingBatches.clear();
  await db.productionLogs.clear();
  await db.inventoryItems.clear();
  await db.customers.clear();
  await db.sales.clear();
};

export default db;
