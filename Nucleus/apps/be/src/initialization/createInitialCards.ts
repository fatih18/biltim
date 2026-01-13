import type {
  CardRarity,
  CardType,
  Category,
  Faction,
  Species,
} from '@monorepo/db-entities/schemas/default/card'
import { GenericAction } from '@monorepo/generics'

type CardData = {
  title: string
  subtitle: string
  flavor_text: string
  faction: Faction
  category: Category
  species: Species
  type: CardType
  tags: string[]
  cost: number
  faction_cost: number
  power: number | null
  health: number | null
  grace: number | null
  soul: number | null
  rarity: CardRarity
  set_code: string
  set_name: string
  card_number: number
  is_unique: boolean
}

/**
 * Initial 10 cards from each faction based on Supernatural TV Show
 * Data sourced from: https://supernatural.fandom.com/wiki/Supernatural_Wiki
 */
const INITIAL_CARDS: CardData[] = [
  // ==================== HUMAN FACTION ====================
  {
    title: 'Sam Winchester',
    subtitle: 'Hunter - The Boy King',
    flavor_text: 'Saving people, hunting things, the family business.',
    faction: 'human',
    category: 'hunter',
    species: 'human',
    type: 'character',
    tags: ['vessel', 'demon_blood', 'men_of_letters', 'psychic'],
    cost: 5,
    faction_cost: 2,
    power: 4,
    health: 5,
    grace: null,
    soul: 4,
    rarity: 'legendary',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 1,
    is_unique: true,
  },
  {
    title: 'Dean Winchester',
    subtitle: 'Hunter - The Righteous Man',
    flavor_text: 'Driver picks the music, shotgun shuts his cakehole.',
    faction: 'human',
    category: 'hunter',
    species: 'human',
    type: 'character',
    tags: ['vessel', 'mark_of_cain', 'men_of_letters'],
    cost: 5,
    faction_cost: 2,
    power: 5,
    health: 4,
    grace: null,
    soul: 3,
    rarity: 'legendary',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 2,
    is_unique: true,
  },
  {
    title: 'Bobby Singer',
    subtitle: 'Hunter - Salvage Yard Owner',
    flavor_text: "Balls! Family don't end with blood, boy.",
    faction: 'human',
    category: 'hunter',
    species: 'human',
    type: 'character',
    tags: ['mentor', 'lore_master'],
    cost: 4,
    faction_cost: 1,
    power: 3,
    health: 4,
    grace: null,
    soul: 3,
    rarity: 'epic',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 3,
    is_unique: true,
  },

  // ==================== ANGEL FACTION ====================
  {
    title: 'Castiel',
    subtitle: 'Seraph - Angel of Thursday',
    flavor_text: "I'm the one who gripped you tight and raised you from perdition.",
    faction: 'angel',
    category: 'seraph',
    species: 'angel',
    type: 'character',
    tags: ['fallen', 'vessel_jimmy', 'warrior'],
    cost: 6,
    faction_cost: 3,
    power: 5,
    health: 5,
    grace: 5,
    soul: null,
    rarity: 'legendary',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 4,
    is_unique: true,
  },
  {
    title: 'Michael',
    subtitle: 'Archangel - The Viceroy of Heaven',
    flavor_text: "I'm a good son. I have always been a good son.",
    faction: 'angel',
    category: 'archangel',
    species: 'angel',
    type: 'character',
    tags: ['vessel_dean', 'vessel_adam', 'commander'],
    cost: 9,
    faction_cost: 5,
    power: 8,
    health: 8,
    grace: 10,
    soul: null,
    rarity: 'legendary',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 5,
    is_unique: true,
  },
  {
    title: 'Gabriel',
    subtitle: 'Archangel - The Trickster',
    flavor_text:
      "Lucifer, you're my brother. And I love you. But you are a great big bag of dicks.",
    faction: 'angel',
    category: 'archangel',
    species: 'angel',
    type: 'character',
    tags: ['trickster', 'witness_protection'],
    cost: 7,
    faction_cost: 4,
    power: 6,
    health: 6,
    grace: 8,
    soul: null,
    rarity: 'epic',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 6,
    is_unique: true,
  },

  // ==================== DEMON FACTION ====================
  {
    title: 'Crowley',
    subtitle: 'King of Hell - Crossroad Demon',
    flavor_text: "I'm Crowley. I run Hell.",
    faction: 'demon',
    category: 'crossroad',
    species: 'demon',
    type: 'character',
    tags: ['king_of_hell', 'deal_maker', 'red_eyed'],
    cost: 6,
    faction_cost: 3,
    power: 4,
    health: 5,
    grace: null,
    soul: null,
    rarity: 'legendary',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 7,
    is_unique: true,
  },
  {
    title: 'Azazel',
    subtitle: 'Prince of Hell - Yellow Eyes',
    flavor_text: "I've got demon blood in me. You saw what I can do.",
    faction: 'demon',
    category: 'prince_of_hell',
    species: 'demon',
    type: 'character',
    tags: ['yellow_eyed', 'general', 'special_children'],
    cost: 8,
    faction_cost: 4,
    power: 7,
    health: 7,
    grace: null,
    soul: null,
    rarity: 'legendary',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 8,
    is_unique: true,
  },

  // ==================== PURGATORY FACTION ====================
  {
    title: 'Dick Roman',
    subtitle: 'Leviathan Leader',
    flavor_text: "We're going to cure the world of the disease of humanity.",
    faction: 'purgatory',
    category: 'leviathan',
    species: 'leviathan',
    type: 'character',
    tags: ['corporate', 'shapeshifter', 'leader'],
    cost: 7,
    faction_cost: 3,
    power: 6,
    health: 7,
    grace: null,
    soul: null,
    rarity: 'epic',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 9,
    is_unique: true,
  },
  {
    title: 'Eve',
    subtitle: 'Mother of All Monsters',
    flavor_text: "I was here long before you. And I'll be here long after.",
    faction: 'purgatory',
    category: 'monster',
    species: 'deity',
    type: 'character',
    tags: ['mother', 'purgatory_native', 'creator'],
    cost: 8,
    faction_cost: 4,
    power: 7,
    health: 8,
    grace: null,
    soul: null,
    rarity: 'legendary',
    set_code: 'S01',
    set_name: 'Supernatural: Core Set',
    card_number: 10,
    is_unique: true,
  },
]

