import { useState, useEffect, useRef } from "react";
import type { AuthState } from "../lib/auth";
import { apiRequest } from "../lib/api";
import katex from "katex";

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

// Math toolbar component with LaTeX support
function MathToolbar({ onInsert }: { onInsert: (text: string) => void }) {
  const latexCommands = [
    { label: "√ Square Root", value: "\\sqrt{}" },
    { label: "ⁿ√ nth Root", value: "\\sqrt[n]{}" },
    { label: "÷ Fraction", value: "\\frac{}{}" },
    { label: "x² Power", value: "^{}" },
    { label: "xₙ Subscript", value: "_{}" },
    { label: "∑ Sum", value: "\\sum_{i=1}^{n}" },
    { label: "∫ Integral", value: "\\int_{a}^{b}" },
    { label: "√ Root", value: "\\sqrt{}" },
    { label: "π Pi", value: "\\pi" },
    { label: "∞ Infinity", value: "\\infty" },
    { label: "≤ Less/Equal", value: "\\leq" },
    { label: "≥ Greater/Equal", value: "\\geq" },
    { label: "≠ Not Equal", value: "\\neq" },
    { label: "± Plus/Minus", value: "\\pm" },
    { label: "× Times", value: "\\times" },
    { label: "÷ Divide", value: "\\div" },
    { label: "° Degree", value: "^\\circ" },
    { label: "α Alpha", value: "\\alpha" },
    { label: "β Beta", value: "\\beta" },
    { label: "θ Theta", value: "\\theta" },
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      padding: '8px',
      background: '#f0f9ff',
      borderRadius: '6px',
      marginBottom: '8px',
      border: '1px solid #bae6fd'
    }}>
      <div style={{
        width: '100%',
        fontSize: '11px',
        fontWeight: 700,
        color: '#0369a1',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        LaTeX Math Toolbar - Click to insert
      </div>
      {latexCommands.map((cmd, idx) => (
        <button
          key={idx}
          onClick={() => onInsert(cmd.value)}
          type="button"
          title={`Insert: ${cmd.value}`}
          style={{
            padding: '5px 8px',
            background: 'white',
            border: '1px solid #93c5fd',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#1e40af',
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#3b82f6';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#1e40af';
            e.currentTarget.style.borderColor = '#93c5fd';
          }}
        >
          {cmd.label}
        </button>
      ))}
    </div>
  );
}

