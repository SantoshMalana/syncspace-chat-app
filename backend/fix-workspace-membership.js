// Fix script to add user to workspace
// Run this with: node fix-workspace-membership.js

const mongoose = require('mongoose');
require('dotenv').config();

const WORKSPACE_ID = '6989d67f723585010846b6a5';
const USER_ID = '6989d67f723585010846b6a3';

async function fixWorkspaceMembership() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Get models
        const Workspace = require('./models/Workspace');
        const User = require('./models/User');

        // Check if workspace exists
        const workspace = await Workspace.findById(WORKSPACE_ID);
        if (!workspace) {
            console.log('❌ Workspace not found');
            process.exit(1);
        }

        console.log(`📁 Workspace: ${workspace.name}`);

        // Check if user is already a member
        const isMember = workspace.members.some(
            member => member.userId.toString() === USER_ID
        );

        if (isMember) {
            console.log('✅ User is already a member of this workspace');
        } else {
            // Add user to workspace
            workspace.members.push({
                userId: USER_ID,
                role: 'admin',
                joinedAt: new Date(),
            });
            await workspace.save();
            console.log('✅ Added user to workspace as admin');
        }

        // Check if workspace is in user's workspaces array
        const user = await User.findById(USER_ID);
        if (!user) {
            console.log('❌ User not found');
            process.exit(1);
        }

        const hasWorkspace = user.workspaces.some(
            ws => ws.toString() === WORKSPACE_ID
        );

        if (!hasWorkspace) {
            user.workspaces.push(WORKSPACE_ID);
            await user.save();
            console.log('✅ Added workspace to user\'s workspaces');
        } else {
            console.log('✅ Workspace already in user\'s workspaces');
        }

        console.log('\n🎉 All fixed! You can now access the workspace.');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixWorkspaceMembership();
