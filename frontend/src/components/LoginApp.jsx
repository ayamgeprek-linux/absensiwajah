import React, { useState } from 'react';

const LoginApp = ({ onNavigate }) => {
  const [form, setForm] = useState({ userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Cek device mobile
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        mode: 'cors'
      });

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
        <div style={{
          ...styles.popupContainer,
          maxWidth: isMobile ? '90vw' : '450px'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ 
            ...styles.popupHeader, 
            background: config.bgColor,
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <div style={styles.popupIcon}>{config.icon}</div>
            <h3 style={{
              ...styles.popupTitle,
              fontSize: isMobile ? '1.1rem' : '1.2rem'
            }}>{popup.title}</h3>
          </div>
          <div style={{
            ...styles.popupContent,
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            {popup.message.split('\n').map((line, index) => (
              <p key={index} style={styles.popupText}>{line}</p>
            ))}
          </div>
          <div style={{
            ...styles.popupButtons,
            padding: isMobile ? '1rem' : '0 1.5rem 1.5rem 1.5rem'
          }}>
            <button
              onClick={closePopup}
              style={{ 
                ...styles.popupButton, 
                background: config.buttonColor,
                fontSize: isMobile ? '0.9rem' : '1rem',
                padding: isMobile ? '0.8rem' : '1rem'
              }}
            >
              {popup.type === 'success' ? '🎉 Lanjutkan' : 'Mengerti'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      {/* HEADER MODERN & SIMPLE */}
      <header style={styles.header}>
        <div style={styles.headerBackground}></div>
        <div style={{
          ...styles.headerContent,
          padding: isMobile ? '2rem 1rem' : '3rem 2rem'
        }}>
          <div style={styles.logoSection}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon}>🔐</div>
              <div style={styles.logoGlow}></div>
            </div>
            <div style={styles.textContainer}>
              <h1 style={styles.logoTitle}>Login Sistem</h1>
              <p style={styles.logoSubtitle}>Masuk ke sistem absensi wajah</p>
            </div>
          </div>
          <div style={styles.headerOrnament}></div>
        </div>
      </header>

      <main style={{
        ...styles.main,
        padding: isMobile ? '1rem 0.5rem' : '2rem 1rem',
        maxWidth: isMobile ? '100%' : '500px'
      }}>
        <div style={{
          ...styles.card,
          padding: isMobile ? '1.5rem 1rem' : '2rem',
          borderRadius: isMobile ? '16px' : '20px'
        }}>
          <div style={styles.cardHeader}>
            <h2 style={{
              ...styles.cardTitle,
              fontSize: isMobile ? '1.3rem' : '1.5rem'
            }}>📋 Form Login</h2>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={{
                ...styles.label,
                fontSize: isMobile ? '0.9rem' : '14px'
              }}>
                <span style={styles.labelIcon}>🆔</span>
                User ID
              </label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                placeholder="Masukkan User ID"
                style={{
                  ...styles.input,
                  padding: isMobile ? '0.8rem' : '1rem',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={{
                ...styles.label,
                fontSize: isMobile ? '0.9rem' : '14px'
              }}>
                <span style={styles.labelIcon}>🔒</span>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Masukkan Password"
                style={{
                  ...styles.input,
                  padding: isMobile ? '0.8rem' : '1rem',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}
                required
              />
            </div>

            <div style={styles.controls}>
              <button
                type="submit"
                disabled={loading || !form.userId || !form.password}
                style={{
                  ...styles.primaryButton,
                  opacity: (!form.userId || !form.password) ? 0.6 : 1,
                  padding: isMobile ? '0.8rem 1.5rem' : '1rem 2rem',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}
              >
                {loading ? (
                  <>
                    <div style={styles.spinner}></div>
                    Memproses...
                  </>
                ) : (
                  '🚀 Login Sekarang'
                )}
              </button>
            </div>
          </form>

          <div style={styles.authLinks}>
            <p style={{
              ...styles.authText,
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              Belum punya akun?{' '}
              <button
                onClick={() => onNavigate('registration')}
                style={styles.linkButton}
              >
                Daftar di sini
              </button>
            </p>
          </div>

          <div style={{
            ...styles.infoBox,
            marginTop: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <h3 style={{
              ...styles.infoTitle,
              fontSize: isMobile ? '1rem' : '1.1rem'
            }}>📋 Petunjuk Login:</h3>
            <ul style={{
              ...styles.infoList,
              fontSize: isMobile ? '0.8rem' : '1rem',
              paddingLeft: isMobile ? '1rem' : '1.5rem'
            }}>
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
          <div style={{
            ...styles.loadingContent,
            padding: isMobile ? '1.5rem' : '2rem'
          }}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Memproses login...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  header: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    textAlign: 'center'
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(96, 165, 250, 0.4) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.4) 0%, transparent 50%)
    `,
    animation: 'gradientShift 8s ease-in-out infinite'
  },
  headerContent: {
    position: 'relative',
    maxWidth: '1200px',
    margin: '0 auto',
    zIndex: 2
  },
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },
  logoContainer: {
    position: 'relative',
    display: 'inline-block'
  },
  logoIcon: {
    fontSize: '4rem',
    filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.3))',
    animation: 'logoFloat 3s ease-in-out infinite'
  },
  logoGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    animation: 'pulse 2s ease-out infinite'
  },
  textContainer: {
    textAlign: 'center'
  },
  logoTitle: {
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '0 0 0.5rem 0',
    textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  logoSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1.1rem',
    margin: 0,
    fontWeight: '500',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
  },
  headerOrnament: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
    animation: 'shimmer 3s ease-in-out infinite'
  },
  main: {
    margin: '0 auto',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    boxShadow: `
      0 25px 50px -12px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.1)
    `,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    animation: 'cardEntrance 0.8s ease-out'
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  cardTitle: {
    color: '#1f2937',
    margin: 0,
    fontWeight: '700',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
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
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  labelIcon: {
    fontSize: '1.1rem',
    animation: 'wiggle 3s ease-in-out infinite'
  },
  input: {
    border: '2px solid rgba(229, 231, 235, 0.8)',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)'
  },
  controls: {
    marginTop: '1rem'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
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
    borderTop: '1px solid rgba(229, 231, 235, 0.5)'
  },
  authText: {
    color: '#6b7280',
    margin: 0
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  infoBox: {
    background: 'rgba(249, 250, 251, 0.8)',
    borderRadius: '16px',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    backdropFilter: 'blur(10px)'
  },
  infoTitle: {
    color: '#374151',
    margin: '0 0 1rem 0',
    fontWeight: '600'
  },
  infoList: {
    color: '#6b7280',
    margin: 0,
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
    padding: '1rem',
    backdropFilter: 'blur(5px)'
  },
  popupContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    animation: 'popupEntrance 0.5s ease-out'
  },
  popupHeader: {
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  popupIcon: {
    fontSize: '1.5rem',
    animation: 'bounce 1s infinite'
  },
  popupTitle: {
    margin: 0,
    fontWeight: '600'
  },
  popupContent: {
    
  },
  popupText: {
    margin: '0.5rem 0',
    lineHeight: '1.6',
    color: '#374151'
  },
  popupButtons: {
    
  },
  popupButton: {
    width: '100%',
    color: 'white',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
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
    zIndex: 9999,
    backdropFilter: 'blur(10px)'
  },
  loadingContent: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(243, 244, 246, 0.8)',
    borderTop: '4px solid #3b82f6',
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

// Add enhanced CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes logoFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }
  
  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes cardEntrance {
    0% { 
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    100% { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes popupEntrance {
    0% { 
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
    100% { 
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translateY(0);
    }
    40%, 43% {
      transform: translateY(-8px);
    }
    70% {
      transform: translateY(-4px);
    }
    90% {
      transform: translateY(-2px);
    }
  }
  
  @keyframes wiggle {
    0%, 7% { transform: rotate(0); }
    2% { transform: rotate(-5deg); }
    4% { transform: rotate(5deg); }
    6% { transform: rotate(0); }
  }
  
  /* Enhanced mobile optimizations */
  @media (max-width: 768px) {
    input, button {
      font-size: 16px !important;
    }
    
    .logoTitle {
      font-size: 2rem !important;
    }
    
    .logoSubtitle {
      font-size: 1rem !important;
    }
  }
  
  /* Hover effects */
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
  }
  
  input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    transform: translateY(-1px);
  }
`;
document.head.appendChild(style);

export default LoginApp;
