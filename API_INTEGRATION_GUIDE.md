# Backend API Integration Guide

This guide provides comprehensive documentation for integrating the frontend application with the backend APIs.

## Table of Contents

1. [Overview](#overview)
2. [Setup and Configuration](#setup-and-configuration)
3. [API Client](#api-client)
4. [React Query Integration](#react-query-integration)
5. [Type Definitions](#type-definitions)
6. [Error Handling](#error-handling)
7. [Authentication](#authentication)
8. [Common Patterns](#common-patterns)
9. [Examples](#examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The frontend uses a centralized API client (`src/lib/api.ts`) that handles all HTTP requests to the backend. The application leverages **React Query** (`@tanstack/react-query`) for data fetching, caching, and state management.

### Key Features

- ✅ Centralized API client with error handling
- ✅ TypeScript type safety
- ✅ Automatic request/response handling
- ✅ Bearer token authentication support
- ✅ FormData support for file uploads
- ✅ Fallback to dummy data when API is unavailable
- ✅ Visual indicators (API/Demo badges) to show data source

---

## Setup and Configuration

### 1. Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_URL=https://your-backend-api.com/api/v1
VITE_VTO_API_URL=http://127.0.0.1:8000
VITE_COLOR_MISMATCH_API_URL=http://127.0.0.1:8020
```

**Note:** 
- The API client defaults to `https://api.example.com/api/v1` if `VITE_API_URL` is not set.
- The Virtual Try-On API client defaults to `http://127.0.0.1:8000` if `VITE_VTO_API_URL` is not set.
- The Color Mismatch API client defaults to `http://127.0.0.1:8020` if `VITE_COLOR_MISMATCH_API_URL` is not set.

### 2. React Query Provider

Ensure your app is wrapped with `QueryClientProvider`. This is typically done in `src/main.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Wrap your app
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

---

## API Client

### Location

The API client is located at `src/lib/api.ts`.

### Basic Usage

```typescript
import { apiClient } from "@/lib/api";

// GET request
const data = await apiClient.get<ResponseType>("/endpoint/path");

// POST request
const result = await apiClient.post<ResponseType>("/endpoint/path", {
  key: "value",
});

// PUT request
const updated = await apiClient.put<ResponseType>("/endpoint/path", {
  key: "newValue",
});

// DELETE request
await apiClient.delete("/endpoint/path");
```

### Methods

#### `apiClient.get<T>(path, options?)`

Makes a GET request.

**Parameters:**
- `path` (string): API endpoint path (e.g., `/dashboard/kpis`)
- `options` (optional): Request options including headers, authToken, etc.

**Returns:** Promise resolving to type `T`

#### `apiClient.post<T>(path, body?, options?)`

Makes a POST request.

**Parameters:**
- `path` (string): API endpoint path
- `body` (optional): Request body (automatically JSON stringified)
- `options` (optional): Request options

**Returns:** Promise resolving to type `T`

#### `apiClient.put<T>(path, body?, options?)`

Makes a PUT request. Same parameters as `post`.

#### `apiClient.delete<T>(path, options?)`

Makes a DELETE request. Same parameters as `get`.

### File Upload Example

```typescript
const formData = new FormData();
formData.append("file", file);

const result = await apiClient.post<UploadResponse>("/upload", formData);
```

### Authentication

To include an authentication token:

```typescript
const result = await apiClient.get<Data>("/protected", {
  authToken: "your-jwt-token",
});
```

---

## React Query Integration

### useQuery Hook

Use `useQuery` for fetching data that should be cached and automatically refetched.

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface ResponseType {
  data: string[];
}

function MyComponent() {
  const { data, isLoading, isError, error } = useQuery<ResponseType>({
    queryKey: ["unique", "key"],
    queryFn: () => apiClient.get<ResponseType>("/endpoint"),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return <div>{data?.data}</div>;
}
```

### useMutation Hook

Use `useMutation` for POST, PUT, DELETE operations.

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function MyComponent() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: { name: string }) =>
      apiClient.post<ResponseType>("/endpoint", payload),
    onSuccess: (data) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ["related", "key"] });
      toast({
        title: "Success",
        description: "Operation completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    mutation.mutate({ name: "value" });
  };

  return (
    <button onClick={handleSubmit} disabled={mutation.isPending}>
      {mutation.isPending ? "Submitting..." : "Submit"}
    </button>
  );
}
```

### Query Key Patterns

Use hierarchical query keys for better cache management:

```typescript
// Single resource
queryKey: ["dashboard", "kpis"]

// With parameters
queryKey: ["mismatch", "list", queryParams.toString()]

// Nested resources
queryKey: ["mismatch", "sku", sku, "attributes"]
```

---

## Type Definitions

### Define Response Types

Always define TypeScript interfaces for API responses:

```typescript
interface DashboardKpiDto {
  title: string;
  value: string;
  change: number;
  icon: string;
  iconColor: string;
}

interface DashboardKpisResponse {
  kpis: DashboardKpiDto[];
}
```

### Use in Queries

```typescript
const { data } = useQuery<DashboardKpisResponse>({
  queryKey: ["dashboard", "kpis"],
  queryFn: () => apiClient.get<DashboardKpisResponse>("/dashboard/kpis"),
});
```

---

## Error Handling

### ApiError Class

The API client throws `ApiError` instances for failed requests:

```typescript
import { ApiError } from "@/lib/api";

try {
  const data = await apiClient.get("/endpoint");
} catch (error) {
  if (error instanceof ApiError) {
    console.error("Status:", error.status);
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Details:", error.details);
  }
}
```

### Error Response Format

The backend should return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional info"
    }
  }
}
```

### React Query Error Handling

```typescript
const { data, isError, error } = useQuery({
  queryKey: ["key"],
  queryFn: () => apiClient.get("/endpoint"),
  onError: (error) => {
    if (error instanceof ApiError) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  },
});
```

---

## Authentication

### Adding Authentication Token

```typescript
// Option 1: Per-request
const data = await apiClient.get("/protected", {
  authToken: getTokenFromStorage(),
});

// Option 2: In mutation
const mutation = useMutation({
  mutationFn: (payload) =>
    apiClient.post("/protected", payload, {
      authToken: getTokenFromStorage(),
    }),
});
```

### Global Authentication (Future Enhancement)

To add global authentication, modify `src/lib/api.ts`:

```typescript
// Get token from storage/context
function getAuthToken(): string | undefined {
  // Return token from your auth context/store
  return localStorage.getItem("authToken") ?? undefined;
}

async function request<T>(path: string, method: HttpMethod, options: RequestOptions = {}): Promise<T> {
  // ... existing code ...
  
  const token = options.authToken ?? getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // ... rest of the code ...
}
```

---

## Common Patterns

### 1. Loading States

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["key"],
  queryFn: () => apiClient.get("/endpoint"),
});

if (isLoading) {
  return <Skeleton />;
}
```

### 2. Error States with Fallback

```typescript
const { data, isError } = useQuery({
  queryKey: ["key"],
  queryFn: () => apiClient.get("/endpoint"),
});

const displayData = isError ? fallbackData : data;
```

### 3. Conditional Queries

```typescript
const { data } = useQuery({
  queryKey: ["key", id],
  queryFn: () => apiClient.get(`/endpoint/${id}`),
  enabled: !!id, // Only fetch if id exists
});
```

### 4. Dependent Queries

```typescript
const { data: firstData } = useQuery({
  queryKey: ["first"],
  queryFn: () => apiClient.get("/first"),
});

const { data: secondData } = useQuery({
  queryKey: ["second", firstData?.id],
  queryFn: () => apiClient.get(`/second/${firstData.id}`),
  enabled: !!firstData?.id,
});
```

### 5. Optimistic Updates

```typescript
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (newItem) => apiClient.post("/items", newItem),
  onMutate: async (newItem) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["items"] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(["items"]);
    
    // Optimistically update
    queryClient.setQueryData(["items"], (old) => [...old, newItem]);
    
    return { previous };
  },
  onError: (err, newItem, context) => {
    // Rollback on error
    queryClient.setQueryData(["items"], context.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ["items"] });
  },
});
```

---

## Examples

### Example 1: Dashboard KPIs

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface DashboardKpiDto {
  title: string;
  value: string;
  change: number;
  icon: string;
  iconColor: string;
}

interface DashboardKpisResponse {
  kpis: DashboardKpiDto[];
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery<DashboardKpisResponse>({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => apiClient.get<DashboardKpisResponse>("/dashboard/kpis"),
  });

  const kpis = data?.kpis ?? [];

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading KPIs</div>;

  return (
    <div>
      {kpis.map((kpi) => (
        <div key={kpi.title}>
          <h3>{kpi.title}</h3>
          <p>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: File Upload with Progress

```typescript
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface UploadResponse {
  imageId: string;
  url: string;
}

