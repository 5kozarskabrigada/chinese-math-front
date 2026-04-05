import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Italic, List, ListOrdered, RefreshCcw, Save, ShieldAlert, Underline, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import type { AuthState } from "../lib/auth";

type FieldAlignment = "left" | "center" | "right";

type Question = {
  id: string;
  type: "multiple-choice";
  content: string;
  contentAlignment: FieldAlignment;
  options: string[];
  optionAlignments: FieldAlignment[];
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
  insert: string;
};

type MathGroup = {
  label: string;
  items: MathTemplate[];
};

const TOTAL_QUESTIONS = 48;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const PRIMARY_MATH_TEMPLATES: MathTemplate[] = [
  { label: "½", insert: "()/()" },
  { label: "√", insert: "√()" },
  { label: "∛", insert: "∛()" },
  { label: "xʸ", insert: "^()" },
  { label: "xᵧ", insert: "_()" },
  { label: "|x|", insert: "| |" }
];

const SECONDARY_MATH_GROUPS: MathGroup[] = [
  {
    label: "Trig",
    items: [
      { label: "sin", insert: "sin()" },
      { label: "cos", insert: "cos()" },
      { label: "tan", insert: "tan()" }
    ]
  },
  {
    label: "Rel",
    items: [
      { label: "≤", insert: "≤" },
      { label: "≥", insert: "≥" },
      { label: "≠", insert: "≠" },
      { label: "≈", insert: "≈" }
    ]
  },
  {
    label: "Sym",
    items: [
      { label: "π", insert: "π" },
      { label: "θ", insert: "θ" },
      { label: "∞", insert: "∞" },
      { label: "°", insert: "°" },
      { label: "°C", insert: "°C" },
      { label: "±", insert: "±" },
      { label: "×", insert: "×" },
      { label: "÷", insert: "÷" }
    ]
  },
  {
    label: "Geo",
    items: [
      { label: "∠", insert: "∠" },
      { label: "△", insert: "△" },
      { label: "∥", insert: "∥" },
      { label: "⊥", insert: "⊥" },
      { label: "→", insert: "→" }
    ]
  }
];

