import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Program, { IProgramPart } from '@/models/Program';

// GET - Fetch all approved active programs
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'active';
        const type = searchParams.get('type');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');

        const query: Record<string, unknown> = { isApproved: true, isPublic: true };

        if (status === 'active') {
            query.status = 'active';
        } else if (status === 'completed') {
            query.status = 'completed';
        } else if (status === 'all') {
            // No status filter
        }

        if (type && type !== 'all') {
            query.programType = type;
        }

        const skip = (page - 1) * limit;

        const [programs, total] = await Promise.all([
            Program.find(query)
                .populate('createdBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Program.countDocuments(query),
        ]);

        // Mask participant info
        const maskedPrograms = programs.map((program) => ({
            ...program,
            parts: program.parts.map((part: IProgramPart) => ({
                partNumber: part.partNumber,
                partType: part.partType,
                isAssigned: !!part.assignedTo || !!part.guestName,
                isCompleted: part.isCompleted,
            })),
        }));

        return NextResponse.json({
            programs: maskedPrograms,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching programs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch programs' },
            { status: 500 }
        );
    }
}

// POST - Create a new program
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            title,
            description,
            programType,
            customType,
            startDate,
            endDate,
            targetCount,
            partType,
            dedicatedTo,
            isPublic = true,
        } = body;

        // Validate required fields
        if (!title || !programType || !startDate || !endDate || !targetCount || !partType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            return NextResponse.json(
                { error: 'End date must be after start date' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Generate parts based on program type and target count
        const parts: IProgramPart[] = [];
        for (let i = 1; i <= targetCount; i++) {
            parts.push({
                partNumber: i,
                partType: partType,
                isCompleted: false,
            });
        }

        // Check if user is admin (auto-approve for admins)
        const isAdmin = session.user.role === 'admin';

        const program = await Program.create({
            title: title.trim(),
            description: description?.trim(),
            programType,
            customType: customType?.trim(),
            createdBy: session.user.id,
            startDate: start,
            endDate: end,
            targetCount,
            partType,
            parts,
            dedicatedTo: dedicatedTo?.trim(),
            isPublic,
            isApproved: isAdmin,
            status: isAdmin ? 'active' : 'pending',
            approvedBy: isAdmin ? session.user.id : undefined,
            approvedAt: isAdmin ? new Date() : undefined,
        });

        return NextResponse.json(
            {
                message: 'Program created successfully',
                program: {
                    id: program._id.toString(),
                    title: program.title,
                    status: program.status,
                    isApproved: program.isApproved,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating program:', error);
        return NextResponse.json(
            { error: 'Failed to create program' },
            { status: 500 }
        );
    }
}
