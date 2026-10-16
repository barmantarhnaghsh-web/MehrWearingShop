#!/usr/bin/env python3
"""
Generate flat-illustration SVG imagery for the MehrWearingShop demo catalog.

Outputs (committed to the repo, served by the Next.js app from /public):
  apps/web/public/images/products/*.svg   - garment flat-lays (4:5 portrait)
  apps/web/public/images/brands/*.svg     - monogram brand marks
  apps/web/public/images/products/placeholder.svg

Run:  python3 scripts/generate_images.py
"""
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PROD_DIR = os.path.join(ROOT, 'apps', 'web', 'public', 'images', 'products')
BRAND_DIR = os.path.join(ROOT, 'apps', 'web', 'public', 'images', 'brands')

W, H = 800, 1000  # 4:5 portrait, matches the product card frame


def scene(parts, bg1='#f2f0ea', bg2='#e7e3d9'):
    """Wrap garment markup in a studio-style canvas."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/>'
        '</linearGradient></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#bg)"/>'
        f'<ellipse cx="400" cy="870" rx="250" ry="34" fill="#000000" opacity="0.07"/>'
        + ''.join(parts) +
        '</svg>'
    )


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('wrote', os.path.relpath(path, ROOT))


# ---------------------------------------------------------------- garments
# Each garment draws into local coordinates centered on (400, ~470).

SHIRT_PATH = (
    'M-135,-185 L-90,-212 Q0,-165 90,-212 L135,-185 L250,-140 L300,150 L228,168 '
    'L182,-60 L175,230 Q0,260 -175,230 L-182,-60 L-228,168 L-300,150 L-250,-140 Z'
)


def g_tshirt(fabric, shade, accent, plain=False):
    p = ['<g transform="translate(400,470)">']
    p.append(
        '<path d="M-140,-190 L-95,-215 Q0,-165 95,-215 L140,-190 L245,-120 L205,-40 L165,-72 '
        f'L165,215 Q0,245 -165,215 L-165,-72 L-205,-40 L-245,-120 Z" fill="{fabric}" stroke="{shade}" stroke-width="4"/>'
    )
    p.append(f'<path d="M-95,-215 Q0,-165 95,-215 L60,-232 Q0,-195 -60,-232 Z" fill="{shade}"/>')
    p.append(f'<path d="M-165,-72 L-205,-40 M165,-72 L205,-40" stroke="{shade}" stroke-width="4" fill="none"/>')
    p.append(f'<path d="M-165,195 Q0,225 165,195" stroke="{shade}" stroke-width="4" fill="none" opacity="0.7"/>')
    if not plain:
        p.append(f'<path d="M-120,40 Q0,70 120,40" stroke="{accent}" stroke-width="8" fill="none" stroke-linecap="round"/>')
        p.append(f'<path d="M-120,95 Q0,125 120,95" stroke="{accent}" stroke-width="8" fill="none" stroke-linecap="round"/>')
    p.append('</g>')
    return p


def g_polo(fabric, shade, accent):
    p = ['<g transform="translate(400,470)">']
    p.append(
        '<path d="M-140,-190 L-95,-215 Q0,-165 95,-215 L140,-190 L245,-120 L205,-40 L165,-72 '
        f'L165,215 Q0,245 -165,215 L-165,-72 L-205,-40 L-245,-120 Z" fill="{fabric}" stroke="{shade}" stroke-width="4"/>'
    )
    p.append(f'<path d="M-45,-212 L-30,-130 L30,-130 L45,-212 L0,-180 Z" fill="{shade}"/>')
    p.append(f'<rect x="-14" y="-152" width="28" height="74" fill="{shade}"/>')
    p.append(f'<circle cx="0" cy="-132" r="5" fill="{accent}"/>')
    p.append(f'<circle cx="0" cy="-108" r="5" fill="{accent}"/>')
    p.append(f'<path d="M-165,-72 L-205,-40 M165,-72 L205,-40" stroke="{shade}" stroke-width="4" fill="none"/>')
    p.append(f'<path d="M-165,195 Q0,225 165,195" stroke="{shade}" stroke-width="4" fill="none" opacity="0.7"/>')
    p.append(f'<path d="M-60,-40 L-60,180 M60,-40 L60,180" stroke="{accent}" stroke-width="6" fill="none" opacity="0.35"/>')
    p.append('</g>')
    return p


def g_shirt(fabric, shade, accent, check=False):
    p = ['<g transform="translate(400,470)">']
    p.append(f'<path d="{SHIRT_PATH}" fill="{fabric}" stroke="{shade}" stroke-width="4"/>')
    if check:
        lines = []
        for x in range(-280, 300, 70):
            lines.append(f'<path d="M{x},-245 L{x + 10},255" stroke="{accent}" stroke-width="4" opacity="0.55"/>')
        for y in range(-215, 245, 70):
            lines.append(f'<path d="M-305,{y} L305,{y}" stroke="{accent}" stroke-width="4" opacity="0.55"/>')
        p.append(f'<defs><clipPath id="shirtclip"><path d="{SHIRT_PATH}"/></clipPath></defs>')
        p.append('<g clip-path="url(#shirtclip)">' + ''.join(lines) + '</g>')
    p.append(f'<path d="M-90,-212 L-8,-150 L0,-95 L8,-150 L90,-212 L45,-235 L0,-190 L-45,-235 Z" fill="{shade}"/>')
    p.append(f'<rect x="-13" y="-150" width="26" height="355" fill="{shade}" opacity="0.85"/>')
    for y in (-110, -35, 40, 115, 190):
        p.append(f'<circle cx="0" cy="{y}" r="6" fill="{accent}"/>')
    p.append(f'<path d="M60,-100 L135,-100 L135,-35 L97,-8 L60,-35 Z" fill="none" stroke="{shade}" stroke-width="4"/>')
    p.append(f'<path d="M247,105 L303,90 M-247,105 L-303,90" stroke="{accent}" stroke-width="6" fill="none"/>')
    p.append('</g>')
    return p


def g_pants(fabric, shade, accent, denim=False):
    waist = 175
    p = ['<g transform="translate(400,470)">']
    p.append(
        f'<path d="M-{waist},-300 L{waist},-300 L{waist + 10},-235 L150,235 L65,235 L0,-70 L-65,235 '
        f'L-150,235 L-{waist + 10},-235 Z" fill="{fabric}" stroke="{shade}" stroke-width="4"/>'
    )
    # waistband + belt loops
    p.append(f'<rect x="-{waist}" y="-330" width="{waist * 2}" height="34" rx="6" fill="{shade}"/>')
    p.append(f'<rect x="-{waist + 4}" y="-332" width="14" height="42" rx="4" fill="{fabric}"/>')
    p.append(f'<rect x="{waist - 10}" y="-332" width="14" height="42" rx="4" fill="{fabric}"/>')
    p.append('<rect x="-7" y="-332" width="14" height="42" rx="4" fill="%s"/>' % fabric)
    if denim:
        p.append(f'<rect x="-118" y="-330" width="60" height="26" rx="4" fill="{accent}" opacity="0.9"/>')
        p.append(f'<path d="M-150,-200 Q-95,-150 -40,-200 M150,-200 Q95,-150 40,-200" stroke="{accent}" stroke-width="5" fill="none" stroke-dasharray="12 9"/>')
        p.append(f'<path d="M0,-235 L0,-120" stroke="{accent}" stroke-width="5" stroke-dasharray="12 9"/>')
    else:
        p.append(f'<path d="M-150,-210 Q-95,-165 -45,-210 M150,-210 Q95,-165 45,-210" stroke="{shade}" stroke-width="4" fill="none"/>')
        p.append(f'<path d="M0,-235 L0,-140" stroke="{shade}" stroke-width="5"/>')
    p.append(f'<path d="M-150,205 L-65,205 M65,205 L150,205" stroke="{shade}" stroke-width="5"/>')
    p.append('</g>')
    return p


def g_sneaker(fabric, shade, accent, sporty=False):
    p = ['<g transform="translate(400,560)">']
    # outsole / midsole
    p.append('<path d="M-250,84 Q-268,110 -238,120 L238,120 Q268,110 258,84 Z" fill="#2b2a27"/>')
    p.append('<path d="M-252,58 Q-262,86 -238,90 L240,90 Q262,84 254,58 L246,40 L-244,40 Z" fill="#fbfaf7" stroke="#d9d5cb" stroke-width="3"/>')
    # upper
    p.append(
        '<path d="M-236,44 Q-240,-30 -170,-58 L-60,-92 Q10,-112 70,-88 L150,-40 '
        f'Q220,-8 244,20 L246,44 Z" fill="{fabric}" stroke="{shade}" stroke-width="4"/>'
    )
    p.append(f'<path d="M150,-40 Q215,-10 244,20 L246,44 L150,44 Z" fill="{shade}" opacity="0.45"/>')
    p.append(f'<path d="M-236,44 Q-240,-28 -172,-56 L-140,-40 Q-196,-8 -198,44 Z" fill="{shade}" opacity="0.6"/>')
    # tongue
    p.append(f'<path d="M-60,-92 Q-30,-118 6,-120 L26,-96 Q-20,-84 -46,-62 Z" fill="{shade}"/>')
    # laces + eyelets
    for x, y in ((-15, -30), (20, -50), (55, -70)):
        p.append(f'<path d="M{x},{y} L{x + 52},{y - 20}" stroke="{shade}" stroke-width="7" stroke-linecap="round"/>')
        p.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#2b2a27"/>')
    # side panel
    if sporty:
        p.append(f'<path d="M-95,-6 Q0,-72 95,-6 Q0,26 -95,-6 Z" fill="{accent}" opacity="0.85"/>')
    else:
        p.append(f'<path d="M-90,-10 Q10,-70 92,-14 Q10,20 -90,-10 Z" fill="{accent}" opacity="0.7"/>')
    p.append(f'<path d="M-230,30 Q0,58 240,30" stroke="{shade}" stroke-width="4" fill="none" stroke-dasharray="12 10"/>')
    p.append('</g>')
    return p


def g_formal_shoe(fabric, shade, accent):
    p = ['<g transform="translate(400,560)">']
    # stacked heel block, dropping below the sole line
    p.append('<path d="M-248,54 L-150,54 L-154,106 L-250,106 Z" fill="#241f1b"/>')
    # leather sole with a light toe spring
    p.append('<path d="M-250,56 L254,56 Q272,58 270,74 L266,90 Q264,98 252,98 L-242,98 Q-252,96 -252,84 Z" fill="#33302b"/>')
    # upper: tall heel counter, near-level vamp, blunt rounded toe box
    p.append(
        '<path d="M-246,60 L-246,-40 Q-244,-70 -210,-74 Q-176,-70 -140,-46 '
        'Q-40,-40 60,-30 Q160,-16 214,4 Q252,18 258,50 L260,60 Z" fill="'
        + fabric + '" stroke="' + shade + '" stroke-width="4"/>'
    )
    # shoe opening seen along the topline
    p.append('<path d="M-238,-62 Q-196,-64 -160,-54 Q-194,-58 -232,-52 Z" fill="#241f1b" opacity="0.9"/>')
    # toe cap panel + brogue perforations
    p.append('<path d="M118,-21 Q160,-16 214,4 Q252,18 258,50 L260,60 L118,60 Z" fill="' + shade + '" opacity="0.42"/>')
    for x, y in ((150, 4), (176, 12), (200, 22), (224, 34), (164, 20), (188, 30), (212, 42)):
        p.append('<circle cx="' + str(x) + '" cy="' + str(y) + '" r="5" fill="#ffffff" opacity="0.75"/>')
    # eyelet rows on the quarter (parallel to the topline, fully inside) + quarter seam below
    p.append('<path d="M-200,-57 L-146,-34 M-194,-43 L-146,-20 M-188,-30 L-146,-6" stroke="#f4f1ea" stroke-width="6" stroke-linecap="round"/>')
    for x, y in ((-200, -57), (-146, -34), (-194, -43), (-146, -20), (-188, -30), (-146, -6)):
        p.append('<circle cx="' + str(x) + '" cy="' + str(y) + '" r="5" fill="#2b2a27"/>')
    p.append('<path d="M-146,-2 Q-138,30 -136,60" fill="none" stroke="' + shade + '" stroke-width="3.5"/>')
    # topline stitch + toe-cap stitch
    p.append('<path d="M-220,-66 Q-172,-64 -146,-50" stroke="' + shade + '" stroke-width="3" fill="none" stroke-dasharray="9 8"/>')
    p.append('<path d="M118,-21 Q136,18 138,60" stroke="' + shade + '" stroke-width="3.5" fill="none" stroke-dasharray="10 8"/>')
    p.append('</g>')
    return p


def g_coat(fabric, shade, accent):
    p = ['<g transform="translate(400,480)">']
    p.append(
        '<path d="M-135,-215 L-85,-245 Q0,-190 85,-245 L135,-215 L255,-165 L315,175 L240,196 '
        f'L196,-70 L200,270 Q0,305 -200,270 L-196,-70 L-240,196 L-315,175 L-255,-165 Z" '
        f'fill="{fabric}" stroke="{shade}" stroke-width="4"/>'
    )
    p.append(f'<path d="M-85,-245 L-14,-140 L-30,-40 L-96,-190 Z" fill="{shade}"/>')
    p.append(f'<path d="M85,-245 L14,-140 L30,-40 L96,-190 Z" fill="{shade}"/>')
    p.append(f'<path d="M0,-140 L6,275" stroke="{shade}" stroke-width="5"/>')
    for y in (-70, 10, 90):
        p.append(f'<circle cx="34" cy="{y}" r="9" fill="{accent}"/>')
    p.append(f'<path d="M-150,60 L-70,60 M150,60 L70,60" stroke="{shade}" stroke-width="7" stroke-linecap="round"/>')
    p.append(f'<path d="M-198,240 Q0,275 198,240" stroke="{shade}" stroke-width="4" fill="none"/>')
    p.append('</g>')
    return p


def g_jacket(fabric, shade, accent, denim=False):
    p = ['<g transform="translate(400,480)">']
    p.append(
        '<path d="M-135,-210 L-88,-240 Q0,-185 88,-240 L135,-210 L250,-160 L300,130 L232,150 '
        f'L190,-60 L194,180 Q0,215 -194,180 L-190,-60 L-232,150 L-300,130 L-250,-160 Z" '
        f'fill="{fabric}" stroke="{shade}" stroke-width="4"/>'
    )
    p.append(f'<path d="M-88,-240 L-10,-165 L0,-120 L10,-165 L88,-240 L42,-262 L0,-215 L-42,-262 Z" fill="{shade}"/>')
    p.append(f'<path d="M0,-165 L0,185" stroke="{accent}" stroke-width="7" stroke-dasharray="10 8"/>')
    p.append(f'<rect x="-11" y="-176" width="22" height="30" rx="5" fill="{accent}"/>')
    p.append(f'<rect x="-150" y="-95" width="86" height="60" rx="8" fill="none" stroke="{shade}" stroke-width="4"/>')
    p.append(f'<rect x="64" y="-95" width="86" height="60" rx="8" fill="none" stroke="{shade}" stroke-width="4"/>')
    p.append(f'<path d="M-160,70 L-80,70 M160,70 L80,70" stroke="{shade}" stroke-width="7" stroke-linecap="round"/>')
    p.append(f'<rect x="-196" y="150" width="392" height="46" rx="10" fill="{shade}"/>')
    if not denim:
        p.append('<path d="M-190,173 L190,173" stroke="#f0ede6" stroke-width="4" stroke-dasharray="12 9"/>')
    p.append('</g>')
    return p


def g_belt(fabric, shade, accent):
    p = ['<g transform="translate(400,470)">']
    p.append(f'<path d="M-150,150 Q-170,-140 60,-170 Q230,-190 230,40 Q230,170 90,180" fill="none" stroke="{fabric}" stroke-width="56" stroke-linecap="round"/>')
    p.append(f'<path d="M-150,150 Q-170,-140 60,-170 Q230,-190 230,40 Q230,170 90,180" fill="none" stroke="{shade}" stroke-width="56" stroke-linecap="round" stroke-dasharray="3 64" opacity="0.55"/>')
    p.append('<rect x="-244" y="100" width="132" height="118" rx="18" fill="none" stroke="#c9a24b" stroke-width="22"/>')
    p.append('<path d="M-186,116 L-186,196" stroke="#c9a24b" stroke-width="16" stroke-linecap="round"/>')
    for x, y in ((150, 150), (178, 142), (206, 128)):
        p.append(f'<circle cx="{x}" cy="{y}" r="8" fill="#00000033"/>')
    p.append('</g>')
    return p


def g_sunglasses(fabric, shade, accent):
    p = ['<g transform="translate(400,460)">']
    p.append(f'<path d="M-252,-34 L-330,-6" stroke="{shade}" stroke-width="16" stroke-linecap="round"/>')
    p.append(f'<path d="M252,-34 L330,-6" stroke="{shade}" stroke-width="16" stroke-linecap="round"/>')
    p.append(
        f'<path d="M-244,-72 L-46,-72 Q-36,-70 -36,-58 L-46,52 Q-52,84 -88,84 L-176,84 '
        f'Q-216,84 -226,50 L-244,-56 Q-248,-72 -244,-72 Z" fill="{fabric}" stroke="{shade}" stroke-width="10"/>'
    )
    p.append(
        f'<path d="M244,-72 L46,-72 Q36,-70 36,-58 L46,52 Q52,84 88,84 L176,84 '
        f'Q216,84 226,50 L244,-56 Q248,-72 244,-72 Z" fill="{fabric}" stroke="{shade}" stroke-width="10"/>'
    )
    p.append(f'<path d="M-36,-52 Q0,-74 36,-52" fill="none" stroke="{shade}" stroke-width="12" stroke-linecap="round"/>')
    p.append('<path d="M-210,-46 L-90,-46 L-118,34 L-196,34 Z" fill="#ffffff" opacity="0.22"/>')
    p.append('<path d="M90,-46 L210,-46 L182,34 L104,34 Z" fill="#ffffff" opacity="0.16"/>')
    p.append('</g>')
    return p


def g_wallet(fabric, shade, accent):
    p = ['<g transform="translate(400,470)">']
    p.append(f'<rect x="-230" y="-150" width="460" height="300" rx="26" fill="{fabric}" stroke="{shade}" stroke-width="5"/>')
    p.append(f'<path d="M-230,0 L230,0" stroke="{shade}" stroke-width="5"/>')
    p.append(f'<rect x="-206" y="-126" width="412" height="252" rx="16" fill="none" stroke="{accent}" stroke-width="4" stroke-dasharray="14 11"/>')
    p.append(f'<rect x="-52" y="-24" width="104" height="48" rx="8" fill="{accent}" opacity="0.9"/>')
    p.append(f'<circle cx="-24" cy="0" r="6" fill="{shade}"/>')
    p.append(f'<circle cx="24" cy="0" r="6" fill="{shade}"/>')
    p.append('</g>')
    return p


def g_scarf(fabric, shade, accent):
    p = ['<g transform="translate(400,470)">']
    p.append(f'<path d="M-120,-160 Q0,-40 120,-160" fill="none" stroke="{fabric}" stroke-width="72" stroke-linecap="round"/>')
    p.append(f'<path d="M-120,-160 Q0,-40 120,-160" fill="none" stroke="{shade}" stroke-width="72" stroke-dasharray="4 46" opacity="0.6"/>')
    p.append(f'<path d="M-136,-40 L-176,230" stroke="{fabric}" stroke-width="76" stroke-linecap="round"/>')
    p.append(f'<path d="M136,-40 L176,230" stroke="{fabric}" stroke-width="76" stroke-linecap="round"/>')
    for x in range(-204, -140, 22):
        p.append(f'<path d="M{x},250 L{x},300" stroke="{fabric}" stroke-width="12" stroke-linecap="round"/>')
    for x in range(148, 212, 22):
        p.append(f'<path d="M{x},250 L{x},300" stroke="{fabric}" stroke-width="12" stroke-linecap="round"/>')
    p.append('</g>')
    return p


# ------------------------------------------------------------------- catalog
FABRIC = {
    'white': ('#f7f5f0', '#d6d1c5', '#b9b2a2'),
    'ivory': ('#efe7d7', '#d3c6ac', '#b09f7e'),
    'blue': ('#5b7fb0', '#3d5c88', '#2c4468'),
    'navy': ('#2e3d55', '#1f2b3d', '#151e2b'),
    'black': ('#33322f', '#1e1d1b', '#0f0f0e'),
    'denim': ('#4a6d99', '#35507a', '#e8c98a'),
    'beige': ('#cbb896', '#a8956f', '#8a7a58'),
    'olive': ('#6f7250', '#54573b', '#3d4029'),
    'red': ('#9d5050', '#7a3a3a', '#e8d9c5'),
    'brown': ('#7a5a40', '#5b412c', '#3e2c1d'),
    'grey': ('#9a978e', '#726f67', '#514e48'),
    'camel': ('#c19a63', '#9a7644', '#6f552e'),
    'charcoal': ('#4b4a46', '#33322f', '#1f1e1c'),
    'forest': ('#3f5d4a', '#2d4437', '#1e2f25'),
}

PRODUCTS = [
    # slug,                   shape,       color,      extra
    ('classic-oxford-shirt', 'shirt', 'white', {}),
    ('linen-summer-shirt', 'shirt', 'ivory', {}),
    ('check-casual-shirt', 'shirt', 'navy', {'check': True}),
    ('cotton-crew-tee', 'tshirt', 'black', {'plain': True}),
    ('classic-polo', 'polo', 'navy', {}),
    ('oversized-graphic-tee', 'tshirt', 'grey', {}),
    ('slim-jeans', 'pants', 'denim', {'denim': True}),
    ('chino-pants', 'pants', 'beige', {}),
    ('formal-trousers', 'pants', 'charcoal', {}),
    ('leather-sneakers', 'sneaker', 'white', {}),
    ('derby-formal-shoes', 'formal', 'brown', {}),
    ('running-sneakers', 'sneaker', 'black', {'sporty': True}),
    ('wool-overcoat', 'coat', 'camel', {}),
    ('denim-jacket', 'jacket', 'denim', {'denim': True}),
    ('bomber-jacket', 'jacket', 'olive', {}),
    ('leather-belt', 'belt', 'brown', {}),
    ('polarized-sunglasses', 'sunglasses', 'black', {}),
    ('bifold-leather-wallet', 'wallet', 'charcoal', {}),
    ('knit-wool-scarf', 'scarf', 'red', {}),
]

SHAPES = {
    'tshirt': g_tshirt, 'shirt': g_shirt, 'polo': g_polo, 'pants': g_pants,
    'sneaker': g_sneaker, 'formal': g_formal_shoe, 'coat': g_coat,
    'jacket': g_jacket, 'belt': g_belt, 'sunglasses': g_sunglasses,
    'wallet': g_wallet, 'scarf': g_scarf,
}


def main():
    for slug, shape, color, extra in PRODUCTS:
        fabric, shade, accent = FABRIC[color]
        parts = SHAPES[shape](fabric, shade, accent, **extra)
        # Dark garments sit better on a lighter backdrop and vice versa.
        bg = ('#efede7', '#e4e0d6') if color in ('black', 'navy', 'charcoal', 'forest') else ('#f2f0ea', '#e7e3d9')
        write(os.path.join(PROD_DIR, f'{slug}.svg'), scene(parts, *bg))

    # Fallback card image — a neutral tee.
    write(os.path.join(PROD_DIR, 'placeholder.svg'),
          scene(g_tshirt('#dedad0', '#c3bdb0', '#a8a294', plain=True)))

    # Brand monograms.
    brands = ['nike', 'adidas', 'levis', 'zara', 'hm', 'puma']
    letters = {'nike': 'N', 'adidas': 'A', 'levis': 'L', 'zara': 'Z', 'hm': 'HM', 'puma': 'P'}
    for b in brands:
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img">'
            '<rect width="240" height="240" rx="28" fill="#f4f2ec"/>'
            '<rect x="14" y="14" width="212" height="212" rx="20" fill="none" stroke="#ddd8cc" stroke-width="3"/>'
            f'<text x="120" y="152" text-anchor="middle" font-family="Georgia, serif" '
            f'font-size="{86 if len(letters[b]) == 1 else 64}" font-weight="bold" fill="#211f1c">{letters[b]}</text>'
            '</svg>'
        )
        write(os.path.join(BRAND_DIR, f'{b}.svg'), svg)

    print(f'\n{len(PRODUCTS)} product images + {len(brands)} brand marks + placeholder')


if __name__ == '__main__':
    main()
