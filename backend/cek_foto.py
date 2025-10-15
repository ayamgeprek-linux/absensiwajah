from PIL import Image
import numpy as np
import os

def check_image(filename):
    try:
        img = Image.open(filename)
        print(f"Nama file: {filename}")
        print(f"Mode: {img.mode}")  # harus RGB atau L
        print(f"Ukuran: {img.size}")
        print(f"Progressive: {img.info.get('progressive', False)}")

        img = img.convert("RGB")
        img_np = np.array(img)
        print(f"Numpy dtype: {img_np.dtype}, shape: {img_np.shape}")

        if img_np.dtype == np.uint8 and len(img_np.shape) == 3 and img_np.shape[2] == 3:
            print("✅ Foto kompatibel dengan face_recognition")
        else:
            print("⚠️ Foto mungkin bermasalah untuk face_recognition")

    except Exception as e:
        print(f"❌ Error membuka foto: {e}")

# Ganti 'foto_s.jpg' dengan nama file foto kamu
check_image("foto_s.jpg")
