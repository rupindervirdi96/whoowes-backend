import { Router } from 'express';
import {
  getSettlements,
  getPendingSettlements,
  getSettlement,
  createSettlement,
  respondToSettlement,
  createSettlementSchema,
  respondSettlementSchema,
} from '../controllers/settlements.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(protect);

router.get('/', getSettlements);
router.get('/pending', getPendingSettlements);
router.post('/', validate(createSettlementSchema), createSettlement);
router.get('/:id', getSettlement);
router.patch('/:id/respond', validate(respondSettlementSchema), respondToSettlement);

export default router;
