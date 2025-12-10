import { useEffect, useState } from 'react'
import axios from 'axios'
import QuestionForm from '../components/QuestionForm'
import QuestionList from '../components/QuestionList'
import PaperPreview from '../components/PaperPreview'

function QuestionManager() {
  const [questions, setQuestions] = useState([])
  const [generatedPaper, setGeneratedPaper] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState('Software Engineering')

  const fetchQuestions = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/questions')
      setQuestions(data)
    } catch (error) {
      console.error('Error fetching questions:', error)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleGenerate = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/paper/generate', {
        subject: selectedSubject,
      })
      setGeneratedPaper(response.data)
    } catch (error) {
      alert('Error generating paper. Make sure you have enough questions in the bank!')
      console.error(error)
    }
  }

  const downloadPDF = async () => {
    if (!generatedPaper) return

    try {
      const response = await axios.post(
        'http://localhost:5000/api/paper/download',
        { paperData: generatedPaper },
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'SoftwareEngineering_Exam.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Error generating PDF file')
    }
  }

  return (
    <div className="app-container">
      <header>
        <h1>AI Question Paper Generator</h1>

        <div style={{ margin: '10px 0' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Select Subject:</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', borderRadius: '5px' }}
          >
            <option value="Software Engineering">Software Engineering</option>
            <option value="DBMS">DBMS</option>
            <option value="Computer Networks">Computer Networks</option>
          </select>
        </div>

        <button className="generate-btn" onClick={handleGenerate}>
          ⚡ Generate Paper Now
        </button>
      </header>

      {generatedPaper ? (
        <div className="preview-container">
          <div className="button-group" style={{ marginBottom: '20px' }}>
            <button onClick={() => setGeneratedPaper(null)}>Back to Manager</button>
            <button onClick={downloadPDF} style={{ marginLeft: '10px', backgroundColor: '#dc3545' }}>
              📥 Download PDF
            </button>
          </div>

          <PaperPreview paperData={generatedPaper} />
        </div>
      ) : (
        <main className="main-content">
          <div className="left-panel">
            <QuestionForm onQuestionAdded={fetchQuestions} />
          </div>
          <div className="right-panel">
            <QuestionList questions={questions} />
          </div>
        </main>
      )}
    </div>
  )
}

export default QuestionManager
