export default function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div>
        <h1>HIS Detention</h1>
        <p>교사용 벌점 관리 시스템</p>
      </div>

      <div className="header-user">
        <span>{user.displayName || user.email}</span>
        <button className="danger-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
