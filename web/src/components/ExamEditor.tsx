import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, RefreshCcw, Save, ShieldAlert, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "katex";
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
  audienceScope: "all_students" | "specific_classroom";
  violationMode: "record" | "disqualify";
  questions: Question[];
};

type ExamEditorProps = {
  examId?: string;
  auth: AuthState | null;
  onBack: () => void;
  onSave: (exam: ExamData) => void;
};

type Classroom = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  name: string;
  status: string;
  classroomId?: string;
  cameraVerified: boolean;
  phoneLinked: boolean;
};

type MathTemplate = {
  label: string;
  preview: string;
  insert: string;
};

const TOTAL_QUESTIONS = 48;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const CURSOR_TOKEN = "__CURSOR__";
const MATH_TEMPLATES: MathTemplate[] = [
  { label: "sqrt", preview: "\\sqrt{x}", insert: `$\\sqrt{${CURSOR_TOKEN}}$` },
  { label: "frac", preview: "\\frac{a}{b}", insert: `$\\frac{${CURSOR_TOKEN}}{}$` },
  { label: "power", preview: "x^{2}", insert: `$x^{${CURSOR_TOKEN}}$` },
  { label: "integral", preview: "\\int x \\, dx", insert: `$\\int ${CURSOR_TOKEN} \\, dx$` },
  { label: "sum", preview: "\\sum_{n=1}^{k}", insert: `$\\sum_{n=1}^{${CURSOR_TOKEN}}$` },
  { label: "pi", preview: "\\pi", insert: `$\\pi$` },
  { label: "theta", preview: "\\theta", insert: `$\\theta$` },
  { label: "times", preview: "a \\times b", insert: `$\\times$` },
  { label: "leq", preview: "x \\leq y", insert: `$\\leq$` },
  { label: "geq", preview: "x \\geq y", insert: `$\\geq$` }
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
    points: 1
  };
}

function createInitialExam(): ExamData {
  return {
    title: "Chinese Math Mock Exam",
    code: generateExamCode(),
    isActive: false,
    timeLimitMinutes: 60,
    classroomIds: [],
    audienceScope: "all_students",
    violationMode: "record",
    questions: Array.from({ length: TOTAL_QUESTIONS }, (_, index) => createQuestion(index))
  };
}

function normalizeExamData(source?: Partial<ExamData> & { questions?: Partial<Question>[] }): ExamData {
  const incomingQuestions = Array.isArray(source?.questions) ? source.questions : [];
  const audienceScope = source?.audienceScope === "specific_classroom" ? "specific_classroom" : "all_students";
  const classroomIds = Array.isArray(source?.classroomIds) ? source.classroomIds.filter(Boolean) : [];

  return {
    id: source?.id,
    title: source?.title?.trim() || "Chinese Math Mock Exam",
    code: source?.code || generateExamCode(),
    isActive: Boolean(source?.isActive),
    timeLimitMinutes: typeof source?.timeLimitMinutes === "number" ? source.timeLimitMinutes : 60,
    classroomIds: audienceScope === "specific_classroom" ? classroomIds.slice(0, 1) : [],
    audienceScope,
    violationMode: source?.violationMode === "disqualify" ? "disqualify" : "record",
    questions: Array.from({ length: TOTAL_QUESTIONS }, (_, index) => createQuestion(index, incomingQuestions[index]))
  };
}

function renderMath(text: string): Array<{ type: "text" | "math"; value: string }> {
  const segments: Array<{ type: "text" | "math"; value: string }> = [];
  const regex = /\$([^$]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "math", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", value: text });
  }

  return segments;
}

