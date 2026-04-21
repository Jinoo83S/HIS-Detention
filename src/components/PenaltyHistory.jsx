function formatDate(timestamp) {
  if (!timestamp?.toDate) return '-';
  return timestamp.toDate().toLocaleString('ko-KR');
}

export default function PenaltyHistory({ selectedStudent, records }) {
  if (!selectedStudent) {
    return <div className="empty-box">학생을 선택하면 벌점 이력이 표시됩니다.</div>;
  }

  if (!records.length) {
    return <div className="empty-box">벌점 이력이 없습니다.</div>;
  }

  return (
    <div className="history-list">
      {records.map((record) => (
        <div key={record.id} className="history-item">
          <div className="history-top">
            <strong>{record.category}</strong>
            <span>{record.points}점</span>
          </div>
          <div className="history-body">{record.reason || '사유 없음'}</div>
          <div className="history-meta">
            {record.teacherName} · {formatDate(record.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
