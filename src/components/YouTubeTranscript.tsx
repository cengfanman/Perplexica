'use client';

import React, { useState, useCallback } from 'react';
import { Clock, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { YouTubeTranscript } from '@/lib/youtube';

interface YouTubeTranscriptProps {
  transcript: YouTubeTranscript | null;
  onTimestampClick?: (timestamp: number) => void;
  className?: string;
}

const YouTubeTranscriptComponent: React.FC<YouTubeTranscriptProps> = ({
  transcript,
  onTimestampClick,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const formatTimestamp = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 可以添加成功提示
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  const downloadTranscript = useCallback(() => {
    if (!transcript) return;

    const transcriptText = transcript.segments
      .map(segment => `[${formatTimestamp(segment.start)}] ${segment.text}`)
      .join('\n');

    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube-transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [transcript, formatTimestamp]);

  const filteredSegments = React.useMemo(() => {
    if (!transcript || !searchTerm) return transcript?.segments || [];

    return transcript.segments.filter(segment =>
      segment.text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transcript, searchTerm]);

  if (!transcript) {
    return (
      <div className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">
            字幕不可用或正在加载中...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-light-50 dark:bg-dark-100 px-4 py-3 border-b border-light-200 dark:border-dark-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-black dark:text-white">
              视频字幕 ({transcript.segments.length} 段)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(transcript.text)}
              className="p-1.5 hover:bg-light-200 dark:hover:bg-dark-200 rounded"
              title="复制全部字幕"
            >
              <Copy size={14} className="text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={downloadTranscript}
              className="p-1.5 hover:bg-light-200 dark:hover:bg-dark-200 rounded"
              title="下载字幕"
            >
              <Download size={14} className="text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-light-200 dark:hover:bg-dark-200 rounded"
            >
              {isExpanded ? (
                <ChevronUp size={14} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown size={14} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        {isExpanded && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="搜索字幕..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-light-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {filteredSegments.length > 0 ? (
            <div className="p-4 space-y-3">
              {filteredSegments.map((segment, index) => (
                <div
                  key={index}
                  className="flex gap-3 hover:bg-light-50 dark:hover:bg-dark-100 rounded p-2 transition-colors"
                >
                  <button
                    onClick={() => onTimestampClick?.(segment.start)}
                    className="flex-shrink-0 text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                    title="跳转到此时间点"
                  >
                    {formatTimestamp(segment.start)}
                  </button>

                  <p className="text-sm text-black dark:text-white leading-relaxed flex-1">
                    {searchTerm ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: segment.text.replace(
                            new RegExp(`(${searchTerm})`, 'gi'),
                            '<mark class="bg-yellow-200 dark:bg-yellow-600">$1</mark>'
                          ),
                        }}
                      />
                    ) : (
                      segment.text
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              没有找到匹配的字幕内容
            </div>
          )}
        </div>
      )}

      {/* Collapsed preview */}
      {!isExpanded && (
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {transcript.text.length > 150
              ? `${transcript.text.substring(0, 150)}...`
              : transcript.text
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default YouTubeTranscriptComponent;