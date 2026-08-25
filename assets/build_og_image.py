"""Builds assets/og-image.png: 1200x630 social-share preview card."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
NAVY = (20, 33, 61)
TEAL = (15, 118, 110)
WHITE = (255, 255, 255)
SLATE = (203, 213, 225)

img = Image.new("RGB", (W, H), NAVY)
draw = ImageDraw.Draw(img)

# Every string that reaches draw.text is recorded here, with the position and
# font it was drawn at, so the checks at the bottom of this file test whatever
# the script actually draws. Enumerating the lines by hand meant a line added
# later went unchecked; there is no hand-kept list any more.
DRAWN = []
_draw_text = draw.text


def _recording_text(xy, text, fill=None, font=None, **kwargs):
    DRAWN.append((xy, text, font))
    return _draw_text(xy, text, fill=fill, font=font, **kwargs)


draw.text = _recording_text

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

# Tagline. Wording tracks the page itself: these are an app, worksheets and a
# reference, not templates, and the site copy says so.
TAGLINE = [
    "Free P6 schedule health check, plus a lookahead app",
    "and worksheets for schedulers and planners.",
]
draw.text((margin, 320), TAGLINE[0], font=regular, fill=SLATE)
draw.text((margin, 366), TAGLINE[1], font=regular, fill=SLATE)

# Footer strip
FOOTER = "Nothing uploaded. Runs entirely in your browser."
draw.text((margin, H - 80), FOOTER, font=small, fill=SLATE)

# Nothing on this card may claim the products are templates, and nothing may
# run past the right margin. Checked against DRAWN, so a line added above is
# covered the moment it is drawn, whether or not anyone remembers to list it.
assert DRAWN, "nothing was drawn: the draw.text recorder is not wired up"
right_edge = W - margin
for (x, y), line, font in DRAWN:
    assert font is not None, f"drawn with no font, so its width cannot be checked: {line}"
    assert "template" not in line.lower(), f"template wording on the share card: {line}"
    end = x + draw.textlength(line, font=font)
    assert end <= right_edge, f"line overruns the card: {line} (ends at {end:.0f}px > {right_edge}px)"
    print(f"x={x:4.0f} end={end:6.0f}px  {line}")

img.save("og-image.png")
print("saved", img.size)
