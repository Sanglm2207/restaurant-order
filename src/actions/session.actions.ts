'use server';
import connectDB from '@/lib/db';
import { Table } from '@/models/Table';
import { Session } from '@/models/Session';
import { SessionStatus, TableStatus } from '@/types';

export async function joinOrCreateSession(tableId: string) {
  await connectDB();

  // 1. Tìm bàn
  const table = await Table.findById(tableId);
  if (!table) return { error: 'Bàn không tồn tại' };

  // 2. Kiểm tra bàn có session nào đang active không
  let session = await Session.findOne({
    tableId: tableId,
    status: {
      $in: [
        SessionStatus.OPEN,
        SessionStatus.PAYMENT_REQUESTED,
        SessionStatus.WAITING_PAYMENT,
        SessionStatus.PAID,
      ],
    },
  });

  // 3. Nếu chưa có -> Tạo mới
  if (!session) {
    session = await Session.create({
      tableId: tableId,
      status: SessionStatus.OPEN,
    });

    // Cập nhật ngược lại vào Table
    await Table.findByIdAndUpdate(tableId, {
      currentSessionId: session._id,
      status: TableStatus.OCCUPIED,
    });
  }

  // 4. Trả về Session ID cho Client
  return {
    sessionId: session._id.toString(),
    status: session.status,
  };
}