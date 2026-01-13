import { DEBUG_MODE } from "./index";
import type { HybridSearchConfig, SearchParams, WithSelector } from "./types";

export function buildDrizzleWith(
	config: HybridSearchConfig,
	params: SearchParams,
): Record<string, WithSelector> | undefined {
	if (DEBUG_MODE)
		console.log("🔧 buildDrizzleWith called:", {
			tableName: config.table_name,
			hasRelations: !!config.relations,
			relationCount: config.relations?.length,
			includeRelationsParam: params.includeRelations,
		});

	if (!config.relations || params.includeRelations === false) {
		console.log("❌ No relations will be loaded (early return)");
		return undefined;
	}

	const withClause: Record<string, WithSelector> = {};

	const relationsToInclude = config.relations.filter((rel) => {
		if (params.includeRelations === true) return true;
		if (Array.isArray(params.includeRelations)) {
			return params.includeRelations.includes(rel.name);
		}
		return true;
	});

	if (DEBUG_MODE)
		console.log(
			"✅ Relations to include:",
			relationsToInclude.map((r) => r.name),
		);

	for (const relation of relationsToInclude) {
		if (relation.useDrizzleRelation) {
			// Skip relations with childRelations - they should be loaded manually
			if (relation.childRelations && relation.childRelations.length > 0) {
				if (DEBUG_MODE) {
					console.log(
						`⚠️ Skipping ${relation.name} from Drizzle (has childRelations, will load manually)`,
					);
				}
				continue;
			}

			// If explicit with clause is provided, use it
			if (relation.with) {
				withClause[relation.name] = relation.with;
			} else {
				// Otherwise just load the relation without nested relations
				withClause[relation.name] = true;
			}
		}
	}

	const finalWithClause =
		Object.keys(withClause).length > 0 ? withClause : undefined;
	if (DEBUG_MODE) console.log("🎯 Final withClause:", finalWithClause);

	return finalWithClause;
}
