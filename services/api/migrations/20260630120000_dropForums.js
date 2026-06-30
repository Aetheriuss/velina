/**
 * Drop the forums feature tables. Forums were fully removed from the app
 * (UI + backend). Reverses 20210119100145_addForums and
 * 20220831203042_addIndexToForums (indexes drop with the table).
 * @param {import('knex')} knex
 */
exports.up = async (knex) => {
	await knex.schema.dropTableIfExists('forum_post_read');
	await knex.schema.dropTableIfExists('forum_post');
};

/**
 * Recreate the (empty) forum tables so the migration is reversible.
 * Data is not restored.
 * @param {import('knex')} knex
 */
exports.down = async (knex) => {
	await knex.schema.createTable('forum_post', (t) => {
		t.bigIncrements('id').notNullable().unsigned();
		t.bigInteger('user_id').notNullable().unsigned();
		t.string('post', 1024).notNullable();
		t.string('title', 255).nullable().defaultTo(null);
		t.bigInteger('thread_id').unsigned().nullable().defaultTo(null);
		t.integer('sub_category_id').notNullable().unsigned();
		t.boolean('is_pinned').notNullable().defaultTo(false);
		t.boolean('is_locked').notNullable().defaultTo(false);
		t.bigInteger('views').notNullable().defaultTo(0).unsigned();
		t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
		t.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
		t.index(['id']);
		t.index(['thread_id', 'id']);
		t.index(['user_id', 'created_at']);
		t.index(['sub_category_id', 'id']);
	});
	await knex.schema.createTable('forum_post_read', (t) => {
		t.bigInteger('forum_post_id').unsigned().notNullable();
		t.bigInteger('user_id').unsigned().notNullable();
		t.unique(['forum_post_id', 'user_id']);
	});
};
