# netnook.app

Customizable homepage launcher designed to be used as a startup page or as a Progressive Web App.

## What is netnook.app

netnook.app is a lightweight, privacy-first speed dial and launcher.
It is a static open source site that runs fully in the browser.

## Main features

- Fast keyboard-first search/filter experience
- Real-time filtering while typing: links are narrowed to those containing the typed characters
- URL detection and direct open mode
- Calculator mode: shows the result of any typed mathematical expressions, use Enter to copy
- Edit mode to reorder, add, edit, and delete bookmarks and separators
- In-app help popup (question icon or ? key)
- Import/export bookmarks as JSON
- Local-only data storage (browser localStorage)

## Privacy

- Bookmark data is stored locally in your browser only
- No backend is required for normal usage
- Use Download to export a backup JSON file

## Companion extension

There's a companion extension for Chromium browsers that uses netnook.app as the <newtab> page.

- Chrome Web Store: https://chromewebstore.google.com/detail/netnookapp/ajbikbmkmomhaejnednanjbhoihinapp

## PWA Application

The folder has files so it's detected by most modern browsers as a downloadable progressive web app, than can be installed as a local web browser app.

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

## How to host your own

### Hosting Service

Serve via http(s) the file `index.html` and the folders `css/`, `data/`, and `js/` on any static web hosting service.

### Run locally

Open index.html in a browser, or serve the folder with any static file server.

Example using Python, on the project root folder:

```sh
py -m http.server 8000
```

## Project structure

- index.html: main page and dialogs
- css/styles.css: visual styles
- js/netnook.js: application logic and keyboard handling
- data/bookmarks.js: initial bookmark catalog
- data/search-engines.js: initial search engine catalog
