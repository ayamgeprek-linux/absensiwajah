import React, { useState } from 'react';

const AdminLogin = ({ onNavigate }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);

  const API_BASE = 'https://haritsdulloh-absensiwajah.hf.space
';

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password
        }),
      });

      const result = await response.json();

      if (result.success) {
        showPopup('success', 'Login Admin Berhasil! 🎉', 
          `Selamat datang Admin!\n\n⏰ ${new Date().toLocaleString('id-ID')}`
        );
        
        setTimeout(() => {
          onNavigate('admin', { username: 'admin', role: 'administrator' });
        }, 1500);
        
      } else {
        throw new Error(result.error || 'Login admin gagal');
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
          <div style={{
            ...styles.popupHeader,
            background: config.bgColor
          }}>
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
                onChange={(e) => setForm({...form, username: e.target.value})}
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
                onChange={(e) => setForm({...form, password: e.target.value})}
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

          <div style={styles.authLinks}>
            <p style={styles.authText}>
              Login sebagai user biasa?{' '}
              <button 
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  window.location.reload(); // Refresh untuk ke halaman utama
                }}
                style={styles.linkButton}
              >
                Kembali ke halaman utama
              </button>
            </p>
          </div>

          <div style={styles.infoBox}>
            <h3 style={styles.infoTitle}>📋 Akses Administrator:</h3>
            <ul style={styles.infoList}>
              <li>Kelola data user dan absensi</li>
              <li>Lihat laporan dan statistik</li>
              <li>Export data ke Excel</li>
              <li>Pengaturan sistem dan lokasi</li>
              <li>Hanya untuk administrator yang berwenang</li>
            </ul>
          </div>
        </div>
      </main>

      <Popup />

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Memverifikasi kredensial admin...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: '2rem 0',
    textAlign: 'center'
  },
  headerContent: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '0 1rem'
  },
  logo: {
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
    fontSize: '2rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#6b7280',
    margin: 0,
    fontSize: '1rem',
    fontWeight: '500'
  },
  main: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  cardTitle: {
    color: '#1f2937',
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  labelIcon: {
    fontSize: '1.1rem'
  },
  input: {
    padding: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    transition: 'all 0.3s ease'
  },
  adminInfo: {
    background: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '8px',
    padding: '1rem'
  },
  adminText: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#92400e',
    lineHeight: '1.4'
  },
  controls: {
    marginTop: '1rem'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)',
    width: '100%',
    justifyContent: 'center'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  authLinks: {
    marginTop: '2rem',
    textAlign: 'center',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb'
  },
  authText: {
    color: '#6b7280',
    margin: 0
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#f59e0b',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontWeight: '600'
  },
  infoBox: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  infoTitle: {
    color: '#374151',
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    fontWeight: '600'
  },
  infoList: {
    color: '#6b7280',
    margin: 0,
    paddingLeft: '1.5rem',
    lineHeight: '1.6'
  },
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  popupContainer: {
    background: 'white',
    borderRadius: '20px',
    maxWidth: '450px',
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  popupHeader: {
    padding: '1.5rem',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  popupIcon: {
    fontSize: '1.5rem'
  },
  popupTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '600'
  },
  popupContent: {
    padding: '1.5rem'
  },
  popupText: {
    margin: '0.5rem 0',
    lineHeight: '1.6',
    color: '#374151'
  },
  popupButtons: {
    padding: '0 1.5rem 1.5rem 1.5rem'
  },
  popupButton: {
    width: '100%',
    padding: '1rem',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderRadius: '10px'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  loadingContent: {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #f59e0b',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem auto'
  },
  loadingText: {
    margin: 0,
    color: '#374151',
    fontWeight: '500'
  }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default AdminLogin;
