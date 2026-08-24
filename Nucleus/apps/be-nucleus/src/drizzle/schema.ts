import { PgColumn, bigint, boolean, check, date, index, integer, jsonb, numeric, pgSchema, pgTable, text, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const usersColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	email: varchar('email', { length: 255 }),
	password: varchar('password', { length: 255 }),
	verifiedAt: timestamp('verified_at'),
	emailVerificationToken: varchar('email_verification_token', { length: 255 }),
	emailVerificationTokenExpiresAt: timestamp('email_verification_token_expires_at'),
	emailVerificationSentAt: timestamp('email_verification_sent_at'),
	emailVerificationAttempts: integer('email_verification_attempts').default(0),
	lastLoginAt: timestamp('last_login_at'),
	loginCount: integer('login_count').default(0),
	isLocked: boolean('is_locked').default(false),
	lockedUntil: timestamp('locked_until'),
	failedLoginAttempts: integer('failed_login_attempts').default(0),
	isGod: boolean('is_god').default(false),
	cohortId: uuid('cohort_id').references(() => userCohorts.id, { onDelete: 'set null' }),
	emailVerified: boolean('email_verified').default(false),
};

export const usersIndexes = (t: { email: PgColumn; isActive: PgColumn; lastLoginAt: PgColumn; isLocked: PgColumn; lockedUntil: PgColumn }) => [
	uniqueIndex('users_email_idx').on(t.email),
	index('users_email_is_active_idx').on(t.email, t.isActive),
	index('users_last_login_at_idx').on(t.lastLoginAt),
	index('users_is_locked_locked_until_idx').on(t.isLocked, t.lockedUntil),
];

export const users = pgTable('users', usersColumns, (t) => [
	uniqueIndex('users_email_idx').on(t.email),
	index('users_email_is_active_idx').on(t.email, t.isActive),
	index('users_last_login_at_idx').on(t.lastLoginAt),
	index('users_is_locked_locked_until_idx').on(t.isLocked, t.lockedUntil),
]);

export function createUsersForSchema(schema: ReturnType<typeof pgSchema>) {
	const userCohortsTable = schema.table('user_cohorts', userCohortsColumns);
	return schema.table('users', {
		...usersColumns,
		cohortId: uuid('cohort_id').references(() => userCohortsTable.id, { onDelete: 'set null' }),
	}, (t) => [
		uniqueIndex('users_email_idx').on(t.email),
		index('users_email_is_active_idx').on(t.email, t.isActive),
		index('users_last_login_at_idx').on(t.lastLoginAt),
		index('users_is_locked_locked_until_idx').on(t.isLocked, t.lockedUntil),
	]);
}

export const profilesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id),
	firstName: varchar('first_name', { length: 100 }).notNull(),
	lastName: varchar('last_name', { length: 100 }).notNull(),
};

export const profilesIndexes = (t: { userId: PgColumn; firstName: PgColumn; lastName: PgColumn }) => [
	uniqueIndex('profiles_user_id_idx').on(t.userId),
	index('profiles_first_name_last_name_idx').on(t.firstName, t.lastName),
];

export const profiles = pgTable('profiles', profilesColumns, (t) => [
	uniqueIndex('profiles_user_id_idx').on(t.userId),
	index('profiles_first_name_last_name_idx').on(t.firstName, t.lastName),
]);

export function createProfilesForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('profiles', {
		...profilesColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id),
	}, (t) => [
		uniqueIndex('profiles_user_id_idx').on(t.userId),
		index('profiles_first_name_last_name_idx').on(t.firstName, t.lastName),
	]);
}

export const rolesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	name: varchar('name', { length: 100 }).notNull(),
	description: varchar('description', { length: 500 }),
	isSystem: boolean('is_system').notNull().default(false),
	alias: varchar('alias', { length: 100 }),
};

export const rolesIndexes = (t: { name: PgColumn }) => [
	uniqueIndex('roles_name_idx').on(t.name),
];

export const roles = pgTable('roles', rolesColumns, (t) => [
	uniqueIndex('roles_name_idx').on(t.name),
]);

export function createRolesForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('roles', rolesColumns, (t) => [
		uniqueIndex('roles_name_idx').on(t.name),
	]);
}

export const claimsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	action: varchar('action', { length: 100 }).notNull(),
	description: varchar('description', { length: 500 }),
	path: varchar('path', { length: 200 }).notNull(),
	method: varchar('method', { length: 10 }).notNull(),
	policy: jsonb('policy'),
	mode: varchar('mode', { length: 20 }).notNull().default('startsWith'),
};

export const claimsIndexes = (t: { action: PgColumn; path: PgColumn; method: PgColumn }) => [
	uniqueIndex('claims_action_idx').on(t.action),
	index('claims_path_method_idx').on(t.path, t.method),
];

export const claims = pgTable('claims', claimsColumns, (t) => [
	uniqueIndex('claims_action_idx').on(t.action),
	index('claims_path_method_idx').on(t.path, t.method),
]);

export function createClaimsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('claims', claimsColumns, (t) => [
		uniqueIndex('claims_action_idx').on(t.action),
		index('claims_path_method_idx').on(t.path, t.method),
	]);
}

export const userRolesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
};

export const userRolesIndexes = (t: { userId: PgColumn; roleId: PgColumn }) => [
	index('user_roles_user_id_idx').on(t.userId),
	index('user_roles_role_id_idx').on(t.roleId),
];

export const userRoles = pgTable('user_roles', userRolesColumns, (t) => [
	index('user_roles_user_id_idx').on(t.userId),
	index('user_roles_role_id_idx').on(t.roleId),
	unique('unique_user_role').on(t.userId, t.roleId),
]);

export function createUserRolesForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	const rolesTable = schema.table('roles', rolesColumns, (t) => rolesIndexes(t));
	return schema.table('user_roles', {
		...userRolesColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
		roleId: uuid('role_id').notNull().references(() => rolesTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('user_roles_user_id_idx').on(t.userId),
		index('user_roles_role_id_idx').on(t.roleId),
	]);
}

export const roleClaimsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
	claimId: uuid('claim_id').notNull().references(() => claims.id, { onDelete: 'cascade' }),
	scope: text('scope'),
};

export const roleClaimsIndexes = (t: { roleId: PgColumn; claimId: PgColumn; scope: PgColumn }) => [
	index('role_claims_role_id_idx').on(t.roleId),
	index('role_claims_claim_id_idx').on(t.claimId),
	index('role_claims_role_id_claim_id_scope_idx').on(t.roleId, t.claimId, t.scope),
];

export const roleClaims = pgTable('role_claims', roleClaimsColumns, (t) => [
	index('role_claims_role_id_idx').on(t.roleId),
	index('role_claims_claim_id_idx').on(t.claimId),
	index('role_claims_role_id_claim_id_scope_idx').on(t.roleId, t.claimId, t.scope),
]);

export function createRoleClaimsForSchema(schema: ReturnType<typeof pgSchema>) {
	const rolesTable = schema.table('roles', rolesColumns, (t) => rolesIndexes(t));
	const claimsTable = schema.table('claims', claimsColumns, (t) => claimsIndexes(t));
	return schema.table('role_claims', {
		...roleClaimsColumns,
		roleId: uuid('role_id').notNull().references(() => rolesTable.id, { onDelete: 'cascade' }),
		claimId: uuid('claim_id').notNull().references(() => claimsTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('role_claims_role_id_idx').on(t.roleId),
		index('role_claims_claim_id_idx').on(t.claimId),
		index('role_claims_role_id_claim_id_scope_idx').on(t.roleId, t.claimId, t.scope),
	]);
}

export const filesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	name: varchar('name', { length: 255 }).notNull(),
	originalName: varchar('original_name', { length: 255 }).notNull(),
	type: varchar('type', { length: 50 }),
	path: varchar('path', { length: 500 }).notNull(),
	size: bigint('size', { mode: 'number' }).notNull(),
	mimeType: varchar('mime_type', { length: 100 }).notNull(),
	extension: varchar('extension', { length: 10 }).notNull(),
	uploadedBy: uuid('uploaded_by').references(() => users.id),
};

export const filesIndexes = (t: { type: PgColumn; uploadedBy: PgColumn; size: PgColumn }) => [
	index('files_type_idx').on(t.type),
	index('files_uploaded_by_idx').on(t.uploadedBy),
	index('files_size_idx').on(t.size),
];