const ALIGNMENT_OPTIONS: Array<{ value: FieldAlignment; label: string; icon: typeof AlignLeft }> = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight }
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
  const optionAlignments = Array.isArray(source?.optionAlignments)
    ? source.optionAlignments.map((alignment) => (alignment === "center" || alignment === "right" ? alignment : "left"))
    : [];

  return {
    id: source?.id ?? `q-${index + 1}`,
    type: "multiple-choice",
    content: source?.content ?? "",
    contentAlignment: source?.contentAlignment === "center" || source?.contentAlignment === "right" ? source.contentAlignment : "left",
    options: Array.from({ length: 4 }, (_, optionIndex) => sourceOptions[optionIndex] ?? ""),
    optionAlignments: Array.from({ length: 4 }, (_, optionIndex) => optionAlignments[optionIndex] ?? "left"),
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

function stripEditorContent(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function ExamEditor(props: ExamEditorProps): JSX.Element {
  const [exam, setExam] = useState<ExamData>(() => createInitialExam());
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(Boolean(props.examId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<{ kind: "content" | "option"; optionIndex?: number }>({ kind: "content" });
  const promptRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

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
          stripEditorContent(question.content) &&
          question.options.every((option) => stripEditorContent(option)) &&
          question.correctAnswer
      ).length,
    [exam.questions]
  );

  useEffect(() => {
    if (promptRef.current && promptRef.current.innerHTML !== currentQuestion.content) {
      promptRef.current.innerHTML = currentQuestion.content;
    }

    if (promptRef.current) {
      promptRef.current.style.textAlign = currentQuestion.contentAlignment;
    }

    optionRefs.current.forEach((element, index) => {
      if (!element) {
        return;
      }

      const nextValue = currentQuestion.options[index] ?? "";
      if (element.innerHTML !== nextValue) {
        element.innerHTML = nextValue;
      }
      element.style.textAlign = currentQuestion.optionAlignments[index] ?? "left";
    });
  }, [currentQuestion]);

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

  function getActiveAlignment(): FieldAlignment {
    if (activeField.kind === "content") {
      return currentQuestion.contentAlignment;
    }

    return currentQuestion.optionAlignments[activeField.optionIndex ?? 0] ?? "left";
  }

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

  function getActiveEditableElement(): HTMLDivElement | null {
    if (activeField.kind === "content") {
      return promptRef.current;
    }

    return optionRefs.current[activeField.optionIndex ?? 0] ?? null;
  }

  function syncActiveFieldFromDom() {
    const element = getActiveEditableElement();
    if (!element) {
      return;
    }

    const html = element.innerHTML === "<br>" ? "" : element.innerHTML;
    if (activeField.kind === "content") {
      updateQuestion(selectedQuestionIndex, { content: html });
      return;
    }

    updateOption(activeField.optionIndex ?? 0, html);
  }

  function updateOptionAlignment(optionIndex: number, alignment: FieldAlignment) {
    const nextAlignments = [...currentQuestion.optionAlignments];
    nextAlignments[optionIndex] = alignment;
    updateQuestion(selectedQuestionIndex, { optionAlignments: nextAlignments });
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

  function setActiveAlignment(alignment: FieldAlignment) {
    const element = getActiveEditableElement();
    if (element) {
      element.style.textAlign = alignment;
    }

    if (activeField.kind === "content") {
      updateQuestion(selectedQuestionIndex, { contentAlignment: alignment });
      return;
    }

    updateOptionAlignment(activeField.optionIndex ?? 0, alignment);
  }

  function applyEditorCommand(command: string, value?: string) {
    const element = getActiveEditableElement();
    if (!element) {
      return;
    }

    element.focus();
    document.execCommand(command, false, value);
    syncActiveFieldFromDom();
  }

  function insertMathTemplate(template: MathTemplate) {
    if (!currentQuestion) {
      return;
    }

    const field = getActiveEditableElement();
    if (!field) {
      return;
    }

    field.focus();
    document.execCommand("insertText", false, template.insert);
    syncActiveFieldFromDom();
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
            <span>Code</span>
            <strong>{exam.code}</strong>
          </div>
        </div>

        <div className="exam-question-grid exam-question-grid-dense" role="navigation" aria-label="Question navigation">
          {exam.questions.map((question, index) => {
            const isSelected = index === selectedQuestionIndex;
            const isComplete = Boolean(
              stripEditorContent(question.content) &&
              question.options.every((option) => stripEditorContent(option)) &&
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
                <div className="editor-access-stats">
                  <div className="editor-access-stat">
                    <Users size={12} />
                    <strong>{eligibleStudents.length}</strong>
                    <span>eligible</span>
                  </div>
                  <div className="editor-access-stat">
                    <CheckCircle2 size={12} />
                    <strong>{liveEligibleCount}</strong>
                    <span>live</span>
                  </div>
                  <div className="editor-access-stat">
                    <ShieldAlert size={12} />
                    <strong>{flaggedEligibleCount}</strong>
                    <span>alerts</span>
                  </div>
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

            </div>
          </div>
        </div>

        <div className="exam-editor-workspace exam-editor-workspace-clean exam-editor-workspace-single-scroll">
          <div className="exam-editor-canvas exam-editor-canvas-clean">
            {loading ? (
              <section className="editor-section-card exam-loading-card">
                <p className="editor-empty-title">Loading exam...</p>
              </section>
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
                  <div className="sat-toolbar-shell">
                    <div className="sat-toolbar-row">
                      <div className="sat-toolbar-group">
                        <button type="button" className="sat-toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand("bold")} title="Bold">
                          <Bold size={14} />
                        </button>
                        <button type="button" className="sat-toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand("italic")} title="Italic">
                          <Italic size={14} />
                        </button>
                        <button type="button" className="sat-toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand("underline")} title="Underline">
                          <Underline size={14} />
                        </button>
                      </div>

                      <div className="sat-toolbar-group">
                        <button type="button" className="sat-toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand("insertUnorderedList")} title="Bullet list">
                          <List size={14} />
                        </button>
                        <button type="button" className="sat-toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyEditorCommand("insertOrderedList")} title="Numbered list">
                          <ListOrdered size={14} />
                        </button>
                      </div>

                      <div className="sat-toolbar-group">
                        {ALIGNMENT_OPTIONS.map((alignmentOption) => {
                          const AlignmentIcon = alignmentOption.icon;

                          return (
                            <button
                              key={alignmentOption.value}
                              type="button"
                              className={`sat-toolbar-button ${getActiveAlignment() === alignmentOption.value ? "sat-toolbar-button-active" : ""}`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => setActiveAlignment(alignmentOption.value)}
                              title={alignmentOption.label}
                            >
                              <AlignmentIcon size={14} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="sat-toolbar-group sat-toolbar-group-math-entry">
                        <button type="button" className="sat-toolbar-insert-math" onMouseDown={(event) => event.preventDefault()} onClick={() => insertMathTemplate({ label: "Insert Math", insert: "()" })}>
                          <span>f(x)</span>
                          Insert Math
                        </button>
                      </div>

                      <div className="sat-toolbar-group">
                        {PRIMARY_MATH_TEMPLATES.map((template) => (
                          <button
                            key={template.label}
                            type="button"
                            className="sat-toolbar-button sat-toolbar-button-math"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => insertMathTemplate(template)}
                            title={template.label}
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sat-toolbar-row sat-toolbar-row-secondary">
                      {SECONDARY_MATH_GROUPS.map((group) => (
                        <div key={group.label} className="sat-toolbar-group sat-toolbar-group-labeled">
                          <span className="sat-toolbar-group-label">{group.label}</span>
                          {group.items.map((template) => (
                            <button
                              key={`${group.label}-${template.label}`}
                              type="button"
                              className="sat-toolbar-button sat-toolbar-button-math sat-toolbar-button-pill"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => insertMathTemplate(template)}
                              title={template.label}
                            >
                              {template.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="editor-field">
                    <label>Question Prompt</label>
                    <div
                      ref={promptRef}
                      onFocus={() => setActiveField({ kind: "content" })}
                      onInput={syncActiveFieldFromDom}
                      contentEditable
                      suppressContentEditableWarning
                      className="sat-rich-editor-surface sat-rich-editor-surface-question"
                      data-placeholder="Write the full question here."
                    />
                    <p className="editor-settings-hint">SAT-style rich question field. Formatting and symbol buttons apply to the currently focused editor.</p>
                  </div>

                  <div className="editor-field">
                    <label>Answer Options</label>
                    <div className="editor-field-supporting">
                      <span>{currentQuestion.options.filter((option) => stripEditorContent(option)).length}/4 options filled</span>
                      <span>{currentQuestion.correctAnswer ? `Correct answer: ${currentQuestion.correctAnswer}` : "Select the correct answer"}</span>
                    </div>
                    <div className="exam-option-editor-grid">
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
                              <div
                                ref={(element) => {
                                  optionRefs.current[index] = element;
                                }}
                                onFocus={() => setActiveField({ kind: "option", optionIndex: index })}
                                onInput={syncActiveFieldFromDom}
                                contentEditable
                                suppressContentEditableWarning
                                className="sat-rich-editor-surface sat-rich-editor-surface-option"
                                data-placeholder={`Option ${label}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
