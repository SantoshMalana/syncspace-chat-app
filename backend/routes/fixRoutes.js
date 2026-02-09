const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { authenticate } = require('../middleware/authMiddleware');

// TEMPORARY FIX ENDPOINT - Add current user to a workspace
// This endpoint should be removed after fixing the membership issue
router.post('/fix-membership/:workspaceId', authenticate, async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const userId = req.user.id;

        console.log(`Attempting to add user ${userId} to workspace ${workspaceId}`);

        // Get workspace
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Check if user is already a member
        const isMember = workspace.members.some(
            member => member.userId.toString() === userId
        );

        if (isMember) {
            return res.json({
                message: 'User is already a member of this workspace',
                workspace: {
                    id: workspace._id,
                    name: workspace.name,
                    memberCount: workspace.members.length
                }
            });
        }

        // Add user to workspace
        workspace.members.push({
            userId: userId,
            role: 'admin',
            joinedAt: new Date(),
        });
        await workspace.save();
        console.log(`✅ Added user ${userId} to workspace ${workspaceId}`);

        // Add workspace to user's workspaces array
        const user = await User.findById(userId);
        if (user) {
            const hasWorkspace = user.workspaces.some(
                ws => ws.toString() === workspaceId
            );

            if (!hasWorkspace) {
                user.workspaces.push(workspaceId);
                await user.save();
                console.log(`✅ Added workspace ${workspaceId} to user's workspaces`);
            }
        }

        res.json({
            message: 'Successfully added user to workspace',
            workspace: {
                id: workspace._id,
                name: workspace.name,
                memberCount: workspace.members.length,
                yourRole: 'admin'
            }
        });

    } catch (error) {
        console.error('Fix membership error:', error);
        res.status(500).json({ error: 'Failed to fix membership' });
    }
});

module.exports = router;
