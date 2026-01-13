import { createGodminUser } from "./createGodminUser";
import { createInitialClaims } from "./createInitialClaims";
import { createInitialRoles } from "./createInitialRoles";

/**
 * Runs all initialization tasks in sequence:
 * 1. Create godmin user (if not exists)
 * 2. Create initial claims (if not exists)
 * 3. Create initial roles and assign claims (if not exists)
 * 4. Create initial cards for Supernatural card game (if not exists)
 * 5. Create initial card abilities (if not exists)
 */
export async function runInitialization() {
	console.log("\n🚀 Starting system initialization...\n");

	await createGodminUser();
	await createInitialClaims();
	await createInitialRoles();

	console.log("\n✨ System initialization complete!\n");
}
