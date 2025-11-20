
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisData, ChatMessage } from '../types';
import { askVideoQuestion } from '../services/geminiService';
import { MessageCircleIcon, SendIcon, SparklesIcon, YouTubeIcon, UsersIcon } from './Icons';

interface Props {
  data: AnalysisData;
}

export const ChatInterface: React.FC<Props> = ({ data }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: `Hi! I'm ready to answer questions about "${data.title}".`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate suggested questions based on themes
  const suggestedQuestions = React.useMemo(() => {
    const questions = ["Summarize the key points again."];
    if (data.themes.length > 0) {
      questions.push(`Tell me more about ${data.themes[0].topic}.`);
    }
    if (data.themes.length > 1) {
       questions.push(`What was said about ${data.themes[1].topic}?`);
    }
    // Fallback if no themes
    if (questions.length < 2) {
        questions.push("What is the main conclusion?");
    }
    return questions.slice(0, 3);
  }, [data.themes]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textInput?: string) => {
    const content = textInput || input;
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await askVideoQuestion(content, data, messages);
      
      const botMessage: ChatMessage = {
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'model',
        content: "Sorry, I encountered an error trying to answer that. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to convert timestamp string (e.g. "1:30", "1:05:20") to total seconds
  const timeToSeconds = (timeStr: string) => {
    // Remove brackets [ ] if present
    const cleanTime = timeStr.replace(/[\[\]]/g, '');
    const parts = cleanTime.split(':').map(Number).reverse();
    // parts[0] = seconds, parts[1] = minutes, parts[2] = hours
    let totalSeconds = 0;
    if (parts[0]) totalSeconds += parts[0];
    if (parts[1]) totalSeconds += parts[1] * 60;
    if (parts[2]) totalSeconds += parts[2] * 3600;
    return totalSeconds;
  };

  // Helper to render message content with clickable highlighted timestamps
  const renderMessageContent = (content: string) => {
    // Regex to find timestamps like [12:30], (1:30), or 12:30
    const parts = content.split(/(\[?\d{1,2}:\d{2}(?::\d{2})?\]?)/g);
    return parts.map((part, i) => {
      // Check if part is a timestamp
      if (/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(part)) {
        // If we have a valid videoId (from URL mode), create a link
        if (data.videoId && data.videoId !== "NOT_FOUND") {
            const seconds = timeToSeconds(part);
            const url = `https://www.youtube.com/watch?v=${data.videoId}&t=${seconds}s`;
            
            return (
                <a 
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yt-red hover:text-red-400 font-mono font-bold mx-1 underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
                  title={`Open video at ${part}`}
                >
                  {part}
                </a>
            );
        }
        // Fallback styling for transcripts/audio uploads without a YouTube ID
        return <span key={i} className="text-yt-red font-mono font-bold mx-1">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-black/40 rounded-xl border border-gray-800 overflow-hidden animate-fade-in shadow-2xl relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900/90 to-gray-900/50 backdrop-blur p-4 border-b border-gray-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yt-red/20 rounded-full border border-yt-red/30">
             <YouTubeIcon className="w-5 h-5 text-yt-red" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-wide">AI Assistant</h3>
            <p className="text-xs text-gray-400">Ask about <span className="italic opacity-75">"{data.title.slice(0, 20)}..."</span></p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'model' ? 'bg-yt-red text-white' : 'bg-gray-700 text-gray-300'}`}>
               {msg.role === 'model' ? <YouTubeIcon className="w-4 h-4" /> : <UsersIcon className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] sm:max-w-[75%]`}>
                <div 
                className={`
                    px-5 py-3.5 text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                    ? 'bg-yt-red text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-gray-800/80 text-gray-200 rounded-2xl rounded-tl-sm border border-gray-700/50'
                    }
                `}
                >
                {renderMessageContent(msg.content)}
                </div>
                <p className={`text-[10px] text-gray-500 mt-1.5 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.timestamp)}
                </p>
            </div>
          </div>
        ))}

        {isLoading && (
           <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-yt-red text-white flex items-center justify-center">
                <YouTubeIcon className="w-4 h-4" />
             </div>
             <div className="bg-gray-800/80 rounded-2xl rounded-tl-sm px-5 py-4 border border-gray-700/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions & Input Area */}
      <div className="p-4 bg-gray-900/80 border-t border-gray-800 backdrop-blur-md">
        
        {/* Quick Suggestions (Only show if just the greeting exists) */}
        {messages.length === 1 && (
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <SparklesIcon className="w-3 h-3 text-yellow-500" /> Suggested Questions
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSend(q)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-700 transition-colors text-left"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question here..."
                className="w-full bg-black/40 border border-gray-700 rounded-xl py-3.5 pl-4 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yt-red focus:ring-1 focus:ring-yt-red transition-all text-sm shadow-inner"
                disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3.5 bg-yt-red rounded-xl text-white hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-yt-red transition-all shadow-lg shadow-red-900/20 active:scale-95"
          >
             <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
