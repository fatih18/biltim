import { relations } from 'drizzle-orm';
import { users, profiles, roles, claims, userRoles, roleClaims, files, addresses, phones, notifications, verifications, verificationRequirements, verificationFlows, verificationSteps, verificationEdges, verificationNotificationRules, verificationNotificationRecipients, verificationVerifierConfigs, verificationInstances, verificationNotificationChannels, userCohorts, userSessions, trustedDevices, passwordResetTokens, magicLinkTokens, webauthnCredentials, webauthnChallenges, auditLogs, oauthAccounts, apiKeys, boardMeetingDecisions, companies, fiveSActions, fiveSAuditAnswers, fiveSAuditDrafts, fiveSAuditPlans, fiveSAuditTeamMembers, fiveSAuditTeams, fiveSAudits, fiveSFindingTypes, fiveSFindings, fiveSLocations, fiveSQuestions, fiveSSteps, userClaims } from './schema';

export const usersRelations = relations(users, ({ one, many }) => ({
	userCohorts: one(userCohorts, {
		fields: [users.cohortId],
		references: [userCohorts.id],
	}),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
	users: one(users, {
		fields: [profiles.userId],
		references: [users.id],
	}),
}));

export const userRolesRelations = relations(userRoles, ({ one, many }) => ({
	users: one(users, {
		fields: [userRoles.userId],
		references: [users.id],
	}),
	roles: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id],
	}),
}));

export const roleClaimsRelations = relations(roleClaims, ({ one, many }) => ({
	roles: one(roles, {
		fields: [roleClaims.roleId],
		references: [roles.id],
	}),
	claims: one(claims, {
		fields: [roleClaims.claimId],
		references: [claims.id],
	}),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
	users: one(users, {
		fields: [files.uploadedBy],
		references: [users.id],
	}),
}));

export const verificationsRelations = relations(verifications, ({ one, many }) => ({
	verificationInstances: one(verificationInstances, {
		fields: [verifications.instanceId],
		references: [verificationInstances.id],
	}),
	verificationRequirements: one(verificationRequirements, {
		fields: [verifications.requirementId],
		references: [verificationRequirements.id],
	}),
	users: one(users, {
		fields: [verifications.verifierId],
		references: [users.id],
	}),
	files: one(files, {
		fields: [verifications.signatureId],
		references: [files.id],
	}),
}));

export const verificationRequirementsRelations = relations(verificationRequirements, ({ one, many }) => ({
	verificationInstances: one(verificationInstances, {
		fields: [verificationRequirements.instanceId],
		references: [verificationInstances.id],
	}),
}));

export const verificationStepsRelations = relations(verificationSteps, ({ one, many }) => ({
	verificationFlows: one(verificationFlows, {
		fields: [verificationSteps.flowId],
		references: [verificationFlows.id],
	}),
}));

export const verificationEdgesRelations = relations(verificationEdges, ({ one, many }) => ({
	verificationFlows: one(verificationFlows, {
		fields: [verificationEdges.flowId],
		references: [verificationFlows.id],
	}),
}));

export const verificationNotificationRulesRelations = relations(verificationNotificationRules, ({ one, many }) => ({
	verificationFlows: one(verificationFlows, {
		fields: [verificationNotificationRules.flowId],
		references: [verificationFlows.id],
	}),
}));

export const verificationNotificationRecipientsRelations = relations(verificationNotificationRecipients, ({ one, many }) => ({
	verificationNotificationRules: one(verificationNotificationRules, {
		fields: [verificationNotificationRecipients.ruleId],
		references: [verificationNotificationRules.id],
	}),
}));

export const verificationVerifierConfigsRelations = relations(verificationVerifierConfigs, ({ one, many }) => ({
	verificationFlows: one(verificationFlows, {
		fields: [verificationVerifierConfigs.flowId],
		references: [verificationFlows.id],
	}),
}));

export const verificationInstancesRelations = relations(verificationInstances, ({ one, many }) => ({
	verificationFlows: one(verificationFlows, {
		fields: [verificationInstances.flowId],
		references: [verificationFlows.id],
	}),
	users: one(users, {
		fields: [verificationInstances.startedBy],
		references: [users.id],
	}),
}));

export const verificationNotificationChannelsRelations = relations(verificationNotificationChannels, ({ one, many }) => ({
	verificationNotificationRules: one(verificationNotificationRules, {
		fields: [verificationNotificationChannels.ruleId],
		references: [verificationNotificationRules.id],
	}),
}));

export const userCohortsRelations = relations(userCohorts, ({ one, many }) => ({
	users: one(users, {
		fields: [userCohorts.createdBy],
		references: [users.id],
	}),
}));

export const userSessionsRelations = relations(userSessions, ({ one, many }) => ({
	users: one(users, {
		fields: [userSessions.userId],
		references: [users.id],
	}),
}));

export const trustedDevicesRelations = relations(trustedDevices, ({ one, many }) => ({
	users: one(users, {
		fields: [trustedDevices.userId],
		references: [users.id],
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one, many }) => ({
	users: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id],
	}),
}));

export const magicLinkTokensRelations = relations(magicLinkTokens, ({ one, many }) => ({
	users: one(users, {
		fields: [magicLinkTokens.userId],
		references: [users.id],
	}),
}));

export const webauthnCredentialsRelations = relations(webauthnCredentials, ({ one, many }) => ({
	users: one(users, {
		fields: [webauthnCredentials.userId],
		references: [users.id],
	}),
}));

export const webauthnChallengesRelations = relations(webauthnChallenges, ({ one, many }) => ({
	users: one(users, {
		fields: [webauthnChallenges.userId],
		references: [users.id],
	}),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one, many }) => ({
	users: one(users, {
		fields: [oauthAccounts.userId],
		references: [users.id],
	}),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
	users: one(users, {
		fields: [apiKeys.userId],
		references: [users.id],
	}),
}));

