# Cosmic Chat - Premium Next.js & Ollama Chat Hub

A high-performance, private, and secure local AI assistant hub. Powered by **Next.js 15 (App Router)** and **Ollama**, fully containerized via **Docker**, and engineered for seamless deployment on a **Hostinger VPS**.

---

## 🌌 Architectural Overview

This system runs two containerized services orchestrated via a single Docker network:
1. **Next.js Web Service (`web`)**: Built using Node.js Alpine via an optimized multi-stage build. Employs a premium glassmorphic dark theme styled with Vanilla CSS and streams LLM answers tokens-by-token in real-time.
2. **Ollama Service (`ollama`)**: Official Ollama image serving open-source LLMs (e.g., Llama 3, Mistral) mapped with a persistent host volume so pulled models are preserved across container updates.

---

## 🛠️ Local Development Quickstart

To run the application locally without Docker for rapid development:

1. **Install Ollama locally**: Download it from [ollama.com](https://ollama.com).
2. **Run Ollama**: Ensure the Ollama background service is running on your machine.
3. **Pull a Model**:
   ```bash
   ollama pull llama3
   ```
4. **Install Dependencies & Start Dev Server**:
   ```bash
   npm install
   input-terminal> npm run dev
   ```
5. **Open Browser**: Navigate to `http://localhost:3000`. Next.js automatically connects to your local Ollama on port `11434`.

---

## 🚀 Hostinger VPS Production Deployment

Hostinger standard shared web hosting does not run Docker containers. This stack is designed for **Hostinger VPS** (running Ubuntu with Docker pre-installed, or any standard Linux OS with Docker).

### Step 1: Provision your Hostinger VPS
1. Go to your **Hostinger Members Area** -> **VPS**.
2. Select your VPS server.
3. Choose the **OS Template**: **Ubuntu 22.04 with Docker** (highly recommended as Docker and Git come pre-installed).

### Step 2: Clone & Copy Files to VPS
SSH into your Hostinger VPS server using your credentials:
```bash
ssh root@your_vps_ip
```
Create a project folder and copy the codebase onto the VPS (you can clone your Git repository or copy files via SCP/SFTP):
```bash
mkdir -p /var/www/cosmic-chat
cd /var/www/cosmic-chat
# (Transfer the files here)
```

### Step 3: Build and Publish the Web Image
Build the web app image in CI or on your machine, then push it to a registry your VPS can pull from.
```bash
docker build -t ghcr.io/your-org/hostinger-nextjs-ollama-chat:latest .
docker push ghcr.io/your-org/hostinger-nextjs-ollama-chat:latest
```
Set `WEB_IMAGE` in the `.env` file to the published image tag, then run the stack:
```bash
docker compose up -d
```
Verify both containers are running successfully:
```bash
docker compose ps
```
*Your Next.js interface is now running on port `3000`, and Ollama is serving on port `11434` internally.*

### Step 4: Download LLM Models Inside VPS
By default, the Ollama container is empty. You need to pull a model (like `llama3` or `mistral`) inside the running container:
```bash
# Execute the pull command inside the ollama-server container
docker exec -it ollama-server ollama pull llama3
```
*Note: Make sure your VPS has at least 8GB of RAM to run 8B parameter models like Llama 3 smoothly on CPU. For 1GB/2GB VPS machines, use lighter models like `qwen2.5:0.5b` or `tinyllama`.*

### Step 5: Configure Container Parameters (Hostinger Environment)
You can customize container configurations dynamically on your Hostinger VPS using the `.env` file at the root of the project folder:
1. Open the `.env` file on your VPS:
   ```bash
   nano .env
   ```
2. Modify parameters such as `DEFAULT_MODEL` to define the default model (e.g. `DEFAULT_MODEL=mistral` or `DEFAULT_MODEL=gemma`).
3. Apply changes instantly without rebuilding the container:
   ```bash
   docker compose up -d
   ```

---

## 🔒 Production Reverse Proxy & SSL (Recommended)

To map a domain (e.g., `chat.yourdomain.com`) to your Next.js app and secure it with HTTPS, set up an Nginx reverse proxy on the Hostinger VPS.

### 1. Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Configure Nginx Server Block
Create a configuration file:
```bash
sudo nano /etc/nginx/sites-available/cosmic-chat
```
Paste the following block (replace `chat.yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Adjust buffering to ensure tokens stream smoothly
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```
Enable the site configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/cosmic-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Install Let's Encrypt SSL
Secure your site instantly with an SSL certificate using Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d chat.yourdomain.com
```
*Follow the interactive prompts to enable SSL redirection. Certbot will handle automatic renewals.*

---

## 🐳 Useful Docker Commands

- **Stop the application**:
  ```bash
  docker compose down
  ```
- **Inspect service logs (great for debugging connection errors)**:
  ```bash
  docker compose logs -f web
  docker compose logs -f ollama
  ```
- **List downloaded models in Ollama**:
  ```bash
  docker exec -it ollama-server ollama list
  ```
- **Refresh the published image**:
  ```bash
  docker compose pull
  docker compose up -d
  ```
