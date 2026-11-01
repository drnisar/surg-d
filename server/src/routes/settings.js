import { Router } from 'express';
import { ROLES } from '@surg-d/shared';
import { asyncHandler, HttpError } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getSettings, saveSettings, validateSettings } from '../settings.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// Everyone reads the settings, since they decide what each screen shows; only the admin changes them.
settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getSettings());
  })
);

settingsRouter.put(
  '/',
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { data, errors } = validateSettings(req.body ?? {});
    if (errors) throw new HttpError(422, 'Validation failed', errors);
    res.json(await saveSettings(data, req.user.id));
  })
);
