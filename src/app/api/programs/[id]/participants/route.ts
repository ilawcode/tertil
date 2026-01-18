import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';
import User from '@/models/User';
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

interface PartSelection {
    partNumber: number;
    hizbNumber?: number;
    isCompleted: boolean;
}

interface ParticipantInfo {
    name: string;
    maskedName: string;
    selections: PartSelection[];
    isGuest: boolean;
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
            .populate('parts.assignedTo', 'firstName lastName')
            .populate('parts.hizbs.assignedTo', 'firstName lastName')
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

        // Build participants list directly from program.parts
        const participantMap: Map<string, ParticipantInfo> = new Map();

        // Helper to add participant
        const addParticipant = (
            name: string,
            partNumber: number,
            hizbNumber: number | undefined,
            isCompleted: boolean,
            isGuest: boolean
        ) => {
            const key = name.toLowerCase();
            if (!participantMap.has(key)) {
                participantMap.set(key, {
                    name: canSeeFullNames ? name : maskName(name),
                    maskedName: maskName(name),
                    selections: [],
                    isGuest,
                });
            }
            participantMap.get(key)!.selections.push({
                partNumber,
                hizbNumber,
                isCompleted,
            });
        };

        // Process each part
        for (const part of program.parts) {
            // Check if full part is assigned
            if (part.assignedTo || part.guestName) {
                let name = '';
                const isGuest = !!part.guestName;

                if (part.guestName) {
                    name = part.guestName;
                } else if (part.assignedTo && typeof part.assignedTo === 'object') {
                    const user = part.assignedTo as { firstName?: string; lastName?: string };
                    name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                }

                if (name) {
                    addParticipant(name, part.partNumber, undefined, part.isCompleted, isGuest);
                }
            }

            // Check hizbs
            if (part.hizbs && part.hizbs.length > 0) {
                for (const hizb of part.hizbs) {
                    if (hizb.assignedTo || hizb.guestName) {
                        let name = '';
                        const isGuest = !!hizb.guestName;

                        if (hizb.guestName) {
                            name = hizb.guestName;
                        } else if (hizb.assignedTo && typeof hizb.assignedTo === 'object') {
                            const user = hizb.assignedTo as { firstName?: string; lastName?: string };
                            name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                        }

                        if (name) {
                            addParticipant(name, part.partNumber, hizb.hizbNumber, hizb.isCompleted, isGuest);
                        }
                    }
                }
            }
        }

        // Convert map to array and sort
        const participants = Array.from(participantMap.values());

        // Sort by first part number
        participants.sort((a, b) => {
            const aFirst = a.selections[0]?.partNumber || 0;
            const bFirst = b.selections[0]?.partNumber || 0;
            return aFirst - bFirst;
        });

        // Sort each participant's selections
        participants.forEach(p => {
            p.selections.sort((a, b) => {
                if (a.partNumber !== b.partNumber) return a.partNumber - b.partNumber;
                return (a.hizbNumber || 0) - (b.hizbNumber || 0);
            });
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

function generateTextExport(
    program: ProgramData,
    participants: ParticipantInfo[],
    showFullNames: boolean
): string {
    let text = `📖 ${program.title}\n`;
    if (program.dedicatedTo) {
        text += `❤️ ${program.dedicatedTo}\n`;
    }
    text += `\n${'─'.repeat(30)}\n\n`;

    participants.forEach((p) => {
        const completedCount = p.selections.filter(s => s.isCompleted).length;
        const totalCount = p.selections.length;
        const status = completedCount === totalCount ? '✅' : '⏳';

        const partsStr = p.selections.map(s => {
            if (s.hizbNumber) {
                return `${s.partNumber}. Cüz ${s.hizbNumber}. Hizb`;
            }
            return program.programType === 'hatim' ? `${s.partNumber}. Cüz` : `#${s.partNumber}`;
        }).join(', ');

        text += `${status} ${showFullNames ? p.name : p.maskedName} - ${partsStr}\n`;
    });

    text += `\n${'─'.repeat(30)}\n`;
    text += `Toplam: ${participants.length} katılımcı\n`;

    return text;
}

function generateWhatsAppExport(
    program: ProgramData,
    participants: ParticipantInfo[],
    showFullNames: boolean
): string {
    let text = `📖 *${program.title}*\n`;
    if (program.dedicatedTo) {
        text += `❤️ _${program.dedicatedTo}_\n`;
    }
    text += `\n`;

    participants.forEach((p) => {
        const completedCount = p.selections.filter(s => s.isCompleted).length;
        const totalCount = p.selections.length;
        const status = completedCount === totalCount ? '✅' : '⏳';

        const partsStr = p.selections.map(s => {
            if (s.hizbNumber) {
                return `${s.partNumber}. Cüz ${s.hizbNumber}. Hizb`;
            }
            return program.programType === 'hatim' ? `${s.partNumber}. Cüz` : `#${s.partNumber}`;
        }).join(', ');

        text += `${status} *${showFullNames ? p.name : p.maskedName}* - ${partsStr}\n`;
    });

    text += `\n📊 Toplam: ${participants.length} katılımcı`;

    return text;
}
