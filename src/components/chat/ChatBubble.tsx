'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatPanel from './ChatPanel';

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-lg shadow-black/30 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />

          {/* Pulse animation ring */}
          <span className="absolute inset-0 rounded-full bg-cyan-500 animate-ping opacity-20"></span>
        </button>
      )}

      {/* Chat Panel */}
      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
