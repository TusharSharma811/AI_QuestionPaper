const express = require('express');
const router = express.Router();
const { generatePaper } = require('../controllers/paperController');
const { buildPDF } = require('../controllers/pdfController');

router.post('/generate', generatePaper);
router.post('/download', buildPDF);

module.exports = router;