import { Router } from 'express';
import { asyncHandler, HttpError } from '../errors.js';
import { fetchClinicalHistory } from '../hospitalHistory.js';
import { requireAuth } from '../middleware/auth.js';

export const patientsRouter = Router();
patientsRouter.use(requireAuth);

// A patient's physician notes and investigations from HMIS. Proxied so the browser needn't reach the
// hospital's http address.
patientsRouter.get(
  '/:mr/history',
  asyncHandler(async (req, res) => {
    const mr = String(req.params.mr).trim().toUpperCase();
    if (!/^[A-Z0-9]{6,20}$/.test(mr)) throw new HttpError(422, 'Validation failed', { mr: 'Invalid MR number' });
    try {
      res.json(await fetchClinicalHistory(mr));
    } catch (err) {
      console.error(`HMIS clinical history API failed: ${err.message}`);
      throw new HttpError(502, 'Could not load the record from HMIS. Try again shortly.');
    }
  })
);
