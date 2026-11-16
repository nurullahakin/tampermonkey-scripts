export function titleCase(s) {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function slugify(s) {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export function truncate(s, max = 40) {
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