export const files = pgTable('files', filesColumns, (t) => [
	index('files_type_idx').on(t.type),
	index('files_uploaded_by_idx').on(t.uploadedBy),
	index('files_size_idx').on(t.size),
]);

export function createFilesForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('files', {
		...filesColumns,
		uploadedBy: uuid('uploaded_by').references(() => usersTable.id),
	}, (t) => [
		index('files_type_idx').on(t.type),
		index('files_uploaded_by_idx').on(t.uploadedBy),
		index('files_size_idx').on(t.size),
	]);
}

export const addressesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	ownerType: varchar('owner_type', { length: 50 }).notNull(),
	ownerId: uuid('owner_id').notNull(),
	name: varchar('name', { length: 100 }).notNull(),
	street: varchar('street', { length: 255 }),
	city: varchar('city', { length: 100 }),
	state: varchar('state', { length: 50 }),
	zip: varchar('zip', { length: 20 }),
	country: varchar('country', { length: 50 }).default('US'),
	latitude: numeric('latitude', { precision: 10, scale: 8 }),
	longitude: numeric('longitude', { precision: 11, scale: 8 }),
	neighborhood: varchar('neighborhood', { length: 100 }),
	apartment: varchar('apartment', { length: 50 }),
	province: varchar('province', { length: 100 }),
	district: varchar('district', { length: 100 }),
	type: varchar('type', { length: 50 }),
};

export const addressesIndexes = (t: { city: PgColumn; state: PgColumn; latitude: PgColumn; longitude: PgColumn; type: PgColumn; ownerType: PgColumn; ownerId: PgColumn }) => [
	index('addresses_city_state_idx').on(t.city, t.state),
	index('addresses_latitude_longitude_idx').on(t.latitude, t.longitude),
	index('addresses_type_idx').on(t.type),
	index('addresses_owner_type_owner_id_idx').on(t.ownerType, t.ownerId),
];

export const addresses = pgTable('addresses', addressesColumns, (t) => [
	index('addresses_city_state_idx').on(t.city, t.state),
	index('addresses_latitude_longitude_idx').on(t.latitude, t.longitude),
	index('addresses_type_idx').on(t.type),
	index('addresses_owner_type_owner_id_idx').on(t.ownerType, t.ownerId),
]);

export function createAddressesForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('addresses', addressesColumns, (t) => [
		index('addresses_city_state_idx').on(t.city, t.state),
		index('addresses_latitude_longitude_idx').on(t.latitude, t.longitude),
		index('addresses_type_idx').on(t.type),
		index('addresses_owner_type_owner_id_idx').on(t.ownerType, t.ownerId),
	]);
}

export const phonesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	ownerType: varchar('owner_type', { length: 50 }).notNull(),
	ownerId: uuid('owner_id').notNull(),
	name: varchar('name', { length: 100 }).notNull(),
	type: varchar('type', { length: 50 }),
	number: varchar('number', { length: 20 }).notNull(),
	countryCode: varchar('country_code', { length: 10 }).notNull().default('+1'),
	extension: varchar('extension', { length: 10 }),
};

export const phonesIndexes = (t: { number: PgColumn; type: PgColumn; ownerType: PgColumn; ownerId: PgColumn }) => [
	index('phones_number_idx').on(t.number),
	index('phones_type_idx').on(t.type),
	index('phones_owner_type_owner_id_idx').on(t.ownerType, t.ownerId),
];

export const phones = pgTable('phones', phonesColumns, (t) => [
	index('phones_number_idx').on(t.number),
	index('phones_type_idx').on(t.type),
	index('phones_owner_type_owner_id_idx').on(t.ownerType, t.ownerId),
]);

export function createPhonesForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('phones', phonesColumns, (t) => [
		index('phones_number_idx').on(t.number),
		index('phones_type_idx').on(t.type),
		index('phones_owner_type_owner_id_idx').on(t.ownerType, t.ownerId),
	]);
}

export const notificationsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull(),
	title: varchar('title', { length: 255 }).notNull(),
	body: varchar('body', { length: 1000 }),
	entityName: varchar('entity_name', { length: 100 }),
	entityId: uuid('entity_id'),
	type: varchar('type', { length: 50 }).notNull().default('system'),
	source: varchar('source', { length: 100 }),
	isSeen: boolean('is_seen').notNull().default(false),
	seenAt: timestamp('seen_at', { withTimezone: true }),
};

export const notificationsIndexes = (t: { userId: PgColumn; createdAt: PgColumn; isSeen: PgColumn; type: PgColumn }) => [
	index('notifications_user_id_created_at_idx').on(t.userId, t.createdAt),
	index('notifications_is_seen_idx').on(t.isSeen),
	index('notifications_type_idx').on(t.type),
	index('notifications_user_id_type_is_seen_idx').on(t.userId, t.type, t.isSeen),
];

export const notifications = pgTable('notifications', notificationsColumns, (t) => [
	index('notifications_user_id_created_at_idx').on(t.userId, t.createdAt),
	index('notifications_is_seen_idx').on(t.isSeen),
	index('notifications_type_idx').on(t.type),
	index('notifications_user_id_type_is_seen_idx').on(t.userId, t.type, t.isSeen),
]);

export function createNotificationsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('notifications', notificationsColumns, (t) => [
		index('notifications_user_id_created_at_idx').on(t.userId, t.createdAt),
		index('notifications_is_seen_idx').on(t.isSeen),
		index('notifications_type_idx').on(t.type),
		index('notifications_user_id_type_is_seen_idx').on(t.userId, t.type, t.isSeen),
	]);
}

export const verificationsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	instanceId: uuid('instance_id').notNull().references(() => verificationInstances.id, { onDelete: 'cascade' }),
	requirementId: uuid('requirement_id').notNull().references(() => verificationRequirements.id),
	verifierId: uuid('verifier_id').notNull().references(() => users.id),
	signatureId: uuid('signature_id').references(() => files.id),
	entityName: varchar('entity_name', { length: 100 }).notNull(),
	entityId: uuid('entity_id').notNull(),
	stepOrder: integer('step_order').notNull().default(1),
	decision: varchar('decision', { length: 50 }).notNull().default('pending'),
	reason: text('reason'),
	diff: jsonb('diff'),
};

export const verificationsIndexes = (t: { instanceId: PgColumn; requirementId: PgColumn; verifierId: PgColumn; entityName: PgColumn; entityId: PgColumn; stepOrder: PgColumn; decision: PgColumn }) => [
	index('verifications_instance_id_idx').on(t.instanceId),
	index('verifications_requirement_id_idx').on(t.requirementId),
	index('verifications_verifier_id_idx').on(t.verifierId),
	index('verifications_entity_name_entity_id_idx').on(t.entityName, t.entityId),
	index('verifications_entity_name_entity_id_step_order_idx').on(t.entityName, t.entityId, t.stepOrder),
	index('verifications_decision_idx').on(t.decision),
];

export const verifications = pgTable('verifications', verificationsColumns, (t) => [
	index('verifications_instance_id_idx').on(t.instanceId),
	index('verifications_requirement_id_idx').on(t.requirementId),
	index('verifications_verifier_id_idx').on(t.verifierId),
	index('verifications_entity_name_entity_id_idx').on(t.entityName, t.entityId),
	index('verifications_entity_name_entity_id_step_order_idx').on(t.entityName, t.entityId, t.stepOrder),
	index('verifications_decision_idx').on(t.decision),
]);

export function createVerificationsForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationInstancesTable = schema.table('verificationInstances', verificationInstancesColumns, (t) => verificationInstancesIndexes(t));
	const verificationRequirementsTable = schema.table('verificationRequirements', verificationRequirementsColumns, (t) => verificationRequirementsIndexes(t));
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	const filesTable = schema.table('files', filesColumns, (t) => filesIndexes(t));
	return schema.table('verifications', {
		...verificationsColumns,
		instanceId: uuid('instance_id').notNull().references(() => verificationInstancesTable.id, { onDelete: 'cascade' }),
		requirementId: uuid('requirement_id').notNull().references(() => verificationRequirementsTable.id),
		verifierId: uuid('verifier_id').notNull().references(() => usersTable.id),
		signatureId: uuid('signature_id').references(() => filesTable.id),
	}, (t) => [
		index('verifications_instance_id_idx').on(t.instanceId),
		index('verifications_requirement_id_idx').on(t.requirementId),
		index('verifications_verifier_id_idx').on(t.verifierId),
		index('verifications_entity_name_entity_id_idx').on(t.entityName, t.entityId),
		index('verifications_entity_name_entity_id_step_order_idx').on(t.entityName, t.entityId, t.stepOrder),
		index('verifications_decision_idx').on(t.decision),
	]);
}

