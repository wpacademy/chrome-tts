from PIL import Image, ImageDraw, ImageFont

def create_icon(size, text):
    img = Image.new('RGBA', (size, size), (76, 175, 80, 255))
    draw = ImageDraw.Draw(img)
    
    try:
        font_size = max(size // 3, 8)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    return img

if __name__ == "__main__":
    sizes = [16, 48, 128]
    text = "🔊"
    
    for size in sizes:
        icon = create_icon(size, text)
        icon.save(f"F:\\opencode\\mini-app\\text-to-speech-extension\\icons\\icon{size}.png")
        print(f"Created icon{size}.png")
