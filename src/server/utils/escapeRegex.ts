/** Escape user input before using it in a MongoDB `$regex` (literal substring match). */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
