'use client';

import React from 'react';
import { Document } from '@langchain/core/documents';
import CitationLink from './CitationLink';

interface CitationRendererProps {
  children: React.ReactNode;
  sources: Document[];
  onCitationHover: (hovering: boolean, source: Document | null, position: { x: number; y: number }) => void;
  onCitationClick: (source: Document) => void;
}

const CitationRenderer: React.FC<CitationRendererProps> = ({
  children,
  sources,
  onCitationHover,
  onCitationClick,
}) => {
  const renderTextWithCitations = (text: string) => {
    const citationRegex = /\[([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const capturedContent = match[1];
      const numbers = capturedContent.split(',').map((numStr) => numStr.trim());
      const links = numbers
        .map((numStr, idx) => {
          const number = parseInt(numStr);
          if (isNaN(number) || number <= 0) return `[${numStr}]`;
          const source = sources[number - 1];
          if (!source?.metadata?.url) return null;
          return (
            <CitationLink
              key={`${number}-${idx}-${match!.index}`}
              number={numStr}
              source={source}
              onCitationClick={onCitationClick}
              onHoverChange={onCitationHover}
            />
          );
        })
        .filter(Boolean);
      parts.push(<span key={`c-${match.index}`}>{links}</span>);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  if (typeof children === 'string') {
    return <>{renderTextWithCitations(children)}</>;
  }

  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, idx) =>
          typeof child === 'string' ? (
            <span key={idx}>{renderTextWithCitations(child)}</span>
          ) : (
            child
          ),
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default CitationRenderer;