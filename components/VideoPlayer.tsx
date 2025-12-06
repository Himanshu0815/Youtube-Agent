
import React, { useEffect, useRef } from 'react';

interface Props {
  videoId: string;
  seekToTimestamp: number | null;
  className?: string;
}

export const VideoPlayer: React.FC<Props> = ({ videoId, seekToTimestamp, className }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Construct safe origin for YouTube API to prevent Error 153
  // If window.location.origin is 'null' (local file) or undefined, use a generic valid origin or empty string
  const getOrigin = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    if (origin === 'null' || !origin) return 'http://localhost:3000'; // Fallback for local dev
    return origin;
  };

  const origin = getOrigin();

  useEffect(() => {
    if (seekToTimestamp !== null && iframeRef.current && iframeRef.current.contentWindow) {
      // Use YouTube IFrame API postMessage to seek without reloading
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seekToTimestamp, true]
        }), 
        '*'
      );
    }
  }, [seekToTimestamp]);

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black ${className}`}>
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0&origin=${origin}&widget_referrer=${origin}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};
