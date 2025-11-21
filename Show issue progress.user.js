// ==UserScript==
// @name         Show issue progress
// @namespace    https://github.com/nurullahakin
// @version      2025-06-03
// @description  Show task progress in issues
// @author       Noreh AD
// @match        https://github.com/*/*/issues/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // #region ==================== APP

    window.addEventListener("load", function () {
        analyzeTasks();
    });

    function analyzeTasks() {
        let issueBody = qs('[data-testid="markdown-body"]');

        let checkboxes = Array.from(qsa("input[type=checkbox]", issueBody));

        let totalCount = checkboxes.length;
        let tickedCount = checkboxes.filter((cb) => cb.checked).length;
        let untickedCount = totalCount - tickedCount;

        let headerStateEl = qs('[data-testid="header-state"]');
        headerStateEl.parentElement.classList.add("header-state-container");

        document.head.append(
            htmlFromString(`
                <style>
                    .header-state-container {
                        display: flex;
                        align-items: center;
                        width: 100%;
                    }
                </style>
            `)[0]
        );

        let progressBadgeEl = null;

        badge: {
            progressBadgeEl = htmlFromString(`
                <div class="issue-progress-badge">
                    <div class="task-counts">
                        <div class="done-count">${tickedCount}</div>
                        <div class="task-count-separator">/</div>
                        <div class="undone-count">${untickedCount}</div>
                        <div class="task-count-separator">/</div>
                        <div class="total-count">${totalCount}</div>
                    </div>
                    <div>tasks</div>
                </div>
            `)[0];
            headerStateEl.after(progressBadgeEl);

            document.head.append(
                htmlFromString(`
                    <style>
                        .issue-progress-badge {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.3rem;
                            border-radius: 1rem;
                            border: 1px solid hsl(0deg 0% 0% / 20%);
                            padding: 0.1rem 0.7rem;
                            margin-left: 1rem;
                            color: hsl(0deg 0% 0% / 60%);
                            vertical-align: 2px;
                        }
                        .issue-progress-badge .task-counts {
                            display: flex;
                            align-items: center;
                        }
                        .issue-progress-badge .task-counts .task-count-separator {
                            margin-inline: 0.2rem;
                            color: hsl(0deg 0% 0% / 40%);
                        }
                        .issue-progress-badge .task-counts .done-count {
                            color: hsl(120deg 70% 30%);
                        }
                        .issue-progress-badge .task-counts .undone-count {
                            color: hsl(0deg 80% 40%);
                        }
                        .issue-progress-badge .task-counts .total-count {
                            color: hsl(240deg 50% 40%);
                        }
                    </style>
                `)[0]
            );
        }

        bar: {
            let progressPercent = totalCount > 0 ? (tickedCount / totalCount) * 100 : 0;
            progressPercent = progressPercent.toFixed(0);
            let progressBarEl = htmlFromString(`
                <div class="issue-progress-bar-container">
                    <progress class="issue-progress-bar" max="${totalCount}" value="${tickedCount}"></progress>
                    <span>%${progressPercent}</span>
                </div>
            `)[0];
            progressBadgeEl.after(progressBarEl);
            document.head.append(
                htmlFromString(`
                    <style>
                        .issue-progress-bar-container {
                            display: inline-flex;
                            margin-left: 1rem;
                            flex-grow: 1;
                            margin-right: 320px;
                            align-items: center;
                            gap: 0.5rem;
                        }
                        .issue-progress-bar-container progress {
                            width: 100%;
                        }
                    </style>
                `)[0]
            );
        }
    }

    // #endregion

    // #region ==================== UTILS: QUERY

    function qs(query, parent) {
        if (query instanceof HTMLElement) return query;
        if (parent === undefined) {
            parent = document;
        }
        if (typeof parent == "string") {
            parent = qs(parent);
        }
        if (parent === null) {
            return null;
        }
        return parent.querySelector(query);
    }

    function qsa(query, parent) {
        if (query instanceof HTMLElement) return query;
        if (parent === undefined) {
            parent = document;
        }
        if (typeof parent == "string") {
            parent = qs(parent);
        }
        if (parent === null) {
            return [];
        }
        return Array.from(parent.querySelectorAll(query));
    }

    // #endregion

    // #region ==================== UTILS: HTML

    /**
     * Converts an HTML string into an array of DOM elements.
     *
     * @param {string} htmlString - The HTML string to convert.
     * @returns {Array<Node|Element>} An array of child nodes/elements of the created DOM element.
     */
    function htmlFromString(htmlString, onlyElements = false) {
        const template = document.createElement("template");
        template.innerHTML = htmlString.trim();
        let nodes = Array.from(template.content.childNodes);
        if (onlyElements) {
            nodes = nodes.filter((node) => node.nodeType === Node.ELEMENT_NODE);
        }
        return nodes;
    }

    // #endregion
})();
