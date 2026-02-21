import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Category } from '@/models/Category';
import { Product } from '@/models/Product';
import { Table } from '@/models/Table';
import { User } from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@/types';
import { randomUUID } from 'crypto';

// POST /api/seed — Seed dữ liệu mẫu
export async function POST(_req: NextRequest) {
    try {
        await connectDB();

        // Check đã seed chưa
        const existingCategories = await Category.countDocuments();
        if (existingCategories > 0) {
            return NextResponse.json({ success: false, error: 'Dữ liệu đã được seed rồi' }, { status: 400 });
        }

        // 1. Categories
        const categories = await Category.insertMany([
            { name: 'Khai vị', description: 'Các món ăn nhẹ mở đầu', sortOrder: 1 },
            { name: 'Món chính', description: 'Các món ăn chính', sortOrder: 2 },
            { name: 'Lẩu', description: 'Các loại lẩu', sortOrder: 3 },
            { name: 'Đồ uống', description: 'Nước ngọt, bia, rượu', sortOrder: 4 },
            { name: 'Tráng miệng', description: 'Bánh, chè, kem', sortOrder: 5 },
        ]);

        // 2. Products
        await Product.insertMany([
            // Khai vị
            { name: 'Gỏi cuốn tôm thịt', price: 55000, categoryId: categories[0]._id, description: 'Gỏi cuốn tươi với tôm và thịt heo', isAvailable: true },
            { name: 'Chả giò chiên', price: 65000, categoryId: categories[0]._id, description: 'Chả giò giòn tan', isAvailable: true },
            { name: 'Salad trộn dầu giấm', price: 45000, categoryId: categories[0]._id, description: 'Salad rau tươi sốt dầu giấm', isAvailable: true },
            // Món chính
            { name: 'Bò lúc lắc', price: 185000, categoryId: categories[1]._id, description: 'Bò Úc xào tiêu xanh', isAvailable: true },
            { name: 'Cơm chiên hải sản', price: 95000, categoryId: categories[1]._id, description: 'Cơm chiên với tôm, mực, nghêu', isAvailable: true },
            { name: 'Sườn nướng mật ong', price: 155000, categoryId: categories[1]._id, description: 'Sườn heo nướng mật ong thơm lừng', isAvailable: true },
            { name: 'Cá lóc nướng trui', price: 175000, categoryId: categories[1]._id, description: 'Cá lóc nướng cuốn bánh tráng', isAvailable: true },
            { name: 'Gà nướng muối ớt', price: 165000, categoryId: categories[1]._id, description: 'Nửa con gà nướng muối ớt', isAvailable: true },
            // Lẩu
            { name: 'Lẩu Thái tomyum', price: 299000, categoryId: categories[2]._id, description: 'Lẩu chua cay kiểu Thái cho 2–3 người', isAvailable: true },
            { name: 'Lẩu bò nhúng dấm', price: 320000, categoryId: categories[2]._id, description: 'Lẩu dấm với bò tươi', isAvailable: true },
            // Đồ uống
            { name: 'Trà đào cam sả', price: 39000, categoryId: categories[3]._id, description: 'Trà đào cam sả mát lạnh', isAvailable: true },
            { name: 'Coca Cola', price: 20000, categoryId: categories[3]._id, description: 'Lon 330ml', isAvailable: true },
            { name: 'Bia Tiger', price: 25000, categoryId: categories[3]._id, description: 'Lon 330ml', isAvailable: true },
            { name: 'Nước suối', price: 12000, categoryId: categories[3]._id, description: 'Chai 500ml', isAvailable: true },
            // Tráng miệng
            { name: 'Chè bưởi', price: 35000, categoryId: categories[4]._id, description: 'Chè bưởi truyền thống', isAvailable: true },
            { name: 'Kem dừa', price: 45000, categoryId: categories[4]._id, description: 'Kem dừa tươi béo ngậy', isAvailable: true },
        ]);

        // 3. Tables
        await Table.insertMany([
            { name: 'Bàn 1', zone: 'Tầng 1', tableType: 'REGULAR', capacity: 4, qrCode: randomUUID() },
            { name: 'Bàn 2', zone: 'Tầng 1', tableType: 'REGULAR', capacity: 4, qrCode: randomUUID() },
            { name: 'Bàn 3', zone: 'Tầng 1', tableType: 'REGULAR', capacity: 6, qrCode: randomUUID() },
            { name: 'Bàn 4', zone: 'Tầng 1', tableType: 'REGULAR', capacity: 2, qrCode: randomUUID() },
            { name: 'VIP 1', zone: 'VIP', tableType: 'VIP', capacity: 8, qrCode: randomUUID() },
            { name: 'VIP 2', zone: 'VIP', tableType: 'VIP', capacity: 10, qrCode: randomUUID() },
            { name: 'Sân vườn 1', zone: 'Sân vườn', tableType: 'OUTDOOR', capacity: 6, qrCode: randomUUID() },
            { name: 'Sân vườn 2', zone: 'Sân vườn', tableType: 'OUTDOOR', capacity: 4, qrCode: randomUUID() },
            { name: 'Bar 1', zone: 'Quầy bar', tableType: 'BAR', capacity: 2, qrCode: randomUUID() },
        ]);

        // 4. Admin user (System account, undeletable)
        const adminPassword = await hashPassword('admin123');
        await User.create({
            name: 'Super Admin',
            email: 'admin@restaurant.com',
            password: adminPassword,
            role: UserRole.ADMIN,
            isSystem: true, // Không thể bị xoá
        });

        return NextResponse.json({
            success: true,
            message: 'Seed thành công! Admin: admin@restaurant.com / admin123. Tài khoản nhân viên có thể do Admin tạo trong bảng điều khiển.',
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
