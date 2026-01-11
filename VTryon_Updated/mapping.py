# mapping.py
# ==================================================
# SIZE MAPPING FOR VIRTUAL TRY-ON
# Categories:
# - tshirts
# - pants
# - jackets
# - shoes
# Genders:
# - male
# - female
# Brands:
# - nike
# - adidas
# - zara
# ==================================================

# --------------------------------------------------
# 1. LEGACY MAPPING (DO NOT BREAK EXISTING APP)
# Nike 40 = Adidas 44 = Zara M
# --------------------------------------------------

LEGACY_SIZE_MAP = {
    "nike": {
        "40": {"adidas": "44", "zara": "M"},
        "42": {"adidas": "46", "zara": "L"}
    },
    "adidas": {
        "44": {"nike": "40", "zara": "M"},
        "46": {"nike": "42", "zara": "L"}
    }
}

def get_mapped_size(from_brand, from_size, to_brand):
    """Legacy function – DO NOT MODIFY"""
    try:
        return LEGACY_SIZE_MAP[from_brand.lower()][str(from_size)][to_brand.lower()]
    except KeyError:
        return None


# --------------------------------------------------
# 2. CATEGORY + GENDER AWARE MAPPINGS
# --------------------------------------------------

CATEGORY_SIZE_MAP = {

    # =======================
    # T-SHIRTS
    # =======================
    "tshirts": {
        "male": {
            "nike": {
                "S": {"adidas": "44", "zara": "S"},
                "M": {"adidas": "46", "zara": "M"},
                "L": {"adidas": "48", "zara": "L"},
            },
            "adidas": {
                "44": {"nike": "S", "zara": "S"},
                "46": {"nike": "M", "zara": "M"},
                "48": {"nike": "L", "zara": "L"},
            },
            "zara": {
                "S": {"nike": "S", "adidas": "44"},
                "M": {"nike": "M", "adidas": "46"},
                "L": {"nike": "L", "adidas": "48"},
            }
        },
        "female": {
            "nike": {
                "S": {"adidas": "36", "zara": "S"},
                "M": {"adidas": "38", "zara": "M"},
                "L": {"adidas": "40", "zara": "L"},
            },
            "adidas": {
                "36": {"nike": "S", "zara": "S"},
                "38": {"nike": "M", "zara": "M"},
                "40": {"nike": "L", "zara": "L"},
            },
            "zara": {
                "S": {"nike": "S", "adidas": "36"},
                "M": {"nike": "M", "adidas": "38"},
                "L": {"nike": "L", "adidas": "40"},
            }
        }
    },

    # =======================
    # PANTS
    # =======================
    "pants": {
        "male": {
            "nike": {
                "32": {"adidas": "32", "zara": "32"},
                "34": {"adidas": "34", "zara": "34"},
                "36": {"adidas": "36", "zara": "36"},
            },
            "adidas": {
                "32": {"nike": "32", "zara": "32"},
                "34": {"nike": "34", "zara": "34"},
                "36": {"nike": "36", "zara": "36"},
            },
            "zara": {
                "32": {"nike": "32", "adidas": "32"},
                "34": {"nike": "34", "adidas": "34"},
                "36": {"nike": "36", "adidas": "36"},
            }
        },
        "female": {
            "nike": {
                "26": {"adidas": "34", "zara": "34"},
                "28": {"adidas": "36", "zara": "36"},
                "30": {"adidas": "38", "zara": "38"},
            },
            "adidas": {
                "34": {"nike": "26", "zara": "34"},
                "36": {"nike": "28", "zara": "36"},
                "38": {"nike": "30", "zara": "38"},
            },
            "zara": {
                "34": {"nike": "26", "adidas": "34"},
                "36": {"nike": "28", "adidas": "36"},
                "38": {"nike": "30", "adidas": "38"},
            }
        }
    },

    # =======================
    # JACKETS
    # =======================
    "jackets": {
        "male": {
            "nike": {
                "M": {"adidas": "46", "zara": "M"},
                "L": {"adidas": "48", "zara": "L"},
            },
            "adidas": {
                "46": {"nike": "M", "zara": "M"},
                "48": {"nike": "L", "zara": "L"},
            },
            "zara": {
                "M": {"nike": "M", "adidas": "46"},
                "L": {"nike": "L", "adidas": "48"},
            }
        },
        "female": {
            "nike": {
                "S": {"adidas": "36", "zara": "S"},
                "M": {"adidas": "38", "zara": "M"},
                "L": {"adidas": "40", "zara": "L"},
            },
            "adidas": {
                "36": {"nike": "S", "zara": "S"},
                "38": {"nike": "M", "zara": "M"},
                "40": {"nike": "L", "zara": "L"},
            },
            "zara": {
                "S": {"nike": "S", "adidas": "36"},
                "M": {"nike": "M", "adidas": "38"},
                "L": {"nike": "L", "adidas": "40"},
            }
        }
    },

    # =======================
    # SHOES
    # =======================
    "shoes": {
        "male": {
            "nike": {
                "8": {"adidas": "42", "zara": "42"},
                "9": {"adidas": "43", "zara": "43"},
                "10": {"adidas": "44", "zara": "44"},
            },
            "adidas": {
                "42": {"nike": "8", "zara": "42"},
                "43": {"nike": "9", "zara": "43"},
                "44": {"nike": "10", "zara": "44"},
            },
            "zara": {
                "42": {"nike": "8", "adidas": "42"},
                "43": {"nike": "9", "adidas": "43"},
                "44": {"nike": "10", "adidas": "44"},
            }
        },
        "female": {
            "nike": {
                "6": {"adidas": "38", "zara": "38"},
                "7": {"adidas": "39", "zara": "39"},
                "8": {"adidas": "40", "zara": "40"},
            },
            "adidas": {
                "38": {"nike": "6", "zara": "38"},
                "39": {"nike": "7", "zara": "39"},
                "40": {"nike": "8", "zara": "40"},
            },
            "zara": {
                "38": {"nike": "6", "adidas": "38"},
                "39": {"nike": "7", "adidas": "39"},
                "40": {"nike": "8", "adidas": "40"},
            }
        }
    }
}

