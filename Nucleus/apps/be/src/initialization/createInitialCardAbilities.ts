import type {
  AbilityType,
  CostType,
  DurationType,
  EffectType,
  KeywordAbility,
  TargetType,
  TriggerCondition,
} from '@monorepo/db-entities/schemas/default/card_ability'
import { GenericAction } from '@monorepo/generics'

type CardAbilityData = {
  cardTitle: string // Kartı bulmak için
  name: string
  description: string
  ability_type: AbilityType
  keyword?: KeywordAbility
  trigger_condition?: TriggerCondition
  cost_type?: CostType
  cost_value?: number
  requires_tap?: boolean
  effect_type?: EffectType
  effect_value?: number
  target_type?: TargetType
  duration?: DurationType
  sort_order: number
  is_mandatory?: boolean
}

/**
 * Initial card abilities based on Supernatural characters
 * Each card gets 1-3 abilities matching their lore
 */
const INITIAL_ABILITIES: CardAbilityData[] = [
  // ==================== SAM WINCHESTER ====================
  {
    cardTitle: 'Sam Winchester',
    name: 'Demon Blood Power',
    description: "Sam'in şeytan kanı sayesinde telekinezi ve exorcism yapabilir.",
    ability_type: 'activated',
    cost_type: 'soul',
    cost_value: 2,
    effect_type: 'exorcise',
    effect_value: 1,
    target_type: 'target_creature',
    sort_order: 1,
  },
  {
    cardTitle: 'Sam Winchester',
    name: 'Research Expert',
    description: 'Sam her tur başında 1 kart çekebilir.',
    ability_type: 'triggered',
    trigger_condition: 'on_turn_start',
    effect_type: 'draw',
    effect_value: 1,
    target_type: 'self',
    sort_order: 2,
  },

  // ==================== DEAN WINCHESTER ====================
  {
    cardTitle: 'Dean Winchester',
    name: 'Hunter Training',
    description: 'Dean monster türlerine +2 hasar verir.',
    ability_type: 'keyword',
    keyword: 'hunter_trained',
    sort_order: 1,
  },
  {
    cardTitle: 'Dean Winchester',
    name: 'Mark of Cain',
    description: 'Dean öldüğünde 1 kez diriltilir.',
    ability_type: 'keyword',
    keyword: 'resurrection',
    sort_order: 2,
  },
  {
    cardTitle: 'Dean Winchester',
    name: 'Righteous Fury',
    description: "Dean saldırdığında hedef Demon'a +2 ekstra hasar verir.",
    ability_type: 'triggered',
    trigger_condition: 'on_attack',
    effect_type: 'damage',
    effect_value: 2,
    target_type: 'target_creature',
    sort_order: 3,
  },

  // ==================== BOBBY SINGER ====================
  {
    cardTitle: 'Bobby Singer',
    name: 'Lore Master',
    description: "Bobby sahaya girdiğinde desteye bak, 1 Spell veya Artifact'ı ele al.",
    ability_type: 'triggered',
    trigger_condition: 'on_summon',
    effect_type: 'draw',
    effect_value: 1,
    target_type: 'self',
    sort_order: 1,
  },
  {
    cardTitle: 'Bobby Singer',
    name: 'Idjits!',
    description: 'Bobby exhaust olarak dost karaktere +1/+1 verir.',
    ability_type: 'activated',
    cost_type: 'exhaust',
    effect_type: 'buff_power',
    effect_value: 1,
    target_type: 'all_friendly_creatures',
    sort_order: 2,
  },

  // ==================== CASTIEL ====================
  {
    cardTitle: 'Castiel',
    name: 'Angel Grace',
    description: "Castiel'in melek gücü: Demon'lara +2 hasar.",
    ability_type: 'keyword',
    keyword: 'angelic',
    sort_order: 1,
  },
  {
    cardTitle: 'Castiel',
    name: 'Smite',
    description: '3 Grace harcayarak hedef Demon veya Monster yok edilir.',
    ability_type: 'activated',
    cost_type: 'grace',
    cost_value: 3,
    effect_type: 'smite',
    effect_value: 999,
    target_type: 'target_creature',
    sort_order: 2,
  },
  {
    cardTitle: 'Castiel',
    name: 'Teleport',
    description: 'Castiel saldırıları atlayabilir.',
    ability_type: 'keyword',
    keyword: 'teleport',
    sort_order: 3,
  },

  // ==================== MICHAEL ====================
  {
    cardTitle: 'Michael',
    name: 'Archangel Smite',
    description: 'Michael sahaya girdiğinde tüm Demon kartlarına 3 hasar verir.',
    ability_type: 'triggered',
    trigger_condition: 'on_summon',
    effect_type: 'smite',
    effect_value: 3,
    target_type: 'all_enemy_creatures',
    sort_order: 1,
  },
  {
    cardTitle: 'Michael',
    name: 'Immortal',
    description: 'Michael yok edilemez (ama banish edilebilir).',
    ability_type: 'keyword',
    keyword: 'immortal',
    sort_order: 2,
  },
  {
    cardTitle: 'Michael',
    name: 'Heavenly Command',
    description: 'Diğer Angel kartları +1/+1 alır.',
    ability_type: 'static',
    effect_type: 'buff_power',
    effect_value: 1,
    target_type: 'all_friendly_creatures',
    sort_order: 3,
  },

  // ==================== GABRIEL ====================
  {
    cardTitle: 'Gabriel',
    name: 'Trickster',
    description: 'Gabriel her tur hedef karakterin güç ve canını değiştirir.',
    ability_type: 'activated',
    cost_type: 'grace',
    cost_value: 2,
    effect_type: 'debuff_power',
    effect_value: 2,
    target_type: 'target_creature',
    sort_order: 1,
  },
  {
    cardTitle: 'Gabriel',
    name: 'Hidden Identity',
    description: 'Gabriel hedef alınamaz.',
    ability_type: 'keyword',
    keyword: 'hidden',
    sort_order: 2,
  },

  // ==================== CROWLEY ====================
  {
    cardTitle: 'Crowley',
    name: 'Deal Maker',
    description: 'Crowley sahaya girdiğinde rakip 1 kart atar, sen 2 kart çekersin.',
    ability_type: 'triggered',
    trigger_condition: 'on_summon',
    effect_type: 'draw',
    effect_value: 2,
    target_type: 'self',
    sort_order: 1,
  },
  {
    cardTitle: 'Crowley',
    name: 'King of Hell',
    description: 'Diğer Demon kartları +1 güç alır.',
    ability_type: 'static',
    effect_type: 'buff_power',
    effect_value: 1,
    target_type: 'all_friendly_creatures',
    sort_order: 2,
  },
  {
    cardTitle: 'Crowley',
    name: 'Teleport',
    description: 'Crowley saldırıları atlayabilir.',
    ability_type: 'keyword',
    keyword: 'teleport',
    sort_order: 3,
  },

  // ==================== AZAZEL ====================
  {
    cardTitle: 'Azazel',
    name: 'Yellow Eyes',
    description: 'Azazel saldırdığında hedef karakter öldürülürse 2 Soul kazanırsın.',
    ability_type: 'triggered',
    trigger_condition: 'on_attack',
    effect_type: 'gain_soul',
    effect_value: 2,
    target_type: 'self',
    sort_order: 1,
  },
  {
    cardTitle: 'Azazel',
    name: 'Special Children',
    description: 'Sahada Human karakter olduğunda Azazel +2/+2 alır.',
    ability_type: 'static',
    effect_type: 'buff_power',
    effect_value: 2,
    target_type: 'self',
    sort_order: 2,
  },
  {
    cardTitle: 'Azazel',
    name: 'Demonic',
    description: "Angel'lara +2 hasar verir.",
    ability_type: 'keyword',
    keyword: 'demonic',
    sort_order: 3,
  },

  // ==================== DICK ROMAN ====================
  {
    cardTitle: 'Dick Roman',
    name: 'Corporate Takeover',
    description: 'Dick Roman sahaya girdiğinde rakibin en düşük maliyetli karakterini ele geçir.',
    ability_type: 'triggered',
    trigger_condition: 'on_summon',
    effect_type: 'possess',
    effect_value: 1,
    target_type: 'target_creature',
    sort_order: 1,
  },
  {
    cardTitle: 'Dick Roman',
    name: 'Leviathan Resilience',
    description: 'Dick Roman tüm hasarı 1 azaltır.',
    ability_type: 'keyword',
    keyword: 'leviathan_blood',
    sort_order: 2,
  },
  {
    cardTitle: 'Dick Roman',
    name: 'Consume',
    description: 'Öldürdüğü karakterlerden +1/+1 kalıcı bonus alır.',
    ability_type: 'triggered',
    trigger_condition: 'on_enemy_death',
    effect_type: 'buff_power',
    effect_value: 1,
    target_type: 'self',
    duration: 'permanent',
    sort_order: 3,
  },

  // ==================== EVE ====================
  {
    cardTitle: 'Eve',
    name: 'Mother of All',
    description: 'Eve her tur sonunda 1/1 Monster token oluşturur.',
    ability_type: 'triggered',
    trigger_condition: 'on_turn_end',
    effect_type: 'summon',
    effect_value: 1,
    target_type: 'self',
    sort_order: 1,
  },
  {
    cardTitle: 'Eve',
    name: 'Touch of Eve',
    description: "Eve'e dokunan tüm karakterler Monster'a dönüşür.",
    ability_type: 'triggered',
    trigger_condition: 'on_damage_taken',
    effect_type: 'possess',
    effect_value: 1,
    target_type: 'random_enemy',
    sort_order: 2,
  },
  {
    cardTitle: 'Eve',
    name: 'Immortal',
    description: 'Eve yok edilemez (ama banish edilebilir).',
    ability_type: 'keyword',
    keyword: 'immortal',
    sort_order: 3,
  },
]

