import { Router } from 'express';
import { DESIGNATIONS, HOSPITAL_CODE, ROLE_LABELS } from '@surg-d/shared';
import { config } from '../config.js';

export const metaRouter = Router();

metaRouter.get('/', (_req, res) => {
  res.json({
    hospitalCode: HOSPITAL_CODE,
    designations: DESIGNATIONS,
    roles: ROLE_LABELS,
    impersonation: config.allowImpersonation,
  });
});
