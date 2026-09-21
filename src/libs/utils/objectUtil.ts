


export function selectFields(obj: Record<string, any>, fields: string[]): Record<string, any> {
    const selected: Record<string, any> = {};
    for (const field of fields) {
        if (field in obj) {
            selected[field] = obj[field];
        }
    }
    return selected;
}

export function omitFields(obj: Record<string, any>, fields: string[]): Record<string, any> {
    const omitted: Record<string, any> = {};
    for (const key in obj) {
        if (!fields.includes(key)) {
            omitted[key] = obj[key];
        }
    }
    return omitted;
}