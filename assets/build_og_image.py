"""Builds assets/og-image.png: 1200x630 social-share preview card."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
NAVY = (20, 33, 61)
TEAL = (15, 118, 110)
WHITE = (255, 255, 255)
SLATE = (203, 213, 225)

img = Image.new("RGB", (W, H), NAVY)
draw = ImageDraw.Draw(img)

# Thin teal accent bar at the top
draw.rectangle([0, 0, W, 10], fill=TEAL)

bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 78)
regular = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 34)
small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 26)

margin = 90

# Wordmark: "CPM" in white + "Toolkit" in teal, on one line
draw.text((margin, 200), "CPM", font=bold, fill=WHITE)
cpm_w = draw.textlength("CPM", font=bold)
draw.text((margin + cpm_w + 18, 200), "Toolkit", font=bold, fill=TEAL)

# Tagline
draw.text((margin, 320), "Free P6 schedule health check, plus practical", font=regular, fill=SLATE)
draw.text((margin, 366), "templates for schedulers and planners.", font=regular, fill=SLATE)

# Footer strip
draw.text((margin, H - 80), "Nothing uploaded. Runs entirely in your browser.", font=small, fill=SLATE)

img.save("og-image.png")
print("saved", img.size)
