
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisData, ResearchResult, QuizData } from '../types';
import { performDeepResearch, generateQuiz } from '../services/geminiService';
import { ClockIcon, LightbulbIcon, BookIcon, FileTextIcon, QuoteIcon, UsersIcon, ChartIcon, StarIcon, CheckCircleIcon, XCircleIcon, MessageCircleIcon, BrainIcon, DownloadIcon, GlobeIcon, PlayIcon, ExternalLinkIcon } from './Icons';
import { ChatInterface } from './ChatInterface';
import { QuizInterface } from './QuizInterface';

interface Props {
  data: AnalysisData;
}

// Simple Donut Chart Component
const SentimentDonut = ({ pos, neu, neg }: { pos: number, neu: number, neg: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  const posOffset = circumference - (pos / 100) * circumference;
  const neuOffset = circumference - (neu / 100) * circumference;
  const negOffset = circumference - (neg / 100) * circumference;

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#374151" strokeWidth="12" />
        {/* Positive Segment */}
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#22c55e" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={posOffset} />
        {/* Neutral Segment */}
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#9ca3af" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={neuOffset} style={{ transform: `rotate(${(pos / 100) * 360}deg)`, transformOrigin: '50% 50%' }} />
        {/* Negative Segment */}
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#ef4444" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={negOffset} style={{ transform: `rotate(${((pos + neu) / 100) * 360}deg)`, transformOrigin: '50% 50%' }} />
      </svg>
      <div className="absolute text-center">
         <div className="text-3xl font-bold text-white">{pos}%</div>
         <div className="text-xs text-green-400 font-bold uppercase tracking-wider">Positive</div>
      </div>
    </div>
  );
};

