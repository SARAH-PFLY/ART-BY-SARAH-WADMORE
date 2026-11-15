# Artwork gallery

## Publish
Merge the gallery pull request, then select Settings → Pages → Deploy from a branch → main → / (root) → Save. GitHub will display the published URL when deployment finishes. No package installation or build is needed.

## Add original artworks
Upload images into an `artworks/` folder. Edit `artworks.json` to contain entries like:

```json
[
  {
    "title": "Artwork title",
    "src": "artworks/artwork-original.jpg",
    "thumbnail": "artworks/artwork-web.jpg",
    "medium": "Acrylic on canvas"
  }
]
```

`title` and `src` are required; `thumbnail` and `medium` are optional. Use a compressed web copy for the wall and a larger original for the viewer. Keep filenames case-correct and use relative paths so GitHub project Pages works. Entries appear in manifest order, with dense packing filling available spaces. The wall crops images to fill the brick shapes; the fullscreen viewer always shows the complete artwork without cropping.

An empty manifest displays 24 locally generated abstract demo tiles, each explicitly labelled. These are layout placeholders, not Sarah's artwork. They automatically disappear when real artwork entries are added.

## Layout and controls
Three columns on desktop; two columns at 650px and below. Different tile heights create a gap-free wall. Click or tap to open the full viewport viewer. Use arrows, left/right keys, or swipe horizontally to navigate. Escape or × closes and restores focus. Device fullscreen is available where supported. Keyboard focus stays inside the dialog. Images after the first four load lazily; the site uses no external scripts, fonts, or image services.

## Validation
JavaScript syntax checked with Node. Browser and touch-device visual checks remain required before production publishing. Check desktop and mobile widths, opening/closing, keyboard focus, swipe navigation, and original artwork loading after uploading images.
