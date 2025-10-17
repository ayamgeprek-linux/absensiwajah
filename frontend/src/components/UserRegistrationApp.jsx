// components/UserRegistrationApp.jsx
import React, { useState, useRef, useEffect } from 'react';

const UserRegistrationApp = ({ onNavigate }) => {
  const [form, setForm] = useState({ name: '', userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [popup, setPopup] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState({});
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

  const handleMouseEnter = (buttonName) => {
    setIsHovered(prev => ({ ...prev, [buttonName]: true }));
  };

  const handleMouseLeave = (buttonName) => {
    setIsHovered(prev => ({ ...prev, [buttonName]: false }));
  };

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
      video.style.borderRadius = '20px';
      video.style.transform = 'scaleX(-1)';
      videoContainerRef.current.appendChild(video);
      return () => videoContainerRef.current && (videoContainerRef.current.innerHTML = '');
    } else if (!cameraActive && videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
  }, [cameraActive]);

  // ⚡ CSS GENZ BANGET - FULL ANIMASI & MODERN
  const Popup = () => {
    if (!popup) return null;

    const popupConfig = {
      success: { 
        icon: '✅', 
        bgColor: 'linear-gradient(135deg, #10b981, #059669)',
        buttonColor: '#059669',
        emoji: '🎉'
      },
      error: { 
        icon: '❌', 
        bgColor: 'linear-gradient(135deg, #ef4444, #dc2626)',
        buttonColor: '#dc2626',
        emoji: '😵'
      },
      warning: { 
        icon: '⚠️', 
        bgColor: 'linear-gradient(135deg, #f59e0b, #d97706)',
        buttonColor: '#d97706',
        emoji: '🤔'
      }
    };

    const config = popupConfig[popup.type];

    return (
      <div style={styles.popupOverlay} onClick={closePopup}>
        <div style={{
          ...styles.popupContainer,
          maxWidth: isMobile ? '90vw' : '450px',
          margin: isMobile ? '1rem' : '0',
          animation: 'slideInUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            ...styles.popupHeader,
            background: config.bgColor,
            padding: isMobile ? '1.5rem 1rem' : '2rem 1.5rem'
          }}>
            <div style={styles.popupIconWrapper}>
              <div style={styles.popupIcon}>{config.icon}</div>
              <div style={styles.popupEmoji}>{config.emoji}</div>
            </div>
            <h3 style={{
              ...styles.popupTitle,
              fontSize: isMobile ? '1.3rem' : '1.5rem'
            }}>{popup.title}</h3>
          </div>
          <div style={{
            ...styles.popupContent,
            padding: isMobile ? '1.5rem 1rem' : '2rem 1.5rem'
          }}>
            {popup.message.split('\n').map((line, index) => (
              <p key={index} style={styles.popupText}>{line}</p>
            ))}
          </div>
          <div style={{
            ...styles.popupButtons,
            padding: isMobile ? '1rem' : '0 1.5rem 2rem 1.5rem'
          }}>
            <button 
              onClick={() => {
                closePopup();
                if (popup.type === 'success' && onNavigate) {
                  onNavigate('login');
                }
              }}
              onMouseEnter={() => handleMouseEnter('popup')}
              onMouseLeave={() => handleMouseLeave('popup')}
              style={{
                ...styles.popupButton,
                background: config.buttonColor,
                fontSize: isMobile ? '1rem' : '1.1rem',
                padding: isMobile ? '1rem' : '1.2rem 2rem',
                transform: isHovered.popup ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                boxShadow: isHovered.popup ? '0 15px 30px rgba(0,0,0,0.2)' : '0 8px 20px rgba(0,0,0,0.15)'
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
      {/* Animated Background Elements */}
      <div style={styles.floatingElements}>
        <div style={styles.floatingElement1}>✨</div>
        <div style={styles.floatingElement2}>🚀</div>
        <div style={styles.floatingElement3}>💫</div>
        <div style={styles.floatingElement4}>🌟</div>
      </div>

      <header style={styles.header}>
        <div style={{
          ...styles.headerContent,
          maxWidth: isMobile ? '100%' : '800px',
          padding: isMobile ? '0 1rem' : '0 1rem'
        }}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>🤖</div>
            <h1 style={{
              ...styles.logo,
              fontSize: isMobile ? '2rem' : '3rem'
            }}>Pendaftaran User</h1>
          </div>
          <p style={{
            ...styles.subtitle,
            fontSize: isMobile ? '1rem' : '1.2rem'
          }}>Daftarkan diri Anda untuk mulai menggunakan sistem absensi</p>
        </div>
      </header>

      <main style={{
        ...styles.main,
        padding: isMobile ? '1rem 0.5rem' : '2rem 1rem',
        maxWidth: isMobile ? '100%' : '1200px'
      }}>
        <div style={{
          ...styles.card,
          padding: isMobile ? '1.5rem 1rem' : '3rem',
          borderRadius: isMobile ? '25px' : '35px',
          transform: 'translateY(0)',
          transition: 'all 0.3s ease'
        }}>
          <div style={styles.cardHeader}>
            <h2 style={{
              ...styles.cardTitle,
              fontSize: isMobile ? '1.5rem' : '2rem'
            }}>
              <span style={styles.titleIcon}>📝</span>
              Form Pendaftaran
            </h2>
            <div style={styles.statusIndicator}>
              <div style={{
                ...styles.statusPulse,
                background: cameraActive ? '#10b981' : '#ef4444'
              }}></div>
              <span style={{
                fontSize: isMobile ? '0.9rem' : '1rem',
                fontWeight: '600'
              }}>{cameraActive ? '🎥 Kamera Aktif' : '📵 Kamera Nonaktif'}</span>
            </div>
          </div>

          <div style={{
            ...styles.registrationLayout,
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '2rem' : '3rem'
          }}>
            {/* Camera Section */}
            <div style={styles.cameraSection}>
              <div style={{
                ...styles.cameraContainer,
                height: isMobile ? '280px' : '400px',
                transform: cameraActive ? 'scale(1)' : 'scale(0.98)',
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
                {!cameraActive ? (
                  <div style={styles.cameraPlaceholder}>
                    <div style={{
                      ...styles.placeholderIcon,
                      fontSize: isMobile ? '4rem' : '5rem',
                      animation: 'bounce 2s infinite'
                    }}>📷</div>
                    <p style={{
                      ...styles.placeholderText,
                      fontSize: isMobile ? '1.2rem' : '1.4rem'
                    }}>Kamera belum diaktifkan</p>
                    <p style={{
                      ...styles.placeholderSubtext,
                      fontSize: isMobile ? '0.9rem' : '1rem'
                    }}>Klik tombol dibawah untuk memulai</p>
                  </div>
                ) : (
                  <>
                    <div ref={videoContainerRef} style={styles.videoContainer}></div>
                    <div style={styles.faceGuide}>
                      <div style={{
                        ...styles.faceBox,
                        width: isMobile ? '180px' : '250px',
                        height: isMobile ? '180px' : '250px',
                        animation: 'pulse 2s infinite'
                      }}>
                        <div style={styles.faceBoxCorners}>
                          <div style={styles.corner}></div>
                          <div style={styles.corner}></div>
                          <div style={styles.corner}></div>
                          <div style={styles.corner}></div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={{
                  ...styles.label,
                  fontSize: isMobile ? '1rem' : '1.1rem'
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
                    padding: isMobile ? '1rem' : '1.2rem 1.5rem',
                    fontSize: isMobile ? '1rem' : '1.1rem',
                    transform: isHovered.name ? 'translateY(-2px)' : 'translateY(0)'
                  }}
                  onMouseEnter={() => handleMouseEnter('name')}
                  onMouseLeave={() => handleMouseLeave('name')}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={{
                  ...styles.label,
                  fontSize: isMobile ? '1rem' : '1.1rem'
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
                    padding: isMobile ? '1rem' : '1.2rem 1.5rem',
                    fontSize: isMobile ? '1rem' : '1.1rem',
                    transform: isHovered.userId ? 'translateY(-2px)' : 'translateY(0)'
                  }}
                  onMouseEnter={() => handleMouseEnter('userId')}
                  onMouseLeave={() => handleMouseLeave('userId')}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={{
                  ...styles.label,
                  fontSize: isMobile ? '1rem' : '1.1rem'
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
                    padding: isMobile ? '1rem' : '1.2rem 1.5rem',
                    fontSize: isMobile ? '1rem' : '1.1rem',
                    transform: isHovered.password ? 'translateY(-2px)' : 'translateY(0)'
                  }}
                  onMouseEnter={() => handleMouseEnter('password')}
                  onMouseLeave={() => handleMouseLeave('password')}
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
                    onMouseEnter={() => handleMouseEnter('startCamera')}
                    onMouseLeave={() => handleMouseLeave('startCamera')}
                    style={{
                      ...styles.primaryButton,
                      padding: isMobile ? '1.2rem 2rem' : '1.5rem 3rem',
                      fontSize: isMobile ? '1.1rem' : '1.2rem',
                      transform: isHovered.startCamera ? 'translateY(-3px) scale(1.05)' : 'translateY(0) scale(1)',
                      boxShadow: isHovered.startCamera ? '0 20px 40px rgba(102, 126, 234, 0.4)' : '0 10px 30px rgba(102, 126, 234, 0.3)'
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
                    gap: isMobile ? '1rem' : '1.5rem'
                  }}>
                    <button 
                      type="submit"
                      disabled={loading || !form.name || !form.userId || !form.password}
                      onMouseEnter={() => handleMouseEnter('submit')}
                      onMouseLeave={() => handleMouseLeave('submit')}
                      style={{
                        ...styles.successButton,
                        opacity: (!form.name || !form.userId || !form.password) ? 0.6 : 1,
                        padding: isMobile ? '1.2rem 2rem' : '1.5rem 3rem',
                        fontSize: isMobile ? '1.1rem' : '1.2rem',
                        transform: isHovered.submit ? 'translateY(-3px) scale(1.05)' : 'translateY(0) scale(1)',
                        boxShadow: isHovered.submit ? '0 20px 40px rgba(16, 185, 129, 0.4)' : '0 10px 30px rgba(16, 185, 129, 0.3)'
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
                      onMouseEnter={() => handleMouseEnter('stopCamera')}
                      onMouseLeave={() => handleMouseLeave('stopCamera')} 
                      style={{
                        ...styles.secondaryButton,
                        padding: isMobile ? '1rem 2rem' : '1.2rem 2.5rem',
                        fontSize: isMobile ? '1rem' : '1.1rem',
                        transform: isHovered.stopCamera ? 'translateY(-2px) scale(1.03)' : 'translateY(0) scale(1)'
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
              fontSize: isMobile ? '1rem' : '1.1rem'
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
            marginTop: isMobile ? '2rem' : '3rem',
            padding: isMobile ? '1.5rem' : '2rem'
          }}>
            <h3 style={{
              ...styles.infoTitle,
              fontSize: isMobile ? '1.2rem' : '1.4rem'
            }}>📋 Petunjuk Pendaftaran:</h3>
            <ul style={{
              ...styles.infoList,
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              paddingLeft: isMobile ? '1.2rem' : '2rem'
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
            padding: isMobile ? '2rem' : '3rem'
          }}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Memproses...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// 🎨 GENZ STYLES - FULL ANIMASI & MODERN BANGET
const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 8s ease infinite',
    fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden'
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1
  },
  floatingElement1: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    fontSize: '2rem',
    animation: 'float 6s ease-in-out infinite'
  },
  floatingElement2: {
    position: 'absolute',
    top: '20%',
    right: '10%',
    fontSize: '1.5rem',
    animation: 'float 8s ease-in-out infinite 1s'
  },
  floatingElement3: {
    position: 'absolute',
    bottom: '30%',
    left: '15%',
    fontSize: '1.8rem',
    animation: 'float 7s ease-in-out infinite 2s'
  },
  floatingElement4: {
    position: 'absolute',
    bottom: '20%',
    right: '5%',
    fontSize: '2.2rem',
    animation: 'float 9s ease-in-out infinite 3s'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    padding: '2rem 0',
    textAlign: 'center',
    position: 'relative',
    zIndex: 2,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
  },
  headerContent: {
    margin: '0 auto',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  logoIcon: {
    fontSize: '3rem',
    animation: 'bounce 2s infinite'
  },
  logo: {
    color: 'white',
    margin: 0,
    fontWeight: '800',
    textShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
    fontWeight: '500',
    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
  },
  main: {
    margin: '0 auto',
    position: 'relative',
    zIndex: 2
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(40px)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1.5rem'
  },
  cardTitle: {
    color: '#1f2937',
    margin: 0,
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  titleIcon: {
    fontSize: '1.5em'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#6b7280',
    fontWeight: '600'
  },
  statusPulse: {
    width: '12px',
    height: '12px',
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
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '25px',
    overflow: 'hidden',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    position: 'relative',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
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
    textAlign: 'center'
  },
  placeholderIcon: {
    marginBottom: '1.5rem',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
  },
  placeholderText: {
    fontWeight: '700',
    margin: '0 0 0.75rem 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  placeholderSubtext: {
    opacity: 0.9,
    margin: 0,
    textShadow: '0 1px 4px rgba(0,0,0,0.3)'
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
    borderRadius: '25px',
    boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.4)',
    position: 'relative'
  },
  faceBoxCorners: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  corner: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.8)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  label: {
    fontWeight: '700',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  labelIcon: {
    fontSize: '1.3rem'
  },
  input: {
    border: '2px solid #e5e7eb',
    borderRadius: '15px',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    background: 'white',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    outline: 'none',
    ':focus': {
      borderColor: '#667eea',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.2)',
      transform: 'translateY(-2px)'
    },
    ':hover': {
      borderColor: '#9ca3af',
      transform: 'translateY(-2px)'
    }
  },
  controls: {
    marginTop: '1.5rem'
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    width: '100%',
    justifyContent: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
  },
  successButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    width: '100%',
    justifyContent: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
  },
  secondaryButton: {
    background: 'rgba(243, 244, 246, 0.8)',
    color: '#374151',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    width: '100%',
    ':hover': {
      background: '#f3f4f6',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
    }
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  authLinks: {
    marginTop: '2rem',
    textAlign: 'center',
    paddingTop: '2rem',
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
    textDecoration: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    ':hover': {
      color: '#764ba2',
      textDecoration: 'underline'
    }
  },
  infoBox: {
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
    borderRadius: '20px',
    border: '1px solid rgba(102, 126, 234, 0.1)'
  },
  infoTitle: {
    color: '#374151',
    margin: '0 0 1.5rem 0',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  infoList: {
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.8'
  },
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
    backdropFilter: 'blur(10px)'
  },
  popupContainer: {
    background: 'white',
    borderRadius: '25px',
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 35px 60px -12px rgba(0, 0, 0, 0.4)'
  },
  popupHeader: {
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
  },
  popupIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  popupIcon: {
    fontSize: '2rem',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
  },
  popupEmoji: {
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    fontSize: '1.2rem',
    animation: 'bounce 2s infinite'
  },
  popupTitle: {
    margin: 0,
    fontWeight: '800'
  },
  popupContent: {
    
  },
  popupText: {
    margin: '0.75rem 0',
    lineHeight: '1.6',
    color: '#374151',
    fontSize: '1.1rem'
  },
  popupButtons: {
    
  },
  popupButton: {
    width: '100%',
    color: 'white',
    border: 'none',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    borderRadius: '15px',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(20px)'
  },
  loadingContent: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '25px',
    textAlign: 'center',
    boxShadow: '0 35px 60px -12px rgba(0, 0, 0, 0.4)'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem auto'
  },
  loadingText: {
    margin: 0,
    color: '#374151',
    fontWeight: '600',
    fontSize: '1.2rem'
  }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }
  
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  @keyframes slideInUp {
    0% { transform: translateY(50px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    input, button {
      font-size: 16px !important;
    }
  }
  
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #764ba2, #667eea);
  }
`;
document.head.appendChild(style);

export default UserRegistrationApp;
