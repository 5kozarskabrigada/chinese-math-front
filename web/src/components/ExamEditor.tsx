import { useState } from "react";
import type { AuthState } from "../lib/auth";

type Question = {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  points: number;
};

type ExamData = {
  id?: string;
  title: string;
  code: string;
  isActive: boolean;
  timeLimitMinutes: number;
  classroomIds: string[];
  questions: Question[];
};

type ExamEditorProps = {
  examId?: string;
  auth: AuthState | null;
  onBack: () => void;
  onSave: (exam: ExamData) => void;
};

// Math toolbar component
function MathToolbar({ onInsert }: { onInsert: (text: string) => void }) {
  const symbols = [
    { label: "√", value: "√" },
    { label: "∫", value: "∫" },
    { label: "∑", value: "∑" },
    { label: "π", value: "π" },
    { label: "∞", value: "∞" },
    { label: "≤", value: "≤" },
    { label: "≥", value: "≥" },
    { label: "≠", value: "≠" },
    { label: "±", value: "±" },
    { label: "×", value: "×" },
    { label: "÷", value: "÷" },
    { label: "²", value: "²" },
    { label: "³", value: "³" },
    { label: "½", value: "½" },
    { label: "¼", value: "¼" },
    { label: "¾", value: "¾" },
    { label: "°", value: "°" },
    { label: "α", value: "α" },
    { label: "β", value: "β" },
    { label: "θ", value: "θ" },
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '3px',
      padding: '6px',
      background: '#f9fafb',
      borderRadius: '6px',
      marginBottom: '6px',
      border: '1px solid #e5e7eb'
    }}>
      {symbols.map((sym, idx) => (
        <button
          key={idx}
          onClick={() => onInsert(sym.value)}
          type="button"
          style={{
            padding: '4px 8px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '15px',
            fontWeight: 500,
            color: '#374151',
            cursor: 'pointer',
            transition: 'all 0.15s',
            minWidth: '30px'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#6366f1';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = '#6366f1';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#374151';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          {sym.label}
        </button>
      ))}
    </div>
  );
}

