import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';
import Participation from '@/models/Participation';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendEmail, getProgramCompletedEmail } from '@/lib/email';

// POST - Join a program and select parts (supports guest users, hizb selection, and proxy assignment)
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
        const { parts, selections, guestName, participantName } = body;

        // Logic to determine if we are assigning to a specific name (Guest or Proxy)
        // If a name is provided, we prioritize using it as a guest assignment
        const targetName = participantName || guestName;
        const isGuest = !!targetName || !session?.user?.id;

        if (!session?.user?.id && !targetName) {
            return NextResponse.json(
                { error: 'Ad ve soyad bilgisi gereklidir' },
                { status: 400 }
            );
        }

        // Normalize selections to { partNumber, hizbNumber? }[]
        let requestSelections: { partNumber: number; hizbNumber?: number }[] = [];

        if (selections && Array.isArray(selections)) {
            requestSelections = selections;
        } else if (parts && Array.isArray(parts)) {
            requestSelections = parts.map((p: number) => ({ partNumber: p }));
        } else {
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

        // Check internal access for private programs
        const isOwner = session?.user?.id === program.createdBy?.toString();
        const isAdmin = session?.user?.role === 'admin';

        if (!program.isPublic && !isOwner && !isAdmin) {
            return NextResponse.json(
                { error: 'Bu özel bir program. Sadece program sahibi katılımcı ekleyebilir.' },
                { status: 403 }
            );
        }

        // Check availability and conflicts
        const conflictParts: string[] = [];

        for (const selection of requestSelections) {
            const { partNumber, hizbNumber } = selection;
            const part = program.parts.find((p) => p.partNumber === partNumber);

            if (!part) {
                conflictParts.push(`#${partNumber} (Bulunamadı)`);
                continue;
            }

            // Check if Full Part is already assigned
            if (part.assignedTo || part.guestName) {
                conflictParts.push(`#${partNumber} (Tamamı Alınmış)`);
                continue;
            }

            if (hizbNumber) {
                // Joining specific Hizb
                // Check if this specific hizb is taken
                if (part.hizbs && part.hizbs.length > 0) {
                    const existingHizb = part.hizbs.find(h => h.hizbNumber === hizbNumber);
                    if (existingHizb && (existingHizb.assignedTo || existingHizb.guestName)) {
                        conflictParts.push(`#${partNumber}. Cüz ${hizbNumber}. Hizb`);
                    }
                }
            } else {
                // Joining Full Part (Cüz)
                // Check if ANY sub-part (hizb) is taken
                if (part.hizbs && part.hizbs.some(h => h.assignedTo || h.guestName)) {
                    conflictParts.push(`#${partNumber} (Parçalı Alınmış)`);
                }
            }
        }

        if (conflictParts.length > 0) {
            return NextResponse.json(
                {
                    error: `Seçilen kısımlar müsait değil: ${conflictParts.join(', ')}`,
                    conflictParts
                },
                { status: 409 }
            );
        }

        // Apply assignments
        for (const selection of requestSelections) {
            const { partNumber, hizbNumber } = selection;
            const part = program.parts.find((p) => p.partNumber === partNumber);

            if (!part) continue;

            if (hizbNumber) {
                // Assign Hizb
                // Initialize hizbs if needed
                if (!part.hizbs || part.hizbs.length === 0) {
                    part.hizbs = [1, 2, 3, 4].map(h => ({ hizbNumber: h, isCompleted: false }));
                }

                const hizb = part.hizbs.find(h => h.hizbNumber === hizbNumber);
                if (hizb) {
                    if (isGuest) {
                        hizb.guestName = targetName;
                    } else {
                        hizb.assignedTo = new mongoose.Types.ObjectId(session!.user.id);
                    }
                    hizb.assignedAt = new Date();
                }
            } else {
                // Assign Full Part
                if (isGuest) {
                    part.guestName = targetName;
                } else {
                    part.assignedTo = new mongoose.Types.ObjectId(session!.user.id);
                }
                part.assignedAt = new Date();
            }
        }

        // Create/Update Participation Record
        // Note: For simplicity, we store the main part number in the participation 'parts' array.
        // If we want detailed tracking in 'Participation' model, we might need to update that schema too.
        // For now, we will store partNumber. Ideally, we should store {part, hizb}.
        // BUT, given the scope, let's keep participation 'parts' as simple numbers for "Overview",
        // trusting Program model for detailed state. 
        // OR we just push the partNumber. If it's a hizb, we still "participated" in that part.

        const partNumbers = [...new Set(requestSelections.map(s => s.partNumber))];

        if (isGuest) {
            const existingGuest = await Participation.findOne({
                programId: id,
                guestName: targetName,
                isGuest: true,
            });

            if (existingGuest) {
                await Participation.findByIdAndUpdate(existingGuest._id, {
                    $addToSet: { parts: { $each: partNumbers } },
                });
            } else {
                program.totalParticipants += 1;
                await Participation.create({
                    programId: id,
                    guestName: targetName,
                    parts: partNumbers,
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
                    $addToSet: { parts: { $each: partNumbers } },
                    $setOnInsert: { joinedAt: new Date(), isGuest: false },
                },
                { upsert: true }
            );
        }

        await program.save();

        return NextResponse.json({
            message: 'Başarıyla katıldınız!',
            selectedParts: requestSelections,
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
