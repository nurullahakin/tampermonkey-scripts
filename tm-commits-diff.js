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
    let commitsListEl = null;
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

function main() {
    let prevCommitButton = document.querySelector("a[id*=prev-commit]");
    let nextCommitButton = document.querySelector("a[id*=next-commit]");
    prevCommitButton?.addEventListener("click", () => {
        setTimeout(() => {
            changeUI();
        }, 3000);
    });
    nextCommitButton?.addEventListener("click", () => {
        setTimeout(() => {
            changeUI();
        }, 3000);
    });
    changeUI();
}

function changeUI() {
    commitsListEl = document.querySelector(".js-diffbar-range-list");
    suffixCommitPagingToTitle();
    let newCommitsListEl = addCommitsListAside();
    let commitLinks = newCommitsListEl.querySelectorAll("a.select-menu-item");
    for (const commitLink of commitLinks) {
        commitLink.addEventListener("click", () => {
            setTimeout(() => {
                changeUI();
            }, 3000);
        });
    }
}

// #region ==================== UTILS

function applyStyles(el, styles) {
    for (let style in styles) {
        el.style[style] = styles[style];
    }
}

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// #endregion

// #region ==================== FUNCS: PAGING

function getCurrentCommitIndex() {
    let currentCommitItem = commitsListEl.querySelector(".in-range");
    let commits = Array.from(commitsListEl.children);
    let currentIndex = commits.indexOf(currentCommitItem);
    return currentIndex;
}

function getCurrentCommitPaging() {
    let commitsCount = commitsListEl.childElementCount;
    let currentIndex = getCurrentCommitIndex();
    let currentPaging = `${currentIndex + 1} / ${commitsCount}`;
    return currentPaging;
}

function suffixCommitPagingToTitle() {
    let commitTitleEl = document.querySelector(".commit-title");
    let commitTitle = commitTitleEl.textContent.trim();
    let commitPaging = getCurrentCommitPaging();
    commitTitleEl.innerHTML = `
        <span>${commitTitle}</span>
        <span style="margin-left: 1rem; opacity: 0.5">(${commitPaging})</span>
    `;
}

// #endregion

// #region ==================== FUNCS

function addCommitsListAside() {
    let newContainer = document.createElement("div");
    newContainer.id = "commits-list-aside";
    applyStyles(newContainer, {
        display: "flex",
        gap: "2rem",
    });

    let style = document.createElement("style");
    style.textContent = `
        #commits-list-aside .current-commit {
            background-color: hsla(212, 92.10%, 44.50%, 0.25);
        }
        #commits-list-aside .select-menu-item.current-commit:hover {
            background-color: var(--bgColor-accent-emphasis, var(--color-accent-emphasis));;
        }
        #commits-list-aside .select-menu-item:hover .text-emphasized,
        #commits-list-aside .select-menu-item:focus .text-emphasized {
            color: white !important;
        }
    `;
    newContainer.append(style);

    let newCommitsListEl = commitsListEl.cloneNode(true);
    applyStyles(newCommitsListEl, {
        maxHeight: "70vh",
        overflowY: "auto",
        minWidth: "450px",
        position: "sticky",
        top: "80px",
        border: "1px solid silver",
        borderRadius: "6px",
    });
    newContainer.prepend(newCommitsListEl);

    let commits = Array.from(newCommitsListEl.children);
    for (const el of Array.from(newCommitsListEl.children)) {
        applyStyles(el, {
            display: "flex",
            gap: "0.5rem",
            paddingLeft: "8px",
        });
        applyStyles(el.children[0], {
            display: "flex",
            flexDirection: "column",
            position: "relative",
            flexGrow: "1",
            maxWidth: "calc(100% - 33px)",
        });
        applyStyles(el.children[0].children[0], {
            position: "absolute",
            right: "0",
        });
        applyStyles(el.children[0].children[1], {
            marginRight: "50px",
        });
        let commitIndex = document.createElement("span");
        commitIndex.textContent = commits.indexOf(el) + 1;
        applyStyles(commitIndex, {
            minWidth: "25px",
        });
        el.prepend(commitIndex);
    }

    let currentCommitIndex = getCurrentCommitIndex();
    newCommitsListEl.children[currentCommitIndex].classList.add("current-commit");
    setTimeout(() => {
        newCommitsListEl.children[currentCommitIndex].scrollIntoView({ block: "center" });
    });

    let filesEl = document.querySelector("#files");
    filesEl.previousElementSibling.after(newContainer);

    newContainer.append(filesEl);

    return newCommitsListEl;
}

// #endregion
