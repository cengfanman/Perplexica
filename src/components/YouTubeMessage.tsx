'use client';

import React, { useEffect, useState } from 'react';
import { Youtube, Loader2, AlertCircle } from 'lucide-react';
import YouTubePlayer from './YouTubePlayer';
import { useYouTube } from '@/lib/hooks/useYouTube';

interface YouTubeMessageProps {
  videoIds: string[];
  messageContent: string;
}

const YouTubeMessage: React.FC<YouTubeMessageProps> = ({ videoIds, messageContent }) => {
  const { processVideo, getSummary, videoData, isVideoProcessing } = useYouTube();
  const [processingStatus, setProcessingStatus] = useState<Record<string, 'idle' | 'processing' | 'completed' | 'failed'>>({});

  useEffect(() => {
    const processVideos = async () => {
      for (const videoId of videoIds) {
        // Check if video is already processed or being processed
        if (processingStatus[videoId] === 'completed' ||
            processingStatus[videoId] === 'processing' ||
            videoData[videoId]) {
          continue;
        }

        setProcessingStatus(prev => ({ ...prev, [videoId]: 'processing' }));

        try {
          const result = await processVideo(videoId);
          if (result?.status === 'completed') {
            setProcessingStatus(prev => ({ ...prev, [videoId]: 'completed' }));
            // Get summary
            await getSummary(videoId);
          } else {
            setProcessingStatus(prev => ({ ...prev, [videoId]: 'failed' }));
          }
        } catch (error) {
          console.error('Error processing video:', error);
          setProcessingStatus(prev => ({ ...prev, [videoId]: 'failed' }));
        }
      }
    };

    processVideos();
  }, [videoIds, processVideo, getSummary, videoData]); // 移除 processingStatus 依赖

  if (videoIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Original message content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-black dark:text-white">{messageContent}</p>
      </div>

      {/* YouTube videos */}
      <div className="space-y-4">
        {videoIds.map((videoId) => {
          const status = processingStatus[videoId] || 'idle';
          const data = videoData[videoId];
          const isProcessing = isVideoProcessing(videoId);

          return (
            <div key={videoId} className="border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden">
              {status === 'processing' || isProcessing ? (
                <div className="flex items-center justify-center p-8 bg-light-50 dark:bg-dark-100">
                  <div className="flex items-center space-x-3">
                    <Loader2 size={20} className="animate-spin text-blue-600" />
                    <span className="text-sm text-black/70 dark:text-white/70">
                      Processing YouTube video...
                    </span>
                  </div>
                </div>
              ) : status === 'failed' ? (
                <div className="flex items-center justify-center p-8 bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-center space-x-3">
                    <AlertCircle size={20} className="text-red-500" />
                    <div className="text-sm">
                      <p className="text-red-600 dark:text-red-400">Failed to process video</p>
                      <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                        The video may not have transcripts available or be private
                      </p>
                    </div>
                  </div>
                </div>
              ) : status === 'completed' && data ? (
                <YouTubePlayer
                  videoInfo={data.videoInfo}
                  transcript={data.transcript}
                  summary={data.summary}
                  onTranscriptClick={(timestamp) => {
                    // TODO: Implement seek to timestamp in embedded player
                    console.log('Seek to:', timestamp);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center p-8 bg-light-50 dark:bg-dark-100">
                  <div className="flex items-center space-x-3">
                    <Youtube size={20} className="text-red-500" />
                    <span className="text-sm text-black/70 dark:text-white/70">
                      YouTube video: {videoId}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YouTubeMessage;
