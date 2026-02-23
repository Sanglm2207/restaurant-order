import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Session } from '@/models/Session';
import { Table } from '@/models/Table';
import { SessionStatus, TableStatus } from '@/types';
import { Order } from '@/models/Order';
import { Payment } from '@/models/Payment';
import mongoose from 'mongoose';
import '@/models/User';

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

        const orders = await Order.find({ sessionId: id }).sort({ createdAt: 1 }).lean();
        const payment = await Payment.findOne({ sessionId: id }).populate('confirmedBy', 'name email').lean();

        // Populate creator names for orders
        const userIds = [...new Set(orders.map(o => o.createdBy).filter(id => id && id !== 'customer' && id !== 'staff'))];
        const users = (await mongoose.model('User').find({ _id: { $in: userIds } }, 'name').lean()) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
        const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

        const ordersWithCreator = orders.map(o => ({
            ...o,
            creatorName: o.createdBy === 'customer' ? 'Khách hàng' : (userMap[o.createdBy] || o.createdBy)
        }));

        return NextResponse.json({
            success: true,
            data: {
                ...session,
                orders: ordersWithCreator,
                payment
            }
        });
    } catch (error) {
        console.error('Get session error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
