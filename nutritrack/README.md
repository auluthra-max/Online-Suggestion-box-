# NutriTrack

A private, offline-friendly nutrition tracker with an Indian food database.
Plain HTML, CSS and JavaScript — no build step and no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder:

```
cd nutritrack
python3 -m http.server 8000   # then visit http://localhost:8000
```

It also works as-is on any static host (for example GitHub Pages), which is the
easiest way to use it on an Android phone. In Chrome, open the page, tap the
menu and choose "Add to Home screen" / "Install app". Once installed it also
works offline.

## What's inside

| File | Purpose |
|---|---|
| `index.html` | App shell (sidebar on desktop, bottom navigation on mobile) |
| `css/styles.css` | Dark theme and responsive layout |
| `js/foods.js` | Built-in Indian food database (about 160 foods) |
| `js/store.js` | IndexedDB storage, data model, sample data, goal suggestions |
| `js/ui.js` | Modals, toasts, tooltips and charts |
| `js/app.js` | Views, actions and routing |

## Data and privacy

Everything is stored in the browser's IndexedDB on the device (with a
localStorage fallback if IndexedDB is blocked). Nothing is sent anywhere.
Food and water logs can be exported to CSV from **Profile & goals**.

## About the nutrition values

All values in the built-in database are **estimates** for typical home-style
portions. They have not been verified against a laboratory analysis or an
official food-composition table, and real values vary with recipe, oil and
portion size. Custom foods use whatever values you enter. Suggested goals are
general reference ranges by age and activity, not medical advice.
