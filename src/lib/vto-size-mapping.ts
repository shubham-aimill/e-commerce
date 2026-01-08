// Size mapping logic ported from Python mapping.py
import type { Category, Gender, Brand } from "@/types/vto";

type SizeMap = Record<string, Record<string, Record<string, string>>>;

const CATEGORY_SIZE_MAP: Record<Category, Record<Gender, Record<Brand, SizeMap>>> = {
  tshirts: {
    male: {
      Nike: {
        S: { Adidas: "44", Zara: "S" },
        M: { Adidas: "46", Zara: "M" },
        L: { Adidas: "48", Zara: "L" },
      },
      Adidas: {
        "44": { Nike: "S", Zara: "S" },
        "46": { Nike: "M", Zara: "M" },
        "48": { Nike: "L", Zara: "L" },
      },
      Zara: {
        S: { Nike: "S", Adidas: "44" },
        M: { Nike: "M", Adidas: "46" },
        L: { Nike: "L", Adidas: "48" },
      },
    },
    female: {
      Nike: {
        S: { Adidas: "36", Zara: "S" },
        M: { Adidas: "38", Zara: "M" },
        L: { Adidas: "40", Zara: "L" },
      },
      Adidas: {
        "36": { Nike: "S", Zara: "S" },
        "38": { Nike: "M", Zara: "M" },
        "40": { Nike: "L", Zara: "L" },
      },
      Zara: {
        S: { Nike: "S", Adidas: "36" },
        M: { Nike: "M", Adidas: "38" },
        L: { Nike: "L", Adidas: "40" },
      },
    },
  },
  pants: {
    male: {
      Nike: {
        "32": { Adidas: "32", Zara: "32" },
        "34": { Adidas: "34", Zara: "34" },
        "36": { Adidas: "36", Zara: "36" },
      },
      Adidas: {
        "32": { Nike: "32", Zara: "32" },
        "34": { Nike: "34", Zara: "34" },
        "36": { Nike: "36", Zara: "36" },
      },
      Zara: {
        "32": { Nike: "32", Adidas: "32" },
        "34": { Nike: "34", Adidas: "34" },
        "36": { Nike: "36", Adidas: "36" },
      },
    },
    female: {
      Nike: {
        "26": { Adidas: "34", Zara: "34" },
        "28": { Adidas: "36", Zara: "36" },
        "30": { Adidas: "38", Zara: "38" },
      },
      Adidas: {
        "34": { Nike: "26", Zara: "34" },
        "36": { Nike: "28", Zara: "36" },
        "38": { Nike: "30", Zara: "38" },
      },
      Zara: {
        "34": { Nike: "26", Adidas: "34" },
        "36": { Nike: "28", Adidas: "36" },
        "38": { Nike: "30", Adidas: "38" },
      },
    },
  },
  jackets: {
    male: {
      Nike: {
        M: { Adidas: "46", Zara: "M" },
        L: { Adidas: "48", Zara: "L" },
      },
      Adidas: {
        "46": { Nike: "M", Zara: "M" },
        "48": { Nike: "L", Zara: "L" },
      },
      Zara: {
        M: { Nike: "M", Adidas: "46" },
        L: { Nike: "L", Adidas: "48" },
      },
    },
    female: {
      Nike: {
        S: { Adidas: "36", Zara: "S" },
        M: { Adidas: "38", Zara: "M" },
        L: { Adidas: "40", Zara: "L" },
      },
      Adidas: {
        "36": { Nike: "S", Zara: "S" },
        "38": { Nike: "M", Zara: "M" },
        "40": { Nike: "L", Zara: "L" },
      },
      Zara: {
        S: { Nike: "S", Adidas: "36" },
        M: { Nike: "M", Adidas: "38" },
        L: { Nike: "L", Adidas: "40" },
      },
    },
  },
  shoes: {
    male: {
      Nike: {
        "8": { Adidas: "42", Zara: "42" },
        "9": { Adidas: "43", Zara: "43" },
        "10": { Adidas: "44", Zara: "44" },
      },
      Adidas: {
        "42": { Nike: "8", Zara: "42" },
        "43": { Nike: "9", Zara: "43" },
        "44": { Nike: "10", Zara: "44" },
      },
      Zara: {
        "42": { Nike: "8", Adidas: "42" },
        "43": { Nike: "9", Adidas: "43" },
        "44": { Nike: "10", Adidas: "44" },
      },
    },
    female: {
      Nike: {
        "6": { Adidas: "38", Zara: "38" },
        "7": { Adidas: "39", Zara: "39" },
        "8": { Adidas: "40", Zara: "40" },
      },
      Adidas: {
        "38": { Nike: "6", Zara: "38" },
        "39": { Nike: "7", Zara: "39" },
        "40": { Nike: "8", Zara: "40" },
      },
      Zara: {
        "38": { Nike: "6", Adidas: "38" },
        "39": { Nike: "7", Adidas: "39" },
        "40": { Nike: "8", Adidas: "40" },
      },
    },
  },
};

/**
 * Retrieves the mapped size based on brand, category, and gender
 * @param category - Product category (tshirts, pants, jackets, shoes)
 * @param gender - Gender (male, female)
 * @param fromBrand - Source brand
 * @param fromSize - Source size
 * @param toBrand - Target brand
 * @returns Mapped size or null if not found
 */
export function getMappedSizeByCategory(
  category: Category,
  gender: Gender,
  fromBrand: Brand,
  fromSize: string,
  toBrand: Brand
): string | null {
  try {
    const sizeMap = CATEGORY_SIZE_MAP[category]?.[gender]?.[fromBrand]?.[fromSize];
    if (!sizeMap) {
      return null;
    }
    
    const mappedSize = sizeMap[toBrand];
    return mappedSize || null;
  } catch {
    return null;
  }
}

/**
 * Get all available sizes for a brand, category, and gender
 */
export function getAvailableSizes(
  category: Category,
  gender: Gender,
  brand: Brand
): string[] {
  try {
    const brandMap = CATEGORY_SIZE_MAP[category]?.[gender]?.[brand];
    if (!brandMap) {
      return [];
    }
    return Object.keys(brandMap);
  } catch {
    return [];
  }
}



