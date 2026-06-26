/**
 * P1-7 / H16: enforce case-insensitive username uniqueness so "Notch", "notch" and "NOTCH"
 * cannot all exist as distinct accounts (impersonation on a trading platform). Lookups already
 * use ILIKE, so this matches read behavior.
 *
 * NOTE: creating the index fails if rows already collide case-insensitively. On a fresh deploy
 * there are none; on an existing DB, dedupe colliding usernames before running this migration.
 * @param {import('knex')} knex
 */
exports.up = async (knex) => {
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS ux_user_username_lower ON "user" (lower(username))');
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS ux_user_username_lower');
};
