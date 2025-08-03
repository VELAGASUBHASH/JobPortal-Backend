const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  blockchain: {
    type: String,
    enum: ['ethereum', 'polygon', 'solana'],
    required: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  walletAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['job_posting', 'featured_listing', 'subscription', 'boost'],
    required: true
  },
  blockNumber: Number,
  gasUsed: Number,
  gasFee: Number
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
