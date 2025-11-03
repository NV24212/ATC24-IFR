# Deployment Instructions for Cloudflare Pages

To deploy this project to Cloudflare Pages and control maintenance mode, follow these steps:

## 1. Connect Your Repository

In your Cloudflare Pages dashboard, connect your GitHub repository.

## 2. Configure Build Settings

Use the following build settings:

- **Framework preset:** `None`
- **Build command:** `sh build.sh`
- **Build output directory:** `dist`

## 3. Configure Environment Variables

To control the maintenance mode, you need to add an environment variable in your Cloudflare Pages project settings:

- Go to **Settings > Environment variables**.
- Click **Add variable**.
- Add a new variable:
  - **Variable name:** `SERVER_MAINTENANCE`
  - **Value:** `true` to enable the maintenance pop-up, or `false` to disable it.

### Behavior:

- If you set `SERVER_MAINTENANCE` to `true`, the `build.sh` script will replace the placeholder in `index.js`, and the maintenance pop-up will be displayed on your website.
- If you set `SERVER_MAINTENANCE` to `false` or if the variable is not set, the website will function normally (unless the backend is offline).

After configuring the environment variable, you will need to **re-deploy** your project for the changes to take effect.
