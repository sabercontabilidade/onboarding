import Redis from 'ioredis';

if (!process.env.CACHE_URL) {
  throw new Error(
    "CACHE_URL must be set. Did you forget to configure Redis?",
  );
}

// Create Redis client
export const redis = new Redis(process.env.CACHE_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

// Alias for compatibility
export const redisClient = redis;

// Test Redis connection
redis.on('connect', () => {
  console.log('✅ Connected to Redis cache');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('ready', () => {
  console.log('🚀 Redis is ready to accept commands');
});

// Connect to Redis
redis.connect().catch((err) => {
  console.error('❌ Failed to connect to Redis:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await redis.quit();
  console.log('🔌 Redis connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redis.quit();
  console.log('🔌 Redis connection closed');
  process.exit(0);
});

// ========================================
// CACHE UTILITIES
// ========================================

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with TTL (in seconds)
 */
export async function setCache(key: string, value: any, ttl: number = 3600): Promise<boolean> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete cache by key
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete cache by pattern (e.g., "user:*")
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    const pipeline = redis.pipeline();
    keys.forEach(key => pipeline.del(key));
    await pipeline.exec();

    return keys.length;
  } catch (error) {
    console.error(`Error deleting cache pattern ${pattern}:`, error);
    return 0;
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<boolean> {
  try {
    await redis.flushdb();
    return true;
  } catch (error) {
    console.error('Error clearing all cache:', error);
    return false;
  }
}

/**
 * Get or set cache (cache-aside pattern)
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = await getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch from source
    const data = await fetchFn();

    // Store in cache for next time
    await setCache(key, data, ttl);

    return data;
  } catch (error) {
    console.error(`Error in getCachedOrFetch for key ${key}:`, error);
    // If cache fails, still return the fetched data
    return await fetchFn();
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  TEN_MINUTES: 600,
  THIRTY_MINUTES: 1800,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
} as const;

/**
 * Cache key prefixes for organization
 */
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,
  USER_PERMISSIONS: (id: string) => `user:permissions:${id}`,
  CLIENT: (id: string) => `client:${id}`,
  CLIENTS_LIST: 'clients:list',
  DASHBOARD_METRICS: 'dashboard:metrics',
  DASHBOARD_COUNTS: 'dashboard:counts',
  ONBOARDING_STAGES: (clientId: string) => `onboarding:${clientId}`,
  ONBOARDING_PROGRESS: (clientId: string) => `onboarding:progress:${clientId}`,
  ONBOARDING_STATS: 'onboarding:stats',
  APPOINTMENTS: (clientId?: string) => clientId ? `appointments:client:${clientId}` : 'appointments:all',
  VISITS: (clientId?: string) => clientId ? `visits:client:${clientId}` : 'visits:all',
  ACTIVITIES: (clientId?: string) => clientId ? `activities:client:${clientId}` : 'activities:recent',
} as const;
