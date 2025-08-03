const natural = require('natural');
const nlp = require('compromise');

// Utility to escape RegExp special chars
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Common tech skills database
const TECH_SKILLS = [
  'javascript', 'python', 'java', 'react', 'node.js', 'express',
  'mongodb', 'sql', 'postgresql', 'mysql', 'html', 'css',
  'typescript', 'angular', 'vue.js', 'php', 'ruby', 'go',
  'rust', 'c++', 'c#', 'swift', 'kotlin', 'flutter', 'react native',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git',
  'machine learning', 'ai', 'blockchain', 'solidity', 'web3',
  'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy'
];

// Extract skills from text using NLP
async function extractSkillsFromText(text) {
  const doc = nlp(text.toLowerCase());
  const extractedSkills = [];

  // Extract known tech skills
  TECH_SKILLS.forEach(skill => {
    if (text.toLowerCase().includes(skill)) {
      extractedSkills.push({
        name: skill,
        level: 'Intermediate',
        aiExtracted: true,
        confidence: calculateConfidence(text, skill)
      });
    }
  });

  // Extract programming languages and frameworks using patterns
  const patterns = [
    /\b(react|angular|vue|svelte|ember)\.?js\b/gi,
    /\b(node|express|django|flask|spring|laravel)\.?js?\b/gi,
    /\b(mongodb|postgresql|mysql|redis|elasticsearch)\b/gi,
    /\b(docker|kubernetes|jenkins|travis|circleci)\b/gi,
    /\b(aws|azure|gcp|heroku|vercel|netlify)\b/gi
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const skill = match.toLowerCase().replace(/[^\w]/g, '');
        if (!extractedSkills.find(s => s.name === skill)) {
          extractedSkills.push({
            name: skill,
            level: 'Intermediate',
            aiExtracted: true,
            confidence: 0.8
          });
        }
      });
    }
  });

  // Remove duplicates
  const uniqueSkills = extractedSkills.filter((skill, index, self) =>
    index === self.findIndex(s => s.name === skill.name)
  );

  return uniqueSkills.sort((a, b) => b.confidence - a.confidence);
}

// Calculate confidence score for skill extraction
function calculateConfidence(text, skill) {
  const occurrences = (text.match(new RegExp(escapeRegExp(skill), 'gi')) || []).length;
  const context = getSkillContext(text, skill);

  let confidence = Math.min(occurrences * 0.3, 0.9);

  // Boost confidence based on context
  if (context.includes('experience') || context.includes('years')) {
    confidence += 0.2;
  }
  if (context.includes('expert') || context.includes('advanced')) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

// Get context around skill mentions
function getSkillContext(text, skill) {
  const regex = new RegExp(`(.{0,50}${escapeRegExp(skill)}.{0,50})`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.join(' ').toLowerCase() : '';
}

// Calculate match score between user and job
async function calculateMatchScore(user, job) {
  let totalScore = 0;
  let weightSum = 0;

  // Skills matching (40% weight)
  const skillsScore = calculateSkillsMatch(user.skills || [], job.requiredSkills || []);
  totalScore += skillsScore * 0.4;
  weightSum += 0.4;

  // Experience matching (30% weight)
  const experienceScore = calculateExperienceMatch(user, job);
  totalScore += experienceScore * 0.3;
  weightSum += 0.3;

  // Location matching (20% weight)
  const locationScore = calculateLocationMatch(user, job);
  totalScore += locationScore * 0.2;
  weightSum += 0.2;

  // Job type preference (10% weight)
  const typeScore = calculateJobTypeMatch(user, job);
  totalScore += typeScore * 0.1;
  weightSum += 0.1;

  return weightSum > 0 ? totalScore / weightSum : 0;
}

// Calculate skills match score
function calculateSkillsMatch(userSkills, requiredSkills) {
  if (!userSkills.length || !requiredSkills.length) return 0;

  const userSkillNames = userSkills.map(s => s.name.toLowerCase());
  let matchCount = 0;
  let totalWeight = 0;

  requiredSkills.forEach(reqSkill => {
    const weight = reqSkill.mandatory ? 2 : 1;
    totalWeight += weight;
    if (userSkillNames.includes(reqSkill.name.toLowerCase())) {
      matchCount += weight;
    }
  });

  return totalWeight > 0 ? matchCount / totalWeight : 0;
}

// Calculate experience match
function calculateExperienceMatch(user, job) {
  const userExperience = user.experience || [];
  if (!userExperience.length) return 0.5;

  // Calculate total years of experience
  const totalYears = userExperience.reduce((total, exp) => {
    const endDate = exp.endDate || new Date();
    const startDate = new Date(exp.startDate);
    const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
    return total + Math.max(0, years);
  }, 0);

  // Map experience levels to year ranges
  const experienceRanges = {
    'entry': [0, 2],
    'mid': [2, 5],
    'senior': [5, 10],
    'executive': [10, 100]
  };

  const [minYears, maxYears] = experienceRanges[job.experienceLevel] || [0, 100];

  if (totalYears >= minYears && totalYears <= maxYears) {
    return 1.0;
  } else if (totalYears < minYears) {
    return Math.max(0, totalYears / minYears);
  } else {
    return Math.max(0.7, 1 - (totalYears - maxYears) / maxYears);
  }
}

// Calculate location match
function calculateLocationMatch(user, job) {
  if (job.remote) return 1.0;

  const userPreferences = user.preferences || {};
  const preferredLocations = userPreferences.locations || [];

  if (!preferredLocations.length) return 0.5;

  const jobLocation = job.location.toLowerCase();
  const hasMatch = preferredLocations.some(loc =>
    jobLocation.includes(loc.toLowerCase()) ||
    loc.toLowerCase().includes(jobLocation)
  );

  return hasMatch ? 1.0 : 0.3;
}

// Calculate job type match
function calculateJobTypeMatch(user, job) {
  const userPreferences = user.preferences || {};
  const preferredTypes = userPreferences.jobTypes || [];

  if (!preferredTypes.length) return 0.8;

  return preferredTypes.includes(job.type) ? 1.0 : 0.5;
}

module.exports = {
  extractSkillsFromText,
  calculateMatchScore,
  calculateSkillsMatch,
  calculateExperienceMatch,
  calculateLocationMatch,
  calculateJobTypeMatch
};
