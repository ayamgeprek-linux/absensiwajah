import React, { useState } from 'react';

const AdminLogin = ({ onNavigate }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);

  const API_BASE = 'https://haritsdulloh-absensiwajah.hf.space';

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      showPopup('warning', 'Data Tidak Lengkap', 'Harap isi username dan password');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: form.username,
    password: form.password
  }),
});


      const result = await response.json();
      console.log('🔍 Login response:', result);

      // ✅ Deteksi hanya admin yang boleh masuk
      if (result.token && result.role === 'admin') {
        showPopup('success', 'Login Admin Berhasil! 🎉',
          `Selamat datang Admin!\n\n⏰ ${new Date().toLocaleString('id-ID')}`
        );

        setTimeout(() => {
          onNavigate('admin', { username: form.username, role: 'administrator' });
        }, 1500);
      } else if (result.role !== 'admin') {
        showPopup('error', 'Akses Ditolak', 'Akun ini bukan admin.');
      } else {
        throw new Error(result.error || 'Login gagal');
      }
    } catch (error) {
      showPopup('error', 'Login Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const showPopup = (type, title, message) => {
    setPopup({ type, title, message });
  };

  const closePopup = () => {
    setPopup(null);
  };

  const Popup = () => {
    if (!popup) return null;

    const popupConfig = {
      success: { icon: '✅', bgColor: '#10b981', buttonColor: '#059669' },
      error: { icon: '❌', bgColor: '#ef4444', buttonColor: '#dc2626' },
      warning: { icon: '⚠️', bgColor: '#f59e0b', buttonColor: '#d97706' }
    };

    const config = popupConfig[popup.type];

    return (
      <div style={styles.popupOverlay} onClick={closePopup}>
        <div style={styles.popupContainer} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...styles.popupHeader, background: config.bgColor }}>
            <div style={styles.popupIcon}>{config.icon}</div>
            <h3 style={styles.popupTitle}>{popup.title}</h3>
          </div>
          <div style={styles.popupContent}>
            {popup.message.split('\n').map((line, index) => (
              <p key={index} style={styles.popupText}>{line}</p>
            ))}
          </div>
          <div style={styles.popupButtons}>
            <button
              onClick={closePopup}
              style={{
                ...styles.popupButton,
                background: config.buttonColor
              }}
            >
              {popup.type === 'success' ? 'Lanjutkan' : 'Mengerti'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>⚙️ Admin System</h1>
          <p style={styles.subtitle}>Panel Administrator Sistem Absensi</p>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>🔐 Login Administrator</h2>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>👨‍💼</span>
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Masukkan username admin"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>🔒</span>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Masukkan password admin"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.adminInfo}>
              <p style={styles.adminText}>
                💡 <strong>Default Credentials:</strong><br />
                Username: <code>admin</code><br />
                Password: <code>admin123</code>
              </p>
            </div>

            <div style={styles.controls}>
              <button
                type="submit"
                disabled={loading || !form.username || !form.password}
                style={{
                  ...styles.primaryButton,
                  opacity: (!form.username || !form.password) ? 0.6 : 1
                }}
              >
                {loading ? (
                  <>
                    <div style={styles.spinner}></div>
                    Memverifikasi...
                  </>
                ) : (
                  '🚀 Masuk sebagai Admin'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Popup />
    </div>
  );
};

// (CSS styles sama kayak punyamu, ga perlu diubah)
const styles = { /* ...seluruh style tetap sama seperti punyamu... */ };

// Animasi
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default AdminLogin;

    
