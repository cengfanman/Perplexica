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
        const errorText = await response.text();
        console.error(`YouTube API error ${response.status}:`, errorText);

        // Handle specific error cases
        if (response.status === 403) {
          console.error('YouTube API quota exceeded or access denied');
          // Return fallback info instead of null
          return {
            videoId,
            title: `YouTube Video (${videoId})`,
            description: 'Video info unavailable - API quota exceeded',
            duration: '0:00',
            channelName: 'Unknown Channel',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            publishedDate: 'Unknown Date',
            viewCount: '0',
          };
        }

        if (response.status === 404) {
          console.error('Video not found or invalid video ID');
          return null;
        }

        throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        console.warn('No video data returned from YouTube API');
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
      // Return fallback info instead of null for better user experience
      return {
        videoId,
        title: `YouTube Video (${videoId})`,
        description: 'Video info temporarily unavailable',
        duration: '0:00',
        channelName: 'Unknown Channel',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        publishedDate: 'Unknown Date',
        viewCount: '0',
      };
    }
  }

  /**
   * Get video transcript
   */
  async getTranscript(videoId: string): Promise<YouTubeTranscript | null> {
    try {
      // First, check if captions are available via YouTube API
      const apiKey = getYouTubeApiKey();
      if (!apiKey) {
        console.log('YouTube API key not available for transcript');
        return this.getMockTranscript(videoId);
      }

      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
      );

      if (!captionsResponse.ok) {
        console.log(`Captions API error: ${captionsResponse.status}`);
        return this.getMockTranscript(videoId);
      }

      const captionsData = await captionsResponse.json();

      if (!captionsData.items || captionsData.items.length === 0) {
        console.log('No captions available for this video');
        return this.getMockTranscript(videoId);
      }

      // For now, return a mock transcript indicating captions are available
      // Note: Actually downloading caption files requires OAuth2 authentication
      return this.getMockTranscript(videoId, true);
    } catch (error) {
      console.error('Error getting transcript:', error);
      return this.getMockTranscript(videoId);
    }
  }

  /**
   * Generate a mock transcript for demonstration purposes
   */
  private getMockTranscript(videoId: string, captionsAvailable: boolean = false): YouTubeTranscript {
    if (captionsAvailable) {
      // Generate a realistic mock transcript for demo
      const mockSegments = [
        { text: "Welcome to this video presentation.", start: 0, duration: 3 },
        { text: "Today we'll be discussing important topics.", start: 3, duration: 4 },
        { text: "This is a demonstration of the transcript feature.", start: 7, duration: 5 },
        { text: "The actual transcript extraction requires OAuth2 authentication.", start: 12, duration: 6 },
        { text: "For now, this shows how the transcript display would work.", start: 18, duration: 5 },
        { text: "You can click on timestamps to jump to specific parts.", start: 23, duration: 4 },
        { text: "This feature enhances the video viewing experience significantly.", start: 27, duration: 5 },
        { text: "Thank you for watching and exploring this functionality.", start: 32, duration: 4 }
      ];

      return {
        text: mockSegments.map(s => s.text).join(' '),
        segments: mockSegments,
      };
    }

    return {
      text: 'Transcript not available for this video. Captions may not be enabled or accessible.',
      segments: [{
        text: 'Transcript not available for this video. Captions may not be enabled or accessible.',
        start: 0,
        duration: 0,
      }],
    };
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
