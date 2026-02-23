import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Order } from '@/models/Order';
import { Session } from '@/models/Session';
import { Table } from '@/models/Table';
import '@/models/Category';
import '@/models/Product';
import '@/models/User';
import { SessionStatus, TableStatus, OrderItemStatus } from '@/types';

// GET /api/orders?sessionId=xxx
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        const status = searchParams.get('status'); // filter by item status

        const filter: Record<string, unknown> = {};
        if (sessionId) filter.sessionId = sessionId;

        let orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

        // Filter by item status nếu cần (VD: staff muốn xem order PENDING & CONFIRMED)
        if (status) {
            const statusList = status.split(',');
            orders = orders.filter(order =>
                order.items.some((item: Record<string, unknown>) => statusList.includes(item.status as string))
            );
        }

        return NextResponse.json({ success: true, data: orders });
    } catch (error) {
        console.error('Get orders error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST /api/orders — Khách/Staff tạo order mới
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { sessionId, items, createdBy = 'customer', confirm = false } = await req.json();
        console.log('Creating order:', { sessionId, itemCount: items?.length, confirm });

        // Validate session chưa đóng hoàn toàn
        const session = await Session.findById(sessionId);
        if (!session || session.status === SessionStatus.CLOSED) {
            return NextResponse.json(
                { success: false, error: 'Session không tồn tại hoặc đã đóng' },
                { status: 400 }
            );
        }

        // Nếu session đang ở trạng thái đã thanh toán hoặc chờ dọn, mở lại để order tiếp
        if ([SessionStatus.PAID, SessionStatus.PAYMENT_REQUESTED, SessionStatus.WAITING_PAYMENT].includes(session.status)) {
            session.status = SessionStatus.OPEN;
            await session.save();
        }

        // Tạo order
        const order = await Order.create({
            sessionId,
            items: items.map((item: Record<string, unknown>) => ({
                ...item,
                status: confirm ? OrderItemStatus.CONFIRMED : OrderItemStatus.PENDING,
            })),
            createdBy,
        });

        // Cập nhật tổng tiền session
        const itemsTotal = items.reduce(
            (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
            0
        );
        await Session.findByIdAndUpdate(sessionId, {
            $inc: { totalAmount: itemsTotal },
        });

        // Cập nhật table status
        await Table.findByIdAndUpdate(session.tableId, {
            status: TableStatus.OCCUPIED,
        });

        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error) {
        console.error('Create order error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
