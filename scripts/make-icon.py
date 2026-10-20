import os

from PIL import Image, ImageDraw

# 输出位置按脚本自身位置推导，不写死任何机器上的绝对路径
OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'apps', 'desktop', 'build', 'icon.png'))
S = 256
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([8, 8, S-8, S-8], radius=56, fill=(12, 19, 25, 255))
cx = cy = S / 2
for i in range(120):
    a0 = i * 3
    col = (int(53 + (180-53)*i/120), int(208 - (208-139)*i/120), int(165 + (255-165)*i/120), 255)
    r = 86
    d.arc([cx-r, cy-r, cx+r, cy+r], start=a0, end=a0+3.2, fill=col, width=10)
d.polygon([(cx, cy-44), (cx+40, cy), (cx, cy+44), (cx-40, cy)], fill=(10, 16, 22, 255), outline=(53, 208, 165, 255), width=3)
d.polygon([(cx, cy-22), (cx+20, cy), (cx, cy+22), (cx-20, cy)], fill=(53, 208, 165, 255))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT)
print('icon ok')
