"""
Color vocabulary used for CLIP-based detection.

We keep a mix of base colors and common shades so CLIP can produce
fine-grained names like "sky blue", which the LangChain agent can later
map to catalog colors.
"""

COLOR_CANDIDATES = [
    # Neutrals
    "black",
    "white",
    "off white",
    "cream",
    "ivory",
    "gray",
    "light gray",
    "dark gray",
    "charcoal",
    "silver",
    "beige",
    "tan",
    "brown",
    "dark brown",
    # Blues
    "blue",
    "navy blue",
    "royal blue",
    "sky blue",
    "light blue",
    "teal",
    "turquoise",
    # Reds / Pinks
    "red",
    "dark red",
    "burgundy",
    "maroon",
    "pink",
    "light pink",
    "hot pink",
    # Greens
    "green",
    "dark green",
    "olive green",
    "mint green",
    "lime green",
    # Yellows / Oranges
    "yellow",
    "mustard yellow",
    "gold",
    "orange",
    "burnt orange",
    # Purples
    "purple",
    "lavender",
    "violet",
    # Other / metallic
    "rose gold",
    "silver metallic",
    "gold metallic",
    "multicolor",
]
