'use client'

import type {
  CardJSON,
  CardRarity,
  CardType,
  Category,
  Create as CreateCardPayload,
  Faction,
  ListReturn,
  Species,
} from '@monorepo/db-entities/schemas/default/card'
import type {
  CardAbilityJSON,
  AbilityType,
  CostType,
  EffectType,
  KeywordAbility,
  TargetType,
  Create as CreateAbilityPayload,
} from '@monorepo/db-entities/schemas/default/card_ability'
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit,
  Eye,
  Filter,
  Ghost,
  Heart,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

// ==================== CONSTANTS ====================
const FACTIONS: { value: Faction; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'human', label: 'İnsan', icon: <Users size={16} />, color: 'bg-amber-500' },
  { value: 'angel', label: 'Melek', icon: <Sparkles size={16} />, color: 'bg-sky-500' },
  { value: 'demon', label: 'Şeytan', icon: <Skull size={16} />, color: 'bg-red-500' },
  { value: 'purgatory', label: 'Araf', icon: <Ghost size={16} />, color: 'bg-purple-500' },
  { value: 'neutral', label: 'Nötr', icon: <Zap size={16} />, color: 'bg-gray-500' },
]

const RARITIES: { value: CardRarity; label: string; color: string }[] = [
  { value: 'common', label: 'Sıradan', color: 'bg-gray-400' },
  { value: 'uncommon', label: 'Nadir', color: 'bg-green-500' },
  { value: 'rare', label: 'Çok Nadir', color: 'bg-blue-500' },
  { value: 'epic', label: 'Epik', color: 'bg-purple-500' },
  { value: 'legendary', label: 'Efsane', color: 'bg-amber-500' },
]

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'character', label: 'Karakter' },
  { value: 'spell', label: 'Büyü' },
  { value: 'artifact', label: 'Eser' },
  { value: 'location', label: 'Mekan' },
  { value: 'event', label: 'Olay' },
  { value: 'trap', label: 'Tuzak' },
]

// ==================== ABILITY CONSTANTS ====================
const ABILITY_TYPES: { value: AbilityType; label: string }[] = [
  { value: 'triggered', label: 'Tetiklemeli' },
  { value: 'activated', label: 'Aktif' },
  { value: 'static', label: 'Statik' },
  { value: 'keyword', label: 'Anahtar Kelime' },
]

const TRIGGER_CONDITIONS: { value: string; label: string }[] = [
  { value: 'on_summon', label: 'Sahaya çağrıldığında' },
  { value: 'on_death', label: 'Öldüğünde' },
  { value: 'on_attack', label: 'Saldırdığında' },
  { value: 'on_defend', label: 'Savunmada' },
  { value: 'on_damage_dealt', label: 'Hasar verdiğinde' },
  { value: 'on_damage_taken', label: 'Hasar aldığında' },
  { value: 'on_turn_start', label: 'Tur başında' },
  { value: 'on_turn_end', label: 'Tur sonunda' },
  { value: 'on_spell_cast', label: 'Büyü yapıldığında' },
  { value: 'on_ally_death', label: 'Dost öldüğünde' },
  { value: 'on_enemy_death', label: 'Düşman öldüğünde' },
]

const COST_TYPES: { value: CostType; label: string }[] = [
  { value: 'none', label: 'Yok' },
  { value: 'grace', label: 'Grace' },
  { value: 'soul', label: 'Soul' },
  { value: 'essence', label: 'Essence' },
  { value: 'exhaust', label: 'Exhaust' },
  { value: 'sacrifice', label: 'Feda' },
  { value: 'discard', label: 'Kart At' },
  { value: 'health', label: 'Can' },
]

const EFFECT_TYPES: { value: EffectType; label: string }[] = [
  { value: 'damage', label: 'Hasar' },
  { value: 'smite', label: 'Kutsal Hasar' },
  { value: 'hellfire', label: 'Cehennem Ateşi' },
  { value: 'heal', label: 'İyileştir' },
  { value: 'draw', label: 'Kart Çek' },
  { value: 'discard', label: 'Kart Attır' },
  { value: 'buff_power', label: 'Güç Artır' },
  { value: 'buff_health', label: 'Can Artır' },
  { value: 'debuff_power', label: 'Güç Azalt' },
  { value: 'debuff_health', label: 'Can Azalt' },
  { value: 'destroy', label: 'Yok Et' },
  { value: 'banish', label: 'Sürgün' },
  { value: 'exorcise', label: 'Exorcism' },
  { value: 'resurrect', label: 'Dirilt' },
  { value: 'summon', label: 'Token Çağır' },
  { value: 'possess', label: 'Ele Geçir' },
  { value: 'gain_grace', label: 'Grace Kazan' },
  { value: 'gain_soul', label: 'Soul Kazan' },
]

