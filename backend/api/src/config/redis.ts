// Redis compatible interface
interface RedisLike {
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<string | null>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

// In-memory session store (Redis not available in Vercel environment)
class MemoryStore implements RedisLike {
  private store: Map<string, { value: string; expiresAt: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
    return null;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regexStr = '^' + pattern.replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr);
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }
}

const memoryStore = new MemoryStore();

export const connectRedis = async () => {
  console.log('Using in-memory session store (Redis not available in Vercel)');
};

export const getRedisClient = (): RedisLike => {
  return memoryStore;
};

export default {
  get: async (key: string): Promise<string | null> => memoryStore.get(key),
  setEx: async (key: string, seconds: number, value: string): Promise<string | null> => 
    memoryStore.setEx(key, seconds, value),
  del: async (key: string): Promise<number> => memoryStore.del(key),
  keys: async (pattern: string): Promise<string[]> => memoryStore.keys(pattern),
};
