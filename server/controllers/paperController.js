const Question = require('../models/Question');
const axios = require('axios');

// Helper: Call Python AI Service
const paraphraseQuestion = async (text) => {
  try {
    const response = await axios.post('http://localhost:5001/paraphrase', {
      text: text
    });
    return response.data.paraphrased;
  } catch (error) {
    console.error("AI Service Error (Skipping paraphrase):", error.message);
    return text; // Fallback: Return original if AI fails
  }
};

// --- SMART ALGORITHM: Least Used First ---
const getSmartQuestions = async (unit, type, count) => {
  // 1. Find ALL questions matching criteria
  const candidates = await Question.find({ 
    unit: unit, 
    question_type: type 
  })
  .sort({ usage_count: 1, last_used_date: 1 }) // Primary Sort: Least used. Secondary: Oldest usage.
  .limit(count + 5); // Fetch a few extras to add a tiny bit of randomness among the best candidates

  if (candidates.length < count) {
    console.warn(`Not enough questions for Unit ${unit} Type ${type}. Needed ${count}, found ${candidates.length}`);
    return candidates; // Return what we have
  }

  // 2. Shuffle the top candidates slightly so it's not PREDICTABLE
  const shuffled = candidates.sort(() => 0.5 - Math.random());
  
  // 3. Pick the required number
  return shuffled.slice(0, count);
};

// --- MARK AS USED ---
const markQuestionsAsUsed = async (questionIds) => {
  await Question.updateMany(
    { _id: { $in: questionIds } },
    { 
      $inc: { usage_count: 1 }, // Increment usage counter
      $set: { last_used_date: new Date() } // Update timestamp
    }
  );
};

const generatePaper = async (req, res) => {
  try {
    const { subject } = req.body;

    const paperStructure = {
      sectionA: [],
      sectionB: [],
      sectionC: []
    };

    // Keep track of ALL selected IDs to update them later
    let allSelectedIds = [];

    // Loop through all 5 units
    for (let unit = 1; unit <= 5; unit++) {
      
      // 1. Section A (2 Brief questions)
      const secA = await getSmartQuestions(unit, 'BRIEF', 2);
      paperStructure.sectionA.push(...secA);
      allSelectedIds.push(...secA.map(q => q._id));

      // 2. Section B (1 Long question)
      let secB = await getSmartQuestions(unit, 'LONG_ANSWER', 1);

// Paraphrase them!
const secB_AI = await Promise.all(secB.map(async (q) => {
    const newText = await paraphraseQuestion(q.question_text);
    return { ...q.toObject(), question_text: newText, is_ai_generated: true };
}));

paperStructure.sectionB.push(...secB_AI);
allSelectedIds.push(...secB.map(q => q._id));

      // 3. Section C (2 Long questions)
      let secC = await getSmartQuestions(unit, 'LONG_ANSWER', 2);

const secC_AI = await Promise.all(secC.map(async (q) => {
    const newText = await paraphraseQuestion(q.question_text);
    return { ...q.toObject(), question_text: newText, is_ai_generated: true };
}));

paperStructure.sectionC.push({
  unit: unit,
  questions: secC_AI
});
allSelectedIds.push(...secC.map(q => q._id));
    }

    // CRITICAL: Update database stats
    await markQuestionsAsUsed(allSelectedIds);

    res.json({
      success: true,
      subject,
      generatedAt: new Date(),
      paper: paperStructure
    });

  } catch (error) {
    console.error("Generator Error:", error);
    res.status(500).json({ message: "Error generating paper", error });
  }
};

module.exports = { generatePaper };