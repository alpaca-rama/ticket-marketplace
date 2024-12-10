import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const updateUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { userId, name, email }) => {
    // CHECK IF USER EXISTS
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .first();

    if (existingUser) {
      // UPDATE EXISTING USER
      await ctx.db.patch(existingUser._id, {
        name,
        email,
      });

      return existingUser._id;
    }

    // CREATE NEW USER
    const newUserId = await ctx.db.insert('users', {
      userId,
      name,
      email,
      stripeConnectId: undefined,
    });

    return newUserId;
  },
})