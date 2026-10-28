// Vercel entry: every /api/* request is rewritten here (see vercel.json) and handled by the Express app.
// Locally the same app runs as a long-lived server from server/src/index.js.
import { createApp } from '../server/src/app.js';

export default createApp();
