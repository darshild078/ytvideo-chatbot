import { useEffect, useRef } from 'react';
import { formatTime } from '../utils/formatTime';
import type { TranscriptSegment } from '../types';

interface TranscriptViewerProps {
    transcript: TranscriptSegment[];
    currentTime: number;
    onTimestampClick: (time: number) => void;
}

export default function TranscriptViewer({
    transcript,
    currentTime,
    onTimestampClick,
}: TranscriptViewerProps) {
    const activeRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentSegmentIndex = transcript.findIndex(
        (seg) => currentTime >= seg.start && currentTime < seg.start + seg.duration
    );

    useEffect(() => {
        if (activeRef.current && containerRef.current) {
            const container = containerRef.current;
            const element = activeRef.current;

            const containerTop = container.scrollTop;
            const containerBottom = containerTop + container.clientHeight;
            const elementTop = element.offsetTop - container.offsetTop;
            const elementBottom = elementTop + element.clientHeight;

            if (elementTop < containerTop || elementBottom > containerBottom) {
                container.scrollTo({
                    top: elementTop - container.clientHeight / 3,
                    behavior: 'smooth',
                });
            }
        }
    }, [currentSegmentIndex]);

    if (transcript.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p>Transcript will appear here</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-dark-200 rounded-xl border border-gray-800">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Transcript
                </h2>
                <span className="text-xs text-gray-500">{transcript.length} segments</span>
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto p-2 space-y-1">
                {transcript.map((segment, index) => {
                    const isActive = index === currentSegmentIndex;

                    return (
                        <button
                            key={index}
                            ref={isActive ? activeRef : null}
                            onClick={() => onTimestampClick(segment.start)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-primary-500/20 border border-primary-500/50'
                                    : 'hover:bg-dark-100 border border-transparent'
                                }`}
                        >
                            <span
                                className={`text-xs font-mono ${isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'
                                    }`}
                            >
                                {formatTime(segment.start)}
                            </span>
                            <p
                                className={`text-sm mt-0.5 leading-relaxed ${isActive ? 'text-white' : 'text-gray-400'
                                    }`}
                            >
                                {segment.text}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
