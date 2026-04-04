import { ArrowLeft, CheckCircle2, Clock3, Eye, KeyRound, LayoutGrid, PenSquare, Rows3, Save } from "lucide-react";
import { useState } from "react";
import type { AuthState } from "../lib/auth";

type Question = {
  id: string;
  type: "multiple-choice" | "fill-blank" | "short-answer" | "multi-part";
  content: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
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

  const questionTypes: Array<{ type: Question["type"]; label: string; icon: JSX.Element }> = [
    {
      type: "multiple-choice",
      label: "Multiple Choice",
      icon: <CheckCircle2 size={18} />
    },
    {
      type: "fill-blank",
      label: "Fill in Blank",
      icon: <Rows3 size={18} />
    },
    {
      type: "short-answer",
      label: "Short Answer",
      icon: <PenSquare size={18} />
    },
    {
      type: "multi-part",
      label: "Multi-Part",
      icon: <LayoutGrid size={18} />
    }
  ];

  function generateExamCode(): string {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    const all = `${letters}${digits}`;
    const code = [
      letters[Math.floor(Math.random() * letters.length)],
      digits[Math.floor(Math.random() * digits.length)]
    ];

    while (code.length < 6) {
      code.push(all[Math.floor(Math.random() * all.length)]);
    }

    return code.sort(() => Math.random() - 0.5).join("");
  }

  function addQuestion(type: Question["type"]) {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type,
      content: "",
      correctAnswer: type === "multiple-choice" ? "" : [],
      points: 10,
      ...(type === "multiple-choice" && { options: ["", "", "", ""] })
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
    setExam(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
    setSelectedQuestionIndex(null);
  }

  function moveQuestion(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === exam.questions.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newQuestions = [...exam.questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];

    setExam(prev => ({ ...prev, questions: newQuestions }));
    setSelectedQuestionIndex(newIndex);
  }

  return (
    <div className="exam-editor">
      {/* Left Sidebar */}
      <div className="exam-editor-sidebar">
        <div className="exam-editor-sidebar-header">
          <h2>Exam Editor</h2>
          <span className={`exam-status-badge ${exam.isActive ? 'active' : 'inactive'}`}>
            {exam.isActive ? 'Active' : 'Draft'}
          </span>
        </div>
        
        <nav className="exam-editor-nav">
          <button className="nav-button active">
            <LayoutGrid size={18} />
            <span>Overview</span>
          </button>

          <div className="nav-section-title">
            Question Types
          </div>

          {questionTypes.map((questionType) => (
            <button
              key={questionType.type}
              type="button"
              className="question-type-button"
              onClick={() => addQuestion(questionType.type)}
            >
              {questionType.icon}
              <span>{questionType.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="exam-editor-main">
        {/* Top Bar */}
        <div className="exam-editor-header">
          <div className="exam-editor-top-bar">
            <div className="exam-editor-toolbar-left">
              <button onClick={props.onBack} className="back-button">
                <ArrowLeft size={18} />
                Back
              </button>
              <span className="exam-title-text">{exam.title || "Untitled Exam"}</span>
            </div>
            
            <div className="exam-editor-toolbar-actions">
              <button 
                type="button"
                className="editor-toolbar-button"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye size={16} />
                Preview
              </button>
              
              <button 
                type="button"
                className="editor-toolbar-button editor-toolbar-button-primary"
                onClick={() => props.onSave(exam)}
              >
                <Save size={16} />
                Save Exam
              </button>
            </div>
          </div>
          
          {/* Control Panel */}
          <div className="exam-editor-control-wrap">
            <div className={`editor-control-panel ${exam.isActive ? 'editor-control-panel-active' : ''}`}>
              <div className="editor-control-row">
                <div className="editor-control-group">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={exam.isActive}
                      onChange={(e) => setExam(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="editor-control-state">
                    {exam.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="editor-control-divider"></div>
                
                <div className="editor-control-group">
                  <Clock3 size={18} />
                  <input
                    type="number"
                    value={exam.timeLimitMinutes}
                    onChange={(e) => setExam(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) || 60 }))}
                    className="editor-time-input"
                    min="1"
                  />
                  <span className="editor-control-copy">minutes</span>
                </div>
                
                <div className="editor-control-divider"></div>
                
                <div className="editor-control-group">
                  <KeyRound size={18} />
                  <span className="editor-control-label">
                    Code:
                  </span>
                  <span className={`editor-code-chip ${exam.isActive ? 'editor-code-chip-active' : ''}`}>
                    {exam.code}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f3f4f6' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {!previewMode ? (
              <>
                {/* Questions Section */}
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  padding: '32px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #f3f4f6' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      Questions ({exam.questions.length})
                    </h3>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 600,
                      color: '#6366f1',
                      background: '#eef2ff',
                      padding: '6px 12px',
                      borderRadius: '8px'
                    }}>
                      Total: {exam.questions.reduce((sum, q) => sum + q.points, 0)} pts
                    </div>
                  </div>

                  {exam.questions.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      color: '#9ca3af',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      border: '2px dashed #e5e7eb'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <p style={{ fontSize: '15px', margin: 0, fontWeight: 500 }}>No questions yet</p>
                      <p style={{ fontSize: '13px', margin: '8px 0 0 0', color: '#d1d5db' }}>Use the sidebar to add questions</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {exam.questions.map((question, index) => (
                        <div
                          key={question.id}
                          onClick={() => setSelectedQuestionIndex(selectedQuestionIndex === index ? null : index)}
                          style={{
                            padding: '20px',
                            border: selectedQuestionIndex === index ? '2px solid #6366f1' : '1px solid #e5e7eb',
                            borderRadius: '12px',
                            background: selectedQuestionIndex === index ? '#f5f3ff' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: selectedQuestionIndex === index ? '0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: '14px', 
                            color: selectedQuestionIndex === index ? '#4f46e5' : '#6b7280', 
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{
                              background: selectedQuestionIndex === index ? '#6366f1' : '#e5e7eb',
                              color: selectedQuestionIndex === index ? 'white' : '#6b7280',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 700
                            }}>
                              Q{index + 1}
                            </span>
                            <span>{question.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <span style={{
                              marginLeft: 'auto',
                              background: selectedQuestionIndex === index ? '#eef2ff' : '#f3f4f6',
                              color: selectedQuestionIndex === index ? '#6366f1' : '#6b7280',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              {question.points} pts
                            </span>
                          </div>
                          
                          <QuestionRenderer question={question} />

                          {selectedQuestionIndex === index && (
                            <div 
                              style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <QuestionEditor
                                question={question}
                                onChange={(updates: Partial<Question>) => updateQuestion(index, updates)}
                              />
                              
                              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, "up"); }}
                                  disabled={index === 0}
                                  style={{
                                    padding: '10px 16px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#374151',
                                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                                    opacity: index === 0 ? 0.5 : 1,
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={e => !e.currentTarget.disabled && (e.currentTarget.style.background = '#f9fafb')}
                                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                                >
                                  ↑ Move Up
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, "down"); }}
                                  disabled={index === exam.questions.length - 1}
                                  style={{
                                    padding: '10px 16px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#374151',
                                    cursor: index === exam.questions.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: index === exam.questions.length - 1 ? 0.5 : 1,
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={e => !e.currentTarget.disabled && (e.currentTarget.style.background = '#f9fafb')}
                                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                                >
                                  ↓ Move Down
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteQuestion(index); }}
                                  style={{
                                    marginLeft: 'auto',
                                    padding: '10px 16px',
                                    border: '1px solid #fca5a5',
                                    background: 'white',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                                >
                                  🗑 Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <ExamPreview exam={exam} onClose={() => setPreviewMode(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Renderer Component
function QuestionRenderer({ question }: { question: Question }): JSX.Element {
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ 
        fontSize: '15px', 
        lineHeight: '1.6', 
        color: '#111827', 
        marginBottom: '16px',
        fontWeight: 500 
      }}>
        {question.content || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(Empty question)</span>}
      </div>
      
      {question.type === "multiple-choice" && question.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {question.options.map((option, idx) => (
            <div 
              key={idx} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ 
                fontWeight: 700, 
                color: '#6366f1',
                minWidth: '28px',
                height: '28px',
                background: '#eef2ff',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px'
              }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ flex: 1, color: '#374151', fontSize: '14px' }}>
                {option || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>(Empty option)</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {question.type === "fill-blank" && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            display: 'inline-block',
            minWidth: '200px',
            borderBottom: '2px solid #6366f1',
            padding: '8px 0',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            _________________
          </div>
        </div>
      )}

      {question.type === "short-answer" && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            padding: '40px 20px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            color: '#9ca3af',
            textAlign: 'center',
            background: '#f9fafb',
            fontSize: '13px',
            fontWeight: 500
          }}>
            [Answer space]
          </div>
        </div>
      )}
    </div>
  );
}

// Question Editor Component
function QuestionEditor({ question, onChange }: { question: Question; onChange: (updates: Partial<Question>) => void }): JSX.Element {
  return (
    <div className="question-editor-panel" onClick={(e) => e.stopPropagation()}>
      <div className="editor-field">
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Question Content</label>
        <textarea
          value={question.content}
          onChange={(e) => onChange({ content: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '100px',
            transition: 'border-color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          placeholder="Enter question text..."
          rows={4}
        />
      </div>

      {question.type === "multiple-choice" && (
        <div className="editor-field">
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Options</label>
          {question.options?.map((option, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ 
                fontWeight: 700, 
                color: '#6b7280',
                minWidth: '32px',
                background: '#f3f4f6',
                padding: '8px 10px',
                borderRadius: '6px',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...(question.options || [])];
                  newOptions[idx] = e.target.value;
                  onChange({ options: newOptions });
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
            </div>
          ))}
          
          <div className="editor-field" style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Correct Answer</label>
            <select
              value={question.correctAnswer as string}
              onChange={(e) => onChange({ correctAnswer: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                transition: 'border-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <option value="">Select correct answer</option>
              {question.options?.map((_, idx) => (
                <option key={idx} value={String.fromCharCode(65 + idx)}>
                  Option {String.fromCharCode(65 + idx)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {question.type === "fill-blank" && (
        <div className="editor-field">
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Accepted Answer(s)</label>
          <input
            type="text"
            value={Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : question.correctAnswer}
            onChange={(e) => onChange({ correctAnswer: e.target.value.split(",").map(s => s.trim()) })}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
            placeholder="Enter accepted answers (comma-separated)"
          />
        </div>
      )}

      {question.type === "short-answer" && (
        <div className="editor-field">
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Model Answer</label>
          <textarea
            value={question.correctAnswer as string}
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
              transition: 'border-color 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
            placeholder="Enter model answer..."
            rows={3}
          />
        </div>
      )}

      <div className="editor-field">
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Points</label>
        <input
          type="number"
          value={question.points}
          onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          min="0"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            transition: 'border-color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
        />
      </div>

      <div className="editor-field">
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block' }}>Explanation (Optional)</label>
        <textarea
          value={question.explanation || ""}
          onChange={(e) => onChange({ explanation: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '80px',
            transition: 'border-color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          placeholder="Add solution explanation..."
          rows={3}
        />
      </div>
    </div>
  );
}

// Preview Component
function ExamPreview({ exam, onClose }: { exam: ExamData; onClose: () => void }): JSX.Element {
  return (
    <div className="exam-preview">
      <div className="preview-header">
        <h2>Preview Mode</h2>
        <button onClick={onClose} className="close-preview-btn">Close Preview</button>
      </div>
      
      <div className="preview-content">
        <div className="preview-exam-header">
          <h1>{exam.title}</h1>
          <div className="preview-meta">
            <p>Time Limit: {exam.timeLimitMinutes} minutes</p>
            <p>Total Points: {exam.questions.reduce((sum, q) => sum + q.points, 0)}</p>
          </div>
        </div>

        <div className="preview-questions">
          {exam.questions.map((question, index) => (
            <div key={question.id} className="preview-question">
              <div className="preview-question-header">
                <span className="preview-question-number">Question {index + 1}</span>
                <span className="preview-points">[{question.points} points]</span>
              </div>
              <QuestionRenderer question={question} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
