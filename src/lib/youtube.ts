import { Client } from 'youtubei';

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
  private youtube: Client | null = null;

  private async initYouTube() {
    if (!this.youtube) {
      this.youtube = new Client();
    }
    return this.youtube;
  }

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
   * Get video information
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const youtube = await this.initYouTube();
      const info = await youtube.getInfo(videoId);
      
      if (!info.basic_info) {
        return null;
      }

      return {
        videoId,
        title: info.basic_info.title || 'Unknown Title',
        description: info.basic_info.short_description || '',
        duration: this.formatDuration(info.basic_info.duration?.seconds_total || 0),
        channelName: info.basic_info.channel?.name || 'Unknown Channel',
        thumbnail: info.basic_info.thumbnail?.[0]?.url || '',
        publishedDate: info.primary_info?.published?.text || 'Unknown Date',
        viewCount: info.basic_info.view_count?.toString() || '0',
      };
    } catch (error) {
      console.error('Error getting video info:', error);
      return null;
    }
  }

  /**
   * Get video transcript
   */
  async getTranscript(videoId: string): Promise<YouTubeTranscript | null> {
    try {
      const youtube = await this.initYouTube();
      const info = await youtube.getInfo(videoId);
      
      const transcriptData = await info.getTranscript();
      
      if (!transcriptData?.content?.body?.initial_segments) {
        return null;
      }

      const segments = transcriptData.content.body.initial_segments.map((segment: any) => ({
        text: segment.snippet?.text || '',
        start: segment.start_ms ? segment.start_ms / 1000 : 0,
        duration: segment.end_ms && segment.start_ms 
          ? (segment.end_ms - segment.start_ms) / 1000 
          : 0,
      }));

      const fullText = segments.map(s => s.text).join(' ');

      return {
        text: fullText,
        segments,
      };
    } catch (error) {
      console.error('Error getting transcript:', error);
      return null;
    }
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
}

export const youtubeService = new YouTubeService();
