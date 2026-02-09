const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const workspaceController = require('../controllers/workspaceController');

// Create workspace
router.post('/', authenticate, workspaceController.createWorkspace);

// Get user's workspaces
router.get('/', authenticate, workspaceController.getUserWorkspaces);

// Get workspace by ID
router.get('/:workspaceId', authenticate, workspaceController.getWorkspaceById);

// Join workspace via invite code
router.post('/join', authenticate, workspaceController.joinWorkspace);

// Update workspace
router.put('/:workspaceId', authenticate, workspaceController.updateWorkspace);

// Get workspace members
router.get('/:workspaceId/members', authenticate, workspaceController.getWorkspaceMembers);

// Switch current workspace
router.post('/:workspaceId/switch', authenticate, workspaceController.switchWorkspace);

module.exports = router;