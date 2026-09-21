<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
<!-- BEGIN:component-structure-rules -->
# COMPONENT RULES
- Structure: 1 component = 1 folder with `index.tsx`. NO standalone `.tsx`. Standalone `.ts` is OK for types/schemas/utils.
- Naming: Folders MUST be `kebab-case` (e.g., `category-form-modal`). NO `PascalCase`.
- Imports: Omit `.tsx` extension (e.g., `import X from "@/components/features/categories/components/header";`).
- UI Libraries: MUST search for and utilize existing components from **Ant Design (antd)** and **Shadcn UI**; icons use **lucide-react** before building custom UI from scratch.

## Feature modules (`src/components/features/<feature>/`)
Reference: `src/components/features/categories/`.

```
features/<feature>/
  index.tsx                 # Compose only: Provider + child components (no business logic)
  context/
    index.tsx               # ContextProvider + use<Feature>Context()
    type.ts                 # Context value types (I<Feature>ContextProps)
  components/
    <child>/index.tsx       # UI pieces; read/write via use<Feature>Context()
  hooks/                    # Optional: feature-local hooks
  schemas/                  # Optional: feature-local zod/schemas
```

- `index.tsx`: only compose layout. Do NOT put fetch, mutations, or modal state here.
- `context/`: owns feature state, query/mutation hooks, and handlers. Expose everything children need through context.
- `components/`: nest related UI under `components/<kebab-name>/index.tsx`. Prefer context over prop-drilling feature state.
- Child components must call `use<Feature>Context()` and throw if used outside the provider.
<!-- END:component-structure-rules -->
<!-- BEGIN:function-hook-rules -->
# FUNCTION & HOOK RULES
- Duplication Check: Before creating a new function or hook, you MUST check `src/libs/hooks/` (including `customHooks/`) and feature-local `hooks/` to avoid duplication.
- Shared data hooks (React Query calling `networkApi`) live in `src/libs/hooks/customHooks/`.
- Feature-only UI/state hooks may live under `features/<feature>/hooks/`.
<!-- END:function-hook-rules -->
