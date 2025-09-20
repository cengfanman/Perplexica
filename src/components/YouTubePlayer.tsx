'use client';

import React, { useState, useRef } from 'react';
import { Play, Clock, User, Eye, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { YouTubeVideoInfo, YouTubeTranscript } from '@/lib/youtube';
import YouTubeTranscriptComponent from './YouTubeTranscript';
import YouTubeQA from './YouTubeQA';
import { cn } from '@/lib/utils';

interface YouTubePlayerProps {
  videoInfo: YouTubeVideoInfo;
  transcript?: YouTubeTranscript;
  summary?: string;
  onTranscriptClick?: (timestamp: number) => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoInfo,
  transcript,
  summary,
  onTranscriptClick,
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return count;
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimestampClick = (timestamp: number) => {
    // Try to jump to timestamp in the embedded player
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      const baseUrl = currentSrc.split('?')[0];
      const newSrc = `${baseUrl}?start=${Math.floor(timestamp)}&autoplay=1&rel=0`;
      iframeRef.current.src = newSrc;
    }

    // Also call the provided callback
    onTranscriptClick?.(timestamp);
  };

  return (
    <div className="bg-white dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden shadow-sm">
      {/* Video Player */}
      <div className="relative aspect-video bg-black">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoInfo.videoId}?rel=0&enablejsapi=1`}
          title={videoInfo.title}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-black dark:text-white mb-2 line-clamp-2">
          {videoInfo.title}
        </h3>

        <div className="flex items-center space-x-4 text-sm text-black/70 dark:text-white/70 mb-3">
          <div className="flex items-center space-x-1">
            <User size={14} />
            <span>{videoInfo.channelName}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye size={14} />
            <span>{formatViewCount(videoInfo.viewCount)} views</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{videoInfo.duration}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar size={14} />
            <span>{videoInfo.publishedDate}</span>
          </div>
        </div>

        {videoInfo.description && (
          <p className="text-sm text-black/80 dark:text-white/80 line-clamp-3 mb-4">
            {videoInfo.description}
          </p>
        )}

        {/* Summary Section */}
        {summary && (
          <div className="mb-4">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="flex items-center justify-between w-full p-3 bg-light-50 dark:bg-dark-100 rounded-lg hover:bg-light-100 dark:hover:bg-dark-200 transition-colors"
            >
              <span className="font-medium text-black dark:text-white">
                AI Summary
              </span>
              {showSummary ? (
                <ChevronUp size={16} className="text-black/50 dark:text-white/50" />
              ) : (
                <ChevronDown size={16} className="text-black/50 dark:text-white/50" />
              )}
            </button>
            
            {showSummary && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div 
                  className="text-sm text-black/80 dark:text-white/80 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br>') }}
                />
              </div>
            )}
          </div>
        )}

        {/* Transcript Section */}
        <YouTubeTranscriptComponent
          transcript={transcript || null}
          onTimestampClick={handleTimestampClick}
          className="mb-4"
        />

        {/* QA Section */}
        <YouTubeQA
          videoInfo={videoInfo}
          transcript={transcript}
          summary={summary}
          onTimestampClick={handleTimestampClick}
          className="mb-4"
        />
      </div>
    </div>
  );
};

export default YouTubePlayer;
