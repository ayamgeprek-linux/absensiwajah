// components/UserRegistrationApp.js
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

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Start Camera - Optimized for mobile
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
          facingMode: 'user' // Front camera for mobile
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

  // Capture Image - Optimized for mobile
  const captureImage = () => {
    if (!videoContainerRef.current?.firstChild) {
      throw new Error('Kamera belum siap');
    }

    const video = videoContainerRef.current.firstChild;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Optimize canvas size for mobile
    canvas.width = isMobile ? 320 : 640;
    canvas.height = isMobile ? 240 : 480;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Gagal mengambil gambar');
        resolve(blob);
      }, 'image/jpeg', 0.7); // Lower quality for mobile
    });
  };

  // API Call
  const callAPI = async (endpoint, data = null, method = 'POST') => {
    try {
      setLoading(true);
      const options = { method, headers: {} };

      if (data instanceof FormData) {
        options.body = data;
      } else if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register User
  const registerUser = async (userData) => {
  // Register User
const registerUser = async (userData) => {
  try {
    if (!cameraActive) {
      showPopup('warning', 'Kamera Belum Aktif', 'Silakan aktifkan kamera terlebih dahulu');
      return false;
    }

    // 📸 Ambil foto dari kamera
    const imageBlob = await captureImage();

    // 📦 Buat FormData buat dikirim ke Flask
    const formData = new FormData();
    formData.append("file", imageBlob, `${userData.userId}.jpg`);
    formData.append("name", userData.name);
    formData.append("user_id", userData.userId);
    formData.append("password", userData.password);

    // 🚀 Kirim ke backend
    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      body: formData, // ❌ Jangan set header Content-Type manual!
    });

    const result = await response.json();
    console.log("✅ Register result:", result);

    if (result.success) {
      showPopup(
        'success',
        'Registrasi Berhasil! 🎉',
        `Selamat ${userData.name}!\n\n🆔 ${userData.userId}\n🔐 Password tersimpan\n⏰ ${new Date().toLocaleString('id-ID')}\n\nKlik "Lanjut ke Login" untuk masuk ke sistem.`
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
    if (success) {
      setForm({ name: '', userId: '', password: '' });
    }
  };

  // Popup Management
  const showPopup = (type, title, message) => {
    setPopup({ type, title, message });
  };

  const closePopup = () => {
    setPopup(null);
  };

  // Effects
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
      
      return () => {
        if (videoContainerRef.current) {
          videoContainerRef.current.innerHTML = '';
        }
      };
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
      <header style={styles.header}>
        <div style={{
          ...styles.headerContent,
          maxWidth: isMobile ? '100%' : '800px',
          padding: isMobile ? '0 1rem' : '0 1rem'
        }}>
          <h1 style={{
            ...styles.logo,
            fontSize: isMobile ? '1.8rem' : '2.5rem'
          }}>🤖 Pendaftaran User</h1>
          <p style={{
            ...styles.subtitle,
            fontSize: isMobile ? '0.9rem' : '1.1rem'
          }}>Daftarkan diri Anda untuk mulai menggunakan sistem absensi</p>
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
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: '1.5rem 0',
    textAlign: 'center'
  },
  headerContent: {
    margin: '0 auto',
  },
  logo: {
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#6b7280',
    margin: 0,
    fontWeight: '500'
  },
  main: {
    margin: '0 auto',
  },
  card: {
    background: 'white',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
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
    fontWeight: '700'
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
    borderRadius: '50%'
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
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid #e5e7eb',
    position: 'relative'
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
    opacity: 0.8
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
    boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.4)'
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
    fontSize: '1.1rem'
  },
  input: {
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.3s ease'
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
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
    width: '100%',
    justifyContent: 'center'
  },
  successButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
    width: '100%',
    justifyContent: 'center'
  },
  secondaryButton: {
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    width: '100%'
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
    borderTop: '1px solid #e5e7eb'
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
    fontWeight: '600'
  },
  infoBox: {
    background: '#f9fafb',
    borderRadius: '10px',
    border: '1px solid #e5e7eb'
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
    padding: '1rem'
  },
  popupContainer: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  popupHeader: {
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
    borderRadius: '8px'
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
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    input, button {
      font-size: 16px !important; /* Prevent zoom on iOS */
    }
  }
`;
document.head.appendChild(style);

export default UserRegistrationApp;
