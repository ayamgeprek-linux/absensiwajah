// components/AdminPanel.js
import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ onNavigate }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [dashboardStats, setDashboardStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [availableMonths, setAvailableMonths] = useState([]);
  const [popup, setPopup] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));

  // 🔥 NEW: State untuk pengaturan lokasi
  const [locationSettings, setLocationSettings] = useState({
    enabled: false,
    latitude: -6.2088,
    longitude: 106.8456,
    radius: 100,
    location_name: 'Kantor Pusat'
  });
  const [testLocation, setTestLocation] = useState({
    latitude: '',
    longitude: ''
  });
  const [testResult, setTestResult] = useState(null);

  const API_BASE = 'http://127.0.0.1:5000';

  // 🔥 JWT API Call
  const callAPI = async (endpoint, data = null, method = 'POST') => {
    try {
      setLoading(true);
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token && !endpoint.includes('/admin/login')) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = { 
        method, 
        headers,
        credentials: 'include'
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      console.log(`🔄 Calling API: ${method} ${endpoint}`);
      
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 && token) {
          localStorage.removeItem('admin_token');
          setToken(null);
          setIsLoggedIn(false);
          showPopup('error', 'Session Expired', 'Silakan login kembali.');
        }
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

  // Popup handler
  const showPopup = (type, title, message) => {
    setPopup({ type, title, message });
    setTimeout(() => setPopup(null), 5000);
  };

  // 🔥 Check token on component mount
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, []);

  const verifyToken = async () => {
    try {
      const result = await callAPI('/admin/verify-token', { token });
      if (result.success && result.authenticated) {
        setIsLoggedIn(true);
        console.log('✅ Token verified, user authenticated');
        loadInitialData();
      } else {
        localStorage.removeItem('admin_token');
        setToken(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Token verification failed:', error);
      localStorage.removeItem('admin_token');
      setToken(null);
      setIsLoggedIn(false);
    }
  };

  // 🔥 NEW: Load location settings
  const loadLocationSettings = async () => {
    try {
      const result = await callAPI('/admin/location-settings', null, 'GET');
      if (result.success) {
        setLocationSettings(result.settings);
        console.log('✅ Location settings loaded');
      }
    } catch (error) {
      console.error('Failed to load location settings:', error);
    }
  };

  // 🔥 NEW: Update location settings
  const updateLocationSettings = async () => {
    try {
      const result = await callAPI('/admin/location-settings', locationSettings, 'POST');
      if (result.success) {
        showPopup('success', 'Berhasil', 'Pengaturan lokasi berhasil disimpan');
        setLocationSettings(result.settings);
      }
    } catch (error) {
      showPopup('error', 'Gagal', error.message);
    }
  };

  // 🔥 NEW: Test location
  const testLocationValidation = async () => {
    if (!testLocation.latitude || !testLocation.longitude) {
      showPopup('error', 'Error', 'Masukkan latitude dan longitude untuk testing');
      return;
    }

    try {
      const result = await callAPI('/admin/test-location', {
        latitude: parseFloat(testLocation.latitude),
        longitude: parseFloat(testLocation.longitude)
      }, 'POST');
      
      if (result.success) {
        setTestResult(result);
      }
    } catch (error) {
      showPopup('error', 'Test Gagal', error.message);
    }
  };

  // Admin Login dengan JWT
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('🔐 Attempting login...');
      const result = await callAPI('/admin/login', loginForm);
      
      if (result.success && result.token) {
        localStorage.setItem('admin_token', result.token);
        setToken(result.token);
        setIsLoggedIn(true);
        
        showPopup('success', 'Login Berhasil', 'Selamat datang di Admin Panel!');
        console.log('✅ Login successful, token saved');
        
        loadInitialData();
      }
    } catch (error) {
      console.error('Login error:', error);
      showPopup('error', 'Login Gagal', error.message);
    }
  };

  // Load initial data after login
  const loadInitialData = () => {
    loadDashboardStats();
    loadAvailableMonths();
    loadLocationSettings(); // 🔥 NEW: Load location settings
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setIsLoggedIn(false);
    setCurrentView('dashboard');
    setLoginForm({ username: '', password: '' });
    setDashboardStats(null);
    setUsers([]);
    setMonthlyRecords([]);
    
    showPopup('success', 'Logout Berhasil', 'Anda telah logout dari admin panel.');
  };

  // Load Data Functions
  const loadDashboardStats = async () => {
    try {
      const result = await callAPI('/admin/dashboard', null, 'GET');
      if (result.success) {
        setDashboardStats(result.statistics);
        console.log('✅ Dashboard stats loaded');
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await callAPI('/users', null, 'GET');
      if (result.success) {
        const usersArray = Object.values(result.users || {});
        setUsers(usersArray);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMonthlyRecords = async () => {
    try {
      const result = await callAPI(`/admin/monthly-records?month=${selectedMonth}`, null, 'GET');
      if (result.success) {
        setMonthlyRecords(result.records || []);
      }
    } catch (error) {
      console.error('Failed to load monthly records:', error);
      setMonthlyRecords([]);
    }
  };

  const loadAvailableMonths = async () => {
    try {
      const result = await callAPI('/admin/available-months', null, 'GET');
      if (result.success) {
        setAvailableMonths(result.months || []);
        console.log('✅ Available months loaded:', result.months);
      }
    } catch (error) {
      console.error('Failed to load available months:', error);
      setAvailableMonths([]);
    }
  };

  // Admin Actions
  const exportToExcel = async () => {
    try {
      setLoading(true);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`${API_BASE}/admin/export-excel?month=${selectedMonth}`, {
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `laporan-bulanan-${selectedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showPopup('success', 'Export Berhasil', `File Excel untuk bulan ${selectedMonth} berhasil diunduh.`);
      } else {
        throw new Error('Gagal mengunduh file Excel');
      }
    } catch (error) {
      console.error('Export error:', error);
      showPopup('error', 'Export Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const forceCleanup = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memindahkan SEMUA data ke riwayat bulanan?')) {
      return;
    }

    try {
      const result = await callAPI('/admin/cleanup', null, 'POST');
      if (result.success) {
        showPopup('success', 'Cleanup Berhasil', result.message);
        loadDashboardStats();
        loadAvailableMonths();
        loadMonthlyRecords();
      }
    } catch (error) {
      showPopup('error', 'Cleanup Gagal', error.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      return;
    }

    try {
      const result = await callAPI(`/admin/users/${userId}`, null, 'DELETE');
      if (result.success) {
        showPopup('success', 'User Dihapus', 'User berhasil dihapus.');
        loadUsers();
      }
    } catch (error) {
      showPopup('error', 'Hapus Gagal', error.message);
    }
  };

  // Effect hooks
  useEffect(() => {
    if (isLoggedIn && currentView === 'users') {
      loadUsers();
    }
  }, [isLoggedIn, currentView]);

  useEffect(() => {
    if (isLoggedIn && currentView === 'records') {
      loadMonthlyRecords();
    }
  }, [isLoggedIn, currentView, selectedMonth]);

  // Render login form
  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <h2>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                required
                placeholder="admin"
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
                placeholder="admin123"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
          <div className="login-info">
            <p><strong>Default credentials:</strong></p>
            <p>Username: <code>admin</code></p>
            <p>Password: <code>admin123</code></p>
          </div>
          <button onClick={() => onNavigate('home')} className="back-button">
            Kembali ke Home
          </button>
        </div>

        {popup && (
          <div className={`popup ${popup.type}`}>
            <h3>{popup.title}</h3>
            <p>{popup.message}</p>
            <button onClick={() => setPopup(null)} className="close-popup">
              Tutup
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render admin panel
  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-actions">
          <span className="welcome-text">Halo, Admin!</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
          <button onClick={() => onNavigate('home')} className="back-button">
            Kembali ke Home
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        <button 
          className={currentView === 'dashboard' ? 'active' : ''}
          onClick={() => setCurrentView('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={currentView === 'users' ? 'active' : ''}
          onClick={() => setCurrentView('users')}
        >
          👥 Kelola User
        </button>
        <button 
          className={currentView === 'records' ? 'active' : ''}
          onClick={() => setCurrentView('records')}
        >
          📅 Data Bulanan
        </button>
        {/* 🔥 NEW: Menu Pengaturan Lokasi */}
        <button 
          className={currentView === 'location' ? 'active' : ''}
          onClick={() => setCurrentView('location')}
        >
          📍 Pengaturan Lokasi
        </button>
      </nav>

      <main className="admin-content">
        {loading && <div className="loading">Loading...</div>}

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="dashboard">
            <h2>Dashboard Statistik</h2>
            
            {dashboardStats ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total User</h3>
                    <p>{dashboardStats.totalUsers}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Absensi</h3>
                    <p>{dashboardStats.totalTransactions}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Rata-rata Skor</h3>
                    <p>{dashboardStats.averageScore?.toFixed(1) || 0}%</p>
                  </div>
                  <div className="stat-card">
                    <h3>Bulan Aktif</h3>
                    <p>{dashboardStats.activeMonths}</p>
                  </div>
                </div>

                {/* 🔥 NEW: Location Stats */}
                <div className="location-stats">
                  <div className="stat-card location-card">
                    <h3>Verifikasi Lokasi</h3>
                    <p className={dashboardStats.location_enabled ? 'enabled' : 'disabled'}>
                      {dashboardStats.location_enabled ? 'AKTIF' : 'NON-AKTIF'}
                    </p>
                    {dashboardStats.invalid_location_today > 0 && (
                      <p className="invalid-location">
                        Lokasi Invalid Hari Ini: {dashboardStats.invalid_location_today}
                      </p>
                    )}
                  </div>
                </div>

                <div className="dashboard-actions">
                  <button onClick={exportToExcel} disabled={loading}>
                    {loading ? 'Exporting...' : '📥 Export ke Excel'}
                  </button>
                  <button onClick={forceCleanup} className="cleanup-btn">
                    🗃️ Pindahkan ke Riwayat
                  </button>
                </div>
              </>
            ) : (
              <div className="loading">Memuat statistik...</div>
            )}
          </div>
        )}

        {/* Users Management View */}
        {currentView === 'users' && (
          <div className="users-management">
            <h2>Kelola User</h2>
            <div className="users-list">
              {users.length > 0 ? (
                users.map(user => (
                  <div key={user.user_id} className="user-card">
                    <div className="user-info">
                      <h4>{user.name}</h4>
                      <p>ID: {user.user_id}</p>
                      <p>Bergabung: {new Date(user.registered_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="user-actions">
                      <button 
                        onClick={() => deleteUser(user.user_id)}
                        className="delete-btn"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  <p>Belum ada user yang terdaftar</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly Records View */}
        {currentView === 'records' && (
          <div className="monthly-records">
            <div className="records-header">
              <h2>Data Bulanan</h2>
              <div className="month-selector">
                <label>Pilih Bulan: </label>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString('id-ID', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={exportToExcel} disabled={loading}>
                {loading ? 'Exporting...' : '📥 Export Excel'}
              </button>
            </div>

            <div className="records-table">
              {monthlyRecords.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Tanggal</th>
                      <th>Waktu</th>
                      <th>Skor</th>
                      <th>Confidence</th>
                      <th>Lokasi</th> {/* 🔥 NEW: Kolom lokasi */}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRecords.map((record, index) => (
                      <tr key={index}>
                        <td>{record.name}</td>
                        <td>{new Date(record.timestamp).toLocaleDateString('id-ID')}</td>
                        <td>{record.time}</td>
                        <td>{(record.similarity * 100).toFixed(1)}%</td>
                        <td>
                          <span className={`confidence-badge ${record.confidence?.toLowerCase()}`}>
                            {record.confidence}
                          </span>
                        </td>
                        <td>
                          <span className={`location-badge ${record.location_verified ? 'valid' : 'invalid'}`}>
                            {record.location_verified ? '✅ Valid' : '❌ Invalid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">
                  <p>Tidak ada data absensi untuk bulan yang dipilih</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🔥 NEW: Location Settings View */}
        {currentView === 'location' && (
          <div className="location-settings">
            <h2>📍 Pengaturan Verifikasi Lokasi</h2>
            
            <div className="settings-card">
              <h3>Status Sistem</h3>
              <div className="toggle-setting">
                <label>
                  <input
                    type="checkbox"
                    checked={locationSettings.enabled}
                    onChange={(e) => setLocationSettings({
                      ...locationSettings,
                      enabled: e.target.checked
                    })}
                  />
                  Aktifkan Verifikasi Lokasi
                </label>
                <p className="setting-description">
                  Jika diaktifkan, user harus berada dalam radius tertentu untuk bisa absen
                </p>
              </div>
            </div>

            <div className="settings-card">
              <h3>Titik Lokasi Pusat</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nama Lokasi:</label>
                  <input
                    type="text"
                    value={locationSettings.location_name}
                    onChange={(e) => setLocationSettings({
                      ...locationSettings,
                      location_name: e.target.value
                    })}
                    placeholder="Contoh: Kantor Pusat"
                  />
                </div>
                <div className="form-group">
                  <label>Latitude:</label>
                  <input
                    type="number"
                    step="any"
                    value={locationSettings.latitude}
                    onChange={(e) => setLocationSettings({
                      ...locationSettings,
                      latitude: parseFloat(e.target.value) || 0
                    })}
                    placeholder="-6.2088"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude:</label>
                  <input
                    type="number"
                    step="any"
                    value={locationSettings.longitude}
                    onChange={(e) => setLocationSettings({
                      ...locationSettings,
                      longitude: parseFloat(e.target.value) || 0
                    })}
                    placeholder="106.8456"
                  />
                </div>
                <div className="form-group">
                  <label>Radius (meter):</label>
                  <input
                    type="number"
                    value={locationSettings.radius}
                    onChange={(e) => setLocationSettings({
                      ...locationSettings,
                      radius: parseInt(e.target.value) || 100
                    })}
                    placeholder="100"
                  />
                  <p className="setting-description">
                    Jarak maksimal dari titik pusat (dalam meter)
                  </p>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button onClick={updateLocationSettings} disabled={loading}>
                {loading ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
              </button>
            </div>

            {/* Test Location Section */}
            <div className="test-location">
              <h3>🧪 Test Validasi Lokasi</h3>
              <div className="test-form">
                <div className="form-group">
                  <label>Test Latitude:</label>
                  <input
                    type="number"
                    step="any"
                    value={testLocation.latitude}
                    onChange={(e) => setTestLocation({
                      ...testLocation,
                      latitude: e.target.value
                    })}
                    placeholder="-6.2088"
                  />
                </div>
                <div className="form-group">
                  <label>Test Longitude:</label>
                  <input
                    type="number"
                    step="any"
                    value={testLocation.longitude}
                    onChange={(e) => setTestLocation({
                      ...testLocation,
                      longitude: e.target.value
                    })}
                    placeholder="106.8456"
                  />
                </div>
                <button onClick={testLocationValidation} className="test-btn">
                  🎯 Test Lokasi
                </button>
              </div>

              {testResult && (
                <div className={`test-result ${testResult.valid ? 'valid' : 'invalid'}`}>
                  <h4>Hasil Test:</h4>
                  <p><strong>Status:</strong> {testResult.valid ? '✅ VALID' : '❌ TIDAK VALID'}</p>
                  <p><strong>Jarak:</strong> {testResult.distance}m dari {locationSettings.location_name}</p>
                  <p><strong>Radius Maksimal:</strong> {testResult.max_radius}m</p>
                  <p><strong>Pesan:</strong> {testResult.message}</p>
                </div>
              )}
            </div>

            <div className="location-info">
              <h4>💡 Cara Mendapatkan Koordinat:</h4>
              <ul>
                <li>Buka Google Maps di lokasi yang diinginkan</li>
                <li>Klik kanan pada titik lokasi</li>
                <li>Pilih "Apa di sini?"</li>
                <li>Salin angka latitude dan longitude yang muncul</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Popup Notification */}
      {popup && (
        <div className={`popup ${popup.type}`}>
          <h3>{popup.title}</h3>
          <p>{popup.message}</p>
          <button onClick={() => setPopup(null)} className="close-popup">
            Tutup
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;