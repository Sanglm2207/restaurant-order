import { Schema, model, models } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '@/types';

const PaymentSchema = new Schema({
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    amount: { type: Number, required: true },
    method: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING,
    },
    transactionId: { type: String },
    receiptImage: { type: String },
    paidAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Payment = models.Payment || model('Payment', PaymentSchema);
