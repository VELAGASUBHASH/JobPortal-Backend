const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
    required: true
  },
  remote: {
    type: Boolean,
    default: false
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    type: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly', 'project'],
      default: 'yearly'
    }
  },
  budget: {
    amount: Number,
    currency: String
  },
  requiredSkills: [{
    name: String,
    level: String,
    mandatory: Boolean
  }],
  preferredSkills: [String],
  responsibilities: [String],
  requirements: [String],
  benefits: [String],
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: [ 'active', 'paused', 'closed', 'expired'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  applications: [{
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending'
    },
    coverLetter: String,
    matchScore: Number
  }],
  views: {
    type: Number,
    default: 0
  },
  tags: [String],
  category: String,
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive'],
    default: 'mid'
  },
  deadline: Date,
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentHash: String,
  blockchain: {
    type: String,
    enum: ['ethereum', 'polygon', 'solana']
  }
}, {
  timestamps: true
});

jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ location: 1 });
jobSchema.index({ type: 1 });
jobSchema.index({ 'requiredSkills.name': 1 });

module.exports = mongoose.model('Job', jobSchema);
