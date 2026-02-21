import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Session } from '@/models/Session';
import { Table } from '@/models/Table';
import { Order } from '@/models/Order';
import { SessionStatus, TableStatus } from '@/types';

// GET /api/sessions?tableId=xxx or ?status=OPEN
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const tableId = searchParams.get('tableId');
        const status = searchParams.get('status');

        const filter: Record<string, unknown> = {};
        if (tableId) filter.tableId = tableId;
        if (status) filter.status = status;

        const sessions = await Session.find(filter)
            .populate('tableId', 'name zone')
            .sort({ startedAt: -1 })
            .lean();

        return NextResponse.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST /api/sessions — tạo hoặc join session (core logic cho khách quét QR)
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { tableId } = await req.json();

        // 1. Tìm bàn
        const table = await Table.findById(tableId);
        if (!table) {
            return NextResponse.json({ success: false, error: 'Bàn không tồn tại' }, { status: 404 });
        }

        // 2. Kiểm tra session đang mở
        let session = await Session.findOne({
            tableId,
            status: { $in: [SessionStatus.OPEN, SessionStatus.PAYMENT_REQUESTED, SessionStatus.WAITING_PAYMENT, SessionStatus.PAID] },
        });

        // 3. Nếu chưa có → tạo mới
        if (!session) {
            session = await Session.create({ tableId, status: SessionStatus.OPEN });
            await Table.findByIdAndUpdate(tableId, {
                currentSessionId: session._id,
                status: TableStatus.OCCUPIED,
            });
        }

        // 4. Lấy orders hiện tại của session
        const orders = await Order.find({ sessionId: session._id }).lean();

        return NextResponse.json({
            success: true,
            data: {
                sessionId: session._id.toString(),
                status: session.status,
                totalAmount: session.totalAmount,
                tableName: table.name,
                orders,
            },
        });
    } catch (error) {
        console.error('Session error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
