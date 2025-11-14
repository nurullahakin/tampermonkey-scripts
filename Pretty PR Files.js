// ==UserScript==
// @name         Pretty PR Files
// @namespace    https://github.com/nurullahakin
// @version      2025-11-14
// @description  Makes the files more readable by spacing.
// @author       Nurullah Akın
// @match        https://github.com/*/*/pull/*/files
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    let styles = `
        .js-diff-container .js-diff-progressive-container {
            display: flex;
            flex-direction: column;
            gap: 4rem;
            padding: 4rem;
            background-color: hsl(0, 0%, 0%, 0.05);
        }

        .js-diff-container .js-diff-progressive-container + .js-diff-container .js-diff-progressive-container {
            padding-top: 0;
        }

        .js-diff-container .file {
            background-color: white;
            box-shadow: 0px 5px 10px 0px hsl(0deg 0% 0% / 20%);
        }

        .file-info a {
            font-weight: 600;
            font-size: 0.9rem;
            display: flex;
            gap: 1rem;
            font-family: sans-serif;
        }

        @media (prefers-color-scheme: dark) {
            .js-diff-container .file {
                background-color: hsl(0deg 0% 100% / 5%);
                box-shadow: 0px 5px 10px 0px hsl(0deg 0% 0% / 20%);
            }
        }
    `;
    window.addEventListener("load", () => {
        let styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    });
})();
