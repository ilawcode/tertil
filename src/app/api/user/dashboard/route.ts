import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';
import Participation from '@/models/Participation';

// GET - Fetch user's dashboard data
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectToDatabase();

        const userId = session.user.id;

        // Fetch user's created programs
        const myCreatedPrograms = await Program.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .lean();

        // Fetch programs user has joined
        const participations = await Participation.find({ userId })
            .populate({
                path: 'programId',
                populate: { path: 'createdBy', select: 'firstName lastName' },
            })
            .sort({ joinedAt: -1 })
            .lean();

        const myJoinedPrograms = participations
            .filter((p) => p.programId)
            .map((p) => ({
                program: p.programId,
                myParts: p.parts,
                completedParts: p.completedParts,
                joinedAt: p.joinedAt,
            }));

        // Get active programs count
        const activePrograms = await Program.countDocuments({
            isApproved: true,
            status: 'active',
        });

        // Get completed programs count
        const completedPrograms = await Program.countDocuments({
            status: 'completed',
        });

        // Get user stats
        const totalParticipations = participations.length;
        const completedReadings = participations.reduce(
            (acc, p) => acc + (p.completedParts?.length || 0),
            0
        );

        // Get recent activity
        const recentPrograms = await Program.find({
            isApproved: true,
            status: 'active',
        })
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        return NextResponse.json({
            myCreatedPrograms,
            myJoinedPrograms,
            stats: {
                activePrograms,
                completedPrograms,
                totalParticipations,
                completedReadings,
                myCreatedCount: myCreatedPrograms.length,
                myJoinedCount: myJoinedPrograms.length,
            },
            recentPrograms,
            isAdmin: session.user.role === 'admin',
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
