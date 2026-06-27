/**
 * Discord-only auth: link each account to its Discord user id (snowflake, stored as text).
 * Nullable so the out-of-band owner/staff break-glass account can exist without a Discord link.
 * Partial UNIQUE index guarantees one Velina account per Discord id (and ignores NULLs).
 * @param {import('knex')} knex
 */
exports.up = async (knex) => {
  const hasCol = await knex.schema.hasColumn('user', 'discord_id');
  if (!hasCol) {
    await knex.schema.alterTable('user', (t) => {
      t.string('discord_id', 32).nullable();
    });
  }
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS ux_user_discord_id ON "user" (discord_id) WHERE discord_id IS NOT NULL');
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS ux_user_discord_id');
  // Forward-only in prod; column drop kept for dev parity only.
  const hasCol = await knex.schema.hasColumn('user', 'discord_id');
  if (hasCol) {
    await knex.schema.alterTable('user', (t) => { t.dropColumn('discord_id'); });
  }
};
