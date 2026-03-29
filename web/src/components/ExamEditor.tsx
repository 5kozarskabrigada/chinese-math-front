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
      {/* Top Control Bar */}
      <div className="exam-editor-header">
        <button onClick={props.onBack} className="back-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>

        <div className="exam-header-controls">
          <input
            type="text"
            value={exam.title}
            onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))}
            className="exam-title-input"
            placeholder="Exam Title"
          />
          <div className="exam-code-display">Code: {exam.code}</div>
          
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={exam.isActive}
              onChange={(e) => setExam(prev => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">{exam.isActive ? 'Active' : 'Inactive'}</span>
          </label>

          <div className="timer-control">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <input
              type="number"
              value={exam.timeLimitMinutes}
              onChange={(e) => setExam(prev => ({ ...prev, timeLimitMinutes: parseInt(e.target.value) || 60 }))}
              className="timer-input"
              min="1"
            />
            <span>min</span>
          </div>

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

      {/* Main Content Area */}
      {!previewMode ? (
        <div className="exam-editor-content">
          {/* Question Builder Workspace */}
          <div className="question-workspace">
            <div className="workspace-canvas">
              <div className="exam-canvas-header">
                <h2>{exam.title}</h2>
                <div className="exam-canvas-meta">
                  <span>Time Limit: {exam.timeLimitMinutes} minutes</span>
                  <span>Total Points: {exam.questions.reduce((sum, q) => sum + q.points, 0)}</span>
                </div>
              </div>

              {exam.questions.length === 0 ? (
                <div className="canvas-empty-state">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <p>Click a question type to add your first question</p>
                </div>
              ) : (
                <div className="questions-list">
                  {exam.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className={`question-block ${selectedQuestionIndex === index ? 'selected' : ''}`}
                      onClick={() => setSelectedQuestionIndex(index)}
                    >
                      <div className="question-number">Question {index + 1}</div>
                      
                      <QuestionRenderer question={question} />

                      <div className="question-actions">
                        <button onClick={() => moveQuestion(index, "up")} disabled={index === 0}>↑</button>
                        <button onClick={() => moveQuestion(index, "down")} disabled={index === exam.questions.length - 1}>↓</button>
                        <button onClick={() => deleteQuestion(index)} className="delete-btn">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side Panel */}
          <div className="properties-panel">
            <div className="panel-section">
              <h3 className="panel-heading">Add Question</h3>
              <div className="question-type-buttons">
                <button onClick={() => addQuestion("multiple-choice")} className="type-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                  Multiple Choice
                </button>
                <button onClick={() => addQuestion("fill-blank")} className="type-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="12" x2="16" y2="12"/>
                    <line x1="8" y1="12" x2="8" y2="12.01"/>
                    <line x1="16" y1="12" x2="16" y2="12.01"/>
                  </svg>
                  Fill in Blank
                </button>
                <button onClick={() => addQuestion("short-answer")} className="type-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  Short Answer
                </button>
                <button onClick={() => addQuestion("multi-part")} className="type-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  Multi-Part
                </button>
              </div>
            </div>

            {selectedQuestionIndex !== null && (
              <div className="panel-section">
                <h3 className="panel-heading">Question Properties</h3>
                <QuestionEditor
                  question={exam.questions[selectedQuestionIndex]}
                  onChange={(updates) => updateQuestion(selectedQuestionIndex, updates)}
                />
              </div>
            )}

            <div className="panel-section">
              <h3 className="panel-heading">Formatting Tools</h3>
              <div className="formatting-toolbar">
                <button title="Bold" className="format-btn"><strong>B</strong></button>
                <button title="Italic" className="format-btn"><em>I</em></button>
                <button title="Underline" className="format-btn"><u>U</u></button>
                <div className="toolbar-divider"></div>
                <button title="Insert Equation" className="format-btn">∑</button>
                <button title="Insert Symbol" className="format-btn">π</button>
              </div>
              
              <div className="symbol-panel">
                <h4>Common Symbols</h4>
                <div className="symbol-grid">
                  {['π', '∞', '≤', '≥', '≠', '±', '÷', '×', '√', '∑', '∫', 'θ'].map(symbol => (
                    <button key={symbol} className="symbol-btn">{symbol}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ExamPreview exam={exam} onClose={() => setPreviewMode(false)} />
      )}
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
