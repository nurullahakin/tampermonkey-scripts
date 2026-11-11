// ==UserScript==
// @name         GitHub - PR - Commits Sidebar
// @namespace    https://github.com/nurullahakin
// @version      2026-11-11
// @description  Always-visible commits list at the left of the PR changes page: [commits] [files] [changes]
// @author       Nurullah Akın
// @match        https://github.com/*/*/pull/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

/*
 * How it works
 * ------------
 * 1. On every DOM change (GitHub is a SPA and re-renders a lot), `sync()` makes sure
 *    our sidebar and its toggle button exist and are in the right place.
 * 2. The commit list comes from the PR's `/commits` page, which embeds all commits as JSON.
 *    It's fetched once per PR and cached.
 * 3. Each commit is a plain link to `/pull/N/changes/<sha>`; the one(s) in the URL get highlighted.
 * 4. The show/hide state is a class on <html>, saved in localStorage.
 */

(function () {
    "use strict";

    // #region ==================== CONFIG

    const SIDEBAR_ID = "tm-commits-aside";
    const TOGGLE_ID = "tm-commits-aside-toggle";
    const HIDDEN_CLASS = "tm-ca-hidden"; // on <html> while the sidebar is hidden
    const LAYOUT_CLASS = "tm-ca-layout"; // on GitHub's layout row that holds the columns
    const STORAGE_KEY = "tm-commits-aside-hidden";

    // /owner/repo/pull/123/changes[/<sha> | /<sha>..<sha>]
    const CHANGES_PATH_RE = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/changes(?:\/([^/?#]+))?/;

    const SELECTORS = {
        filesColumn: '[class*="prc-PageLayout-PaneWrapper-"]',
        changesColumn: '[data-component="SplitPageLayout.Content"]',
        // GitHub renders only one of these, depending on whether the file tree is open
        fileTreeButton: '[data-testid="collapse-file-tree-button"], [data-testid="expand-file-tree-button"]',
    };

    // octicon "git-commit", 16px
    const COMMIT_ICON = `<svg aria-hidden="true" class="octicon octicon-git-commit" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="vertical-align: text-bottom;"><path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path></svg>`;

    // #endregion

    // #region ==================== STATE & STARTUP

    /** @type {Map<string, Promise<Commit[]>>} prKey -> commits, fetched once per PR */
    const commitsCache = new Map();
    let isHidden = loadHidden();
    document.documentElement.classList.toggle(HIDDEN_CLASS, isHidden);
    injectStyles();
    observeDom(sync);
    sync();

    /** Runs `callback` at most once per animation frame, whenever the DOM changes. */
    function observeDom(callback) {
        let scheduled = false;
        new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                callback();
            });
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    function sync() {
        const route = parseRoute();
        if (!route) {
            document.getElementById(SIDEBAR_ID)?.remove();
            document.getElementById(TOGGLE_ID)?.remove();
            return;
        }
        ensureToggle();
        ensureSidebar(route);
    }

    /** @returns {{owner: string, repo: string, number: string, range: string, prKey: string} | null} */
    function parseRoute() {
        const match = location.pathname.match(CHANGES_PATH_RE);
        if (!match) return null;
        const [, owner, repo, number, range = ""] = match;
        return { owner, repo, number, range, prKey: `${owner}/${repo}/${number}` };
    }

    // #endregion

    // #region ==================== SIDEBAR

    function ensureSidebar(route) {
        // Sidebar goes right before the files column. That column isn't rendered at all
        // when the file tree is collapsed, so fall back to the changes column.
        const nextColumn = document.querySelector(SELECTORS.filesColumn) || document.querySelector(SELECTORS.changesColumn);
        if (!nextColumn?.parentElement) return;

        let sidebar = document.getElementById(SIDEBAR_ID);
        const isStale = sidebar && (sidebar.dataset.prKey !== route.prKey || sidebar.nextElementSibling !== nextColumn);
        if (isStale) {
            sidebar.remove();
            sidebar = null;
        }

        if (!sidebar) {
            sidebar = createSidebar(route);
            nextColumn.parentElement.classList.add(LAYOUT_CLASS);
            nextColumn.before(sidebar);
            fillSidebar(sidebar, route);
        } else if (sidebar.dataset.range !== route.range) {
            // navigated to another commit within the same PR
            highlightCurrent(sidebar, route);
        }
    }

    function createSidebar(route) {
        const sidebar = document.createElement("aside");
        sidebar.id = SIDEBAR_ID;
        sidebar.dataset.prKey = route.prKey;
        sidebar.append(el("div", "tm-ca-status", "Loading commits…"));
        return sidebar;
    }

    async function fillSidebar(sidebar, route) {
        let commits;
        try {
            commits = await fetchCommits(route);
        } catch (err) {
            console.error("[commits-aside]", err);
            sidebar.querySelector(".tm-ca-status").textContent = "Couldn't load commits.";
            return;
        }

        const prUrl = `/${route.owner}/${route.repo}/pull/${route.number}`;
        const list = el("ol", "tm-ca-list");

        list.append(
            createItem({
                href: `${prUrl}/changes`,
                title: "All commits",
                meta: `${commits.length} commits`,
            }),
        );
        commits.forEach((commit, i) => {
            list.append(
                createItem({
                    href: `${prUrl}/changes/${commit.oid}`,
                    oid: commit.oid,
                    index: i + 1,
                    title: commit.shortMessage,
                    hash: commit.oid.slice(0, 7),
                    meta: `${commit.author} committed on ${formatDate(commit.date)}`,
                }),
            );
        });

        sidebar.replaceChildren(list);
        highlightCurrent(sidebar, route);
    }

    /**
     * One list row:
     *   [index]  [title ................ hash]
     *            [meta: "author committed on Jun 5"]
     */
    function createItem({ href, oid = "", index = "", title, hash = "", meta }) {
        const head = el("span", "tm-ca-head");
        head.append(el("span", "tm-ca-title", title));
        if (hash) head.append(el("code", "tm-ca-hash", hash));

        const body = el("span", "tm-ca-body");
        body.append(head, el("span", "tm-ca-meta", meta));

        const link = el("a");
        link.href = href;
        link.title = title;
        link.append(el("span", "tm-ca-index", String(index)), body);

        const item = el("li");
        item.dataset.oid = oid; // empty for "All commits"
        item.append(link);
        return item;
    }

    function highlightCurrent(sidebar, route) {
        const items = [...sidebar.querySelectorAll(".tm-ca-list > li")];
        if (!items.length) return; // list not loaded yet; fillSidebar() highlights when done

        const [allCommitsItem, ...commitItems] = items;
        const selected = route.range ? getSelectedCommitItems(commitItems, route.range) : [allCommitsItem];

        for (const item of items) item.classList.toggle("tm-ca-active", selected.includes(item));
        selected[0]?.scrollIntoView({ block: "nearest" });
        sidebar.dataset.range = route.range;
    }

    /**
     * `range` is either a single sha, or "from..to" where `from` is exclusive
     * (same semantics as git: commits after `from`, up to and including `to`).
     */
    function getSelectedCommitItems(commitItems, range) {
        const indexOf = (sha) => commitItems.findIndex((item) => sha && item.dataset.oid.startsWith(sha.toLowerCase()));

        if (!range.includes("..")) {
            const i = indexOf(range);
            return i >= 0 ? [commitItems[i]] : [];
        }

        const [from, to] = range.split(/\.{2,3}/);
        return commitItems.slice(indexOf(from) + 1, indexOf(to) + 1);
    }

    // #endregion

    // #region ==================== TOGGLE BUTTON

    function ensureToggle() {
        if (document.getElementById(TOGGLE_ID)) return;

        const fileTreeButton = document.querySelector(SELECTORS.fileTreeButton);
        const fileTreeButtonGroup = fileTreeButton?.parentElement;
        if (!fileTreeButtonGroup) return;

        // A shallow clone of GitHub's own button gives an identical look.
        // The clone carries no React handlers, so it's safe to wire up ourselves.
        const button = fileTreeButton.cloneNode(false);
        for (const attr of ["data-testid", "aria-labelledby"]) button.removeAttribute(attr);
        button.className = button.className.replace(/\S*TreeToggle\S*/g, "").trim(); // drop GitHub's show/hide-by-viewport classes
        button.id = TOGGLE_ID;
        button.setAttribute("aria-controls", SIDEBAR_ID);
        button.innerHTML = COMMIT_ICON;
        button.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            setHidden(!isHidden);
        });

        // toggles follow column order: [commits] [files]
        fileTreeButtonGroup.before(button);
        updateToggle();
    }

    function setHidden(value) {
        isHidden = value;
        document.documentElement.classList.toggle(HIDDEN_CLASS, isHidden);
        saveHidden(isHidden);
        updateToggle();
    }

    function updateToggle() {
        const button = document.getElementById(TOGGLE_ID);
        if (!button) return;
        const label = isHidden ? "Show commits" : "Hide commits";
        button.title = label;
        button.setAttribute("aria-label", label);
        button.setAttribute("aria-expanded", String(!isHidden));
    }

    function loadHidden() {
        try {
            return localStorage.getItem(STORAGE_KEY) === "1";
        } catch {
            return false;
        }
    }

    function saveHidden(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
        } catch {}
    }

    // #endregion

    // #region ==================== DATA

    /**
     * @typedef {{oid: string, shortMessage: string, author: string, date: string}} Commit
     * @returns {Promise<Commit[]>}
     */
    function fetchCommits(route) {
        if (!commitsCache.has(route.prKey)) {
            const request = fetchCommitsFromCommitsPage(route);
            request.catch(() => commitsCache.delete(route.prKey)); // allow retry on failure
            commitsCache.set(route.prKey, request);
        }
        return commitsCache.get(route.prKey);
    }

    /** The PR's `/commits` page embeds all its commits as JSON in a <script> tag. */
    async function fetchCommitsFromCommitsPage({ owner, repo, number }) {
        const response = await fetch(`/${owner}/${repo}/pull/${number}/commits`, {
            credentials: "same-origin",
            headers: { Accept: "text/html" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const doc = new DOMParser().parseFromString(await response.text(), "text/html");
        for (const script of doc.querySelectorAll('script[data-target="react-app.embeddedData"]')) {
            const groups = JSON.parse(script.textContent)?.payload?.pullRequestsCommitsRoute?.commitGroups;
            if (groups) return groups.flatMap((group) => group.commits).map(toCommit);
        }
        throw new Error("commit data not found on /commits page");
    }

    function toCommit(raw) {
        const author = raw.authors?.[0];
        return {
            oid: raw.oid,
            shortMessage: raw.shortMessage,
            author: author?.login || author?.displayName || raw.committer?.login || "",
            date: raw.authoredDate || raw.committedDate,
        };
    }

    // #endregion

    // #region ==================== UTILS

    function el(tag, className = "", text = "") {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    /** "Jun 5", or "Jun 5, 2024" when not in the current year */
    function formatDate(iso) {
        const date = new Date(iso);
        if (isNaN(date)) return "";
        const options = { month: "short", day: "numeric" };
        if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
        return date.toLocaleDateString(undefined, options);
    }

    // #endregion

    // #region ==================== STYLES

    function injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            /* ---------- layout: [commits] [files] [changes] ---------- */

            .${LAYOUT_CLASS} {
                display: flex !important;
                flex-wrap: wrap !important;
                width: 100%;
                box-sizing: border-box;
            }
            /* toolbar stays on its own row above the columns */
            .${LAYOUT_CLASS} > [class*="toolbarWrapper"] {
                flex: 0 0 100%;
            }
            /* changes column fills the rest. a plain min-width: 0 let it collapse
               to 0px when it was the only visible column, so floor it instead */
            .${LAYOUT_CLASS} > ${SELECTORS.changesColumn} {
                flex: 1 1 0;
                min-width: min(100%, 400px);
            }

            /* ---------- sidebar ---------- */

            #${SIDEBAR_ID} {
                flex: 0 0 300px;
                width: 300px;
                position: sticky;
                top: 76px;
                align-self: flex-start;
                max-height: calc(100vh - 92px);
                overflow-y: auto;
                margin: 16px 1rem 1rem 0; /* top margin aligns with the files & changes columns */
                border: 1px solid var(--borderColor-default, #d0d7de);
                border-radius: var(--borderRadius-medium, 6px);
                background: var(--bgColor-default, #fff);
                font-size: 12px;
            }
            .${HIDDEN_CLASS} #${SIDEBAR_ID} {
                display: none;
            }
            #${SIDEBAR_ID} .tm-ca-status {
                padding: 12px;
                color: var(--fgColor-muted, #59636e);
            }

            /* ---------- list rows ---------- */

            #${SIDEBAR_ID} .tm-ca-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            #${SIDEBAR_ID} .tm-ca-list > li + li {
                border-top: 1px solid var(--borderColor-muted, #d8dee4);
            }
            #${SIDEBAR_ID} a {
                display: flex;
                gap: 8px;
                padding: 8px 10px;
                color: var(--fgColor-default, #1f2328);
                text-decoration: none;
            }
            #${SIDEBAR_ID} a:hover {
                background: var(--bgColor-muted, #f6f8fa);
            }
            #${SIDEBAR_ID} .tm-ca-active > a {
                background: var(--bgColor-accent-muted, #ddf4ff);
                box-shadow: inset 3px 0 0 var(--fgColor-accent, #0969da);
            }
            #${SIDEBAR_ID} .tm-ca-index {
                min-width: 20px;
                padding-top: 1px;
                color: var(--fgColor-muted, #59636e);
                text-align: right;
                font-variant-numeric: tabular-nums;
            }
            #${SIDEBAR_ID} .tm-ca-body {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-width: 0;
                gap: 4px;
            }
            #${SIDEBAR_ID} .tm-ca-head {
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }
            #${SIDEBAR_ID} .tm-ca-title {
                flex: 1;
                min-width: 0;
                font-size: 13px;
                font-weight: 600;
                line-height: 1.4;
                overflow-wrap: anywhere;
                /* clamp to 2 lines */
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
                overflow: hidden;
            }
            #${SIDEBAR_ID} .tm-ca-hash {
                flex-shrink: 0;
                padding-top: 1px;
                font-size: 12px;
                color: var(--fgColor-muted, #59636e);
            }
            #${SIDEBAR_ID} .tm-ca-meta {
                color: var(--fgColor-muted, #59636e);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* ---------- toggle button ---------- */

            #${TOGGLE_ID}[aria-expanded="true"] {
                color: var(--fgColor-default, #1f2328) !important;
            }
        `;
        (document.head || document.documentElement).append(style);
    }

    // #endregion
})();