export const verificationRequirementsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	instanceId: uuid('instance_id').notNull().references(() => verificationInstances.id, { onDelete: 'cascade' }),
	stepNodeId: varchar('step_node_id', { length: 100 }).notNull(),
	verifierNodeId: varchar('verifier_node_id', { length: 100 }).notNull(),
	entityName: varchar('entity_name', { length: 100 }).notNull(),
	entityId: uuid('entity_id').notNull(),
	verifierType: varchar('verifier_type', { length: 30 }).notNull(),
	verifierUserId: uuid('verifier_user_id'),
	verifierRole: varchar('verifier_role', { length: 100 }),
	requireSignature: boolean('require_signature').notNull().default(false),
	allMustApprove: boolean('all_must_approve').notNull().default(false),
	stepOrder: integer('step_order').notNull().default(1),
	status: varchar('status', { length: 30 }).notNull().default('pending'),
};

export const verificationRequirementsIndexes = (t: { instanceId: PgColumn; stepOrder: PgColumn; entityName: PgColumn; entityId: PgColumn; verifierUserId: PgColumn; status: PgColumn }) => [
	index('verificationRequirements_instance_id_idx').on(t.instanceId),
	index('verificationRequirements_instance_id_step_order_idx').on(t.instanceId, t.stepOrder),
	index('verificationRequirements_entity_name_entity_id_idx').on(t.entityName, t.entityId),
	index('verificationRequirements_verifier_user_id_idx').on(t.verifierUserId),
	index('verificationRequirements_status_idx').on(t.status),
];

export const verificationRequirements = pgTable('verificationRequirements', verificationRequirementsColumns, (t) => [
	index('verificationRequirements_instance_id_idx').on(t.instanceId),
	index('verificationRequirements_instance_id_step_order_idx').on(t.instanceId, t.stepOrder),
	index('verificationRequirements_entity_name_entity_id_idx').on(t.entityName, t.entityId),
	index('verificationRequirements_verifier_user_id_idx').on(t.verifierUserId),
	index('verificationRequirements_status_idx').on(t.status),
]);

export function createVerificationRequirementsForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationInstancesTable = schema.table('verificationInstances', verificationInstancesColumns, (t) => verificationInstancesIndexes(t));
	return schema.table('verificationRequirements', {
		...verificationRequirementsColumns,
		instanceId: uuid('instance_id').notNull().references(() => verificationInstancesTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('verificationRequirements_instance_id_idx').on(t.instanceId),
		index('verificationRequirements_instance_id_step_order_idx').on(t.instanceId, t.stepOrder),
		index('verificationRequirements_entity_name_entity_id_idx').on(t.entityName, t.entityId),
		index('verificationRequirements_verifier_user_id_idx').on(t.verifierUserId),
		index('verificationRequirements_status_idx').on(t.status),
	]);
}

export const verificationFlowsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	entityName: varchar('entity_name', { length: 100 }).notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	triggerOn: varchar('trigger_on', { length: 50 }).notNull().default('update'),
	triggerFields: jsonb('trigger_fields'),
	isDraft: boolean('is_draft').notNull().default(true),
	publishedAt: timestamp('published_at', { withTimezone: true }),
	viewport: jsonb('viewport'),
};

export const verificationFlowsIndexes = (t: { entityName: PgColumn; triggerOn: PgColumn; isDraft: PgColumn }) => [
	index('verificationFlows_entity_name_idx').on(t.entityName),
	index('verificationFlows_entity_name_trigger_on_idx').on(t.entityName, t.triggerOn),
	index('verificationFlows_is_draft_idx').on(t.isDraft),
];

export const verificationFlows = pgTable('verificationFlows', verificationFlowsColumns, (t) => [
	index('verificationFlows_entity_name_idx').on(t.entityName),
	index('verificationFlows_entity_name_trigger_on_idx').on(t.entityName, t.triggerOn),
	index('verificationFlows_is_draft_idx').on(t.isDraft),
]);

export function createVerificationFlowsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('verificationFlows', verificationFlowsColumns, (t) => [
		index('verificationFlows_entity_name_idx').on(t.entityName),
		index('verificationFlows_entity_name_trigger_on_idx').on(t.entityName, t.triggerOn),
		index('verificationFlows_is_draft_idx').on(t.isDraft),
	]);
}

export const verificationStepsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	flowId: uuid('flow_id').notNull().references(() => verificationFlows.id, { onDelete: 'cascade' }),
	entityName: varchar('entity_name', { length: 100 }).notNull(),
	nodeId: varchar('node_id', { length: 100 }).notNull(),
	nodeType: varchar('node_type', { length: 50 }).notNull().default('step'),
	stepOrder: integer('step_order').notNull().default(1),
	name: varchar('name', { length: 255 }),
	description: text('description'),
	positionX: numeric('position_x').notNull().default('0'),
	positionY: numeric('position_y').notNull().default('0'),
	width: numeric('width'),
	height: numeric('height'),
	style: jsonb('style'),
	data: jsonb('data'),
};

export const verificationStepsIndexes = (t: { flowId: PgColumn; entityName: PgColumn; nodeId: PgColumn; stepOrder: PgColumn }) => [
	index('verificationSteps_flow_id_idx').on(t.flowId),
	index('verificationSteps_entity_name_idx').on(t.entityName),
	uniqueIndex('verificationSteps_flow_id_node_id_idx').on(t.flowId, t.nodeId),
	index('verificationSteps_entity_name_step_order_idx').on(t.entityName, t.stepOrder),
];

export const verificationSteps = pgTable('verificationSteps', verificationStepsColumns, (t) => [
	index('verificationSteps_flow_id_idx').on(t.flowId),
	index('verificationSteps_entity_name_idx').on(t.entityName),
	uniqueIndex('verificationSteps_flow_id_node_id_idx').on(t.flowId, t.nodeId),
	index('verificationSteps_entity_name_step_order_idx').on(t.entityName, t.stepOrder),
]);

export function createVerificationStepsForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationFlowsTable = schema.table('verificationFlows', verificationFlowsColumns, (t) => verificationFlowsIndexes(t));
	return schema.table('verificationSteps', {
		...verificationStepsColumns,
		flowId: uuid('flow_id').notNull().references(() => verificationFlowsTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('verificationSteps_flow_id_idx').on(t.flowId),
		index('verificationSteps_entity_name_idx').on(t.entityName),
		uniqueIndex('verificationSteps_flow_id_node_id_idx').on(t.flowId, t.nodeId),
		index('verificationSteps_entity_name_step_order_idx').on(t.entityName, t.stepOrder),
	]);
}

export const verificationEdgesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	flowId: uuid('flow_id').notNull().references(() => verificationFlows.id, { onDelete: 'cascade' }),
	edgeId: varchar('edge_id', { length: 100 }).notNull(),
	sourceNodeId: varchar('source_node_id', { length: 100 }).notNull(),
	targetNodeId: varchar('target_node_id', { length: 100 }).notNull(),
	sourceHandle: varchar('source_handle', { length: 50 }),
	targetHandle: varchar('target_handle', { length: 50 }),
	edgeType: varchar('edge_type', { length: 50 }).default('default'),
	label: varchar('label', { length: 255 }),
	condition: jsonb('condition'),
	style: jsonb('style'),
	animated: boolean('animated').default(false),
};

export const verificationEdgesIndexes = (t: { flowId: PgColumn; edgeId: PgColumn; sourceNodeId: PgColumn; targetNodeId: PgColumn }) => [
	index('verificationEdges_flow_id_idx').on(t.flowId),
	uniqueIndex('verificationEdges_flow_id_edge_id_idx').on(t.flowId, t.edgeId),
	index('verificationEdges_source_node_id_idx').on(t.sourceNodeId),
	index('verificationEdges_target_node_id_idx').on(t.targetNodeId),
];