const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: 'self', label: 'Kendisi' },
  { value: 'owner', label: 'Sahibi' },
  { value: 'opponent', label: 'Rakip' },
  { value: 'target_creature', label: 'Hedef Karakter' },
  { value: 'target_any', label: 'Herhangi Hedef' },
  { value: 'all_creatures', label: 'Tüm Karakterler' },
  { value: 'all_enemy_creatures', label: 'Tüm Düşmanlar' },
  { value: 'all_friendly_creatures', label: 'Tüm Dostlar' },
  { value: 'random_enemy', label: 'Rastgele Düşman' },
]

const KEYWORD_ABILITIES: { value: KeywordAbility; label: string }[] = [
  { value: 'swift', label: 'Hızlı' },
  { value: 'vigilant', label: 'Dikkatli' },
  { value: 'immortal', label: 'Ölümsüz' },
  { value: 'hidden', label: 'Gizli' },
  { value: 'guardian', label: 'Koruyucu' },
  { value: 'angelic', label: 'Melek' },
  { value: 'demonic', label: 'Şeytani' },
  { value: 'hunter_trained', label: 'Avcı Eğitimli' },
  { value: 'leviathan_blood', label: 'Leviathan Kanı' },
  { value: 'vessel', label: 'Kap' },
  { value: 'teleport', label: 'Işınlanma' },
  { value: 'regenerate', label: 'Yenilenme' },
  { value: 'soul_eater', label: 'Ruh Yiyici' },
  { value: 'resurrection', label: 'Diriliş' },
]

const CATEGORIES: Record<Faction, { value: Category; label: string }[]> = {
  human: [
    { value: 'hunter', label: 'Avcı' },
    { value: 'men_of_letters', label: 'Mektup Adamları' },
    { value: 'prophet', label: 'Peygamber' },
    { value: 'psychic', label: 'Medyum' },
    { value: 'vessel', label: 'Kap' },
  ],
  angel: [
    { value: 'archangel', label: 'Baş Melek' },
    { value: 'seraph', label: 'Serafim' },
    { value: 'guardian', label: 'Koruyucu' },
    { value: 'fallen', label: 'Düşmüş' },
    { value: 'cupid', label: 'Aşk Meleği' },
  ],
  demon: [
    { value: 'prince_of_hell', label: 'Cehennem Prensi' },
    { value: 'knight_of_hell', label: 'Cehennem Şövalyesi' },
    { value: 'crossroad', label: 'Yol Kavşağı' },
    { value: 'black_eyed', label: 'Siyah Göz' },
    { value: 'white_eyed', label: 'Beyaz Göz' },
  ],
  purgatory: [
    { value: 'leviathan', label: 'Leviathan' },
    { value: 'monster', label: 'Canavar' },
    { value: 'ghost', label: 'Hayalet' },
    { value: 'reaper', label: 'Azrail' },
    { value: 'pagan', label: 'Pagan' },
  ],
  neutral: [],
}

// ==================== TYPES ====================
interface CardFilters {
  faction?: Faction
  category?: Category
  type?: CardType
  rarity?: CardRarity
  is_unique?: boolean
}

interface CardFormData {
  title: string
  subtitle: string
  flavor_text: string
  faction: Faction
  category: Category
  species: Species
  type: CardType
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
  tags: string[]
}

const defaultFormData: CardFormData = {
  title: '',
  subtitle: '',
  flavor_text: '',
  faction: 'human',
  category: 'hunter',
  species: 'human',
  type: 'character',
  cost: 1,
  faction_cost: 0,
  power: 1,
  health: 1,
  grace: null,
  soul: 1,
  rarity: 'common',
  set_code: 'S01',
  set_name: 'Supernatural: Core Set',
  card_number: 1,
  is_unique: false,
  tags: [],
}

// ==================== ABILITY FORM TYPES ====================
interface AbilityFormData {
  name: string
  description: string
  ability_type: AbilityType
  keyword: KeywordAbility | null
  trigger_condition: string | null
  cost_type: CostType | null
  cost_value: number
  requires_tap: boolean
  effect_type: EffectType | null
  effect_value: number
  target_type: TargetType | null
  sort_order: number
  is_mandatory: boolean
}

