import { createClient, RedisClientType } from 'redis';
import { YouTubeVideoInfo, YouTubeTranscript } from './youtube';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return null;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  // YouTube video metadata cache
  async cacheVideoInfo(videoId: string, info: YouTubeVideoInfo, ttl: number = 3600) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:metadata:${videoId}`, ttl, JSON.stringify(info));
      }
    } catch (error) {
      console.error('Error caching video info:', error);
    }
  }

  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const client = await this.connect();
      if (client) {
        const cached = await client.get(`youtube:metadata:${videoId}`);
        return cached ? JSON.parse(cached) : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting cached video info:', error);
      return null;
    }
  }

  // YouTube transcript cache
  async cacheTranscript(videoId: string, transcript: YouTubeTranscript, ttl: number = 7200) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:transcript:${videoId}`, ttl, JSON.stringify(transcript));
      }
    } catch (error) {
      console.error('Error caching transcript:', error);
    }
  }

  async getTranscript(videoId: string): Promise<YouTubeTranscript | null> {
    try {
      const client = await this.connect();
      if (client) {
        const cached = await client.get(`youtube:transcript:${videoId}`);
        return cached ? JSON.parse(cached) : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting cached transcript:', error);
      return null;
    }
  }

  // Summary cache
  async cacheSummary(videoId: string, summary: string, ttl: number = 7200) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:summary:${videoId}`, ttl, summary);
      }
    } catch (error) {
      console.error('Error caching summary:', error);
    }
  }

  async getSummary(videoId: string): Promise<string | null> {
    try {
      const client = await this.connect();
      if (client) {
        return await client.get(`youtube:summary:${videoId}`);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached summary:', error);
      return null;
    }
  }

  // Processing status cache
  async setProcessingStatus(videoId: string, status: 'processing' | 'completed' | 'failed', ttl: number = 300) {
    try {
      const client = await this.connect();
      if (client) {
        await client.setEx(`youtube:processing:${videoId}`, ttl, status);
      }
    } catch (error) {
      console.error('Error setting processing status:', error);
    }
  }

  async getProcessingStatus(videoId: string): Promise<string | null> {
    try {
      const client = await this.connect();
      if (client) {
        return await client.get(`youtube:processing:${videoId}`);
      }
      return null;
    } catch (error) {
      console.error('Error getting processing status:', error);
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