export function ExamEditor(props: ExamEditorProps): JSX.Element {
  const [exam, setExam] = useState<ExamData>({
    title: "Untitled Exam",
    code: generateExamCode(),
    isActive: false,
    timeLimitMinutes: 60,
    classroomIds: [],
    questions: []
  });

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [previewTimeLeft, setPreviewTimeLeft] = useState(0);

  function generateExamCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function addQuestion() {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      content: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      points: 10
    };

    setExam(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setSelectedQuestionIndex(exam.questions.length);
  }

  function updateQuestion(index: number, updates: Partial<Question>) {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, ...updates } : q
      )
    }));
  }

  function deleteQuestion(index: number) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    setExam(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
    setSelectedQuestionIndex(null);
  }

  function duplicateQuestion(index: number) {
    const questionToCopy = exam.questions[index];
    const newQuestion: Question = {
      ...questionToCopy,
      id: `q-${Date.now()}`,
    };

    setExam(prev => ({
      ...prev,
      questions: [...prev.questions.slice(0, index + 1), newQuestion, ...prev.questions.slice(index + 1)]
    }));
  }

  function startPreview() {
    setPreviewMode(true);
    setPreviewQuestionIndex(0);
    setPreviewTimeLeft(exam.timeLimitMinutes * 60);
  }

  if (previewMode) {
    return <StudentPreview 
      exam={exam} 
      currentQuestionIndex={previewQuestionIndex}
      onNavigate={setPreviewQuestionIndex}
      timeLeft={previewTimeLeft}
      onExit={() => setPreviewMode(false)}
    />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Top Bar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={props.onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          
          <input
            type="text"
            value={exam.title}
            onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))}
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#111827',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              padding: '4px 8px',
              minWidth: '250px'
            }}
            placeholder="Exam Title"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 700,
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '6px 12px',
            borderRadius: '6px',
            letterSpacing: '1px'
          }}>
            {exam.code}
          </span>

          <button 
            onClick={startPreview}
            disabled={exam.questions.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'white',
              border: '1px solid #6366f1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#6366f1',
              cursor: exam.questions.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: exam.questions.length === 0 ? 0.5 : 1
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Preview
          </button>
          
          <button 
            onClick={() => props.onSave(exam)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              background: '#6366f1',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Exam
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={exam.isActive}
              onChange={(e) => setExam(prev => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
          </label>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {exam.isActive ? 'Active' : 'Draft'}
          </span>
        </div>
        
        <div style={{ width: '1px', height: '20px', background: '#d1d5db' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <input
            type="number"
            value={exam.timeLimitMinutes}
            onChange={(e) => setExam(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) || 60 }))}
            style={{
              width: '55px',
              padding: '4px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600
            }}
            min="1"
          />
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>min</span>
        </div>

        <div style={{ width: '1px', height: '20px', background: '#d1d5db' }}></div>

        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          fontWeight: 500
        }}>
          {exam.questions.length} {exam.questions.length === 1 ? 'Question' : 'Questions'} • {exam.questions.reduce((sum, q) => sum + q.points, 0)} Points
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          {exam.questions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 40px',
              background: 'white',
              borderRadius: '16px',
              border: '2px dashed #e5e7eb'
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
                style={{ margin: '0 auto 20px', opacity: 0.3, color: '#9ca3af' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                No questions yet
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>
                Get started by adding your first multiple choice question
              </p>
              <button
                onClick={addQuestion}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: '#6366f1',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Question
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {exam.questions.map((question, index) => (
                <QuestionEditorCard
                  key={question.id}
                  question={question}
                  index={index}
                  isSelected={selectedQuestionIndex === index}
                  onSelect={() => setSelectedQuestionIndex(index)}
                  onChange={(updates) => updateQuestion(index, updates)}
                  onDelete={() => deleteQuestion(index)}
                  onDuplicate={() => duplicateQuestion(index)}
                />
              ))}
              
              <button
                onClick={addQuestion}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  background: '#6366f1',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#6366f1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Question Editor Card Component
function QuestionEditorCard({ 
  question, 
  index, 
  isSelected, 
  onSelect, 
  onChange, 
  onDelete,
  onDuplicate 
}: { 
  question: Question; 
  index: number; 
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<Question>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [activeField, setActiveField] = useState<'question' | `option-${number}` | null>(null);

  function insertMathSymbol(field: 'question' | `option-${number}`, symbol: string) {
    if (field === 'question') {
      onChange({ content: question.content + symbol });
    } else {
      const optionIndex = parseInt(field.split('-')[1]);
      const newOptions = [...question.options];
      newOptions[optionIndex] += symbol;
      onChange({ options: newOptions });
    }
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
        boxShadow: isSelected ? '0 4px 6px -1px rgba(99, 102, 241, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s'
      }}
    >
      {/* Header */}
      <div 
        onClick={onSelect}
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: isSelected ? '#f5f3ff' : 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: '#6366f1',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700
          }}>
            Q{index + 1}
          </span>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
            Multiple Choice
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            value={question.points}
            onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '50px',
              padding: '5px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600
            }}
            min="0"
          />
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>pts</span>
          
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            style={{
              padding: '5px 8px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              marginLeft: '6px'
            }}
            title="Duplicate"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              padding: '5px 8px',
              background: 'white',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#dc2626',
              cursor: 'pointer'
            }}
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px' }}>
        {/* Question Field */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '12px', 
            fontWeight: 700, 
            color: '#374151', 
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Question
          </label>
          
          {activeField === 'question' && (
            <MathToolbar onInsert={(symbol) => insertMathSymbol('question', symbol)} />
          )}
          
          <textarea
            value={question.content}
            onChange={(e) => onChange({ content: e.target.value })}
            onFocus={() => setActiveField('question')}
            onBlur={() => setTimeout(() => setActiveField(null), 200)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
              lineHeight: '1.6',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseOut={e => activeField !== 'question' && (e.currentTarget.style.borderColor = '#e5e7eb')}
            placeholder="Enter your question here... Use the toolbar above for math symbols"
          />
        </div>

        {/* Options */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '12px', 
            fontWeight: 700, 
            color: '#374151', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Answer Options
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex}>
                {activeField === `option-${optionIndex}` && (
                  <MathToolbar onInsert={(symbol) => insertMathSymbol(`option-${optionIndex}`, symbol)} />
                )}
                
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ correctAnswer: optionIndex });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    background: question.correctAnswer === optionIndex ? '#ecfdf5' : '#f9fafb',
                    border: question.correctAnswer === optionIndex ? '2px solid #10b981' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    if (question.correctAnswer !== optionIndex) {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.background = '#f5f3ff';
                    }
                  }}
                  onMouseOut={e => {
                    if (question.correctAnswer !== optionIndex) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                >
                  {/* Radio button */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: question.correctAnswer === optionIndex ? '5px solid #10b981' : '2px solid #d1d5db',
                    background: 'white',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }} />

                  {/* Option label */}
                  <span style={{
                    fontWeight: 700,
                    color: question.correctAnswer === optionIndex ? '#065f46' : '#6b7280',
                    minWidth: '24px',
                    fontSize: '13px'
                  }}>
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>

                  {/* Input */}
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...question.options];
                      newOptions[optionIndex] = e.target.value;
                      onChange({ options: newOptions });
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setActiveField(`option-${optionIndex}`);
                    }}
                    onBlur={() => setTimeout(() => setActiveField(null), 200)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13px',
                      outline: 'none',
                      color: '#111827',
                      fontWeight: 500
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                  />

                  {/* Correct indicator */}
                  {question.correctAnswer === optionIndex && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#92400e',
            fontWeight: 500
          }}>
            💡 Click on an option to mark it as the correct answer
          </div>
        </div>
      </div>
    </div>
  );
}

