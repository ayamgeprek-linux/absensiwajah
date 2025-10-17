// components/UserRegistrationApp.jsx
import React, { useState, useRef, useEffect } from 'react';

const UserRegistrationApp = ({ onNavigate }) => {
  const [form, setForm] = useState({ name: '', userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [popup, setPopup] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState({});
  const [typingIndex, setTypingIndex] = useState(0);
  const videoContainerRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE = 'https://haritsdulloh-absensiwajah.hf.space';

  const typingTexts = [
    "Bikin Identitas Digital Kamu 🚀",
    "Daftar dengan Wajah Biar Keren 👤", 
    "Gabung di Era Absensi Modern ✨",
    "Daftar Aman & Kekinian Banget 🔒"
  ];

  // Typing effect untuk header
  useEffect(() => {
    const timer = setTimeout(() => {
      setTypingIndex((prev) => (prev + 1) % typingTexts.length);
    }, 3000);
    return () => clearTimeout(timer);
  }, [typingIndex]);

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
      showPopup('error', 'Akses Kamera Diperlukan 📸', 'Izinkan akses kamera buat lanjut daftar');
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
        if (!blob) throw new Error('Gagal ambil foto');
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  };

  const registerUser = async (userData) => {
    try {
      if (!cameraActive) {
        showPopup('warning', 'Kamera Perlu Diaktifin 📷', 'Aktifin kamera dulu buat scan wajah kamu');
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
        throw new Error("Server lagi error nih");
      }

      if (result.success) {
        showPopup(
          'success',
          'Selamat Datang di Masa Depan! 🎉',
          `Hai ${userData.name}! Identitas digital kamu udah siap\n\n🆔 ID Kamu: ${userData.userId}\n🔐 Password aman tersimpan\n⏰ Terdaftar: ${new Date().toLocaleString('id-ID', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`
        );
        return true;
      } else {
        throw new Error(result.error || 'Gagal daftar');
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      showPopup('error', 'Waduh Error! 🚨', error.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.userId || !form.password) {
      showPopup('warning', 'Data Kurang Lengkap 🧩', 'Isi semua form dulu ya buat lanjut');
      return;
    }
    if (form.password.length < 4) {
      showPopup('warning', 'Password Terlalu Pendek 🔐', 'Password minimal 4 karakter dong');
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

  // 🎨 SUPER MODERN POPUP COMPONENT
  const Popup = () => {
    if (!popup) return null;

    const popupConfig = {
      success: { 
        icon: '🎊',
        bgGradient: 'linear-gradient(135deg, #00b4db, #0083b0)',
        particleColor: '#00b4db',
        glowColor: 'rgba(0, 180, 219, 0.3)'
      },
      error: { 
        icon: '💥',
        bgGradient: 'linear-gradient(135deg, #ff416c, #ff4b2b)',
        particleColor: '#ff416c',
        glowColor: 'rgba(255, 65, 108, 0.3)'
      },
      warning: { 
        icon: '⚡',
        bgGradient: 'linear-gradient(135deg, #f7971e, #ffd200)',
        particleColor: '#f7971e',
        glowColor: 'rgba(247, 151, 30, 0.3)'
      }
    };

    const config = popupConfig[popup.type];

    return (
      <div style={styles.popupOverlay} onClick={closePopup}>
        {/* Animated Particles */}
        <div style={styles.particlesContainer}>
          {[...Array(15)].map((_, i) => (
            <div key={i} style={{
              ...styles.particle,
              background: config.particleColor,
              animationDelay: `${i * 0.2}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}></div>
          ))}
        </div>
        
        <div style={{
          ...styles.popupContainer,
          maxWidth: isMobile ? '95vw' : '500px',
          animation: 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            ...styles.popupHeader,
            background: config.bgGradient,
            padding: isMobile ? '2rem 1.5rem' : '3rem 2rem'
          }}>
            <div style={styles.popupIconWrapper}>
              <div style={{
                ...styles.popupIcon,
                animation: 'iconPulse 2s infinite'
              }}>{config.icon}</div>
            </div>
            <h3 style={styles.popupTitle}>{popup.title}</h3>
          </div>
          <div style={styles.popupContent}>
            {popup.message.split('\n').map((line, index) => (
              <p key={index} style={styles.popupText}>{line}</p>
            ))}
          </div>
          <div style={styles.popupButtons}>
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
                background: config.bgGradient,
                transform: isHovered.popup ? 'translateY(-3px) scale(1.05)' : 'translateY(0) scale(1)',
                boxShadow: isHovered.popup ? 
                  `0 20px 40px ${config.glowColor}` : 
                  `0 10px 30px ${config.glowColor}`
              }}
            >
              {popup.type === 'success' ? '🚀 Lanjut ke Login' : 'Oke Sip!'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      {/* Animated Background */}
      <div style={styles.animatedBackground}>
        <div style={styles.floatingOrb1}></div>
        <div style={styles.floatingOrb2}></div>
        <div style={styles.floatingOrb3}></div>
        <div style={styles.gridOverlay}></div>
      </div>

      {/* Header dengan Typing Effect */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <div style={styles.logoWrapper}>
              <div style={styles.logoIcon}>🤖</div>
              <div style={styles.logoGlow}></div>
            </div>
            <div style={styles.titleSection}>
              <h1 style={styles.mainTitle}>
                FaceID
                <span style={styles.titleAccent}>Register</span>
              </h1>
              <div style={styles.typingContainer}>
                <p style={styles.typingText}>
                  {typingTexts[typingIndex]}
                  <span style={styles.cursor}>|</span>
                </p>
              </div>
            </div>
          </div>
          
          <div style={styles.headerStats}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>🚀</span>
              <span style={styles.statLabel}>Cepat</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>🔒</span>
              <span style={styles.statLabel}>Aman</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>✨</span>
              <span style={styles.statLabel}>Kekinian</span>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={{
          ...styles.card,
          transform: cameraActive ? 'translateY(-5px) scale(1.02)' : 'translateY(0) scale(1)'
        }}>
          {/* Card Header dengan Glow Effect */}
          <div style={styles.cardGlow}></div>
          
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleSection}>
              <h2 style={styles.cardTitle}>
                <span style={styles.cardTitleIcon}>👨‍💻</span>
                Buat Akun
              </h2>
              <p style={styles.cardSubtitle}>Gabung dengan sistem autentikasi generasi berikutnya</p>
            </div>
            
            <div style={styles.statusBadge}>
              <div style={{
                ...styles.statusIndicator,
                background: cameraActive ? 
                  'linear-gradient(135deg, #00b09b, #96c93d)' : 
                  'linear-gradient(135deg, #ff416c, #ff4b2b)'
              }}>
                <span style={styles.statusText}>
                  {cameraActive ? '📸 LIVE' : '📵 OFFLINE'}
                </span>
                <div style={styles.statusPulse}></div>
              </div>
            </div>
          </div>

          <div style={styles.registrationLayout}>
            {/* Camera Section - Futuristic Design */}
            <div style={styles.cameraSection}>
              <div style={{
                ...styles.cameraContainer,
                transform: cameraActive ? 'scale(1.02)' : 'scale(1)',
                boxShadow: cameraActive ? 
                  '0 25px 50px rgba(0, 180, 219, 0.3), 0 0 0 1px rgba(255,255,255,0.1)' :
                  '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.05)'
              }}>
                {!cameraActive ? (
                  <div style={styles.cameraPlaceholder}>
                    <div style={styles.placeholderIcon}>📸</div>
                    <div style={styles.placeholderContent}>
                      <h3 style={styles.placeholderTitle}>Kamera Siap</h3>
                      <p style={styles.placeholderDesc}>Aktifkan buat scan identitas digital kamu</p>
                    </div>
                    <div style={styles.scanLine}></div>
                  </div>
                ) : (
                  <>
                    <div ref={videoContainerRef} style={styles.videoContainer}></div>
                    <div style={styles.faceGuideOverlay}>
                      <div style={styles.faceFrame}>
                        <div style={styles.frameCornerTL}></div>
                        <div style={styles.frameCornerTR}></div>
                        <div style={styles.frameCornerBL}></div>
                        <div style={styles.frameCornerBR}></div>
                        <div style={styles.scanAnimation}></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Form Section - Modern Design */}
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>👤</span>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Masukkan nama lengkap kamu"
                  style={{
                    ...styles.input,
                    transform: isHovered.name ? 'translateX(10px)' : 'translateX(0)'
                  }}
                  onMouseEnter={() => handleMouseEnter('name')}
                  onMouseLeave={() => handleMouseLeave('name')}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>🆔</span>
                  User ID
                </label>
                <input
                  type="text"
                  value={form.userId}
                  onChange={(e) => setForm({...form, userId: e.target.value})}
                  placeholder="Buat ID unik buat kamu"
                  style={{
                    ...styles.input,
                    transform: isHovered.userId ? 'translateX(10px)' : 'translateX(0)'
                  }}
                  onMouseEnter={() => handleMouseEnter('userId')}
                  onMouseLeave={() => handleMouseLeave('userId')}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelIcon}>🔐</span>
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  placeholder="Buat password yang aman"
                  style={{
                    ...styles.input,
                    transform: isHovered.password ? 'translateX(10px)' : 'translateX(0)'
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
                      transform: isHovered.startCamera ? 'translateY(-5px) scale(1.05)' : 'translateY(0) scale(1)',
                      boxShadow: isHovered.startCamera ? 
                        '0 25px 50px rgba(102, 126, 234, 0.5), 0 0 30px rgba(102, 126, 234, 0.3)' :
                        '0 15px 35px rgba(102, 126, 234, 0.4), 0 0 20px rgba(102, 126, 234, 0.2)'
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={styles.spinner}></div>
                        Memulai...
                      </>
                    ) : (
                      '🚀 Aktifkan Kamera'
                    )}
                  </button>
                ) : (
                  <div style={styles.buttonGroup}>
                    <button 
                      type="submit"
                      disabled={loading || !form.name || !form.userId || !form.password}
                      onMouseEnter={() => handleMouseEnter('submit')}
                      onMouseLeave={() => handleMouseLeave('submit')}
                      style={{
                        ...styles.successButton,
                        opacity: (!form.name || !form.userId || !form.password) ? 0.6 : 1,
                        transform: isHovered.submit ? 'translateY(-5px) scale(1.05)' : 'translateY(0) scale(1)',
                        boxShadow: isHovered.submit ? 
                          '0 25px 50px rgba(16, 185, 129, 0.5), 0 0 30px rgba(16, 185, 129, 0.3)' :
                          '0 15px 35px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      {loading ? (
                        <>
                          <div style={styles.spinner}></div>
                          Bikin Akun...
                        </>
                      ) : (
                        '✨ Buat Identitas Digital'
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={stopCamera}
                      onMouseEnter={() => handleMouseEnter('stopCamera')}
                      onMouseLeave={() => handleMouseLeave('stopCamera')} 
                      style={{
                        ...styles.secondaryButton,
                        transform: isHovered.stopCamera ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                    >
                      ⏹️ Matikan
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          <div style={styles.authLinks}>
            <p style={styles.authText}>
              Sudah punya akun?{' '}
              <button 
                onClick={() => onNavigate('login')}
                style={styles.linkButton}
              >
                Masuk Sistem
              </button>
            </p>
          </div>

          {/* Info Section - Modern */}
                    <div style={styles.infoSection}>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoIcon}>⚡</div>
                <div style={styles.infoContent}>
                  <h4 style={styles.infoItemTitle}>Cepat Banget</h4>
                  <p style={styles.infoItemDesc}>Daftar dalam hitungan detik pake scan wajah</p>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoIcon}>🔒</div>
                <div style={styles.infoContent}>
                  <h4 style={styles.infoItemTitle}>Super Aman</h4>
                  <p style={styles.infoItemDesc}>Autentikasi biometrik buat keamanan maksimal</p>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoIcon}>🎯</div>
                <div style={styles.infoContent}>
                  <h4 style={styles.infoItemTitle}>Akurat</h4>
                  <p style={styles.infoItemDesc}>AI canggih buat deteksi wajah yang tepat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Popup />

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.loadingOrb}></div>
            <p style={styles.loadingText}>Mulai Sistem...</p>
          </div>
        </div>
      )}
    </div>
  );
};y

// 🎨 SUPER MODERN STYLES - FUTURISTIC DESIGN
const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden'
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  floatingOrb1: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '300px',
    height: '300px',
    background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'floatOrb 8s ease-in-out infinite',
    filter: 'blur(40px)'
  },
  floatingOrb2: {
    position: 'absolute',
    bottom: '20%',
    right: '15%',
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'floatOrb 12s ease-in-out infinite reverse',
    filter: 'blur(50px)'
  },
  floatingOrb3: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '200px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(255, 65, 108, 0.05) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'floatOrb 10s ease-in-out infinite 2s',
    filter: 'blur(30px)'
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
    animation: 'gridMove 20s linear infinite'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '2rem 0',
    position: 'relative',
    zIndex: 2
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '2rem'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  logoWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoIcon: {
    fontSize: '3.5rem',
    filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.5))',
    animation: 'logoFloat 4s ease-in-out infinite'
  },
  logoGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80px',
    height: '80px',
    background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(15px)',
    animation: 'pulseGlow 2s ease-in-out infinite'
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  mainTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  titleAccent: {
    color: 'white',
    WebkitTextFillColor: 'white'
  },
  typingContainer: {
    minHeight: '30px'
  },
  typingText: {
    fontSize: '1.2rem',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    fontWeight: '500',
    animation: 'typing 3s ease-in-out'
  },
  cursor: {
    animation: 'blink 1s infinite'
  },
  headerStats: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statNumber: {
    fontSize: '1.8rem',
    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    position: 'relative',
    zIndex: 2
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(40px)',
    borderRadius: '30px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '3rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
    animation: 'glowMove 3s ease-in-out infinite'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '3rem',
    flexWrap: 'wrap',
    gap: '2rem'
  },
  cardTitleSection: {
    flex: 1
  },
  cardTitle: {
    fontSize: '2.2rem',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 0.5rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  cardTitleIcon: {
    fontSize: '2rem'
  },
  cardSubtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0
  },
  statusBadge: {
    flexShrink: 0
  },
  statusIndicator: {
    padding: '0.8rem 1.5rem',
    borderRadius: '50px',
    color: 'white',
    fontWeight: '700',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    position: 'relative',
    overflow: 'hidden'
  },
  statusText: {
    zIndex: 2
  },
  statusPulse: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'white',
    animation: 'statusPulse 2s infinite'
  },
  registrationLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '3rem',
    alignItems: 'start'
  },
  cameraSection: {
    position: 'relative'
  },
  cameraContainer: {
    width: '100%',
    height: '400px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '20px',
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
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
    textAlign: 'center',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
    position: 'relative',
    overflow: 'hidden'
  },
  placeholderIcon: {
    fontSize: '4rem',
    marginBottom: '1.5rem',
    animation: 'bounce 2s infinite'
  },
  placeholderContent: {
    zIndex: 2
  },
  placeholderTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0'
  },
  placeholderDesc: {
    fontSize: '1rem',
    opacity: 0.8,
    margin: 0
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
    animation: 'scan 3s ease-in-out infinite'
  },
  faceGuideOverlay: {
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
  faceFrame: {
    width: '250px',
    height: '250px',
    border: '2px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '20px',
    position: 'relative',
    boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)'
  },
  frameCornerTL: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    width: '20px',
    height: '20px',
    borderTop: '3px solid #667eea',
    borderLeft: '3px solid #667eea',
    borderTopLeftRadius: '10px'
  },
  frameCornerTR: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderTop: '3px solid #667eea',
    borderRight: '3px solid #667eea',
    borderTopRightRadius: '10px'
  },
  frameCornerBL: {
    position: 'absolute',
    bottom: '-2px',
    left: '-2px',
    width: '20px',
    height: '20px',
    borderBottom: '3px solid #667eea',
    borderLeft: '3px solid #667eea',
    borderBottomLeftRadius: '10px'
  },
  frameCornerBR: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderBottom: '3px solid #667eea',
    borderRight: '3px solid #667eea',
    borderBottomRightRadius: '10px'
  },
  scanAnimation: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
    animation: 'scan 2s ease-in-out infinite'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  label: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  labelIcon: {
    fontSize: '1.3rem'
  },
  input: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '1.2rem 1.5rem',
    fontSize: '1rem',
    color: 'white',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    outline: 'none',
    ':focus': {
      borderColor: '#667eea',
      background: 'rgba(255, 255, 255, 0.12)',
      boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)'
    },
    '::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)'
    }
  },
  controls: {
    marginTop: '1rem'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    padding: '1.5rem 2rem',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%'
  },
  successButton: {
    background: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    padding: '1.5rem 2rem',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    width: '100%'
  },
  secondaryButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(255, 255, 255, 0.3)'
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
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  authText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1rem',
    margin: 0
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    textDecoration: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '1rem',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  infoSection: {
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.08)',
      transform: 'translateY(-5px)'
    }
  },
  infoIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  infoContent: {
    flex: 1
  },
  infoItemTitle: {
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0'
  },
  infoItemDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem',
    margin: 0,
    lineHeight: '1.5'
  },
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
    backdropFilter: 'blur(10px)'
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  particle: {
    position: 'absolute',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    animation: 'particleFloat 3s ease-in-out infinite'
  },
  popupContainer: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(40px)',
    borderRadius: '25px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 35px 60px rgba(0, 0, 0, 0.4)'
  },
  popupHeader: {
    color: 'white',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  popupIconWrapper: {
    marginBottom: '1rem'
  },
  popupIcon: {
    fontSize: '4rem',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
  },
  popupTitle: {
    fontSize: '1.8rem',
    fontWeight: '800',
    margin: 0,
    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
  },
  popupContent: {
    padding: '2rem',
    background: 'rgba(255, 255, 255, 0.05)'
  },
  popupText: {
    color: 'white',
    fontSize: '1.1rem',
    margin: '1rem 0',
    lineHeight: '1.6',
    textAlign: 'center'
  },
  popupButtons: {
    padding: '0 2rem 2rem 2rem'
  },
  popupButton: {
    width: '100%',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    padding: '1.2rem 2rem',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(20px)'
  },
  loadingContent: {
    textAlign: 'center',
    color: 'white'
  },
  loadingOrb: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '50%',
    margin: '0 auto 1.5rem auto',
    animation: 'orbPulse 2s ease-in-out infinite',
    boxShadow: '0 0 40px rgba(102, 126, 234, 0.5)'
  },
  loadingText: {
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: 0
  }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes floatOrb {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-20px) scale(1.1); }
  }
  
  @keyframes gridMove {
    0% { transform: translate(0, 0); }
    100% { transform: translate(50px, 50px); }
  }
  
  @keyframes logoFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-10px) rotate(5deg); }
    66% { transform: translateY(5px) rotate(-5deg); }
  }
  
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
  }
  
  @keyframes typing {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 1; }
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  @keyframes glowMove {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes statusPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  
  @keyframes scan {
    0% { transform: translateY(0); }
    100% { transform: translateY(100%); }
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
  
  @keyframes particleFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0; }
    50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
  }
  
  @keyframes popIn {
    0% { transform: scale(0.8) translateY(50px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  
  @keyframes iconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  @keyframes orbPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    .registrationLayout {
      grid-template-columns: 1fr !important;
    }
    
    .headerContent {
      flex-direction: column;
      text-align: center;
    }
    
    .headerStats {
      justify-content: center;
    }
    
    .card {
      padding: 1.5rem !important;
    }
    
    .cameraContainer {
      height: 300px !important;
    }
    
    input, button {
      font-size: 16px !important;
    }
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
