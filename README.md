# netnook.app

Customizable homepage launcher designed to be used as a startup page or as a Progressive Web App.

## What is netnook.app

netnook.app is a lightweight, privacy-first speed dial and launcher.
It is a static open source site that runs fully in the browser.

## Main features

- Fast keyboard-first search/filter experience
- Real-time filtering while typing: links are narrowed to those containing the typed characters
- URL detection and direct open mode
- Edit mode to reorder, add, edit, and delete bookmarks and separators
- In-app help popup (question icon or ? key)
- Import/export bookmarks as JSON
- Local-only data storage (browser localStorage)

## Keyboard shortcuts

- / : open search mode
- Enter : open selected bookmark or run search
- Esc : clear/exit current context
- ? : open/close help popup (disabled while edit mode is active)
- F2 : toggle edit mode

### Edit mode keys

- E : edit selected item
- Arrow keys or WASD : move selected item
- N : add link after selected
- M : add separator after selected
- X : delete selected item

## Help and edit mode behavior

- Help popup and edit mode are mutually exclusive
- While edit mode is active, help icon and help shortcut are disabled

## Privacy

- Bookmark data is stored locally in your browser only
- No backend is required for normal usage
- Use Download to export a backup JSON file

## Companion extension

- Chrome Web Store: https://chromewebstore.google.com/detail/netnookapp/ajbikbmkmomhaejnednanjbhoihinapp

## Run locally

Open index.html in a browser, or serve the folder with any static file server.

## Project structure

- index.html: main page and dialogs
- css/styles.css: visual styles
- js/netnook.js: application logic and keyboard handling
- data/bookmarks.js: initial bookmark catalog
