"""Named label colors shared by the API and the default project labels."""

import re

HEX_COLOR = re.compile(r'^#[0-9a-f]{6}$')

LABEL_PALETTE = (
    {'name': 'clay', 'hex': '#c4532a'},
    {'name': 'sea', 'hex': '#2a6f97'},
    {'name': 'pine', 'hex': '#2f7d4a'},
    {'name': 'wine', 'hex': '#8c2f39'},
    {'name': 'amber', 'hex': '#c4922a'},
    {'name': 'slate', 'hex': '#5f6b57'},
)


def resolve_label_color(value: str) -> str:
    text = (value or '').strip().lower()
    for swatch in LABEL_PALETTE:
        if text == swatch['name'] or text == swatch['hex']:
            return swatch['hex']
    if HEX_COLOR.fullmatch(text):
        return text
    return ''


def palette_name_for(hex_color: str) -> str:
    text = (hex_color or '').lower()
    for swatch in LABEL_PALETTE:
        if swatch['hex'] == text:
            return swatch['name']
    return ''
