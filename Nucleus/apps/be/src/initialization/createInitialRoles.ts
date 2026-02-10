import { GenericAction } from "@monorepo/generics";

type RoleData = {
	name: string;
	description: string;
	is_system: boolean;
	alias?: string;
};

const INITIAL_ROLES: RoleData[] = [
	{
		name: "Super Admin",
		description: "Full system access - God mode equivalent for non-god users",
		is_system: true,
		alias: "Super Admin",
	},

	{
		name: "Manager",
		description: "Kullanıcı rol ataması ve bulguların status değişimi.",
		is_system: true,
		alias: "Müdür",
	},

	{
		name: "Content Manager Core Team",
		description: "Ana veri yönetimi ve bulgu onay.",
		is_system: false,
		alias: "Merkez Ekip",
	},
	{
		name: "Field Manager",
		description: "Açık bulgu kapatabilir ve sonrası fotoğraf yükleyebilir.",
		is_system: false,
		alias: "Saha Sorumlusu",
	},
	{
		name: "Auditor",
		description: "Denetim kaydı açabilir. Termin tarihi girebilir.",
		is_system: false,
		alias: "Denetçi",
	},
];
const ROLES_WITH_ALL_CLAIMS = [
	"Super Admin",
	"Manager",
	"Content Manager Core Team",
	"Field Manager",
	"Auditor",
];

export async function createInitialRoles() {
	console.log("👥 Creating initial roles...");

	const createdRoles = new Map<string, string>(); // roleName -> roleId
	let created = 0;
	let existing = 0;
	let failed = 0;

	// Step 1: Create roles
	for (const role of INITIAL_ROLES) {
		try {
			const result = await GenericAction({
				ip_address: "127.0.0.1",
				user_agent: "system",
				schema_name: "main",
				table_name: "T_Roles",
				action_type: "INSERT",
				data: role,
			});
			const createdRole = result?.[0];
			if (createdRole?.id) {
				createdRoles.set(role.name, createdRole.id);
				created++;
			}
		} catch (error) {
			const err = error as { cause?: { code?: string }; message?: string };
			const code = err?.cause?.code;

			if (code === "23505") {
				// Role already exists - try to fetch its ID
				try {
					const existingResult = await GenericAction({
						ip_address: "127.0.0.1",
						user_agent: "system",
						schema_name: "main",
						table_name: "T_Roles",
						action_type: "GET",
						filters: [
							{
								column: "name",
								value: role.name,
							},
						],
						limit: 1,
					});
					const existingList = (existingResult ?? []) as Array<{
						id: string;
						name: string;
					}>;
					const existingRole = existingList[0];
					if (existingRole?.id) {
						createdRoles.set(role.name, existingRole.id);
					}
				} catch {
					console.error(`❌ Failed to fetch existing role: ${role.name}`);
				}
				existing++;
			} else {
				failed++;
				console.error(`❌ Failed to create role: ${role.name}`, {
					code,
					message: err?.message,
				});
			}
		}
	}

	console.log(`✅ Roles creation complete:`);
	console.log(`   - Created: ${created}`);
	console.log(`   - Already exists: ${existing}`);
	if (failed > 0) {
		console.log(`   - Failed: ${failed}`);
	}

	// Step 2: Fetch all claims first
	console.log("🔍 Fetching all claims...");
	let allClaims: Array<{ id: string; action: string }> = [];
	try {
		const claimsResult = await GenericAction({
			ip_address: "127.0.0.1",
			user_agent: "system",
			schema_name: "main",
			table_name: "T_Claims",
			action_type: "GET",
			limit: 100,
		});
		allClaims = (claimsResult ?? []) as Array<{ id: string; action: string }>;
		console.log(`✅ Fetched ${allClaims.length} claims`);
	} catch (error) {
		console.error("❌ Failed to fetch claims:", error);
		return;
	}

	// Step 3: Assign all claims to roles dynamically
	console.log("🔗 Assigning all claims to roles...");
	let assignedCount = 0;
	let assignExistingCount = 0;
	let assignFailedCount = 0;

	for (const roleName of ROLES_WITH_ALL_CLAIMS) {
		const roleId = createdRoles.get(roleName);
		if (!roleId) {
			console.warn(`⚠️  Role not found: ${roleName}`);
			continue;
		}

		for (const claim of allClaims) {
			try {
				await GenericAction({
					ip_address: "127.0.0.1",
					user_agent: "system",
					schema_name: "main",
					table_name: "T_RoleClaims",
					action_type: "INSERT",
					data: {
						role_id: roleId,
						claim_id: claim.id,
					},
				});
				assignedCount++;
			} catch (error) {
				const err = error as { cause?: { code?: string }; message?: string };
				const code = err?.cause?.code;

				if (code === "23505") {
					assignExistingCount++;
				} else {
					assignFailedCount++;
					console.error(
						`❌ Failed to assign claim ${claim.action} to role ${roleName}`,
					);
				}
			}
		}
	}

	console.log(`✅ Role-claim assignments complete:`);
	console.log(`   - Assigned: ${assignedCount}`);
	console.log(`   - Already assigned: ${assignExistingCount}`);
	if (assignFailedCount > 0) {
		console.log(`   - Failed: ${assignFailedCount}`);
	}
}
