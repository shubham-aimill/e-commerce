# Virtual Try-On Integration Map
## Exact File Locations & Integration Points

---

## 📍 CURRENT FRONTEND STRUCTURE

```
e-commerce/
└── src/
    ├── pages/
    │   ├── AIPhotoshoot.tsx          ⭐ PRIMARY INTEGRATION POINT
    │   ├── Dashboard.tsx
    │   ├── MismatchEngine.tsx
    │   ├── ImageToText.tsx
    │   └── SQLAgent.tsx
    ├── components/
    │   ├── dashboard/
    │   ├── layout/
    │   └── ui/                        (shadcn/ui components)
    ├── lib/
    │   ├── api.ts                     ⭐ ADD VTO ENDPOINTS HERE
    │   └── utils.ts
    └── types/                         ⭐ CREATE vto.ts HERE
```

---

## 🎯 INTEGRATION POINT #1: AI Photoshoot Page

### File: `src/pages/AIPhotoshoot.tsx`

**Current Structure:**
```typescript
export default function AIPhotoshoot() {
  return (
    <div>
      {/* Header */}
      {/* KPI Row */}
      {/* Template Selector */}
      {/* Before/After Viewer */}
      {/* Cost Efficiency Panel */}
    </div>
  );
}
```

**Integration Change:**
```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VirtualTryOnForm } from "@/components/vto/VirtualTryOnForm";

export default function AIPhotoshoot() {
  return (
    <div>
      {/* Header */}
      
      <Tabs defaultValue="photoshoot">
        <TabsList>
          <TabsTrigger value="photoshoot">AI Photoshoot</TabsTrigger>
          <TabsTrigger value="tryon">Virtual Try-On</TabsTrigger>
        </TabsList>
        
        <TabsContent value="photoshoot">
          {/* EXISTING CONTENT - No changes */}
          {/* KPI Row */}
          {/* Template Selector */}
          {/* Before/After Viewer */}
          {/* Cost Efficiency Panel */}
        </TabsContent>
        
        <TabsContent value="tryon">
          {/* NEW VTO CONTENT */}
          <VirtualTryOnForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Line Numbers to Modify:**
- Around line 50-60: Add Tabs wrapper
- Import statements: Add Tabs and VirtualTryOnForm

---

## 🎯 INTEGRATION POINT #2: API Client

### File: `src/lib/api.ts`

**Current Structure:**
```typescript
export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, "GET", options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => ...,
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => ...,
  delete: <T>(path: string, options?: RequestOptions) => ...,
};
```

**Integration Change:**
```typescript
// Add after apiClient definition

export const vtoApi = {
  generateTryOn: async (
    formData: FormData,
    options?: RequestOptions
  ): Promise<Blob> => {
    const url = `${BASE_URL}/vto/generate-tryon`;
    const headers: HeadersInit = {
      ...(options?.headers ?? {}),
    };

    if (options?.authToken) {
      headers["Authorization"] = `Bearer ${options.authToken}`;
    }

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      headers,
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = await res.json();
        throw new ApiError(
          body?.error?.message || `Request failed with status ${res.status}`,
          res.status,
          body?.error?.code,
          body?.error?.details
        );
      }
      throw new ApiError(`Request failed with status ${res.status}`, res.status);
    }

    return await res.blob();
  },

  healthCheck: async (): Promise<{ status: string; model: string }> => {
    return apiClient.get<{ status: string; model: string }>("/vto/health");
  },
};
```

**Line Numbers:**
- After line 96 (end of apiClient)
- Add new vtoApi export

---

## 🎯 INTEGRATION POINT #3: Type Definitions

### File: `src/types/vto.ts` (NEW FILE)

**Create this file with:**
```typescript
export type Gender = 'male' | 'female';
export type Category = 'tshirts' | 'pants' | 'jackets' | 'shoes';
export type Brand = 'Nike' | 'Adidas' | 'Zara';

export interface VTORequest {
  gender: Gender;
  category: Category;
  currentBrand: Brand;
  currentSize: string;
  targetBrand: Brand;
  userImage?: File;
}

