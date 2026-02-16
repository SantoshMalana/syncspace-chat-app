const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const workspaceController = require('../controllers/workspaceController');

// NOTE: Order matters! Static routes must come before dynamic routes (:workspaceId)

// Create workspace
router.post('/', authenticate, workspaceController.createWorkspace);

// Get user's workspaces
router.get('/', authenticate, workspaceController.getUserWorkspaces);

// Join workspace via invite code (MUST come before :workspaceId routes)
router.post('/join', authenticate, workspaceController.joinWorkspace);

// Dynamic routes (must be after static routes)

// Get workspace by ID
router.get('/:workspaceId', authenticate, workspaceController.getWorkspaceById);

// Update workspace
router.put('/:workspaceId', authenticate, workspaceController.updateWorkspace);

// Switch current workspace
router.post('/:workspaceId/switch', authenticate, workspaceController.switchWorkspace);

// Get workspace members
router.get('/:workspaceId/members', authenticate, workspaceController.getWorkspaceMembers);

// Invite member by email
router.post('/:workspaceId/invite-by-email', authenticate, workspaceController.inviteByEmail);

// Invite member by user ID
router.post('/:workspaceId/invite-by-id', authenticate, workspaceController.inviteByUserId);

module.exports = router;