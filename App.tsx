
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { YouTubeIcon, SearchIcon, FileTextIcon, MicIcon, StopIcon, UploadIcon, HistoryIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon, CheckCircleIcon, PdfIcon } from './components/Icons';
import { AnalysisResult } from './components/AnalysisResult';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { AnalysisData, HistoryItem } from './types';
import { analyzeTranscript, analyzeUrlWithGrounding, analyzeMultimodalContent, analyzeAudioContent, sanitizeData } from './services/geminiService';
import { extractTextFromPdf } from './services/pdfService';

export default function App() {
  const [inputMode, setInputMode] = useState<'url' | 'transcript' | 'audio'>('url');
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoTypeFilter, setVideoTypeFilter] = useState<string>('Auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('yt_agent_history');
    if (saved) {
      try {
        const parsedHistory = JSON.parse(saved);
        if (Array.isArray(parsedHistory)) {
          // CRITICAL: Sanitize history items immediately to prevent crashes from old/incomplete data
          const safeHistory = parsedHistory.map((item: HistoryItem) => ({
              ...item,
              data: sanitizeData(item.data)
          }));
          setHistory(safeHistory);
        } else {
            console.warn("Found history in localStorage but it was not an array.");
            localStorage.removeItem('yt_agent_history');
        }
      } catch (e) {
        console.error("Failed to load history", e);
        // Clear corrupt data
        localStorage.removeItem('yt_agent_history');
      }
    }
  }, []);

  const saveToHistory = (newData: AnalysisData) => {
    const sanitizedData = sanitizeData(newData);
    const newItem: HistoryItem = {
      id: sanitizedData.videoId || Date.now().toString(),
      title: sanitizedData.title,
      date: Date.now(),
      type: sanitizedData.videoType,
      thumbnail: sanitizedData.videoId ? `https://img.youtube.com/vi/${sanitizedData.videoId}/mqdefault.jpg` : undefined,
      data: sanitizedData
    };

    const updated = [newItem, ...history.filter(h => h.id !== newItem.id)].slice(0, 10); // Keep last 10
    setHistory(updated);
    localStorage.setItem('yt_agent_history', JSON.stringify(updated));
  };

  const loadFromHistory = (item: HistoryItem) => {
    // Re-sanitize just to be absolutely safe
    setData(sanitizeData(item.data));
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Attempt to restore input state to match history so the button shows "Generated"
    if (item.data.videoId) {
        setInputMode('url');
        setUrl(`https://www.youtube.com/watch?v=${item.data.videoId}`);
    } else if (item.data.transcript) {
        setInputMode('transcript');
        setTranscript(item.data.transcript);
    }
  };

  // Extract video ID for thumbnail & validation
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(url);

  // Check if analysis is complete for the current input
  const isAnalysisComplete = !!(
      data && 
      !isLoading && 
      (
        (inputMode === 'url' && videoId && data.videoId === videoId) || 
        (inputMode === 'transcript' && data.transcript === transcript && transcript.length > 0)
      )
  );

  // Robust URL Validation
  const validateYouTubeUrl = (urlToValidate: string): string | null => {
    if (!urlToValidate.trim()) return "Please enter a YouTube URL.";
    try {
       const parsedUrl = new URL(urlToValidate);
       const hostname = parsedUrl.hostname.toLowerCase();
       if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
          return "Please provide a valid YouTube URL (youtube.com or youtu.be).";
       }
       const id = getYouTubeId(urlToValidate);
       if (!id) {
           return "Could not find a valid Video ID. Please check the link format.";
       }
       return null;
    } catch (e) {
       return "Invalid URL format.";
    }
  };

  const handleAnalyze = useCallback(async () => {
    setError(null);
    if (inputMode === 'url') {
        const validationError = validateYouTubeUrl(url);
        if (validationError) { setError(validationError); return; }
    }
    if (inputMode === 'transcript' && !transcript.trim()) {
        setError("Please provide a transcript."); return;
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
        await new Promise(r => setTimeout(r, 500));
        updateStep('Analyzing text & comparing with metadata...');
        result = await analyzeUrlWithGrounding(url, videoTypeFilter);

        if (videoId && result.videoId && result.videoId !== videoId && result.videoId !== "NOT_FOUND") {
          throw new Error(`Analysis Mismatch: The AI analyzed a different video (ID: ${result.videoId}).`);
        }
      } else {
        throw new Error("Invalid input mode.");
      }

      updateStep('Finalizing insights...');
      setData(result);
      saveToHistory(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [url, transcript, videoId, inputMode, videoTypeFilter]);

  // --- Audio/Video/PDF File Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      
      // SIZE CHECK: Limit to 20MB to prevent XHR Error 6 / RPC Failures
      const MAX_SIZE = 20 * 1024 * 1024; // 20MB
      if (file.size > MAX_SIZE) {
          setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload files smaller than 20MB to prevent network timeout.`);
          return;
      }

      // 1. PDF Handling
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          await processPdfFile(file);
          return;
      }

      // 2. Video Handling
      if (file.type.startsWith('video/')) {
        await processVideoFile(file);
        return;
      }

      // 3. Audio Handling
      await processAudioFile(file);
  };

  const processPdfFile = async (file: File) => {
    setIsLoading(true); setError(null); setData(null);
    setLoadingStep('Reading PDF document...');
    
    try {
        const text = await extractTextFromPdf(file);
        if (!text.trim()) {
            throw new Error("No text found in PDF. It might be an image-based scan.");
        }
        
        setLoadingStep('Analyzing extracted text...');
        const result = await analyzeTranscript(text, `PDF: ${file.name}`, videoTypeFilter);
        
        // Enhance title for PDFs
        if (result.title === 'Video Title' || result.title === 'YouTube Video') {
            result.title = file.name.replace('.pdf', '');
        }

        setLoadingStep('Finalizing insights...');
        setData(result);
        saveToHistory(result);
        
        // Set transcript mode so user can see what was extracted
        setInputMode('transcript');
        setTranscript(text);
        
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to process PDF.");
    } finally {
        setIsLoading(false);
    }
  };

  // Helper to extract frames from a video file
  const extractFramesFromVideo = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(file);
      const frames: string[] = [];
      
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      // When metadata loads, we know duration and dimensions
      video.onloadedmetadata = async () => {
        const duration = video.duration;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Take 5 screenshots distributed across the video (e.g., 10%, 30%, 50%, 70%, 90%)
        const count = 5;
        const interval = duration / (count + 1);
        
        for (let i = 1; i <= count; i++) {
          const seekTime = interval * i;
          video.currentTime = seekTime;
          
          // Wait for seek to complete
          await new Promise(r => { video.onseeked = r; });
          
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            // Convert to base64 jpeg
            const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            frames.push(base64);
          }
        }
        
        // Clean up
        URL.revokeObjectURL(url);
        resolve(frames);
      };

      video.onerror = () => {
         console.error("Error loading video for frame extraction");
         URL.revokeObjectURL(url);
         resolve([]);
      };
    });
  };

  const processVideoFile = async (file: File) => {
    setIsLoading(true); setError(null); setData(null);
    setLoadingStep('Processing video file...');
    
    try {
      // 1. Extract frames
      setLoadingStep('Extracting visual frames for analysis...');
      const frames = await extractFramesFromVideo(file);
      console.log(`Extracted ${frames.length} frames`);
      
      // 2. Extract audio/video data (as base64 whole file)
      // Note: We send the whole file as the 'audio' part (Gemini accepts video mime types)
      setLoadingStep('Encoding media...');
      const base64Data = await blobToBase64(file);
      const cleanBase64 = base64Data.split(',')[1];
      
      // 3. Analyze
      setLoadingStep('Analyzing Multimodal Content (Audio + Visuals)...');
      const result = await analyzeMultimodalContent(cleanBase64, file.type, frames, videoTypeFilter);
      
      // Improve title for uploaded files
      if (result.title === 'Video Title') {
          result.title = file.name;
      }

      setLoadingStep('Finalizing insights...');
      setData(result);
      saveToHistory(result);
    } catch (err) {
      console.error(err);
      let msg = "Failed to process video file.";
      if (err instanceof Error) {
         if (err.message.includes("RPC") || err.message.includes("xhr")) {
             msg = "Network error. The file might be too large or the request timed out. Try a smaller file.";
         } else {
             msg = err.message;
         }
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const processAudioFile = async (blob: Blob) => {
      setIsLoading(true); setError(null); setData(null);
      setLoadingStep('Uploading and transcribing audio...');
      try {
          const base64Data = await blobToBase64(blob);
          const cleanBase64 = base64Data.split(',')[1];
          const mimeType = blob.type || 'audio/mp3';
          setLoadingStep('Analyzing content structure...');
          // Use the multimodal wrapper (no images)
          const result = await analyzeMultimodalContent(cleanBase64, mimeType, [], videoTypeFilter);
          
          // Use filename if available (from File object), otherwise generic
          if (blob instanceof File && result.title === 'Video Title') {
            result.title = blob.name;
          }

          setLoadingStep('Finalizing insights...');
          setData(result);
          saveToHistory(result);
      } catch (err) {
          console.error(err);
          let msg = "Failed to process audio.";
          if (err instanceof Error && (err.message.includes("RPC") || err.message.includes("xhr"))) {
              msg = "Network error. The file might be too large. Try a smaller file.";
          }
          setError(msg);
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
          mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
          mediaRecorder.start();
          setIsRecording(true); setError(null);
      } catch (err) {
          setError("Microphone access denied.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
              setIsRecording(false);
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

  const videoTypes = ["Auto", "Educational", "Product Review", "Entertainment", "Vlog", "News", "Documentary", "Tutorial", "Interview"];

  return (
    <div className="min-h-screen pb-20">
      <nav className="border-b border-gray-800 bg-yt-dark/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-yt-red p-1.5 rounded-lg">
                <YouTubeIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">YouTube<span className="text-yt-red">Agent</span></span>
            </div>
            <div className="hidden md:block text-xs text-gray-500 font-mono">Powered by Gemini 2.5</div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            Analyze Media & Content
          </h1>
          <p className="text-yt-subtext text-lg max-w-2xl mx-auto">
            Generate detailed summaries, interactive quizzes, study notes, and chat with videos or PDFs instantly.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-yt-card border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl mb-8 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-yt-red to-transparent opacity-50"></div>
          
          <div className="flex justify-center gap-2 mb-8">
             <button onClick={() => setInputMode('url')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${inputMode === 'url' ? 'bg-gray-800 text-white border border-gray-600' : 'text-gray-400 hover:text-white'}`}><SearchIcon className="w-4 h-4"/> URL</button>
             <button onClick={() => setInputMode('transcript')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${inputMode === 'transcript' ? 'bg-gray-800 text-white border border-gray-600' : 'text-gray-400 hover:text-white'}`}><FileTextIcon className="w-4 h-4"/> Transcript</button>
             <button onClick={() => setInputMode('audio')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${inputMode === 'audio' ? 'bg-gray-800 text-white border border-gray-600' : 'text-gray-400 hover:text-white'}`}><UploadIcon className="w-4 h-4"/> Audio / PDF</button>
          </div>

          <div className="space-y-6">
            {(inputMode === 'url' || inputMode === 'transcript') && (
              <div className="flex justify-end animate-fade-in">
                 <div className="relative inline-block text-left">
                    <select value={videoTypeFilter} onChange={(e) => setVideoTypeFilter(e.target.value)} className="bg-black/30 border border-gray-700 text-gray-300 text-xs rounded-lg focus:ring-yt-red focus:border-yt-red block w-full p-2 outline-none cursor-pointer hover:border-gray-500 transition-colors">
                       {videoTypes.map(type => <option key={type} value={type}>{type === 'Auto' ? 'Auto-Detect Type' : type}</option>)}
                    </select>
                 </div>
              </div>
            )}

            {inputMode === 'url' && (
                <div className="animate-fade-in">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-500" /></div>
                        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-black/30 border border-gray-700 rounded-xl py-4 pl-11 pr-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-yt-red focus:border-transparent transition-all outline-none" />
                    </div>
                    {/* Only show thumbnail if analysis is NOT generated yet */}
                    {videoId && !data && (
                    <div className="mt-4 w-full rounded-lg overflow-hidden bg-black/50 border border-gray-800 aspect-video relative animate-fade-in">
                        <img src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} alt="Video thumbnail" className="w-full h-full object-cover opacity-80" onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 p-3 rounded-full backdrop-blur-sm border border-white/10"><YouTubeIcon className="w-8 h-8 text-white" /></div>
                        </div>
                    </div>
                    )}
                </div>
            )}

            {inputMode === 'transcript' && (
              <div className="animate-fade-in">
                <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} placeholder="Paste transcript..." className="w-full bg-black/30 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-yt-red focus:border-transparent transition-all outline-none text-sm font-mono" />
              </div>
            )}

            {inputMode === 'audio' && (
                <div className="animate-fade-in text-center space-y-6 py-4">
                    <div className="p-6 bg-black/30 border border-dashed border-gray-700 rounded-xl">
                        <button onClick={isRecording ? stopRecording : startRecording} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 mx-auto ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-gray-800 hover:bg-gray-700 border-2 border-gray-600'}`}>
                            {isRecording ? <StopIcon className="w-8 h-8 text-white" /> : <MicIcon className="w-8 h-8 text-white" />}
                        </button>
                        <p className="mt-4 text-xs font-mono text-yt-red h-4">{isRecording ? "Recording..." : "Record Microphone"}</p>
                    </div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-yt-card text-gray-500">OR</span></div>
                    <div>
                         <label className="flex flex-col items-center justify-center px-4 py-6 bg-gray-800/50 text-gray-300 rounded-lg shadow-lg tracking-wide uppercase border border-gray-700 cursor-pointer hover:bg-gray-800 hover:text-white transition-colors">
                            <UploadIcon className="w-8 h-8 mb-2" />
                            <span className="mt-1 text-sm">Select Audio, Video or PDF File</span>
                            <input type='file' className="hidden" accept="audio/*,video/*,application/pdf" onChange={handleFileUpload} />
                        </label>
                        <p className="mt-2 text-xs text-gray-500">Video uploads support Visual Analysis. PDFs extracts text for analysis.</p>
                    </div>
                </div>
            )}

            {inputMode !== 'audio' && (
                <button 
                    onClick={handleAnalyze} 
                    disabled={isLoading || isAnalysisComplete} 
                    className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 ${
                        isLoading 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : isAnalysisComplete
                                ? 'bg-green-600/90 text-white cursor-default shadow-lg shadow-green-900/20 hover:bg-green-600/90' 
                                : 'bg-yt-red hover:bg-red-600 text-white shadow-lg shadow-red-900/30'
                    }`}
                >
                {isLoading 
                    ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></span>{loadingStep || 'Analyzing...'}</span> 
                    : isAnalysisComplete
                        ? <span className="flex items-center justify-center gap-2"><CheckCircleIcon className="w-6 h-6" /> Analysis Generated</span>
                        : "Generate Analysis"
                }
                </button>
            )}
            
            {inputMode === 'audio' && isLoading && (
                 <div className="w-full py-4 rounded-xl font-bold text-lg tracking-wide text-center bg-gray-800 text-white flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></span>{loadingStep}
                 </div>
            )}

            {error && <div className="bg-red-900/20 border border-red-500/30 text-red-200 p-4 rounded-lg flex items-start gap-3 animate-fade-in"><div className="mt-0.5 text-red-500 text-xl">⚠️</div><div className="text-sm">{error}</div></div>}
          </div>
        </div>

        {/* Recent History Accordion */}
        {history.length > 0 && !isLoading && !data && (
           <div className="bg-yt-card border border-gray-800 rounded-2xl overflow-hidden mb-12">
              <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-900 transition-colors">
                 <div className="flex items-center gap-2 text-gray-300 font-medium">
                    <HistoryIcon className="w-5 h-5" /> Recent Analyses ({history.length})
                 </div>
                 {showHistory ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
              </button>
              
              {showHistory && (
                 <div className="divide-y divide-gray-800">
                    {history.map(item => (
                       <div key={item.id} onClick={() => loadFromHistory(item)} className="p-4 flex items-center gap-4 hover:bg-white/5 cursor-pointer transition-colors group">
                          {item.thumbnail ? (
                             <img src={item.thumbnail} alt="" className="w-16 h-9 object-cover rounded bg-black" />
                          ) : (
                             <div className="w-16 h-9 bg-gray-800 rounded flex items-center justify-center">
                                {item.data.title.toLowerCase().includes('pdf') ? <PdfIcon className="w-6 h-6 text-red-500" /> : <FileTextIcon className="w-4 h-4 text-gray-600" />}
                             </div>
                          )}
                          <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-bold text-white truncate group-hover:text-yt-red transition-colors">{item.title}</h4>
                             <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                <span className="border border-gray-700 px-1.5 rounded">{item.type}</span>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        )}

        {isLoading && <LoadingSkeleton />}
        {data && !isLoading && <AnalysisResult data={data} />}
      </main>
    </div>
  );
}