function MathPreview(props: { value: string; placeholder: string }): JSX.Element | null {
  if (!props.value.trim()) {
    return null;
  }

  return (
    <div className="math-render-preview">
      <span className="math-render-label">Preview</span>
      <div className="math-render-surface">
        {renderMath(props.value).map((segment, index) => {
          if (segment.type === "math") {
            return (
              <span
                key={`${segment.type}-${index}`}
                className="math-render-fragment"
                dangerouslySetInnerHTML={{
                  __html: renderToString(segment.value, {
                    displayMode: false,
                    throwOnError: false,
                    strict: "ignore"
                  })
                }}
              />
            );
          }

          return (
            <span key={`${segment.type}-${index}`} className="math-render-text">
              {segment.value || props.placeholder}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MathToken(props: { expression: string }): JSX.Element {
  return (
    <span
      className="math-token-fragment"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: renderToString(props.expression, {
          displayMode: false,
          throwOnError: false,
          strict: "ignore"
        })
      }}
    />
  );
}

export function ExamEditor(props: ExamEditorProps): JSX.Element {
  const [exam, setExam] = useState<ExamData>(() => createInitialExam());
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(Boolean(props.examId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<{ kind: "content" | "option"; optionIndex?: number }>({ kind: "content" });
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadEditorContext() {
      if (!props.auth) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const [classroomData, studentData, examData] = await Promise.all([
          apiRequest<Classroom[]>({ path: "/admin/classrooms", auth: props.auth }),
          apiRequest<Student[]>({ path: "/admin/students", auth: props.auth }),
          apiRequest<ExamData[]>({ path: "/admin/exams", auth: props.auth })
        ]);

        if (!isMounted) {
          return;
        }

        setClassrooms(classroomData);
        setStudents(studentData);

        if (props.examId) {
          const existingExam = examData.find((item) => item.id === props.examId);
          if (!existingExam) {
            throw new Error("Exam not found");
          }
          setExam(normalizeExamData(existingExam));
        } else {
          setExam((current) => {
            const normalized = normalizeExamData(current);
            if (normalized.audienceScope === "specific_classroom" && normalized.classroomIds.length === 0 && classroomData[0]) {
              return { ...normalized, classroomIds: [classroomData[0].id] };
            }
            return normalized;
          });
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Failed to load exam editor");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadEditorContext();

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

  const selectedClassroomId = exam.classroomIds[0] ?? "";
  const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedClassroomId) ?? null;
  const eligibleStudents = useMemo(() => {
    if (exam.audienceScope === "all_students") {
      return students;
    }

    return students.filter((student) => student.classroomId === selectedClassroomId);
  }, [exam.audienceScope, selectedClassroomId, students]);
  const liveEligibleCount = eligibleStudents.filter((student) => student.status === "in_progress").length;
  const flaggedEligibleCount = eligibleStudents.filter((student) => student.status === "flagged" || student.status === "terminated").length;

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

  function regenerateCode() {
    updateExam({ code: generateExamCode() });
  }

  function setAudienceScope(scope: "all_students" | "specific_classroom") {
    if (scope === "all_students") {
      updateExam({ audienceScope: scope, classroomIds: [] });
      return;
    }

    const fallbackClassroomId = selectedClassroomId || classrooms[0]?.id || "";
    updateExam({ audienceScope: scope, classroomIds: fallbackClassroomId ? [fallbackClassroomId] : [] });
  }

  function setSpecificClassroom(classroomId: string) {
    updateExam({ audienceScope: "specific_classroom", classroomIds: classroomId ? [classroomId] : [] });
  }

  function saveExam() {
    props.onSave(normalizeExamData(exam));
  }

  function insertMathTemplate(template: MathTemplate) {
    if (!currentQuestion) {
      return;
    }

    const field = activeField.kind === "content" ? promptRef.current : optionRefs.current[activeField.optionIndex ?? 0];
    if (!field) {
      return;
    }

    const selectionStart = field.selectionStart ?? field.value.length;
    const selectionEnd = field.selectionEnd ?? field.value.length;
    const currentValue = activeField.kind === "content"
      ? currentQuestion.content
      : currentQuestion.options[activeField.optionIndex ?? 0] ?? "";
    const insertValue = template.insert.replace(CURSOR_TOKEN, "");
    const cursorIndexInTemplate = template.insert.indexOf(CURSOR_TOKEN);
    const nextCursor = selectionStart + (cursorIndexInTemplate >= 0 ? cursorIndexInTemplate : insertValue.length);
    const nextValue = `${currentValue.slice(0, selectionStart)}${insertValue}${currentValue.slice(selectionEnd)}`;

    if (activeField.kind === "content") {
      updateQuestion(selectedQuestionIndex, { content: nextValue });
    } else {
      updateOption(activeField.optionIndex ?? 0, nextValue);
    }

    requestAnimationFrame(() => {
      const nextField = activeField.kind === "content" ? promptRef.current : optionRefs.current[activeField.optionIndex ?? 0];
      nextField?.focus();
      nextField?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return (
    <div className="exam-editor exam-editor-clean exam-editor-single-scroll">
      <aside className="exam-editor-sidebar exam-editor-sidebar-clean exam-editor-sidebar-compact">
        <div className="exam-editor-sidebar-header exam-editor-sidebar-header-clean">
          <p className="exam-sidebar-eyebrow">Exam Builder</p>
          <h2>Chinese Math Mock Exam</h2>
        </div>

        <div className="exam-sidebar-stats exam-sidebar-stats-compact">
          <div className="exam-sidebar-stat">
            <span>Completed</span>
            <strong>{completedCount}/{TOTAL_QUESTIONS}</strong>
          </div>
          <div className="exam-sidebar-stat">
            <span>Live now</span>
            <strong>{liveEligibleCount}</strong>
          </div>
        </div>

        <div className="exam-question-grid exam-question-grid-dense" role="navigation" aria-label="Question navigation">
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
                {index + 1}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="exam-editor-main exam-editor-main-clean exam-editor-main-single-scroll">
        <div className="exam-editor-header exam-editor-header-clean exam-editor-header-compact">
          <div className="exam-editor-top-bar exam-editor-top-bar-clean exam-editor-top-bar-compact">
            <div className="exam-editor-toolbar-left exam-editor-toolbar-left-clean">
              <button onClick={props.onBack} className="back-button">
                <ArrowLeft size={18} />
                Back
              </button>
              <div className="exam-editor-heading-block">
                <p className="exam-editor-heading-kicker">48 questions · multiple choice only</p>
                <input
                  type="text"
                  value={exam.title}
                  onChange={(event) => updateExam({ title: event.target.value })}
                  className="exam-title-input-inline"
                  placeholder="Exam title"
                />
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

          <div className="exam-editor-control-wrap exam-editor-control-wrap-clean exam-editor-control-wrap-stacked">
            <div className="editor-control-panel editor-control-panel-clean editor-settings-grid">
              <div className="editor-settings-card">
                <label className="editor-settings-label">Access</label>
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
                <div className="editor-code-row">
                  <span className="editor-code-chip editor-code-chip-clean">{exam.code}</span>
                  <button type="button" className="editor-inline-button" onClick={regenerateCode}>
                    <RefreshCcw size={14} />
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="editor-settings-card">
                <label className="editor-settings-label">Visibility</label>
                <div className="editor-segmented-control">
                  <button
                    type="button"
                    className={`editor-segment-button ${exam.audienceScope === "all_students" ? "editor-segment-button-active" : ""}`}
                    onClick={() => setAudienceScope("all_students")}
                  >
                    All students
                  </button>
                  <button
                    type="button"
                    className={`editor-segment-button ${exam.audienceScope === "specific_classroom" ? "editor-segment-button-active" : ""}`}
                    onClick={() => setAudienceScope("specific_classroom")}
                  >
                    Specific classroom
                  </button>
                </div>
                {exam.audienceScope === "specific_classroom" ? (
                  <select
                    value={selectedClassroomId}
                    onChange={(event) => setSpecificClassroom(event.target.value)}
                    className="editor-input editor-select"
                  >
                    <option value="">Select classroom</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <p className="editor-settings-hint">
                  {exam.audienceScope === "all_students" ? "Any verified student can join this exam." : `${selectedClassroom?.name || "Selected classroom"} only.`}
                </p>
              </div>

              <div className="editor-settings-card">
                <label className="editor-settings-label">Monitoring</label>
                <div className="editor-segmented-control">
                  <button
                    type="button"
                    className={`editor-segment-button ${exam.violationMode === "record" ? "editor-segment-button-active" : ""}`}
                    onClick={() => updateExam({ violationMode: "record" })}
                  >
                    Record only
                  </button>
                  <button
                    type="button"
                    className={`editor-segment-button ${exam.violationMode === "disqualify" ? "editor-segment-button-active" : ""}`}
                    onClick={() => updateExam({ violationMode: "disqualify" })}
                  >
                    Disqualify on first
                  </button>
                </div>
                <p className="editor-settings-hint">
                  {exam.violationMode === "record"
                    ? "Fullscreen exits and tab switches are logged without automatic removal."
                    : "Any recorded monitoring violation immediately terminates the student session."}
                </p>
              </div>

              <div className="editor-settings-card editor-settings-card-stats">
                <label className="editor-settings-label">Live Stats</label>
                <div className="editor-stats-row">
                  <div className="editor-mini-stat">
                    <Users size={14} />
                    <div>
                      <strong>{eligibleStudents.length}</strong>
                      <span>eligible</span>
                    </div>
                  </div>
                  <div className="editor-mini-stat">
                    <CheckCircle2 size={14} />
                    <div>
                      <strong>{liveEligibleCount}</strong>
                      <span>live now</span>
                    </div>
                  </div>
                  <div className="editor-mini-stat">
                    <ShieldAlert size={14} />
                    <div>
                      <strong>{flaggedEligibleCount}</strong>
                      <span>attention</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="exam-editor-workspace exam-editor-workspace-clean exam-editor-workspace-single-scroll">
          <div className="exam-editor-canvas exam-editor-canvas-clean">
            {loading ? (
              <section className="editor-section-card exam-loading-card">
                <p className="editor-empty-title">Loading exam...</p>
              </section>
            ) : previewMode ? (
              <ExamPreview exam={exam} onClose={() => setPreviewMode(false)} />
            ) : currentQuestion ? (
              <section className="editor-section-card exam-focus-card exam-focus-card-modern">
                {loadError ? <div className="alert-error exam-editor-inline-alert">{loadError}</div> : null}

                <div className="question-focus-header question-focus-header-modern">
                  <div>
                    <p className="question-focus-kicker">Question {String(selectedQuestionIndex + 1).padStart(2, "0")}</p>
                    <h3 className="editor-section-title">Multiple Choice</h3>
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
                      ref={promptRef}
                      value={currentQuestion.content}
                      onChange={(event) => updateQuestion(selectedQuestionIndex, { content: event.target.value })}
                      onFocus={() => setActiveField({ kind: "content" })}
                      className="editor-input editor-textarea editor-textarea-large"
                      placeholder="Write the full question here. Use the math toolbar for formulas."
                      rows={4}
                    />
                    <MathPreview value={currentQuestion.content} placeholder="Question preview" />
                  </div>

                  <div className="editor-field">
                    <label>Math Toolbar</label>
                    <div className="math-toolbar" role="toolbar" aria-label="Math input toolbar">
                      {MATH_TEMPLATES.map((template) => (
                        <button
                          key={template.label}
                          type="button"
                          className="math-toolbar-button"
                          onClick={() => insertMathTemplate(template)}
                        >
                          <MathToken expression={template.preview} />
                          <span>{template.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="editor-settings-hint">Insert expressions into the active question or option field. Math renders in the preview immediately.</p>
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
                            <div className="exam-option-input-block">
                              <input
                                ref={(element) => {
                                  optionRefs.current[index] = element;
                                }}
                                type="text"
                                value={currentQuestion.options[index]}
                                onChange={(event) => updateOption(index, event.target.value)}
                                onFocus={() => setActiveField({ kind: "option", optionIndex: index })}
                                className="editor-input"
                                placeholder={`Option ${label}`}
                              />
                              <MathPreview value={currentQuestion.options[index]} placeholder={`Option ${label} preview`} />
                            </div>
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

function QuestionRenderer(props: { question: Question }): JSX.Element {
  return (
    <div className="question-preview-block">
      <MathPreview value={props.question.content} placeholder="Question preview" />
      <div className="question-option-list">
        {props.question.options.map((option, index) => {
          const label = OPTION_LABELS[index] || "";
          const isCorrect = props.question.correctAnswer === label;

          return (
            <div key={label} className={`question-option-item ${isCorrect ? "question-option-item-correct" : ""}`}>
              <span className="question-option-badge">{label}</span>
              <div className="question-option-copy">
                <MathPreview value={option} placeholder={`Option ${label}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExamPreview(props: { exam: ExamData; onClose: () => void }): JSX.Element {
  return (
    <div className="exam-preview exam-preview-clean">
      <div className="preview-header preview-header-clean">
        <div>
          <p className="question-focus-kicker">Preview</p>
          <h2>{props.exam.title}</h2>
        </div>
        <button onClick={props.onClose} className="editor-toolbar-button">Close Preview</button>
      </div>

      <div className="preview-content preview-content-clean">
        <div className="preview-exam-header preview-exam-header-clean">
          <div className="preview-meta preview-meta-clean">
            <p>{props.exam.timeLimitMinutes} minutes</p>
            <p>{TOTAL_QUESTIONS} questions</p>
            <p>Code: {props.exam.code}</p>
            <p>{props.exam.audienceScope === "all_students" ? "All students" : "Specific classroom"}</p>
            <p>{props.exam.violationMode === "record" ? "Record only" : "Disqualify on first violation"}</p>
          </div>
        </div>

        <div className="preview-questions preview-questions-clean">
          {props.exam.questions.map((question, index) => (
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
