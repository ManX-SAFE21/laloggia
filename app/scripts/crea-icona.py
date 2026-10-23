# Disegna l'icona del programma: il cerchio salvia con la piantina bianca (come il marchio nel menu,
# componente Leaf in src/screens/Lock.tsx). Uso, dalla cartella app:
#   python scripts/crea-icona.py            -> src-tauri/icons/sorgente-icona.png (1024x1024)
#   npm run tauri icon src-tauri/icons/sorgente-icona.png   -> tutte le misure (.ico, .png, ...)
from PIL import Image, ImageDraw

LATO = 1024
SUPER = 4  # si disegna 4 volte più grande e poi si rimpicciolisce: bordi lisci
SALVIA = (169, 186, 152, 255)  # --sage
BIANCO = (255, 253, 249, 255)  # --surface
PIANTA = 0.58  # parte del cerchio occupata dalla piantina (nel menu 22 px su 40)
TRATTO = 1.8  # spessore delle linee, in unità del disegno originale (24x24)


def bezier(p0, p1, p2, p3, passi=60):
    return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
                  for a, b, c, d in zip(p0, p1, p2, p3)) for t in (i / passi for i in range(passi + 1))]


def main():
    s = LATO * SUPER
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, s - 1, s - 1), fill=SALVIA)
    scala = s * PIANTA / 24
    origine = s * (1 - PIANTA) / 2
    pt = lambda p: (origine + p[0] * scala, origine + p[1] * scala)
    # i tre tratti del disegno originale (viewBox 24x24)
    linee = [
        [(12, 21), (12, 11)],  # stelo
        bezier((12, 13), (8, 13), (6, 10), (6, 6)) + bezier((6, 6), (10, 6), (12, 9), (12, 13)),  # foglia sinistra
        bezier((12, 11), (12, 7), (14, 4), (18, 4)) + bezier((18, 4), (18, 8), (16, 11), (12, 11)),  # foglia destra
    ]
    w = TRATTO * scala
    for l in linee:
        punti = [pt(p) for p in l]
        d.line(punti, fill=BIANCO, width=round(w))
        for x, y in punti:  # estremi e giunzioni arrotondati
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=BIANCO)
    img.resize((LATO, LATO), Image.LANCZOS).save("src-tauri/icons/sorgente-icona.png")
    print("creata src-tauri/icons/sorgente-icona.png")


if __name__ == "__main__":
    main()
