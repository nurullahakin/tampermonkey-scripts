// ==UserScript==
// @name         phpMyAdmin - highlight non-empty tables
// @namespace    http://tampermonkey.net/
// @version      2026-10-21
// @description  Highlight the Rows cell on the database structure page when it isn't 0
// @author       You
// @match        http://localhost:8100/index.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=phpmyadmin.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        table.data tbody td.tbl_rows.tm-nonzero {
            background: #fff3a0 !important;
            /* Bootstrap stripes/hover paint rows with an inset box-shadow over the background */
            box-shadow: inset 0 0 0 9999px #fff3a0 !important;
            color: #000 !important;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    function highlight() {
        // Only on /database/structure (any db); phpMyAdmin navigates via AJAX so check on every pass
        if (new URLSearchParams(location.search).get('route') !== '/database/structure') return;

        // tbody td only: the footer "Sum" cell is a <th> in <tfoot>
        document.querySelectorAll('table.data tbody td.tbl_rows').forEach(td => {
            // Handles "0", "1,234", "~1,234"; non-numeric (views, "-") stays unhighlighted
            const digits = td.textContent.replace(/[^\d]/g, '');
            td.classList.toggle('tm-nonzero', digits !== '' && Number(digits) !== 0);
        });
    }

    // Re-run on AJAX navigation and when approximate row counts are replaced with exact ones
    let pending = false;
    new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; highlight(); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });

    highlight();
})();
