'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  const [webHtml, setWebHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (source && isOpen) {
      setLoading(true);
      // Clear previous web content immediately when switching citations
      setWebHtml('');
      setContent(source.pageContent || 'No content available');
      
      const url = source.metadata?.url;
      if (url && url !== 'File') {
        // Fetch the full web page HTML
        fetch(`/api/proxy/page?url=${encodeURIComponent(url)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.html) {
              setWebHtml(data.html);
            }
            setLoading(false);
          })
          .catch((error) => {
            console.error('Failed to fetch page:', error);
            setWebHtml('');
            setLoading(false);
          });
      } else {
        setWebHtml('');
        setLoading(false);
      }
    } else if (!isOpen) {
      // Clear content when sidebar is closed
      setWebHtml('');
      setContent('');
    }
  }, [source, isOpen]);

  if (!isOpen || !source) return null;

  const title = source.metadata?.title || 'Untitled';
  const url = source.metadata?.url || '';

  // Function to highlight the citation content in the web page
  const highlightWebContent = (html: string, citationText: string) => {
    if (!citationText || !html) return html;
    
    // Try different matching strategies
    const strategies = [
      // Strategy 1: First 80 characters
      citationText.trim().slice(0, 80),
      // Strategy 2: First sentence
      citationText.trim().split(/[.!?]/)[0],
      // Strategy 3: Key phrase (20-50 chars)
      citationText.trim().slice(10, 60),
      // Strategy 4: Last part if it's long
      citationText.length > 100 ? citationText.trim().slice(-60) : ''
    ];
    
    let highlightedHtml = html;
    let highlightFound = false;
    
    for (const snippet of strategies) {
      if (!snippet || snippet.length < 15) continue;
      
      try {
        const cleanSnippet = snippet
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\s+/g, '\\s+')
          .replace(/[""'']/g, '[""\'\'`]'); // Handle different quote types
        
        const regex = new RegExp(`(${cleanSnippet})`, 'gi');
        const testMatch = html.match(regex);
        
        if (testMatch) {
          highlightedHtml = html.replace(regex, '<mark class="citation-highlight" id="citation-highlight" style="background-color: #93c5fd; padding: 2px 4px; border-radius: 3px; box-shadow: 0 0 0 2px #3b82f6;">$1</mark>');
          highlightFound = true;
          break;
        }
      } catch (error) {
        console.warn('Regex error for snippet:', snippet, error);
        continue;
      }
    }
    
    // Enhanced CSS for better highlighting
    const enhancedCSS = `
      <style>
        .citation-highlight {
          background-color: #93c5fd !important;
          color: #1e40af !important;
          padding: 3px 6px !important;
          border-radius: 4px !important;
          box-shadow: 0 0 0 2px #3b82f6 !important;
          font-weight: 500 !important;
          animation: highlight-pulse 2s ease-in-out;
        }
        @keyframes highlight-pulse {
          0%, 100% { box-shadow: 0 0 0 2px #3b82f6; }
          50% { box-shadow: 0 0 0 4px #3b82f6; }
        }
      </style>
    `;
    
    // Add auto-scroll script only if highlight was found
    const scrollScript = highlightFound ? `
      <script>
        window.addEventListener('load', function() {
          setTimeout(() => {
            const highlight = document.getElementById('citation-highlight');
            if (highlight) {
              highlight.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
              // Flash effect to draw attention
              highlight.style.animation = 'highlight-pulse 2s ease-in-out';
            }
          }, 800);
        });
      </script>
    ` : '';
    
    return enhancedCSS + highlightedHtml + scrollScript;
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
            ) : webHtml ? (
              <div className="space-y-4">
                {/* Web page preview */}
                <div>
                  <h5 className="text-xs font-medium text-black dark:text-white mb-2 uppercase tracking-wide">
                    Web Page Preview
                  </h5>
                  <div className="relative w-full h-[60vh] border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden bg-white">
                    <iframe
                      key={`${source.metadata?.url}-${Date.now()}`}
                      ref={iframeRef}
                      srcDoc={highlightWebContent(webHtml, content)}
                      className="w-full h-full"
                      sandbox="allow-same-origin allow-scripts"
                      title="Citation Source"
                    />
                  </div>
                </div>
                
                {/* Original citation text with highlighting */}
                <div>
                  <h5 className="text-xs font-medium text-black dark:text-white mb-2 uppercase tracking-wide">
                    Citation Text
                  </h5>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div
                      className="text-sm text-black/80 dark:text-white/80 leading-relaxed whitespace-pre-wrap p-3 bg-light-50 dark:bg-dark-100 rounded border border-light-200 dark:border-dark-200"
                      dangerouslySetInnerHTML={{
                        __html: content.replace(/\n/g, '<br>')
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : url && url !== 'File' ? (
              <div className="space-y-4">
                {/* Failed to load web page - show fallback */}
                <div>
                  <h5 className="text-xs font-medium text-black dark:text-white mb-2 uppercase tracking-wide">
                    Web Page (Failed to Load)
                  </h5>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                      Could not load the web page content. This might be due to:
                    </p>
                    <ul className="text-xs text-red-500 dark:text-red-400 list-disc list-inside space-y-1">
                      <li>CORS restrictions</li>
                      <li>Site blocking automated requests</li>
                      <li>Network connectivity issues</li>
                    </ul>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-3 px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs transition-colors"
                    >
                      <span>Open Original Page</span>
                      <ExternalLink size={12} className="ml-1" />
                    </a>
                  </div>
                </div>
                
                {/* Citation text */}
                <div>
                  <h5 className="text-xs font-medium text-black dark:text-white mb-2 uppercase tracking-wide">
                    Citation Text
                  </h5>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div
                      className="text-sm text-black/80 dark:text-white/80 leading-relaxed whitespace-pre-wrap p-3 bg-light-50 dark:bg-dark-100 rounded border border-light-200 dark:border-dark-200"
                      dangerouslySetInnerHTML={{
                        __html: content.replace(/\n/g, '<br>')
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div
                  className="text-sm text-black/80 dark:text-white/80 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: content.replace(/\n/g, '<br>')
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