export const verificationEdges = pgTable('verificationEdges', verificationEdgesColumns, (t) => [
	index('verificationEdges_flow_id_idx').on(t.flowId),
	uniqueIndex('verificationEdges_flow_id_edge_id_idx').on(t.flowId, t.edgeId),
	index('verificationEdges_source_node_id_idx').on(t.sourceNodeId),
	index('verificationEdges_target_node_id_idx').on(t.targetNodeId),
]);

export function createVerificationEdgesForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationFlowsTable = schema.table('verificationFlows', verificationFlowsColumns, (t) => verificationFlowsIndexes(t));
	return schema.table('verificationEdges', {
		...verificationEdgesColumns,
		flowId: uuid('flow_id').notNull().references(() => verificationFlowsTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('verificationEdges_flow_id_idx').on(t.flowId),
		uniqueIndex('verificationEdges_flow_id_edge_id_idx').on(t.flowId, t.edgeId),
		index('verificationEdges_source_node_id_idx').on(t.sourceNodeId),
		index('verificationEdges_target_node_id_idx').on(t.targetNodeId),
	]);
}

export const verificationNotificationRulesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	flowId: uuid('flow_id').notNull().references(() => verificationFlows.id, { onDelete: 'cascade' }),
	nodeId: varchar('node_id', { length: 100 }).notNull(),
	trigger: varchar('trigger', { length: 50 }).notNull(),
	titleTemplate: varchar('title_template', { length: 255 }),
	bodyTemplate: text('body_template'),
	startsAt: timestamp('starts_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
};

export const verificationNotificationRulesIndexes = (t: { flowId: PgColumn; nodeId: PgColumn; trigger: PgColumn }) => [
	index('verificationNotificationRules_flow_id_idx').on(t.flowId),
	uniqueIndex('verificationNotificationRules_flow_id_node_id_idx').on(t.flowId, t.nodeId),
	index('verificationNotificationRules_trigger_idx').on(t.trigger),
];

export const verificationNotificationRules = pgTable('verificationNotificationRules', verificationNotificationRulesColumns, (t) => [
	index('verificationNotificationRules_flow_id_idx').on(t.flowId),
	uniqueIndex('verificationNotificationRules_flow_id_node_id_idx').on(t.flowId, t.nodeId),
	index('verificationNotificationRules_trigger_idx').on(t.trigger),
]);

export function createVerificationNotificationRulesForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationFlowsTable = schema.table('verificationFlows', verificationFlowsColumns, (t) => verificationFlowsIndexes(t));
	return schema.table('verificationNotificationRules', {
		...verificationNotificationRulesColumns,
		flowId: uuid('flow_id').notNull().references(() => verificationFlowsTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('verificationNotificationRules_flow_id_idx').on(t.flowId),
		uniqueIndex('verificationNotificationRules_flow_id_node_id_idx').on(t.flowId, t.nodeId),
		index('verificationNotificationRules_trigger_idx').on(t.trigger),
	]);
}

export const verificationNotificationRecipientsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	ruleId: uuid('rule_id').notNull().references(() => verificationNotificationRules.id, { onDelete: 'cascade' }),
	recipientType: varchar('recipient_type', { length: 30 }).notNull(),
	recipientUserId: uuid('recipient_user_id'),
	recipientRole: varchar('recipient_role', { length: 100 }),
};

export const verificationNotificationRecipientsIndexes = (t: { ruleId: PgColumn; recipientType: PgColumn }) => [
	index('verificationNotificationRecipients_rule_id_idx').on(t.ruleId),
	index('verificationNotificationRecipients_recipient_type_idx').on(t.recipientType),
];

export const verificationNotificationRecipients = pgTable('verificationNotificationRecipients', verificationNotificationRecipientsColumns, (t) => [
	index('verificationNotificationRecipients_rule_id_idx').on(t.ruleId),
	index('verificationNotificationRecipients_recipient_type_idx').on(t.recipientType),
]);

export function createVerificationNotificationRecipientsForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationNotificationRulesTable = schema.table('verificationNotificationRules', verificationNotificationRulesColumns, (t) => verificationNotificationRulesIndexes(t));
	return schema.table('verificationNotificationRecipients', {
		...verificationNotificationRecipientsColumns,
		ruleId: uuid('rule_id').notNull().references(() => verificationNotificationRulesTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('verificationNotificationRecipients_rule_id_idx').on(t.ruleId),
		index('verificationNotificationRecipients_recipient_type_idx').on(t.recipientType),
	]);
}

export const verificationVerifierConfigsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	flowId: uuid('flow_id').notNull().references(() => verificationFlows.id, { onDelete: 'cascade' }),
	nodeId: varchar('node_id', { length: 100 }).notNull(),
	verifierType: varchar('verifier_type', { length: 30 }).notNull(),
	verifierUserId: uuid('verifier_user_id'),
	verifierRole: varchar('verifier_role', { length: 100 }),
	requireSignature: boolean('require_signature').notNull().default(false),
	allMustApprove: boolean('all_must_approve').notNull().default(false),
};

export const verificationVerifierConfigsIndexes = (t: { flowId: PgColumn; nodeId: PgColumn; verifierType: PgColumn }) => [
	index('verificationVerifierConfigs_flow_id_idx').on(t.flowId),
	uniqueIndex('verificationVerifierConfigs_flow_id_node_id_idx').on(t.flowId, t.nodeId),
	index('verificationVerifierConfigs_verifier_type_idx').on(t.verifierType),
];

export const verificationVerifierConfigs = pgTable('verificationVerifierConfigs', verificationVerifierConfigsColumns, (t) => [
	index('verificationVerifierConfigs_flow_id_idx').on(t.flowId),
	uniqueIndex('verificationVerifierConfigs_flow_id_node_id_idx').on(t.flowId, t.nodeId),
	index('verificationVerifierConfigs_verifier_type_idx').on(t.verifierType),
]);

export function createVerificationVerifierConfigsForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationFlowsTable = schema.table('verificationFlows', verificationFlowsColumns, (t) => verificationFlowsIndexes(t));
	return schema.table('verificationVerifierConfigs', {
		...verificationVerifierConfigsColumns,
		flowId: uuid('flow_id').notNull().references(() => verificationFlowsTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('verificationVerifierConfigs_flow_id_idx').on(t.flowId),
		uniqueIndex('verificationVerifierConfigs_flow_id_node_id_idx').on(t.flowId, t.nodeId),
		index('verificationVerifierConfigs_verifier_type_idx').on(t.verifierType),
	]);
}

export const verificationInstancesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	flowId: uuid('flow_id').notNull().references(() => verificationFlows.id),
	entityName: varchar('entity_name', { length: 100 }).notNull(),
	entityId: uuid('entity_id').notNull(),
	startedBy: uuid('started_by').references(() => users.id),
	status: varchar('status', { length: 30 }).notNull().default('active'),
	currentStepOrder: integer('current_step_order').notNull().default(1),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull().default(sql`now()`),
	completedAt: timestamp('completed_at', { withTimezone: true }),
};

export const verificationInstancesIndexes = (t: { flowId: PgColumn; entityName: PgColumn; entityId: PgColumn; status: PgColumn; startedBy: PgColumn }) => [
	index('verificationInstances_flow_id_idx').on(t.flowId),
	index('verificationInstances_entity_name_entity_id_idx').on(t.entityName, t.entityId),
	index('verificationInstances_entity_name_entity_id_status_idx').on(t.entityName, t.entityId, t.status),
	index('verificationInstances_status_idx').on(t.status),
	index('verificationInstances_started_by_idx').on(t.startedBy),
];

export const verificationInstances = pgTable('verificationInstances', verificationInstancesColumns, (t) => [
	index('verificationInstances_flow_id_idx').on(t.flowId),
	index('verificationInstances_entity_name_entity_id_idx').on(t.entityName, t.entityId),
	index('verificationInstances_entity_name_entity_id_status_idx').on(t.entityName, t.entityId, t.status),
	index('verificationInstances_status_idx').on(t.status),
	index('verificationInstances_started_by_idx').on(t.startedBy),
]);

