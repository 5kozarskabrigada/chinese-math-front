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

  function generateExamCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <span>Overview</span>
          </button>
          
          <div className="nav-section-title">Question Types</div>
          
          <button onClick={() => addQuestion("multiple-choice")} className="nav-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <span>Multiple Choice</span>
          </button>
          
          <button onClick={() => addQuestion("fill-blank")} className="nav-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="8" y1="12" x2="8" y2="12.01"/>
              <line x1="16" y1="12" x2="16" y2="12.01"/>
            </svg>
            <span>Fill in Blank</span>
          </button>
          
          <button onClick={() => addQuestion("short-answer")} className="nav-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span>Short Answer</span>
          </button>
          
          <button onClick={() => addQuestion("multi-part")} className="nav-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span>Multi-Part</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="exam-editor-main">
        {/* Top Bar */}
        <div className="exam-editor-header">
          <div className="exam-editor-top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <button onClick={props.onBack} className="back-button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <span className="exam-title-text">{exam.title || "Untitled Exam"}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setPreviewMode(!previewMode)} className="preview-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Preview
              </button>
              
              <button onClick={() => props.onSave(exam)} className="save-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save
              </button>
            </div>
          </div>
          
          {/* Control Panel */}
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              border: exam.isActive ? '2px solid #a7f3d0' : '2px solid #e5e7eb',
              background: exam.isActive ? '#d1fae5' : '#f9fafb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={exam.isActive}
                      onChange={(e) => setExam(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                    {exam.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div style={{ width: '1px', height: '24px', background: '#d1d5db' }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <input
                    type="number"
                    value={exam.timeLimitMinutes}
                    onChange={(e) => setExam(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) || 60 }))}
                    style={{
                      width: '70px',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                    min="1"
                  />
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>minutes</span>
                </div>
                
                <div style={{ width: '1px', height: '24px', background: '#d1d5db' }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Code:
                  </span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: exam.isActive ? '#065f46' : '#374151',
                    letterSpacing: '0.1em'
                  }}>
                    {exam.code}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: '#f7fafc' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {!previewMode ? (
              <>
                {/* Questions Section */}
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  padding: '24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      Questions ({exam.questions.length})
                    </h3>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Total Points: {exam.questions.reduce((sum, q) => sum + q.points, 0)}
                    </div>
                  </div>

                  {exam.questions.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '80px 20px',
                      color: '#9ca3af'
                    }}>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <p style={{ fontSize: '16px', margin: 0 }}>No questions yet. Use the sidebar to add questions.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {exam.questions.map((question, index) => (
                        <div
                          key={question.id}
                          onClick={() => setSelectedQuestionIndex(selectedQuestionIndex === index ? null : index)}
                          style={{
                            padding: '20px',
                            border: selectedQuestionIndex === index ? '2px solid #2563eb' : '1px solid #e5e7eb',
                            borderRadius: '12px',
                            background: selectedQuestionIndex === index ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '12px' }}>
                            Question {index + 1} • {question.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {question.points} pts
                          </div>
                          
                          <QuestionRenderer question={question} />

                          {selectedQuestionIndex === index && (
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                              <QuestionEditor
                                question={question}
                                onChange={(updates: Partial<Question>) => updateQuestion(index, updates)}
                              />
                              
                              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, "up"); }}
                                  disabled={index === 0}
                                  style={{
                                    padding: '8px 14px',
                                    border: '1px solid #d1d5db',
                                    background: 'white',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                                    opacity: index === 0 ? 0.5 : 1
                                  }}
                                >
                                  ↑ Move Up
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, "down"); }}
                                  disabled={index === exam.questions.length - 1}
                                  style={{
                                    padding: '8px 14px',
                                    border: '1px solid #d1d5db',
                                    background: 'white',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    cursor: index === exam.questions.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: index === exam.questions.length - 1 ? 0.5 : 1
                                  }}
                                >
                                  ↓ Move Down
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteQuestion(index); }}
                                  style={{
                                    marginLeft: 'auto',
                                    padding: '8px 14px',
                                    border: '1px solid #fca5a5',
                                    background: 'white',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#dc2626',
                                    cursor: 'pointer'
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
    <div className="question-content">
      <div className="question-text">{question.content || "(Empty question)"}</div>
      
      {question.type === "multiple-choice" && question.options && (
        <div className="mcq-options">
          {question.options.map((option, idx) => (
            <div key={idx} className="mcq-option">
              <span className="option-label">({String.fromCharCode(65 + idx)})</span>
              <span className="option-text">{option || "(Empty option)"}</span>
            </div>
          ))}
        </div>
      )}

      {question.type === "fill-blank" && (
        <div className="fill-blank-preview">
          <div className="blank-line">_________________</div>
        </div>
      )}

      {question.type === "short-answer" && (
        <div className="short-answer-preview">
          <div className="answer-box">[Answer space]</div>
        </div>
      )}
    </div>
  );
}

// Question Editor Component
function QuestionEditor({ question, onChange }: { question: Question; onChange: (updates: Partial<Question>) => void }): JSX.Element {
  return (
    <div className="question-editor-panel">
      <div className="editor-field">
        <label>Question Content</label>
        <textarea
          value={question.content}
          onChange={(e) => onChange({ content: e.target.value })}
          className="question-textarea"
          placeholder="Enter question text..."
          rows={4}
        />
      </div>

      {question.type === "multiple-choice" && (
        <div className="editor-field">
          <label>Options</label>
          {question.options?.map((option, idx) => (
            <div key={idx} className="option-editor">
              <span>({String.fromCharCode(65 + idx)})</span>
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...(question.options || [])];
                  newOptions[idx] = e.target.value;
                  onChange({ options: newOptions });
                }}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
            </div>
          ))}
          
          <div className="editor-field">
            <label>Correct Answer</label>
            <select
              value={question.correctAnswer as string}
              onChange={(e) => onChange({ correctAnswer: e.target.value })}
              className="answer-select"
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
          <label>Accepted Answer(s)</label>
          <input
            type="text"
            value={Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : question.correctAnswer}
            onChange={(e) => onChange({ correctAnswer: e.target.value.split(",").map(s => s.trim()) })}
            placeholder="Enter accepted answers (comma-separated)"
          />
        </div>
      )}

      {question.type === "short-answer" && (
        <div className="editor-field">
          <label>Model Answer</label>
          <textarea
            value={question.correctAnswer as string}
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
            className="question-textarea"
            placeholder="Enter model answer..."
            rows={3}
          />
        </div>
      )}

      <div className="editor-field">
        <label>Points</label>
        <input
          type="number"
          value={question.points}
          onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
          min="0"
          className="points-input"
        />
      </div>

      <div className="editor-field">
        <label>Explanation (Optional)</label>
        <textarea
          value={question.explanation || ""}
          onChange={(e) => onChange({ explanation: e.target.value })}
          className="question-textarea"
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
