import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Session } from '@/models/Session';
import { Table } from '@/models/Table';
import { PaymentStatus, SessionStatus, TableStatus } from '@/types';

// PUT /api/payments/[id] — Xác nhận thanh toán (staff confirm)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const { status, confirmedBy } = await req.json();

        const payment = await Payment.findById(id);
        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        payment.status = status;
        if (status === PaymentStatus.SUCCESS) {
            payment.paidAt = new Date();
            if (confirmedBy) payment.confirmedBy = confirmedBy;

            // Update session
            const session = await Session.findById(payment.sessionId);
            if (session) {
                session.status = SessionStatus.PAID;
                await session.save();

                // Update table
                await Table.findByIdAndUpdate(session.tableId, {
                    status: TableStatus.CLEANING,
                });
            }
        }

        await payment.save();
        return NextResponse.json({ success: true, data: payment });
    } catch (error) {
        console.error('Update payment error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
