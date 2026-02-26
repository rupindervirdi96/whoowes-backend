import { Router } from 'express';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  createExpenseSchema,
} from '../controllers/expenses.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(protect);

router.get('/', getExpenses);
router.post('/', validate(createExpenseSchema), createExpense);
router.get('/:id', getExpense);
router.patch('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
