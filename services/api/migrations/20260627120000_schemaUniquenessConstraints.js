/**
 * M18 (DB-03): add uniqueness constraints the schema was missing.
 *
 * 1. Group name — case-insensitive unique. The app already treats names as case-insensitively
 *    unique (Groups.cs IsGroupNameTaken uses ILIKE), but only a non-unique index existed, so
 *    CreateGroup has a check-then-insert TOCTOU race (two concurrent creates with the same name
 *    both pass the check). A UNIQUE INDEX ON lower(name) is the DB-level backstop, matching the
 *    username fix (P1-7).
 *
 * 2. Email — case-insensitive unique among VERIFIED rows only (partial index). The user_email
 *    table is currently dormant (no backend write path), so this is defense-in-depth for if/when
 *    the feature is wired up; the partial-on-verified form keeps pending/unverified rows free to
 *    duplicate (re-verification, history) while preventing two accounts from owning the same
 *    verified email.
 *
 * NOTE: forward-only. Index creation fails if existing rows already collide case-insensitively;
 * on a fresh deploy there are none. On an existing DB, dedupe collisions before running this.
 * @param {import('knex')} knex
 */
exports.up = async (knex) => {
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS ux_group_name_lower ON "group" (lower(name))');
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS ux_user_email_lower_verified ON user_email (lower(email)) WHERE status = 2');
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS ux_group_name_lower');
  await knex.raw('DROP INDEX IF EXISTS ux_user_email_lower_verified');
};