/**
 * Creates initial card abilities for the Supernatural card game.
 * First finds the card by title, then creates abilities for it.
 */
export async function createInitialCardAbilities() {
  console.log('🎯 Starting initial card abilities creation...')

  let createdCount = 0
  let skippedCount = 0
  let errorCount = 0

  // Group abilities by card title
  const abilitiesByCard: Record<string, CardAbilityData[]> = {}
  for (const ability of INITIAL_ABILITIES) {
    const key = ability.cardTitle
    const list = abilitiesByCard[key] ?? []
    list.push(ability)
    abilitiesByCard[key] = list
  }

  for (const [cardTitle, abilities] of Object.entries(abilitiesByCard)) {
    try {
      // Find the card by title
      const cards = await GenericAction({
        ip_address: '127.0.0.1',
        user_agent: 'system',
        schema_name: 'main',
        table_name: 'T_Cards',
        action_type: 'GET',
        filters: [{ column: 'title', value: cardTitle }],
        limit: 1,
      })

      if (!cards || cards.length === 0) {
        console.log(`  ⚠️ Card not found: ${cardTitle}`)
        skippedCount += abilities.length
        continue
      }

      const card = cards[0]
      if (!card) {
        console.log(`  ⚠️ Card data missing: ${cardTitle}`)
        skippedCount += abilities.length
        continue
      }

      for (const ability of abilities) {
        try {
          // Check if ability already exists
          const existingAbilities = await GenericAction({
            ip_address: '127.0.0.1',
            user_agent: 'system',
            schema_name: 'main',
            table_name: 'T_CardAbilities',
            action_type: 'GET',
            filters: [
              { column: 'card_id', value: card.id },
              { column: 'name', value: ability.name },
            ],
            limit: 1,
          })

          if (existingAbilities?.length && existingAbilities.length > 0) {
            skippedCount++
            continue
          }

          // Create the ability
          const { cardTitle: _, ...abilityData } = ability
          await GenericAction({
            ip_address: '127.0.0.1',
            user_agent: 'system',
            schema_name: 'main',
            table_name: 'T_CardAbilities',
            action_type: 'INSERT',
            data: {
              ...abilityData,
              card_id: card.id,
            },
          })

          createdCount++
        } catch (error) {
          const err = error as { cause?: { code?: string }; message?: string }
          if (err?.cause?.code === '23505') {
            skippedCount++
          } else {
            errorCount++
            console.log(`  ❌ Failed to create ability ${ability.name}: ${err?.message}`)
          }
        }
      }
    } catch (error) {
      const err = error as { message?: string }
      console.log(`  ❌ Error processing ${cardTitle}: ${err?.message}`)
      errorCount += abilities.length
    }
  }

  console.log(`🎯 Card abilities creation complete:`)
  console.log(`   - Created: ${createdCount}`)
  console.log(`   - Already exists: ${skippedCount}`)
  if (errorCount > 0) {
    console.log(`   - Errors: ${errorCount}`)
  }
}
