import { useState, useEffect, useRef, useCallback } from 'react';
import { useVideoStore } from './stores/videoStore';
import { useChatStore } from './stores/chatStore';
import { analyzeVideo, getTranscript } from './services/api';
import {
    connectWebSocket,
    joinVideoRoom,
    leaveVideoRoom,
    onIngestionProgress,
    onIngestionComplete,
    onIngestionError,
    removeAllListeners,
} from './services/websocket';

import VideoPlayer, { VideoPlayerHandle } from './components/VideoPlayer';
import ChatInterface from './components/ChatInterface';
import TranscriptViewer from './components/TranscriptViewer';
import ProgressBar from './components/ProgressBar';
import VideoInput from './components/VideoInput';

function App() {
    const playerRef = useRef<VideoPlayerHandle>(null);

    const {
        videoId,
        isIndexed,
        isLoading,
        progress,
        progressStage,
        transcript,
        currentTime,
        error,
        setVideoId,
        setIndexed,
        setLoading,
        setProgress,
        setTranscript,
        setCurrentTime,
        setError,
        reset,
    } = useVideoStore();

    const { clearMessages } = useChatStore();

    useEffect(() => {
        connectWebSocket();
        return () => {
            removeAllListeners();
        };
    }, []);

    useEffect(() => {
        if (videoId) {
            joinVideoRoom(videoId);

            onIngestionProgress((data) => {
                if (data.videoId === videoId) {
                    setProgress(data.progress, data.stage);
                }
            });

            onIngestionComplete(async (data) => {
                if (data.videoId === videoId && data.success) {
                    setIndexed(true);
                    setLoading(false);
                    setProgress(100, 'Complete!');

                    try {
                        const transcriptData = await getTranscript(videoId);
                        setTranscript(transcriptData);
                    } catch (err) {
                        console.error('Failed to fetch transcript:', err);
                    }
                }
            });

            onIngestionError((data) => {
                if (data.videoId === videoId) {
                    setError(data.error);
                }
            });
        }

        return () => {
            if (videoId) {
                leaveVideoRoom(videoId);
                removeAllListeners();
            }
        };
    }, [videoId, setProgress, setIndexed, setLoading, setTranscript, setError]);

    const handleVideoSubmit = async (url: string) => {
        reset();
        clearMessages();
        setLoading(true);

        try {
            const response = await analyzeVideo(url);
            setVideoId(response.videoId);

            if (response.status === 'already_indexed') {
                setIndexed(true);
                setProgress(100, 'Already indexed');
                setLoading(false);

                const transcriptData = await getTranscript(response.videoId);
                setTranscript(transcriptData);
            } else {
                setProgress(0, 'Queued for processing...');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze video');
        }
    };

    const handleTimestampClick = useCallback((time: number) => {
        if (playerRef.current) {
            playerRef.current.seekTo(time);
            playerRef.current.play();
        }
    }, []);

    const handleNewVideo = () => {
        reset();
        clearMessages();
    };

    return (
        <div className="h-screen flex flex-col bg-dark-300">
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-dark-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                        YouTube RAG Chatbot
                    </h1>
                </div>

                {videoId && (
                    <button
                        onClick={handleNewVideo}
                        className="btn-secondary text-sm"
                    >
                        New Video
                    </button>
                )}
            </header>

            <main className="flex-1 flex overflow-hidden">
                {!videoId ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center max-w-xl">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-3">Welcome to YouTube RAG Chatbot</h2>
                            <p className="text-gray-400 mb-8">
                                Paste a YouTube video URL to get started. Ask questions and get answers with precise timestamps.
                            </p>
                            <VideoInput
                                onSubmit={handleVideoSubmit}
                                isLoading={isLoading}
                                error={error}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Left Panel: Video + Transcript */}
                        <div className="w-1/2 flex flex-col border-r border-gray-800">
                            {/* Video Player - Takes 60% of height */}
                            <div className="flex-shrink-0 p-4" style={{ height: '60%' }}>
                                <VideoPlayer
                                    ref={playerRef}
                                    videoId={videoId}
                                    onTimeUpdate={setCurrentTime}
                                />
                            </div>

                            {/* Progress/Error */}
                            {(!isIndexed && isLoading) && (
                                <div className="flex-shrink-0 px-4 pb-2">
                                    <div className="card">
                                        <ProgressBar progress={progress} stage={progressStage} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex-shrink-0 px-4 pb-2">
                                    <div className="card bg-red-500/10 border-red-500/50">
                                        <div className="flex items-center gap-3 text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm">{error}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Transcript - Fills remaining space */}
                            {isIndexed && transcript.length > 0 && (
                                <div className="flex-1 overflow-hidden px-4 pb-4">
                                    <TranscriptViewer
                                        transcript={transcript}
                                        currentTime={currentTime}
                                        onTimestampClick={handleTimestampClick}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Right Panel: Chat */}
                        <div className="w-1/2 p-4">
                            <ChatInterface onTimestampClick={handleTimestampClick} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
