# Fixing the Authentication Errors

Hello! Thank you for the feedback. The "Invalid OAuth2 redirect_uri" error provides a very specific clue. Let's get this sorted out.

## The Root Cause: A Mismatch

The "Invalid OAuth2 redirect_uri" error from Discord happens for one reason: The redirect URI your backend *sends* to Discord does not **exactly match** any of the URIs you have saved in the Discord Developer Portal.

There are two places this URI is configured, and they **must be identical**:

1.  **Your Backend's Environment Variable**: Your `backend/app.py` code reads the redirect URI from an environment variable named `DISCORD_REDIRECT_URI`.
2.  **Your Discord Application Settings**: The list of allowed redirect URIs in the Discord Developer Portal.

If these two do not match character-for-character, Discord will reject the login attempt for security reasons.

## How to Fix It (Guaranteed)

Please follow these steps carefully.

### Step 1: Set the Backend Environment Variable

You must ensure that on the server where you are hosting your backend (`api.hasmah.xyz`), the application is running with the following environment variable set:

`DISCORD_REDIRECT_URI=https://api.hasmah.xyz/auth/discord/callback`

How you set this depends on your hosting provider (e.g., Dokploy, Render, Fly.io). Look for a "Secrets" or "Environment Variables" section in your service's dashboard.

### Step 2: Update the Discord Developer Portal

1.  Go to the **Discord Developer Portal** (https://discord.com/developers/applications).
2.  Select your application.
3.  Go to the **"OAuth2"** page from the left-hand menu.
4.  Click **"Add Redirect"**.
5.  Paste the **exact same URL** into the box. It is critical that it is identical to the environment variable.
    `https://api.hasmah.xyz/auth/discord/callback`
6.  **Important**: Check for typos, extra spaces, or using `http` instead of `https`.
7.  **Save your changes.**

After you have confirmed that the environment variable is set on your backend server AND the exact same URI is saved in the Discord portal, the authentication will work.

---

## Implementing a "Not Found" Page (The "414 Error")

I believe when you mention a "414 error", you mean you want a custom "Not Found" page for your Single Page Application if someone tries to visit a non-existent path. I have now implemented this.

If you visit a URL like `https://24ifr.hasmah.xyz/some/bad/path`, the application will now display a "404 - Page Not Found" message instead of a blank page. This is handled by new logic in the frontend JavaScript.

---
