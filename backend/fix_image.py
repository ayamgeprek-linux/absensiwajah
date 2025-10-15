from PIL import Image
import sys

# Ganti ini sesuai nama file kamu
input_path = "foto_a.jpg"
output_path = "foto_fixed.jpg"

# Buka gambar lalu konversi ke RGB
img = Image.open(input_path).convert("RGB")
img.save(output_path, "JPEG")

print(f"Gambar berhasil dikonversi: {output_path}")
