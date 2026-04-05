import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, KeyRound, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import type { AuthState } from "../lib/auth";

type Question = {
  id: string;
  type: "multiple-choice";
  content: string;
  options: string[];
  correctAnswer: string;
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

const TOTAL_QUESTIONS = 48;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

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

function createQuestion(index: number, source?: Partial<Question>): Question {
  const sourceOptions = Array.isArray(source?.options)
    ? source.options.map((option) => (typeof option === "string" ? option : ""))
    : [];

  return {
    id: source?.id ?? `q-${index + 1}`,
    type: "multiple-choice",
    content: source?.content ?? "",
    options: Array.from({ length: 4 }, (_, optionIndex) => sourceOptions[optionIndex] ?? ""),
    correctAnswer: typeof source?.correctAnswer === "string" ? source.correctAnswer : "",
    points: typeof source?.points === "number" ? source.points : 1
  };
}

function createInitialExam(): ExamData {
  return {
    title: "Chinese Math Mock Test",
    code: generateExamCode(),
    isActive: false,
    timeLimitMinutes: 60,
    classroomIds: [],
    questions: Array.from({ length: TOTAL_QUESTIONS }, (_, index) => createQuestion(index))
  };
}

function normalizeExamData(source?: Partial<ExamData> & { questions?: Partial<Question>[] }): ExamData {
  const incomingQuestions = Array.isArray(source?.questions) ? source.questions : [];

  return {
    id: source?.id,
    title: source?.title?.trim() || "Chinese Math Mock Test",
    code: source?.code || generateExamCode(),
    isActive: Boolean(source?.isActive),
    timeLimitMinutes: typeof source?.timeLimitMinutes === "number" ? source.timeLimitMinutes : 60,
    classroomIds: Array.isArray(source?.classroomIds) ? source.classroomIds : [],
    questions: Array.from({ length: TOTAL_QUESTIONS }, (_, index) => createQuestion(index, incomingQuestions[index]))
  };
}

export function ExamEditor(props: ExamEditorProps): JSX.Element {
  const [exam, setExam] = useState<ExamData>(() => createInitialExam());
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(Boolean(props.examId));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadExam() {
      if (!props.examId || !props.auth) {
        setLoading(false);
        setLoadError(null);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const exams = await apiRequest<ExamData[]>({ path: "/admin/exams", auth: props.auth });
        const existingExam = exams.find((item) => item.id === props.examId);

        if (!existingExam) {
          throw new Error("Exam not found");
        }

        if (isMounted) {
          setExam(normalizeExamData(existingExam));
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Failed to load exam");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadExam();

    return () => {
      isMounted = false;
    };
  }, [props.auth, props.examId]);

  const currentQuestion = exam.questions[selectedQuestionIndex];
  const completedCount = useMemo(
    () =>
      exam.questions.filter(
        (question) =>
          question.content.trim() &&
          question.options.every((option) => option.trim()) &&
          question.correctAnswer
      ).length,
    [exam.questions]
  );

  function updateExam(updates: Partial<ExamData>) {
    setExam((current) => ({ ...current, ...updates }));
  }

  function updateQuestion(index: number, updates: Partial<Question>) {
    setExam((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...updates } : question
      )
    }));
  }

  function updateOption(optionIndex: number, value: string) {
    const nextOptions = [...currentQuestion.options];
    nextOptions[optionIndex] = value;
    updateQuestion(selectedQuestionIndex, { options: nextOptions });
  }

  function moveSelection(direction: "previous" | "next") {
    setSelectedQuestionIndex((current) => {
      if (direction === "previous") {
        return Math.max(0, current - 1);
      }

      return Math.min(TOTAL_QUESTIONS - 1, current + 1);
    });
  }

  function saveExam() {
    props.onSave(normalizeExamData(exam));
  }

  return (
    <div className="exam-editor exam-editor-clean">
      <aside className="exam-editor-sidebar exam-editor-sidebar-clean">
        <div className="exam-editor-sidebar-header exam-editor-sidebar-header-clean">
          <p className="exam-sidebar-eyebrow">Exam Builder</p>
          <h2>Fixed 48-question layout</h2>
          <p className="exam-sidebar-copy">A clean multiple-choice flow with one question active at a time.</p>
        </div>

        <div className="exam-sidebar-stats">
          <div className="exam-sidebar-stat">
            <span>Completed</span>
            <strong>{completedCount}/{TOTAL_QUESTIONS}</strong>
          </div>
          <div className="exam-sidebar-stat">
            <span>Current</span>
            <strong>{selectedQuestionIndex + 1}/{TOTAL_QUESTIONS}</strong>
          </div>
        </div>

        <div className="exam-question-grid" role="navigation" aria-label="Question navigation">
          {exam.questions.map((question, index) => {
            const isSelected = index === selectedQuestionIndex;
            const isComplete = Boolean(
              question.content.trim() &&
              question.options.every((option) => option.trim()) &&
              question.correctAnswer
            );

            return (
              <button
                key={question.id}
                type="button"
                className={`exam-question-chip ${isSelected ? "exam-question-chip-selected" : ""} ${isComplete ? "exam-question-chip-complete" : ""}`}
                onClick={() => setSelectedQuestionIndex(index)}
              >
                {String(index + 1).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="exam-editor-main exam-editor-main-clean">
        <div className="exam-editor-header exam-editor-header-clean">
          <div className="exam-editor-top-bar exam-editor-top-bar-clean">
            <div className="exam-editor-toolbar-left exam-editor-toolbar-left-clean">
              <button onClick={props.onBack} className="back-button">
                <ArrowLeft size={18} />
                Back
              </button>
              <div className="exam-editor-heading-block">
                <input
                  type="text"
                  value={exam.title}
                  onChange={(event) => updateExam({ title: event.target.value })}
                  className="exam-title-input-inline"
                  placeholder="Exam title"
                />
                <p className="exam-title-supporting">48 multiple-choice questions, 1 point each.</p>
              </div>
            </div>

            <div className="exam-editor-toolbar-actions">
              <button type="button" className="editor-toolbar-button" onClick={() => setPreviewMode((current) => !current)}>
                <Eye size={16} />
                {previewMode ? "Edit" : "Preview"}
              </button>
              <button type="button" className="editor-toolbar-button editor-toolbar-button-primary" onClick={saveExam}>
                <Save size={16} />
                Save Exam
              </button>
            </div>
          </div>

          <div className="exam-editor-control-wrap exam-editor-control-wrap-clean">
            <div className="editor-control-panel editor-control-panel-clean">
              <div className="editor-control-row editor-control-row-clean">
                <div className="editor-control-group editor-control-group-clean">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={exam.isActive}
                      onChange={(event) => updateExam({ isActive: event.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="editor-control-state">{exam.isActive ? "Published" : "Draft"}</span>
                </div>

                <div className="editor-control-group editor-control-group-clean">
                  <Clock3 size={16} />
                  <input
                    type="number"
                    value={exam.timeLimitMinutes}
                    onChange={(event) => updateExam({ timeLimitMinutes: parseInt(event.target.value, 10) || 60 })}
                    className="editor-time-input"
                    min="1"
                  />
                  <span className="editor-control-copy">minutes</span>
                </div>

                <div className="editor-control-group editor-control-group-clean">
                  <KeyRound size={16} />
                  <span className="editor-code-chip editor-code-chip-clean">{exam.code}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="exam-editor-workspace exam-editor-workspace-clean">
          <div className="exam-editor-canvas exam-editor-canvas-clean">
            {loading ? (
              <section className="editor-section-card exam-loading-card">
                <p className="editor-empty-title">Loading exam...</p>
              </section>
            ) : previewMode ? (
              <ExamPreview exam={exam} onClose={() => setPreviewMode(false)} />
            ) : currentQuestion ? (
              <section className="editor-section-card exam-focus-card">
                {loadError ? <div className="alert-error exam-editor-inline-alert">{loadError}</div> : null}

                <div className="question-focus-header">
                  <div>
                    <p className="question-focus-kicker">Question {String(selectedQuestionIndex + 1).padStart(2, "0")}</p>
                    <h3 className="editor-section-title">Multiple Choice</h3>
                    <p className="question-focus-copy">Keep phrasing short and direct. Each item has four options and one correct answer.</p>
                  </div>
                  <div className="question-focus-nav">
                    <button
                      type="button"
                      className="question-nav-button"
                      onClick={() => moveSelection("previous")}
                      disabled={selectedQuestionIndex === 0}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <button
                      type="button"
                      className="question-nav-button"
                      onClick={() => moveSelection("next")}
                      disabled={selectedQuestionIndex === TOTAL_QUESTIONS - 1}
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="question-editor-panel question-editor-panel-clean">
                  <div className="editor-field">
                    <label>Question Prompt</label>
                    <textarea
                      value={currentQuestion.content}
                      onChange={(event) => updateQuestion(selectedQuestionIndex, { content: event.target.value })}
                      className="editor-input editor-textarea editor-textarea-large"
                      placeholder="Write the full question here"
                      rows={4}
                    />
                  </div>

                  <div className="editor-field">
                    <label>Answer Options</label>
                    <div className="exam-option-editor-list">
                      {OPTION_LABELS.map((label, index) => {
                        const isSelected = currentQuestion.correctAnswer === label;

                        return (
                          <div key={label} className={`exam-option-editor ${isSelected ? "exam-option-editor-selected" : ""}`}>
                            <button
                              type="button"
                              className={`exam-option-select ${isSelected ? "exam-option-select-selected" : ""}`}
                              onClick={() => updateQuestion(selectedQuestionIndex, { correctAnswer: label })}
                              aria-label={`Mark option ${label} as correct`}
                            >
                              <span className="editor-option-badge">{label}</span>
                              {isSelected ? <CheckCircle2 size={16} /> : <span className="exam-option-select-dot" />}
                            </button>
                            <input
                              type="text"
                              value={currentQuestion.options[index]}
                              onChange={(event) => updateOption(index, event.target.value)}
                              className="editor-input"
                              placeholder={`Option ${label}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="question-editor-footer-clean">
                    <span>{currentQuestion.options.filter((option) => option.trim()).length}/4 options filled</span>
                    <span>{currentQuestion.correctAnswer ? `Correct answer: ${currentQuestion.correctAnswer}` : "Select the correct answer"}</span>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionRenderer({ question }: { question: Question }): JSX.Element {
  return (
    <div className="question-preview-block">
      <div className="question-preview-content">
        {question.content || <span className="question-preview-placeholder">(Empty question)</span>}
      </div>
      <div className="question-option-list">
        {question.options.map((option, index) => {
          const label = OPTION_LABELS[index] || "";
          const isCorrect = question.correctAnswer === label;

          return (
            <div key={label} className={`question-option-item ${isCorrect ? "question-option-item-correct" : ""}`}>
              <span className="question-option-badge">{label}</span>
              <span className="question-option-copy">
                {option || <span className="question-preview-placeholder">(Empty option)</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExamPreview({ exam, onClose }: { exam: ExamData; onClose: () => void }): JSX.Element {
  return (
    <div className="exam-preview exam-preview-clean">
      <div className="preview-header preview-header-clean">
        <div>
          <p className="question-focus-kicker">Preview</p>
          <h2>{exam.title}</h2>
        </div>
        <button onClick={onClose} className="editor-toolbar-button">Close Preview</button>
      </div>

      <div className="preview-content preview-content-clean">
        <div className="preview-exam-header preview-exam-header-clean">
          <div className="preview-meta preview-meta-clean">
            <p>{exam.timeLimitMinutes} minutes</p>
            <p>{TOTAL_QUESTIONS} questions</p>
            <p>Code: {exam.code}</p>
          </div>
        </div>

        <div className="preview-questions preview-questions-clean">
          {exam.questions.map((question, index) => (
            <div key={question.id} className="preview-question preview-question-clean">
              <div className="preview-question-header">
                <span className="preview-question-number">Question {index + 1}</span>
                <span className="preview-points">1 point</span>
              </div>
              <QuestionRenderer question={question} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
