import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Session } from '@/models/Session';
import { Table } from '@/models/Table';
import { PaymentStatus, PaymentMethod, SessionStatus, TableStatus } from '@/types';

// GET /api/payments?sessionId=xxx
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        const filter: Record<string, unknown> = {};
        if (sessionId) filter.sessionId = sessionId;

        const payments = await Payment.find(filter)
            .populate('confirmedBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, data: payments });
    } catch (error) {
        console.error('Get payments error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST /api/payments — tạo payment request
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { sessionId, method } = await req.json();

        const session = await Session.findById(sessionId);
        if (!session) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Tạo payment record
        const payment = await Payment.create({
            sessionId,
            amount: session.totalAmount,
            method,
            status: PaymentStatus.PENDING,
        });

        // Update session status
        if (method === PaymentMethod.QR_ONLINE) {
            session.status = SessionStatus.WAITING_PAYMENT;
        } else {
            session.status = SessionStatus.PAYMENT_REQUESTED;
        }
        session.paymentMethod = method;
        await session.save();

        // Update table status
        await Table.findByIdAndUpdate(session.tableId, {
            status: TableStatus.PAYMENT_REQUESTED,
        });

        return NextResponse.json({ success: true, data: payment }, { status: 201 });
    } catch (error) {
        console.error('Create payment error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
