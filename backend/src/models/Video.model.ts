import mongoose, { Schema, Document } from 'mongoose';

export interface IVideo extends Document {
    videoId: string;
    title: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    subscriberCount?: number;
    viewCount?: number;
    likeCount?: number;
    publishedAt?: Date;
    duration?: string;
    thumbnailUrl?: string;
    indexed: boolean;
    chunkCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
    {
        videoId: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        description: { type: String },
        channelId: { type: String },
        channelTitle: { type: String },
        subscriberCount: { type: Number },
        viewCount: { type: Number },
        likeCount: { type: Number },
        publishedAt: { type: Date },
        duration: { type: String },
        thumbnailUrl: { type: String },
        indexed: { type: Boolean, default: false },
        chunkCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const Video = mongoose.model<IVideo>('Video', videoSchema);
