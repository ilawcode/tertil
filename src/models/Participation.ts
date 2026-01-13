import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IParticipation extends Document {
    _id: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; // Optional for guest users
    programId: mongoose.Types.ObjectId;
    guestName?: string; // For anonymous/guest participants
    parts: number[]; // Alınan parça numaraları
    completedParts: number[]; // Tamamlanan parça numaraları
    isGuest: boolean; // Whether this is a guest participation
    addedBy?: mongoose.Types.ObjectId; // Who added this participant (for private programs)
    joinedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ParticipationSchema = new Schema<IParticipation>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Not required for guests
        },
        programId: {
            type: Schema.Types.ObjectId,
            ref: 'Program',
            required: true,
        },
        guestName: {
            type: String,
            required: false,
            trim: true,
        },
        parts: {
            type: [Number],
            default: [],
        },
        completedParts: {
            type: [Number],
            default: [],
        },
        isGuest: {
            type: Boolean,
            default: false,
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for finding participations
ParticipationSchema.index({ programId: 1 });
ParticipationSchema.index({ userId: 1 });
ParticipationSchema.index({ programId: 1, guestName: 1 });

const Participation: Model<IParticipation> =
    mongoose.models.Participation || mongoose.model<IParticipation>('Participation', ParticipationSchema);

export default Participation;