// Student Preview Component
function StudentPreview({ 
  exam, 
  currentQuestionIndex, 
  onNavigate, 
  timeLeft,
  onExit 
}: { 
  exam: ExamData; 
  currentQuestionIndex: number;
  onNavigate: (index: number) => void;
  timeLeft: number;
  onExit: () => void;
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const currentQuestion = exam.questions[currentQuestionIndex];

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (!currentQuestion) {
    return <div>No questions available</div>;
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Top Bar with Timer */}
      <div style={{
        background: 'white',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onExit}
            style={{
              padding: '6px 12px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            Exit Preview
          </button>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
            {exam.title}
          </h2>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#fef3c7',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '2px solid #fcd34d'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: '#92400e',
            fontFamily: 'monospace'
          }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Main Question Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '30px',
        overflowY: 'auto'
      }}>
        <div style={{
          maxWidth: '650px',
          width: '100%',
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          {/* Question Number */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            paddingBottom: '12px',
            borderBottom: '2px solid #f3f4f6'
          }}>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 700, 
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Question {currentQuestionIndex + 1} of {exam.questions.length}
            </span>
            <span style={{
              background: '#eef2ff',
              color: '#6366f1',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              {currentQuestion.points} points
            </span>
          </div>

          {/* Question Text */}
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            lineHeight: '1.6',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {currentQuestion.content || "(No question text)"}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.options.map((option, optionIndex) => (
              <div
                key={optionIndex}
                onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }))}
                style={{
                  padding: '14px 18px',
                  background: selectedAnswers[currentQuestionIndex] === optionIndex ? '#ede9fe' : '#f9fafb',
                  border: selectedAnswers[currentQuestionIndex] === optionIndex ? '2px solid #6366f1' : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseOver={e => {
                  if (selectedAnswers[currentQuestionIndex] !== optionIndex) {
                    e.currentTarget.style.background = '#f5f3ff';
                    e.currentTarget.style.borderColor = '#a5b4fc';
                  }
                }}
                onMouseOut={e => {
                  if (selectedAnswers[currentQuestionIndex] !== optionIndex) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: selectedAnswers[currentQuestionIndex] === optionIndex ? '6px solid #6366f1' : '2px solid #d1d5db',
                  background: 'white',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }} />

                <span style={{
                  fontWeight: 700,
                  color: selectedAnswers[currentQuestionIndex] === optionIndex ? '#6366f1' : '#6b7280',
                  fontSize: '14px',
                  minWidth: '28px'
                }}>
                  {String.fromCharCode(65 + optionIndex)}.
                </span>

                <span style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: 500
                }}>
                  {option || "(No option text)"}
                </span>

                {selectedAnswers[currentQuestionIndex] === optionIndex && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{
        background: 'white',
        padding: '14px 24px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <button
          onClick={() => onNavigate(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: currentQuestionIndex === 0 ? '#f3f4f6' : 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: currentQuestionIndex === 0 ? '#9ca3af' : '#374151',
            cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Previous
        </button>

        {/* Question indicators */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {exam.questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(idx)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: idx === currentQuestionIndex ? '2px solid #6366f1' : '1px solid #e5e7eb',
                background: selectedAnswers[idx] !== undefined 
                  ? (idx === currentQuestionIndex ? '#6366f1' : '#eef2ff')
                  : (idx === currentQuestionIndex ? '#6366f1' : 'white'),
                color: idx === currentQuestionIndex ? 'white' : (selectedAnswers[idx] !== undefined ? '#6366f1' : '#6b7280'),
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => onNavigate(Math.min(exam.questions.length - 1, currentQuestionIndex + 1))}
          disabled={currentQuestionIndex === exam.questions.length - 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: currentQuestionIndex === exam.questions.length - 1 ? '#f3f4f6' : '#6366f1',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: currentQuestionIndex === exam.questions.length - 1 ? '#9ca3af' : 'white',
            cursor: currentQuestionIndex === exam.questions.length - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
