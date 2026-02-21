import express from 'express';
import { StaffService } from '../services/StaffService';

const router = express.Router();
const staffService = new StaffService();

/**
 * GET /api/staff/by-email/:email
 * メールアドレスからスタッフ情報を取得
 */
router.get('/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('[Staff API] GET /api/staff/by-email/:email called with:', email);
    
    const staff = await staffService.getStaffByEmail(email);
    
    if (!staff) {
      console.warn('[Staff API] Staff not found for email:', email);
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    console.log('[Staff API] Staff found:', staff);
    res.json(staff);
  } catch (error: any) {
    console.error('[Staff API] Failed to fetch staff by email:', error);
    console.error('[Staff API] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch staff by email', details: error.message });
  }
});

/**
 * GET /api/staff
 * 全スタッフ情報を取得
 */
router.get('/', async (req, res) => {
  try {
    const staff = await staffService.getAllStaff();
    res.json(staff);
  } catch (error) {
    console.error('Failed to fetch staff list:', error);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
});

export default router;
