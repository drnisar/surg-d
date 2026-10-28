import { createApp } from './app.js';
import { config } from './config.js';
import { getBeds } from './hospitalBeds.js';

// The hospital beds API is slow; warm the cache so the first Ward visit doesn't wait for it.
getBeds().catch((err) => console.warn(`Could not preload beds: ${err.message}`));

createApp().listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
