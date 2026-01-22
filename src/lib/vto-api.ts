/**
 * Virtual Try-On API Service
 * 
 * This service layer matches the exact backend API used by Streamlit frontend.
 * Endpoints are defined in VTryon_Updated/app.py
 * 
 * Base URL: Configured via VITE_VTO_API_URL environment variable
 * Default: https://vto-jshi.onrender.com (Render deployment)
 * Local override: Set VITE_VTO_API_URL=http://127.0.0.1:8000 for local development
 */

const VTO_BASE_URL = import.meta.env.VITE_VTO_API_URL ?? "https://vto-jshi.onrender.com";

// ==================================================
// ERROR HANDLING
// ==================================================

export class VtoApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "VtoApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleVtoResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    // Try to parse error response
    if (contentType.includes("application/json")) {
      try {
        const body = await res.json();
        const detail = body.detail || body.error || "Unknown error";
        throw new VtoApiError(detail, res.status, detail);
      } catch (e) {
        if (e instanceof VtoApiError) throw e;
      }
    }
    throw new VtoApiError(
      `Request failed with status ${res.status}`,
      res.status
    );
  }

  // For image responses, return as Blob
  if (contentType.includes("image/")) {
    return (await res.blob()) as unknown as T;
  }

  // For JSON responses
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  // Default: return as text
  return (await res.text()) as unknown as T;
}

// ==================================================
// TYPE DEFINITIONS
// ==================================================

export interface GetGarmentOptionsParams {
  gender: "male" | "female";
  category: "tshirts" | "pants" | "jackets" | "shoes";
  current_brand: "Nike" | "Adidas" | "Zara";
  current_size: string;
  target_brand: "Nike" | "Adidas" | "Zara";
}

export interface GarmentOption {
  sku_index: number;
  path: string;
  filename: string;
  image_base64: string;
}

export interface GetGarmentOptionsResponse {
  status: "success";
  mapped_size: string;
  garments: GarmentOption[];
}

export interface GenerateTryOnParams {
  garment_path: string;
  gender: "male" | "female";
  category: "tshirts" | "pants" | "jackets" | "shoes";
  user_image?: File;
}

export interface GenerateTryOnResponse {
  image: Blob;
}

export interface GetSupportedSizesParams {
  category: "tshirts" | "pants" | "jackets" | "shoes";
  gender: "male" | "female";
  brand: "Nike" | "Adidas" | "Zara";
}

export interface GetSupportedSizesResponse {
  status: "success";
  sizes: string[];
}

// ==================================================
// API FUNCTIONS (Matching Streamlit Backend)
// ==================================================

/**
 * Get Supported Sizes (New - for dynamic dropdown)
 * 
 * Matches backend endpoint: GET /get-supported-sizes
 * 
 * Returns valid sizes for a given category, gender, and brand.
 * Used to populate the size dropdown dynamically.
 */
export async function getSupportedSizes(
  params: GetSupportedSizesParams
): Promise<GetSupportedSizesResponse> {
  const url = `${VTO_BASE_URL}/get-supported-sizes?category=${params.category}&gender=${params.gender}&brand=${params.brand}`;

  try {
    const res = await fetch(url, {
      method: "GET",
    });

    return await handleVtoResponse<GetSupportedSizesResponse>(res);
  } catch (error) {
    if (error instanceof VtoApiError) {
      throw error;
    }
    // Handle network errors
    if (error instanceof TypeError) {
      const isNetworkError =
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed");

      if (isNetworkError) {
        throw new VtoApiError(
          `Could not connect to FastAPI backend at ${VTO_BASE_URL}. Please ensure the server is running.`,
          0
        );
      }
    }
    throw new VtoApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Step 1: Get Garment Options
 * 
 * Matches Streamlit endpoint: POST /get-garment-options
 * 
 * Returns available garment options based on size mapping and inventory.
 * This is called first to show available styles before generation.
 */
export async function getGarmentOptions(
  params: GetGarmentOptionsParams
): Promise<GetGarmentOptionsResponse> {
  const formData = new FormData();
  formData.append("gender", params.gender);
  formData.append("category", params.category);
  formData.append("current_brand", params.current_brand);
  formData.append("current_size", params.current_size);
  formData.append("target_brand", params.target_brand);

  const url = `${VTO_BASE_URL}/get-garment-options`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    return await handleVtoResponse<GetGarmentOptionsResponse>(res);
  } catch (error) {
    if (error instanceof VtoApiError) {
      throw error;
    }
    // Handle network errors
    if (error instanceof TypeError) {
      const isNetworkError = 
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed");
      
      if (isNetworkError) {
        throw new VtoApiError(
          `Could not connect to FastAPI backend at ${VTO_BASE_URL}. Please ensure the server is running.`,
          0
        );
      }
    }
    throw new VtoApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Step 2: Generate Try-On
 * 
 * Matches Streamlit endpoint: POST /generate-tryon
 * 
 * Generates the virtual try-on image using Gemini AI.
 * Requires a garment_path from Step 1.
 */
export async function generateTryOn(
  params: GenerateTryOnParams
): Promise<GenerateTryOnResponse> {
  const formData = new FormData();
  formData.append("garment_path", params.garment_path);
  formData.append("gender", params.gender);
  formData.append("category", params.category);

  if (params.user_image) {
    formData.append("user_image", params.user_image);
  }

  const url = `${VTO_BASE_URL}/generate-tryon`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const image = await handleVtoResponse<Blob>(res);

    return {
      image,
    };
  } catch (error) {
    if (error instanceof VtoApiError) {
      throw error;
    }
    // Handle network errors
    if (error instanceof TypeError) {
      const isNetworkError = 
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed");
      
      if (isNetworkError) {
        throw new VtoApiError(
          `Could not connect to FastAPI backend at ${VTO_BASE_URL}. Please ensure the server is running.`,
          0
        );
      }
    }
    throw new VtoApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Helper: Convert base64 image to Blob URL
 * Used for displaying garment options from backend
 */
export function base64ToBlobUrl(base64String: string): string {
  try {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error converting base64 to blob:", error);
    return "";
  }
}
