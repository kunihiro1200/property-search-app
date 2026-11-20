import { Request, Response, NextFunction } from 'express';

// Verified employee IDs from the employees table. These are not user-editable profile fields.
const SITE_MANAGER_IDS = new Set([
  'daf26dc4-3bbe-475e-9faa-a50845989e49',
  '420cef67-503d-4602-b7b2-9db923ac2b68',
  'a382d47c-50a7-4a9c-8802-9bf93ed53bd5',
]);

const SITE_MANAGER_EMAILS = new Set([
  'mariko.kume@ifoo-oita.com',
  'jyuna.wada@ifoo-oita.com',
  'yurine.kimura@ifoo-oita.com',
]);

export function requireSiteManager(req: Request, res: Response, next: NextFunction) {
  if (!req.employee || !(SITE_MANAGER_IDS.has(req.employee.id) || SITE_MANAGER_EMAILS.has((req.employee.email || '').trim().toLowerCase())) || req.employee.isActive === false) {
    res.status(403).json({ error: 'Site management permission required' });
    return;
  }
  next();
}
