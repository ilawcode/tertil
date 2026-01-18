import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';
import Participation from '@/models/Participation';
import mongoose from 'mongoose';

// GET - Fetch single program details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid program ID' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const session = await getServerSession(authOptions);

        const program = await Program.findById(id)
            .populate('createdBy', 'firstName lastName')
            .lean();

        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        // Check if program is approved or user is creator/admin
        const isCreator = session?.user?.id === program.createdBy._id.toString();
        const isAdmin = session?.user?.role === 'admin';

        if (!program.isApproved && !isCreator && !isAdmin) {
            return NextResponse.json(
                { error: 'Program not accessible' },
                { status: 403 }
            );
        }

        // Get user's participation if logged in
        let myParticipation = null;
        if (session?.user?.id) {
            // Build participation from program.parts (more accurate than Participation model)
            const mySelections: { partNumber: number; hizbNumber?: number; isCompleted: boolean }[] = [];

            program.parts.forEach((part) => {
                // Check if user owns the full part
                if (part.assignedTo?.toString() === session.user.id) {
                    mySelections.push({
                        partNumber: part.partNumber,
                        isCompleted: part.isCompleted,
                    });
                }

                // Check if user owns any hizbs
                if (part.hizbs && part.hizbs.length > 0) {
                    part.hizbs.forEach((hizb) => {
                        if (hizb.assignedTo?.toString() === session.user.id) {
                            mySelections.push({
                                partNumber: part.partNumber,
                                hizbNumber: hizb.hizbNumber,
                                isCompleted: hizb.isCompleted,
                            });
                        }
                    });
                }
            });

            if (mySelections.length > 0) {
                myParticipation = {
                    myParts: [...new Set(mySelections.map(s => s.partNumber))],
                    completedParts: mySelections.filter(s => s.isCompleted).map(s => s.partNumber),
                    mySelections, // New: detailed selections with hizb info
                };
            }
        }

        // Mask parts - show assignedTo first name only for privacy
        const maskedParts = program.parts.map((part) => ({
            partNumber: part.partNumber,
            partType: part.partType,
            isAssigned: !!part.assignedTo || !!part.guestName,
            isCompleted: part.isCompleted,
            assignedTo: part.assignedTo ? {
                firstName: (part as unknown as { assignedToInfo?: { firstName: string } }).assignedToInfo?.firstName || 'Anonim',
            } : null,
            hizbs: part.hizbs?.map(h => ({
                hizbNumber: h.hizbNumber,
                isAssigned: !!h.assignedTo || !!h.guestName,
                isCompleted: h.isCompleted,
                assignedTo: h.assignedTo ? { firstName: 'Anonim' } : null // Simple masking
            }))
        }));

        return NextResponse.json({
            program: {
                ...program,
                parts: maskedParts,
                isCreator,
            },
            myParticipation,
        });
    } catch (error) {
        console.error('Error fetching program:', error);
        return NextResponse.json(
            { error: 'Failed to fetch program' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a program (only by creator or admin)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid program ID' },
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

        const isCreator = program.createdBy.toString() === session.user.id;
        const isAdmin = session.user.role === 'admin';

        if (!isCreator && !isAdmin) {
            return NextResponse.json(
                { error: 'Not authorized to delete this program' },
                { status: 403 }
            );
        }

        // Delete program and related participations
        await Promise.all([
            Program.findByIdAndDelete(id),
            Participation.deleteMany({ programId: id }),
        ]);

        return NextResponse.json({ message: 'Program deleted successfully' });
    } catch (error) {
        console.error('Error deleting program:', error);
        return NextResponse.json(
            { error: 'Failed to delete program' },
            { status: 500 }
        );
    }
}
