const VTO_BASE_URL = import.meta.env.VITE_VTO_API_URL ?? "https://vto-jshi.onrender.com";

export interface VtoHealthResponse {
  status: string;
  gemini_enabled: boolean;
}

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

export interface GenerateTryOnParams {
  gender: "male" | "female";
  category: "tshirts" | "pants" | "jackets" | "shoes";
  current_brand: "Nike" | "Adidas" | "Zara";
  current_size: string;
  target_brand: "Nike" | "Adidas" | "Zara";
  user_image?: File;
}

export interface GenerateTryOnResponse {
  image: Blob;
  mappedSize?: string;
}

/**
 * Generate a virtual try-on image using the FastAPI backend
 */
export async function generateTryOn(
  params: GenerateTryOnParams
): Promise<GenerateTryOnResponse> {
  const formData = new FormData();
  formData.append("gender", params.gender);
  formData.append("category", params.category);
  formData.append("current_brand", params.current_brand);
  formData.append("current_size", params.current_size);
  formData.append("target_brand", params.target_brand);

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
    const mappedSize = res.headers.get("X-Mapped-Size") ?? undefined;

    return {
      image,
      mappedSize,
    };
  } catch (error) {
    if (error instanceof VtoApiError) {
      throw error;
    }
    // Handle network errors (connection refused, CORS, etc.)
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
 * Check the health status of the VTO backend
 */
export async function checkHealth(): Promise<VtoHealthResponse> {
  const url = `${VTO_BASE_URL}/health`;

  try {
    const res = await fetch(url, {
      method: "GET",
    });

    return await handleVtoResponse<VtoHealthResponse>(res);
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
        throw new VtoApiError(`Backend offline at ${VTO_BASE_URL}`, 0);
      }
    }
    throw new VtoApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0
    );
  }
}

