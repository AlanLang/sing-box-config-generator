# Add Config Module Skill

Guides Claude through adding a new configuration management module (like log, ruleset, inbound) to the SingBox config generator.

## When to Use

When the user wants to add a new config management feature with full CRUD operations following the established pattern in this codebase.

## Prerequisites

- Working directory is the sing-box-config-generator project
- Existing modules (log, ruleset, inbound) are available as templates
- User has specified the module name (e.g., "dns", "outbound", "route")

## Implementation Steps

### Step 1: Clarify Module Details

Ask the user:
1. What is the module name? (lowercase, singular, e.g., "dns", "outbound")
2. What is the display name? (e.g., "DNS", "Outbound")
3. What is the description for the page? (e.g., "Configure DNS settings")
4. Which icon from @tabler/icons-react to use? (optional, suggest based on module name)

### Step 2: Create Backend API Handler

**File**: `src/backend/api/{module}.rs`

Copy from `src/backend/api/inbound.rs` and replace:
- All type names: `Inbound` → `{Module}` (PascalCase)
- All function names: `inbound` → `{module}` (lowercase)
- Storage directory: `./data/inbounds` → `./data/{module}s`
- Success messages: "Inbound" → "{Module}"

**Critical**: Ensure all four functions are present:
- `create_{module}` - Returns 201 CREATED / 409 CONFLICT
- `list_{module}s` - Returns Vec<{Module}ListDto>
- `update_{module}` - Returns 200 OK / 404 NOT_FOUND
- `delete_{module}` - Returns 200 OK / 404 NOT_FOUND

### Step 3: Register Backend Module

**File**: `src/backend/api/mod.rs`
```rust
pub mod {module};
```

**File**: `src/main.rs` - Add route after existing routes:
```rust
.route(
  "/api/{module}",
  axum::routing::post(backend::api::{module}::create_{module})
    .get(backend::api::{module}::list_{module}s)
    .put(backend::api::{module}::update_{module})
    .delete(backend::api::{module}::delete_{module}),
)
```

### Step 4: Create Frontend API Client

Create directory: `src/frontend/api/{module}/`

**File**: `create.ts`
```typescript
import { http } from "@/api/http";
import z from "zod/v3";

export const {module}CreateSchema = z.object({
  uuid: z.string(),
  name: z.string().min(2).max(50),
  json: z.string(),
});

export type {Module}CreateDto = z.infer<typeof {module}CreateSchema>;

export function create{Module}({module}Data: {Module}CreateDto) {
  return http.post("{module}", { json: {module}Data });
}
```

**File**: `list.ts`
```typescript
import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface {Module}ListDto {
  uuid: string;
  name: string;
  json: string;
}

export const use{Module}List = () => {
  return useQuery({
    queryKey: ["{module}", "list"],
    queryFn: async () => {
      return await http.get("{module}").json<{Module}ListDto[]>();
    },
  });
};
```

**File**: `update.ts`
```typescript
import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface {Module}UpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const use{Module}Update = () => {
  return useMutation({
    mutationFn: async ({module}Data: {Module}UpdateDto) => {
      return await http.put("{module}", { json: {module}Data });
    },
  });
};
```

**File**: `delete.ts`
```typescript
import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface {Module}DeleteDto {
  uuid: string;
}

export const use{Module}Delete = () => {
  return useMutation({
    mutationFn: async ({module}Data: {Module}DeleteDto) => {
      return await http.delete("{module}", {
        searchParams: { uuid: {module}Data.uuid },
      });
    },
  });
};
```

### Step 5: Create Frontend Route Page

**File**: `src/frontend/routes/{module}/index.tsx`

Copy from `src/frontend/routes/inbound/index.tsx` and replace:
- Import paths: `api/inbound` → `api/{module}`
- Type names: `Inbound` → `{Module}` (PascalCase)
- Variable names: `inbound` → `{module}` (lowercase)
- Display text: Update title, description, button labels, empty state text
- entityType prop: `"Inbound"` → `"{Module}"`

**CRITICAL**: Ensure FocusEditor is OUTSIDE the conditional:
```tsx
{isLoading ? <SkeletonGrid /> :
 !items || items.length === 0 ? <EmptyState /> :
 <AnimatePresence>{!focusMode && <Grid />}</AnimatePresence>
}
<FocusEditor isOpen={focusMode} />  {/* Outside! */}
```

### Step 6: Update Navigation

**File**: `src/frontend/components/app-sidebar.tsx`

Find the relevant nav item and change:
```tsx
url: "#"  →  url: "/{module}"
```

### Step 7: Verify & Test

1. **Build backend**: `cargo build`
2. **Build frontend**: `npm run build`
3. **Test flow**:
   - Start servers (cargo run + npm run dev)
   - Visit `http://localhost:3000/{module}`
   - Test create in empty state
   - Test update, delete
   - Verify validation (name 2-50 chars, valid JSON)

## File Checklist

**Create (6 files)**:
- `src/backend/api/{module}.rs`
- `src/frontend/api/{module}/create.ts`
- `src/frontend/api/{module}/list.ts`
- `src/frontend/api/{module}/update.ts`
- `src/frontend/api/{module}/delete.ts`
- `src/frontend/routes/{module}/index.tsx`

**Modify (3 files)**:
- `src/backend/api/mod.rs`
- `src/main.rs`
- `src/frontend/components/app-sidebar.tsx`

## Common Pitfalls

1. **FocusEditor inside conditional** - Empty state won't allow creation
2. **Inconsistent naming** - Mix of singular/plural or PascalCase/camelCase
3. **Wrong storage path** - Should be `./data/{module}s/` (plural)
4. **Missing route registration** - Backend route not added to main.rs
5. **Query key mismatch** - TanStack Query key should be `["{module}", "list"]`

## Success Criteria

- ✓ Backend compiles without errors
- ✓ Frontend compiles without errors
- ✓ Can create item in empty state
- ✓ Can update and delete items
- ✓ Name validation works (2-50 chars)
- ✓ JSON validation shows errors
- ✓ Toast notifications appear
- ✓ Data persists in `./data/{module}s/` directory
