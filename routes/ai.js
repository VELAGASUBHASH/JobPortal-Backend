const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { extractSkillsFromText } = require('../utils/ai.js');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Normalize skill string (removes `.js`, trims, lowercases)
function normalizeSkill(skill) {
  return (skill || '').replace(/\.js$/, '').trim().toLowerCase();
}

// Helper: extract simple field by regex
function extractField(text, label, fallbackRegex = null) {
  const regex = new RegExp(`${label}\\s*[:\\-]?\\s*(.*)`, 'i');
  const match = text.match(regex);
  if (match) return match[1].split('\n')[0].trim();

  if (fallbackRegex) {
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch) return fallbackMatch[1].split('\n')[0].trim();
  }
  return '';
}

// POST /api/ai/parse-resume
router.post('/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text || '';

    // Safely map to a string, even if extractSkillsFromText returns objects (with .name)
    let skills = [];
    if (text) {
      const extracted = await extractSkillsFromText(text); // usually returns objects
      skills = extracted
        .map(s =>
          s && typeof s === 'object' && s.name
            ? normalizeSkill(s.name)
            : typeof s === 'string'
            ? normalizeSkill(s)
            : ''
        )
        .filter(Boolean);
    }

    const name = extractField(text, 'Name', /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
    const email = extractField(text, 'Email', /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const batch = extractField(text, 'Batch');
    const dob = extractField(text, 'DOB', /(\d{2}[-/]\d{2}[-/]\d{4})/);
    const experience = extractField(text, 'Experience', /(Experience\s*[:\-]?\s*)(.*)/i);

    // Optional: try to extract a cover letter section
    let coverLetter = '';
    const coverLetterMatch = text.match(/Cover Letter[\s\S]*?(Dear.*?)(?=\n[A-Z])/i);
    if (coverLetterMatch) {
      coverLetter = coverLetterMatch[1].trim();
    }

    res.json({
      text,
      skills,
      name,
      email,
      batch,
      dob,
      experience,
      coverLetter,
      message: 'Resume parsed successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Resume parsing failed' });
  }
});

module.exports = router;