export interface VTOResponse {
  imageUrl: string;
  mappedSize: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SizeMapping {
  fromBrand: Brand;
  fromSize: string;
  toBrand: Brand;
  toSize: string;
  category: Category;
  gender: Gender;
}
```

---

## 🎯 INTEGRATION POINT #4: VTO Components

### New Directory: `src/components/vto/`

#### File 1: `src/components/vto/VirtualTryOnForm.tsx` (NEW)

**Location in codebase:**
```
src/
└── components/
    └── vto/                           ⭐ NEW DIRECTORY
        ├── VirtualTryOnForm.tsx       ⭐ CREATE THIS
        ├── SizeMappingDisplay.tsx      ⭐ CREATE THIS
        └── TryOnResult.tsx            ⭐ CREATE THIS
```

**Component Structure:**
```typescript
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { vtoApi } from "@/lib/api";
import { VTORequest } from "@/types/vto";
import { SizeMappingDisplay } from "./SizeMappingDisplay";
import { TryOnResult } from "./TryOnResult";

export function VirtualTryOnForm() {
  // State management
  // Form handlers
  // API mutation
  // Render form UI
}
```

---

## 🎯 INTEGRATION POINT #5: Size Mapping Logic

### File: `src/lib/vto-size-mapping.ts` (NEW)

**Purpose:** Port Python `mapping.py` logic to TypeScript

**Location:**
```
src/
└── lib/
    ├── api.ts
    ├── utils.ts
    └── vto-size-mapping.ts            ⭐ CREATE THIS
```

**Content:**
```typescript
// Port CATEGORY_SIZE_MAP from mapping.py
const CATEGORY_SIZE_MAP = {
  tshirts: {
    male: { /* ... */ },
    female: { /* ... */ }
  },
  pants: { /* ... */ },
  jackets: { /* ... */ },
  shoes: { /* ... */ }
};

export function getMappedSizeByCategory(
  category: string,
  gender: string,
  fromBrand: string,
  fromSize: string,
  toBrand: string
): string | null {
  // TypeScript implementation
}
```

---

## 🎯 INTEGRATION POINT #6: Routing (Optional)

### File: `src/App.tsx`

**If creating separate page, add route:**
```typescript
import VirtualTryOn from "./pages/VirtualTryOn";

<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/mismatch" element={<MismatchEngine />} />
  <Route path="/photoshoot" element={<AIPhotoshoot />} />
  <Route path="/content" element={<ImageToText />} />
  <Route path="/agent" element={<SQLAgent />} />
  <Route path="/tryon" element={<VirtualTryOn />} />  {/* NEW */}
  <Route path="/settings" element={<Settings />} />
  <Route path="/help" element={<Help />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

**If integrating into AI Photoshoot (recommended):**
- No changes needed to App.tsx

---

## 🎯 INTEGRATION POINT #7: Sidebar Navigation (Optional)

### File: `src/components/layout/AppSidebar.tsx`

**If creating separate page, add menu item:**
```typescript
const mainNavItems = [
  // ... existing items
  { 
    title: "Virtual Try-On", 
    url: "/tryon", 
    icon: Shirt,  // or appropriate icon
    description: "Try products virtually"
  },
];
```

**If integrating into AI Photoshoot:**
- No changes needed (VTO accessible via Photoshoot page)

---

## 📊 VISUAL INTEGRATION FLOW

```
User clicks "Virtual Try-On" tab in AI Photoshoot page
         ↓
VirtualTryOnForm component loads
         ↓
User fills form (gender, category, brands, size)
         ↓
SizeMappingDisplay shows: Nike M → Adidas 46
         ↓
User clicks "Generate Try-On"
         ↓
FormData sent to vtoApi.generateTryOn()
         ↓
POST /vto/generate-tryon (FastAPI backend)
         ↓
Backend processes with Gemini 3 API
         ↓
Returns PNG image blob
         ↓
Frontend creates object URL from blob
         ↓
TryOnResult component displays image
         ↓
User can download/share result
```

---

## 🔗 FILE DEPENDENCY MAP

```
AIPhotoshoot.tsx
    ↓ imports
VirtualTryOnForm.tsx
    ↓ imports
    ├── vtoApi (from lib/api.ts)
    ├── VTORequest, VTOResponse (from types/vto.ts)
    ├── SizeMappingDisplay.tsx
    ├── TryOnResult.tsx
    └── getMappedSizeByCategory (from lib/vto-size-mapping.ts)
```

---

## 📝 EXACT CODE CHANGES

### Change 1: AIPhotoshoot.tsx

**Find:**
```typescript
export default function AIPhotoshoot() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1>AI Model Photoshoot Generator</h1>
      </div>
      
      {/* KPI Row */}
      {/* ... rest of content ... */}
    </div>
  );
}
```

**Replace with:**
```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VirtualTryOnForm } from "@/components/vto/VirtualTryOnForm";

export default function AIPhotoshoot() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1>AI Image Generation</h1>
        <p>Generate product imagery and virtual try-ons</p>
      </div>
      
      <Tabs defaultValue="photoshoot">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="photoshoot">AI Photoshoot</TabsTrigger>
          <TabsTrigger value="tryon">Virtual Try-On</TabsTrigger>
        </TabsList>
        
        <TabsContent value="photoshoot" className="space-y-6">
          {/* EXISTING PHOTOSHOOT CONTENT - Keep as is */}
          {/* KPI Row */}
          {/* Template Selector */}
          {/* Before/After Viewer */}
          {/* Cost Efficiency Panel */}
        </TabsContent>
        
        <TabsContent value="tryon" className="space-y-6">
          <VirtualTryOnForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 🎨 COMPONENT INTEGRATION DETAILS

### VirtualTryOnForm Component Location

**File Path:** `src/components/vto/VirtualTryOnForm.tsx`

**Should include:**
1. Form state management
2. Image upload handler
3. Gender/Category/Brand selectors
4. Size input
5. Size mapping display
6. Generate button
7. Result display area
8. Error handling
9. Loading states

**Uses existing UI components:**
- `Button` from `@/components/ui/button`
- `Select` from `@/components/ui/select`
- `Input` from `@/components/ui/input`
- `Card` from `@/components/ui/card`
- `Badge` from `@/components/ui/badge`
- `Tabs` from `@/components/ui/tabs` (if needed internally)

---

## 🔧 BACKEND CONNECTION

### FastAPI Server Configuration

**Backend runs on:** `http://localhost:8000` (development)

**Frontend API calls:**
```typescript
// In vtoApi.generateTryOn()
const url = `${BASE_URL}/vto/generate-tryon`;
// BASE_URL from environment: VITE_API_URL or default
```

**Environment Variable:**
```env
VITE_API_URL=http://localhost:8000
```

**Production:**
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## ✅ INTEGRATION CHECKLIST BY FILE

### Files to Create:
- [ ] `src/types/vto.ts`
- [ ] `src/lib/vto-size-mapping.ts`
- [ ] `src/components/vto/VirtualTryOnForm.tsx`
- [ ] `src/components/vto/SizeMappingDisplay.tsx`
- [ ] `src/components/vto/TryOnResult.tsx`

### Files to Modify:
- [ ] `src/pages/AIPhotoshoot.tsx` - Add Tabs wrapper
- [ ] `src/lib/api.ts` - Add vtoApi export

### Files to Review (No changes needed):
- `src/App.tsx` - Only if creating separate route
- `src/components/layout/AppSidebar.tsx` - Only if adding menu item

---

## 🚀 QUICK START IMPLEMENTATION ORDER

1. **Step 1:** Create type definitions (`src/types/vto.ts`)
2. **Step 2:** Add API client functions (`src/lib/api.ts`)
3. **Step 3:** Port size mapping (`src/lib/vto-size-mapping.ts`)
4. **Step 4:** Create VTO components (`src/components/vto/`)
5. **Step 5:** Integrate into AIPhotoshoot page
6. **Step 6:** Test with backend
7. **Step 7:** Polish UI/UX

---

## 📍 SUMMARY

**Primary Integration:** `src/pages/AIPhotoshoot.tsx`
- Add Tabs component
- Import VirtualTryOnForm
- Wrap existing content in TabsContent

**Supporting Files:**
- `src/lib/api.ts` - API client
- `src/types/vto.ts` - Type definitions
- `src/components/vto/` - VTO components
- `src/lib/vto-size-mapping.ts` - Size mapping logic

**No Changes Needed:**
- Routing (if using tab integration)
- Sidebar (if using tab integration)
- Other pages

---

**Integration Complexity:** Medium  
**Files to Create:** 5  
**Files to Modify:** 2  
**Estimated Time:** 2-3 days



