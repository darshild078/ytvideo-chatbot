interface ProgressBarProps {
    progress: number;
    stage: string;
}

export default function ProgressBar({ progress, stage }: ProgressBarProps) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">{stage || 'Processing...'}</span>
                <span className="text-sm font-medium text-primary-400">{Math.round(progress)}%</span>
            </div>

            <div className="h-2 bg-dark-300 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {progress < 100 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
                    <span>This may take 20-40 seconds for a typical video</span>
                </div>
            )}
        </div>
    );
}
