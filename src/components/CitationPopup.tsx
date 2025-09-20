'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Document } from '@langchain/core/documents';
import { cn } from '@/lib/utils';
import { ExternalLink, X } from 'lucide-react';

interface CitationPopupProps {
  source: Document | null;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCitationClick: (source: Document) => void;
}

const CitationPopup: React.FC<CitationPopupProps> = ({
  source,
  isVisible,
  position,
  onClose,
  onCitationClick,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible || !source) return null;

  // Get preview text - first 200 characters of the content
  const previewText = source.pageContent
    ? source.pageContent.substring(0, 200) + (source.pageContent.length > 200 ? '...' : '')
    : 'No content preview available';

  const title = source.metadata?.title || 'Untitled';
  const url = source.metadata?.url || '';

  return (
    <div
      ref={popupRef}
      className={cn(
        'fixed z-[60] bg-white dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg shadow-xl p-4 w-80 max-w-sm',
        'transition-all duration-200 ease-in-out',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: position.x > window.innerWidth - 320 ? 'translateX(-100%)' : 'none'
      }}
      onMouseEnter={() => {
        // Keep popup open while cursor is inside the popup
      }}
      onMouseLeave={() => {
        // Slight delay so users can move between link and popup buttons
        setTimeout(() => onClose(), 250);
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-black dark:text-white line-clamp-2 pr-2">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-light-100 dark:hover:bg-dark-100 rounded transition-colors"
        >
          <X size={14} className="text-black/50 dark:text-white/50" />
        </button>
      </div>

      {/* Preview text */}
      <div className="mb-3">
        <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed">
          {previewText}
        </p>
      </div>

      {/* URL and actions */}
      <div className="flex items-center justify-between pt-2 border-t border-light-200 dark:border-dark-200">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {url !== 'File' && (
            <img
              src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${url}`}
              width={12}
              height={12}
              alt="favicon"
              className="rounded h-3 w-3 flex-shrink-0"
            />
          )}
          <span className="text-xs text-black/50 dark:text-white/50 truncate">
            {url === 'File' ? 'File' : url.replace(/.+\/\/|www.|\..+/g, '')}
          </span>
        </div>

        <button
          onClick={() => source && onCitationClick(source)}
          className="flex items-center space-x-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-xs transition-colors"
        >
          <span>View</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
};

export default CitationPopup;