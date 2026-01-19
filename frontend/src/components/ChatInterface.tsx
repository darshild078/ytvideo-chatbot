import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useVideoStore } from '../stores/videoStore';
import { sendQuery } from '../services/api';

interface ChatInterfaceProps {
    onTimestampClick: (time: number) => void;
}

export default function ChatInterface({ onTimestampClick }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, isLoading, sessionId, addUserMessage, addAssistantMessage, setLoading, setSessionId } = useChatStore();
    const { videoId, isIndexed } = useVideoStore();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !videoId || !isIndexed || isLoading) return;

        const question = input.trim();
        setInput('');
        addUserMessage(question);
        setLoading(true);

        try {
            const response = await sendQuery(videoId, question, sessionId || undefined);

            if (!sessionId) {
                setSessionId(response.sessionId);
            }

            addAssistantMessage(
                response.answer,
                response.primaryTimestamp,
                response.formattedTime,
                response.confidence,
                response.secondaryTimestamps
            );
        } catch (error) {
            addAssistantMessage(
                error instanceof Error ? error.message : 'Failed to process your question. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-dark-200 rounded-xl border border-gray-800">
            <div className="px-4 py-3 border-b border-gray-800">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Chat
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p>Ask a question about the video</p>
                        <p className="text-sm mt-2">Get answers with precise timestamps</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-dark-100 text-gray-200 border border-gray-800'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                {msg.role === 'assistant' && msg.timestamp !== undefined && msg.timestamp > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-700">
                                        <button
                                            onClick={() => onTimestampClick(msg.timestamp!)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Play at {msg.formattedTime}
                                        </button>
                                    </div>
                                )}

                                {msg.role === 'assistant' && msg.confidence !== undefined && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full transition-all"
                                                style={{ width: `${msg.confidence * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {Math.round(msg.confidence * 100)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-dark-100 border border-gray-800 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isIndexed ? "Ask about the video..." : "Wait for video to be indexed..."}
                        disabled={!isIndexed || isLoading}
                        className="input-field flex-1"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || !isIndexed || isLoading}
                        className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
