// Demo module for the userscript showcase PR. Not used by any script.
import { titleCase } from "./format.js";

export function greet(name) {
    if (!name || !name.trim()) {
        return "Hello, stranger!";
    }
    return `Hello, ${titleCase(name.trim())}!`;
}
