import { Schema, model, models } from 'mongoose';
import { TableStatus } from '@/types';

const TABLE_TYPES = ['REGULAR', 'VIP', 'OUTDOOR', 'PRIVATE', 'BAR'] as const;

const TableSchema = new Schema({
  name: { type: String, required: true },       // Bàn 1, VIP 2
  zone: { type: String, default: 'Tầng 1' },   // Khu vực
  tableType: {
    type: String,
    enum: TABLE_TYPES,
    default: 'REGULAR',
  },
  qrCode: { type: String, unique: true },       // Token trong link QR
  capacity: { type: Number, default: 4 },       // Sức chứa
  currentSessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
  status: {
    type: String,
    enum: Object.values(TableStatus),
    default: TableStatus.AVAILABLE,
  },
}, { timestamps: true });

export const Table = models.Table || model('Table', TableSchema);