export function createVerificationInstancesForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationFlowsTable = schema.table('verificationFlows', verificationFlowsColumns, (t) => verificationFlowsIndexes(t));
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('verificationInstances', {
		...verificationInstancesColumns,
		flowId: uuid('flow_id').notNull().references(() => verificationFlowsTable.id),
		startedBy: uuid('started_by').references(() => usersTable.id),
	}, (t) => [
		index('verificationInstances_flow_id_idx').on(t.flowId),
		index('verificationInstances_entity_name_entity_id_idx').on(t.entityName, t.entityId),
		index('verificationInstances_entity_name_entity_id_status_idx').on(t.entityName, t.entityId, t.status),
		index('verificationInstances_status_idx').on(t.status),
		index('verificationInstances_started_by_idx').on(t.startedBy),
	]);
}

export const verificationNotificationChannelsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	ruleId: uuid('rule_id').notNull().references(() => verificationNotificationRules.id, { onDelete: 'cascade' }),
	channel: varchar('channel', { length: 30 }).notNull(),
};

export const verificationNotificationChannelsIndexes = (t: { ruleId: PgColumn; channel: PgColumn }) => [
	index('verificationNotificationChannels_rule_id_idx').on(t.ruleId),
	uniqueIndex('verificationNotificationChannels_rule_id_channel_idx').on(t.ruleId, t.channel),
	index('verificationNotificationChannels_channel_idx').on(t.channel),
];

export const verificationNotificationChannels = pgTable('verificationNotificationChannels', verificationNotificationChannelsColumns, (t) => [
	index('verificationNotificationChannels_rule_id_idx').on(t.ruleId),
	uniqueIndex('verificationNotificationChannels_rule_id_channel_idx').on(t.ruleId, t.channel),
	index('verificationNotificationChannels_channel_idx').on(t.channel),
]);

export function createVerificationNotificationChannelsForSchema(schema: ReturnType<typeof pgSchema>) {
	const verificationNotificationRulesTable = schema.table('verificationNotificationRules', verificationNotificationRulesColumns, (t) => verificationNotificationRulesIndexes(t));
	return schema.table('verificationNotificationChannels', {
		...verificationNotificationChannelsColumns,
		ruleId: uuid('rule_id').notNull().references(() => verificationNotificationRulesTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('verificationNotificationChannels_rule_id_idx').on(t.ruleId),
		uniqueIndex('verificationNotificationChannels_rule_id_channel_idx').on(t.ruleId, t.channel),
		index('verificationNotificationChannels_channel_idx').on(t.channel),
	]);
}

export const userCohortsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	userCount: integer('user_count').notNull().default(0),
	metadata: jsonb('metadata').default(sql`'{}'`),
};

export const userCohorts = pgTable('user_cohorts', userCohortsColumns);

export function createUserCohortsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('user_cohorts', userCohortsColumns);
}

export const userSessionsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	tokenHash: varchar('token_hash', { length: 255 }).notNull(),
	refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
	deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
	deviceName: varchar('device_name', { length: 100 }),
	deviceType: varchar('device_type', { length: 50 }),
	browserName: varchar('browser_name', { length: 50 }),
	browserVersion: varchar('browser_version', { length: 20 }),
	osName: varchar('os_name', { length: 50 }),
	osVersion: varchar('os_version', { length: 20 }),
	ipAddress: varchar('ip_address', { length: 45 }).notNull(),
	locationCountry: varchar('location_country', { length: 100 }),
	locationCity: varchar('location_city', { length: 100 }),
	locationCoordinates: varchar('location_coordinates', { length: 50 }),
	lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().default(sql`now()`),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	revokedAt: timestamp('revoked_at', { withTimezone: true }),
	revokedReason: varchar('revoked_reason', { length: 100 }),
	isCurrent: boolean('is_current').notNull().default(false),
	loginMethod: varchar('login_method', { length: 50 }),
	rememberMe: boolean('remember_me').notNull().default(false),
	trustScore: integer('trust_score').default(100),
	approvalStatus: varchar('approval_status', { length: 20 }).default('approved'),
	approvalToken: varchar('approval_token', { length: 64 }),
	approvalRequestedAt: timestamp('approval_requested_at', { withTimezone: true }),
	approvalRespondedAt: timestamp('approval_responded_at', { withTimezone: true }),
};

export const userSessionsIndexes = (t: { userId: PgColumn; tokenHash: PgColumn; refreshTokenHash: PgColumn; isActive: PgColumn; expiresAt: PgColumn; deviceFingerprint: PgColumn; ipAddress: PgColumn; lastActivityAt: PgColumn; approvalStatus: PgColumn; approvalToken: PgColumn }) => [
	index('user_sessions_user_id_idx').on(t.userId),
	uniqueIndex('user_sessions_token_hash_idx').on(t.tokenHash),
	index('user_sessions_refresh_token_hash_idx').on(t.refreshTokenHash),
	index('user_sessions_user_id_is_active_idx').on(t.userId, t.isActive),
	index('user_sessions_expires_at_idx').on(t.expiresAt),
	index('user_sessions_device_fingerprint_idx').on(t.deviceFingerprint),
	index('user_sessions_ip_address_idx').on(t.ipAddress),
	index('user_sessions_last_activity_at_idx').on(t.lastActivityAt),
	index('user_sessions_approval_status_idx').on(t.approvalStatus),
	index('user_sessions_approval_token_idx').on(t.approvalToken),
];

export const userSessions = pgTable('user_sessions', userSessionsColumns, (t) => [
	index('user_sessions_user_id_idx').on(t.userId),
	uniqueIndex('user_sessions_token_hash_idx').on(t.tokenHash),
	index('user_sessions_refresh_token_hash_idx').on(t.refreshTokenHash),
	index('user_sessions_user_id_is_active_idx').on(t.userId, t.isActive),
	index('user_sessions_expires_at_idx').on(t.expiresAt),
	index('user_sessions_device_fingerprint_idx').on(t.deviceFingerprint),
	index('user_sessions_ip_address_idx').on(t.ipAddress),
	index('user_sessions_last_activity_at_idx').on(t.lastActivityAt),
	index('user_sessions_approval_status_idx').on(t.approvalStatus),
	index('user_sessions_approval_token_idx').on(t.approvalToken),
]);

export function createUserSessionsForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('user_sessions', {
		...userSessionsColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('user_sessions_user_id_idx').on(t.userId),
		uniqueIndex('user_sessions_token_hash_idx').on(t.tokenHash),
		index('user_sessions_refresh_token_hash_idx').on(t.refreshTokenHash),
		index('user_sessions_user_id_is_active_idx').on(t.userId, t.isActive),
		index('user_sessions_expires_at_idx').on(t.expiresAt),
		index('user_sessions_device_fingerprint_idx').on(t.deviceFingerprint),
		index('user_sessions_ip_address_idx').on(t.ipAddress),
		index('user_sessions_last_activity_at_idx').on(t.lastActivityAt),
		index('user_sessions_approval_status_idx').on(t.approvalStatus),
		index('user_sessions_approval_token_idx').on(t.approvalToken),
	]);
}

export const trustedDevicesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	tokenHash: varchar('token_hash', { length: 64 }).notNull(),
	status: varchar('status', { length: 20 }).notNull().default('pending'),
	originSessionId: uuid('origin_session_id'),
	label: varchar('label', { length: 120 }),
	deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
	firstSeenIp: varchar('first_seen_ip', { length: 45 }),
	lastSeenIp: varchar('last_seen_ip', { length: 45 }),
	lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	revokedAt: timestamp('revoked_at', { withTimezone: true }),
	revokedReason: varchar('revoked_reason', { length: 30 }),
};

export const trustedDevicesIndexes = (t: { tokenHash: PgColumn; userId: PgColumn; status: PgColumn; originSessionId: PgColumn; expiresAt: PgColumn }) => [
	uniqueIndex('trusted_devices_token_hash_idx').on(t.tokenHash),
	index('trusted_devices_user_id_idx').on(t.userId),
	index('trusted_devices_user_id_status_idx').on(t.userId, t.status),
	index('trusted_devices_origin_session_id_idx').on(t.originSessionId),
	index('trusted_devices_expires_at_idx').on(t.expiresAt),
];

export const trustedDevices = pgTable('trusted_devices', trustedDevicesColumns, (t) => [
	uniqueIndex('trusted_devices_token_hash_idx').on(t.tokenHash),
	index('trusted_devices_user_id_idx').on(t.userId),
	index('trusted_devices_user_id_status_idx').on(t.userId, t.status),
	index('trusted_devices_origin_session_id_idx').on(t.originSessionId),
	index('trusted_devices_expires_at_idx').on(t.expiresAt),
]);

