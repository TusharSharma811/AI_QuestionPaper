const Question = require('../models/Question');

// @desc    Add a new question to the bank
// @route   POST /api/questions
// @access  Public (for now)
const addQuestion = async (req, res) => {
  try {
    const { subject, unit, question_text, question_type, marks, bloom_level } = req.body;

    // Create a new question object
    const question = new Question({
      subject,
      unit,
      question_text,
      question_type,
      marks,
      bloom_level
    });

    // Save to database
    const createdQuestion = await question.save();
    
    res.status(201).json(createdQuestion);
  } catch (error) {
    res.status(400).json({ message: 'Error adding question', error: error.message });
  }
};

// @desc    Get all questions
// @route   GET /api/questions
// @access  Public
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({}); // Find all
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { addQuestion, getQuestions };