const defaultAbilityFormData: AbilityFormData = {
  name: '',
  description: '',
  ability_type: 'triggered',
  keyword: null,
  trigger_condition: 'on_summon',
  cost_type: null,
  cost_value: 0,
  requires_tap: false,
  effect_type: 'damage',
  effect_value: 1,
  target_type: 'target_creature',
  sort_order: 0,
  is_mandatory: true,
}

// ==================== MAIN PAGE ====================
export default function ProxyMakerPage() {
  const actions = useGenericApiActions()

  // State
  const [cards, setCards] = useState<ListReturn | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<CardFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [orderBy] = useState<string>('created_at')
  const [orderDirection] = useState<'asc' | 'desc'>('desc')

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardJSON | null>(null)
  const [formData, setFormData] = useState<CardFormData>(defaultFormData)

  // Fetch cards
  const fetchCards = useCallback(() => {
    const payload = {
      page,
      limit,
      search: search.length > 0 ? search : undefined,
      orderBy,
      orderDirection,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    }

    actions.GET_CARDS?.start({
      payload,
      onAfterHandle: (data) => {
        if (data) setCards(data)
      },
      onErrorHandle: (error) => {
        console.error('Failed to fetch cards:', error)
      },
    })
  }, [page, limit, search, orderBy, orderDirection, filters])

  useEffect(() => {
    fetchCards()
  }, [page, limit, search, orderBy, orderDirection, filters])

  // Handlers
  const handleCreate = () => {
    const payload: Partial<CreateCardPayload> = {
      ...formData,
      tags: formData.tags,
    }

    actions.ADD_CARD?.start({
      payload,
      onAfterHandle: () => {
        setShowCreateModal(false)
        setFormData(defaultFormData)
        fetchCards()
      },
      onErrorHandle: (error) => {
        console.error('Failed to create card:', error)
      },
    })
  }

  const handleUpdate = () => {
    if (!selectedCard) return

    actions.UPDATE_CARD?.start({
      payload: { _id: selectedCard.id, ...formData },
      onAfterHandle: () => {
        setShowEditModal(false)
        setSelectedCard(null)
        setFormData(defaultFormData)
        fetchCards()
      },
      onErrorHandle: (error) => {
        console.error('Failed to update card:', error)
      },
    })
  }

  const handleDelete = () => {
    if (!selectedCard) return

    actions.DELETE_CARD?.start({
      payload: { _id: selectedCard.id },
      onAfterHandle: () => {
        setShowDeleteModal(false)
        setSelectedCard(null)
        fetchCards()
      },
      onErrorHandle: (error) => {
        console.error('Failed to delete card:', error)
      },
    })
  }

  const openEditModal = (card: CardJSON) => {
    setSelectedCard(card)
    setFormData({
      title: card.title,
      subtitle: card.subtitle || '',
      flavor_text: card.flavor_text || '',
      faction: card.faction as Faction,
      category: card.category as Category,
      species: card.species as Species,
      type: card.type as CardType,
      cost: card.cost,
      faction_cost: card.faction_cost || 0,
      power: card.power,
      health: card.health,
      grace: card.grace,
      soul: card.soul,
      rarity: card.rarity as CardRarity,
      set_code: card.set_code || 'S01',
      set_name: card.set_name || 'Supernatural: Core Set',
      card_number: card.card_number || 1,
      is_unique: card.is_unique || false,
      tags: (card.tags as string[]) || [],
    })
    setShowEditModal(true)
  }

  const getFactionInfo = (faction: string) => {
    return FACTIONS.find((f) => f.value === faction) ?? FACTIONS[0]
  }

  const getRarityInfo = (rarity: string) => {
    return RARITIES.find((r) => r.value === rarity) ?? RARITIES[0]
  }

  const isLoading = actions.GET_CARDS?.state?.isPending

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Crown className="text-amber-400" />
              Supernatural Kart Yönetimi
            </h1>
            <p className="text-gray-400 mt-1">Deste kartlarını yönet, düzenle ve oluştur</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fetchCards()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Yenile
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(defaultFormData)
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
            >
              <Plus size={18} />
              Yeni Kart
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Kart ara..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showFilters
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <Filter size={18} />
              Filtreler
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
              <div>
                <label htmlFor="filter-faction" className="block text-sm text-gray-400 mb-1">
                  Faction
                </label>
                <select
                  id="filter-faction"
                  value={filters.faction || ''}
                  onChange={(e) => {
                    const value = e.target.value as Faction | ''
                    setFilters((prev) => ({
                      ...prev,
                      faction: value || undefined,
                      category: undefined,
                    }))
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Tümü</option>
                  {FACTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-category" className="block text-sm text-gray-400 mb-1">
                  Kategori
                </label>
                <select
                  id="filter-category"
                  value={filters.category || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      category: (e.target.value as Category) || undefined,
                    }))
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  disabled={!filters.faction}
                >
                  <option value="">Tümü</option>
                  {filters.faction &&
                    CATEGORIES[filters.faction]?.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-type" className="block text-sm text-gray-400 mb-1">
                  Kart Türü
                </label>
                <select
                  id="filter-type"
                  value={filters.type || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      type: (e.target.value as CardType) || undefined,
                    }))
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Tümü</option>
                  {CARD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-rarity" className="block text-sm text-gray-400 mb-1">
                  Nadirlik
                </label>
                <select
                  id="filter-rarity"
                  value={filters.rarity || ''}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      rarity: (e.target.value as CardRarity) || undefined,
                    }))
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Tümü</option>
                  {RARITIES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Cards Grid */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="animate-spin text-amber-400" size={32} />
            </div>
          ) : cards?.data && cards.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {cards.data.map((card) => {
                const factionInfo = getFactionInfo(card.faction)
                const rarityInfo = getRarityInfo(card.rarity)
                if (!factionInfo || !rarityInfo) return null

                return (
                  <div
                    key={card.id}
                    className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl overflow-hidden border border-slate-600 hover:border-amber-500/50 transition group"
                  >
                    {/* Card Header */}
                    <div
                      className={`${factionInfo.color} px-4 py-2 flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-2 text-white">
                        {factionInfo.icon}
                        <span className="text-sm font-medium">{factionInfo.label}</span>
                      </div>
                      <span
                        className={`${rarityInfo.color} px-2 py-0.5 rounded text-xs text-white font-medium`}
                      >
                        {rarityInfo.label}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {card.title}
                          {card.is_unique && <Crown size={14} className="text-amber-400" />}
                        </h3>
                        <p className="text-sm text-gray-400">{card.subtitle}</p>
                      </div>

                      {/* Stats */}
                      {card.type === 'character' && (
                        <div className="flex gap-4 text-sm">
                          {card.power !== null && (
                            <div className="flex items-center gap-1 text-red-400">
                              <Sword size={14} />
                              <span>{card.power}</span>
                            </div>
                          )}
                          {card.health !== null && (
                            <div className="flex items-center gap-1 text-green-400">
                              <Heart size={14} />
                              <span>{card.health}</span>
                            </div>
                          )}
                          {card.grace !== null && (
                            <div className="flex items-center gap-1 text-sky-400">
                              <Sparkles size={14} />
                              <span>{card.grace}</span>
                            </div>
                          )}
                          {card.soul !== null && (
                            <div className="flex items-center gap-1 text-amber-400">
                              <Shield size={14} />
                              <span>{card.soul}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cost Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Maliyet: {card.cost}</span>
                        <span className="text-xs text-gray-500 capitalize">{card.type}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-slate-600 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCard(card)
                            setShowDetailModal(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-sm text-white transition"
                        >
                          <Eye size={14} />
                          Detay
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(card)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition"
                        >
                          <Edit size={14} />
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCard(card)
                            setShowDeleteModal(true)
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm text-white transition"
                        >
                          <Trash2 size={14} />
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <Ghost size={48} className="mx-auto mb-4 opacity-50" />
              <p>Henüz kart bulunamadı</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
              >
                İlk Kartı Oluştur
              </button>
            </div>
          )}

          {/* Pagination */}
          {cards && cards.pagination.total > 0 && (
            <div className="bg-slate-900/50 px-6 py-3 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {(page - 1) * limit + 1} - {Math.min(page * limit, cards.pagination.total)} /{' '}
                  {cards.pagination.total} kart
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!cards.pagination.hasPrev}
                  className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 text-sm text-white">
                  Sayfa {page} / {cards.pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!cards.pagination.hasNext}
                  className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <CardFormModal
          isOpen={showCreateModal || showEditModal}
          isEdit={showEditModal}
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedCard(null)
            setFormData(defaultFormData)
          }}
          onSubmit={showEditModal ? handleUpdate : handleCreate}
          isSubmitting={
            showEditModal
              ? Boolean(actions.UPDATE_CARD?.state?.isPending)
              : Boolean(actions.ADD_CARD?.state?.isPending)
          }
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedCard && (
        <DeleteModal
          card={selectedCard}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedCard(null)
          }}
          onConfirm={handleDelete}
          isDeleting={Boolean(actions.DELETE_CARD?.state?.isPending)}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCard && (
        <DetailModal
          card={selectedCard}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedCard(null)
          }}
        />
      )}
    </div>
  )
}

// ==================== CARD FORM MODAL ====================
function CardFormModal({
  isOpen,
  isEdit,
  formData,
  setFormData,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean
  isEdit: boolean
  formData: CardFormData
  setFormData: React.Dispatch<React.SetStateAction<CardFormData>>
  onClose: () => void
  onSubmit: () => void
  isSubmitting: boolean
}) {
  if (!isOpen) return null

  const availableCategories = CATEGORIES[formData.faction] || []

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Kartı Düzenle' : 'Yeni Kart Oluştur'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="form-title" className="block text-sm text-gray-400 mb-1">
                Kart Adı *
              </label>
              <input
                id="form-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Sam Winchester"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="form-subtitle" className="block text-sm text-gray-400 mb-1">
                Alt Başlık
              </label>
              <input
                id="form-subtitle"
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="Hunter - The Boy King"
              />
            </div>
          </div>

          {/* Classification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="form-faction" className="block text-sm text-gray-400 mb-1">
                Faction *
              </label>
              <select
                id="form-faction"
                value={formData.faction}
                onChange={(e) => {
                  const faction = e.target.value as Faction
                  const firstCategory = CATEGORIES[faction]?.[0]?.value || ('hunter' as Category)
                  setFormData((prev) => ({
                    ...prev,
                    faction,
                    category: firstCategory,
                  }))
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                {FACTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-category" className="block text-sm text-gray-400 mb-1">
                Kategori *
              </label>
              <select
                id="form-category"
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value as Category }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                {availableCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-type" className="block text-sm text-gray-400 mb-1">
                Kart Türü *
              </label>
              <select
                id="form-type"
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value as CardType }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                {CARD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-rarity" className="block text-sm text-gray-400 mb-1">
                Nadirlik *
              </label>
              <select
                id="form-rarity"
                value={formData.rarity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rarity: e.target.value as CardRarity }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                {RARITIES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label htmlFor="form-cost" className="block text-sm text-gray-400 mb-1">
                Maliyet
              </label>
              <input
                id="form-cost"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData((prev) => ({ ...prev, cost: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                min={0}
              />
            </div>
            <div>
              <label htmlFor="form-power" className="block text-sm text-gray-400 mb-1">
                Güç
              </label>
              <input
                id="form-power"
                type="number"
                value={formData.power || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    power: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                min={0}
              />
            </div>
            <div>
              <label htmlFor="form-health" className="block text-sm text-gray-400 mb-1">
                Can
              </label>
              <input
                id="form-health"
                type="number"
                value={formData.health || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    health: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                min={0}
              />
            </div>
            <div>
              <label htmlFor="form-grace-soul" className="block text-sm text-gray-400 mb-1">
                {formData.faction === 'angel' ? 'Grace' : 'Soul'}
              </label>
              <input
                id="form-grace-soul"
                type="number"
                value={formData.faction === 'angel' ? formData.grace || '' : formData.soul || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null
                  if (formData.faction === 'angel') {
                    setFormData((prev) => ({ ...prev, grace: value, soul: null }))
                  } else {
                    setFormData((prev) => ({ ...prev, soul: value, grace: null }))
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                min={0}
              />
            </div>
          </div>

          {/* Flavor Text */}
          <div>
            <label htmlFor="form-flavor" className="block text-sm text-gray-400 mb-1">
              Hikaye Metni
            </label>
            <textarea
              id="form-flavor"
              value={formData.flavor_text}
              onChange={(e) => setFormData((prev) => ({ ...prev, flavor_text: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-20 resize-none"
              placeholder="Saving people, hunting things, the family business."
            />
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_unique}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_unique: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span>Benzersiz Kart (Destede 1 adet)</span>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-800 px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !formData.title}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
          >
            {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
            {isEdit ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== DELETE MODAL ====================
function DeleteModal({
  card,
  onClose,
  onConfirm,
  isDeleting,
}: {
  card: CardJSON
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-500" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Kartı Sil</h3>
          <p className="text-gray-400">
            <span className="font-semibold text-white">{card.title}</span> kartını silmek
            istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
          >
            {isDeleting && <RefreshCw size={16} className="animate-spin" />}
            Sil
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== DETAIL MODAL ====================
function DetailModal({ card, onClose }: { card: CardJSON; onClose: () => void }) {
  const actions = useGenericApiActions()
  const [abilities, setAbilities] = useState<CardAbilityJSON[]>([])
  const [loadingAbilities, setLoadingAbilities] = useState(true)

  // Ability CRUD state
  const [showAbilityForm, setShowAbilityForm] = useState(false)
  const [editingAbility, setEditingAbility] = useState<CardAbilityJSON | null>(null)
  const [deletingAbility, setDeletingAbility] = useState<CardAbilityJSON | null>(null)
  const [abilityFormData, setAbilityFormData] = useState<AbilityFormData>(defaultAbilityFormData)

  const factionInfo = FACTIONS.find((f) => f.value === card.faction) ?? FACTIONS[0]
  const rarityInfo = RARITIES.find((r) => r.value === card.rarity) ?? RARITIES[0]

  const fetchAbilities = useCallback(() => {
    setLoadingAbilities(true)
    actions.GET_CARD_ABILITIES?.start({
      payload: {
        filters: { card_id: card.id },
        orderBy: 'sort_order',
        orderDirection: 'asc',
        limit: 50,
      },
      onAfterHandle: (data) => {
        if (data?.data) {
          setAbilities(data.data)
        }
        setLoadingAbilities(false)
      },
      onErrorHandle: () => {
        setLoadingAbilities(false)
      },
    })
  }, [card.id])

  useEffect(() => {
    fetchAbilities()
  }, [fetchAbilities])

  if (!factionInfo || !rarityInfo) return null

  const getAbilityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      triggered: '⚡ Tetiklemeli',
      activated: '🎯 Aktif',
      static: '🛡️ Statik',
      keyword: '🔑 Anahtar',
    }
    return labels[type] || type
  }

  const getAbilityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      triggered: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      activated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      static: 'bg-green-500/20 text-green-400 border-green-500/30',
      keyword: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    }
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const handleAddAbility = () => {
    setEditingAbility(null)
    setAbilityFormData({ ...defaultAbilityFormData, sort_order: abilities.length })
    setShowAbilityForm(true)
  }

  const handleEditAbility = (ability: CardAbilityJSON) => {
    setEditingAbility(ability)
    setAbilityFormData({
      name: ability.name,
      description: ability.description,
      ability_type: ability.ability_type as AbilityType,
      keyword: (ability.keyword as KeywordAbility) || null,
      trigger_condition: ability.trigger_condition || null,
      cost_type: (ability.cost_type as CostType) || null,
      cost_value: ability.cost_value ?? 0,
      requires_tap: ability.requires_tap ?? false,
      effect_type: (ability.effect_type as EffectType) || null,
      effect_value: ability.effect_value ?? 0,
      target_type: (ability.target_type as TargetType) || null,
      sort_order: ability.sort_order ?? 0,
      is_mandatory: ability.is_mandatory ?? true,
    })
    setShowAbilityForm(true)
  }

  const handleSaveAbility = () => {
    const payload: Partial<CreateAbilityPayload> = {
      card_id: card.id,
      name: abilityFormData.name,
      description: abilityFormData.description,
      ability_type: abilityFormData.ability_type,
      keyword: abilityFormData.keyword ?? undefined,
      trigger_condition: abilityFormData.trigger_condition ?? undefined,
      cost_type: abilityFormData.cost_type ?? undefined,
      cost_value: abilityFormData.cost_value,
      requires_tap: abilityFormData.requires_tap,
      effect_type: abilityFormData.effect_type ?? undefined,
      effect_value: abilityFormData.effect_value,
      target_type: abilityFormData.target_type ?? undefined,
      sort_order: abilityFormData.sort_order,
      is_mandatory: abilityFormData.is_mandatory,
    }

    if (editingAbility) {
      actions.UPDATE_CARD_ABILITY?.start({
        payload: { ...payload, _id: editingAbility.id },
        onAfterHandle: () => {
          setShowAbilityForm(false)
          setEditingAbility(null)
          fetchAbilities()
        },
      })
    } else {
      actions.ADD_CARD_ABILITY?.start({
        payload,
        onAfterHandle: () => {
          setShowAbilityForm(false)
          fetchAbilities()
        },
      })
    }
  }

  const handleDeleteAbility = () => {
    if (!deletingAbility) return
    actions.DELETE_CARD_ABILITY?.start({
      payload: { _id: deletingAbility.id },
      onAfterHandle: () => {
        setDeletingAbility(null)
        fetchAbilities()
      },
    })
  }

  const isSubmitting =
    actions.ADD_CARD_ABILITY?.state?.isPending || actions.UPDATE_CARD_ABILITY?.state?.isPending
  const isDeleting = actions.DELETE_CARD_ABILITY?.state?.isPending

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className={`${factionInfo.color} px-6 py-4 flex items-center justify-between shrink-0`}
        >
          <div className="flex items-center gap-3 text-white">
            {factionInfo.icon}
            <span className="font-medium">{factionInfo.label}</span>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {card.title}
                {card.is_unique && <Crown size={18} className="text-amber-400" />}
              </h2>
              <p className="text-gray-400">{card.subtitle}</p>
            </div>
            <span
              className={`${rarityInfo.color} px-3 py-1 rounded text-sm text-white font-medium`}
            >
              {rarityInfo.label}
            </span>
          </div>

          {/* Stats Grid */}
          {card.type === 'character' && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-700/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{card.cost}</div>
                <div className="text-xs text-gray-400">Maliyet</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{card.power ?? '-'}</div>
                <div className="text-xs text-gray-400">Güç</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{card.health ?? '-'}</div>
                <div className="text-xs text-gray-400">Can</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-sky-400">
                  {card.grace ?? card.soul ?? '-'}
                </div>
                <div className="text-xs text-gray-400">{card.grace ? 'Grace' : 'Soul'}</div>
              </div>
            </div>
          )}

          {/* Abilities Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap size={18} className="text-amber-400" />
                Yetenekler
              </h3>
              <button
                type="button"
                onClick={handleAddAbility}
                className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded transition"
              >
                <Plus size={14} />
                Yetenek Ekle
              </button>
            </div>
            {loadingAbilities ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="animate-spin text-gray-400" size={20} />
              </div>
            ) : abilities.length > 0 ? (
              <div className="space-y-2">
                {abilities.map((ability) => (
                  <div
                    key={ability.id}
                    className={`p-3 rounded-lg border ${getAbilityTypeColor(ability.ability_type)} group`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{ability.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{getAbilityTypeLabel(ability.ability_type)}</span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditAbility(ability)}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Düzenle"
                          >
                            <Edit size={14} className="text-gray-400 hover:text-white" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAbility(ability)}
                            className="p-1 hover:bg-red-500/20 rounded"
                            title="Sil"
                          >
                            <Trash2 size={14} className="text-gray-400 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">{ability.description}</p>
                    {ability.cost_type && ability.cost_value ? (
                      <div className="mt-2 text-xs text-gray-400">
                        Maliyet: {ability.cost_value} {ability.cost_type}
                      </div>
                    ) : null}
                    {ability.keyword && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded text-xs">
                          {KEYWORD_ABILITIES.find((k) => k.value === ability.keyword)?.label ||
                            ability.keyword}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-2">Bu kartın yeteneği yok.</p>
            )}
          </div>

          {/* Ability Form Modal */}
          {showAbilityForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
              <div className="bg-slate-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="sticky top-0 bg-slate-700 px-4 py-3 border-b border-slate-600 flex items-center justify-between">
                  <h4 className="font-semibold text-white">
                    {editingAbility ? 'Yeteneği Düzenle' : 'Yeni Yetenek'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAbilityForm(false)
                      setEditingAbility(null)
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label htmlFor="ability-name" className="block text-sm text-gray-400 mb-1">
                      Yetenek Adı *
                    </label>
                    <input
                      id="ability-name"
                      type="text"
                      value={abilityFormData.name}
                      onChange={(e) =>
                        setAbilityFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="ability-desc" className="block text-sm text-gray-400 mb-1">
                      Açıklama *
                    </label>
                    <textarea
                      id="ability-desc"
                      value={abilityFormData.description}
                      onChange={(e) =>
                        setAbilityFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm h-20 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ability-type" className="block text-sm text-gray-400 mb-1">
                        Yetenek Türü
                      </label>
                      <select
                        id="ability-type"
                        value={abilityFormData.ability_type}
                        onChange={(e) =>
                          setAbilityFormData((prev) => ({
                            ...prev,
                            ability_type: e.target.value as AbilityType,
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                      >
                        {ABILITY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {abilityFormData.ability_type === 'keyword' && (
                      <div>
                        <label
                          htmlFor="ability-keyword"
                          className="block text-sm text-gray-400 mb-1"
                        >
                          Anahtar Kelime
                        </label>
                        <select
                          id="ability-keyword"
                          value={abilityFormData.keyword || ''}
                          onChange={(e) =>
                            setAbilityFormData((prev) => ({
                              ...prev,
                              keyword: (e.target.value as KeywordAbility) || null,
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                        >
                          {KEYWORD_ABILITIES.map((k) => (
                            <option key={k.value} value={k.value}>
                              {k.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {abilityFormData.ability_type === 'triggered' && (
                      <div>
                        <label
                          htmlFor="ability-trigger"
                          className="block text-sm text-gray-400 mb-1"
                        >
                          Tetikleme Koşulu
                        </label>
                        <select
                          id="ability-trigger"
                          value={abilityFormData.trigger_condition || ''}
                          onChange={(e) =>
                            setAbilityFormData((prev) => ({
                              ...prev,
                              trigger_condition: e.target.value || null,
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                        >
                          {TRIGGER_CONDITIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {abilityFormData.ability_type === 'activated' && (
                      <>
                        <div>
                          <label
                            htmlFor="ability-cost-type"
                            className="block text-sm text-gray-400 mb-1"
                          >
                            Maliyet Türü
                          </label>
                          <select
                            id="ability-cost-type"
                            value={abilityFormData.cost_type || 'none'}
                            onChange={(e) =>
                              setAbilityFormData((prev) => ({
                                ...prev,
                                cost_type: (e.target.value as CostType) || null,
                              }))
                            }
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                          >
                            {COST_TYPES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="ability-cost-value"
                            className="block text-sm text-gray-400 mb-1"
                          >
                            Maliyet Miktarı
                          </label>
                          <input
                            id="ability-cost-value"
                            type="number"
                            value={abilityFormData.cost_value}
                            onChange={(e) =>
                              setAbilityFormData((prev) => ({
                                ...prev,
                                cost_value: Number(e.target.value),
                              }))
                            }
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                            min={0}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {abilityFormData.ability_type !== 'keyword' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="ability-effect"
                          className="block text-sm text-gray-400 mb-1"
                        >
                          Efekt
                        </label>
                        <select
                          id="ability-effect"
                          value={abilityFormData.effect_type || ''}
                          onChange={(e) =>
                            setAbilityFormData((prev) => ({
                              ...prev,
                              effect_type: (e.target.value as EffectType) || null,
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                        >
                          {EFFECT_TYPES.map((e) => (
                            <option key={e.value} value={e.value}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="ability-effect-value"
                          className="block text-sm text-gray-400 mb-1"
                        >
                          Değer
                        </label>
                        <input
                          id="ability-effect-value"
                          type="number"
                          value={abilityFormData.effect_value}
                          onChange={(e) =>
                            setAbilityFormData((prev) => ({
                              ...prev,
                              effect_value: Number(e.target.value),
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="ability-target"
                          className="block text-sm text-gray-400 mb-1"
                        >
                          Hedef
                        </label>
                        <select
                          id="ability-target"
                          value={abilityFormData.target_type || ''}
                          onChange={(e) =>
                            setAbilityFormData((prev) => ({
                              ...prev,
                              target_type: (e.target.value as TargetType) || null,
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                        >
                          {TARGET_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-slate-600 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAbilityForm(false)
                      setEditingAbility(null)
                    }}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAbility}
                    disabled={isSubmitting || !abilityFormData.name || !abilityFormData.description}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm rounded-lg transition flex items-center gap-1"
                  >
                    {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Ability Confirmation */}
          {deletingAbility && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
              <div className="bg-slate-700 rounded-xl w-full max-w-sm p-4">
                <h4 className="text-lg font-semibold text-white mb-2">Yeteneği Sil</h4>
                <p className="text-gray-400 text-sm mb-4">
                  <span className="font-medium text-white">{deletingAbility.name}</span> yeteneğini
                  silmek istediğinize emin misiniz?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingAbility(null)}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAbility}
                    disabled={isDeleting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition flex items-center gap-1"
                  >
                    {isDeleting && <RefreshCw size={14} className="animate-spin" />}
                    Sil
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Flavor Text */}
          {card.flavor_text && (
            <div className="p-4 bg-slate-700/30 rounded-lg border-l-4 border-amber-500">
              <p className="text-gray-300 italic">&ldquo;{card.flavor_text}&rdquo;</p>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Tür:</span>
              <span className="text-white ml-2 capitalize">{card.type}</span>
            </div>
            <div>
              <span className="text-gray-500">Kategori:</span>
              <span className="text-white ml-2 capitalize">{card.category.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-gray-500">Set:</span>
              <span className="text-white ml-2">{card.set_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Kart No:</span>
              <span className="text-white ml-2">#{card.card_number || 'N/A'}</span>
            </div>
          </div>

          {/* Tags */}
          {card.tags && (card.tags as string[]).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(card.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-slate-700 rounded text-xs text-gray-300 capitalize"
                >
                  {tag.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
