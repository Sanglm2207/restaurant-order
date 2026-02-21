import mongoose, { Schema, model, models } from 'mongoose';
import { OrderItemStatus } from '@/types';

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  note: { type: String },
  status: {
    type: String,
    enum: Object.values(OrderItemStatus),
    default: OrderItemStatus.PENDING,
  },
});

const OrderSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  items: [OrderItemSchema],
  createdBy: { type: String, default: 'customer' }, // 'customer' hoặc staff userId
  createdAt: { type: Date, default: Date.now },
});

export const Order = models.Order || model('Order', OrderSchema);