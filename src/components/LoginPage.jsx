export default function LoginPage({ onLogin, message }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>HIS Detention</h1>
        <p>Google 계정으로 로그인해 주세요.</p>
        <button className="primary-btn" onClick={onLogin}>
          Google 로그인
        </button>
        <div className="help-box">
          <strong>먼저 확인할 것</strong>
          <p>Firebase Authentication에서 Google 로그인 제공업체를 켜야 합니다.</p>
        </div>
        {message ? <div className="message-box">{message}</div> : null}
      </div>
    </div>
  );
}
