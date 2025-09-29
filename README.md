# ATC24 IFR Clearance Generator (Python/Flask Backend)
dxw
This project has been migrated from a monolithic Node.js application to a separated frontend and backend architecture. The backend is now powered by Python and Flask.

## Project Structure

- `/frontend`: Contains all the static frontend files (HTML, CSS, JavaScript). This is a standalone application that can be deployed to any static hosting provider (e.g., Cloudflare Pages, Vercel, Netlify).
- `/backend`: Contains the Python Flask backend application and its `Dockerfile`. This is a self-contained application designed to be run as a Docker container.

## How to Run with Docker

This project is set up to run the backend in a Docker container.

### Prerequisites
- Docker installed and running.
- An `.env` file in the `backend/` directory with your Supabase and Discord credentials.
 dsf
### Building and Running the Backend

1.  **From the project's root directory**, build the Docker image. The build context **must** be the root for the `COPY` commands to work correctly.
    ```bash
    docker build -t atc24-backend -f backend/Dockerfile .
    ```

2.  **Run the Docker container.** Note that the `--env-file` flag should point to the `.env` file located inside the `backend` directory.
    ```bash
    docker run -p 5000:5000 --env-file backend/.env atc24-backend
    ```
    The backend will be running at `http://localhost:5000`.

### Running the Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Start a simple HTTP server:**
    ```bash
    python -m http.server 8000
    ```

3.  **Open your browser:**
    -   Navigate to `http://localhost:8000`.

## API Routing in Production

When you deploy the frontend and backend to separate services (e.g., frontend to Cloudflare Pages, backend to Dokploy), you will need to configure a **reverse proxy**. The reverse proxy will route requests made from the frontend at `/api/*` to your backend service.

Most hosting providers support this. For example:

### Vercel
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://your-backend-url.com/api/:path*" }
  ]
}
```

### Netlify
```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-backend-url.com/api/:splat"
  status = 200
```

This setup allows your frontend code to remain simple and portable, without needing to know the backend's specific URL.
