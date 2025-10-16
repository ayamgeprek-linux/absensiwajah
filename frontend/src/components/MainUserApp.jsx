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

  const API_BASE = 'https://haritsdulloh-absensiwajah.hf.space'; // ganti sesuai URL Hugging Face kamu

  // 📍 Lokasi user
  const [userLocation, setUserLocation] = useState(null);

  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(loc);
          resolve(loc);
        },
        (err) => {
          reject(new Error('Gagal mendapatkan lokasi: ' + err.message));
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  // 🎥 Kamera
  const startCamera = async () => {
    try {
      setLoading(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraActive(true);
      setLoading(false);
    } catch (e) {
      showPopup('error', 'Kamera Gagal', e.message);
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    const video = videoContainerRef.current?.querySelector('video');
    if (!video) throw new Error('Kamera belum aktif');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
    });
  };

  // 🔥 API
  const callAPI = async (endpoint, data = null, method = 'POST') => {
    const options = { method, headers: {} };
    if (data instanceof FormData) {
      options.body = data;
    } else if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await res.text();

    try {
      const json = JSON.parse(text);
      if (!res.ok) throw new Error(json.error || 'Request gagal');
      return json;
    } catch {
      throw new Error('Server tidak merespon JSON valid');
    }
  };

  // 🧠 Ambil Absensi
  const takeAttendance = async () => {
    try {
      if (!cameraActive) {
        showPopup('warning', 'Kamera Belum Aktif', 'Aktifkan kamera dulu');
        return;
      }

      const img = await captureImage();
      const loc = await getUserLocation().catch(() => null);

      const formData = new FormData();
      formData.append('file', img, 'attendance.jpg');
      if (loc) {
        formData.append('latitude', loc.latitude);
        formData.append('longitude', loc.longitude);
      }

      setLoading(true);
      const result = await callAPI('/attendance', formData);
      setLoading(false);

      if (result.success) {
        const u = result.recognized_user;
        setUserProfile(u);
        await loadAttendanceRecords(u.user_id);
        showPopup('success', 'Absensi Berhasil 🎉', `Selamat ${u.name}!`);
      } else {
        showPopup('warning', 'Gagal', result.error || 'Wajah tidak dikenali');
      }
    } catch (e) {
      setLoading(false);
      showPopup('error', 'Gagal Absen', e.message);
    }
  };

  // 📊 Ambil data absensi
  const loadAttendanceRecords = async (userId = null) => {
    try {
      const res = await callAPI('/attendance-records', null, 'GET');
      if (res.success) {
        let records = res.records || [];
        if (userId) {
          records = records.filter(r => r.user_id === userId);
        }
        records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setAttendanceRecords(records);
      }
    } catch (e) {
      console.log('Gagal load records:', e.message);
    }
  };

  // 🔔 Popup
  const showPopup = (type, title, message) => setPopup({ type, title, message });
  const closePopup = () => setPopup(null);

  // 🎥 Render video saat kamera aktif
  useEffect(() => {
    if (cameraActive && streamRef.current && videoContainerRef.current) {
      const video = document.createElement('video');
      video.srcObject = streamRef.current;
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.borderRadius = '12px';
      videoContainerRef.current.innerHTML = '';
      videoContainerRef.current.appendChild(video);
    } else if (!cameraActive && videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
  }, [cameraActive]);

  useEffect(() => {
    if (userProfile) loadAttendanceRecords(userProfile.user_id);
  }, [userProfile]);

  // ===================== RENDER =====================

  const AttendanceView = () => (
    <div style={styles.card}>
      <h2>📷 Absensi Harian</h2>
      <div ref={videoContainerRef} style={styles.cameraContainer}></div>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        {!cameraActive ? (
          <button onClick={startCamera} style={styles.button}>🎥 Aktifkan Kamera</button>
        ) : (
          <>
            <button onClick={takeAttendance} style={styles.buttonGreen}>📸 Ambil Absensi</button>
            <button onClick={stopCamera} style={styles.buttonGray}>⏹️ Matikan</button>
          </>
        )}
      </div>
      {userProfile && (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p><strong>Nama:</strong> {userProfile.name}</p>
          <p><strong>ID:</strong> {userProfile.user_id}</p>
        </div>
      )}
    </div>
  );

  const ProfileView = () => (
    <div style={styles.card}>
      <h2>👤 Profil Saya</h2>
      {userProfile ? (
        <>
          <p>Nama: <strong>{userProfile.name}</strong></p>
          <p>ID: {userProfile.user_id}</p>
          <p>Total Absensi: {attendanceRecords.length}</p>
          <p>Absensi Hari Ini: {
            attendanceRecords.filter(r => 
              new Date(r.timestamp).toDateString() === new Date().toDateString()
            ).length
          }</p>
        </>
      ) : (
        <p>Belum ada data. Silakan lakukan absensi dulu.</p>
      )}
    </div>
  );

  const RecordsView = () => (
    <div style={styles.card}>
      <h2>📊 Riwayat Absensi</h2>
      {attendanceRecords.length === 0 ? (
        <p>Belum ada riwayat.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Waktu</th>
              <th>Kemiripan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.timestamp).toLocaleDateString('id-ID')}</td>
                <td>{new Date(r.timestamp).toLocaleTimeString('id-ID')}</td>
                <td>{(r.similarity * 100).toFixed(1)}%</td>
                <td>{r.status === 'present' ? '✅ Hadir' : '❌ Tidak'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1>🤖 Absensi Wajah</h1>
        <nav>
          <button onClick={() => setCurrentView('attendance')} style={styles.navBtn}>📷 Absensi</button>
          <button onClick={() => setCurrentView('profile')} style={styles.navBtn}>👤 Profil</button>
          <button onClick={() => setCurrentView('records')} style={styles.navBtn}>📊 Riwayat</button>
        </nav>
      </header>

      <main style={styles.main}>
        {currentView === 'attendance' && <AttendanceView />}
        {currentView === 'profile' && <ProfileView />}
        {currentView === 'records' && <RecordsView />}
      </main>

      {popup && (
        <div style={styles.popup}>
          <div style={styles.popupContent}>
            <h3>{popup.title}</h3>
            <p>{popup.message}</p>
            <button onClick={closePopup} style={styles.popupButton}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  app: { fontFamily: 'Inter, sans-serif', background: '#f0f4ff', minHeight: '100vh' },
  header: { background: '#6366f1', color: 'white', padding: '1rem', textAlign: 'center' },
  navBtn: { margin: '0 0.5rem', padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  main: { padding: '1.5rem', maxWidth: '800px', margin: 'auto' },
  card: { background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  button: { padding: '0.75rem 1.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  buttonGreen: { padding: '0.75rem 1.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '0.5rem' },
  buttonGray: { padding: '0.75rem 1.5rem', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  cameraContainer: { width: '100%', height: '360px', background: '#000', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  popup: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  popupContent: { background: 'white', padding: '1rem 2rem', borderRadius: '12px', textAlign: 'center' },
  popupButton: { marginTop: '1rem', padding: '0.5rem 1rem', border: 'none', background: '#6366f1', color: 'white', borderRadius: '6px', cursor: 'pointer' }
};

export default MainUserApp;
