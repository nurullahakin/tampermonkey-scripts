// ==UserScript==
// @name         Remember Clicked Commits
// @namespace    https://github.com/buluterol
// @version      2025-07-22
// @description  Remember clicked commits in GitHub pull requests
// @author       buluterol
// @match        https://github.com/*/*/pull/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    document.querySelectorAll('code a.markdown-title').forEach(function (link) {
        link.addEventListener('mousedown', function (e) {
            if (e.button === 0 || e.button === 1) {
                var href = this.getAttribute('href');
                var parts = href.split('/');
                var codeParent = this.closest('code');
                if (codeParent) {
                    codeParent.style.opacity = '0.5';
                }
                var lastPart = parts[parts.length - 1];
                lastPart = lastPart.replace(/['"]/g, '');
                var clickedCommits = JSON.parse(localStorage.getItem('clickedCommits')) || [];
                if (!clickedCommits.includes(lastPart)) {
                    clickedCommits.push(lastPart);
                    localStorage.setItem('clickedCommits', JSON.stringify(clickedCommits));
                }
            }
        });

        var clickedCommits = JSON.parse(localStorage.getItem('clickedCommits')) || [];
        var href = link.getAttribute('href');
        var parts = href.split('/');
        var lastPart = parts[parts.length - 1].replace(/['"]/g, '');
        if (clickedCommits.includes(lastPart)) {
            var storedCodeParent = link.closest('code');
            if (storedCodeParent) {
                storedCodeParent.style.opacity = '0.5';
            }
        }
    });
})();