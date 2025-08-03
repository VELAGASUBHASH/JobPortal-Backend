const express = require('express');
const { body, validationResult } = require('express-validator');
const Job = require('../models/job.js');
const User = require('../models/user.js');
const auth = require('../middleware/auth.js');
const { calculateMatchScore } = require('../utils/ai.js');

const router = express.Router();

// Helper middleware for admin check
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can post jobs.' });
  }
  next();
}

// Get all jobs with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      type,
      remote,
      skills,
      salaryMin,
      salaryMax
    } = req.query;

    const query = { status: 'active' };

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Location filter
    if (location && location !== 'all') {
      query.location = new RegExp(location, 'i');
    }

    // Job type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Remote filter
    if (remote === 'true') {
      query.remote = true;
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',');
      query['requiredSkills.name'] = { $in: skillsArray.map(s => s.trim()) };
    }

    // Salary filter
    if (salaryMin || salaryMax) {
      query['salary.min'] = {};
      if (salaryMin) query['salary.min'].$gte = parseInt(salaryMin);
      if (salaryMax) query['salary.max'] = { $lte: parseInt(salaryMax) };
    }

    const jobs = await Job.find(query)
      .populate('employer', 'name company')
      .sort({ featured: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .exec();

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employer', 'name company profileImage');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Increment views (safe)
    job.views = (job.views || 0) + 1;
    await job.save();

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create job (admins only)
router.post(
  '/',
  auth,
  adminOnly,
  [
    body('title').trim().isLength({ min: 3 }).escape(),
    body('description').trim().isLength({ min: 10 }),
    body('company').trim().isLength({ min: 2 }).escape(),
    body('location').trim().isLength({ min: 2 }).escape(),
    body('type').isIn(['full-time', 'part-time', 'contract', 'freelance', 'internship'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const jobData = {
        ...req.body,
        employer: req.user.userId
      };

      const job = new Job(jobData);
      await job.save();

      res.status(201).json({
        job,
        message: 'Job created successfully.'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Apply for job
router.post('/:id/apply', [
  auth,
  body('coverLetter').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const { coverLetter } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = job.applications.find(
      app => app.applicant.toString() === req.user.userId
    );

    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    // Get user profile for match score calculation
    const user = await User.findById(req.user.userId);
    const matchScore = await calculateMatchScore(user, job);

    // Add application
    job.applications.push({
      applicant: req.user.userId,
      coverLetter,
      matchScore
    });

    await job.save();

    res.json({ message: 'Application submitted successfully', matchScore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's applications
router.get('/user/applications', auth, async (req, res) => {
  try {
    const jobs = await Job.find({
      'applications.applicant': req.user.userId
    }).populate('employer', 'name company');

    const applications = jobs.map(job => {
      const application = job.applications.find(
        app => app.applicant.toString() === req.user.userId
      );
      return {
        job: {
          _id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          employer: job.employer
        },
        application
      };
    });

    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
