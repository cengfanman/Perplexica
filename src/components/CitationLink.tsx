'use client';

import React, { useRef } from 'react';
import { Document } from '@langchain/core/documents';
import { cn } from '@/lib/utils';

interface CitationLinkProps {
  number: string;
  source: Document;
  onCitationClick: (source: Document) => void;
  onHoverChange: (hovering: boolean, source: Document | null, position: { x: number; y: number }) => void;
}

const CitationLink: React.FC<CitationLinkProps> = ({
  number,
  source,
  onCitationClick,
  onHoverChange,
}) => {
  const linkRef = useRef<HTMLSpanElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.bottom + 5,
      };
      onHoverChange(true, source, position);
    }
  };

  const handleMouseLeave = () => {
    // Do not immediately close when leaving the link; the popup will
    // manage its own visibility on mouse leave to allow cursor travel.
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCitationClick(source);
  };

  return (
    <span
      ref={linkRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative cursor-pointer',
        'hover:bg-light-200 dark:hover:bg-dark-200 transition-colors duration-200'
      )}
    >
      {number}
    </span>
  );
};

export default CitationLink;