// Inline LaTeX Editor - Shows rendered math as you type
function InlineLatexEditor({ 
  value, 
  onChange, 
  onFocus, 
  onBlur, 
  placeholder,
  isActive 
}: { 
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  isActive?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const renderLatex = (text: string): string => {
    if (!text) return '';
    
    try {
      // Check if text contains LaTeX commands
      const hasLatex = /\\[a-zA-Z]+|\{|\}|\^|_/.test(text);
      
      if (hasLatex) {
        // Render as LaTeX
        return katex.renderToString(text, {
          throwOnError: false,
          displayMode: false,
          output: 'html',
          trust: true
        });
      } else {
        // Return plain text wrapped in span
        return `<span>${text || ''}</span>`;
      }
    } catch (err) {
      // On error, show the raw text
      return `<span style="color: #991b1b; font-family: monospace;">${text}</span>`;
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(value.length, value.length);
      }
    }, 0);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsEditing(false);
      onBlur?.();
    }, 200);
  };

  const handleFocus = () => {
    setIsEditing(true);
    onFocus?.();
  };

  useEffect(() => {
    if (isActive && !isEditing) {
      setIsEditing(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isActive]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '80px'
    }}>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #6366f1',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'monospace',
            resize: 'vertical',
            minHeight: '80px',
            lineHeight: '1.6',
            outline: 'none',
            background: '#fafbff',
            color: '#1f2937'
          }}
        />
      ) : (
        <div
          onClick={handleEditClick}
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '15px',
            minHeight: '80px',
            lineHeight: '1.6',
            cursor: 'text',
            background: 'white',
            transition: 'all 0.2s',
            color: value ? '#1f2937' : '#9ca3af'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
        >
          {value ? (
            <div dangerouslySetInnerHTML={{ __html: renderLatex(value) }} />
          ) : (
            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>{placeholder || 'Click to edit...'}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ExamEditor(props: ExamEditorProps): JSX.Element {
  const [exam, setExam] = useState<ExamData>({
    title: "Untitled Exam",
    code: "",
    isActive: false,
    timeLimitMinutes: 60,
    classroomIds: [],
    questions: []
  });

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [previewTimeLeft, setPreviewTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load exam data when editing, or generate code for new exam
  useEffect(() => {
    async function loadExam() {
      if (props.examId && props.auth) {
        setLoading(true);
        try {
          const examData = await apiRequest<ExamData>({
            path: `/admin/exams/${props.examId}`,
            auth: props.auth
          });
          setExam(examData);
        } catch (error) {
          console.error('Failed to load exam:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // Generate code for new exam only once
        setExam(prev => ({
          ...prev,
          code: prev.code || generateExamCode()
        }));
      }
    }

    loadExam();
  }, [props.examId, props.auth]);

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

  function regenerateCode() {
    if (confirm('Generate a new exam code? This will replace the current code.')) {
      setExam(prev => ({ ...prev, code: generateExamCode() }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={props.onBack}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              
              <div className="h-8 w-px bg-gray-300"></div>
              
              <input
                type="text"
                value={exam.title}
                onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 min-w-[300px]"
                placeholder="Exam Title"
              />
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={startPreview}
                disabled={exam.questions.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Preview
              </button>
              
              <button 
                onClick={() => props.onSave(exam)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save Exam
              </button>
            </div>
          </div>
        </div>

        {/* Settings Bar */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={exam.isActive}
                  onChange={(e) => setExam(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="text-xs font-semibold text-gray-700">
                {exam.isActive ? 'Active' : 'Draft'}
              </span>
            </div>
            
            <div className="h-5 w-px bg-gray-300"></div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg">
                <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <input
                  type="number"
                  value={exam.timeLimitMinutes}
                  onChange={(e) => setExam(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) || 60 }))}
                  className="w-12 text-sm font-semibold text-center bg-transparent border-none outline-none"
                  min="1"
                />
                <span className="text-xs text-gray-500 font-medium">min</span>
              </div>
            </div>

            <div className="h-5 w-px bg-gray-300"></div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg group cursor-pointer" onClick={regenerateCode} title="Click to regenerate code">
                <span className="font-mono text-sm font-bold text-gray-700 tracking-wider">{exam.code}</span>
                <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
              </div>
            </div>

            <div className="h-5 w-px bg-gray-300"></div>

            <div className="text-xs text-gray-600 font-medium">
              <span className="font-semibold text-gray-900">{exam.questions.length}</span> {exam.questions.length === 1 ? 'Question' : 'Questions'} • <span className="font-semibold text-gray-900">{exam.questions.reduce((sum, q) => sum + q.points, 0)}</span> Points
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {exam.questions.length === 0 ? (
            <div className="text-center py-20 px-8 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <svg className="w-16 h-16 mx-auto mb-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No questions yet
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Get started by adding your first multiple choice question
              </p>
              <button
                onClick={addQuestion}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Question
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
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
                className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <div className={`bg-white rounded-xl transition-all duration-200 ${isSelected ? 'border-2 border-indigo-600 shadow-lg shadow-indigo-100' : 'border border-gray-200 shadow-sm'}`}>
      {/* Header */}
      <div 
        onClick={onSelect}
        className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'bg-transparent hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-3">
          <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
            Q{index + 1}
          </span>
          <span className="text-xs text-gray-600 font-medium">
            Multiple Choice
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={question.points}
            onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
            onClick={(e) => e.stopPropagation()}
            className="w-14 px-2 py-1.5 border border-gray-300 rounded-lg text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="0"
          />
          <span className="text-xs text-gray-600 font-medium">pts</span>
          
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ml-2"
            title="Duplicate"
          >
            <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 bg-white border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Question Field */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
            Question
          </label>
          
          {activeField === 'question' && (
            <MathToolbar onInsert={(symbol) => insertMathSymbol('question', symbol)} />
          )}
          
          <InlineLatexEditor
            value={question.content}
            onChange={(value) => onChange({ content: value })}
            onFocus={() => setActiveField('question')}
            onBlur={() => setTimeout(() => setActiveField(null), 200)}
            placeholder="Enter question with LaTeX math: e.g., Solve \\sqrt{x+1} = 5"
            isActive={activeField === 'question'}
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
            Answer Options
          </label>

          <div className="flex flex-col gap-3">
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
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    question.correctAnswer === optionIndex 
                      ? 'bg-emerald-50 border-2 border-emerald-500' 
                      : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                  }`}
                >
                  {/* Radio button */}
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 transition-all duration-200 ${
                    question.correctAnswer === optionIndex 
                      ? 'border-[5px] border-emerald-500 bg-white' 
                      : 'border-2 border-gray-400 bg-white'
                  }`} />

                  {/* Option label */}
                  <span className={`font-bold min-w-[24px] text-sm ${
                    question.correctAnswer === optionIndex ? 'text-emerald-700' : 'text-gray-600'
                  }`}>
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
                    className="flex-1 px-3 py-1.5 border-none bg-transparent text-sm outline-none font-medium"
                    placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// Student Preview Component
// Render text with LaTeX support
function RenderLatex({ text }: { text: string }) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    if (!text) {
      setHtml("");
      return;
    }

    try {
      // Try to render as LaTeX, fallback to plain text on error
      const rendered = katex.renderToString(text, {
        throwOnError: false,
        displayMode: false,
        output: 'html'
      });
      setHtml(rendered);
    } catch (err) {
      // If rendering fails, show plain text
      setHtml(text);
    }
  }, [text]);

  if (!html) return <span>{text || "(No text)"}</span>;

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

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
            <RenderLatex text={currentQuestion.content} />
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
                  <RenderLatex text={option} />
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
