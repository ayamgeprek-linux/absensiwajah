import React, { useState } from 'react';

const LoginApp = ({ onNavigate }) => {
  const [form, setForm] = useState({ userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);

  // Gunakan env variable di Vercel jika tersedia, fallback ke Hugging Face
  const API_BASE = process.env.REACT_APP_API_URL || 'https://haritsdulloh-absensiwajah.hf.space';

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!form.userId || !form.password) {
      showPopup('warning', 'Data Tidak Lengkap', 'Harap isi User ID dan Password');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: form.userId,
          password: form.password
        }),
        mode: 'cors' // Penting biar bisa akses cross-domain
      });

      // Coba parse hasil response
      const result = await response.json().catch(() => ({
        success: false,
        error: 'Gagal parsing response dari server'
      }));

      console.log('🔍 Login Response:', result);

      if (result.success) {
        showPopup(
          'success',
          'Login Berhasil! 🎉',
          `Selamat datang kembali!\n\n🆔 ${form.userId}\n⏰ ${new Date().toLocaleString('id-ID')}`
        );

        const userData = {
          userId: form.userId,
          name: result.name || form.userId
        };

        setTimeout(() => {
          onNavigate('main', userData);
        }, 2000);
      } else {
        throw new Error(result.error || 'Login gagal');
      }
    } catch (error) {
      console.error('❌ Login Error:', error);
      showPopup('error', 'Login Gagal', error.message || 'Terjadi kesalahan tak terduga');
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
      success: {
        icon: '✅',
        bgColor: '#10b981',
        buttonColor: '#059669'
      },
      error: {
        icon: '❌',
        bgColor: '#ef4444',
        buttonColor: '#dc2626'
      },
      warning: {
        icon: '⚠️',
        bgColor: '#f59e0b',
        buttonColor: '#d97706'
      }
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
              style={{ ...styles.popupButton, background: config.buttonColor }}
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
          <h1 style={styles.logo}>🔐 Login Sistem</h1>
          <p style={styles.subtitle}>Masuk ke sistem absensi wajah</p>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>📋 Form Login</h2>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <span style={styles.labelIcon}>🆔</span>
                User ID
              </label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                placeholder="Masukkan User ID"
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
                placeholder="Masukkan Password"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.controls}>
              <button
                type="submit"
                disabled={loading || !form.userId || !form.password}
                style={{
                  ...styles.primaryButton,
                  opacity: (!form.userId || !form.password) ? 0.6 : 1
                }}
              >
                {loading ? (
                  <>
                    <div style={styles.spinner}></div>
                    Memproses...
                  </>
                ) : (
                  '🚀 Login'
                )}
              </button>
            </div>
          </form>

          <div style={styles.authLinks}>
            <p style={styles.authText}>
              Belum punya akun?{' '}
              <button
                onClick={() => onNavigate('registration')}
                style={styles.linkButton}
              >
                Daftar di sini
              </button>
            </p>
          </div>

          <div style={styles.infoBox}>
            <h3 style={styles.infoTitle}>📋 Petunjuk Login:</h3>
            <ul style={styles.infoList}>
              <li>Masukkan User ID dan password yang sudah didaftarkan</li>
              <li>Pastikan Anda sudah melakukan registrasi terlebih dahulu</li>
              <li>Hubungi admin jika lupa password</li>
            </ul>
          </div>
        </div>
      </main>

      <Popup />

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Memproses login...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Gaya tetap sama seperti versi kamu
const styles = { /* gaya dari kode kamu */ };

// Animasi spin
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default LoginApp;
