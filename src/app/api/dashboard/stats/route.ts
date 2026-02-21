import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Session } from '@/models/Session';
import { Order } from '@/models/Order';
import { Payment } from '@/models/Payment';
import { SessionStatus } from '@/types';

// GET /api/dashboard/stats — Thống kê cho Manager
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        const dateFilter: Record<string, unknown> = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.$lte = new Date(dateTo);

        const sessionFilter: Record<string, unknown> = { status: SessionStatus.CLOSED };
        if (Object.keys(dateFilter).length) sessionFilter.endedAt = dateFilter;

        // 1. Doanh thu
        const closedSessions = await Session.find(sessionFilter).lean();
        const totalRevenue = closedSessions.reduce(
            (sum: number, s: Record<string, unknown>) => sum + (s.totalAmount as number || 0),
            0
        );

        // 2. Tổng số session hôm nay
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySessions = await Session.countDocuments({
            startedAt: { $gte: today },
        });

        // 3. Session đang mở
        const activeSessions = await Session.countDocuments({
            status: { $in: [SessionStatus.OPEN, SessionStatus.PAYMENT_REQUESTED, SessionStatus.WAITING_PAYMENT] },
        });

        // 4. Món bán chạy (top 10)
        const allOrders = await Order.find(
            Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}
        ).lean();

        const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
        allOrders.forEach((order: Record<string, unknown>) => {
            const items = order.items as Array<{ name: string; quantity: number; price: number }>;
            items.forEach((item) => {
                if (!itemCounts[item.name]) {
                    itemCounts[item.name] = { name: item.name, count: 0, revenue: 0 };
                }
                itemCounts[item.name].count += item.quantity;
                itemCounts[item.name].revenue += item.price * item.quantity;
            });
        });

        const topItems = Object.values(itemCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 5. Payments
        const totalPayments = await Payment.countDocuments(
            Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}
        );

        return NextResponse.json({
            success: true,
            data: {
                totalRevenue,
                todaySessions,
                activeSessions,
                totalClosedSessions: closedSessions.length,
                topItems,
                totalPayments,
            },
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
