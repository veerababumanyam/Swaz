# Swaz Data Recovery Labs

## 🚨 PRODUCTION SERVER ISSUE - QUICK FIX

**Problem**: Your production server shows the default nginx page instead of your application.

**Solution**: Your nginx configuration isn't properly enabled. Here's how to fix it:

### Option 1: Quick Fix (Upload deployment package)

1. **Download the deployment package**:
   ```bash
   # The deployment package is ready: swaz-data-recovery-production.tar.gz
   ```

2. **Upload to your server**:
   ```bash
   # Upload swaz-data-recovery-production.tar.gz to your server
   scp swaz-data-recovery-production.tar.gz user@your-server:~
   ```

3. **Extract and run setup**:
   ```bash
   ssh user@your-server
   tar -xzf swaz-data-recovery-production.tar.gz
   cd swaz-data-recovery-labs
   ./scripts/server-setup.sh
   ```

### Option 2: Manual Fix (If you can't upload the package)

1. **SSH to your server**:
   ```bash
   ssh user@your-server
   ```

2. **Check current nginx status**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Remove default nginx site**:
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

4. **Install the correct configuration**:
   ```bash
   # Copy your nginx config to the correct location
   sudo cp /path/to/your/config/nginx/swaz-data-recovery.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/swaz-data-recovery.conf /etc/nginx/sites-enabled/
   ```

5. **Test and reload**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Start your application**:
   ```bash
   cd /path/to/your/app
   npm install
   cd server && npm install
   pm2 start ecosystem.config.js --env production
   ```

---

## 📋 Complete Setup Guide & P2P Transfer

This is a responsive web application that serves two main purposes:
1.  **Data Recovery Simulation**: It simulates the process of recovering lost or deleted files from various storage devices, educating users on the potential outcomes of a real data loss scenario.
2.  **Secure Peer-to-Peer File Transfer**: It provides a fully-featured, end-to-end encrypted file sharing utility that allows users to send files directly between two browsers without uploading them to a central server.

The application is built with a modern tech stack (React, TypeScript, Vite, Tailwind CSS) and emphasizes security, user experience, and a clean, component-based architecture.

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install client dependencies:**
    ```bash
    npm install
    ```

3.  **Copy SQLite WASM file:**
    After installing dependencies, you need to copy the WebAssembly file for SQLite to the `public` directory. This is required for the in-browser database to work.
    ```bash
    # On macOS / Linux
    cp node_modules/sql.js/dist/sql-wasm.wasm public/

    # On Windows (Command Prompt)
    copy node_modules\sql.js\dist\sql-wasm.wasm public\
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Google Gemini API key:
    ```
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    The application is configured to load this variable for the Gemini AI services.

5.  **Install signaling server dependencies:**
    The P2P features require a WebSocket signaling server for the initial connection handshake between peers.
    ```bash
    cd server
    npm install
    ```

### Running the Application

1.  **Start the Signaling Server:**
    In a separate terminal, navigate to the `server` directory and run:
    ```bash
    npm start
    ```
    This will start the server, by default on port `8080`.

2.  **Start the Development Client:**
    In another terminal, from the project root directory, run:
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically on `http://localhost:5173`. Open this URL in your browser to use the application.

### Building for Production

To create an optimized production build of the application, run the following command from the project root:
```bash
npm run build
```
This will generate a `dist` directory with static assets that can be deployed to any web hosting service.

## Core Features

### 1. Data Recovery Simulation
A guided, three-step process that demonstrates how professional data recovery works.
- **Drive Selection**: Users can choose from a list of mock storage devices (SSD, HDD, USB) to begin a scan.
- **Simulated Scanning**: A visually engaging progress bar shows the scan's progress as the application generates a list of "recoverable" files.
- **Results & Filtering**: Displays a list of found files with details like recovery chance and path. Users can filter results by file type (Image, Video, Document, Audio).
- **Gemini-Powered Previews**: Utilizes the Google Gemini API to generate dynamic, context-aware summaries and descriptions for simulated files, providing a rich preview experience.

### 2. Secure Peer-to-Peer (P2P) File Transfer
A robust and secure system for sharing files directly between two users.
-   **End-to-End Encryption (E2E)**: Establishes a secure channel using the Elliptic Curve Diffie-Hellman (ECDH) key exchange protocol. All files are encrypted chunk-by-chunk using AES-256-GCM before being transmitted, ensuring only the sender and receiver can access the data.
-   **Serverless Transfer via WebRTC**: While a lightweight WebSocket server is used for initial signaling (connecting the two peers), the actual file data is transferred directly between browsers using WebRTC data channels, ensuring privacy and speed.
-   **Drag & Drop for Files and Folders**: An intuitive interface allows users to easily drag and drop multiple files and even entire folders for transfer. The application recursively reads all files within the dropped folders.
-   **Pause & Resume**: Users can pause an ongoing transfer and resume it later, providing flexibility for large files or unstable network connections.
-   **Intelligent Scheduling**: Schedule large transfers to start at a specific time, optimizing for off-peak hours and network availability.
-   **Large File Support & Memory Efficiency**: Utilizes streaming to send files chunk-by-chunk, keeping memory usage low and constant even for very large files.
-   **Detailed Transfer Analytics**: The UI provides users with live feedback on the transfer, including a real-time speed trend chart, average speed, and an estimated time of arrival (ETA). For granular tracking, each file in the transfer queue displays its individual progress, including the number of data chunks sent versus the total. A persistent history log tracks all transfer details, including duration and performance.

### 3. Advanced Transfer Reliability Features
- **Adaptive Bitrate Streaming**: To ensure smooth transfers over fluctuating networks, the system employs an adaptive bitrate algorithm. It dynamically adjusts the sending rate based on real-time network conditions by monitoring the connection's data buffer. This prevents congestion, reduces errors, and maximizes throughput without compromising stability.
- **Auto-Retry & Data Integrity**: The transfer protocol includes a robust verification step. After the initial transfer of a file, the receiver performs a checksum and verifies it has received every data chunk. If any pieces are missing or corrupted, it automatically requests a re-transmission of only those specific chunks, ensuring file integrity without having to restart the entire transfer. This makes the system resilient to temporary network hiccups.

## Browser Compatibility

This application uses modern web technologies and is tested to work on the latest versions of the following browsers:

-   **Google Chrome** (Recommended)
-   **Microsoft Edge**
-   **Mozilla Firefox**
-   **Apple Safari**

While other browsers may work, they are not officially supported.

### Feature Compatibility Notes

-   **P2P File Transfer**: Requires WebRTC support, which is available in all modern browsers. However, connections may be blocked by strict firewalls or corporate networks.
-   **Folder Drag & Drop**: Dragging and dropping entire folders is supported in Chromium-based browsers (Chrome, Edge). On Firefox and Safari, you can drag and drop multiple files, but not folders. For folder transfers on these browsers, please use the "Select Folder" button.
-   **Secure Context**: For security reasons (specifically for the Web Crypto and Clipboard APIs), the application must be run in a secure context (i.e., over HTTPS or from `localhost`).