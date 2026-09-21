<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
<!-- BEGIN:component-structure-rules -->
# COMPONENT RULES
- Structure: 1 component = 1 folder with `index.tsx`. NO standalone `.tsx`.
- Grouping: Nest related components (e.g., `friends/components/friend-item/index.tsx`).
- Naming: Folders MUST be `kebab-case` (e.g., `friend-item`). NO `PascalCase`.
- Imports: Omit `.tsx` extension (e.g., `import X from "@/components/friend-item";`).
- UI Libraries: MUST search for and utilize existing components from **Ant Design (antd)** and **Shadcn UI** and icon use lucide-react before building custom components from scratch.
<!-- END:component-structure-rules -->
<!-- BEGIN:function-hook-rules -->
# FUNCTION & HOOK RULES
- Duplication Check: Before creating a new function or hook, you MUST check the `hooks` (or `hook`) directories to see if it already exists to avoid duplication.
<!-- END:function-hook-rules -->
