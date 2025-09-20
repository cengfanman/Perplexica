'use client';

import { useState, useCallback, useRef } from 'react';
import { YouTubeVideoInfo, YouTubeTranscript } from '@/lib/youtube';

interface YouTubeDetectionResult {
  urls: string[];
  videoIds: string[];
  hasYouTubeContent: boolean;
}

interface YouTubeProcessResult {
  status: 'processing' | 'completed' | 'failed';
  data?: {
    videoInfo: YouTubeVideoInfo;
    transcript: YouTubeTranscript;
  };
  message?: string;
}

export const useYouTube = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [videoData, setVideoData] = useState<Record<string, {
    videoInfo: YouTubeVideoInfo;
    transcript?: YouTubeTranscript;
    summary?: string;
  }>>({});

  const debounceRef = useRef<NodeJS.Timeout>();
  const lastTextRef = useRef<string>('');

  // Detect YouTube URLs in text with debouncing
  const detectYouTubeUrls = useCallback(async (text: string): Promise<YouTubeDetectionResult | null> => {
    if (!text) return null;

    // If text hasn't changed, return cached result
    if (text === lastTextRef.current) {
      return null;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    return new Promise((resolve) => {
      debounceRef.current = setTimeout(async () => {
        if (text === lastTextRef.current || isDetecting) {
          resolve(null);
          return;
        }

        lastTextRef.current = text;
        setIsDetecting(true);

        try {
          const response = await fetch('/api/youtube/detect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
          });

          if (!response.ok) {
            throw new Error('Failed to detect YouTube URLs');
          }

          const result = await response.json();
          resolve(result);
        } catch (error) {
          console.error('Error detecting YouTube URLs:', error);
          resolve(null);
        } finally {
          setIsDetecting(false);
        }
      }, 500); // 500ms debounce delay
    });
  }, [isDetecting]);

  // Process a YouTube video
  const processVideo = useCallback(async (videoId: string): Promise<YouTubeProcessResult | null> => {
    if (!videoId || isProcessing[videoId]) return null;

    setIsProcessing(prev => ({ ...prev, [videoId]: true }));
    try {
      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        throw new Error('Failed to process YouTube video');
      }

      const result = await response.json();
      
      if (result.status === 'completed' && result.data) {
        setVideoData(prev => ({
          ...prev,
          [videoId]: {
            videoInfo: result.data.videoInfo,
            transcript: result.data.transcript,
          },
        }));
      }

      return result;
    } catch (error) {
      console.error('Error processing YouTube video:', error);
      return {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsProcessing(prev => ({ ...prev, [videoId]: false }));
    }
  }, [isProcessing]);

  // Get video transcript
  const getTranscript = useCallback(async (videoId: string): Promise<YouTubeTranscript | null> => {
    try {
      const response = await fetch(`/api/youtube/${videoId}/transcript`);
      
      if (!response.ok) {
        throw new Error('Failed to get transcript');
      }

      const result = await response.json();
      return result.transcript;
    } catch (error) {
      console.error('Error getting transcript:', error);
      return null;
    }
  }, []);

  // Get video summary
  const getSummary = useCallback(async (videoId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/youtube/${videoId}/summary`);
      
      if (!response.ok) {
        throw new Error('Failed to get summary');
      }

      const result = await response.json();
      
      // Update video data with summary
      setVideoData(prev => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          summary: result.summary,
        },
      }));

      return result.summary;
    } catch (error) {
      console.error('Error getting summary:', error);
      return null;
    }
  }, []);

  // Process multiple videos from detection
  const processDetectedVideos = useCallback(async (detection: YouTubeDetectionResult) => {
    if (!detection.hasYouTubeContent) return;

    const promises = detection.videoIds.map(videoId => processVideo(videoId));
    await Promise.all(promises);
  }, [processVideo]);

  return {
    // State
    isDetecting,
    isProcessing,
    videoData,

    // Actions
    detectYouTubeUrls,
    processVideo,
    getTranscript,
    getSummary,
    processDetectedVideos,

    // Helpers
    getVideoData: (videoId: string) => videoData[videoId] || null,
    isVideoProcessing: (videoId: string) => isProcessing[videoId] || false,
  };
};
