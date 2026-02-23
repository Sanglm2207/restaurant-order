import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Table } from '@/models/Table';
import { randomUUID } from 'crypto';

export async function POST(_req: NextRequest) {
    try {
        await connectDB();

        // Xoá bàn cũ nếu muốn làm mới hoàn toàn (Cân nhắc kỹ)
        // await Table.deleteMany({});

        const newTables = [];

        // Tầng 1: 20 bàn thường (101 -> 120)
        for (let i = 1; i <= 20; i++) {
            newTables.push({
                name: `Bàn 1${String(i).padStart(2, '0')}`,
                zone: 'Tầng 1',
                tableType: 'REGULAR',
                capacity: 4,
                qrCode: randomUUID(),
                status: 'AVAILABLE'
            });
        }

        // Tầng 2 & 3: 50 thường, 20 VIP, 30 ngoài trời
        for (const floor of [2, 3]) {
            // 50 thường
            for (let i = 1; i <= 50; i++) {
                newTables.push({
                    name: `Bàn ${floor}${String(i).padStart(2, '0')}`,
                    zone: `Tầng ${floor}`,
                    tableType: 'REGULAR',
                    capacity: 4,
                    qrCode: randomUUID(),
                    status: 'AVAILABLE'
                });
            }
            // 20 VIP
            for (let i = 1; i <= 20; i++) {
                newTables.push({
                    name: `VIP ${floor}${String(i).padStart(2, '0')}`,
                    zone: `Tầng ${floor}`,
                    tableType: 'VIP',
                    capacity: 8,
                    qrCode: randomUUID(),
                    status: 'AVAILABLE'
                });
            }
            // 30 Ngoài trời
            for (let i = 1; i <= 30; i++) {
                newTables.push({
                    name: `N.Trời ${floor}${String(i).padStart(2, '0')}`,
                    zone: `Tầng ${floor}`,
                    tableType: 'OUTDOOR',
                    capacity: 4,
                    qrCode: randomUUID(),
                    status: 'AVAILABLE'
                });
            }
        }

        // Tầng 4: 30 bàn ngoài trời vip nhất
        for (let i = 1; i <= 30; i++) {
            newTables.push({
                name: `PENTHOUSE ${i}`,
                zone: 'Tầng 4',
                tableType: 'VIP',
                capacity: 10,
                qrCode: randomUUID(),
                status: 'AVAILABLE'
            });
        }

        await Table.insertMany(newTables);

        return NextResponse.json({
            success: true,
            message: `Đã khởi tạo xong ${newTables.length} bàn cho 4 tầng.`,
        });
    } catch (error) {
        console.error('Setup tables error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
