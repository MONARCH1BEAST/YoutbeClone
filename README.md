# YouTube Clone Platform

A full-stack YouTube-style web application with custom theming, region-based secure authentication, gesture-driven video playback, and an integrated VoIP video calling experience.

## Project Overview

This repository contains two main applications:

- `server/`: Express.js backend with MongoDB, user authentication, video management, comments, downloads, premium plans, and WebRTC signaling.
- `yourtube/`: Next.js frontend for video browsing, playback, social features, watch history, download management, and real-time video calls.

## Key Features

### User experience
- Dynamic theme switching based on login time and location
  - Light theme if login occurs between 10:00 AM and 12:00 PM IST from South India
  - Dark theme for all other times/locations
- Region-based OTP authentication
  - South India users receive OTP via email
  - Other users receive OTP via mobile SMS
- Google-based sign-in support with backend onboarding

### Video playback
- Custom video player with gesture controls
  - Double-tap right: seek forward 10 seconds
  - Double-tap left: seek backward 10 seconds
  - Single tap center: pause/resume playback
  - Three taps center: skip to next video
  - Three taps right: close website / return home
  - Three taps left: open comment section
- Watch time limit enforcement by subscription plan

### Social call experience
- Built-in VoIP video calling page
- WebRTC peer-to-peer calling with room creation and joining
- Screen sharing support for sharing a YouTube tab or website window
- Session recording and local download of `.webm` call recordings

## Repository Structure

```
root/
  README.md
  server/
    index.js
    package.json
    env.example
    controllers/
      auth.js
      call.js
      comment.js
      download.js
      history.js
      like.js
      premium.js
      video.js
      watchlater.js
    routes/
      auth.js
      call.js
      comment.js
      download.js
      history.js
      like.js
      premium.js
      video.js
      watchlater.js
    Modals/
      Auth.js
      comment.js
      download.js
      history.js
      like.js
      video.js
      watchlater.js
  yourtube/
    package.json
    next.config.ts
    tsconfig.json
    src/
      components/
      lib/
      pages/
      styles/
```

## Setup and Installation

### Backend (`server/`)

1. Open a terminal and change into the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in `server/` and copy the values from `env.example`.

4. Configure the following environment variables:

```env
PORT=10000
DB_URL=mongodb://127.0.0.1:27017/yourtube
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
MAIL_FROM=YourTube <your_email@example.com>
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE=+1234567890
FRONTEND_URL=https://your-netlify-site.netlify.app
```

5. Run the server:

```bash
npm start
```

### Frontend (`yourtube/`)

1. Open a terminal and change into the frontend directory:

```bash
cd yourtube
```

2. Install dependencies:

```bash
npm install
```

3. Configure frontend environment variables if needed.
   - Create a `.env.local` file and add:

```env
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

4. Run the frontend:

```bash
npm run dev
```

5. Open the app at `http://localhost:3000`.

## Deployment

### Backend (Render)

1. Push the `server/` code to a Git repository.
2. Create a new Web Service on Render.
3. Connect your Git repo and set the root directory to `server/`.
4. Set the build command to `npm install`.
5. Set the start command to `npm start`.
6. Add all environment variables from `server/.env.example` in Render's environment settings.
7. Deploy and note the backend URL (e.g., `https://your-app.onrender.com`).

### Frontend (Netlify)

1. Push the `yourtube/` code to a Git repository.
2. Create a new site on Netlify.
3. Connect your Git repo and set the build command to `npm run build`.
4. Set the publish directory to `out` (or `.next` if using static export).
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id`
6. Deploy and note the frontend URL (e.g., `https://your-site.netlify.app`).
7. Update the backend's `FRONTEND_URL` environment variable on Render to match the Netlify URL.

### Post-Deployment

- Update `FRONTEND_URL` in Render with the actual Netlify domain.
- Test the `/health` endpoint on Render.
- Ensure CORS allows requests from Netlify.
- Verify video playback, authentication, and call features work in production.

## Important Environment Variables

### Backend

- `DB_URL`: MongoDB connection string
- `EMAIL_USER` / `EMAIL_PASS`: SMTP credentials for email OTP delivery
- `TWILIO_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE`: Twilio credentials for SMS OTP delivery
- `BACKEND_URL`: API base URL for media source generation if used in frontend

### Frontend

- `NEXT_PUBLIC_BACKEND_URL`: Optional URL for backend API requests

## API Summary

### Authentication
- `POST /user/login`
  - Creates or finds user by email
  - Determines theme based on IST time and location
  - Sends OTP via email or SMS depending on region

- `POST /user/verify-otp`
  - Verifies OTP and returns user session details

### Call Signaling
- `POST /call/create`
  - Generates a WebRTC call room
- `POST /call/offer`
  - Stores caller offer SDP
- `GET /call/offer/:roomId`
  - Retrieves caller offer for the callee
- `POST /call/answer`
  - Stores callee answer SDP
- `GET /call/answer/:roomId`
  - Retrieves callee answer for the caller
- `POST /call/candidate`
  - Stores ICE candidate for the peer connection
- `GET /call/candidates/:roomId?for=caller|callee`
  - Polls ICE candidates for the remote peer

## How to Use the Call Feature

1. Sign in with a supported account.
2. Open the Calls page from the sidebar.
3. Create a room and share the generated room ID or link.
4. Have a friend join the room using the same page.
5. Once connected, use screen share to share a YouTube tab.
6. Start recording and download the `.webm` file locally.

## Developer Notes

- The call page uses browser WebRTC APIs and may require HTTPS or localhost for `getDisplayMedia()`.
- Local recording uses `MediaRecorder` and downloads the session as a `.webm` file.
- The screen share feature is browser-dependent and uses the browser display picker.
- `server/controllers/call.js` is a simple in-memory signaling store; for production, replace with persistent signaling or socket-based solution.

## Testing and Validation

- Verify OTP routing by logging in from different IP locations, or mock location detection during testing.
- Check gesture controls on the watch page for playback seeking and comment navigation.
- Test call creation, joining, screen sharing, and recording on at least two devices or browser windows.

## Future Improvements

- Persist WebRTC room data in a database or add socket-based signaling
- Add actual mobile number entry flow for SMS users
- Add explicit call invitations and friend lists
- Improve browser support for call recording and screen share feedback
- Add unit and integration tests for backend and frontend features

## License

This project is provided as-is for development and demonstration purposes.
