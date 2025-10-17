// components/UserRegistrationApp.jsx
import React, { useState, useRef, useEffect } from "react";

const UserRegistrationApp = ({ onNavigate }) => {
  const [form, setForm] = useState({ name: "", userId: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [popup, setPopup] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const videoContainerRef = useRef(null);
  const streamRef = useRef(null);

  const API_BASE = "https://haritsdulloh-absensiwajah.hf.space";

  // ✅ Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ✅ Start camera
  const startCamera = async () => {
    try {
      setLoading(true);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: {
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 },
          facingMode: "user",
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      showPopup("error", "Kamera Error", "Tidak dapat mengakses kamera: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // ✅ Capture image
  const captureImage = () => {
    if (!videoContainerRef.current?.firstChild) {
      throw new Error("Kamera belum siap");
    }

    const video = videoContainerRef.current.firstChild;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = isMobile ? 320 : 640;
    canvas.height = isMobile ? 240 : 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) throw new Error("Gagal mengambil gambar");
          resolve(blob);
        },
        "image/jpeg",
        0.8
      );
    });
  };

  // ✅ Register user
  const registerUser = async (userData) => {
    try {
      if (!cameraActive) {
        showPopup("warning", "Kamera Belum Aktif", "Silakan aktifkan kamera terlebih dahulu");
        return false;
      }

      const imageBlob = await captureImage();

      const formData = new FormData();
      formData.append("file", imageBlob, `${userData.userId}.jpg`);
      formData.append("name", userData.name);
      formData.append("user_id", userData.userId);
      formData.append("password", userData.password);

      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("✅ Register result:", result);

      if (result.success) {
        showPopup(
          "success",
          "Registrasi Berhasil 🎉",
          `Selamat ${userData.name}!\n\n🆔 ${userData.userId}\n🔐 Password tersimpan\n⏰ ${new Date().toLocaleString(
            "id-ID"
          )}\n\nKlik "Lanjut ke Login" untuk masuk.`
        );
        return true;
      } else {
        throw new Error(result.error || "Registrasi gagal");
      }
    } catch (error) {
      console.error("❌ Register error:", error);
      showPopup("error", "Registrasi Gagal", error.message);
      return false;
    }
  };

  // ✅ Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.userId || !form.password) {
      showPopup("warning", "Data Tidak Lengkap", "Harap isi semua data");
      return;
    }
    if (form.password.length < 4) {
      showPopup("warning", "Password Terlalu Pendek", "Minimal 4 karakter");
      return;
    }

    const ok = await registerUser(form);
    if (ok) setForm({ name: "", userId: "", password: "" });
  };

  // ✅ Popup handler
  const showPopup = (type, title, message) => setPopup({ type, title, message });
  const closePopup = () => setPopup(null);

  // ✅ Render video
  useEffect(() => {
    if (cameraActive && streamRef.current && videoContainerRef.current) {
      videoContainerRef.current.innerHTML = "";
      const video = document.createElement("video");
      video.srcObject = streamRef.current;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      videoContainerRef.current.appendChild(video);
    } else if (!cameraActive && videoContainerRef.current) {
      videoContainerRef.current.innerHTML = "";
    }
  }, [cameraActive]);

  // ✅ Popup Component
  const Popup = () => {
    if (!popup) return null;

    const colors = {
      success: { icon: "✅", bg: "#10b981", btn: "#059669" },
      error: { icon: "❌", bg: "#ef4444", btn: "#dc2626" },
      warning: { icon: "⚠️", bg: "#f59e0b", btn: "#d97706" },
    };
    const c = colors[popup.type];

    return (
      <div style={styles.popupOverlay} onClick={closePopup}>
        <div style={styles.popupContainer} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...styles.popupHeader, background: c.bg }}>
            <span style={styles.popupIcon}>{c.icon}</span>
            <h3 style={styles.popupTitle}>{popup.title}</h3>
          </div>
          <div style={styles.popupContent}>
            {popup.message.split("\n").map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          <button
            style={{ ...styles.popupButton, background: c.btn }}
            onClick={() => {
              closePopup();
              if (popup.type === "success") onNavigate("login");
            }}
          >
            {popup.type === "success" ? "🔐 Lanjut ke Login" : "Tutup"}
          </button>
        </div>
      </div>
    );
  };

  // ✅ UI
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.logo}>🤖 Pendaftaran User</h1>
        <p style={styles.subtitle}>Daftarkan diri Anda untuk mulai menggunakan sistem absensi</p>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <div style={styles.cameraContainer}>
            {!cameraActive ? (
              <div style={styles.cameraPlaceholder}>
                <p>Kamera belum aktif</p>
                <button style={styles.primaryButton} onClick={startCamera}>
                  🎥 Aktifkan Kamera
                </button>
              </div>
            ) : (
              <div ref={videoContainerRef} style={styles.videoContainer}></div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              placeholder="Nama Lengkap"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="User ID"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.successButton} disabled={loading}>
              {loading ? "Mendaftarkan..." : "✅ Daftarkan User"}
            </button>

            {cameraActive && (
              <button type="button" style={styles.secondaryButton} onClick={stopCamera}>
                ⏹️ Matikan Kamera
              </button>
            )}
          </form>
        </div>
      </main>

      <Popup />
    </div>
  );
};

// ✅ Styles
const styles = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "Inter, sans-serif",
    color: "#1f2937",
  },
  header: { textAlign: "center", padding: "1.5rem", color: "white" },
  logo: { fontSize: "2rem", marginBottom: "0.5rem" },
  subtitle: { opacity: 0.9 },
  main: { display: "flex", justifyContent: "center", padding: "2rem" },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    width: "100%",
  },
  cameraContainer: {
    position: "relative",
    height: "250px",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "1.5rem",
    background: "#000",
  },
  videoContainer: { width: "100%", height: "100%" },
  cameraPlaceholder: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    gap: "1rem",
  },
  input: {
    width: "100%",
    marginBottom: "1rem",
    padding: "0.8rem",
    borderRadius: "8px",
    border: "2px solid #e5e7eb",
  },
  form: { display: "flex", flexDirection: "column" },
  primaryButton: {
    background: "#667eea",
    color: "white",
    border: "none",
    padding: "0.8rem 1.2rem",
    borderRadius: "8px",
    cursor: "pointer",
  },
  successButton: {
    background: "#10b981",
    color: "white",
    border: "none",
    padding: "0.8rem 1.2rem",
    borderRadius: "8px",
    cursor: "pointer",
  },
  secondaryButton: {
    marginTop: "0.5rem",
    background: "#f3f4f6",
    border: "none",
    padding: "0.8rem 1.2rem",
    borderRadius: "8px",
    cursor: "pointer",
  },
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  popupContainer: {
    background: "white",
    borderRadius: "12px",
    maxWidth: "400px",
    width: "90%",
    textAlign: "center",
    overflow: "hidden",
  },
  popupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    color: "white",
    padding: "1rem",
  },
  popupContent: { padding: "1rem" },
  popupIcon: { fontSize: "1.5rem" },
  popupTitle: { margin: 0 },
  popupButton: {
    color: "white",
    border: "none",
    width: "100%",
    padding: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default UserRegistrationApp;
    
