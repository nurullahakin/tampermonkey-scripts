# tampermonkey-scripts

Userscripts for [Tampermonkey](https://www.tampermonkey.net/), mostly for making GitHub issues and pull requests easier to read.

**[Screenshots](SCREENSHOTS.md)** · Live demos: [issue #4](https://github.com/nurullahakin/tampermonkey-scripts/issues/4), [PR #5](https://github.com/nurullahakin/tampermonkey-scripts/pull/5)

## Scripts

| Script | Runs on | What it does |
|---|---|---|
| [Issue Progress Bar](GitHub%20-%20Issue%20Progress%20Bar.js) | Issues | Adds a `done / not done / total` task badge and a progress bar to the issue header. |
| [Scroll Boxes](GitHub%20-%20Scroll%20Boxes.js) | Issues, PR conversations | Wraps everything between two `--- scroll-box ---` lines in a scrollable box. |
| [PR Image Viewer](GitHub%20-%20PR%20Image%20Viewer.js) | PR conversations | Opens images in the PR description in a lightbox with thumbnails, keyboard navigation, zoom and swipe. |
| [Pretty Commit Messages](GitHub%20-%20Pretty%20Commit%20Messages.js) | PRs, commit lists, single commits | Splits `(type) scope: description` commit messages into colored chips. |
| [Mark Clicked Commits](GitHub%20-%20Mark%20Clicked%20Commits.js) | PRs | Dims commit links you have already opened. |
| [Pretty PR Files](GitHub%20-%20Pretty%20PR%20Files.js) | PR changes, compare | Shows each changed file as a separate card with more spacing. |
| [PR Commits Sidebar](GitHub%20-%20PR%20Commits%20Sidebar.js) | PR changes | Keeps the PR's commit list open as a sidebar next to the diff. |
| [phpMyAdmin - highlight non-empty tables](phpMyAdmin%20-%20highlight%20non-empty%20tables.js) | phpMyAdmin (`localhost:8100`) | Highlights the row count of tables that aren't empty. |

Mark Clicked Commits is by [buluterol](https://github.com/buluterol). The other scripts are by Nurullah Akın.

## Install

1. Install the Tampermonkey browser extension.
2. In Tampermonkey, choose **Create a new script**, replace the template with the contents of a `.js` file from this repo, and save.

Scripts are matched by `@name` and `@namespace`, so if you rename a script, delete the old copy from Tampermonkey after installing the new one.
