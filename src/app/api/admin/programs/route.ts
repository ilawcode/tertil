import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';

// GET - Fetch all programs for admin (including pending)
export async function GET() {
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

        await connectToDatabase();

        const [pendingPrograms, allPrograms, stats] = await Promise.all([
            Program.find({ isApproved: false, status: { $ne: 'cancelled' } })
                .populate('createdBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .lean(),
            Program.find()
                .populate('createdBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .lean(),
            Program.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const statsMap = stats.reduce((acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            pendingPrograms,
            allPrograms,
            stats: {
                pending: statsMap.pending || 0,
                active: statsMap.active || 0,
                completed: statsMap.completed || 0,
                cancelled: statsMap.cancelled || 0,
                total: allPrograms.length,
            },
        });
    } catch (error) {
        console.error('Error fetching admin programs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch programs' },
            { status: 500 }
        );
    }
}
