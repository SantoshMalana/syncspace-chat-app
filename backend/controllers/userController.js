const User = require('../models/User');

// Update channel preferences (mute/unmute)
exports.updateChannelPreferences = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { muted, mutedUntil } = req.body;
        const userId = req.user.id;

        console.log('⚙️ Updating channel preferences:', { userId, channelId, muted });

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.channelPreferences) {
            user.channelPreferences = new Map();
        }

        user.channelPreferences.set(channelId, {
            muted: muted || false,
            mutedUntil: mutedUntil || null
        });

        await user.save();

        res.status(200).json({
            message: 'Preferences updated successfully',
            preferences: user.channelPreferences.get(channelId)
        });

    } catch (error) {
        console.error('❌ Update preferences error:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
};