function FileUpload() {
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<UploadResponse>("/photoshoot/upload", formData);
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: `Image ID: ${data.imageId}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {uploadMutation.isPending && <div>Uploading...</div>}
    </div>
  );
}
```

### Example 3: Filtered List with Query Parameters

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useState } from "react";

interface MismatchRow {
  sku: string;
  category: string;
  marketplace: string;
  issueType: string;
}

interface MismatchListResponse {
  data: MismatchRow[];
  total: number;
  page: number;
  limit: number;
}

function MismatchList() {
  const [category, setCategory] = useState("all");
  const [marketplace, setMarketplace] = useState("all");

  // Build query params
  const queryParams = new URLSearchParams();
  if (category !== "all") queryParams.set("category", category);
  if (marketplace !== "all") queryParams.set("marketplace", marketplace);
  queryParams.set("page", "1");
  queryParams.set("limit", "50");

  const { data, isLoading } = useQuery<MismatchListResponse>({
    queryKey: ["mismatch", "list", queryParams.toString()],
    queryFn: () =>
      apiClient.get<MismatchListResponse>(
        `/mismatch/list?${queryParams.toString()}`
      ),
  });

  return (
    <div>
      {/* Filters */}
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="all">All Categories</option>
        <option value="fashion">Fashion</option>
      </select>

      {/* List */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {data?.data.map((row) => (
            <li key={row.sku}>{row.sku}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Example 4: Mutation with Cache Invalidation

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface FixRequest {
  sku: string;
  action: string;
  parameters: Record<string, unknown>;
}

function FixButton({ sku }: { sku: string }) {
  const queryClient = useQueryClient();

  const fixMutation = useMutation({
    mutationFn: (payload: FixRequest) =>
      apiClient.post<{ success: boolean; message: string }>(
        "/mismatch/fix",
        payload
      ),
    onSuccess: () => {
      // Invalidate and refetch mismatch list
      queryClient.invalidateQueries({ queryKey: ["mismatch", "list"] });
      toast({
        title: "Fixed",
        description: "Mismatch has been resolved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFix = () => {
    fixMutation.mutate({
      sku,
      action: "update_attributes",
      parameters: {},
    });
  };

  return (
    <button onClick={handleFix} disabled={fixMutation.isPending}>
      {fixMutation.isPending ? "Fixing..." : "Fix"}
    </button>
  );
}
```

---

## Best Practices

### 1. Always Define Types

```typescript
// ✅ Good
interface Response {
  data: string[];
}
const { data } = useQuery<Response>({ ... });

// ❌ Bad
const { data } = useQuery({ ... }); // No type safety
```

### 2. Use Meaningful Query Keys

```typescript
// ✅ Good - Hierarchical and descriptive
queryKey: ["dashboard", "kpis"]
queryKey: ["mismatch", "sku", sku, "attributes"]

// ❌ Bad - Flat and unclear
queryKey: ["data"]
queryKey: ["stuff", sku]
```

### 3. Handle Loading and Error States

```typescript
// ✅ Good
const { data, isLoading, isError, error } = useQuery({ ... });
if (isLoading) return <Loading />;
if (isError) return <Error message={error.message} />;

// ❌ Bad
const { data } = useQuery({ ... });
return <div>{data.value}</div>; // Crashes if data is undefined
```

### 4. Provide Fallback Data

```typescript
// ✅ Good - Graceful degradation
const kpis = data?.kpis ?? fallbackKpis;

// ❌ Bad - Breaks when API fails
const kpis = data.kpis;
```

### 5. Invalidate Related Queries After Mutations

```typescript
// ✅ Good
const mutation = useMutation({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["related"] });
  },
});

// ❌ Bad - Stale data after mutation
const mutation = useMutation({
  onSuccess: () => {
    // No cache invalidation
  },
});
```

### 6. Use Conditional Queries

```typescript
// ✅ Good - Only fetch when needed
const { data } = useQuery({
  queryKey: ["item", id],
  queryFn: () => apiClient.get(`/item/${id}`),
  enabled: !!id,
});

// ❌ Bad - Fetches even when id is undefined
const { data } = useQuery({
  queryKey: ["item", id],
  queryFn: () => apiClient.get(`/item/${id}`), // Fails if id is undefined
});
```

### 7. Show Data Source Indicators

```typescript
// ✅ Good - User knows data source
<Badge>{data ? "API" : "Demo"}</Badge>

// ❌ Bad - Unclear if data is real or mock
<div>{data.value}</div>
```

---

## Troubleshooting

### Issue: CORS Errors

**Problem:** Browser blocks requests due to CORS policy.

**Solution:**
- Ensure backend has CORS enabled for your frontend origin
- Check `Access-Control-Allow-Origin` headers
- For development, use a proxy in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

### Issue: 401 Unauthorized

**Problem:** Requests fail with 401 status.

**Solution:**
- Check if authentication token is being sent
- Verify token is valid and not expired
- Ensure `Authorization` header is set correctly

### Issue: Data Not Updating After Mutation

**Problem:** UI shows stale data after a successful mutation.

**Solution:**
- Invalidate related queries in `onSuccess`:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["related"] });
}
```

### Issue: Type Errors

**Problem:** TypeScript errors when using API responses.

**Solution:**
- Ensure response types match backend schema
- Use type assertions if needed: `data as ResponseType`
- Check that interfaces match actual API responses

### Issue: Infinite Loading

**Problem:** Query never resolves.

**Solution:**
- Check network tab for failed requests
- Verify API endpoint is correct
- Check if query is disabled: `enabled: false`
- Add error handling to see what's failing

### Issue: Multiple Requests for Same Data

**Problem:** Same endpoint called multiple times.

**Solution:**
- Ensure query keys are identical for same data
- Check React Query cache settings
- Use `staleTime` to prevent unnecessary refetches:

```typescript
useQuery({
  queryKey: ["key"],
  queryFn: () => apiClient.get("/endpoint"),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Additional Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [API Documentation](./api_documentaion.md) - Complete backend API reference
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [API Documentation](./api_documentaion.md)
3. Check browser console and network tab for errors
4. Verify environment variables are set correctly

---

**Last Updated:** 2024

