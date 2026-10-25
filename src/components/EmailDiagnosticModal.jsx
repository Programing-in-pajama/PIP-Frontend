import React, { useEffect, useState } from 'react';
import { getEmailLogs } from '../api/auth';
import Icon from './Icons';

export default function EmailDiagnosticModal({ isOpen, onClose, onSelectCode, targetEmail = '' }) {
  const [logs, setLogs] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getEmailLogs();
      if (res?.success) {
        setLogs(res.logs || []);
        setSystemStatus(res.systemStatus || null);
      }
    } catch (err) {
      console.warn('⚠️ [Email Logs] 조회 오류:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (code, id) => {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    if (onSelectCode) {
      onSelectCode(code);
    }
  };

  const openWebDashboard = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    window.open(`${backendUrl}/api/auth/email/logs-view`, '_blank');
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div
        className="modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🌿</span> 이메일 & 인증번호 진단 로그
            </h3>
            <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">발송된 인증번호 및 실패 원인을 실시간으로 확인합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* 상태 요약 바 */}
        <div style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11.5px' }}>
          <span style={{ color: '#475569', fontWeight: 600 }}>시스템 상태:</span>
          <span style={{
            padding: '2px 8px',
            borderRadius: '12px',
            background: systemStatus?.smtpConfigured ? '#dcfce7' : '#fee2e2',
            color: systemStatus?.smtpConfigured ? '#166534' : '#991b1b',
            fontWeight: 600
          }}>
            SMTP 메일서버: {systemStatus?.smtpConfigured ? '정상 연결' : '미설정 (로컬 코드 자동발급)'}
          </span>
          <span style={{
            padding: '2px 8px',
            borderRadius: '12px',
            background: systemStatus?.supabaseConfigured ? '#dcfce7' : '#f1f5f9',
            color: systemStatus?.supabaseConfigured ? '#166534' : '#64748b',
            fontWeight: 600
          }}>
            Supabase OTP: {systemStatus?.supabaseConfigured ? '활성' : '비활성'}
          </span>
        </div>

        {/* 로그 목록 */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280', fontSize: '13px' }}>
              로그를 불러오는 중입니다...
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6b7280', fontSize: '13px' }}>
              기록된 인증 시도 로그가 아직 없습니다.<br />
              인증번호 전송 버튼을 누른 후 다시 확인해 주세요.
            </div>
          )}

          {!loading && logs.map((item) => {
            const isMatch = targetEmail && item.email && item.email.toLowerCase().includes(targetEmail.toLowerCase());
            const badgeColor = item.status === 'SUCCESS' ? '#16a34a' : item.status === 'FAIL' ? '#dc2626' : '#d97706';
            const badgeBg = item.status === 'SUCCESS' ? '#dcfce7' : item.status === 'FAIL' ? '#fee2e2' : '#fef3c7';

            return (
              <div
                key={item.id}
                style={{
                  border: isMatch ? '1.5px solid #86efac' : '1px solid #e5e7eb',
                  background: isMatch ? '#f0fdf4' : '#ffffff',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{item.action}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', color: badgeColor, background: badgeBg }}>
                      {item.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{item.timeStr || item.timestamp?.split('T')[1]?.slice(0, 8)}</span>
                </div>

                <div style={{ fontSize: '12px', color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>대상: <strong>{item.email || item.loginId || 'N/A'}</strong> ({item.provider})</span>
                </div>

                {item.code && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>인증번호:</span>
                      <strong style={{ fontSize: '16px', color: '#15803d', letterSpacing: '2px', fontFamily: 'monospace' }}>{item.code}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.code, item.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: 'none',
                        background: copiedId === item.id ? '#15803d' : '#e2e8f0',
                        color: copiedId === item.id ? '#ffffff' : '#1e293b',
                        cursor: 'pointer'
                      }}
                    >
                      {copiedId === item.id ? '✓ 입력완료' : '자동 입력'}
                    </button>
                  </div>
                )}

                <div style={{ fontSize: '11.5px', color: item.error ? '#b91c1c' : '#6b7280', lineHeight: 1.4 }}>
                  {item.details}
                  {item.error && <div style={{ marginTop: '2px', fontWeight: 600 }}>⚠️ 원인: {item.error}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={openWebDashboard}
            style={{ fontSize: '12px', color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            전체 로그 웹창에서 열기 ↗
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchLogs}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              🔄 새로고침
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: '#15803d',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
