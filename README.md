# Royal Stay Hotel

A responsive hotel website with a Node.js booking API. Bookings are validated and priced on the server; no database is required.

## Run Locally

1. Install Node.js 18 or newer.
2. Open this folder in VS Code.
3. Select **Terminal > New Terminal**.
4. Run `npm install` once, then run `npm start`.
5. Visit http://localhost:3000.

Keep the terminal open while testing. Press Ctrl+C to stop the local server.

## Publish on Render

This project includes `render.yaml` with the correct Node runtime, build command, start command, and health check.

1. Sign in to GitHub and create a new repository for this project.
2. Upload the files from this project to the repository. Include the hidden `.gitignore` and `render.yaml` files. Do not upload `node_modules` or any `.env` file.
3. Sign in to Render and choose **New > Blueprint**.
4. Connect your GitHub account if asked, then select the Royal Stay repository.
5. Review the service named `royal-stay-hotel` and choose **Apply**.
6. Wait for the deployment to finish. Open the HTTPS address shown on your Render service page and share that address.

Render automatically provides HTTPS. The public site and booking API use the same service; bookings are not stored after the confirmation is displayed.

## Project Files

- `index.html`, `style.css`, and `script.js` are the frontend.
- `server.js` serves the site and validates bookings.
- `package.json` defines `npm start`; `package-lock.json` locks the npm setup.
- `render.yaml` configures the Render web service.
