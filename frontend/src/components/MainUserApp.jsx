// components/MainUserApp.js
import React, { useState, useRef, useEffect } from 'react';

const MainUserApp = ({ onNavigate }) => {
  const [currentView, setCurrentView] = useState('attendance');
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [popup, setPopup] = useState(null);
  const videoContainerRef = useRef(null);
  const streamRef = useRef(null);

  // 🔥 NEW: State untuk lokasi
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const API_BASE = 'https://haritsdulloh-absensiwajah.hf.space';

  // 🔥 NEW: Dapatkan lokasi user
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung browser ini'));
        return;
      }

      setLocationLoading(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setUserLocation(location);
          setLocationLoading(false);
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Gagal mendapatkan lokasi: ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Izin lokasi ditolak';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Informasi lokasi tidak tersedia';
              break;
            case error.TIMEOUT:
              errorMessage += 'Request lokasi timeout';
              break;
            default:
              errorMessage += 'Error tidak diketahui';
          }
          setLocationError(errorMessage);
          setLocationLoading(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // 🔥 NEW: Request permission lokasi
  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      const location = await getUserLocation();
      showPopup('success', 'Lokasi Berhasil', 
        `Lokasi berhasil didapatkan!\n\n📍 Latitude: ${location.latitude.toFixed(6)}\n📍 Longitude: ${location.longitude.toFixed(6)}`
      );
      return location;
    } catch (error) {
      showPopup('warning', 'Lokasi Gagal', 
        `${error.message}\n\nAbsensi tetap bisa dilakukan tanpa lokasi, tetapi mungkin ditolak sistem.`
      );
      return null;
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setLoading(true);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
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

  // Capture Image
  const captureImage = () => {
    if (!videoContainerRef.current?.firstChild) {
      throw new Error('Kamera belum siap');
    }

    const video = videoContainerRef.current.firstChild;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Gagal mengambil gambar');
        resolve(blob);
      }, 'image/jpeg', 0.8);
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

  // Take Attendance
  const takeAttendance = async () => {
    try {
      if (!cameraActive) {
        showPopup('warning', 'Kamera Belum Aktif', 'Silakan aktifkan kamera terlebih dahulu');
        return;
      }

      // 🔥 NEW: Dapatkan lokasi sebelum absensi
      let location = userLocation;
      if (!location) {
        showPopup('info', 'Mendapatkan Lokasi', 'Sedang mendapatkan lokasi Anda...');
        location = await requestLocationPermission();
      }

      const imageBlob = await captureImage();
      const formData = new FormData();
      formData.append('file', imageBlob, 'attendance.jpg');

      // 🔥 NEW: Tambahkan data lokasi ke formData
      if (location) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
      }

      const result = await callAPI('/attendance', formData);
      
      if (result.success) {
        if (result.recognized_user) {
          const user = result.recognized_user;
          setUserProfile(user);
          
          // 🔥 NEW: Tampilkan info lokasi di popup
          let popupMessage = `Selamat ${user.name}!\n\n🆔 ${user.user_id}\n📊 Tingkat Kemiripan: ${(user.similarity * 100).toFixed(1)}%\n⏰ ${new Date().toLocaleTimeString('id-ID')}`;
          
          if (result.location) {
            popupMessage += `\n📍 ${result.location.message}`;
            if (!result.location.verified) {
              popupMessage += '\n\n⚠️ PERINGATAN: Lokasi tidak valid!';
            }
          }
          
          showPopup('success', 'Absensi Berhasil! 🎉', popupMessage);
        } else {
          showPopup('warning', 'Wajah Tidak Dikenali', 
            'Wajah tidak dikenali dalam sistem.\nPastikan Anda sudah terdaftar dan wajah terlihat jelas.'
          );
        }
        loadAttendanceRecords();
      } else {
        throw new Error(result.error || 'Absensi gagal');
      }
    } catch (error) {
      showPopup('error', 'Absensi Gagal', error.message);
    }
  };

  // Load Data Functions
  const loadAttendanceRecords = async () => {
    try {
      const result = await callAPI('/attendance-records', null, 'GET');
      if (result.success) {
        // Jika user sudah terdeteksi, filter recordsnya
        if (userProfile) {
          const userRecords = result.records.filter(record => 
            record.user_id === userProfile.user_id
          );
          setAttendanceRecords(userRecords);
        } else {
          // Kalau belum ada user terdeteksi, tampilkan semua records terbaru
          setAttendanceRecords(result.records.slice(0, 20));
        }
      }
    } catch (error) {
      console.error('Failed to load records:', error);
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
  }, [cameraActive, currentView]);

  useEffect(() => {
    loadAttendanceRecords();
  }, [userProfile]);

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
          <button 
            onClick={closePopup}
            style={{
              ...styles.popupButton,
              background: config.buttonColor
            }}
          >
            Mengerti
          </button>
        </div>
      </div>
    );
  };

  // 🔥 NEW: Location Status Component
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
          <span style={styles.locationCoords}>
            {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
          </span>
        </div>
      ) : (
        <div style={styles.locationWarning}>
          <span style={styles.locationWarningText}>⚠️ Lokasi Belum Siap</span>
          <button 
            onClick={requestLocationPermission}
            style={styles.locationButton}
          >
            Dapatkan Lokasi
          </button>
        </div>
      )}
    </div>
  );

  // Attendance View
  const AttendanceView = () => (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>📷 Absensi Harian</h2>
        <div style={styles.statusIndicator}>
          <div style={{
            ...styles.statusDot,
            background: cameraActive ? '#10b981' : '#ef4444'
          }}></div>
          <span>{cameraActive ? 'Kamera Aktif' : 'Kamera Nonaktif'}</span>
        </div>
      </div>
      
      {/* 🔥 NEW: Tampilkan status lokasi */}
      <LocationStatus />

      <div style={styles.cameraSection}>
        <div ref={videoContainerRef} style={styles.cameraContainer}>
          {!cameraActive && (
            <div style={styles.cameraPlaceholder}>
              <div style={styles.placeholderIcon}>📷</div>
              <p style={styles.placeholderText}>Kamera belum diaktifkan</p>
              <p style={styles.placeholderSubtext}>Klik tombol dibawah untuk memulai</p>
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
          <h4 style={styles.currentUserTitle}>User Terdeteksi:</h4>
          <div style={styles.currentUserInfo}>
            <span style={styles.currentUserName}>{userProfile.name}</span>
            <span style={styles.currentUserId}>({userProfile.user_id})</span>
          </div>
        </div>
      )}
    </div>
  );

  // Profile View
  const ProfileView = () => (
    <div style={styles.card}>
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
              🔒 Confidence: <strong>{userProfile.confidence}</strong>
            </p>
            
            <div style={styles.profileStats}>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>
                  {attendanceRecords.filter(record => 
                    new Date(record.timestamp).toDateString() === new Date().toDateString()
                  ).length}
                </span>
                <span style={styles.statLabel}>Absensi Hari Ini</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>
                  {attendanceRecords.length}
                </span>
                <span style={styles.statLabel}>Total Absensi</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statNumber}>
                  {userProfile.similarity ? (userProfile.similarity * 100).toFixed(1) + '%' : 'N/A'}
                </span>
                <span style={styles.statLabel}>Tingkat Kemiripan</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👤</div>
          <p style={styles.emptyText}>Belum ada data profil</p>
          <p style={styles.emptySubtext}>Lakukan absensi terlebih dahulu untuk melihat profil Anda</p>
        </div>
      )}
    </div>
  );

  // Records View
  const RecordsView = () => (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>📊 Riwayat Absensi Saya</h2>
        <button onClick={loadAttendanceRecords} style={styles.secondaryButton}>
          🔄 Refresh
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tanggal</th>
              <th style={styles.th}>Waktu</th>
              <th style={styles.th}>Kemiripan</th>
              <th style={styles.th}>Lokasi</th> {/* 🔥 NEW: Kolom lokasi */}
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((record, index) => (
              <tr key={index} style={styles.tr}>
                <td style={styles.td}>{new Date(record.timestamp).toLocaleDateString('id-ID')}</td>
                <td style={styles.td}>{new Date(record.timestamp).toLocaleTimeString('id-ID')}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.similarityBadge,
                    background: record.similarity > 0.7 ? '#d1fae5' : 
                               record.similarity > 0.5 ? '#fef3c7' : '#fee2e2',
                    color: record.similarity > 0.7 ? '#065f46' : 
                          record.similarity > 0.5 ? '#92400e' : '#991b1b'
                  }}>
                    {(record.similarity * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.locationBadge,
                    background: record.location_verified ? '#d1fae5' : '#fee2e2',
                    color: record.location_verified ? '#065f46' : '#991b1b'
                  }}>
                    {record.location_verified ? '✅ Valid' : '❌ Invalid'}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={styles.statusBadge}>
                    {record.status === 'present' ? '✅ Hadir' : '❌ Tidak Hadir'}
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
          <p style={styles.emptySubtext}>Lakukan absensi di menu Absensi</p>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <h1 style={styles.logoText}>🤖 Absensi Wajah</h1>
          </div>
          <nav style={styles.nav}>
            {[
              { id: 'attendance', label: 'Absensi', icon: '📷' },
              { id: 'profile', label: 'Profil', icon: '👤' },
              { id: 'records', label: 'Riwayat', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                style={{
                  ...styles.navItem,
                  ...(currentView === tab.id && styles.navItemActive)
                }}
              >
                <span style={styles.navIcon}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            <button 
              onClick={() => onNavigate && onNavigate('registration')}
              style={styles.backButton}
            >
              ↩️ Daftar Baru
            </button>
          </nav>
        </div>
      </header>

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

// 🔥 NEW: Tambahkan styles untuk lokasi
const styles = {
  // ... (semua styles sebelumnya tetap sama)
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  logoText: {
    color: '#1f2937',
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.8)',
    padding: '0.5rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#6b7280',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    fontSize: '14px'
  },
  navItemActive: {
    background: 'white',
    color: '#1f2937',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
  },
  navIcon: {
    fontSize: '1.1rem'
  },
  backButton: {
    padding: '0.75rem 1.25rem',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    fontSize: '14px',
    marginLeft: '0.5rem'
  },
  main: {
    maxWidth: '800px',
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  cardTitle: {
    color: '#1f2937',
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '500'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  cameraSection: {
    position: 'relative',
    marginBottom: '2rem'
  },
  cameraContainer: {
    width: '100%',
    height: '400px',
    background: '#000',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '2px solid #e5e7eb',
    position: 'relative'
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
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.8
  },
  placeholderText: {
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0'
  },
  placeholderSubtext: {
    fontSize: '0.9rem',
    opacity: 0.8,
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
    width: '250px',
    height: '250px',
    border: '3px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '20px',
    boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.4)'
  },
  controls: {
    textAlign: 'center'
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
  },
  successButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
  },
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  currentUser: {
    marginTop: '1rem',
    padding: '1rem',
    background: '#f0f9ff',
    borderRadius: '10px',
    border: '1px solid #e0f2fe'
  },
  currentUserTitle: {
    margin: '0 0 0.5rem 0',
    color: '#0369a1',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  currentUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  currentUserName: {
    color: '#1f2937',
    fontWeight: '600'
  },
  currentUserId: {
    color: '#6b7280',
    fontSize: '0.9rem'
  },
  profileContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  profileAvatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    margin: '0 0 0.5rem 0',
    color: '#1f2937',
    fontSize: '1.8rem',
    fontWeight: '700'
  },
  profileId: {
    margin: '0 0 0.5rem 0',
    color: '#6b7280',
    fontSize: '1.1rem'
  },
  profileConfidence: {
    margin: '0 0 1.5rem 0',
    color: '#6b7280',
    fontSize: '1rem'
  },
  profileStats: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  statItem: {
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: '2rem',
    fontWeight: '800',
    color: '#667eea',
    marginBottom: '0.25rem'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '1rem',
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
    padding: '1rem',
    textAlign: 'left'
  },
  similarityBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    background: '#d1fae5',
    color: '#065f46'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    opacity: 0.5
  },
  emptyText: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem'
  },
  emptySubtext: {
    margin: 0,
    fontSize: '0.9rem',
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
    borderRadius: '20px',
    maxWidth: '400px',
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
  popupButton: {
    width: '100%',
    padding: '1rem',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
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
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem auto'
  },
  loadingText: {
    margin: 0,
    color: '#374151',
    fontWeight: '500'
  },
  // NEW: Location Status Styles
  locationStatus: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  locationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem'
  },
  locationIcon: {
    fontSize: '1.2rem'
  },
  locationTitle: {
    fontWeight: '600',
    color: '#374151'
  },
  locationLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280'
  },
  locationSuccess: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  locationSuccessText: {
    color: '#065f46',
    fontWeight: '600'
  },
  locationCoords: {
    fontSize: '0.8rem',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  locationWarning: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  locationWarningText: {
    color: '#92400e',
    fontWeight: '600'
  },
  locationButton: {
    padding: '0.5rem 1rem',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #f3f4f6',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  locationBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
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

export default MainUserApp;
