import { Router } from 'express';
import {
  getFriends,
  getPendingRequests,
  addFriend,
  respondToRequest,
  removeFriend,
  addFriendSchema,
  respondFriendSchema,
} from '../controllers/friends.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(protect);

router.get('/', getFriends);
router.get('/pending', getPendingRequests);
router.post('/', validate(addFriendSchema), addFriend);
router.patch('/:id/respond', validate(respondFriendSchema), respondToRequest);
router.delete('/:id', removeFriend);

export default router;
