import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Order } from '@/models/Order';
import { PaymentStatus } from '@/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        // 1. Doanh thu đã xác nhận (All-time & Today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const allPayments = await Payment.find({ confirmedBy: id, status: PaymentStatus.SUCCESS }).lean();
        const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const todayPayments = allPayments.filter(p => p.paidAt && new Date(p.paidAt) >= todayStart);
        const todayRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // 2. Số lượng Order đã tạo (nếu là nhân viên order)
        const totalOrders = await Order.countDocuments({ createdBy: id });

        // 3. Số lượng item đã phục vụ (nếu có log, nhưng hiện tại ta chỉ đếm số order)
        // Ta có thể đếm tổng số món trong các order này
        const orders = await Order.find({ createdBy: id }).lean();
        const totalItems = orders.reduce((sum, o) => sum + (o.items?.length || 0), 0);

        return NextResponse.json({
            success: true,
            data: {
                performance: {
                    totalRevenue,
                    todayRevenue,
                    totalOrders,
                    totalItems,
                    confirmedCount: allPayments.length,
                    todayConfirmedCount: todayPayments.length
                }
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
