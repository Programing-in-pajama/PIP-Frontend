import React, { useState } from 'react';
import SoyoMap from '../components/SoyoMap';
import Icon from '../components/Icons';

export default function LocationGate({ onAllowed }) {
  const [status, setStatus] = useState('prompt'); // prompt | loading | denied | error
  const [message, setMessage] = useState(
    '내 주변의 산책 코스를 추천하려면\n위치 정보가 필요해요.',
  );

  const requestLocation = () => {
    if (!navigator.geolocation) {
      localStorage.setItem('soyo-location-allowed', 'true');
      sessionStorage.setItem('soyo-location-allowed', 'true');
      sessionStorage.setItem('soyo-location-lat', '37.5665');
      sessionStorage.setItem('soyo-location-lng', '126.9780');
      onAllowed();
      return;
    }

    setStatus('loading');
    setMessage('현재 위치를 확인하고 있어요...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        localStorage.setItem('soyo-location-allowed', 'true');
        sessionStorage.setItem('soyo-location-allowed', 'true');
        sessionStorage.setItem('soyo-location-lat', String(position.coords.latitude));
        sessionStorage.setItem('soyo-location-lng', String(position.coords.longitude));
        onAllowed();
      },
      (error) => {
        console.warn('⚠️ [위치 확인 결과]:', error.code, error.message);
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied');
          setMessage('위치 정보 제공을 허용하지 않으면\n서비스를 이용할 수 없어요.');
        } else {
          // 데스크톱 PC 등 GPS 센서가 없거나 브라우저 타임아웃된 경우 기본 위치(서울)로 안전하게 진입
          localStorage.setItem('soyo-location-allowed', 'true');
          sessionStorage.setItem('soyo-location-allowed', 'true');
          sessionStorage.setItem('soyo-location-lat', '37.5665');
          sessionStorage.setItem('soyo-location-lng', '126.9780');
          onAllowed();
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
    );
  };

  const allowWithoutLocation = () => {
    localStorage.setItem('soyo-location-allowed', 'true');
    sessionStorage.setItem('soyo-location-allowed', 'true');
    onAllowed();
  };

  return (
    <div className="location-gate">
      <div className="location-gate-map">
        <SoyoMap />
      </div>
      <div className="location-gate-dim" />

      <section className="location-card" aria-labelledby="location-title">
        <div className="location-icon">
          <Icon name="pin" size={28} />
        </div>
        <h1 id="location-title">위치 정보 허용</h1>
        <p className={status === 'denied' || status === 'error' ? 'location-desc is-error' : 'location-desc'}>
          {message.split('\n').map((line, index) => (
            <React.Fragment key={line}>
              {index > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={requestLocation}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '위치 확인 중...' : status === 'prompt' ? '위치 허용' : '다시 허용하기'}
        </button>

        {status === 'denied' && (
          <button
            type="button"
            className="btn"
            style={{ marginTop: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '12px', borderRadius: '8px', fontSize: '14px', width: '100%', cursor: 'pointer' }}
            onClick={allowWithoutLocation}
          >
            기본 위치(서울)로 계속하기
          </button>
        )}

        {(status === 'denied' || status === 'error') && (
          <p className="location-help">
            브라우저 주소창의 자물쇠 아이콘 → 위치 권한을 ‘허용’으로 바꾼 뒤 다시 시도해 주세요.
          </p>
        )}

        <p className="location-footnote">서비스 이용을 위해 필수로 허용이 필요해요.</p>
      </section>

      {import.meta.env.DEV && (
        <button type="button" className="location-dev" onClick={allowWithoutLocation}>
          개발용 · 위치 없이 둘러보기
        </button>
      )}
    </div>
  );
}
