// ==UserScript==
// @name         PR Commits List
// @namespace    http://tampermonkey.net/
// @version      2025-09-29
// @description  try to take over the world!
// @author       You
// @match        https://github.com/*/*/pull/*/commits/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    let loaded = false;
    window.addEventListener("load", function () {
        if (loaded) return;
        loaded = true;
        main();
    });
    setTimeout(() => {
        if (loaded) return;
        loaded = true;
        main();
    }, 5000);
})();

// #region ==================== MAIN

function main() {
    improveUI();
}

// #endregion

// #region ==================== IMPROVE UI

function improveUI() {
    let hasMultipleFiles = false;
    let diffLayoutEl = document.querySelector("#diff-layout-component");
    hasMultipleFiles = Boolean(diffLayoutEl);

    let asideContainer = document.createElement("div");
    asideContainer.id = "commits-aside-container";
    asideContainer.style.display = "flex";
    asideContainer.style.gap = "1rem";
    asideContainer.style.flexDirection = "row";

    if (hasMultipleFiles) {
        diffLayoutEl.before(asideContainer);
        asideContainer.append(diffLayoutEl);
    } else {
        let commitTitleElXPath = `//*[@id="files_bucket"]/diff-file-filter/diff-layout/div[2]`;
        let commitTitleEl = getElementByXpath(commitTitleElXPath);
        let filesEl = document.querySelector("#files");
        let filesContainer = document.createElement("div");
        filesContainer.id = "files-container";
        commitTitleEl.before(filesContainer);
        filesContainer.append(commitTitleEl);
        filesContainer.append(filesEl);
        filesContainer.before(asideContainer);
        asideContainer.append(filesContainer);
    }

    let detailsMenuXPath = `//*[@id="files_bucket"]/diff-file-filter/diff-layout/div[1]/div/div[2]/div[2]/details[1]/details-menu`;
    let detailsMenuEl = getElementByXpath(detailsMenuXPath);
    let detailsMenuElClone = detailsMenuEl.cloneNode(true);
    detailsMenuElClone.classList.remove("position-absolute", "select-menu-modal");
    detailsMenuElClone.style.zIndex = "0";
    asideContainer.prepend(detailsMenuElClone);

    let selectedCommitEls = [];
    let selectMenuItems = detailsMenuElClone.querySelectorAll(".js-diffbar-range-list .select-menu-item");
    for (let i = 0; i < selectMenuItems.length; i++) {
        let selectMenuItem = selectMenuItems[i];
        let indexEl = document.createElement("div");
        indexEl.classList.add("commit-index");
        indexEl.textContent = (i + 1).toString();
        selectMenuItem.prepend(indexEl);
        if (selectMenuItem.classList.contains("in-range")) {
            selectedCommitEls.push(selectMenuItem);
        }
        selectMenuItem.addEventListener("click", () => {
            setTimeout(() => {
                improveUI();
            }, 3000);
        });
    }

    if (selectedCommitEls.length) {
        setTimeout(() => {
            selectedCommitEls[0].scrollIntoView({ block: "center" });
        });
    }

    let style = document.createElement("style");
    style.textContent = `
        #commits-aside-container {
            display: flex;
            align-items: flex-start;
        }
        #files-container {
            flex-grow: 1;
        }
        #commits-aside-container .select-menu-list {
            max-height: 60vh;
        }
        #commits-aside-container .in-range .description {
            color: inherit;
        }
        #commits-aside-container .select-menu-item {
            padding-left: 1rem;
            display: flex;
            gap: 0.5rem;
            background-color: transparent;
        }
        #commits-aside-container .in-range {
            background-color: hsl(200deg 100% 93%);
            color: black;
        }
        @media (prefers-color-scheme: dark) {
            #commits-aside-container .in-range {
                background-color: hsl(200deg 100% 70% / 30%);
                color: white;
            }
        }
        #commits-aside-container .select-menu-item:hover {
            background-color: var(--bgColor-accent-emphasis, var(--color-accent-emphasis));
            color: white;
        }
        #commits-aside-container .select-menu-item:hover * {
            color: white;
        }
        #commits-aside-container .select-menu-item:focus * {
            color: black;
        }
        #commits-aside-container .select-menu-item:hover:focus * {
            color: white;
        }
        #commits-aside-container details-menu {
            width: 400px;
            border: 1px solid silver;
            border-color: var(--borderColor-default, var(--color-border-default));
            border-radius: var(--borderRadius-medium);
        }
        #commits-aside-container details-menu .select-menu-header {
            background: var(--bgColor-muted, var(--color-canvas-subtle));
            border-top-left-radius: var(--borderRadius-medium);
            border-top-right-radius: var(--borderRadius-medium);
        }
        #commits-aside-container .select-menu-item-text {
            display: flex;
            flex-direction: column;
            position: relative;
            width: calc(100% - 33px);
        }
        #commits-aside-container .select-menu-item-text code {
            position: absolute;
            right: 0;
            top: 3px;
        }
        #commits-aside-container .select-menu-item-text div {
            margin-right: 4rem;
        }
        #commits-aside-container .commit-index {
            min-width: 25px;
            opacity: 0.25;
        }
        #diff-layout-component {
            width: 100%;
        }
    `;
    asideContainer.append(style);

    events: {
        let navigationButtons = document.querySelectorAll("a[id*=prev-commit], a[id*=next-commit]");
        for (let navigationButton of navigationButtons) {
            navigationButton.addEventListener("click", () => {
                setTimeout(() => {
                    improveUI();
                }, 3000);
            });
        }
    }
}

// #endregion

// #region ==================== UTILS

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// #endregion