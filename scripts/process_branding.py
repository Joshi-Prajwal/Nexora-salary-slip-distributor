import os
from PIL import Image

source_path = r"C:\Users\joshi\.gemini\antigravity-ide\brain\0388de6b-9434-440f-b010-a85c274e9217\.user_uploaded\media_1786738653902.jpg"
target_public_dir = r"C:\Users\joshi\Desktop\Nexora\public\branding"
target_assets_dir = r"C:\Users\joshi\Desktop\Nexora\src\assets\branding"
tauri_icons_dir = r"C:\Users\joshi\Desktop\Nexora\src-tauri\icons"

os.makedirs(target_public_dir, exist_ok=True)
os.makedirs(target_assets_dir, exist_ok=True)
os.makedirs(tauri_icons_dir, exist_ok=True)

# Open source logo image
img = Image.open(source_path).convert("RGBA")
print(f"Source logo loaded: {img.size}, mode: {img.mode}")

# Save main high-res PNG branding asset (1254x1254)
public_logo_path = os.path.join(target_public_dir, "nexora-logo.png")
assets_logo_path = os.path.join(target_assets_dir, "nexora-logo.png")
img.save(public_logo_path, format="PNG")
img.save(assets_logo_path, format="PNG")
print(f"Saved logo asset to: {public_logo_path}")

# Generate Tauri PNG icon sizes
img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "32x32.png"), format="PNG")
img.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "128x128.png"), format="PNG")
img.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "128x128@2x.png"), format="PNG")

# Generate Windows ICO containing multi-resolution sizes (16, 32, 48, 64, 128, 256)
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save(os.path.join(tauri_icons_dir, "icon.ico"), format="ICO", sizes=ico_sizes)

# Save ICNS format / fallback PNG copy
img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(tauri_icons_dir, "icon.icns"), format="PNG")

print("All Tauri and Windows branding icons generated successfully!")
