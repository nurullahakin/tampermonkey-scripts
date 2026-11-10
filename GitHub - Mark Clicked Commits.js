// ==UserScript==
// @name         Mark Clicked Commits
// @namespace    https://github.com/buluterol
// @version      2025-07-22
// @description  Marks clicked commits in GitHub PR
// @author       buluterol
// @match        https://github.com/*/*/pull/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    let markedCommits = getMarkedCommitHashes();

    window.addEventListener("load", function () {
        document.querySelectorAll("a[href*='/commits/']").forEach(function (link) {
            let linkCommitHash = getCommitHashFromLink(link);

            if (markedCommits.includes(linkCommitHash)) {
                markLink(link);
            }

            link.addEventListener("click", function (e) {
                if (e.button !== 0) {
                    return;
                }
                markLink(this);
                markCommit(linkCommitHash);
            });

            link.addEventListener("auxclick", function (e) {
                if (e.button !== 1) {
                    return;
                }
                markLink(this);
                markCommit(linkCommitHash);
            });
        });
    });

    function getCommitHashFromLink(link) {
        let href = link.getAttribute("href");
        let parts = href.split("/");
        return parts[parts.length - 1];
    }

    function markLink(link) {
        link.style.opacity = "0.5";
    }

    function getMarkedCommitHashes() {
        let stored = localStorage.getItem("markedCommits");
        return stored ? JSON.parse(stored) : [];
    }

    function markCommit(commitHash) {
        let markedCommits = getMarkedCommitHashes();
        if (!markedCommits.includes(commitHash)) {
            markedCommits.push(commitHash);
            localStorage.setItem("markedCommits", JSON.stringify(markedCommits));
        }
    }
})();
