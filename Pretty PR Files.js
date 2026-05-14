// ==UserScript==
// @name         Pretty PR Files
// @namespace    https://github.com/nurullahakin
// @version      2025-11-14
// @description  Makes the files more readable by spacing.
// @author       Nurullah Akın
// @match        https://github.com/*/*/pull/*/changes
// @match        https://github.com/*/*/pull/*/changes/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    let styles = `
        /* most outward container */
        [data-testid="diff-content"] {
            padding-bottom: calc(5vh + 4rem);
        }
        /* file cards container */
        [data-testid="progressive-diffs-list"] {
            gap: 4rem !important;
            padding: 4rem;
            background-color: hsl(0, 0%, 0%, 0.05);
            box-shadow: inset 0 0 30px 20px white;
        }
        /* file cards */
        [class*="PullRequestDiffsList-module__diffEntry__"] {
            background-color: white;
            box-shadow: 0px 3px 10px 0px hsl(0deg 0% 0% / 20%);
            border-top-left-radius: var(--borderRadius-medium);
            border-top-right-radius: var(--borderRadius-medium);
            border-bottom-right-radius: var(--borderRadius-medium, 6px) !important;
            border-bottom-left-radius: var(--borderRadius-medium, 6px) !important;
        }
        /* file header > file path */
        [class*="DiffFileHeader-module__file-name__"] a code {
            font-weight: 600;
            font-size: 0.8rem;
        }
        /* file header > right side container */
        [class*="DiffFileHeader-module__diff-file-header__"] > div:nth-child(3) {
            gap: 1rem !important;
        }
        /* file header > right side > diff */
        div[class*=DiffFileHeader-module__hide-on-mobile__] > div {
            gap: 0.5rem !important;
        }
        /* file header > right side > diff */
        div[class*=DiffFileHeader-module__hide-on-mobile__] span {
            font-size: 1rem !important;
        }
        /* file header > right side > diff > square container */
        div[class*=DiffFileHeader-module__hide-on-mobile__] > div > div {
            margin-top: 1px;
            opacity: 0.8;
        }
        /* file header > right side > diff > square */
        [class*="DiffSquares-module__diffSquare__"] {
            width: 10px !important;
            height: 10px !important;
        }
        @media (prefers-color-scheme: dark) {
            /* file cards container */
            [data-testid="progressive-diffs-list"] {
                box-shadow: inset 0 0 30px 20px #0d1117;
            }
            /* file cards */
            [class*="PullRequestDiffsList-module__diffEntry__"] {
                background-color: hsl(0deg 0% 100% / 5%);
                box-shadow: 0px 3px 10px 0px hsl(0deg 0% 0% / 20%);
            }
        }
    `;
    window.addEventListener("load", () => {
        let styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
        document
            .querySelectorAll(`[class*="DiffFileHeader-module__diff-file-header__"] > div:nth-child(3)`)
            .forEach((el) => {
                el.classList.remove("gap-2"); // somehow not overridable with !important
            });
    });
})();
