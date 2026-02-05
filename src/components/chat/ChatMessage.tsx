'use client';

import { Message } from './types';
import { formatRelativeTime } from '@/lib/chat-utils';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-100 border border-slate-700'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  // Style links
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="text-cyan-400 hover:text-cyan-300 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  // Style code blocks
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code
                        {...props}
                        className="bg-slate-900 text-cyan-400 px-1 py-0.5 rounded text-xs"
                      />
                    ) : (
                      <code
                        {...props}
                        className="block bg-slate-900 text-slate-300 p-2 rounded text-xs overflow-x-auto"
                      />
                    ),
                  // Style lists
                  ul: ({ node, ...props }) => (
                    <ul {...props} className="list-disc list-inside space-y-1" />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol {...props} className="list-decimal list-inside space-y-1" />
                  ),
                  // Style headings
                  h1: ({ node, ...props }) => (
                    <h1 {...props} className="text-cyan-400 font-bold text-base mt-2 mb-1" />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 {...props} className="text-cyan-400 font-bold text-sm mt-2 mb-1" />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 {...props} className="text-cyan-400 font-semibold text-sm mt-1 mb-1" />
                  ),
                  // Style paragraphs
                  p: ({ node, ...props }) => (
                    <p {...props} className="mb-2 last:mb-0 text-sm leading-relaxed" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-slate-500 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {formatRelativeTime(message.timestamp)}
        </div>

        {/* Sources (Assistant only) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showSources ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide sources
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show {message.sources.length} source{message.sources.length !== 1 && 's'}
                </>
              )}
            </button>

            {showSources && (
              <div className="mt-2 space-y-2 bg-slate-900 rounded-lg p-3 border border-slate-800">
                {message.sources.map((source, index) => (
                  <a
                    key={source.id || index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs hover:bg-slate-800 p-2 rounded transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-300 group-hover:text-cyan-400 truncate">
                          {source.title}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {source.competitorName} • {source.date}
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 flex-shrink-0 mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
