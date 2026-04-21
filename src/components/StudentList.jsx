export default function StudentList({ students, selectedStudent, onSelect }) {
  if (!students.length) {
    return <div className="empty-box">등록된 학생이 없습니다.</div>;
  }

  return (
    <div className="student-list">
      {students.map((student) => {
        const isSelected = selectedStudent?.id === student.id;
        return (
          <button
            key={student.id}
            type="button"
            className={`student-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(student)}
          >
            <div className="student-name">{student.name}</div>
            <div className="student-meta">{student.englishName || '-'}</div>
            <div className="student-meta">{student.className || '-'}</div>
          </button>
        );
      })}
    </div>
  );
}
