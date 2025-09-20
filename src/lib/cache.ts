import { createClient, RedisClientType } from 'redis';
import { YouTubeVideoInfo, YouTubeTranscript } from './youtube';
import { getRedisUrl, isCacheEnabled } from './config';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect() {
    if (!isCacheEnabled()) {
      console.log('Cache is disabled');
      return null;
    }

    if (!this.client) {
      try {
        const redisUrl = getRedisUrl();
        this.client = createClient({
          url: redisUrl,
          socket: {
            connectTimeout: 10000,
          },
        });

        this.client.on('error', (err) => {
          console.error('Redis Client Error:', err);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('Redis Client Connected');
          this.isConnected = true;
        });

        this.client.on('disconnect', () => {
          console.log('Redis Client Disconnected');
          this.isConnected = false;
        });

        await this.client.connect();
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        this.client = null;
        this.isConnected = false;
        return null;
      }
    }

    return this.isConnected ? this.client : null;
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // YouTube video metadata cache
  async cacheVideoInfo(videoId: string, info: YouTubeVideoInfo, ttl: number = 3600) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:metadata:${videoId}`, ttl, JSON.stringify(info));
        console.log(`✅ [CACHE] Video metadata cached for ${videoId} (TTL: ${ttl}s)`);
      } else {
        console.log(`⚠️ [CACHE] Cache disabled - video metadata not cached for ${videoId}`);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error caching video info:', error);
    }
  }

  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const client = await this.connect();
      if (client) {
        const cached = await client.get(`youtube:metadata:${videoId}`);
        if (cached) {
          console.log(`🎯 [CACHE HIT] Video metadata retrieved from cache for ${videoId}`);
          return JSON.parse(cached);
        } else {
          console.log(`🔍 [CACHE MISS] Video metadata not found in cache for ${videoId}`);
          return null;
        }
      }
      console.log(`⚠️ [CACHE] Cache disabled - cannot retrieve video metadata for ${videoId}`);
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Error getting cached video info:', error);
      return null;
    }
  }

  // YouTube transcript cache
  async cacheTranscript(videoId: string, transcript: YouTubeTranscript, ttl: number = 7200) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:transcript:${videoId}`, ttl, JSON.stringify(transcript));
        console.log(`✅ [CACHE] Transcript cached for ${videoId} (TTL: ${ttl}s)`);
      } else {
        console.log(`⚠️ [CACHE] Cache disabled - transcript not cached for ${videoId}`);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error caching transcript:', error);
    }
  }

  async getTranscript(videoId: string): Promise<YouTubeTranscript | null> {
    try {
      const client = await this.connect();
      if (client) {
        const cached = await client.get(`youtube:transcript:${videoId}`);
        if (cached) {
          console.log(`🎯 [CACHE HIT] Transcript retrieved from cache for ${videoId}`);
          return JSON.parse(cached);
        } else {
          console.log(`🔍 [CACHE MISS] Transcript not found in cache for ${videoId}`);
          return null;
        }
      }
      console.log(`⚠️ [CACHE] Cache disabled - cannot retrieve transcript for ${videoId}`);
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Error getting cached transcript:', error);
      return null;
    }
  }

  // Summary cache
  async cacheSummary(videoId: string, summary: string, ttl: number = 7200) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:summary:${videoId}`, ttl, summary);
        console.log(`✅ [CACHE] Summary cached for ${videoId} (TTL: ${ttl}s)`);
      } else {
        console.log(`⚠️ [CACHE] Cache disabled - summary not cached for ${videoId}`);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error caching summary:', error);
    }
  }

  async getSummary(videoId: string): Promise<string | null> {
    try {
      const client = await this.connect();
      if (client) {
        const cached = await client.get(`youtube:summary:${videoId}`);
        if (cached) {
          console.log(`🎯 [CACHE HIT] Summary retrieved from cache for ${videoId}`);
          return cached;
        } else {
          console.log(`🔍 [CACHE MISS] Summary not found in cache for ${videoId}`);
          return null;
        }
      }
      console.log(`⚠️ [CACHE] Cache disabled - cannot retrieve summary for ${videoId}`);
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Error getting cached summary:', error);
      return null;
    }
  }

  // Processing status cache
  async setProcessingStatus(videoId: string, status: 'processing' | 'completed' | 'failed', ttl: number = 300) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:processing:${videoId}`, ttl, status);
        console.log(`✅ [CACHE] Processing status set to '${status}' for ${videoId} (TTL: ${ttl}s)`);
      } else {
        console.log(`⚠️ [CACHE] Cache disabled - processing status not cached for ${videoId}`);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error setting processing status:', error);
    }
  }

  async getProcessingStatus(videoId: string): Promise<string | null> {
    try {
      const client = await this.connect();
      if (client) {
        const status = await client.get(`youtube:processing:${videoId}`);
        if (status) {
          console.log(`🎯 [CACHE HIT] Processing status '${status}' retrieved from cache for ${videoId}`);
          return status;
        } else {
          console.log(`🔍 [CACHE MISS] Processing status not found in cache for ${videoId}`);
          return null;
        }
      }
      console.log(`⚠️ [CACHE] Cache disabled - cannot retrieve processing status for ${videoId}`);
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Error getting processing status:', error);
      return null;
    }
  }

  // QA cache methods
  async cacheQA(videoId: string, question: string, answer: string, ttl: number = 3600) {
    try {
      const client = await this.connect();
      if (client) {
        const questionHash = Buffer.from(question).toString('base64').slice(0, 16);
        const key = `youtube:qa:${videoId}:${questionHash}`;
        await client.setEx(key, ttl, JSON.stringify({ question, answer, timestamp: Date.now() }));
        console.log(`✅ [CACHE] QA cached for ${videoId} - Question: "${question.slice(0, 50)}..." (TTL: ${ttl}s)`);
      } else {
        console.log(`⚠️ [CACHE] Cache disabled - QA not cached for ${videoId}`);
      }
    } catch (error) {
      console.error('❌ [CACHE] Error caching QA:', error);
    }
  }

  async getQA(videoId: string, question: string): Promise<{ question: string; answer: string; timestamp: number } | null> {
    try {
      const client = await this.connect();
      if (client) {
        const questionHash = Buffer.from(question).toString('base64').slice(0, 16);
        const key = `youtube:qa:${videoId}:${questionHash}`;
        const cached = await client.get(key);
        if (cached) {
          console.log(`🎯 [CACHE HIT] QA retrieved from cache for ${videoId} - Question: "${question.slice(0, 50)}..."`);
          return JSON.parse(cached);
        } else {
          console.log(`🔍 [CACHE MISS] QA not found in cache for ${videoId} - Question: "${question.slice(0, 50)}..."`);
          return null;
        }
      }
      console.log(`⚠️ [CACHE] Cache disabled - cannot retrieve QA for ${videoId}`);
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Error getting cached QA:', error);
      return null;
    }
  }

  // Generic cache methods
  async set(key: string, value: string, ttl?: number) {
    try {
      const client = await this.connect();
      if (client) {
        if (ttl) {
          await client.setEx(key, ttl, value);
        } else {
          await client.set(key, value);
        }
      }
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = await this.connect();
      if (client) {
        return await client.get(key);
      }
      return null;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  async del(key: string) {
    try {
      const client = await this.connect();
      if (client) {
        await client.del(key);
      }
    } catch (error) {
      console.error('Error deleting cache:', error);
    }
  }
}

export const cacheService = new CacheService();
