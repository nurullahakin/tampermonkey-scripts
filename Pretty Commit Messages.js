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

async function main() {
    window.areCommitsPrettified = false;
    await prettifyCommitMessages();
    if (!window.ucl) {
        window.ucl = createUrlChangeListener({
            onChange: ({ prevUrl, currentUrl }) => {
                intervalUntil(() => window.areCommitsPrettified, main, 1000, 5);
            },
        });
    }
}

async function prettifyCommitMessages() {
    let pageType = detectPageType();
    if (pageType.isPRCommit) {
        let commitHeadingEl = getPRCommitHeadingElement();
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
        let parsedMessage = parseCommitMessage(commitMessage);
        if (parsedMessage.type || parsedMessage.scope) {
            addPrettyCommitMessageStyles();
            let newCommitMessageEl = createPrettyCommitMessageEl(parsedMessage);
            firstLineEl.replaceWith(newCommitMessageEl);
        }
        window.areCommitsPrettified = true;
        return;
    }

    if (pageType.isPRConversation) {
        let commitEls = document.querySelectorAll(".TimelineItem-body .js-details-container");
        for (let commitEl of commitEls) {
            let messageLinkEl = commitEl.querySelector("code a");
            let commitMessage = messageLinkEl.textContent.trim();
            let parsedMessage = parseCommitMessage(commitMessage);
            if (parsedMessage.type || parsedMessage.scope) {
                addPrettyCommitMessageStyles();
                let newCommitMessageEl = createPrettyCommitMessageEl(parsedMessage);
                messageLinkEl.innerHTML = newCommitMessageEl.outerHTML;
            }
        }
    }

    if (pageType.isPRCommits || pageType.isCommits) {
        if (pageType.isCommits) {
            await sleep(1000);
        }
        let commitEls = document.querySelectorAll("[class*=CommitRow-module__ListItem_");
        for (let commitEl of commitEls) {
            let messageLinkEl = commitEl.querySelector("h4 a");
            let commitMessage = messageLinkEl.textContent.trim();
            let parsedMessage = parseCommitMessage(commitMessage);
            if (parsedMessage.type || parsedMessage.scope) {
                addPrettyCommitMessageStyles();
                let newCommitMessageEl = createPrettyCommitMessageEl(parsedMessage);
                messageLinkEl.innerHTML = newCommitMessageEl.outerHTML;
            }
        }
    }
}

// #region ==================== PAGE: PR COMMIT

function getPRCommitHeadingElement() {
    return document.querySelector("[class*=prc-PageLayout-ContentWrapper-] h2");
}

// #endregion

// #region ==================== UTILS

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectPageType() {
    let url = location.href;
    let result = {
        isPRConversation: url.match(/\/pull\/\d+$/) !== null,
        isPRCommits: url.match(/\/pull\/\d+\/commits$/) !== null,
        isPRCommit: url.match(/\/pull\/\d+\/changes\/\w+$/) !== null,
        isCommits: url.match(/\/commits\/\w+\/?$/) !== null,
        isCommit: url.match(/\/commit\/\w+$/) !== null,
        isTargetPage: false,
    };
    result.isTargetPage = Object.values(result).some((v) => v);
    return result;
}

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

function addPrettyCommitMessageStyles() {
    if (document.querySelector("style#pretty-commit-messages-styles")) {
        return;
    }
    let styleEl = document.createElement("style");
    styleEl.id = "pretty-commit-messages-styles";
    styleEl.textContent = `
        .commit-message {
            display: inline-flex;
            gap: 0.5rem;
        }
        .commit-type,
        .commit-scope,
        .commit-description {
            background-color: hsl(0deg 0% 0% / 15%);
            padding: 0.1rem 0.4rem;
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
        @media (prefers-color-scheme: dark) {
            .commit-type {
                background-color: hsl(0deg 100% 60% / 40%);
            }
            .commit-scope {
                background-color: hsl(135deg 100% 50% / 25%)
            }
            .commit-description {
                background-color: hsl(210deg 100% 50% / 30%);
            }
        }
    `;
    document.head.appendChild(styleEl);
}

function createPrettyCommitMessageEl(parsedMessage) {
    let newCommitMessageEl = document.createElement("div");
    newCommitMessageEl.classList.add("commit-message");
    if (parsedMessage.type) {
        let typeEl = document.createElement("span");
        typeEl.classList.add("commit-type");
        typeEl.textContent = parsedMessage.type;
        newCommitMessageEl.appendChild(typeEl);
    }
    if (parsedMessage.scope) {
        let scopeEl = document.createElement("span");
        scopeEl.classList.add("commit-scope");
        scopeEl.textContent = parsedMessage.scope;
        newCommitMessageEl.appendChild(scopeEl);
    }
    let descriptionEl = document.createElement("span");
    descriptionEl.classList.add("commit-description");
    descriptionEl.textContent = parsedMessage.description;
    newCommitMessageEl.appendChild(descriptionEl);
    return newCommitMessageEl;
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

function intervalUntil(stopConditionCallback, handlerCallback, interval = 100, maxAttempts = 2) {
    let attempts = 0;
    let timerHandle = setInterval(() => {
        attempts++;
        handlerCallback();
        if (stopConditionCallback() || attempts >= maxAttempts) {
            clearInterval(timerHandle);
        }
    }, interval);
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
