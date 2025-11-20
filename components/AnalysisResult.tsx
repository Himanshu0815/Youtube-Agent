
import React, { useState, useEffect } from 'react';
import { AnalysisData, Timestamp, Theme, StudySection } from '../types';
import { ClockIcon, LightbulbIcon, BookIcon, FileTextIcon, QuoteIcon, UsersIcon, ChartIcon, StarIcon, CheckCircleIcon, XCircleIcon, MessageCircleIcon } from './Icons';
import { ChatInterface } from './ChatInterface';

interface Props {
  data: AnalysisData;
}

export const AnalysisResult: React.FC<Props> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'timeline' | 'themes' | 'notes' | 'quotes' | 'sentiment' | 'transcript' | 'review'>('summary');

  // Defensive checks: Ensure arrays exist before checking length
  const subTopics = data.subTopics || [];
  const quotes = data.quotes || [];
  const speakers = data.speakers || [];
  const timestamps = data.timestamps || [];
  const themes = data.themes || [];
  const studyNotes = data.studyNotes || [];
  const videoType = data.videoType || 'General';
  const reviewDetails = data.reviewDetails;

  const hasDetailedTimeline = subTopics.length > 0;
  const hasQuotes = quotes.length > 0;
  const hasSpeakers = speakers.length > 0;
  const hasSentiment = !!data.sentiment;
  const hasTranscript = !!data.transcript;
  const hasStudyNotes = studyNotes.length > 0;
  const hasReview = !!reviewDetails && (reviewDetails.pros.length > 0 || !!reviewDetails.rating);

  // Helper to pick color based on video type
  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('education') || t.includes('tutorial')) return 'bg-blue-900/50 text-blue-200 border-blue-700';
    if (t.includes('review')) return 'bg-green-900/50 text-green-200 border-green-700';
    if (t.includes('entertainment') || t.includes('vlog')) return 'bg-purple-900/50 text-purple-200 border-purple-700';
    return 'bg-gray-800 text-gray-300 border-gray-600';
  };

  // Set default tab based on content type if Summary isn't the most relevant (optional, keeping Summary default for now)
  useEffect(() => {
     if (hasReview && activeTab === 'notes') {
        setActiveTab('review');
     }
  }, [hasReview]);


  return (
    <div className="w-full max-w-5xl mx-auto mt-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
             <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getTypeColor(videoType)}`}>
                {videoType}
             </span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">{data.title}</h2>
        <div className="h-1 w-24 bg-yt-red mx-auto rounded-full"></div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <TabButton 
          active={activeTab === 'summary'} 
          onClick={() => setActiveTab('summary')}
          icon={<FileTextIcon className="w-4 h-4" />}
          label="Summary"
        />

        <TabButton 
          active={activeTab === 'chat'} 
          onClick={() => setActiveTab('chat')}
          icon={<MessageCircleIcon className="w-4 h-4" />}
          label="Ask AI"
        />

        {hasReview && (
           <TabButton 
            active={activeTab === 'review'} 
            onClick={() => setActiveTab('review')}
            icon={<StarIcon className="w-4 h-4" />}
            label="Review & Verdict"
          />
        )}
        
        {hasTranscript && (
          <TabButton 
            active={activeTab === 'transcript'} 
            onClick={() => setActiveTab('transcript')}
            icon={<FileTextIcon className="w-4 h-4" />}
            label="Full Transcript"
          />
        )}

        {hasSentiment && (
          <TabButton 
            active={activeTab === 'sentiment'} 
            onClick={() => setActiveTab('sentiment')}
            icon={<ChartIcon className="w-4 h-4" />}
            label="Sentiment"
          />
        )}

        <TabButton 
          active={activeTab === 'timeline'} 
          onClick={() => setActiveTab('timeline')}
          icon={hasDetailedTimeline || hasSpeakers ? <UsersIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
          label={hasDetailedTimeline ? "Speakers & Topics" : "Timeline"}
          disabled={!hasDetailedTimeline && timestamps.length === 0}
        />
        
        <TabButton 
          active={activeTab === 'themes'} 
          onClick={() => setActiveTab('themes')}
          icon={<LightbulbIcon className="w-4 h-4" />}
          label="Themes"
        />
        
        {hasQuotes && (
          <TabButton 
            active={activeTab === 'quotes'} 
            onClick={() => setActiveTab('quotes')}
            icon={<QuoteIcon className="w-4 h-4" />}
            label="Quotes"
          />
        )}

        {hasStudyNotes && (
          <TabButton 
            active={activeTab === 'notes'} 
            onClick={() => setActiveTab('notes')}
            icon={<BookIcon className="w-4 h-4" />}
            label="Study Notes"
          />
        )}
      </div>

      {/* Content Area */}
      <div className="bg-yt-card border border-gray-800 rounded-xl p-6 md:p-8 min-h-[400px] shadow-2xl relative">
        
        {activeTab === 'summary' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">
              <FileTextIcon className="w-5 h-5" /> Executive Summary
            </h3>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
              {data.summary}
            </p>
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatInterface data={data} />
        )}

        {activeTab === 'review' && reviewDetails && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-800 pb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{reviewDetails.item}</h3>
                  <span className="text-sm text-gray-400">Review Analysis</span>
                </div>
                {reviewDetails.rating && (
                  <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg border border-yellow-500/50">
                    <StarIcon className="w-6 h-6 fill-current" />
                    <span className="text-2xl font-bold">{reviewDetails.rating}</span>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pros */}
                <div className="bg-green-900/10 border border-green-900/30 rounded-xl p-6">
                   <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5" /> Pros
                   </h4>
                   <ul className="space-y-3">
                      {reviewDetails.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-3 text-gray-300">
                          <span className="text-green-500 mt-1">✓</span>
                          {pro}
                        </li>
                      ))}
                   </ul>
                </div>
                
                {/* Cons */}
                 <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-6">
                   <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                      <XCircleIcon className="w-5 h-5" /> Cons
                   </h4>
                   <ul className="space-y-3">
                      {reviewDetails.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-3 text-gray-300">
                          <span className="text-red-500 mt-1">×</span>
                          {con}
                        </li>
                      ))}
                   </ul>
                </div>
             </div>

             {/* Verdict */}
             <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h4 className="font-bold text-white mb-2">The Verdict</h4>
                <p className="text-gray-300 italic text-lg leading-relaxed">"{reviewDetails.verdict}"</p>
             </div>
          </div>
        )}

        {activeTab === 'transcript' && data.transcript && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">
              <FileTextIcon className="w-5 h-5" /> Audio Transcript
            </h3>
            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-gray-300 leading-relaxed text-md whitespace-pre-wrap font-serif">
                {data.transcript}
                </p>
            </div>
          </div>
        )}

        {activeTab === 'sentiment' && data.sentiment && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">
              <ChartIcon className="w-5 h-5" /> Audience Sentiment
            </h3>
            
            {/* Sentiment Bar */}
            <div className="bg-black/20 p-6 rounded-xl border border-gray-800">
              <div className="flex h-6 rounded-full overflow-hidden mb-4">
                <div style={{ width: `${data.sentiment.positivePercent}%` }} className="bg-green-500 h-full" title="Positive"></div>
                <div style={{ width: `${data.sentiment.neutralPercent}%` }} className="bg-gray-500 h-full" title="Neutral"></div>
                <div style={{ width: `${data.sentiment.negativePercent}%` }} className="bg-red-500 h-full" title="Negative"></div>
              </div>
              <div className="flex justify-between text-sm text-gray-400 font-mono">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Positive {data.sentiment.positivePercent}%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-500"></span> Neutral {data.sentiment.neutralPercent}%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Negative {data.sentiment.negativePercent}%</span>
              </div>
            </div>

            <div className="bg-black/20 p-6 rounded-xl border border-gray-800">
              <h4 className="font-bold text-white mb-2">Audience Reaction Summary</h4>
              <p className="text-gray-300 italic">"{data.sentiment.summary}"</p>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-fade-in pl-2">
             <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">
              {hasDetailedTimeline ? <UsersIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
              {hasDetailedTimeline ? "Speakers & Topics Breakdown" : "Key Moments"}
            </h3>

            {/* Speakers List (if present) */}
            {hasSpeakers && (
              <div className="flex flex-wrap gap-3 mb-8 p-4 bg-black/20 rounded-xl border border-gray-800/50">
                {speakers.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
                    <UsersIcon className="w-3 h-3 text-yt-red" />
                    <span className="font-bold text-white text-sm">{s.name}</span>
                    {s.role && <span className="text-xs text-gray-400 border-l border-gray-600 pl-2"> {s.role}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Timeline Content */}
            <div className="relative border-l-2 border-gray-800 ml-3 space-y-0 pb-4">
              {hasDetailedTimeline ? (
                // Detailed Sub-topics View with Vertical Line style
                subTopics.map((item, idx) => (
                  <div key={idx} className="relative pl-8 pb-8 last:pb-0 group">
                    {/* Dot */}
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-yt-red border-4 border-yt-card transition-transform group-hover:scale-125"></div>
                    
                    {/* Time Badge */}
                    <span className="inline-block bg-yt-red/10 text-yt-red font-mono text-xs font-bold px-2 py-1 rounded mb-2 border border-yt-red/20">
                      {item.time}
                    </span>
                    
                    <div className="p-4 rounded-lg bg-black/20 border border-gray-800 group-hover:border-yt-red/30 transition-colors">
                        <h4 className="font-bold text-white text-lg flex items-center gap-2 flex-wrap">
                        {item.title}
                        {item.speaker && <span className="text-xs font-normal text-gray-300 px-2 py-0.5 bg-gray-800 rounded-full border border-gray-700">{item.speaker}</span>}
                        </h4>
                        <p className="text-gray-400 mt-2 leading-relaxed">{item.summary}</p>
                    </div>
                  </div>
                ))
              ) : (
                // Simple Timestamps View (Fallback) with Vertical Line style
                timestamps.map((item, idx) => (
                  <div key={idx} className="relative pl-8 pb-6 last:pb-0 group">
                    <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-gray-600 border-2 border-yt-card group-hover:bg-yt-red transition-colors"></div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                        <span className="font-mono text-yt-red font-bold text-sm min-w-[60px]">
                        {item.time}
                        </span>
                        <p className="text-gray-300 group-hover:text-white transition-colors">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'quotes' && hasQuotes && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">
              <QuoteIcon className="w-5 h-5" /> Impactful Quotes
            </h3>
            <div className="grid gap-4">
              {quotes.map((quote, idx) => (
                <div key={idx} className="bg-black/20 p-6 rounded-xl border border-gray-800 relative overflow-hidden hover:border-yt-red/30 transition-colors">
                  <QuoteIcon className="absolute top-4 right-4 w-8 h-8 text-gray-800" />
                  <blockquote className="relative z-10">
                    <p className="text-lg text-gray-200 italic mb-3">"{quote.text}"</p>
                    <footer className="flex items-center gap-3 text-sm">
                      <span className="text-yt-red font-mono bg-yt-red/10 px-2 py-0.5 rounded border border-yt-red/20">{quote.time}</span>
                      {quote.speaker && <span className="text-gray-500 font-semibold">— {quote.speaker}</span>}
                    </footer>
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'themes' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">
              <LightbulbIcon className="w-5 h-5" /> Themes & Topics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themes.map((theme, idx) => (
                <div key={idx} className="bg-black/20 border border-gray-800 p-4 rounded-lg hover:border-yt-red/50 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{theme.emoji}</span>
                    <h4 className="font-bold text-white">{theme.topic}</h4>
                  </div>
                  <p className="text-gray-400 text-sm">{theme.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notes' && hasStudyNotes && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">
              <BookIcon className="w-5 h-5" /> Study Notes
            </h3>
            <div className="grid gap-6">
              {studyNotes.map((section, idx) => (
                <div key={idx} className="bg-black/10 p-5 rounded-lg border border-gray-800">
                  <h4 className="text-lg font-bold text-white mb-3 border-b border-gray-800 pb-2">{section.title}</h4>
                  <ul className="space-y-3">
                    {(section.points || []).map((point, pIdx) => (
                      <li key={pIdx} className="text-gray-300 flex items-start gap-3">
                        <span className="text-yt-red mt-1.5 text-xs">●</span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const TabButton = ({ 
  active, 
  onClick, 
  icon, 
  label, 
  disabled = false 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  disabled?: boolean 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300
      ${disabled 
        ? 'opacity-50 cursor-not-allowed bg-gray-900 text-gray-600 hidden md:flex' 
        : active 
          ? 'bg-yt-red text-white shadow-lg shadow-red-900/20 scale-105' 
          : 'bg-yt-card text-gray-400 hover:bg-yt-hover hover:text-white'
      }
    `}
  >
    {icon}
    {label}
  </button>
);
