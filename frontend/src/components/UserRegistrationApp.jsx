// components/UserRegistrationApp.jsx
import React, { useState, useRef, useEffect } from 'react';

const UserRegistrationApp = ({ onNavigate }) => {
  const [form, setForm] = useState({ name: '', userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [popup, setPopup] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const videoContainerRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE = 'https://haritsdulloh-absensiwajah.hf.space';

  // Cek device mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Start kamera
  const startCamera = async () => {
    try {
      setLoading(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: {
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 },
          facingMode: 'user'
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraActive(true);
      setLoading(false);
    } catch (error) {
      console.error('Camera error:', error);
      showPopup('error', 'Kamera Error', 'Tidak dapat mengakses kamera: ' + error.message);
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (!videoContainerRef.current?.firstChild) throw new Error('Kamera belum siap');
    const video = videoContainerRef.current.firstChild;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = isMobile ? 320 : 640;
    canvas.height = isMobile ? 240 : 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (!blob) throw new Error('Gagal mengambil gambar');
        resolve(blob);
      }, 'image/jpeg', 0.7);
    });
  };

  // ✅ FIX: Fungsi registerUser sekarang aman dari error JSON
  const registerUser = async (userData) => {
    try {
      if (!cameraActive) {
        showPopup('warning', 'Kamera Belum Aktif', 'Silakan aktifkan kamera terlebih dahulu');
        return false;
      }

      const imageBlob = await captureImage();
      const formData = new FormData();
      formData.append("file", imageBlob, `${userData.userId}.jpg`);
      formData.append("name", userData.name);
      formData.append("user_id", userData.userId);
      formData.append("password", userData.password);

      const response = await fetch(`${API_BASE}/register`, { method: "POST", body: formData });
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        console.error("❌ Respons bukan JSON:", text);
        throw new Error("Server tidak mengembalikan JSON (mungkin error di backend).");
      }

      if (result.success) {
        showPopup(
          'success',
          'Registrasi Berhasil 🎉',
          `Selamat ${userData.name}!\n🆔 ID: ${userData.userId}\n🔐 Password tersimpan\n⏰ ${new Date().toLocaleString('id-ID')}`
        );
        return true;
      } else {
        throw new Error(result.error || 'Registrasi gagal');
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      showPopup('error', 'Registrasi Gagal', error.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.userId || !form.password) {
      showPopup('warning', 'Data Tidak Lengkap', 'Harap isi nama lengkap, ID user, dan password');
      return;
    }
    if (form.password.length < 4) {
      showPopup('warning', 'Password Terlalu Pendek', 'Password harus minimal 4 karakter');
      return;
    }
    const success = await registerUser(form);
    if (success) setForm({ name: '', userId: '', password: '' });
  };

  const showPopup = (type, title, message) => setPopup({ type, title, message });
  const closePopup = () => setPopup(null);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
      const video = document.createElement('video');
      video.srcObject = streamRef.current;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      videoContainerRef.current.appendChild(video);
      return () => videoContainerRef.current && (videoContainerRef.current.innerHTML = '');
    } else if (!cameraActive && videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
  }, [cameraActive]);

  // Popup Component
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
          maxWidth: isMobile ? '90vw' : '450px',
          margin: isMobile ? '1rem' : '0'
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
              onClick={() => {
                closePopup();
                if (popup.type === 'success' && onNavigate) {
                  onNavigate('login');
                }
              }}
              style={{
                ...styles.popupButton,
                background: config.buttonColor,
                fontSize: isMobile ? '0.9rem' : '1rem',
                padding: isMobile ? '0.8rem' : '1rem'
              }}
            >
              {popup.type === 'success' ? '🔐 Lanjut ke Login' : 'Mengerti'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      {/* HEADER SIMPLE & MODERN */}
      <header style={styles.header}>
        <div style={styles.headerBackground}></div>
        <div style={{
          ...styles.headerContent,
          padding: isMobile ? '2rem 1rem' : '3rem 2rem'
        }}>
          <div style={styles.logoSection}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon}>🤖</div>
              <div style={styles.logoGlow}></div>
            </div>
            <div style={styles.textContainer}>
              <h1 style={styles.logoTitle}>Daftar Sekarang</h1>
              <p style={styles.logoSubtitle}>Buat akun untuk akses sistem absensi wajah</p>
            </div>
          </div>
          <div style={styles.headerOrnament}></div>
        </div>
      </header>

      <main style={{
        ...styles.main,
        padding: isMobile ? '1rem 0.5rem' : '2rem 1rem',
        maxWidth: isMobile ? '100%' : '1000px'
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
            }}>📝 Form Pendaftaran</h2>
            <div style={styles.statusIndicator}>
              <div style={{
                ...styles.statusDot,
                background: cameraActive ? '#10b981' : '#ef4444'
              }}></div>
              <span style={{
                fontSize: isMobile ? '0.8rem' : '14px'
              }}>{cameraActive ? 'Kamera Aktif' : 'Kamera Nonaktif'}</span>
            </div>
          </div>

          <div style={{
            ...styles.registrationLayout,
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '1.5rem' : '2rem'
          }}>
            <div style={styles.cameraSection}>
              <div style={{
                ...styles.cameraContainer,
                height: isMobile ? '250px' : '300px'
              }}>
                {!cameraActive ? (
                  <div style={styles.cameraPlaceholder}>
                    <div style={{
                      ...styles.placeholderIcon,
                      fontSize: isMobile ? '2.5rem' : '3rem'
                    }}>📷</div>
                    <p style={{
                      ...styles.placeholderText,
                      fontSize: isMobile ? '1rem' : '1.1rem'
                    }}>Kamera belum diaktifkan</p>
                    <p style={{
                      ...styles.placeholderSubtext,
                      fontSize: isMobile ? '0.8rem' : '0.9rem'
                    }}>Klik tombol dibawah untuk memulai</p>
                  </div>
                ) : (
                  <div ref={videoContainerRef} style={styles.videoContainer}></div>
                )}
              </div>

              {cameraActive && (
                <div style={styles.faceGuide}>
                  <div style={{
                    ...styles.faceBox,
                    width: isMobile ? '150px' : '200px',
                    height: isMobile ? '150px' : '200px'
                  }}></div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={{
                  ...styles.label,
                  fontSize: isMobile ? '0.9rem' : '14px'
                }}>
                  <span style={styles.labelIcon}>👤</span>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Masukkan nama lengkap"
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
                  <span style={styles.labelIcon}>🆔</span>
                  User ID
                </label>
                <input
                  type="text"
                  value={form.userId}
                  onChange={(e) => setForm({...form, userId: e.target.value})}
                  placeholder="Masukkan ID unik"
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
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  placeholder="Buat password (min. 4 karakter)"
                  style={{
                    ...styles.input,
                    padding: isMobile ? '0.8rem' : '1rem',
                    fontSize: isMobile ? '0.9rem' : '1rem'
                  }}
                  required
                  minLength="4"
                />
              </div>

              <div style={styles.controls}>
                {!cameraActive ? (
                  <button 
                    type="button" 
                    onClick={startCamera}
                    disabled={loading}
                    style={{
                      ...styles.primaryButton,
                      padding: isMobile ? '0.8rem 1.5rem' : '1rem 2rem',
                      fontSize: isMobile ? '0.9rem' : '1rem'
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={styles.spinner}></div>
                        Mengaktifkan...
                      </>
                    ) : (
                      '🎥 Aktifkan Kamera'
                    )}
                  </button>
                ) : (
                  <div style={{
                    ...styles.buttonGroup,
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '0.8rem' : '1rem'
                  }}>
                    <button 
                      type="submit"
                      disabled={loading || !form.name || !form.userId || !form.password}
                      style={{
                        ...styles.successButton,
                        opacity: (!form.name || !form.userId || !form.password) ? 0.6 : 1,
                        padding: isMobile ? '0.8rem 1.5rem' : '1rem 2rem',
                        fontSize: isMobile ? '0.9rem' : '1rem'
                      }}
                    >
                      {loading ? (
                        <>
                          <div style={styles.spinner}></div>
                          Mendaftarkan...
                        </>
                      ) : (
                        '✅ Daftarkan User'
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={stopCamera} 
                      style={{
                        ...styles.secondaryButton,
                        padding: isMobile ? '0.8rem 1.5rem' : '1rem 1.5rem',
                        fontSize: isMobile ? '0.9rem' : '1rem'
                      }}
                    >
                      ⏹️ Matikan Kamera
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          <div style={styles.authLinks}>
            <p style={{
              ...styles.authText,
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              Sudah punya akun?{' '}
              <button 
                onClick={() => onNavigate('login')}
                style={styles.linkButton}
              >
                Login di sini
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
            }}>📋 Petunjuk Pendaftaran:</h3>
            <ul style={{
              ...styles.infoList,
              fontSize: isMobile ? '0.8rem' : '1rem',
              paddingLeft: isMobile ? '1rem' : '1.5rem'
            }}>
              <li>Isi nama lengkap, ID user, dan password dengan benar</li>
              <li>Password minimal 4 karakter</li>
              <li>Aktifkan kamera dan pastikan wajah terlihat jelas</li>
              <li>Posisikan wajah dalam area frame yang ditentukan</li>
              <li>Pastikan pencahayaan cukup dan tidak silau</li>
              <li>Setelah berhasil, Anda akan diarahkan ke halaman login</li>
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
            <p style={styles.loadingText}>Memproses...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  header: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textAlign: 'center'
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  cardTitle: {
    color: '#1f2937',
    margin: 0,
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  registrationLayout: {
    display: 'grid',
    alignItems: 'start'
  },
  cameraSection: {
    position: 'relative'
  },
  cameraContainer: {
    width: '100%',
    background: '#000',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },
  videoContainer: {
    width: '100%',
    height: '100%'
  },
  cameraPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  placeholderIcon: {
    marginBottom: '1rem',
    opacity: 0.8,
    animation: 'bounce 2s infinite'
  },
  placeholderText: {
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    textAlign: 'center'
  },
  placeholderSubtext: {
    opacity: 0.8,
    margin: 0,
    textAlign: 'center'
  },
  faceGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  faceBox: {
    border: '3px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.4)',
    animation: 'pulse 2s infinite'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem'
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
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  successButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  secondaryButton: {
    background: 'rgba(243, 244, 246, 0.8)',
    color: '#374151',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    width: '100%',
    backdropFilter: 'blur(10px)'
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
    marginTop: '1.5rem',
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
    color: '#667eea',
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
    borderTop: '4px solid #667eea',
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
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
  }
`;
document.head.appendChild(style);

export default UserRegistrationApp;