export function createTrustedDevicesForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('trusted_devices', {
		...trustedDevicesColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		uniqueIndex('trusted_devices_token_hash_idx').on(t.tokenHash),
		index('trusted_devices_user_id_idx').on(t.userId),
		index('trusted_devices_user_id_status_idx').on(t.userId, t.status),
		index('trusted_devices_origin_session_id_idx').on(t.originSessionId),
		index('trusted_devices_expires_at_idx').on(t.expiresAt),
	]);
}

export const passwordResetTokensColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	tokenHash: varchar('token_hash', { length: 255 }).notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true }),
};

export const passwordResetTokensIndexes = (t: { tokenHash: PgColumn; userId: PgColumn; expiresAt: PgColumn }) => [
	uniqueIndex('password_reset_tokens_token_hash_idx').on(t.tokenHash),
	index('password_reset_tokens_user_id_idx').on(t.userId),
	index('password_reset_tokens_expires_at_idx').on(t.expiresAt),
];

export const passwordResetTokens = pgTable('password_reset_tokens', passwordResetTokensColumns, (t) => [
	uniqueIndex('password_reset_tokens_token_hash_idx').on(t.tokenHash),
	index('password_reset_tokens_user_id_idx').on(t.userId),
	index('password_reset_tokens_expires_at_idx').on(t.expiresAt),
]);

export function createPasswordResetTokensForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('password_reset_tokens', {
		...passwordResetTokensColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		uniqueIndex('password_reset_tokens_token_hash_idx').on(t.tokenHash),
		index('password_reset_tokens_user_id_idx').on(t.userId),
		index('password_reset_tokens_expires_at_idx').on(t.expiresAt),
	]);
}

export const magicLinkTokensColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	email: varchar('email', { length: 255 }).notNull(),
	tokenHash: varchar('token_hash', { length: 255 }).notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true }),
};

export const magicLinkTokensIndexes = (t: { tokenHash: PgColumn; userId: PgColumn; email: PgColumn; expiresAt: PgColumn }) => [
	uniqueIndex('magic_link_tokens_token_hash_idx').on(t.tokenHash),
	index('magic_link_tokens_user_id_idx').on(t.userId),
	index('magic_link_tokens_email_idx').on(t.email),
	index('magic_link_tokens_expires_at_idx').on(t.expiresAt),
];

export const magicLinkTokens = pgTable('magic_link_tokens', magicLinkTokensColumns, (t) => [
	uniqueIndex('magic_link_tokens_token_hash_idx').on(t.tokenHash),
	index('magic_link_tokens_user_id_idx').on(t.userId),
	index('magic_link_tokens_email_idx').on(t.email),
	index('magic_link_tokens_expires_at_idx').on(t.expiresAt),
]);

export function createMagicLinkTokensForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('magic_link_tokens', {
		...magicLinkTokensColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		uniqueIndex('magic_link_tokens_token_hash_idx').on(t.tokenHash),
		index('magic_link_tokens_user_id_idx').on(t.userId),
		index('magic_link_tokens_email_idx').on(t.email),
		index('magic_link_tokens_expires_at_idx').on(t.expiresAt),
	]);
}

export const webauthnCredentialsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	credentialId: text('credential_id').notNull(),
	publicKey: text('public_key').notNull(),
	counter: bigint('counter', { mode: 'number' }).notNull(),
	transports: jsonb('transports'),
	deviceType: varchar('device_type', { length: 32 }),
	backedUp: boolean('backed_up').notNull(),
	aaguid: varchar('aaguid', { length: 64 }),
	authenticatorAttachment: varchar('authenticator_attachment', { length: 32 }),
	nickname: varchar('nickname', { length: 128 }),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
	revokedAt: timestamp('revoked_at', { withTimezone: true }),
};

export const webauthnCredentialsIndexes = (t: { credentialId: PgColumn; userId: PgColumn }) => [
	uniqueIndex('webauthn_credentials_credential_id_idx').on(t.credentialId),
	index('webauthn_credentials_user_id_idx').on(t.userId),
];

export const webauthnCredentials = pgTable('webauthn_credentials', webauthnCredentialsColumns, (t) => [
	uniqueIndex('webauthn_credentials_credential_id_idx').on(t.credentialId),
	index('webauthn_credentials_user_id_idx').on(t.userId),
]);

export function createWebauthnCredentialsForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('webauthn_credentials', {
		...webauthnCredentialsColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		uniqueIndex('webauthn_credentials_credential_id_idx').on(t.credentialId),
		index('webauthn_credentials_user_id_idx').on(t.userId),
	]);
}

export const webauthnChallengesColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
	challenge: text('challenge').notNull(),
	challengeType: varchar('challenge_type', { length: 32 }).notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	consumedAt: timestamp('consumed_at', { withTimezone: true }),
};

export const webauthnChallengesIndexes = (t: { challenge: PgColumn; userId: PgColumn; expiresAt: PgColumn }) => [
	uniqueIndex('webauthn_challenges_challenge_idx').on(t.challenge),
	index('webauthn_challenges_user_id_idx').on(t.userId),
	index('webauthn_challenges_expires_at_idx').on(t.expiresAt),
];

export const webauthnChallenges = pgTable('webauthn_challenges', webauthnChallengesColumns, (t) => [
	uniqueIndex('webauthn_challenges_challenge_idx').on(t.challenge),
	index('webauthn_challenges_user_id_idx').on(t.userId),
	index('webauthn_challenges_expires_at_idx').on(t.expiresAt),
]);

export function createWebauthnChallengesForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('webauthn_challenges', {
		...webauthnChallengesColumns,
		userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		uniqueIndex('webauthn_challenges_challenge_idx').on(t.challenge),
		index('webauthn_challenges_user_id_idx').on(t.userId),
		index('webauthn_challenges_expires_at_idx').on(t.expiresAt),
	]);
}

export const auditLogsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	entityId: uuid('entity_id'),
	entityName: text('entity_name').notNull(),
	operationType: text('operation_type').notNull(),
	userId: uuid('user_id'),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	summary: text('summary'),
	severity: text('severity').default('info'),
	category: text('category'),
	occurrenceCount: integer('occurrence_count').default(1),
	lastOccurrenceAt: timestamp('last_occurrence_at'),
	oldValues: jsonb('old_values'),
	newValues: jsonb('new_values'),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	path: text('path'),
	query: text('query'),
	timestamp: timestamp('timestamp').notNull().default(sql`now()`),
};

export const auditLogsIndexes = (t: { entityId: PgColumn; entityName: PgColumn; userId: PgColumn; createdAt: PgColumn; severity: PgColumn; category: PgColumn }) => [
	index('audit_logs_entity_id_idx').on(t.entityId),
	index('audit_logs_entity_name_idx').on(t.entityName),
	index('audit_logs_user_id_idx').on(t.userId),
	index('audit_logs_created_at_idx').on(t.createdAt),
	index('audit_logs_severity_idx').on(t.severity),
	index('audit_logs_category_idx').on(t.category),
];

export const auditLogs = pgTable('audit_logs', auditLogsColumns, (t) => [
	index('audit_logs_entity_id_idx').on(t.entityId),
	index('audit_logs_entity_name_idx').on(t.entityName),
	index('audit_logs_user_id_idx').on(t.userId),
	index('audit_logs_created_at_idx').on(t.createdAt),
	index('audit_logs_severity_idx').on(t.severity),
	index('audit_logs_category_idx').on(t.category),
]);

export function createAuditLogsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('audit_logs', auditLogsColumns, (t) => [
		index('audit_logs_entity_id_idx').on(t.entityId),
		index('audit_logs_entity_name_idx').on(t.entityName),
		index('audit_logs_user_id_idx').on(t.userId),
		index('audit_logs_created_at_idx').on(t.createdAt),
		index('audit_logs_severity_idx').on(t.severity),
		index('audit_logs_category_idx').on(t.category),
	]);
}

export const oauthAccountsColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	provider: varchar('provider', { length: 50 }).notNull(),
	providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
	providerEmail: varchar('provider_email', { length: 255 }),
	providerName: varchar('provider_name', { length: 255 }),
	providerAvatarUrl: text('provider_avatar_url'),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	tokenExpiresAt: timestamp('token_expires_at'),
	scope: text('scope'),
	rawProfile: jsonb('raw_profile'),
	isPrimary: boolean('is_primary').notNull().default(false),
	lastUsedAt: timestamp('last_used_at'),
};

