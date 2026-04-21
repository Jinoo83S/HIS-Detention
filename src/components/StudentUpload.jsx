import { useState } from 'react';
import Papa from 'papaparse';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function StudentUpload({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [localMessage, setLocalMessage] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setLocalMessage('CSV 파일을 읽는 중입니다...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          let successCount = 0;

          for (const row of rows) {
            const name = String(row.name || '').trim();
            const englishName = String(row.englishName || '').trim();
            const className = String(row.className || '').trim();

            if (!name) continue;

            await setDoc(doc(db, 'students', name), {
              name,
              englishName,
              className,
            });
            successCount += 1;
          }

          const doneMessage = `${successCount}명의 학생 정보를 업로드했습니다.`;
          setLocalMessage(doneMessage);
          onUploaded?.(doneMessage);
        } catch (error) {
          console.error(error);
          const errorMessage = '업로드 중 오류가 발생했습니다. Firestore 규칙을 확인해 주세요.';
          setLocalMessage(errorMessage);
          onUploaded?.(errorMessage);
        } finally {
          setUploading(false);
          event.target.value = '';
        }
      },
      error: (error) => {
        console.error(error);
        setUploading(false);
        setLocalMessage('CSV 읽기 중 오류가 발생했습니다. UTF-8 CSV 파일인지 확인해 주세요.');
      },
    });
  };

  return (
    <div className="panel-card">
      <h2>학생 명단 일괄 업로드</h2>
      <p className="section-description">
        CSV 첫 줄은 반드시 <code>name,englishName,className</code> 형식이어야 합니다.
      </p>
      <input type="file" accept=".csv" onChange={handleFileChange} disabled={uploading} />
      <div className="help-box compact">
        <strong>예시</strong>
        <p>김민수,Minsu Kim,10A</p>
        <p>박서연,Seoyeon Park,10A</p>
      </div>
      {localMessage ? <div className="message-box">{localMessage}</div> : null}
    </div>
  );
}