export const AnalysisResult: React.FC<Props> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'quiz' | 'timeline' | 'themes' | 'notes' | 'quotes' | 'sentiment' | 'transcript' | 'review' | 'research'>('summary');
  const [chatInitialQuery, setChatInitialQuery] = useState<string>('');
  
  // Research State
  const [researchTopic, setResearchTopic] = useState<string>('');
  const [researchData, setResearchData] = useState<ResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  
  // Chat Context State
  const [forcedChatContext, setForcedChatContext] = useState<'video' | 'research' | null>(null);

  // Background Quiz Generation State
  // We use a Ref to store the promise so it doesn't re-trigger on renders
  const quizPromiseRef = useRef<Promise<QuizData> | null>(null);

  useEffect(() => {
    // OPTIMIZATION: Start generating the quiz in the background immediately when data loads.
    // This removes the wait time when the user eventually clicks the "Quiz" tab.
    if (data && !quizPromiseRef.current) {
        console.log("Optimistic pre-fetching: Generating quiz in background...");
        quizPromiseRef.current = generateQuiz(data).catch(err => {
            console.error("Background quiz generation failed:", err);
            throw err;
        });
    }
  }, [data]);

  // Defensive checks
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

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('education') || t.includes('tutorial')) return 'bg-blue-900/50 text-blue-200 border-blue-700';
    if (t.includes('review')) return 'bg-green-900/50 text-green-200 border-green-700';
    if (t.includes('entertainment') || t.includes('vlog')) return 'bg-purple-900/50 text-purple-200 border-purple-700';
    return 'bg-gray-800 text-gray-300 border-gray-600';
  };

  useEffect(() => {
     if (hasReview && activeTab === 'notes') setActiveTab('review');
  }, [hasReview, activeTab]);

  const handleTimestampClick = (seconds?: number) => {
    if (seconds !== undefined && data.videoId) {
      // Open in new tab instead of seeking embedded player
      window.open(`https://www.youtube.com/watch?v=${data.videoId}&t=${seconds}s`, '_blank');
    }
  };

  const handleThemeClick = (topic: string) => {
    setChatInitialQuery(`Tell me more about the theme: "${topic}"`);
    setForcedChatContext('video');
    setActiveTab('chat');
  };

  const handleDeepResearch = async (topic: string) => {
    setResearchTopic(topic);
    setActiveTab('research');
    setResearchData(null);
    setIsResearching(true);
    try {
        const result = await performDeepResearch(topic);
        setResearchData(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsResearching(false);
    }
  };

  const handleChatAboutResearch = () => {
    setForcedChatContext('research');
    setActiveTab('chat');
  };

  const handleExport = () => {
    let content = `# ${data.title}\n\n`;
    content += `**Summary:**\n${data.summary}\n\n`;
    if (studyNotes.length > 0) {
      content += `## Study Notes\n`;
      studyNotes.forEach(section => {
        content += `### ${section.title}\n`;
        (section.points || []).forEach(p => content += `- ${p}\n`);
        content += `\n`;
      });
    }
    if (themes.length > 0) {
      content += `## Key Themes\n`;
      themes.forEach(t => content += `- **${t.topic}**: ${t.details}\n`);
      content += `\n`;
    }
    if (reviewDetails) {
      content += `## Review Verdict: ${reviewDetails.verdict}\n\n`;
      content += `### Pros\n${(reviewDetails.pros || []).map(p => `- ${p}`).join('\n')}\n`;
      content += `### Cons\n${(reviewDetails.cons || []).map(c => `- ${c}`).join('\n')}\n`;
    }
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 lg:mt-8 animate-fade-in pb-20">
      
      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
        <div className="lg:col-span-1">
           <div className="lg:sticky lg:top-24 space-y-4">
              {/* Replaced VideoPlayer with Static Thumbnail Link */}
              {data.videoId ? (
                 <a href={`https://www.youtube.com/watch?v=${data.videoId}`} target="_blank" rel="noopener noreferrer" className="block relative aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black group cursor-pointer">
                    <img 
                      src={`https://img.youtube.com/vi/${data.videoId}/maxresdefault.jpg`} 
                      alt={data.title} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-red-600/90 p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform backdrop-blur-sm">
                           <PlayIcon className="w-8 h-8 text-white fill-current ml-1" />
                        </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
                        Watch on YouTube
                    </div>
                 </a>
              ) : (
                <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center border border-gray-800 text-gray-500"><span className="text-sm">Video Preview Unavailable</span></div>
              )}

              <div className="hidden lg:block">
                 <h2 className="text-xl font-bold text-white mb-2 leading-tight">{data.title}</h2>
                 <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getTypeColor(videoType)}`}>{videoType}</span>
                 </div>
                 <button onClick={handleExport} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg w-full justify-center">
                   <DownloadIcon className="w-4 h-4" /> Export Notes (Markdown)
                 </button>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
            <div className="lg:hidden mb-6">
                <h2 className="text-xl font-bold text-white mb-2 leading-tight">{data.title}</h2>
                <div className="flex justify-between items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getTypeColor(videoType)}`}>{videoType}</span>
                    <button onClick={handleExport} className="text-gray-400 hover:text-white border border-gray-800 p-2 rounded-lg"><DownloadIcon className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl border border-gray-800/50 backdrop-blur-sm sticky top-[64px] z-30 overflow-x-auto no-scrollbar lg:flex-wrap">
                <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<FileTextIcon className="w-3.5 h-3.5" />} label="Summary" />
                <TabButton active={activeTab === 'chat'} onClick={() => { setActiveTab('chat'); setForcedChatContext(null); }} icon={<MessageCircleIcon className="w-3.5 h-3.5" />} label="Ask AI" />
                <TabButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} icon={<BrainIcon className="w-3.5 h-3.5" />} label="Quiz" />
                <TabButton active={activeTab === 'research'} onClick={() => setActiveTab('research')} icon={<GlobeIcon className="w-3.5 h-3.5" />} label="Research" />
                {hasReview && <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={<StarIcon className="w-3.5 h-3.5" />} label="Review" />}
                {hasTranscript && <TabButton active={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')} icon={<FileTextIcon className="w-3.5 h-3.5" />} label="Transcript" />}
                {hasSentiment && <TabButton active={activeTab === 'sentiment'} onClick={() => setActiveTab('sentiment')} icon={<ChartIcon className="w-3.5 h-3.5" />} label="Sentiment" />}
                <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} icon={hasDetailedTimeline ? <UsersIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />} label="Timeline" />
                <TabButton active={activeTab === 'themes'} onClick={() => setActiveTab('themes')} icon={<LightbulbIcon className="w-3.5 h-3.5" />} label="Themes" />
                {hasQuotes && <TabButton active={activeTab === 'quotes'} onClick={() => setActiveTab('quotes')} icon={<QuoteIcon className="w-3.5 h-3.5" />} label="Quotes" />}
                {hasStudyNotes && <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<BookIcon className="w-3.5 h-3.5" />} label="Notes" />}
            </div>

            <div className="bg-yt-card border border-gray-800 rounded-xl p-5 md:p-8 min-h-[500px] shadow-xl relative">
                
                {activeTab === 'summary' && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2"><FileTextIcon className="w-5 h-5" /> Executive Summary</h3>
                    <p className="text-gray-300 leading-relaxed text-base md:text-lg whitespace-pre-wrap">{data.summary}</p>
                </div>
                )}

                {/* Unified Chat Interface */}
                {activeTab === 'chat' && (
                  <ChatInterface 
                    videoData={data} 
                    researchData={researchData} 
                    initialQuery={chatInitialQuery} 
                    forcedContext={forcedChatContext}
                  />
                )}
                
                {activeTab === 'quiz' && (
                    <QuizInterface 
                        data={data} 
                        quizPromise={quizPromiseRef.current} 
                    />
                )}

                {activeTab === 'research' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-semibold text-yt-red mb-2 flex items-center justify-center gap-2"><GlobeIcon className="w-6 h-6" /> Deep Research Agent</h3>
                            <p className="text-gray-400 text-sm">Select a topic from "Themes" to generate a research report.</p>
                        </div>
                        
                        {!researchTopic && !isResearching && (
                             <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                                <p className="text-gray-500">No topic selected. Go to <b>Themes</b> and click "Research This".</p>
                             </div>
                        )}

                        {isResearching && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="w-12 h-12 border-4 border-yt-red border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-300">Researching <b>"{researchTopic}"</b>...</p>
                            </div>
                        )}

                        {researchData && !isResearching && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                                    <div>
                                        <h2 className="text-3xl font-bold text-white mb-2">{researchData.topic}</h2>
                                        <p className="text-lg text-gray-300 italic">"{researchData.definition}"</p>
                                    </div>
                                    <button 
                                        onClick={handleChatAboutResearch}
                                        className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
                                    >
                                        <MessageCircleIcon className="w-5 h-5" /> Chat about this
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/20 p-5 rounded-xl border border-gray-800">
                                        <h4 className="font-bold text-blue-400 mb-3 uppercase text-xs tracking-wider">History & Context</h4>
                                        <p className="text-gray-400 text-sm leading-relaxed">{researchData.history}</p>
                                    </div>
                                    <div className="bg-black/20 p-5 rounded-xl border border-gray-800">
                                        <h4 className="font-bold text-green-400 mb-3 uppercase text-xs tracking-wider">Why it matters</h4>
                                        <p className="text-gray-400 text-sm leading-relaxed">{researchData.relevance}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-white mb-3">Key Concepts</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(researchData.keyConcepts || []).map((c, i) => (
                                            <span key={i} className="px-3 py-1 bg-gray-800 rounded-lg text-sm text-gray-300 border border-gray-700">{c}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-center mt-8 md:hidden">
                                     <button onClick={handleChatAboutResearch} className="w-full bg-blue-600 py-3 rounded-lg text-white font-bold">Chat about this</button>
                                </div>

                                {(researchData.sources || []).length > 0 && (
                                    <div className="mt-8 border-t border-gray-800 pt-6">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <BookIcon className="w-4 h-4" /> Sources & References
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(researchData.sources || []).map((source, idx) => {
                                                const isUrl = source.startsWith('http');
                                                // Simple helper to make display text cleaner
                                                const displayText = isUrl 
                                                    ? source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] 
                                                    : source;
                                                
                                                return (
                                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-gray-800 hover:border-gray-600 transition-colors group">
                                                        <div className="bg-gray-800 p-2 rounded-md group-hover:bg-gray-700 transition-colors">
                                                            {isUrl ? <GlobeIcon className="w-4 h-4 text-blue-400" /> : <FileTextIcon className="w-4 h-4 text-gray-400" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            {isUrl ? (
                                                                <a href={source} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate block font-medium">
                                                                    {displayText}
                                                                </a>
                                                            ) : (
                                                                <span className="text-sm text-gray-300 truncate block font-medium">{source}</span>
                                                            )}
                                                            {isUrl && <div className="text-[10px] text-gray-600 truncate">{source}</div>}
                                                        </div>
                                                        {isUrl && <ExternalLinkIcon className="w-3 h-3 text-gray-600 group-hover:text-gray-400" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                        <div className="bg-green-900/10 border border-green-900/30 rounded-xl p-6">
                        <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5" /> Pros</h4>
                        <ul className="space-y-3">{(reviewDetails.pros || []).map((pro, i) => <li key={i} className="flex items-start gap-3 text-gray-300"><span className="text-green-500 mt-1">✓</span>{pro}</li>)}</ul>
                        </div>
                        <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-6">
                        <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2"><XCircleIcon className="w-5 h-5" /> Cons</h4>
                        <ul className="space-y-3">{(reviewDetails.cons || []).map((con, i) => <li key={i} className="flex items-start gap-3 text-gray-300"><span className="text-red-500 mt-1">×</span>{con}</li>)}</ul>
                        </div>
                    </div>
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                        <h4 className="font-bold text-white mb-2">The Verdict</h4>
                        <p className="text-gray-300 italic text-lg leading-relaxed">"{reviewDetails.verdict}"</p>
                    </div>
                </div>
                )}

                {activeTab === 'transcript' && data.transcript && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2"><FileTextIcon className="w-5 h-5" /> Audio Transcript</h3>
                    <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-gray-300 leading-relaxed text-md whitespace-pre-wrap font-serif">{data.transcript}</p>
                    </div>
                </div>
                )}

                {activeTab === 'sentiment' && data.sentiment && (
                <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2"><ChartIcon className="w-5 h-5" /> Audience Sentiment</h3>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-16 py-4">
                        <div className="flex-shrink-0"><SentimentDonut pos={data.sentiment.positivePercent} neu={data.sentiment.neutralPercent} neg={data.sentiment.negativePercent} /></div>
                        <div className="flex-1 w-full max-w-md space-y-4">
                             <div className="bg-black/20 p-4 rounded-xl border border-gray-800 flex justify-between items-center"><span className="flex items-center gap-2 text-gray-300"><span className="w-3 h-3 rounded-full bg-green-500"></span> Positive</span><span className="font-bold text-green-400">{data.sentiment.positivePercent}%</span></div>
                             <div className="bg-black/20 p-4 rounded-xl border border-gray-800 flex justify-between items-center"><span className="flex items-center gap-2 text-gray-300"><span className="w-3 h-3 rounded-full bg-gray-400"></span> Neutral</span><span className="font-bold text-gray-400">{data.sentiment.neutralPercent}%</span></div>
                             <div className="bg-black/20 p-4 rounded-xl border border-gray-800 flex justify-between items-center"><span className="flex items-center gap-2 text-gray-300"><span className="w-3 h-3 rounded-full bg-red-500"></span> Negative</span><span className="font-bold text-red-400">{data.sentiment.negativePercent}%</span></div>
                        </div>
                    </div>
                    <div className="bg-black/20 p-6 rounded-xl border border-gray-800"><h4 className="font-bold text-white mb-2">Audience Reaction Summary</h4><p className="text-gray-300 italic">"{data.sentiment.summary}"</p></div>
                </div>
                )}

                {activeTab === 'timeline' && (
                <div className="space-y-6 animate-fade-in pl-2">
                    <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2">{hasDetailedTimeline ? <UsersIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}{hasDetailedTimeline ? "Speakers & Topics Breakdown" : "Key Moments"}</h3>
                    {hasSpeakers && (<div className="flex flex-wrap gap-3 mb-8 p-4 bg-black/20 rounded-xl border border-gray-800/50">{speakers.map((s, idx) => (<div key={idx} className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700"><UsersIcon className="w-3 h-3 text-yt-red" /><span className="font-bold text-white text-sm">{s.name}</span>{s.role && <span className="text-xs text-gray-400 border-l border-gray-600 pl-2"> {s.role}</span>}</div>))}</div>)}
                    <div className="relative border-l-2 border-gray-800 ml-3 space-y-0 pb-4">
                    {hasDetailedTimeline ? (subTopics.map((item, idx) => (
                        <div key={idx} className="relative pl-8 pb-8 last:pb-0 group">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-yt-red border-4 border-yt-card transition-transform group-hover:scale-125"></div>
                            <button onClick={() => handleTimestampClick(item.seconds)} className="inline-block bg-yt-red/10 text-yt-red font-mono text-xs font-bold px-2 py-1 rounded mb-2 border border-yt-red/20 hover:bg-yt-red hover:text-white transition-colors cursor-pointer">{item.time}</button>
                            <div className="p-4 rounded-lg bg-black/20 border border-gray-800 group-hover:border-yt-red/30 transition-colors">
                                <h4 className="font-bold text-white text-lg flex items-center gap-2 flex-wrap">{item.title}{item.speaker && <span className="text-xs font-normal text-gray-300 px-2 py-0.5 bg-gray-800 rounded-full border border-gray-700">{item.speaker}</span>}</h4>
                                <p className="text-gray-400 mt-2 leading-relaxed">{item.summary}</p>
                            </div>
                        </div>
                        ))) : (timestamps.map((item, idx) => (
                        <div key={idx} className="relative pl-8 pb-6 last:pb-0 group">
                            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-gray-600 border-2 border-yt-card group-hover:bg-yt-red transition-colors"></div>
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                                <button onClick={() => handleTimestampClick(item.seconds)} className="font-mono text-yt-red font-bold text-sm min-w-[60px] hover:underline text-left">{item.time}</button>
                                <p className="text-gray-300 group-hover:text-white transition-colors">{item.description}</p>
                            </div>
                        </div>
                        )))}
                    </div>
                </div>
                )}

                {activeTab === 'quotes' && hasQuotes && (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2"><QuoteIcon className="w-5 h-5" /> Impactful Quotes</h3>
                    <div className="grid gap-4">
                    {quotes.map((quote, idx) => (
                        <div key={idx} className="bg-black/20 p-6 rounded-xl border border-gray-800 relative overflow-hidden hover:border-yt-red/30 transition-colors group">
                        <QuoteIcon className="absolute top-4 right-4 w-8 h-8 text-gray-800" />
                        <blockquote className="relative z-10">
                            <p className="text-lg text-gray-200 italic mb-3">"{quote.text}"</p>
                            <footer className="flex items-center gap-3 text-sm">
                            <button onClick={() => handleTimestampClick(quote.seconds)} className="text-yt-red font-mono bg-yt-red/10 px-2 py-0.5 rounded border border-yt-red/20 hover:bg-yt-red hover:text-white transition-colors">{quote.time}</button>
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
                    <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2"><LightbulbIcon className="w-5 h-5" /> Themes & Topics</h3>
                    <p className="text-sm text-gray-500 mb-2">Click a topic to ask the AI or Research it.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {themes.map((theme, idx) => (
                        <div key={idx} className="bg-black/20 border border-gray-800 p-4 rounded-lg hover:border-yt-red/50 hover:bg-black/40 transition-all group relative">
                        <div className="flex items-center gap-3 mb-2 cursor-pointer" onClick={() => handleThemeClick(theme.topic)}>
                            <span className="text-2xl group-hover:scale-110 transition-transform">{theme.emoji}</span>
                            <h4 className="font-bold text-white group-hover:text-yt-red transition-colors">{theme.topic}</h4>
                        </div>
                        <p className="text-gray-400 text-sm mb-3 cursor-pointer" onClick={() => handleThemeClick(theme.topic)}>{theme.details}</p>
                        <div className="flex items-center gap-2 mt-auto">
                            <button onClick={() => handleThemeClick(theme.topic)} className="flex items-center gap-1 text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded border border-gray-700 text-gray-300 transition-colors"><MessageCircleIcon className="w-3 h-3" /> Ask AI</button>
                            <button onClick={() => handleDeepResearch(theme.topic)} className="flex items-center gap-1 text-[10px] bg-blue-900/30 hover:bg-blue-900/50 px-2 py-1 rounded border border-blue-900/50 text-blue-300 transition-colors"><GlobeIcon className="w-3 h-3" /> Research This</button>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
                )}

                {activeTab === 'notes' && hasStudyNotes && (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-xl font-semibold text-yt-red mb-4 flex items-center gap-2"><BookIcon className="w-5 h-5" /> Study Notes</h3>
                    <div className="grid gap-6">
                    {studyNotes.map((section, idx) => (
                        <div key={idx} className="bg-black/10 p-5 rounded-lg border border-gray-800">
                        <h4 className="text-lg font-bold text-white mb-3 border-b border-gray-800 pb-2">{section.title}</h4>
                        <ul className="space-y-3">{(section.points || []).map((point, pIdx) => (<li key={pIdx} className="text-gray-300 flex items-start gap-3"><span className="text-yt-red mt-1.5 text-xs">●</span><span className="leading-relaxed">{point}</span></li>))}</ul>
                        </div>
                    ))}
                    </div>
                </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, disabled = false }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-900 text-gray-600 hidden md:flex' : active ? 'bg-yt-red text-white shadow-lg shadow-red-900/20' : 'bg-black/40 text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent hover:border-gray-700'}`}>{icon}{label}</button>
);