export const oauthAccountsIndexes = (t: { userId: PgColumn; provider: PgColumn; providerAccountId: PgColumn; providerEmail: PgColumn }) => [
	index('oauth_accounts_user_id_idx').on(t.userId),
	uniqueIndex('oauth_accounts_provider_provider_account_id_idx').on(t.provider, t.providerAccountId),
	index('oauth_accounts_provider_email_idx').on(t.providerEmail),
	index('oauth_accounts_user_id_provider_idx').on(t.userId, t.provider),
];

export const oauthAccounts = pgTable('oauth_accounts', oauthAccountsColumns, (t) => [
	index('oauth_accounts_user_id_idx').on(t.userId),
	uniqueIndex('oauth_accounts_provider_provider_account_id_idx').on(t.provider, t.providerAccountId),
	index('oauth_accounts_provider_email_idx').on(t.providerEmail),
	index('oauth_accounts_user_id_provider_idx').on(t.userId, t.provider),
	unique('unique_provider_account').on(t.provider, t.providerAccountId),
]);

export function createOauthAccountsForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('oauth_accounts', {
		...oauthAccountsColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		index('oauth_accounts_user_id_idx').on(t.userId),
		uniqueIndex('oauth_accounts_provider_provider_account_id_idx').on(t.provider, t.providerAccountId),
		index('oauth_accounts_provider_email_idx').on(t.providerEmail),
		index('oauth_accounts_user_id_provider_idx').on(t.userId, t.provider),
	]);
}

export const apiKeysColumns = {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: uuid('created_by'),
	updatedBy: uuid('updated_by'),
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	keyHash: varchar('key_hash', { length: 255 }).notNull(),
	keyPreview: varchar('key_preview', { length: 20 }).notNull(),
	ownerType: varchar('owner_type', { length: 30 }).notNull().default('personal'),
	applicationName: varchar('application_name', { length: 255 }),
	allowedRoles: jsonb('allowed_roles').notNull().default(sql`'[]'`),
	allowedClaims: jsonb('allowed_claims').notNull().default(sql`'[]'`),
	allowedScopes: jsonb('allowed_scopes').notNull().default(sql`'[]'`),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
	lastUsedIp: varchar('last_used_ip', { length: 45 }),
	usageCount: integer('usage_count').notNull().default(0),
	revokedAt: timestamp('revoked_at', { withTimezone: true }),
	revokedReason: varchar('revoked_reason', { length: 255 }),
};

export const apiKeysIndexes = (t: { keyHash: PgColumn; userId: PgColumn; isActive: PgColumn; ownerType: PgColumn; expiresAt: PgColumn; lastUsedAt: PgColumn }) => [
	uniqueIndex('api_keys_key_hash_idx').on(t.keyHash),
	index('api_keys_user_id_idx').on(t.userId),
	index('api_keys_user_id_is_active_idx').on(t.userId, t.isActive),
	index('api_keys_owner_type_idx').on(t.ownerType),
	index('api_keys_expires_at_idx').on(t.expiresAt),
	index('api_keys_last_used_at_idx').on(t.lastUsedAt),
];

export const apiKeys = pgTable('api_keys', apiKeysColumns, (t) => [
	uniqueIndex('api_keys_key_hash_idx').on(t.keyHash),
	index('api_keys_user_id_idx').on(t.userId),
	index('api_keys_user_id_is_active_idx').on(t.userId, t.isActive),
	index('api_keys_owner_type_idx').on(t.ownerType),
	index('api_keys_expires_at_idx').on(t.expiresAt),
	index('api_keys_last_used_at_idx').on(t.lastUsedAt),
]);

export function createApiKeysForSchema(schema: ReturnType<typeof pgSchema>) {
	const usersTable = schema.table('users', usersColumns, (t) => usersIndexes(t));
	return schema.table('api_keys', {
		...apiKeysColumns,
		userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
	}, (t) => [
		uniqueIndex('api_keys_key_hash_idx').on(t.keyHash),
		index('api_keys_user_id_idx').on(t.userId),
		index('api_keys_user_id_is_active_idx').on(t.userId, t.isActive),
		index('api_keys_owner_type_idx').on(t.ownerType),
		index('api_keys_expires_at_idx').on(t.expiresAt),
		index('api_keys_last_used_at_idx').on(t.lastUsedAt),
	]);
}

export const boardMeetingDecisionsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	meetingDate: timestamp('meeting_date').notNull(),
	itemNo: integer('item_no').notNull(),
	itemDescription: varchar('item_description', { length: 1000 }).notNull(),
	status: varchar('status', { length: 50 }).notNull().default('open'),
	assignedUserId: uuid('assigned_user_id'),
};

export const boardMeetingDecisions = pgTable('board_meeting_decisions', boardMeetingDecisionsColumns);

export function createBoardMeetingDecisionsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('board_meeting_decisions', boardMeetingDecisionsColumns);
}

export const companiesColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	ownerId: uuid('owner_id').notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	taxId: varchar('tax_id', { length: 50 }),
	w9: uuid('w9'),
};

export const companies = pgTable('companies', companiesColumns);

export function createCompaniesForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('companies', companiesColumns);
}

export const fiveSActionsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	name: varchar('name', { length: 255 }).notNull(),
};

export const fiveSActions = pgTable('five_s_actions', fiveSActionsColumns);

export function createFiveSActionsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_actions', fiveSActionsColumns);
}

export const fiveSAuditAnswersColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	auditId: uuid('audit_id').notNull(),
	questionId: text('question_id').notNull(),
	stepCode: text('step_code').notNull(),
	rating: text('rating').notNull(),
	explanation: text('explanation'),
	findingType: text('finding_type'),
	photoBeforeUrl: text('photo_before_url'),
	hasOpenFinding: boolean('has_open_finding').notNull().default(false),
	answeredAt: timestamp('answered_at').notNull().default(sql`now()`),
};

export const fiveSAuditAnswers = pgTable('five_s_audit_answers', fiveSAuditAnswersColumns);

export function createFiveSAuditAnswersForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_audit_answers', fiveSAuditAnswersColumns);
}

export const fiveSAuditDraftsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	planId: uuid('plan_id'),
	header: jsonb('header').notNull().default(sql`'{}'`),
	answers: jsonb('answers').notNull().default(sql`'{}'`),
	updatedByUserId: uuid('updated_by_user_id'),
	updatedByName: text('updated_by_name'),
};

export const fiveSAuditDrafts = pgTable('five_s_audit_drafts', fiveSAuditDraftsColumns);

export function createFiveSAuditDraftsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_audit_drafts', fiveSAuditDraftsColumns);
}

export const fiveSAuditPlansColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	parentPlanId: uuid('parent_plan_id'),
	quarter: varchar('quarter', { length: 16 }),
	dateRangeStart: date('date_range_start'),
	dateRangeEnd: date('date_range_end'),
	plannedDate: date('planned_date'),
	locationId: uuid('location_id'),
	assignedTeamId: uuid('assigned_team_id'),
	status: varchar('status', { length: 32 }).notNull().default('planned'),
	auditId: uuid('audit_id'),
	title: text('title'),
	dateChangeCount: integer('date_change_count').notNull().default(0),
	auditorAttended: boolean('auditor_attended'),
	fieldManagerAttended: boolean('field_manager_attended'),
};

export const fiveSAuditPlans = pgTable('five_s_audit_plans', fiveSAuditPlansColumns);

export function createFiveSAuditPlansForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_audit_plans', fiveSAuditPlansColumns);
}

export const fiveSAuditTeamMembersColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	teamId: uuid('team_id').notNull(),
	userId: uuid('user_id').notNull(),
};

export const fiveSAuditTeamMembers = pgTable('five_s_audit_team_members', fiveSAuditTeamMembersColumns);

export function createFiveSAuditTeamMembersForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_audit_team_members', fiveSAuditTeamMembersColumns);
}

export const fiveSAuditTeamsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	name: text('name'),
	leaderUserId: uuid('leader_user_id').notNull(),
};

export const fiveSAuditTeams = pgTable('five_s_audit_teams', fiveSAuditTeamsColumns);

