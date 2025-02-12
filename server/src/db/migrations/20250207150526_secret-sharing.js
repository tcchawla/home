const {
  createOnUpdateTrigger,
  dropOnUpdateTrigger,
  createUpdateAtTriggerFunction,
  dropUpdatedAtTriggerFunction,
} = require("../util/db-util");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

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
      t.boolean("extendable").defaultTo(false);
      t.text("email");
    });

    await createUpdateAtTriggerFunction(knex);
    await createOnUpdateTrigger(knex, "secrets");
  }

  // Create fragments table
  if (!(await knex.schema.hasTable("secret_fragments"))) {
    await knex.schema.createTable("secret_fragments", (t) => {
      t.uuid("id").primary().defaultTo(knex.fn.uuid());
      t.uuid("secret_id").references("id").inTable("secrets");
      t.text("fragment");
      t.integer("order").notNullable();
    });

    await createUpdateAtTriggerFunction(knex);
    await createOnUpdateTrigger(knex, "secret_fragments");
  }

  // Create mapping table for short URLs
  if (!(await knex.schema.hasTable("secret_mappings"))) {
    await knex.schema.createTable("secret_mappings", (t) => {
      t.uuid("id").primary().defaultTo(knex.fn.uuid());
      t.uuid("secret_id").references("id").inTable("secrets");
      t.text("short_id").notNullable().unique();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.timestamp("expires_at");
    });

    await createUpdateAtTriggerFunction(knex);
    await createOnUpdateTrigger(knex, "secret_mappings");
  }

  // Create Emails table
  if(!(await knex.schema.hasTable("email"))) {
    await knex.schema.createTable("emails", (t) => {
      t.uuid("id").primary().defaultTo(knex.fn.uuid());
      t.uuid("secret_id").references("id").inTable("secrets");
      t.text("email")
      t.timestamp("expires_at");
      t.timestamp("updatedAt").defaultTo(knex.fn.now());
      t.timestamp("createdAt").defaultTo(knex.fn.now());
    });

    await createUpdateAtTriggerFunction(knex);
    await createOnUpdateTrigger(knex, "emails");
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
    await knex.schema.dropTable("emails");
    await knex.schema.dropTable("secrets");

    await dropOnUpdateTrigger(knex, "secrets");
    await dropOnUpdateTrigger(knex, "secret_fragments");
    await dropOnUpdateTrigger(knex, "secret_mappings");
    await dropOnUpdateTrigger(knex, "emails");
  }
};
