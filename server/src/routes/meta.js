import { Router } from 'express';
import { DESIGNATIONS, HOSPITAL_CODE, ROLE_LABELS } from '@surg-d/shared';

export const metaRouter = Router();

metaRouter.get('/', (_req, res) => {
  res.json({ hospitalCode: HOSPITAL_CODE, designations: DESIGNATIONS, roles: ROLE_LABELS });
});