# --------------------------------------------------
# 3. CATEGORY-AWARE LOOKUP FUNCTION
# --------------------------------------------------

# def get_mapped_size_by_category(
#     category,
#     gender,
#     from_brand,
#     from_size,
#     to_brand
# ):
#     """Retrieves the mapped size based on brand, category, and gender"""
#     try:
#         return CATEGORY_SIZE_MAP[
#             category
#         ][
#             gender
#         ][
#             from_brand.lower()
#         ][
#             str(from_size)
#         ][
#             to_brand.lower()
#         ]
#     except KeyError:
#         return None
def get_mapped_size_by_category(category, gender, from_brand, from_size, to_brand):
    """Retrieves the mapped size with safety checks for case sensitivity"""
    try:
        # 1. Normalize Category and Gender
        # This handles inputs like "T-Shirts" -> "tshirts" or "Male" -> "male"
        cat_key = category.lower().replace("-", "").strip()
        gen_key = gender.lower().strip()
        
        # 2. Normalize Brands
        from_b_key = from_brand.lower().strip()
        to_b_key = to_brand.lower().strip()

        # 3. Normalize Size
        # If input is "m", convert to "M" (to match your dictionary keys). 
        # If input is "42", keep as "42".
        size_str = str(from_size).strip()
        if size_str.isalpha():
            size_key = size_str.upper() 
        else:
            size_key = size_str 

        # 4. Perform the lookup
        return CATEGORY_SIZE_MAP[cat_key][gen_key][from_b_key][size_key][to_b_key]

    except KeyError as e:
        # This print will show up in your terminal so you know exactly what failed
        print(f"DEBUG: Mapping failed. Looking for path: [{cat_key}][{gen_key}][{from_b_key}][{size_key}][{to_b_key}]")
        print(f"DEBUG: The specific key missing was: {e}")
        return None