/**
 * Creates initial cards for the Supernatural card game if they don't exist.
 * Checks by title + set_code combination to avoid duplicates.
 */
export async function createInitialCards() {
  console.log('🃏 Starting initial cards creation...')

  let createdCount = 0
  let existingCount = 0

  for (const card of INITIAL_CARDS) {
    try {
      // Check if card already exists by title
      const existingCards = await GenericAction({
        ip_address: '127.0.0.1',
        user_agent: 'system',
        schema_name: 'main',
        table_name: 'T_Cards',
        action_type: 'GET',
        filters: [
          { column: 'title', value: card.title },
          { column: 'set_code', value: card.set_code },
        ],
        limit: 1,
      })

      if (existingCards && existingCards.length > 0) {
        existingCount++
        continue
      }

      // Create the card
      await GenericAction({
        ip_address: '127.0.0.1',
        user_agent: 'system',
        schema_name: 'main',
        table_name: 'T_Cards',
        action_type: 'INSERT',
        data: card,
      })

      createdCount++
      console.log(`  ✅ Created: ${card.title} (${card.faction})`)
    } catch (error) {
      const err = error as { cause?: { code?: string }; message?: string }
      const code = err?.cause?.code

      // 23505 = unique constraint violation (card already exists)
      if (code === '23505') {
        existingCount++
        continue
      }

      console.error(`  ❌ Failed to create ${card.title}:`, {
        code,
        message: err?.message,
      })
    }
  }

  if (createdCount > 0) {
    console.log(`🃏 Created ${createdCount} new cards.`)
  }
  if (existingCount > 0) {
    console.log(`🃏 ${existingCount} cards already exist.`)
  }
  if (createdCount === 0 && existingCount === INITIAL_CARDS.length) {
    console.log('✅ All initial cards already exist.')
  }
}
