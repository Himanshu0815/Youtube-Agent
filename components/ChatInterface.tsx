
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnalysisData, ChatMessage, ResearchResult } from '../types';
import { askVideoQuestion, askResearchQuestion } from '../services/geminiService';
import { SendIcon, SparklesIcon, YouTubeIcon, UsersIcon, GlobeIcon, ChevronDownIcon } from './Icons';

interface Props {
  videoData: AnalysisData;
  researchData: ResearchResult | null;
  initialQuery?: string;
  forcedContext?: 'video' | 'research' | null;
}

export const ChatInterface: React.FC<Props> = ({ videoData, researchData, initialQuery, forcedContext }) => {
  // State to track which context is active
  const [activeContext, setActiveContext] = useState<'video' | 'research'>('video');
  
  // Separate histories for each context to keep RAG clean
  const [videoMessages, setVideoMessages] = useState<ChatMessage[]>([]);
  const [researchMessages, setResearchMessages] = useState<ChatMessage[]>([]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Sync forced context if provided (e.g., navigating from Research tab)
  useEffect(() => {
    if (forcedContext) {
        setActiveContext(forcedContext);
    } else if (!researchData) {
        setActiveContext('video');
    }
  }, [forcedContext, researchData]);

  // Initialize Greetings
  useEffect(() => {
    if (videoMessages.length === 0 && videoData) {
        setVideoMessages([{
            role: 'model',
            content: `Hi! I'm ready to answer questions about the video "${videoData.title}".`,
            timestamp: Date.now()
        }]);
    }
    if (researchMessages.length === 0 && researchData) {
        setResearchMessages([{
            role: 'model',
            content: `I've analyzed the topic "${researchData.topic}". What specific details would you like to discuss?`,
            timestamp: Date.now()
        }]);
    }
  }, [videoData, researchData]);

  // Determine current active data
  const currentMessages = activeContext === 'video' ? videoMessages : researchMessages;
  const currentTitle = activeContext === 'video' ? videoData.title : researchData?.topic || "Research";
  
  // Generate suggestions based on active context
  const suggestedQuestions = useMemo(() => {
    if (activeContext === 'video' && videoData) {
        const questions = ["Summarize the key points."];
        if (videoData.themes.length > 0) questions.push(`Tell me more about ${videoData.themes[0].topic}.`);
        if (videoData.themes.length > 1) questions.push(`What was said about ${videoData.themes[1].topic}?`);
        return questions.slice(0, 3);
    } else if (activeContext === 'research' && researchData) {
        const questions = ["Explain the history."];
        if (researchData.keyConcepts.length > 0) questions.push(`What is ${researchData.keyConcepts[0]}?`);
        questions.push("Why is this important?");
        return questions.slice(0, 3);
    }
    return [];
  }, [activeContext, videoData, researchData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, activeContext]);

  // Handle Initial Query
  useEffect(() => {
    if (initialQuery && !hasInitialized.current) {
        hasInitialized.current = true;
        handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (textInput?: string) => {
    const content = textInput || input;
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: content, timestamp: Date.now() };
    const contextToUse = activeContext; // Capture current context for async closure

    // Optimistically add user message
    if (contextToUse === 'video') setVideoMessages(prev => [...prev, userMessage]);
    else setResearchMessages(prev => [...prev, userMessage]);

    setInput('');
    setIsLoading(true);

    try {
      let responseText = '';
      if (contextToUse === 'video') {
         responseText = await askVideoQuestion(content, videoData, videoMessages);
      } else if (contextToUse === 'research' && researchData) {
         responseText = await askResearchQuestion(content, researchData, researchMessages);
      } else {
         responseText = "Context unavailable.";
      }
      
      const botMessage: ChatMessage = { role: 'model', content: responseText, timestamp: Date.now() };
      
      if (contextToUse === 'video') setVideoMessages(prev => [...prev, botMessage]);
      else setResearchMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const errorMessage: ChatMessage = { role: 'model', content: "Error generating response.", timestamp: Date.now() };
      if (contextToUse === 'video') setVideoMessages(prev => [...prev, errorMessage]);
      else setResearchMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] bg-black/40 rounded-xl border border-gray-800 overflow-hidden animate-fade-in shadow-2xl relative">
      
      {/* Unified Header */}
      <div className="bg-gradient-to-r from-gray-900/90 to-gray-900/50 backdrop-blur p-3 border-b border-gray-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Context Switcher Toggle */}
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
             <button 
                onClick={() => setActiveContext('video')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeContext === 'video' ? 'bg-yt-red text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
             >
                <YouTubeIcon className="w-3.5 h-3.5" /> Video
             </button>
             
             {researchData && (
                 <button 
                    onClick={() => setActiveContext('research')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeContext === 'research' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    <GlobeIcon className="w-3.5 h-3.5" /> Research
                 </button>
             )}
          </div>
        </div>
        
        <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Context: <span className="text-gray-200 font-medium truncate max-w-[150px] inline-block align-bottom">{currentTitle}</span></p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
        {currentMessages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'model' ? (activeContext === 'video' ? 'bg-yt-red text-white' : 'bg-blue-600 text-white') : 'bg-gray-700 text-gray-300'}`}>
               {msg.role === 'model' ? (activeContext === 'video' ? <YouTubeIcon className="w-4 h-4" /> : <GlobeIcon className="w-4 h-4" />) : <UsersIcon className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] sm:max-w-[75%]`}>
                <div className={`px-5 py-3.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? (activeContext === 'video' ? 'bg-yt-red' : 'bg-blue-600') + ' text-white rounded-2xl rounded-tr-sm' : 'bg-gray-800/80 text-gray-200 rounded-2xl rounded-tl-sm border border-gray-700/50'}`}>
                   {msg.content}
                </div>
                <p className={`text-[10px] text-gray-500 mt-1.5 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{formatTime(msg.timestamp)}</p>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex gap-3 animate-pulse">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeContext === 'video' ? 'bg-yt-red' : 'bg-blue-600'}`}>...</div>
             <div className="bg-gray-800/80 rounded-2xl px-5 py-4 text-xs text-gray-400">Thinking...</div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900/80 border-t border-gray-800 backdrop-blur-md">
        {/* Context-aware suggestions */}
        {currentMessages.length === 1 && !isLoading && (
            <div className="mb-4 hidden sm:block">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <SparklesIcon className="w-3 h-3 text-yellow-500" /> Suggested Questions
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, i) => (
                        <button key={i} onClick={() => handleSend(q)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-700 transition-colors text-left">
                            {q}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-3">
          <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${activeContext === 'video' ? 'the video' : 'this topic'}...`}
              className={`flex-1 bg-black/40 border border-gray-700 rounded-xl py-3.5 pl-4 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all text-sm ${activeContext === 'video' ? 'focus:border-yt-red focus:ring-yt-red' : 'focus:border-blue-500 focus:ring-blue-500'}`}
              disabled={isLoading}
          />
          <button type="submit" disabled={!input.trim() || isLoading} className={`p-3.5 rounded-xl text-white transition-all shadow-lg active:scale-95 ${activeContext === 'video' ? 'bg-yt-red hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-500'} disabled:opacity-50`}>
             <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
