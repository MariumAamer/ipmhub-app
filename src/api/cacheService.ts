// Simple in-memory cache
// No external dependencies needed!

interface CacheItem {
  data: any[];
  timestamp: number;
}

const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

let memoryCache: CacheItem | null = null;

export const getCachedCountries = async (): Promise<any[] | null> => {
  try {
    if (!memoryCache) {
      return null;
    }

    const isExpired = Date.now() - memoryCache.timestamp > CACHE_EXPIRY;

    if (isExpired) {
      memoryCache = null;
      return null;
    }

    console.log('Using cached countries');
    return memoryCache.data;
  } catch (error) {
    console.log('Cache read error:', error);
    return null;
  }
};

export const cacheCountries = async (countries: any[]): Promise<void> => {
  try {
    memoryCache = {
      data: countries,
      timestamp: Date.now(),
    };
    console.log('Countries cached in memory:', countries.length);
  } catch (error) {
    console.log('Cache write error:', error);
  }
};

export const clearCache = (): void => {
  memoryCache = null;
  console.log('Cache cleared');
};
