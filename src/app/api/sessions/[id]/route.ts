import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Session } from '@/models/Session';
import { Table } from '@/models/Table';
import { SessionStatus, TableStatus } from '@/types';

// PUT /api/sessions/[id] — cập nhật trạng thái session
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();

        const session = await Session.findById(id);
        if (!session) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // State machine cho session status
        const { status, paymentMethod } = body;

        if (status) {
            session.status = status;

            // Cập nhật table status tương ứng
            let tableStatus: TableStatus | null = null;

            switch (status) {
                case SessionStatus.PAYMENT_REQUESTED:
                    tableStatus = TableStatus.PAYMENT_REQUESTED;
                    break;
                case SessionStatus.WAITING_PAYMENT:
                    tableStatus = TableStatus.PAYMENT_REQUESTED;
                    break;
                case SessionStatus.PAID:
                    tableStatus = TableStatus.CLEANING;
                    break;
                case SessionStatus.CLOSED:
                    tableStatus = TableStatus.AVAILABLE;
                    session.endedAt = new Date();
                    // Clear session reference từ table
                    await Table.findByIdAndUpdate(session.tableId, {
                        currentSessionId: null,
                        status: TableStatus.AVAILABLE,
                    });
                    break;
            }

            if (tableStatus && status !== SessionStatus.CLOSED) {
                await Table.findByIdAndUpdate(session.tableId, { status: tableStatus });
            }
        }

        if (paymentMethod) {
            session.paymentMethod = paymentMethod;
        }

        await session.save();

        return NextResponse.json({ success: true, data: session });
    } catch (error) {
        console.error('Update session error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// GET /api/sessions/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await Session.findById(id).populate('tableId', 'name zone').lean();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: session });
    } catch (error) {
        console.error('Get session error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
