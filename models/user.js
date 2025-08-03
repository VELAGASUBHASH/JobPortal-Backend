const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  bio: {
    type: String,
    maxlength: 500
  },
  linkedinUrl: {
    type: String,
    validate: {
      validator: function(v) {
        // Allow http/https with www or without www for LinkedIn
        return !v || /^https?:\/\/(www\.)?linkedin\.com\/in\//.test(v);
      },
      message: 'Invalid LinkedIn URL'
    }
  },
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate'
    },
    aiExtracted: {
      type: Boolean,
      default: false
    }
  }],
  walletAddress: {
    type: String,
    sparse: true
  },
  walletType: {
    type: String,
    enum: ['metamask', 'phantom'],
    default: 'metamask'
  },
  
  // 6-digit email verification code fields
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    length: 6
  },
  verificationCodeExpires: {
    type: Date
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date,
  role: {
    type: String,
    enum: ['user', 'employer', 'admin'],
    default: 'user'
  },
  profileImage: String,
  resume: String,
  experience: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    description: String
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startDate: Date,
    endDate: Date
  }],
  preferences: {
    jobTypes: [String],
    locations: [String],
    salaryRange: {
      min: Number,
      max: Number,
      currency: String
    },
    remote: Boolean
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
