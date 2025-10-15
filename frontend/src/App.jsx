// App.js
import React, { useState, useEffect } from 'react';
import UserRegistrationApp from './components/UserRegistrationApp';
import MainUserApp from './components/MainUserApp';
import AdminPanel from './components/AdminPanel';
import LoginApp from './components/LoginApp';
import AdminLogin from './components/AdminLogin';

const App = () => {
  const [currentApp, setCurrentApp] = useState('login');
  const [userData, setUserData] = useState(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  // Check URL path untuk routing
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      // Jika sudah login admin, langsung ke admin panel
      // Jika belum, ke admin login
      setCurrentApp(adminAuthenticated ? 'admin' : 'admin-login');
    } else {
      setCurrentApp('login');
    }
  }, [adminAuthenticated]);

  const navigateToApp = (appName, data = null) => {
    if (data) {
      setUserData(data);
    }
    
    if (appName === 'admin') {
      setAdminAuthenticated(true);
    }
    
    setCurrentApp(appName);
    
    // Update URL
    if (appName === 'admin-login' || appName === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else if (appName === 'login') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleLogout = (userType = 'user') => {
    if (userType === 'admin') {
      setAdminAuthenticated(false);
      setCurrentApp('admin-login');
      window.history.pushState({}, '', '/admin');
    } else {
      setUserData(null);
      setCurrentApp('login');
      window.history.pushState({}, '', '/');
    }
  };

  const renderCurrentApp = () => {
    switch (currentApp) {
      case 'login':
        return <LoginApp onNavigate={navigateToApp} />;
      case 'admin-login':
        return <AdminLogin onNavigate={navigateToApp} />;
      case 'registration':
        return <UserRegistrationApp onNavigate={navigateToApp} />;
      case 'main':
        return <MainUserApp 
          onNavigate={navigateToApp} 
          userData={userData} 
          onLogout={() => handleLogout('user')} 
        />;
      case 'admin':
        return <AdminPanel 
          onNavigate={navigateToApp} 
          onLogout={() => handleLogout('admin')} 
        />;
      default:
        return <LoginApp onNavigate={navigateToApp} />;
    }
  };

  return (
    <div>
      {renderCurrentApp()}
    </div>
  );
};

export default App;