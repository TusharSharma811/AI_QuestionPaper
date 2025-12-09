const Question = require('../models/Question');
const axios = require('axios');

// Helper: Call Python AI Service
const paraphraseQuestion = async (text) => {
  try {
    const response = await axios.post('http://localhost:5001/paraphrase', {
      text: text
    });
    // Check if the modified flag is true, else return original
    if (response.data.modified) {
        return response.data.paraphrased;
    }
    return text;
  } catch (error) {
    console.error("AI Service Error (Skipping paraphrase):", error.message);
    return text; // Fallback: Return original if AI fails
  }
};

// --- SMART ALGORITHM: Least Used First ---
// FIXED: Added 'subject' parameter here
const getSmartQuestions = async (subject, unit, type, count) => {
  
  // 1. Find questions matching Subject + Unit + Type
  const candidates = await Question.find({ 
    subject: subject, // <--- THIS WAS MISSING!
    unit: unit, 
    question_type: type 
  })
  .sort({ usage_count: 1, last_used_date: 1 }) 
  .limit(count + 5); 

  if (candidates.length < count) {
    console.warn(`Not enough questions for ${subject} Unit ${unit} Type ${type}. Needed ${count}, found ${candidates.length}`);
    return candidates; 
  }

  // 2. Shuffle slightly
  const shuffled = candidates.sort(() => 0.5 - Math.random());
  
  // 3. Pick required number
  return shuffled.slice(0, count);
};

// --- MARK AS USED ---
const markQuestionsAsUsed = async (questionIds) => {
  await Question.updateMany(
    { _id: { $in: questionIds } },
    { 
      $inc: { usage_count: 1 }, 
      $set: { last_used_date: new Date() } 
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

    let allSelectedIds = [];

    // Loop through all 5 units
    for (let unit = 1; unit <= 5; unit++) {
      
      // FIXED: Passed 'subject' into every function call below

      // 1. Section A (Brief)
      const secA = await getSmartQuestions(subject, unit, 'BRIEF', 2);
      paperStructure.sectionA.push(...secA);
      allSelectedIds.push(...secA.map(q => q._id));

      // 2. Section B (Long) - With AI
      let secB = await getSmartQuestions(subject, unit, 'LONG_ANSWER', 1);
      
      const secB_AI = await Promise.all(secB.map(async (q) => {
          const newText = await paraphraseQuestion(q.question_text);
          return { ...q.toObject(), question_text: newText, is_ai_generated: true };
      }));

      paperStructure.sectionB.push(...secB_AI);
      allSelectedIds.push(...secB.map(q => q._id));

      // 3. Section C (Long) - With AI
      let secC = await getSmartQuestions(subject, unit, 'LONG_ANSWER', 2);

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

    // Update stats
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