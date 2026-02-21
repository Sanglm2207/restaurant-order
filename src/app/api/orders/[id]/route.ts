import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Order } from '@/models/Order';

// PUT /api/orders/[id] — Cập nhật trạng thái order items
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const { itemId, status } = await req.json();

        // Update status của 1 item trong order
        if (itemId) {
            const order = await Order.findOneAndUpdate(
                { _id: id, 'items._id': itemId },
                { $set: { 'items.$.status': status } },
                { new: true }
            );
            if (!order) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
            return NextResponse.json({ success: true, data: order });
        }

        // Update toàn bộ items trong order (VD: confirm tất cả)
        const order = await Order.findById(id);
        if (!order) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        order.items.forEach((item: Record<string, unknown>) => {
            item.status = status;
        });
        await order.save();

        return NextResponse.json({ success: true, data: order });
    } catch (error) {
        console.error('Update order error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
