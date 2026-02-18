from PIL import Image

# Create image with purple gradient background
width, height = 1152, 768
image = Image.new('RGB', (width, height), color=(102, 126, 234))

# Save the image
image.save('logo.png')
print("✓ Logo image created: logo.png")
