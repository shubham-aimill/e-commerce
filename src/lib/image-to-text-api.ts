/**
 * Image-to-Text API Client
 * Connects to the FastAPI backend for image-to-text description generation
 * Backend URL: https://e-commerce-1-imageto-txt.onrender.com
 */

const IMAGE_TO_TEXT_BASE_URL = "https://e-commerce-1-imageto-txt.onrender.com";

export interface GenerateDescriptionResponse {
  title: string;
  short_description: string;
  long_description?: string;
  bullet_points: string[];
  attributes: Record<string, string>;
}

export interface UploadImageResponse {
  success: boolean;
  imageId: string;
  url: string;
  filename: string;
  sku?: string;
}

export interface GenerateProductTextResponse {
  success: boolean;
  jobId: string;
  title: string;
  shortDescription: string;
  bulletPoints: string[];
  attributes: Array<{
    name: string;
    value: string;
    confidence: number;
  }>;
}

export interface Translation {
  code: string;
  name: string;
  flag: string;
  status: "complete" | "pending" | "error";
  title?: string | null;
  description?: string | null;
  bulletPoints?: string[] | null;
}

export interface TranslationsResponse {
  imageId: string;
  translations: Translation[];
}

export interface QualityCheck {
  code: string;
  name: string;
  flag: string;
  status: "complete" | "pending" | "error";
  checks: {
    grammar: boolean;
    keywords: number;
    cultural: number;
    forbidden: boolean;
  };
}

export interface QualityCheckResponse {
  imageId: string;
  qualityChecks: QualityCheck[];
}

export interface KPI {
  label: string;
  value: string;
  icon: string;
  change: number;
}

export interface KPIsResponse {
  kpis: KPI[];
}

export class ImageToTextApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ImageToTextApiError";
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    if (res.status === 502) {
      errorMessage =
        "Image-to-Text service unavailable (502). The Render deployment may be starting up, sleeping, or misconfigured. Ensure the start command uses --port $PORT and Health Check Path is /health. Try again in a moment.";
    } else {
      try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const body = await res.json();
          errorMessage = body.detail || body.error?.message || errorMessage;
        } else {
          errorMessage = (await res.text()) || errorMessage;
        }
      } catch {
        // Ignore parse errors
      }
    }
    throw new ImageToTextApiError(errorMessage, res.status);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

/**
 * Generate description directly from image file (like Streamlit app)
 */
export async function generateDescription(
  file: File,
  language: string
): Promise<GenerateDescriptionResponse> {
  // Ensure base URL doesn't have trailing slash
  const baseUrl = IMAGE_TO_TEXT_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/generate-description`;
  const formData = new FormData();
  formData.append("image", file);
  formData.append("language", language);

  try {
    // Add timeout for long-running requests (2 minutes for AI processing)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
    
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    return await handleResponse<GenerateDescriptionResponse>(res);
  } catch (error) {
    if (error instanceof ImageToTextApiError) {
      throw error;
    }
    
    // Better error messages for common issues
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ImageToTextApiError(
        "Request timed out. The backend may be slow or not responding. Please try again.",
        408
      );
    }
    
    // Network/CORS failure (often 502: gateway returns error without CORS headers)
    const msg =
      error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? `Cannot connect to Image-to-Text backend at ${baseUrl}. This often appears as CORS + 502 when the Render service is down, sleeping, or using a fixed port instead of $PORT. Check RENDER_DEPLOYMENT.md and try again.`
        : `Could not connect to Image-to-Text backend at ${baseUrl}. ${error instanceof Error ? error.message : "Unknown error"}. If you see CORS or 502, the backend may be misconfigured on Render.`;
    throw new ImageToTextApiError(msg, 0);
  }
}

/**
 * Upload image and get imageId
 */
export async function uploadImage(
  file: File,
  sku?: string
): Promise<UploadImageResponse> {
  // Ensure base URL doesn't have trailing slash
  const baseUrl = IMAGE_TO_TEXT_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/image-to-text/upload`;
  const formData = new FormData();
  formData.append("file", file);
  if (sku) {
    formData.append("sku", sku);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for upload
    
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    return await handleResponse<UploadImageResponse>(res);
  } catch (error) {
    if (error instanceof ImageToTextApiError) throw error;
    const msg =
      error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? `Cannot connect to Image-to-Text backend. CORS/502 often means Render is down or not using --port $PORT.`
        : `Could not connect to Image-to-Text backend at ${baseUrl}. ${error instanceof Error ? error.message : "Unknown error"}.`;
    throw new ImageToTextApiError(msg, 0);
  }
}