export function createFiveSAuditTeamsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_audit_teams', fiveSAuditTeamsColumns);
}

export const fiveSAuditsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	departmentName: text('department_name').notNull(),
	auditorName: text('auditor_name').notNull(),
	auditorId: uuid('auditor_id'),
	clientSubmissionId: uuid('client_submission_id'),
	source: text('source'),
	auditDate: timestamp('audit_date').notNull(),
	totalScore: numeric('total_score', { precision: 5, scale: 2 }).notNull(),
	targetScore: numeric('target_score', { precision: 5, scale: 2 }).notNull().default('75'),
	scoreS1: numeric('score_s1', { precision: 5, scale: 2 }).notNull(),
	scoreS2: numeric('score_s2', { precision: 5, scale: 2 }).notNull(),
	scoreS3: numeric('score_s3', { precision: 5, scale: 2 }).notNull(),
	scoreS4: numeric('score_s4', { precision: 5, scale: 2 }).notNull(),
	scoreS5: numeric('score_s5', { precision: 5, scale: 2 }).notNull(),
	locationId: uuid('location_id'),
	periodId: uuid('period_id'),
	planId: uuid('plan_id'),
};

export const fiveSAudits = pgTable('five_s_audits', fiveSAuditsColumns);

export function createFiveSAuditsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_audits', fiveSAuditsColumns);
}

export const fiveSFindingTypesColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	name: varchar('name', { length: 255 }).notNull(),
};

export const fiveSFindingTypes = pgTable('five_s_finding_types', fiveSFindingTypesColumns);

export function createFiveSFindingTypesForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_finding_types', fiveSFindingTypesColumns);
}

export const fiveSFindingsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	auditId: uuid('audit_id'),
	answerId: uuid('answer_id'),
	clientFindingId: uuid('client_finding_id'),
	clientSubmissionId: uuid('client_submission_id'),
	questionId: text('question_id'),
	stepCode: text('step_code'),
	findingNo: integer('finding_no').notNull(),
	detectedDate: date('detected_date'),
	locationName: text('location_name'),
	findingType: text('finding_type'),
	description: text('description'),
	photoBeforeFileId: uuid('photo_before_file_id'),
	photoBeforeUrl: text('photo_before_url'),
	photoBeforeFiles: jsonb('photo_before_files').notNull().default(sql`'[]'`),
	photoAfterFileId: uuid('photo_after_file_id'),
	photoAfterUrl: text('photo_after_url'),
	photoAfterFiles: jsonb('photo_after_files').notNull().default(sql`'[]'`),
	actionToTake: text('action_to_take'),
	dueDate: date('due_date'),
	completedAt: date('completed_at'),
	responsibleName: text('responsible_name'),
	responsibleUserId: uuid('responsible_user_id'),
	auditorName: text('auditor_name'),
	auditorUserId: uuid('auditor_user_id'),
	status: text('status').notNull().default('open'),
	formTitle: text('form_title'),
};

export const fiveSFindings = pgTable('five_s_findings', fiveSFindingsColumns);

export function createFiveSFindingsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_findings', fiveSFindingsColumns);
}

export const fiveSLocationsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	name: varchar('name', { length: 255 }).notNull(),
	managerUserId: uuid('manager_user_id'),
	fieldManagerUserIds: jsonb('field_manager_user_ids').notNull().default(sql`'[]'`),
	departmentName: varchar('department_name', { length: 255 }),
	mapX: integer('map_x'),
	mapY: integer('map_y'),
};

export const fiveSLocations = pgTable('five_s_locations', fiveSLocationsColumns);

export function createFiveSLocationsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_locations', fiveSLocationsColumns);
}

export const fiveSQuestionsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	stepId: uuid('step_id').notNull(),
	externalId: text('external_id').notNull(),
	order: integer('order').notNull(),
	text: text('text').notNull(),
	maxScore: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
	requireExplanation: boolean('require_explanation').notNull().default(true),
};

export const fiveSQuestions = pgTable('five_s_questions', fiveSQuestionsColumns);

export function createFiveSQuestionsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_questions', fiveSQuestionsColumns);
}

export const fiveSStepsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	code: text('code').notNull(),
	title: text('title').notNull(),
	maxScore: numeric('max_score', { precision: 5, scale: 2 }).notNull(),
	order: integer('order').notNull(),
};

export const fiveSSteps = pgTable('five_s_steps', fiveSStepsColumns);

export function createFiveSStepsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('five_s_steps', fiveSStepsColumns);
}

export const userClaimsColumns = {
	id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().default(sql`now()`),
	updatedAt: timestamp('updated_at').default(sql`now()`),
	userId: uuid('user_id').notNull(),
	claimId: uuid('claim_id').notNull(),
	grantedBy: uuid('granted_by'),
	expiresAt: timestamp('expires_at'),
};

export const userClaims = pgTable('userClaims', userClaimsColumns);

export function createUserClaimsForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table('userClaims', userClaimsColumns);
}

export function createAllTablesForSchema(schema: ReturnType<typeof pgSchema>) {
	const tables: Record<string, unknown> = {};

	tables.userCohorts = createUserCohortsForSchema(schema);
	tables.users = createUsersForSchema(schema);
	tables.profiles = createProfilesForSchema(schema);
	tables.roles = createRolesForSchema(schema);
	tables.claims = createClaimsForSchema(schema);
	tables.userRoles = createUserRolesForSchema(schema);
	tables.roleClaims = createRoleClaimsForSchema(schema);
	tables.files = createFilesForSchema(schema);
	tables.addresses = createAddressesForSchema(schema);
	tables.phones = createPhonesForSchema(schema);
	tables.notifications = createNotificationsForSchema(schema);
	tables.verificationFlows = createVerificationFlowsForSchema(schema);
	tables.verificationInstances = createVerificationInstancesForSchema(schema);
	tables.verificationRequirements = createVerificationRequirementsForSchema(schema);
	tables.verifications = createVerificationsForSchema(schema);
	tables.verificationSteps = createVerificationStepsForSchema(schema);
	tables.verificationEdges = createVerificationEdgesForSchema(schema);
	tables.verificationNotificationRules = createVerificationNotificationRulesForSchema(schema);
	tables.verificationNotificationRecipients = createVerificationNotificationRecipientsForSchema(schema);
	tables.verificationVerifierConfigs = createVerificationVerifierConfigsForSchema(schema);
	tables.verificationNotificationChannels = createVerificationNotificationChannelsForSchema(schema);
	tables.userSessions = createUserSessionsForSchema(schema);
	tables.trustedDevices = createTrustedDevicesForSchema(schema);
	tables.passwordResetTokens = createPasswordResetTokensForSchema(schema);
	tables.magicLinkTokens = createMagicLinkTokensForSchema(schema);
	tables.webauthnCredentials = createWebauthnCredentialsForSchema(schema);
	tables.webauthnChallenges = createWebauthnChallengesForSchema(schema);
	tables.auditLogs = createAuditLogsForSchema(schema);
	tables.oauthAccounts = createOauthAccountsForSchema(schema);
	tables.apiKeys = createApiKeysForSchema(schema);
	tables.boardMeetingDecisions = createBoardMeetingDecisionsForSchema(schema);
	tables.companies = createCompaniesForSchema(schema);
	tables.fiveSActions = createFiveSActionsForSchema(schema);
	tables.fiveSAuditAnswers = createFiveSAuditAnswersForSchema(schema);
	tables.fiveSAuditDrafts = createFiveSAuditDraftsForSchema(schema);
	tables.fiveSAuditPlans = createFiveSAuditPlansForSchema(schema);
	tables.fiveSAuditTeamMembers = createFiveSAuditTeamMembersForSchema(schema);
	tables.fiveSAuditTeams = createFiveSAuditTeamsForSchema(schema);
	tables.fiveSAudits = createFiveSAuditsForSchema(schema);
	tables.fiveSFindingTypes = createFiveSFindingTypesForSchema(schema);
	tables.fiveSFindings = createFiveSFindingsForSchema(schema);
	tables.fiveSLocations = createFiveSLocationsForSchema(schema);
	tables.fiveSQuestions = createFiveSQuestionsForSchema(schema);
	tables.fiveSSteps = createFiveSStepsForSchema(schema);
	tables.userClaims = createUserClaimsForSchema(schema);

	return tables;
}
