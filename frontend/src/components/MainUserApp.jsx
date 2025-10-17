// components/MainUserApp.js
import React, { useState, useRef, useEffect } from 'react';

const MainUserApp = ({ onNavigate }) => {
  const [currentView, setCurrentView] = useState('attendance');
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [popup, setPopup] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const videoContainerRef = useRef(null);
  const streamRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const API_BASE = 'https://haritsdulloh-absensiwajah.hf.space';

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung'));
        return;
      }

      setLocationLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
          setLocationLoading(false);
          resolve(location);
        },
        (error) => {
          setLocationLoading(false);
          reject(new Error('Gagal mendapatkan lokasi'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        }
      );
    });
  };

  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      const location = await getUserLocation();
      return location;
    } catch (error) {
      return null;
    }
  };

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
      showPopup('error', 'Kamera Error', 'Tidak dapat mengakses kamera');
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
    if (!videoContainerRef.current?.firstChild) {
      throw new Error('Kamera belum siap');
    }

    const video = videoContainerRef.current.firstChild;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = isMobile ? 320 : 640;
    canvas.height = isMobile ? 240 : 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Gagal mengambil gambar');
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  };

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
        throw new Error(result.error || 'Request gagal');
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const takeAttendance = async () => {
    try {
      if (!cameraActive) {
        showPopup('warning', 'Kamera Belum Aktif', 'Silakan aktifkan kamera terlebih dahulu');
        return;
      }

      let location = userLocation;
      if (!location) {
        location = await requestLocationPermission();
      }

      const imageBlob = await captureImage();
      const formData = new FormData();
      formData.append('file', imageBlob, 'attendance.jpg');

      if (location) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
      }

      const result = await callAPI('/attendance', formData);
      
      if (result.success) {
        if (result.recognized_user) {
          const user = result.recognized_user;
          setUserProfile(user);
          
          let popupMessage = `Selamat ${user.name}!\n🆔 ${user.user_id}\n📊 Kemiripan: ${(user.similarity * 100).toFixed(1)}%`;
          
          if (result.location) {
            popupMessage += `\n📍 ${result.location.message}`;
          }
          
          showPopup('success', 'Absensi Berhasil! 🎉', popupMessage);
        } else {
          showPopup('warning', 'Wajah Tidak Dikenali', 'Wajah tidak dikenali dalam sistem.');
        }
        loadAttendanceRecords();
      } else {
        throw new Error(result.error || 'Absensi gagal');
      }
    } catch (error) {
      showPopup('error', 'Absensi Gagal', error.message);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const result = await callAPI('/attendance-records', null, 'GET');
      if (result.success) {
        if (userProfile) {
          const userRecords = result.records.filter(record => 
            record.user_id === userProfile.user_id
          );
          setAttendanceRecords(userRecords);
        } else {
          setAttendanceRecords(result.records.slice(0, 10));
        }
      }
    } catch (error) {
      console.error('Failed to load records:', error);
    }
  };

  const showPopup = (type, title, message) => {
    setPopup({ type, title, message });
  };

  const closePopup = () => {
    setPopup(null);
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
      
      videoContainerRef.current.appendChild(video);
      
      return () => {
        if (videoContainerRef.current) {
          videoContainerRef.current.innerHTML = '';
        }
      };
    } else if (!cameraActive && videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
  }, [cameraActive, currentView]);

  useEffect(() => {
    loadAttendanceRecords();
  }, [userProfile]);

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
      },
      info: { 
        icon: 'ℹ️', 
        bgColor: '#3b82f6',
        buttonColor: '#2563eb'
      }
    };

    const config = popupConfig[popup.type] || popupConfig.info;

    return (
      <div style={styles.popupOverlay} onClick={closePopup}>
        <div style={{
          ...styles.popupContainer,
          maxWidth: isMobile ? '90vw' : '400px'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            ...styles.popupHeader,
            background: config.bgColor,
            padding: isMobile ? '1rem' : '1.25rem'
          }}>
            <div style={styles.popupIcon}>{config.icon}</div>
            <h3 style={{
              ...styles.popupTitle,
              fontSize: isMobile ? '1rem' : '1.1rem'
            }}>{popup.title}</h3>
          </div>
          <div style={{
            ...styles.popupContent,
            padding: isMobile ? '1rem' : '1.25rem'
          }}>
            {popup.message.split('\n').map((line, index) => (
              <p key={index} style={styles.popupText}>{line}</p>
            ))}
          </div>
          <div style={{
            ...styles.popupButtons,
            padding: isMobile ? '1rem' : '0 1.25rem 1.25rem 1.25rem'
          }}>
            <button 
              onClick={closePopup}
              style={{
                ...styles.popupButton,
                background: config.buttonColor,
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                padding: isMobile ? '0.7rem' : '0.8rem'
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    );
  };

  const LocationStatus = () => (
    <div style={styles.locationStatus}>
      <div style={styles.locationHeader}>
        <span style={styles.locationIcon}>📍</span>
        <span style={styles.locationTitle}>Status Lokasi</span>
      </div>
      {locationLoading ? (
        <div style={styles.locationLoading}>
          <div style={styles.smallSpinner}></div>
          <span>Mendapatkan lokasi...</span>
        </div>
      ) : userLocation ? (
        <div style={styles.locationSuccess}>
          <span style={styles.locationSuccessText}>✅ Lokasi Berhasil</span>
        </div>
      ) : (
        <div style={styles.locationWarning}>
          <span style={styles.locationWarningText}>📍 Lokasi Belum Siap</span>
          <button 
            onClick={requestLocationPermission}
            style={styles.locationButton}
          >
            Dapatkan
          </button>
        </div>
      )}
    </div>
  );

  const NavigationTabs = () => (
    <div style={styles.navContainer}>
      <div style={styles.navContent}>
        {[
          { id: 'attendance', label: 'Absensi', icon: '📷' },
          { id: 'profile', label: 'Profil', icon: '👤' },
          { id: 'records', label: 'Riwayat', icon: '📊' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            style={{
              ...styles.navTab,
              ...(currentView === tab.id && styles.navTabActive)
            }}
          >
            <span style={styles.navTabIcon}>{tab.icon}</span>
            <span style={styles.navTabLabel}>{tab.label}</span>
            {currentView === tab.id && (
              <div style={styles.navTabActiveIndicator}></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const AttendanceView = () => (
    <div style={{
      ...styles.card,
      padding: isMobile ? '1.25rem 1rem' : '1.5rem',
    }}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>📷 Absensi Harian</h2>
        <div style={styles.statusIndicator}>
          <div style={{
            ...styles.statusDot,
            background: cameraActive ? '#10b981' : '#ef4444'
          }}></div>
          <span style={styles.statusText}>
            {cameraActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>
      
      <LocationStatus />

      <div style={styles.cameraSection}>
        <div ref={videoContainerRef} style={{
          ...styles.cameraContainer,
          height: isMobile ? '200px' : '300px'
        }}>
          {!cameraActive && (
            <div style={styles.cameraPlaceholder}>
              <div style={styles.placeholderIcon}>📷</div>
              <p style={styles.placeholderText}>Kamera belum diaktifkan</p>
            </div>
          )}
        </div>

        {cameraActive && (
          <div style={styles.faceGuide}>
            <div style={styles.faceBox}></div>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        {!cameraActive ? (
          <button 
            onClick={startCamera}
            disabled={loading}
            style={styles.primaryButton}
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
          <div style={styles.buttonGroup}>
            <button 
              onClick={takeAttendance}
              disabled={loading || locationLoading}
              style={styles.successButton}
            >
              {loading ? (
                <>
                  <div style={styles.spinner}></div>
                  Memindai...
                </>
              ) : (
                '📸 Ambil Absensi'
              )}
            </button>
            <button onClick={stopCamera} style={styles.secondaryButton}>
              ⏹️ Matikan
            </button>
          </div>
        )}
      </div>

      {userProfile && (
        <div style={styles.currentUser}>
          <span style={styles.currentUserTitle}>User: </span>
          <span style={styles.currentUserName}>{userProfile.name}</span>
          <span style={styles.currentUserId}>({userProfile.user_id})</span>
        </div>
      )}
    </div>
  );

  const ProfileView = () => (
    <div style={{
      ...styles.card,
      padding: isMobile ? '1.25rem 1rem' : '1.5rem',
    }}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>👤 Profil Saya</h2>
      </div>

      {userProfile ? (
        <div style={styles.profileContent}>
          <div style={styles.profileAvatar}>
            {userProfile.name?.charAt(0).toUpperCase()}
          </div>
          <div style={styles.profileInfo}>
            <h3 style={styles.profileName}>{userProfile.name}</h3>
            <p style={styles.profileId}>🆔 {userProfile.user_id}</p>
            <p style={styles.profileConfidence}>
              Kemiripan: <strong>{(userProfile.similarity * 100).toFixed(1)}%</strong>
            </p>
            
            <div style={styles.profileStats}>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>
                  {attendanceRecords.filter(record => 
                    new Date(record.timestamp).toDateString() === new Date().toDateString()
                  ).length}
                </span>
                <span style={styles.statLabel}>Hari Ini</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>
                  {attendanceRecords.length}
                </span>
                <span style={styles.statLabel}>Total</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👤</div>
          <p style={styles.emptyText}>Belum ada data profil</p>
          <p style={styles.emptySubtext}>Lakukan absensi terlebih dahulu</p>
        </div>
      )}
    </div>
  );

  const RecordsView = () => (
    <div style={{
      ...styles.card,
      padding: isMobile ? '1.25rem 1rem' : '1.5rem',
    }}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>📊 Riwayat Absensi</h2>
        <button onClick={loadAttendanceRecords} style={styles.refreshButton}>
          🔄
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tanggal</th>
              <th style={styles.th}>Waktu</th>
              <th style={styles.th}>Kemiripan</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.slice(0, 8).map((record, index) => (
              <tr key={index} style={styles.tr}>
                <td style={styles.td}>{new Date(record.timestamp).toLocaleDateString('id-ID')}</td>
                <td style={styles.td}>{new Date(record.timestamp).toLocaleTimeString('id-ID')}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.similarityBadge,
                    background: record.similarity > 0.7 ? '#d1fae5' : '#fef3c7',
                    color: record.similarity > 0.7 ? '#065f46' : '#92400e'
                  }}>
                    {(record.similarity * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={styles.statusBadge}>
                    {record.status === 'present' ? '✅' : '❌'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {attendanceRecords.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📊</div>
          <p style={styles.emptyText}>Belum ada riwayat absensi</p>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <div style={styles.logoIcon}></div>
            <div style={styles.textContainer}>
              <h1 style={styles.logoTitle}>Absensi Wajah</h1>
            </div>
          </div>
          
          <button 
            onClick={() => onNavigate && onNavigate('registration')}
            style={styles.registerButton}
          >
            👥 Daftar Baru
          </button>
        </div>
      </header>

      <NavigationTabs />

      <main style={styles.main}>
        {currentView === 'attendance' && <AttendanceView />}
        {currentView === 'profile' && <ProfileView />}
        {currentView === 'records' && <RecordsView />}
      </main>

      <Popup />

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
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
    fontFamily: "'Inter', -apple-system, sans-serif"
  },
  header: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 0'
  },
  headerContent: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  logoIcon: {
    fontSize: '2rem'
  },
  textContainer: {
    textAlign: 'left'
  },
  logoTitle: {
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  registerButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    backdropFilter: 'blur(10px)'
  },
  navContainer: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  navContent: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    padding: '0.5rem 1rem',
    gap: '0.5rem'
  },
  navTab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  navTabActive: {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white'
  },
  navTabIcon: {
    fontSize: '1.1rem'
  },
  navTabLabel: {
    fontSize: '0.85rem'
  },
  navTabActiveIndicator: {
    position: 'absolute',
    bottom: '-0.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '16px',
    height: '2px',
    background: 'white',
    borderRadius: '1px'
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '1.5rem 1rem'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  cardTitle: {
    color: '#1f2937',
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%'
  },
  statusText: {
    fontSize: '0.8rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  locationStatus: {
    background: 'rgba(248, 250, 252, 0.8)',
    border: '1px solid rgba(226, 232, 240, 0.5)',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '1.5rem'
  },
  locationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  locationIcon: {
    fontSize: '1rem'
  },
  locationTitle: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.9rem'
  },
  locationLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280',
    fontSize: '0.8rem'
  },
  locationSuccess: {
    color: '#065f46',
    fontWeight: '600',
    fontSize: '0.8rem'
  },
  locationWarning: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  locationWarningText: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: '0.8rem'
  },
  locationButton: {
    padding: '0.3rem 0.7rem',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  cameraSection: {
    position: 'relative',
    marginBottom: '1.5rem'
  },
  cameraContainer: {
    width: '100%',
    background: '#000',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb'
  },
  cameraPlaceholder: {
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
    fontSize: '2rem',
    marginBottom: '0.5rem',
    opacity: 0.8
  },
  placeholderText: {
    fontSize: '0.9rem',
    fontWeight: '500',
    margin: 0
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
    width: '150px',
    height: '150px',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.4)'
  },
  controls: {
    textAlign: 'center'
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    width: '100%',
    justifyContent: 'center'
  },
  successButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    width: '100%',
    justifyContent: 'center'
  },
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
    width: '100%'
  },
  refreshButton: {
    padding: '0.5rem',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  smallSpinner: {
    width: '12px',
    height: '12px',
    border: '2px solid #f3f4f6',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  currentUser: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #e0f2fe',
    fontSize: '0.85rem',
    color: '#0369a1'
  },
  currentUserTitle: {
    fontWeight: '600'
  },
  currentUserName: {
    fontWeight: '600',
    color: '#1f2937'
  },
  currentUserId: {
    color: '#6b7280'
  },
  profileContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  profileAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    margin: '0 0 0.25rem 0',
    color: '#1f2937',
    fontSize: '1.5rem',
    fontWeight: '600'
  },
  profileId: {
    margin: '0 0 0.5rem 0',
    color: '#6b7280',
    fontSize: '1rem'
  },
  profileConfidence: {
    margin: '0 0 1rem 0',
    color: '#6b7280',
    fontSize: '0.9rem'
  },
  profileStats: {
    display: 'flex',
    gap: '2rem'
  },
  statItem: {
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#667eea',
    marginBottom: '0.25rem'
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    background: '#f9fafb',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: '0.75rem',
    textAlign: 'left'
  },
  similarityBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  statusBadge: {
    fontSize: '0.9rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    opacity: 0.5
  },
  emptyText: {
    margin: '0 0 0.25rem 0',
    fontSize: '0.9rem'
  },
  emptySubtext: {
    margin: 0,
    fontSize: '0.8rem',
    opacity: 0.7
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
    borderRadius: '12px',
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  popupHeader: {
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  popupIcon: {
    fontSize: '1.25rem'
  },
  popupTitle: {
    margin: 0,
    fontWeight: '600'
  },
  popupContent: {
    
  },
  popupText: {
    margin: '0.5rem 0',
    lineHeight: '1.5',
    color: '#374151',
    fontSize: '0.9rem'
  },
  popupButtons: {
    
  },
  popupButton: {
    width: '100%',
    color: 'white',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '6px'
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
    padding: '1.5rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
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
    fontWeight: '500',
    fontSize: '0.9rem'
  }
};

const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default MainUserApp;
