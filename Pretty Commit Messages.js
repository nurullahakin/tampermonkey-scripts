// ==UserScript==
// @name         Pretty Commit Messages
// @namespace    https://github.com/nurullahakin
// @version      2026-03-24
// @description  Formats commit messages in a more readable way.
// @author       Nurullah Akın
// @match        https://github.com/*/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    let isLoaded = false;
    window.addEventListener("load", function () {
        if (isLoaded) return;
        isLoaded = true;
        main();
    });
    setTimeout(() => {
        if (isLoaded) return;
        isLoaded = true;
        main();
    }, 5000);
})();

function main() {
    let pageType = detectPageType();
    if (!pageType.isPRCommit) {
        return;
    }
    prettifyCommitMessage();
    createUrlChangeListener({
        onChange: ({ prevUrl, currentUrl }) => {
            setTimeout(() => {
                new Ifterval(getCommitHeadingElement, prettifyCommitMessage, 5, 1000, true);
            }, 500);
        },
    });
}

function detectPageType() {
    let url = location.href;
    let result = {
        isPRConversation: url.match(/\/pull\/\d+$/) !== null,
        isPRCommits: url.match(/\/pull\/\d+\/commits$/) !== null,
        isPRCommit: url.match(/\/pull\/\d+\/changes\/\w+$/) !== null,
        isCommits: url.match(/\/commits\/\w+$/) !== null,
        isCommit: url.match(/\/commit\/\w+$/) !== null,
    };
    return result;
}

// #region ==================== PAGE: PR CIMMIT

function getCommitHeadingElement() {
    return document.querySelector("[class*=prc-PageLayout-ContentWrapper-] h2");
}

function prettifyCommitMessage() {
    let pageType = detectPageType();
    if (!pageType.isPRCommit) {
        return;
    }

    let commitHeadingEl = getCommitHeadingElement();

    if (!commitHeadingEl) {
        console.warn("[TM > Pretty Commit Messages] Commit heading element not found");
        return;
    }

    let firstLineEl = commitHeadingEl.querySelector("div");
    if (!firstLineEl) {
        console.warn("[TM > Pretty Commit Messages] First line element not found");
        return;
    }
    let commitMessage = firstLineEl.textContent.trim();
    let parsed = parseCommitMessage(commitMessage);

    if (parsed.type || parsed.scope) {
        let styleEl = document.createElement("style");
        styleEl.textContent = `
            .commit-message {
                display: flex;
                gap: 1rem;
            }
            .commit-type,
            .commit-scope,
            .commit-description {
                background-color: hsl(0deg 0% 0% / 15%);
                padding: 0.2rem 0.5rem;
                border-radius: 0.3rem;
            }
            .commit-type {
                background-color: hsl(0deg 100% 50% / 15%);
            }
            .commit-scope {
                background-color: hsl(135deg 100% 50% / 20%);
            }
            .commit-description {
                background-color: hsl(210deg 100% 50% / 20%);
            }
        `;
        document.head.appendChild(styleEl);
        let newCommitMessageEl = document.createElement("div");
        newCommitMessageEl.classList.add("commit-message");
        if (parsed.type) {
            let typeEl = document.createElement("span");
            typeEl.classList.add("commit-type");
            typeEl.textContent = parsed.type;
            newCommitMessageEl.appendChild(typeEl);
        }
        if (parsed.scope) {
            let scopeEl = document.createElement("span");
            scopeEl.classList.add("commit-scope");
            scopeEl.textContent = parsed.scope;
            scopeEl.style.cssText = `
        `;
            newCommitMessageEl.appendChild(scopeEl);
        }
        let descriptionEl = document.createElement("span");
        descriptionEl.classList.add("commit-description");
        descriptionEl.textContent = parsed.description;
        newCommitMessageEl.appendChild(descriptionEl);
        firstLineEl.replaceWith(newCommitMessageEl);
    }
}

// #endregion

// #region ==================== UTILS

function parseCommitMessage(message) {
    let result = {
        type: null,
        scope: null,
        description: null,
    };
    // find type
    let typeMatch = message.match(/^\(\w+\)/);
    if (typeMatch) {
        result.type = typeMatch[0].slice(1, -1); // remove '(' and ')'
        message = message.slice(typeMatch[0].length).trim();
    }
    // see if there's a scope (scope is before the first single colon not part of '::')
    let scopeMatch = message.match(/^(.*?)(?<!:):(?!:)/);
    if (scopeMatch) {
        result.scope = scopeMatch[1].trim();
        message = message.slice(scopeMatch[0].length).trim();
    }
    // the rest is the description
    result.description = message;
    return result;
}

function createUrlChangeListener(options = {}) {
    const { onChange, fireImmediately = true, detectSameUrlReload = false, debug = false } = options;

    if (typeof onChange !== "function") {
        throw new Error("onChange callback is required");
    }

    let lastUrl = location.href;

    function log(...args) {
        if (debug) console.log("[URL-CHANGE]", ...args);
    }

    function handleChange(trigger) {
        const currentUrl = location.href;

        if (!detectSameUrlReload && currentUrl === lastUrl) {
            return;
        }

        const prevUrl = lastUrl;
        lastUrl = currentUrl;

        log("changed via", trigger, prevUrl, "→", currentUrl);
        onChange({ prevUrl, currentUrl, trigger });
    }

    // Patch history methods ONCE globally
    if (!window.__urlChangeListenerPatched) {
        window.__urlChangeListenerPatched = true;

        const pushState = history.pushState;
        history.pushState = function (...args) {
            pushState.apply(this, args);
            window.dispatchEvent(new Event("__urlchange__"));
        };

        const replaceState = history.replaceState;
        history.replaceState = function (...args) {
            replaceState.apply(this, args);
            window.dispatchEvent(new Event("__urlchange__"));
        };

        window.addEventListener("popstate", () => {
            window.dispatchEvent(new Event("__urlchange__"));
        });
    }

    function listener() {
        handleChange("history");
    }

    window.addEventListener("__urlchange__", listener);

    if (fireImmediately) {
        handleChange("init");
    }

    return {
        stop() {
            window.removeEventListener("__urlchange__", listener);
        },
    };
}

/**
 * Allows one to perform an action in a chaotic (in regard to time) system.
 */
class Ifterval {
    condition = null;
    action = null;
    interval = 100;
    attempts = 0;
    maxAttempts = 2;
    conditionMetAt = null;

    #timerHandle = null;

    constructor(conditionCallback, actionCallback, maxAttempts = 2, interval = 100, fireImmediately = false) {
        this.condition = conditionCallback;
        this.action = actionCallback;
        this.interval = interval;
        this.maxAttempts = maxAttempts;
        this.fireImmediately = fireImmediately;

        if (this.fireImmediately) {
            try {
                if (this.condition()) {
                    this.conditionMetAt = new Date().valueOf();
                    this.action();
                    return;
                }
            } catch (error) {
                throw error;
            }
        }

        this.#timerHandle = setInterval(() => {
            this.attempts++;
            try {
                if (this.condition()) {
                    this.conditionMetAt = new Date().valueOf();
                    this.stop();
                    this.action();
                }
                if (this.attempts >= this.maxAttempts) {
                    this.stop();
                }
            } catch (error) {
                this.stop();
                throw error;
            }
        }, this.interval);
    }

    stop() {
        if (this.#timerHandle) {
            clearInterval(this.#timerHandle);
            this.#timerHandle = null;
        }
    }

    isRunning() {
        return this.#timerHandle !== null;
    }
}

// #endregion
