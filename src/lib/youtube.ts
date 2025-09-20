import { getYouTubeApiKey } from './config';

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  duration: string;
  channelName: string;
  thumbnail: string;
  publishedDate: string;
  viewCount: string;
}

export interface YouTubeTranscript {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
}

export class YouTubeService {
  // Simplified service without youtubei dependency

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Detect YouTube URLs in text
   */
  detectYouTubeUrls(text: string): string[] {
    const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\s]+)/g;
    const matches = [];
    let match;
    
    while ((match = urlPattern.exec(text)) !== null) {
      matches.push(match[0]);
    }
    
    return matches;
  }

  /**
   * Get video information using YouTube Data API v3
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const apiKey = getYouTubeApiKey();
      if (!apiKey) {
        console.log('YouTube API key not configured, using basic info');
        return {
          videoId,
          title: `YouTube Video (${videoId})`,
          description: 'Video description not available - YouTube API key required',
          duration: '0:00',
          channelName: 'Unknown Channel',
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          publishedDate: 'Unknown Date',
          viewCount: '0',
        };
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const video = data.items[0];
      const snippet = video.snippet;
      const statistics = video.statistics;
      const contentDetails = video.contentDetails;

      return {
        videoId,
        title: snippet.title || 'Unknown Title',
        description: snippet.description || '',
        duration: this.parseDuration(contentDetails.duration || ''),
        channelName: snippet.channelTitle || 'Unknown Channel',
        thumbnail: snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        publishedDate: new Date(snippet.publishedAt).toLocaleDateString() || 'Unknown Date',
        viewCount: statistics.viewCount || '0',
      };
    } catch (error) {
      console.error('Error getting video info:', error);
      return null;
    }
  }

  /**
   * Get video transcript (simplified version)
   */
  async getTranscript(videoId: string): Promise<YouTubeTranscript | null> {
    // Return null for now - transcript not available in simplified mode
    console.log('Transcript not available in simplified mode for video:', videoId);
    return null;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private parseDuration(duration: string): string {
    // Parse ISO 8601 duration format (PT4M13S -> 4:13)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export const youtubeService = new YouTubeService();
