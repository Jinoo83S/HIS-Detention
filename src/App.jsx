import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import StudentList from './components/StudentList';
import StudentUpload from './components/StudentUpload';
import PenaltyForm from './components/PenaltyForm';
import PenaltyHistory from './components/PenaltyHistory';

const penaltyCategories = [
  { label: '지각', points: 1 },
  { label: '복장 불량', points: 1 },
  { label: '수업 방해', points: 2 },
  { label: '무단 결석', points: 3 },
  { label: '기타', points: 1 },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextStudents = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setStudents(nextStudents);

      if (selectedStudent) {
        const updatedSelected = nextStudents.find((item) => item.id === selectedStudent.id);
        if (!updatedSelected) {
          setSelectedStudent(null);
        } else {
          setSelectedStudent(updatedSelected);
        }
      }
    });
    return unsubscribe;
  }, [selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) {
      setRecords([]);
      return;
    }

    const q = query(
      collection(db, 'penaltyRecords'),
      where('studentId', '==', selectedStudent.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextRecords = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setRecords(nextRecords);
    });

    return unsubscribe;
  }, [selectedStudent]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return students;

    return students.filter((student) => {
      const name = String(student.name || '').toLowerCase();
      const englishName = String(student.englishName || '').toLowerCase();
      const className = String(student.className || '').toLowerCase();
      return name.includes(keyword) || englishName.includes(keyword) || className.includes(keyword);
    });
  }, [search, students]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setMessage('로그인되었습니다.');
    } catch (error) {
      console.error(error);
      setMessage('로그인 중 오류가 발생했습니다. Firebase Authentication에서 Google 로그인을 활성화했는지 확인해 주세요.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedStudent(null);
      setMessage('로그아웃되었습니다.');
    } catch (error) {
      console.error(error);
      setMessage('로그아웃 중 오류가 발생했습니다.');
    }
  };

  const handleAddPenalty = async ({ category, points, reason }) => {
    if (!user || !selectedStudent) return;

    try {
      await addDoc(collection(db, 'penaltyRecords'), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        englishName: selectedStudent.englishName || '',
        className: selectedStudent.className || '',
        teacherUid: user.uid,
        teacherName: user.displayName || user.email || '교사',
        category,
        points: Number(points),
        reason,
        createdAt: serverTimestamp(),
      });
      setMessage(`${selectedStudent.name} 학생에게 벌점이 등록되었습니다.`);
    } catch (error) {
      console.error(error);
      setMessage('벌점 등록 중 오류가 발생했습니다. Firestore 규칙과 색인 설정을 확인해 주세요.');
    }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} message={message} />;
  }

  return (
    <div className="app-shell">
      <Header user={user} onLogout={handleLogout} />

      <main className="main-layout">
        <section className="left-panel">
          <div className="panel-card">
            <div className="panel-title-row">
              <h2>학생 목록</h2>
              <input
                className="search-input"
                placeholder="이름 / 영문 이름 / 학반 검색"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <StudentList
              students={filteredStudents}
              selectedStudent={selectedStudent}
              onSelect={setSelectedStudent}
            />
          </div>
        </section>

        <section className="right-panel">
          <StudentUpload onUploaded={(text) => setMessage(text)} />

          <div className="panel-card">
            <h2>벌점 입력</h2>
            <PenaltyForm
              categories={penaltyCategories}
              selectedStudent={selectedStudent}
              onSubmit={handleAddPenalty}
            />
          </div>

          <div className="panel-card">
            <h2>벌점 이력</h2>
            <PenaltyHistory selectedStudent={selectedStudent} records={records} />
          </div>

          {message ? <div className="message-box global-message">{message}</div> : null}
        </section>
      </main>
    </div>
  );
}
