'use client';

import React, { useEffect, useState } from 'react';
import { Document } from '@langchain/core/documents';
import { cn } from '@/lib/utils';
import { X, ExternalLink, File } from 'lucide-react';

interface CitationDetailProps {
  source: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

const CitationDetail: React.FC<CitationDetailProps> = ({
  source,
  isOpen,
  onClose,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (source && isOpen) {
      setLoading(true);
      // For now, we'll use the existing content from the source
      // In a real implementation, you might want to fetch the full content
      setContent(source.pageContent || 'No content available');
      setLoading(false);
    }
  }, [source, isOpen]);

  if (!isOpen || !source) return null;

  const title = source.metadata?.title || 'Untitled';
  const url = source.metadata?.url || '';

  // Function to highlight search terms (you can enhance this based on your needs)
  const highlightContent = (text: string) => {
    // This is a simple implementation - you can make it more sophisticated
    return text;
  };

  return (
    <div className={cn(
      'fixed inset-y-0 right-0 w-96 bg-white dark:bg-dark-secondary border-l border-light-200 dark:border-dark-200 z-50 transform transition-transform duration-300 ease-in-out',
      isOpen ? 'translate-x-0' : 'translate-x-full'
    )}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-200 dark:border-dark-200">
          <h2 className="text-lg font-medium text-black dark:text-white">
            Citation Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-100 dark:hover:bg-dark-100 rounded transition-colors"
          >
            <X size={20} className="text-black/50 dark:text-white/50" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title and URL */}
          <div className="space-y-2">
            <h3 className="text-xl font-medium text-black dark:text-white">
              {title}
            </h3>
            <div className="flex items-center space-x-2">
              {url !== 'File' ? (
                <img
                  src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${url}`}
                  width={16}
                  height={16}
                  alt="favicon"
                  className="rounded h-4 w-4"
                />
              ) : (
                <div className="bg-dark-200 flex items-center justify-center w-4 h-4 rounded">
                  <File size={10} className="text-white/70" />
                </div>
              )}
              <span className="text-sm text-black/70 dark:text-white/70">
                {url === 'File' ? 'Local File' : url}
              </span>
              {url !== 'File' && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-light-100 dark:hover:bg-dark-100 rounded transition-colors"
                >
                  <ExternalLink size={14} className="text-black/50 dark:text-white/50" />
                </a>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="border-t border-light-200 dark:border-dark-200 pt-4">
            <h4 className="text-sm font-medium text-black dark:text-white mb-2">
              Content
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div
                  className="text-sm text-black/80 dark:text-white/80 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: highlightContent(content).replace(/\n/g, '<br>')
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitationDetail;