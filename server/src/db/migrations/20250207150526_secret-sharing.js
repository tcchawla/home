const {
  createOnUpdateTrigger,
  dropOnUpdateTrigger,
} = require("../util/db-util");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// server/src/db/migrations/20250116085521_secret-sharing.js

exports.up = async function (knex) {
  // Create secrets table
  if (!(await knex.schema.hasTable("secrets"))) {
    await knex.schema.createTable("secrets", (t) => {
      t.uuid("id").primary().defaultTo(knex.fn.uuid());
      t.text("secret_text");
      t.integer("expires_in_days");
      t.text("password_hash");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("expires_at");
      t.integer("fragment_count").defaultTo(2);
    });

    // Create fragments table
    await knex.schema.createTable("secret_fragments", (t) => {
      t.uuid("id").primary().defaultTo(knex.fn.uuid());
      t.uuid("secret_id").references("id").inTable("secrets");
      t.text("fragment");
      t.integer("order").notNullable();
    });

    // Create mapping table for short URLs
    await knex.schema.createTable("secret_mappings", (t) => {
      t.uuid("id").primary().defaultTo(knex.fn.uuid());
      t.uuid("secret_id").references("id").inTable("secrets");
      t.text("short_id").notNullable().unique();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("expires_at");
    });
  }
};




/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  if (await knex.schema.hasTable("secrets")) {
    await knex.schema.dropTable("secret_fragments");
    await knex.schema.dropTable("secret_mappings");
    await knex.schema.dropTable("secrets");
    await dropOnUpdateTrigger(knex, "secrets");
    await dropOnUpdateTrigger(knex, "secret_fragments");
    await dropOnUpdateTrigger(knex, "secret_mappings");
  }
};
