import { useEffect, useState, useMemo } from "react";
import { apiRequest } from "../lib/api";
import type { AuthState } from "../lib/auth";

type User = {
  id: string;
  name: string;
  role?: string;
  classroomId?: string;
};

type Classroom = {
  id: string;
  name: string;
};

type ClassroomDetailData = {
  classroom: Classroom;
  students: User[];
};

type ClassroomDetailProps = {
  classroomId: string;
  auth: AuthState | null;
  onBack: () => void;
  onRefresh?: () => void;
};

export function ClassroomDetail(props: ClassroomDetailProps): JSX.Element {
  const [data, setData] = useState<ClassroomDetailData | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addStudentSearch, setAddStudentSearch] = useState("");
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Alert modals
  const [alertModal, setAlertModal] = useState({ show: false, message: "" });
  const [confirmModal, setConfirmModal] = useState<{ show: false } | { show: true; message: string; onConfirm: () => void }>({ show: false });

  useEffect(() => {
    void loadData();
  }, [props.classroomId]);

  async function loadData() {
    try {
      setLoading(true);
      const [classroomData, usersData] = await Promise.all([
        apiRequest<ClassroomDetailData>({ path: `/admin/classrooms/${props.classroomId}`, auth: props.auth }),
        apiRequest<User[]>({ path: "/admin/users", auth: props.auth })
      ]);
      setData(classroomData);
      // Filter to only include users that are students (have id starting with stu- or have role student)
      setAllUsers(usersData.filter(u => {
        const isStudent = u.id.includes("stu-");
        const hasStudentRole = u.role === "student";
        return isStudent || hasStudentRole;
      }));
    } catch (error) {
      setAlertModal({ show: true, message: "Failed to load classroom details" });
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.students;
    const query = searchQuery.toLowerCase();
    return data.students.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
  }, [data?.students, searchQuery]);

  const availableStudents = useMemo(() => {
    if (!data) return [];
    const enrolledIds = new Set(data.students.map(s => s.id));
    const available = allUsers.filter(u => !enrolledIds.has(u.id));
    if (!addStudentSearch) return available;
    const query = addStudentSearch.toLowerCase();
    return available.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
  }, [allUsers, data?.students, addStudentSearch]);

  const selectedStudentRecord = useMemo(
    () => allUsers.find((student) => student.id === selectedStudentToAdd) ?? null,
    [allUsers, selectedStudentToAdd]
  );

  async function handleAddStudent() {
    if (!selectedStudentToAdd) {
      setAlertModal({ show: true, message: "Please select a student" });
      return;
    }

    try {
      await apiRequest({
        path: `/admin/classrooms/${props.classroomId}/students`,
        method: "POST",
        body: { studentId: selectedStudentToAdd },
        auth: props.auth
      });
      
      setAlertModal({ show: true, message: "Student added successfully!" });
      setIsAddModalOpen(false);
      setSelectedStudentToAdd("");
      setAddStudentSearch("");
      await loadData();
      props.onRefresh?.();
    } catch (error) {
      setAlertModal({ show: true, message: "Failed to add student" });
    }
  }

  function confirmRemoveStudent(studentId: string, studentName: string) {
    setConfirmModal({
      show: true,
      message: `Remove ${studentName} from this classroom?`,
      onConfirm: () => void removeStudent(studentId)
    });
  }

  async function removeStudent(studentId: string) {
    try {
      await apiRequest({
        path: `/admin/classrooms/${props.classroomId}/students/${studentId}`,
        method: "DELETE",
        auth: props.auth
      });
      
      setConfirmModal({ show: false });
      setAlertModal({ show: true, message: "Student removed successfully!" });
      await loadData();
      props.onRefresh?.();
    } catch (error) {
      setConfirmModal({ show: false });
      setAlertModal({ show: true, message: "Failed to remove student" });
    }
  }

  if (loading) {
    return (
      <div className="classroom-detail-container">
        <div className="loading-spinner">Loading classroom details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="classroom-detail-container">
        <div className="error-message">Failed to load classroom</div>
      </div>
    );
  }

  return (
    <div className="classroom-detail-container">
      {/* Alert Modal */}
      {alertModal.show && (
        <div className="modal-overlay" onClick={() => setAlertModal({ show: false, message: "" })}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="alert-modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 16h-2v-6h2m0 10h-2v-2h2m-1-18C6.48 0 2 4.48 2 10s4.48 10 10 10 10-4.48 10-10S17.52 0 12 0z" fill="currentColor"/>
                </svg>
              </div>
              <p className="modal-message">{alertModal.message}</p>
              <button className="confirm-button" onClick={() => setAlertModal({ show: false, message: "" })}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ show: false })}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="confirm-modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
                </svg>
              </div>
              <p className="modal-message">{confirmModal.message}</p>
              <div className="modal-actions">
                <button className="cancel-button-modal" onClick={() => setConfirmModal({ show: false })}>
                  Cancel
                </button>
                <button className="confirm-button" onClick={confirmModal.onConfirm}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content classroom-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Add Student to Classroom</h3>
                <p className="classroom-picker-subtitle">Search the roster and choose one student to place in this classroom.</p>
              </div>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body classroom-picker-body">
              <div className="form-group classroom-picker-search-group">
                <label>Search Students</label>
                <input
                  type="text"
                  value={addStudentSearch}
                  onChange={(e) => setAddStudentSearch(e.target.value)}
                  placeholder="Search by student name or username"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="classroom-picker-results-header">
                <span className="classroom-picker-results-label">Available students</span>
                <span className="classroom-picker-results-count">{availableStudents.length}</span>
              </div>
              <div className="classroom-picker-results">
                {availableStudents.length === 0 && (
                  <p className="hint-text classroom-picker-empty">
                    {addStudentSearch ? "No matching students found" : "All students are already enrolled"}
                  </p>
                )}
                {availableStudents.map((student) => {
                  const isSelected = selectedStudentToAdd === student.id;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      className={`classroom-picker-item ${isSelected ? "classroom-picker-item-selected" : ""}`}
                      onClick={() => setSelectedStudentToAdd(student.id)}
                    >
                      <div className="classroom-picker-item-copy">
                        <span className="classroom-picker-name">{student.name}</span>
                        <span className="classroom-picker-id">{student.id}</span>
                      </div>
                      <span className="classroom-picker-state">{isSelected ? "Selected" : "Choose"}</span>
                    </button>
                  );
                })}
              </div>
              <div className="classroom-picker-selection-bar">
                <span className="classroom-picker-selection-label">Current selection</span>
                <strong>{selectedStudentRecord ? selectedStudentRecord.name : "No student selected"}</strong>
                <span>{selectedStudentRecord ? selectedStudentRecord.id : "Choose a student from the list above."}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button-modal" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
              <button className="confirm-button" onClick={() => void handleAddStudent()}>
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="classroom-detail-header">
        <button className="back-button" onClick={props.onBack}>
          ← Back to Classrooms
        </button>
        <h1 className="classroom-title">{data.classroom.name}</h1>
        <p className="classroom-subtitle">{data.students.length} students enrolled</p>
      </div>

      {/* Students Section */}
      <div className="classroom-detail-card">
        <div className="card-header">
          <h2 className="section-title">Students</h2>
          <div className="card-header-actions">
            {/* Search */}
            <div className="search-box-inline">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="search-input-inline"
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery("")}>
                  ×
                </button>
              )}
            </div>
            <button className="add-student-button" onClick={() => setIsAddModalOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Student
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="table-container">
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm6 11v-6m3 3h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="empty-message">
                {searchQuery ? "No students match your search" : "No students enrolled yet. Click 'Add Student' to get started."}
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="student-name">{student.name}</td>
                    <td>
                      <div className="action-cell" style={{ justifyContent: "flex-end" }}>
                        <button
                          onClick={() => confirmRemoveStudent(student.id, student.name)}
                          className="action-button"
                          style={{ background: "#ef4444" }}
                          title="Remove from classroom"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
