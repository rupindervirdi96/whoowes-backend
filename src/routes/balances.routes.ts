import { Router } from 'express';
import { getBalances, getDashboardSummary } from '../controllers/balances.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getBalances);
router.get('/dashboard', getDashboardSummary);

export default router;
