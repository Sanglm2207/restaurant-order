import mongoose, { Schema, model, models } from 'mongoose';
import { SessionStatus, PaymentMethod } from '@/types';

const SessionSchema = new Schema({
  tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
  status: {
    type: String,
    enum: Object.values(SessionStatus),
    default: SessionStatus.OPEN,
  },
  totalAmount: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: [...Object.values(PaymentMethod), null],
    default: null,
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});

export const Session = models.Session || model('Session', SessionSchema);