# Pawprint Pet Home Monitor

A standalone browser app for keeping a household pet roster, logging meals and observed movement, and calculating calories from the values you enter. It saves data in the current browser on the current device; no account or server is involved.

## Run it

Open `index.html` in a modern browser. To use the camera preview, serve this folder from `localhost` or HTTPS and allow camera access. For example, with Python installed:

```powershell
cd D:\Project04\project04-1\pet-home-monitor
python -m http.server 8000
```

Then visit `http://localhost:8000`. The camera preview is not recorded or analyzed, and stops when the page is closed.

## Using the tracker

1. Select **Add a pet** and enter each pet's name and type. A tag/collar note is optional and is only a reminder for you.
2. Log each meal by selecting the pet, entering the food, number of pieces, and calories per piece.
3. Calories are calculated as `quantity × kcal per piece`. The dashboard totals entries logged today and displays a separate total for each pet.
4. Add movement notes with the pet, room, activity, and minutes observed. These are manual notes, not automated tracking.

The calculator reports only what you log. It does not estimate a pet's calorie needs or whether a diet is appropriate; check feeding plans with your veterinarian. Data is saved in `localStorage` for this browser, so it is not shared between devices and can be cleared with the browser's site data.

## What your hardware can and cannot do

- **HD camera:** This starter app can display a live browser camera preview. It does not yet detect, identify, or follow pets. Automated activity detection needs a video-processing service or local computer, a suitable computer-vision model, camera placement that covers the area, and a way to confirm which pet is in view. A single ordinary camera may not reliably distinguish pets that look alike or are out of frame.
- **AirTags:** AirTags do not provide a public, supported API for a third-party website to read their location. They can help you locate a tagged animal with Apple's Find My app, but should not be treated as a live indoor location feed or an eating sensor. This app therefore does not connect to AirTags; the optional tag field is just a text note.
- **Identifying who ate:** To attribute food automatically, you would need a sensor at each feeder (such as a pet-specific microchip/RFID feeder or a scale) and a dependable pet-identification method. A camera alone cannot confirm how much food was eaten; a scale under the bowl can measure the change in food weight.

## A practical next build

1. **Instrument feeding:** Use a separate measured bowl/feeder per pet, preferably with a load cell or connected feeder and a stable tare procedure. Record weight before and after each visit. Calorie conversion needs the food's kcal per gram (or calories per piece if the pieces are consistent), not an assumed portion.
2. **Add reliable identity:** Pair feeder events with a microchip-enabled feeder or another pet-specific identity signal. Keep manual confirmation for ambiguous events.
3. **Process camera locally:** Add a local computer (for example, a small PC) that can access an RTSP/USB camera and run a pet-detection/tracking model. Store timestamped room/activity events rather than claiming precise indoor positioning. A browser page by itself is not a continuous background video-analysis service.
4. **Build a backend only when needed:** For multiple cameras/devices, use an API and database for timestamped pet, meal, and movement events; add authentication, retention controls, and household consent before storing or transmitting video.
5. **Validate before relying on it:** Compare measured portions and activity events against observations for each pet, handle missed/duplicate detections, and ask a veterinarian about individual calorie targets.

The current app is a local-first prototype for the logging and calorie-calculation parts. Its camera control is a preview only, and the movement log is intentionally manual.
