const COLOR_MISMATCH_BASE_URL = import.meta.env.VITE_COLOR_MISMATCH_API_URL ?? "http://127.0.0.1:8020";

export interface ColorMismatchHealthResponse {
  status: string;
}

export interface ColorDetectionResult {
  detected_color: string;
  detected_confidence: number | null;
  top_candidates: Array<[string, number]>;
  fallback_model?: string;
  reason?: string;
}

export interface ColorMatchResult {
  expected_color: string;
  detected_color: string;
  verdict: "Match" | "Mismatch";
}

export interface DetectAndMatchResult {
  detection: ColorDetectionResult;
  expected_color: string;
  verdict: "Match" | "Mismatch";
}

export interface DatasetRow {
  // Flexible shape – we expose raw CSV records
  [key: string]: unknown;
}

export interface DatasetResponse {
  rows: DatasetRow[];
  color_column: string | null;
  name_column: string | null;
}

export class ColorMismatchApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ColorMismatchApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleColorMismatchResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    // Try to parse error response
    if (contentType.includes("application/json")) {
      try {
        const body = await res.json();
        const detail = body.detail || body.error || "Unknown error";
        throw new ColorMismatchApiError(detail, res.status, detail);
      } catch (e) {
        if (e instanceof ColorMismatchApiError) throw e;
      }
    }
    throw new ColorMismatchApiError(
      `Request failed with status ${res.status}`,
      res.status
    );
  }

  // For JSON responses
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  // Default: return as text
  return (await res.text()) as unknown as T;
}

/**
 * Check the health status of the Color Mismatch backend
 */
export async function checkColorMismatchHealth(): Promise<ColorMismatchHealthResponse> {
  const url = `${COLOR_MISMATCH_BASE_URL}/health`;

  try {
    const res = await fetch(url, {
      method: "GET",
    });

    return await handleColorMismatchResponse<ColorMismatchHealthResponse>(res);
  } catch (error) {
    if (error instanceof ColorMismatchApiError) {
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
        throw new ColorMismatchApiError(
          `Backend offline at ${COLOR_MISMATCH_BASE_URL}. The CLIP model may still be loading (takes 1-2 minutes on first run).`,
          0
        );
      }
    }
    throw new ColorMismatchApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Fetch the processed dataset (CSV) used by the color mismatch detector.
 */
export async function getColorMismatchDataset(): Promise<DatasetResponse> {
  const url = `${COLOR_MISMATCH_BASE_URL}/dataset`;

  try {
    const res = await fetch(url, {
      method: "GET",
    });

    return await handleColorMismatchResponse<DatasetResponse>(res);
  } catch (error) {
    if (error instanceof ColorMismatchApiError) {
      throw error;
    }
    if (error instanceof TypeError) {
      const isNetworkError =
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed");

      if (isNetworkError) {
        throw new ColorMismatchApiError(
          `Could not load dataset from FastAPI backend at ${COLOR_MISMATCH_BASE_URL}. Please ensure the server is running.`,
          0
        );
      }
    }
    throw new ColorMismatchApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Detect color from an image
 */
export async function detectColor(
  file: File,
  topK: number = 3,
  confidenceThreshold: number = 0.25
): Promise<ColorDetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("top_k", topK.toString());
  formData.append("confidence_threshold", confidenceThreshold.toString());

  const url = `${COLOR_MISMATCH_BASE_URL}/detect-color`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    return await handleColorMismatchResponse<ColorDetectionResult>(res);
  } catch (error) {
    if (error instanceof ColorMismatchApiError) {
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
        throw new ColorMismatchApiError(
          `Could not connect to FastAPI backend at ${COLOR_MISMATCH_BASE_URL}. Please ensure the server is running.`,
          0
        );
      }
    }
    throw new ColorMismatchApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Match expected color with detected color
 */
export async function matchColor(
  expectedColor: string,
  detectedColor: string
): Promise<ColorMatchResult> {
  const formData = new FormData();
  formData.append("expected_color", expectedColor);
  formData.append("detected_color", detectedColor);

  const url = `${COLOR_MISMATCH_BASE_URL}/match-color`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    return await handleColorMismatchResponse<ColorMatchResult>(res);
  } catch (error) {
    if (error instanceof ColorMismatchApiError) {
      throw error;
    }
    if (error instanceof TypeError) {
      const isNetworkError = 
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed");
      
      if (isNetworkError) {
        throw new ColorMismatchApiError(
          `Could not connect to FastAPI backend at ${COLOR_MISMATCH_BASE_URL}. Please ensure the server is running.`,
          0
        );
      }
    }
    throw new ColorMismatchApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Detect color and match in one call
 */
export async function detectAndMatch(
  file: File,
  expectedColor: string
): Promise<DetectAndMatchResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("expected_color", expectedColor);

  const url = `${COLOR_MISMATCH_BASE_URL}/detect-and-match`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    return await handleColorMismatchResponse<DetectAndMatchResult>(res);
  } catch (error) {
    if (error instanceof ColorMismatchApiError) {
      throw error;
    }
    if (error instanceof TypeError) {
      const isNetworkError = 
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed");
      
      if (isNetworkError) {
        throw new ColorMismatchApiError(
          `Could not connect to FastAPI backend at ${COLOR_MISMATCH_BASE_URL}. Please ensure the server is running.`,
          0
        );
      }
    }
    throw new ColorMismatchApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

/**
 * Get product image URL from backend
 */
export function getProductImageUrl(productId: string | number, index?: number): string {
  const id = String(productId);
  const params = new URLSearchParams();
  if (index !== undefined) {
    params.set("index", String(index));
  }
  const query = params.toString();
  return `${COLOR_MISMATCH_BASE_URL}/image/${id}${query ? `?${query}` : ""}`;
}
