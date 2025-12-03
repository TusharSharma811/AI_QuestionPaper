const express = require('express');
const router = express.Router();
const { addQuestion, getQuestions } = require('../controllers/questionController');

// Define the paths
router.route('/').post(addQuestion).get(getQuestions);

module.exports = router;