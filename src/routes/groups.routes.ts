import { Router } from 'express';
import {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  addMember,
  leaveGroup,
  createGroupSchema,
  updateGroupSchema,
} from '../controllers/groups.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(protect);

router.get('/', getGroups);
router.post('/', validate(createGroupSchema), createGroup);
router.get('/:id', getGroup);
router.patch('/:id', validate(updateGroupSchema), updateGroup);
router.post('/:id/members', addMember);
router.delete('/:id/leave', leaveGroup);

export default router;
