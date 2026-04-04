import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Clock3, Eye, KeyRound, LayoutGrid, PenSquare, Rows3, Save, Trash2 } from "lucide-react";
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
        <div className="exam-editor-workspace">
          <div className="exam-editor-canvas">
            {!previewMode ? (
              <>
                {/* Questions Section */}
                <section className="editor-section-card">
                  <div className="editor-section-header">
                    <h3 className="editor-section-title">
                      Questions ({exam.questions.length})
                    </h3>
                    <div className="editor-summary-chip">
                      Total: {exam.questions.reduce((sum, q) => sum + q.points, 0)} pts
                    </div>
                  </div>

                  {exam.questions.length === 0 ? (
                    <div className="editor-empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="editor-empty-icon">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <p className="editor-empty-title">No questions yet</p>
                      <p className="editor-empty-copy">Use the sidebar to add questions and start structuring the exam.</p>
                    </div>
                  ) : (
                    <div className="question-stack">
                      {exam.questions.map((question, index) => (
                        <div
                          key={question.id}
                          onClick={() => setSelectedQuestionIndex(selectedQuestionIndex === index ? null : index)}
                          className={`question-list-card ${selectedQuestionIndex === index ? 'question-list-card-selected' : ''}`}
                        >
                          <div className="question-list-meta">
                            <span className={`question-number-pill ${selectedQuestionIndex === index ? 'question-number-pill-selected' : ''}`}>
                              Q{index + 1}
                            </span>
                            <span className="question-type-copy">{question.type.replace('-', ' ').replace(/\b\w/g, (value) => value.toUpperCase())}</span>
                            <span className={`question-points-pill ${selectedQuestionIndex === index ? 'question-points-pill-selected' : ''}`}>
                              {question.points} pts
                            </span>
                          </div>
                          
                          <QuestionRenderer question={question} />

                          {selectedQuestionIndex === index && (
                            <div className="question-editor-wrap" onClick={(e) => e.stopPropagation()}>
                              <QuestionEditor
                                question={question}
                                onChange={(updates: Partial<Question>) => updateQuestion(index, updates)}
                              />
                              
                              <div className="question-action-row">
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, "up"); }}
                                  disabled={index === 0}
                                  className="question-action-button"
                                >
                                  <ChevronUp size={16} />
                                  Move Up
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveQuestion(index, "down"); }}
                                  disabled={index === exam.questions.length - 1}
                                  className="question-action-button"
                                >
                                  <ChevronDown size={16} />
                                  Move Down
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteQuestion(index); }}
                                  className="question-action-button question-action-button-danger"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
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
    <div className="question-preview-block">
      <div className="question-preview-content">
        {question.content || <span className="question-preview-placeholder">(Empty question)</span>}
      </div>
      
      {question.type === "multiple-choice" && question.options && (
        <div className="question-option-list">
          {question.options.map((option, idx) => (
            <div key={idx} className="question-option-item">
              <span className="question-option-badge">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="question-option-copy">
                {option || <span className="question-preview-placeholder">(Empty option)</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {question.type === "fill-blank" && (
        <div className="question-blank-wrap">
          <div className="question-blank-line">
            _________________
          </div>
        </div>
      )}

      {question.type === "short-answer" && (
        <div className="question-answer-space-wrap">
          <div className="question-answer-space">
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
        <label>Question Content</label>
        <textarea
          value={question.content}
          onChange={(e) => onChange({ content: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="editor-input editor-textarea editor-textarea-large"
          placeholder="Enter question text..."
          rows={4}
        />
      </div>

      {question.type === "multiple-choice" && (
        <div className="editor-field">
          <label>Options</label>
          {question.options?.map((option, idx) => (
            <div key={idx} className="editor-option-row">
              <span className="editor-option-badge">
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
                className="editor-input"
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
            </div>
          ))}
          
          <div className="editor-field editor-field-spaced">
            <label>Correct Answer</label>
            <select
              value={question.correctAnswer as string}
              onChange={(e) => onChange({ correctAnswer: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              className="editor-input editor-select"
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
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            className="editor-input"
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
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            className="editor-input editor-textarea"
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
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          min="0"
          className="editor-input editor-points-input"
        />
      </div>

      <div className="editor-field">
        <label>Explanation (Optional)</label>
        <textarea
          value={question.explanation || ""}
          onChange={(e) => onChange({ explanation: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="editor-input editor-textarea"
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
