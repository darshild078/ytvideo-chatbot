import mongoose, { Schema, Document } from 'mongoose';

export interface ITranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

export interface ITranscript extends Document {
    videoId: string;
    segments: ITranscriptSegment[];
    language: string;
    createdAt: Date;
}

const transcriptSegmentSchema = new Schema<ITranscriptSegment>(
    {
        text: { type: String, required: true },
        start: { type: Number, required: true },
        duration: { type: Number, required: true },
    },
    { _id: false }
);

const transcriptSchema = new Schema<ITranscript>(
    {
        videoId: { type: String, required: true, unique: true, index: true },
        segments: { type: [transcriptSegmentSchema], required: true },
        language: { type: String, default: 'en' },
    },
    { timestamps: true }
);

export const Transcript = mongoose.model<ITranscript>('Transcript', transcriptSchema);
