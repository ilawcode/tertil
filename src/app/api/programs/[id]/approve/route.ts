import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';
import User from '@/models/User';
import mongoose from 'mongoose';
import { sendEmail, getProgramApprovedEmail } from '@/lib/email';

// POST - Approve a program (admin only)
export async function POST(
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

        if (session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
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

        if (program.isApproved) {
            return NextResponse.json(
                { error: 'Program is already approved' },
                { status: 400 }
            );
        }

        // Approve the program
        program.isApproved = true;
        program.approvedBy = new mongoose.Types.ObjectId(session.user.id);
        program.approvedAt = new Date();
        program.status = 'active';

        await program.save();

        // Send approval email to creator
        const creator = await User.findById(program.createdBy);
        if (creator) {
            const emailContent = getProgramApprovedEmail(program.title, creator.firstName);
            await sendEmail({
                to: creator.email,
                ...emailContent,
            });
        }

        return NextResponse.json({
            message: 'Program approved successfully',
            program: {
                id: program._id.toString(),
                title: program.title,
                status: program.status,
                isApproved: program.isApproved,
            },
        });
    } catch (error) {
        console.error('Error approving program:', error);
        return NextResponse.json(
            { error: 'Failed to approve program' },
            { status: 500 }
        );
    }
}

// DELETE - Reject a program (admin only)
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

        if (session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
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

        // Mark as cancelled
        program.status = 'cancelled';
        await program.save();

        return NextResponse.json({
            message: 'Program rejected successfully',
        });
    } catch (error) {
        console.error('Error rejecting program:', error);
        return NextResponse.json(
            { error: 'Failed to reject program' },
            { status: 500 }
        );
    }
}
