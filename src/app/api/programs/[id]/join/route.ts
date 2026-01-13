import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';
import Participation from '@/models/Participation';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendEmail, getProgramCompletedEmail } from '@/lib/email';

// POST - Join a program and select parts (supports guest users)
export async function POST(
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

        const body = await request.json();
        const { parts, guestName, participantName } = body;

        // For guest users, guestName is required
        // For private programs, participantName is used when owner adds someone
        if (!session?.user?.id && !guestName) {
            return NextResponse.json(
                { error: 'Ad ve soyad bilgisi gereklidir' },
                { status: 400 }
            );
        }

        if (!parts || !Array.isArray(parts) || parts.length === 0) {
            return NextResponse.json(
                { error: 'Lütfen en az bir kısım seçin' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const program = await Program.findById(id);

        if (!program) {
            return NextResponse.json(
                { error: 'Program bulunamadı' },
                { status: 404 }
            );
        }

        if (!program.isApproved || program.status !== 'active') {
            return NextResponse.json(
                { error: 'Program aktif değil' },
                { status: 400 }
            );
        }

        // Check if this is a private program
        const isOwner = session?.user?.id === program.createdBy?.toString();
        const isAdmin = session?.user?.role === 'admin';

        if (!program.isPublic && !isOwner && !isAdmin) {
            return NextResponse.json(
                { error: 'Bu özel bir program. Sadece program sahibi katılımcı ekleyebilir.' },
                { status: 403 }
            );
        }

        // For private programs, owner can add participants with participantName
        const isAddingForOther = !program.isPublic && (isOwner || isAdmin) && participantName;

        // Check if parts are available
        const unavailableParts = parts.filter((partNum: number) => {
            const part = program.parts.find((p) => p.partNumber === partNum);
            return !part || part.assignedTo || part.guestName;
        });

        if (unavailableParts.length > 0) {
            return NextResponse.json(
                {
                    error: `${unavailableParts.join(', ')} numaralı kısımlar müsait değil`,
                    conflictParts: unavailableParts
                },
                { status: 409 }
            );
        }

        // Determine participant info
        const isGuest = !session?.user?.id || isAddingForOther;
        const finalGuestName = isAddingForOther ? participantName : guestName;

        // Assign parts
        program.parts.forEach((part) => {
            if (parts.includes(part.partNumber)) {
                if (isGuest) {
                    part.guestName = finalGuestName;
                } else {
                    part.assignedTo = new mongoose.Types.ObjectId(session!.user.id);
                }
                part.assignedAt = new Date();
            }
        });

        // Create participation record
        if (isGuest) {
            // Check if guest already has participation
            const existingGuest = await Participation.findOne({
                programId: id,
                guestName: finalGuestName,
                isGuest: true,
            });

            if (existingGuest) {
                await Participation.findByIdAndUpdate(existingGuest._id, {
                    $addToSet: { parts: { $each: parts } },
                });
            } else {
                program.totalParticipants += 1;
                await Participation.create({
                    programId: id,
                    guestName: finalGuestName,
                    parts: parts,
                    isGuest: true,
                    addedBy: session?.user?.id ? new mongoose.Types.ObjectId(session.user.id) : undefined,
                    joinedAt: new Date(),
                });
            }
        } else {
            const existingParticipation = await Participation.findOne({
                userId: session!.user.id,
                programId: id,
            });

            if (!existingParticipation) {
                program.totalParticipants += 1;
            }

            await Participation.findOneAndUpdate(
                { userId: session!.user.id, programId: id },
                {
                    $addToSet: { parts: { $each: parts } },
                    $setOnInsert: { joinedAt: new Date(), isGuest: false },
                },
                { upsert: true }
            );
        }

        await program.save();

        return NextResponse.json({
            message: 'Başarıyla katıldınız!',
            selectedParts: parts,
        });
    } catch (error) {
        console.error('Error joining program:', error);
        return NextResponse.json(
            { error: 'Katılım işlemi başarısız' },
            { status: 500 }
        );
    }
}

// PUT - Mark parts as completed
export async function PUT(
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

        const body = await request.json();
        const { parts, guestName } = body;

        if (!parts || !Array.isArray(parts)) {
            return NextResponse.json(
                { error: 'Parts array is required' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const program = await Program.findById(id);

        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        const isOwner = session?.user?.id === program.createdBy?.toString();
        const isAdmin = session?.user?.role === 'admin';

        // Verify ownership - user can complete their own parts, or owner can complete any
        if (session?.user?.id) {
            const userParts = program.parts.filter(
                (p) => p.assignedTo?.toString() === session.user.id && parts.includes(p.partNumber)
            );

            if (userParts.length !== parts.length && !isOwner && !isAdmin) {
                return NextResponse.json(
                    { error: 'You can only update your own parts' },
                    { status: 403 }
                );
            }
        }

        // Update part completion status
        let completedCount = 0;
        program.parts.forEach((part) => {
            if (parts.includes(part.partNumber)) {
                // Check if this part belongs to the requester or owner is marking
                const isUsersPart = part.assignedTo?.toString() === session?.user?.id;
                const isGuestPart = part.guestName === guestName;

                if (isUsersPart || isGuestPart || isOwner || isAdmin) {
                    part.isCompleted = true;
                    part.completedAt = new Date();
                }
            }
            if (part.isCompleted) {
                completedCount++;
            }
        });

        program.completedParts = completedCount;

        // Check if program is completed
        if (completedCount === program.parts.length) {
            program.status = 'completed';

            // Send completion email to program creator
            const creator = await User.findById(program.createdBy);
            if (creator) {
                const emailContent = getProgramCompletedEmail(program.title, creator.firstName);
                await sendEmail({
                    to: creator.email,
                    ...emailContent,
                });
            }
        }

        await program.save();

        // Update participation record
        if (session?.user?.id) {
            await Participation.findOneAndUpdate(
                { userId: session.user.id, programId: id },
                { $addToSet: { completedParts: { $each: parts } } }
            );
        } else if (guestName) {
            await Participation.findOneAndUpdate(
                { programId: id, guestName: guestName, isGuest: true },
                { $addToSet: { completedParts: { $each: parts } } }
            );
        }

        return NextResponse.json({
            message: 'Okumalar tamamlandı olarak işaretlendi',
            programStatus: program.status,
            completedParts: program.completedParts,
            totalParts: program.parts.length,
        });
    } catch (error) {
        console.error('Error updating parts:', error);
        return NextResponse.json(
            { error: 'Failed to update parts' },
            { status: 500 }
        );
    }
}
