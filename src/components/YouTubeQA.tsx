'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Bot, User, ChevronDown, ChevronUp, Trash2, RotateCcw } from 'lucide-react';
import { YouTubeVideoInfo, YouTubeTranscript } from '@/lib/youtube';

interface QAMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  relatedTimestamp?: number; // 相关的视频时间戳
}

interface YouTubeQAProps {
  videoInfo: YouTubeVideoInfo;
  transcript?: YouTubeTranscript;
  summary?: string;
  onTimestampClick?: (timestamp: number) => void;
  className?: string;
}

const YouTubeQA: React.FC<YouTubeQAProps> = ({
  videoInfo,
  transcript,
  summary,
  onTimestampClick,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 从localStorage加载历史记录
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem(`youtube-qa-${videoInfo.videoId}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } catch (error) {
          console.error('Error loading saved messages:', error);
        }
      }
    }
  }, [videoInfo.videoId]);

  // 保存历史记录到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem(`youtube-qa-${videoInfo.videoId}`, JSON.stringify(messages));
    }
  }, [messages, videoInfo.videoId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const suggestedQuestions = [
    '这个视频的主要观点是什么？',
    '视频中提到了哪些重要概念？',
    '能总结一下视频的核心内容吗？',
    '这个演讲者的主要论点是什么？',
    '视频中有哪些值得记住的要点？'
  ];

  const handleQuestionSubmit = async (question: string) => {
    if (!question.trim()) return;

    const userMessage: QAMessage = {
      id: generateId(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/youtube/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoInfo.videoId,
          question,
          videoInfo,
          transcript,
          summary,
          context: messages.slice(-5), // 发送最近5条消息作为上下文
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();

      const assistantMessage: QAMessage = {
        id: generateId(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        relatedTimestamp: data.relatedTimestamp,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting answer:', error);

      const errorMessage: QAMessage = {
        id: generateId(),
        type: 'assistant',
        content: '抱歉，我无法回答这个问题。请稍后再试。',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setCurrentQuestion(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuestionSubmit(currentQuestion);
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const clearHistory = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`youtube-qa-${videoInfo.videoId}`);
    }
  };

  return (
    <div className={`border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-light-50 dark:bg-dark-100 px-4 py-3 border-b border-light-200 dark:border-dark-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-black dark:text-white">
              视频问答 {messages.length > 0 && `(${messages.length} 条对话)`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-1.5 hover:bg-light-200 dark:hover:bg-dark-200 rounded"
                title="清除对话历史"
              >
                <Trash2 size={14} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}

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
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex flex-col h-96">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  你可以询问关于这个视频的任何问题
                </p>

                {/* Suggested Questions */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">建议问题：</p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="block w-full text-left text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.type === 'assistant' && (
                        <Bot size={16} className="mt-0.5 text-blue-600 dark:text-blue-400" />
                      )}
                      {message.type === 'user' && (
                        <User size={16} className="mt-0.5 text-white" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{message.content}</p>

                        {/* Related timestamp */}
                        {message.relatedTimestamp !== undefined && onTimestampClick && (
                          <button
                            onClick={() => onTimestampClick(message.relatedTimestamp!)}
                            className="mt-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            跳转到 {formatTime(message.relatedTimestamp)}
                          </button>
                        )}

                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                    <div className="flex space-x-1">
                      <Loader2 size={14} className="animate-spin text-gray-500" />
                      <span className="text-sm text-gray-500">正在思考...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-light-200 dark:border-dark-200 p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="询问关于视频的问题..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm border border-light-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!currentQuestion.trim() || isLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Collapsed preview */}
      {!isExpanded && (
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {messages.length === 0
              ? '点击展开开始询问关于视频的问题'
              : `${messages.length} 条对话 - 点击展开查看详情`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default YouTubeQA;