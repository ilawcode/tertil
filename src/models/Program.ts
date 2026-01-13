import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProgramType = 'hatim' | 'yasin' | 'ihlas' | 'fatiha' | 'fetih' | 'custom';
export type ProgramStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface IProgramPart {
    partNumber: number; // Cüz, hizb veya sayı
    partType: 'cuz' | 'hizb' | 'piece'; // Parça türü
    assignedTo?: mongoose.Types.ObjectId;
    guestName?: string; // For anonymous/guest participants
    assignedAt?: Date;
    isCompleted: boolean;
    completedAt?: Date;
    hizbs?: {
        hizbNumber: number;
        assignedTo?: mongoose.Types.ObjectId;
        guestName?: string;
        assignedAt?: Date;
        isCompleted: boolean;
        completedAt?: Date;
    }[];
}

export interface IProgram extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    programType: ProgramType;
    customType?: string; // Custom program türleri için
    createdBy: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    targetCount: number; // Toplam parça/adet sayısı
    partType: 'cuz' | 'hizb' | 'piece'; // Hatim için cüz/hizb, diğerleri için piece
    parts: IProgramPart[];
    status: ProgramStatus;
    isApproved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    dedicatedTo?: string; // Kimin için okunuyor (vefat eden vs.)
    isPublic: boolean;
    totalParticipants: number;
    completedParts: number;
    createdAt: Date;
    updatedAt: Date;
}

const ProgramPartSchema = new Schema<IProgramPart>(
    {
        partNumber: {
            type: Number,
            required: true,
        },
        partType: {
            type: String,
            enum: ['cuz', 'hizb', 'piece'],
            required: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        guestName: {
            type: String,
            trim: true,
        },
        assignedAt: {
            type: Date,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        completedAt: {
            type: Date,
        },
        hizbs: [
            {
                hizbNumber: { type: Number, required: true },
                assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
                guestName: { type: String, trim: true },
                assignedAt: { type: Date },
                isCompleted: { type: Boolean, default: false },
                completedAt: { type: Date },
            }
        ],
    },
    { _id: false }
);

const ProgramSchema = new Schema<IProgram>(
    {
        title: {
            type: String,
            required: [true, 'Program title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        programType: {
            type: String,
            enum: ['hatim', 'yasin', 'ihlas', 'fatiha', 'fetih', 'custom'],
            required: true,
        },
        customType: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required'],
        },
        targetCount: {
            type: Number,
            required: true,
            min: [1, 'Target count must be at least 1'],
        },
        partType: {
            type: String,
            enum: ['cuz', 'hizb', 'piece'],
            required: true,
        },
        parts: [ProgramPartSchema],
        status: {
            type: String,
            enum: ['pending', 'active', 'completed', 'cancelled'],
            default: 'pending',
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedAt: {
            type: Date,
        },
        dedicatedTo: {
            type: String,
            trim: true,
            maxlength: [200, 'Dedication cannot exceed 200 characters'],
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        totalParticipants: {
            type: Number,
            default: 0,
        },
        completedParts: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Virtual for progress percentage
ProgramSchema.virtual('progress').get(function () {
    if (this.parts.length === 0) return 0;
    return Math.round((this.completedParts / this.parts.length) * 100);
});

// Virtual for remaining parts
ProgramSchema.virtual('remainingParts').get(function () {
    return this.parts.filter((part) => !part.assignedTo).length;
});

// Index for efficient queries
ProgramSchema.index({ status: 1, isApproved: 1 });
ProgramSchema.index({ createdBy: 1 });
ProgramSchema.index({ 'parts.assignedTo': 1 });
ProgramSchema.index({ startDate: 1, endDate: 1 });

const Program: Model<IProgram> =
    mongoose.models.Program || mongoose.model<IProgram>('Program', ProgramSchema);

export default Program;
