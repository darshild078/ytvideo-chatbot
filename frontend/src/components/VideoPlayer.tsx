import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

declare global {
    interface Window {
        YT: {
            Player: new (
                elementId: string,
                config: {
                    videoId: string;
                    playerVars?: Record<string, number | string>;
                    events?: {
                        onReady?: (event: { target: YTPlayer }) => void;
                        onStateChange?: (event: { data: number }) => void;
                    };
                }
            ) => YTPlayer;
            PlayerState: {
                PLAYING: number;
                PAUSED: number;
                ENDED: number;
            };
        };
        onYouTubeIframeAPIReady?: () => void;
    }
}

interface YTPlayer {
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    destroy: () => void;
}

interface VideoPlayerProps {
    videoId: string;
    onTimeUpdate?: (time: number) => void;
}

export interface VideoPlayerHandle {
    seekTo: (seconds: number) => void;
    play: () => void;
    pause: () => void;
    getCurrentTime: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
    ({ videoId, onTimeUpdate }, ref) => {
        const playerRef = useRef<YTPlayer | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const timeUpdateInterval = useRef<number | null>(null);

        const handleTimeUpdate = useCallback(() => {
            if (playerRef.current && onTimeUpdate) {
                const time = playerRef.current.getCurrentTime();
                onTimeUpdate(time);
            }
        }, [onTimeUpdate]);

        useImperativeHandle(ref, () => ({
            seekTo: (seconds: number) => {
                playerRef.current?.seekTo(seconds, true);
            },
            play: () => {
                playerRef.current?.playVideo();
            },
            pause: () => {
                playerRef.current?.pauseVideo();
            },
            getCurrentTime: () => {
                return playerRef.current?.getCurrentTime() || 0;
            },
        }));

        useEffect(() => {
            const loadYouTubeAPI = () => {
                if (window.YT) {
                    initializePlayer();
                    return;
                }

                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

                window.onYouTubeIframeAPIReady = () => {
                    initializePlayer();
                };
            };

            const initializePlayer = () => {
                if (!containerRef.current || !videoId) return;

                if (playerRef.current) {
                    playerRef.current.destroy();
                }

                const playerId = `youtube-player-${videoId}`;
                containerRef.current.innerHTML = `<div id="${playerId}" style="width: 100%; height: 100%;"></div>`;

                playerRef.current = new window.YT.Player(playerId, {
                    videoId,
                    playerVars: {
                        autoplay: 0,
                        modestbranding: 1,
                        rel: 0,
                    },
                    events: {
                        onReady: () => {
                            timeUpdateInterval.current = window.setInterval(handleTimeUpdate, 500);
                        },
                        onStateChange: () => {
                            handleTimeUpdate();
                        },
                    },
                });
            };

            loadYouTubeAPI();

            return () => {
                if (timeUpdateInterval.current) {
                    clearInterval(timeUpdateInterval.current);
                }
                if (playerRef.current) {
                    playerRef.current.destroy();
                }
            };
        }, [videoId, handleTimeUpdate]);

        return (
            <div className="relative w-full h-full bg-dark-300 rounded-xl overflow-hidden">
                <div ref={containerRef} className="absolute inset-0" />
                <style>{`
          #youtube-player-${videoId} iframe {
            width: 100% !important;
            height: 100% !important;
          }
        `}</style>
            </div>
        );
    }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
