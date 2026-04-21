import { useEffect, useState } from 'react';

export default function PenaltyForm({ categories, selectedStudent, onSubmit }) {
  const [category, setCategory] = useState(categories[0]?.label || '');
  const [points, setPoints] = useState(categories[0]?.points || 1);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const found = categories.find((item) => item.label === category);
    if (found) {
      setPoints(found.points);
    }
  }, [categories, category]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedStudent) return;

    await onSubmit({
      category,
      points,
      reason: reason.trim(),
    });

    setReason('');
  };

  if (!selectedStudent) {
    return <div className="empty-box">왼쪽에서 학생을 선택해 주세요.</div>;
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="selected-student-box">
        <div>
          <strong>{selectedStudent.name}</strong>
          <div className="student-meta">{selectedStudent.englishName || '-'}</div>
        </div>
        <span>{selectedStudent.className || '-'}</span>
      </div>

      <label>
        <span>벌점 항목</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item.label} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>점수</span>
        <input
          type="number"
          min="1"
          value={points}
          onChange={(event) => setPoints(Number(event.target.value))}
        />
      </label>

      <label>
        <span>사유</span>
        <textarea
          rows="4"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="상세 사유를 입력하세요"
        />
      </label>

      <button type="submit" className="primary-btn">
        벌점 등록
      </button>
    </form>
  );
}
