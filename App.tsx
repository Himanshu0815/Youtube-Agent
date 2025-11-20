
import React, { useState, useCallback, useRef } from 'react';
import { YouTubeIcon, SearchIcon, FileTextIcon, ClockIcon, BookIcon, MicIcon, StopIcon, UploadIcon } from './components/Icons';
import { AnalysisResult } from './components/AnalysisResult';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { AnalysisData } from './types';
import { analyzeTranscript, analyzeUrlWithGrounding, analyzeAudioContent } from './services/geminiService';

export default function App() {
  const [inputMode, setInputMode] = useState<'url' | 'transcript' | 'audio'>('url');
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoTypeFilter, setVideoTypeFilter] = useState<string>('Auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Extract video ID for thumbnail & validation
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(url);

  // Robust URL Validation
  const validateYouTubeUrl = (urlToValidate: string): string | null => {
    if (!urlToValidate.trim()) return "Please enter a YouTube URL.";
    
    try {
       const parsedUrl = new URL(urlToValidate);
       const hostname = parsedUrl.hostname.toLowerCase();
       
       // Domain check
       if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
          return "Please provide a valid YouTube URL (youtube.com or youtu.be).";
       }

       // Protocol check
       if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
           return "URL must start with http:// or https://";
       }

       // ID check
       const id = getYouTubeId(urlToValidate);
       if (!id) {
           return "Could not find a valid Video ID. Please check the link format.";
       }

       return null; // Valid
    } catch (e) {
       return "Invalid URL format. Please ensure it starts with http:// or https://";
    }
  };

  const handleAnalyze = useCallback(async () => {
    setError(null);

    if (inputMode === 'url') {
        const validationError = validateYouTubeUrl(url);
        if (validationError) {
            setError(validationError);
            return;
        }
    }
    
    if (inputMode === 'transcript' && !transcript.trim()) {
        setError("Please provide a transcript.");
        return;
    }

    setIsLoading(true);
    setData(null);
    setLoadingStep('Initializing analysis...');

    try {
      let result: AnalysisData;
      const updateStep = (step: string) => setLoadingStep(step);

      if (inputMode === 'transcript') {
        updateStep('Processing transcript data...');
        result = await analyzeTranscript(transcript, url, videoTypeFilter);
      } else if (inputMode === 'url') {
        updateStep('Searching for transcript & video content...');
        // Delay slightly to let the user see the step
        await new Promise(r => setTimeout(r, 500));
        
        updateStep('Analyzing text & comparing with metadata...');
        result = await analyzeUrlWithGrounding(url, videoTypeFilter);

        if (videoId && result.videoId && result.videoId !== videoId && result.videoId !== "NOT_FOUND") {
          throw new Error(
            `Analysis Mismatch: The AI analyzed a different video (ID: ${result.videoId}) than the one requested. ` + 
            `This often happens with new or unindexed videos. Please use 'Audio Mode' or paste the transcript.`
          );
        }
      } else {
        throw new Error("Invalid input mode.");
      }

      updateStep('Finalizing insights...');
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [url, transcript, videoId, inputMode, videoTypeFilter]);

  // --- Audio Logic ---

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      await processAudioFile(file);
  };

  const processAudioFile = async (blob: Blob) => {
      setIsLoading(true);
      setError(null);
      setData(null);
      setLoadingStep('Uploading and transcribing audio...');
      
      try {
          const base64Data = await blobToBase64(blob);
          // Remove header "data:audio/mp3;base64,"
          const cleanBase64 = base64Data.split(',')[1];
          const mimeType = blob.type || 'audio/mp3'; // Default fallback
          
          setLoadingStep('Analyzing content structure...');
          const result = await analyzeAudioContent(cleanBase64, mimeType, videoTypeFilter);
          
          setLoadingStep('Finalizing insights...');
          setData(result);
      } catch (err) {
          console.error(err);
          setError("Failed to process audio. The file might be too large or the format unsupported.");
      } finally {
          setIsLoading(false);
      }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.start();
          setIsRecording(true);
          setError(null);
      } catch (err) {
          console.error(err);
          setError("Microphone access denied. Please check your permissions.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
              setIsRecording(false);
              // Stop all tracks to release mic
              mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
              processAudioFile(audioBlob);
          };
      }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const videoTypes = ["Auto", "Educational", "Product Review", "Entertainment", "Vlog", "News"];

  return (
    <div className="min-h-screen pb-20">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-yt-dark/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-yt-red p-1.5 rounded-lg">
                <YouTubeIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">YouTube<span className="text-yt-red">Agent</span></span>
            </div>
            <div className="hidden md:block text-xs text-gray-500 font-mono">
              Powered by Gemini 2.5
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            Analyze Media & Content
          </h1>
          <p className="text-yt-subtext text-lg max-w-2xl mx-auto">
            Generate detailed summaries, timestamps, study notes, and insights from any YouTube video instantly.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-yt-card border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl mb-12 relative overflow-hidden transition-all duration-500">
          {/* Decorative Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-yt-red to-transparent opacity-50"></div>

          {/* Mode Toggles */}
          <div className="flex justify-center gap-2 mb-8">
             <button 
                onClick={() => setInputMode('url')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${inputMode === 'url' ? 'bg-gray-800 text-white border border-gray-600' : 'text-gray-400 hover:text-white'}`}
             >
                <SearchIcon className="w-4 h-4"/> URL
             </button>
             <button 
                onClick={() => setInputMode('transcript')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${inputMode === 'transcript' ? 'bg-gray-800 text-white border border-gray-600' : 'text-gray-400 hover:text-white'}`}
             >
                <FileTextIcon className="w-4 h-4"/> Transcript
             </button>
             <button 
                onClick={() => setInputMode('audio')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${inputMode === 'audio' ? 'bg-gray-800 text-white border border-gray-600' : 'text-gray-400 hover:text-white'}`}
             >
                <MicIcon className="w-4 h-4"/> Audio / Upload
             </button>
          </div>

          <div className="space-y-6">
            
            {/* Video Type Filter - Visible for URL & Transcript Mode */}
            {(inputMode === 'url' || inputMode === 'transcript') && (
              <div className="flex justify-end animate-fade-in">
                 <div className="relative inline-block text-left">
                    <select 
                      value={videoTypeFilter}
                      onChange={(e) => setVideoTypeFilter(e.target.value)}
                      className="bg-black/30 border border-gray-700 text-gray-300 text-xs rounded-lg focus:ring-yt-red focus:border-yt-red block w-full p-2 outline-none cursor-pointer hover:border-gray-500 transition-colors"
                    >
                       {videoTypes.map(type => (
                         <option key={type} value={type}>{type === 'Auto' ? 'Auto-Detect Type' : type}</option>
                       ))}
                    </select>
                 </div>
              </div>
            )}

            {/* URL Input Mode */}
            {inputMode === 'url' && (
                <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-400 mb-2">YouTube URL</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full bg-black/30 border border-gray-700 rounded-xl py-4 pl-11 pr-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-yt-red focus:border-transparent transition-all outline-none"
                        />
                    </div>
                     {/* Video Thumbnail Preview */}
                    {videoId && (
                    <div className="mt-4 w-full rounded-lg overflow-hidden bg-black/50 border border-gray-800 aspect-video relative animate-fade-in">
                        <img 
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
                        alt="Video thumbnail" 
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 p-3 rounded-full backdrop-blur-sm border border-white/10">
                            <YouTubeIcon className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            )}

            {/* Transcript Input Mode */}
            {inputMode === 'transcript' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Video Transcript 
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                  placeholder="Paste the full text here..."
                  className="w-full bg-black/30 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-yt-red focus:border-transparent transition-all outline-none text-sm font-mono"
                />
              </div>
            )}

            {/* Audio Input Mode */}
            {inputMode === 'audio' && (
                <div className="animate-fade-in text-center space-y-6 py-4">
                    <div className="p-6 bg-black/30 border border-dashed border-gray-700 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-2">Record Audio</h3>
                        <p className="text-sm text-gray-400 mb-6">Play the YouTube video on another device or tab, then click record.</p>
                        
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 mx-auto ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-gray-800 hover:bg-gray-700 border-2 border-gray-600'}`}
                        >
                            {isRecording ? <StopIcon className="w-8 h-8 text-white" /> : <MicIcon className="w-8 h-8 text-white" />}
                        </button>
                        <p className="mt-4 text-xs font-mono text-yt-red h-4">{isRecording ? "Recording..." : ""}</p>
                    </div>

                    <div className="relative">
                         <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-800"></div>
                         </div>
                         <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-yt-card text-gray-500">OR</span>
                         </div>
                    </div>

                    <div>
                         <label className="flex flex-col items-center justify-center px-4 py-6 bg-gray-800/50 text-gray-300 rounded-lg shadow-lg tracking-wide uppercase border border-gray-700 cursor-pointer hover:bg-gray-800 hover:text-white transition-colors">
                            <UploadIcon className="w-8 h-8 mb-2" />
                            <span className="mt-1 text-sm">Select Audio or Video File</span>
                            <input type='file' className="hidden" accept="audio/*,video/*" onChange={handleAudioUpload} />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">Supports mp3, wav, mp4, mpeg, aac</p>
                    </div>
                </div>
            )}

            {/* Action Button (Hidden for Audio Mode as actions are direct) */}
            {inputMode !== 'audio' && (
                <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className={`
                    w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300
                    ${isLoading 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-yt-red hover:bg-red-600 text-white shadow-lg shadow-red-900/30 hover:shadow-red-900/50 transform hover:-translate-y-0.5'
                    }
                `}
                >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></span>
                    {loadingStep || 'Analyzing...'}
                    </span>
                ) : (
                    "Generate Analysis"
                )}
                </button>
            )}

            {/* Loading State for Audio specifically since it doesn't use the main button */}
            {inputMode === 'audio' && isLoading && (
                 <div className="w-full py-4 rounded-xl font-bold text-lg tracking-wide text-center bg-gray-800 text-white flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></span>
                    {loadingStep || 'Processing Audio...'}
                 </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-200 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
                <div className="mt-0.5 text-red-500 text-xl">⚠️</div>
                <div className="text-sm leading-relaxed">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section with Skeleton */}
        {isLoading && <LoadingSkeleton />}
        
        {data && !isLoading && <AnalysisResult data={data} />}
        
        {/* Empty State / Placeholder */}
        {!data && !isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center opacity-40 pointer-events-none select-none">
            <div className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800">
              <FileTextIcon className="w-8 h-8 mx-auto mb-3 text-gray-600" />
              <h3 className="font-semibold text-gray-400">Summaries</h3>
            </div>
            <div className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800">
              <ClockIcon className="w-8 h-8 mx-auto mb-3 text-gray-600" />
              <h3 className="font-semibold text-gray-400">Smart Timestamps</h3>
            </div>
            <div className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800">
              <BookIcon className="w-8 h-8 mx-auto mb-3 text-gray-600" />
              <h3 className="font-semibold text-gray-400">Revision Notes</h3>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
