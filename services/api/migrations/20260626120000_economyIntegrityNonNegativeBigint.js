/**
 * P1-1 economy integrity.
 *  - Widen balances int -> bigint so large balances can't overflow/truncate (finding H12).
 *  - Enforce non-negative balances with CHECK constraints, a DB-level backstop behind the
 *    atomic conditional debit (finding H5).
 *  - Pre-existing negative balances (from past over-spend) are clamped to 0 first so the
 *    constraint can be added without failing (RISK-CHECK-vs-data).
 * @param {import('knex')} knex
 */
exports.up = async (knex) => {
  // 1) Remediate any pre-existing negatives BEFORE adding the constraint.
  await knex.raw('UPDATE user_economy SET balance_robux = 0 WHERE balance_robux < 0');
  await knex.raw('UPDATE user_economy SET balance_tickets = 0 WHERE balance_tickets < 0');
  await knex.raw('UPDATE group_economy SET balance_robux = 0 WHERE balance_robux < 0');
  await knex.raw('UPDATE group_economy SET balance_tickets = 0 WHERE balance_tickets < 0');

  // 2) Widen int -> bigint (H12).
  await knex.schema.alterTable('user_economy', (t) => {
    t.bigInteger('balance_robux').notNullable().alter();
    t.bigInteger('balance_tickets').notNullable().alter();
  });
  await knex.schema.alterTable('group_economy', (t) => {
    t.bigInteger('balance_robux').notNullable().alter();
    t.bigInteger('balance_tickets').notNullable().alter();
  });

  // 3) Enforce non-negative balances (H5 backstop). knex 0.95 has no check() helper -> raw SQL.
  await knex.raw('ALTER TABLE user_economy ADD CONSTRAINT ck_user_economy_robux_nonneg CHECK (balance_robux >= 0)');
  await knex.raw('ALTER TABLE user_economy ADD CONSTRAINT ck_user_economy_tickets_nonneg CHECK (balance_tickets >= 0)');
  await knex.raw('ALTER TABLE group_economy ADD CONSTRAINT ck_group_economy_robux_nonneg CHECK (balance_robux >= 0)');
  await knex.raw('ALTER TABLE group_economy ADD CONSTRAINT ck_group_economy_tickets_nonneg CHECK (balance_tickets >= 0)');
};

/**
 * The production deploy is forward-only and never calls this. Kept conservative: drop only the
 * constraints we added (do NOT revert bigint -> int, which could truncate real balances).
 * @param {import('knex')} knex
 */
exports.down = async (knex) => {
  await knex.raw('ALTER TABLE user_economy DROP CONSTRAINT IF EXISTS ck_user_economy_robux_nonneg');
  await knex.raw('ALTER TABLE user_economy DROP CONSTRAINT IF EXISTS ck_user_economy_tickets_nonneg');
  await knex.raw('ALTER TABLE group_economy DROP CONSTRAINT IF EXISTS ck_group_economy_robux_nonneg');
  await knex.raw('ALTER TABLE group_economy DROP CONSTRAINT IF EXISTS ck_group_economy_tickets_nonneg');
};