/**
 * Generate product text from uploaded imageId
 */
export async function generateProductText(params: {
  imageId: string;
  language: string;
  region?: string;
  marketplace?: string;
  sku?: string;
}): Promise<GenerateProductTextResponse> {
  // Ensure base URL doesn't have trailing slash
  const baseUrl = IMAGE_TO_TEXT_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/image-to-text/generate`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes for generation
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageId: params.imageId,
        language: params.language,
        region: params.region || "global",
        marketplace: params.marketplace,
        sku: params.sku,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    return await handleResponse<GenerateProductTextResponse>(res);
  } catch (error) {
    if (error instanceof ImageToTextApiError) {
      throw error;
    }
    throw new ImageToTextApiError(
      `Could not connect to backend at ${baseUrl}. Please check your connection and try again.`,
      0
    );
  }
}

/**
 * Get translations for an image
 */
export async function getTranslations(
  imageId: string,
  language?: string
): Promise<TranslationsResponse> {
  // Ensure base URL doesn't have trailing slash
  const baseUrl = IMAGE_TO_TEXT_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/image-to-text/translations/${imageId}${
    language ? `?language=${language}` : ""
  }`;

  try {
    const res = await fetch(url);
    return await handleResponse<TranslationsResponse>(res);
  } catch (error) {
    if (error instanceof ImageToTextApiError) throw error;
    const msg =
      error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? `Cannot connect to Image-to-Text backend. CORS/502 often means Render is down or not using --port $PORT.`
        : `Could not connect to Image-to-Text backend at ${baseUrl}. ${error instanceof Error ? error.message : "Unknown error"}.`;
    throw new ImageToTextApiError(msg, 0);
  }
}

/**
 * Get quality check for an image
 */
export async function getQualityCheck(
  imageId: string
): Promise<QualityCheckResponse> {
  // Ensure base URL doesn't have trailing slash
  const baseUrl = IMAGE_TO_TEXT_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/image-to-text/quality-check/${imageId}`;

  try {
    const res = await fetch(url);
    return await handleResponse<QualityCheckResponse>(res);
  } catch (error) {
    if (error instanceof ImageToTextApiError) throw error;
    const msg =
      error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? `Cannot connect to Image-to-Text backend. CORS/502 often means Render is down or not using --port $PORT.`
        : `Could not connect to Image-to-Text backend at ${baseUrl}. ${error instanceof Error ? error.message : "Unknown error"}.`;
    throw new ImageToTextApiError(msg, 0);
  }
}

/**
 * Get KPIs
 */
export async function getKPIs(): Promise<KPIsResponse> {
  // Ensure base URL doesn't have trailing slash
  const baseUrl = IMAGE_TO_TEXT_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/image-to-text/kpis`;

  try {
    const res = await fetch(url);
    return await handleResponse<KPIsResponse>(res);
  } catch (error) {
    if (error instanceof ImageToTextApiError) throw error;
    const msg =
      error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? `Cannot connect to Image-to-Text backend. CORS/502 often means Render is down or not using --port $PORT.`
        : `Could not connect to Image-to-Text backend at ${baseUrl}. ${error instanceof Error ? error.message : "Unknown error"}.`;
    throw new ImageToTextApiError(msg, 0);
  }
}

/**
 * Approve translations
 */
export async function approveTranslations(params: {
  imageId: string;
  languages?: string[];
}): Promise<{ success: boolean; approved: number; message: string }> {
  // Ensure base URL doesn't have trailing slash
  const baseUrl = IMAGE_TO_TEXT_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/image-to-text/approve`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageId: params.imageId,
        languages: params.languages,
      }),
    });

    return await handleResponse<{ success: boolean; approved: number; message: string }>(res);
  } catch (error) {
    if (error instanceof ImageToTextApiError) throw error;
    const msg =
      error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? `Cannot connect to Image-to-Text backend. CORS/502 often means Render is down or not using --port $PORT.`
        : `Could not connect to Image-to-Text backend at ${baseUrl}. ${error instanceof Error ? error.message : "Unknown error"}.`;
    throw new ImageToTextApiError(msg, 0);
  }
}
