const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialize user error:', error);
    done(error, null);
  }
});

// Validate Google OAuth configuration
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
  console.warn('⚠️  WARNING: Google OAuth environment variables not fully configured');
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(`🔍 Processing Google OAuth for: ${profile.emails[0].value}`);
        
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log(`✅ Existing user found: ${user.email}`);
          return done(null, user);
        }

        console.log(`👤 Creating new user from Google: ${profile.displayName}`);
        
        // Create new user
        user = new User({
          fullName: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0]?.value || '',
          password: Math.random().toString(36).slice(-8), // Random password for OAuth users
          status: 'online',
        });

        await user.save();
        console.log(`✅ User created: ${user._id}`);

        // Create default workspace for new user
        const slug = profile.displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        
        const workspace = new Workspace({
          name: `${profile.displayName}'s Workspace`,
          slug,
          ownerId: user._id,
          members: [{
            userId: user._id,
            role: 'owner',
            joinedAt: new Date(),
          }],
          inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        });

        await workspace.save();
        console.log(`✅ Workspace created: ${workspace._id}`);

        // Create default "general" channel
        const generalChannel = new Channel({
          name: 'general',
          description: 'Default channel for workspace-wide communication',
          workspaceId: workspace._id,
          isPrivate: false,
          members: [user._id],
          createdBy: user._id,
        });

        await generalChannel.save();

        workspace.channels.push(generalChannel._id);
        await workspace.save();

        // Update user with workspace
        user.workspaces.push(workspace._id);
        user.currentWorkspace = workspace._id;
        await user.save();

        console.log(`✅ OAuth user setup completed: ${user._id}`);
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth strategy error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;