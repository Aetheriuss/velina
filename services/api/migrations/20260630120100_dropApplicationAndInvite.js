/**
 * Drop the account-application and invite-system tables. Both features were
 * fully removed from the app (registration is now open via Discord only).
 *
 * Reverses the application tables (join_application + moderation_change_join_app,
 * across 20220330020845, 20220401200018, 20220519165559, 20220521164852,
 * 20220525202424, 20220616011432, 20220625162804) and the invite table
 * (user_invite, 20220406171453).
 *
 * This drop is destructive and intentionally NOT reversible: the columns
 * accumulated across many migrations and held only application/invite data,
 * which no longer has any consumer. `down` therefore throws to prevent a
 * partial/incorrect schema restore.
 * @param {import('knex')} knex
 */
exports.up = async (knex) => {
	await knex.schema.dropTableIfExists('moderation_change_join_app');
	await knex.schema.dropTableIfExists('join_application');
	await knex.schema.dropTableIfExists('user_invite');
};

exports.down = async () => {
	throw new Error(
		'Irreversible: the application and invite systems were removed. ' +
			'Restore from a backup taken before 20260630120100 if these tables are needed.',
	);
};
