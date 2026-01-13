import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';
import Participation from '@/models/Participation';
import mongoose from 'mongoose';

// Mask name helper: "Ahmet Yılmaz" -> "A*** Y***"
function maskName(name: string): string {
    return name
        .split(' ')
        .map(part => {
            if (part.length <= 1) return part;
            return part[0] + '*'.repeat(Math.min(part.length - 1, 3));
        })
        .join(' ');
}

// GET - Get participants list for a program
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid program ID' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const program = await Program.findById(id)
            .populate('createdBy', 'firstName lastName')
            .lean();

        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        const isOwner = session?.user?.id === program.createdBy?._id?.toString();
        const isAdmin = session?.user?.role === 'admin';
        const canSeeFullNames = isOwner || isAdmin;

        // Get all participations
        const participations = await Participation.find({ programId: id })
            .populate('userId', 'firstName lastName')
            .lean();

        // Build participants list
        interface ParticipantInfo {
            name: string;
            maskedName: string;
            parts: number[];
            completedParts: number[];
            isGuest: boolean;
            joinedAt: Date;
        }

        const participants: ParticipantInfo[] = [];

        participations.forEach((p) => {
            let name = '';
            if (p.isGuest && p.guestName) {
                name = p.guestName;
            } else if (p.userId && typeof p.userId === 'object') {
                const user = p.userId as { firstName?: string; lastName?: string };
                name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            }

            if (name) {
                participants.push({
                    name: canSeeFullNames ? name : maskName(name),
                    maskedName: maskName(name),
                    parts: p.parts || [],
                    completedParts: p.completedParts || [],
                    isGuest: p.isGuest || false,
                    joinedAt: p.joinedAt,
                });
            }
        });

        // Sort by part number (first part)
        participants.sort((a, b) => {
            const aFirst = a.parts[0] || 0;
            const bFirst = b.parts[0] || 0;
            return aFirst - bFirst;
        });

        // Generate export data
        const exportData = {
            text: generateTextExport(program, participants, canSeeFullNames),
            whatsapp: generateWhatsAppExport(program, participants, canSeeFullNames),
        };

        return NextResponse.json({
            participants,
            totalParticipants: participants.length,
            canSeeFullNames,
            exportData,
            program: {
                title: program.title,
                programType: program.programType,
                dedicatedTo: program.dedicatedTo,
            },
        });
    } catch (error) {
        console.error('Error fetching participants:', error);
        return NextResponse.json(
            { error: 'Failed to fetch participants' },
            { status: 500 }
        );
    }
}

interface ProgramData {
    title: string;
    programType: string;
    dedicatedTo?: string;
}

interface ParticipantData {
    name: string;
    parts: number[];
    completedParts: number[];
}

function generateTextExport(
    program: ProgramData,
    participants: ParticipantData[],
    showFullNames: boolean
): string {
    let text = `📖 ${program.title}\n`;
    if (program.dedicatedTo) {
        text += `❤️ ${program.dedicatedTo}\n`;
    }
    text += `\n${'─'.repeat(30)}\n\n`;

    const partLabel = program.programType === 'hatim' ? 'Cüz' : 'Kısım';

    participants.forEach((p) => {
        const status = p.completedParts.length === p.parts.length ? '✅' : '⏳';
        const partsStr = p.parts.map(n => `${n}. ${partLabel}`).join(', ');
        text += `${status} ${showFullNames ? p.name : p.name} - ${partsStr}\n`;
    });

    text += `\n${'─'.repeat(30)}\n`;
    text += `Toplam: ${participants.length} katılımcı\n`;

    return text;
}

function generateWhatsAppExport(
    program: ProgramData,
    participants: ParticipantData[],
    showFullNames: boolean
): string {
    let text = `📖 *${program.title}*\n`;
    if (program.dedicatedTo) {
        text += `❤️ _${program.dedicatedTo}_\n`;
    }
    text += `\n`;

    const partLabel = program.programType === 'hatim' ? 'Cüz' : 'Kısım';

    participants.forEach((p) => {
        const status = p.completedParts.length === p.parts.length ? '✅' : '⏳';
        const partsStr = p.parts.map(n => `${n}. ${partLabel}`).join(', ');
        text += `${status} *${showFullNames ? p.name : p.name}* - ${partsStr}\n`;
    });

    text += `\n📊 Toplam: ${participants.length} katılımcı`;

    return text;
}
