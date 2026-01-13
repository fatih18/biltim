# GenericSearch Config Referansı

Bu doküman yalnızca `HybridSearchConfig`, `HybridRelationConfig` ve `ChildRelationConfig` yapılarını anlatır. Amaç, yeni bir tabloda GenericSearch konfigürasyonu hazırlarken hangi alanın ne işe yaradığını hızlıca hatırlatmaktır.

> **Önemli**: Bu konfigürasyonlar **şema dosyalarında statik olarak tanımlanır** (`utilities/DbEntities/schemas/**/`). Frontend bu tanımları okur ve kullanır; runtime'da değiştirmez. Değişiklik gerekiyorsa şema dosyası güncellenir.

> **Konumlar**
>
> - Şema bazlı tablo konfigürasyonları: `utilities/DbEntities/schemas/**/` (örn. `bifrost/user.ts`) - **Buradan tanımlanır**
> - Türler ve kontratlar: `utilities/Generics/GenericSearch/types.ts`
> - Çalışma zamanındaki uygulama: `utilities/Generics/GenericSearch/index.ts`

---

## 1. HybridSearchConfig

Bir tablo için GenericSearch davranışını tanımlar. Başlıca alanlar:

| Alan | Tip | Açıklama |
| --- | --- | --- |
| `table_name` | `string` | Drizzle tablosunun `EntityName` karşılığı. |
| `fields` | `Record<string, FieldConfig>` | Arama ve filtreleme yapılabilecek kolonlar. |
| `relations?` | `HybridRelationConfig[]` | Bu tablodan yüklenecek ilişkiler. |
| `defaultOrderBy?` | `string` | Varsayılan sıralama kolonu. |
| `defaultOrderDirection?` | `"asc" \| "desc"` | Varsayılan sıralama yönü. |
| `maxLimit?` | `number` | Sayfa başına maksimum kayıt. |
| `useDrizzleQuery?` | `boolean` | `true` ise Drizzle `with` API’si denenir, olmazsa manuel sorguya düşer. |
| `fieldSelection?` | `FieldSelection` | Ana tablo için `select/exclude` kontrolü. |
| `customQueryBuilder?` | `(params: SearchParams) => object` | İleri seviye özel sorgu builder. Genelde kullanılmaz; Drizzle query API için custom davranış gerekiyorsa. |
| `customWhereBuilder?` | `(filters: FiltersRecord) => SQL[]` | Standart filtre mantığına ek where koşulları ekler. Özel iş mantığı için. |

### FieldConfig (fields kaydı için)

Şema dosyasında her alan: `key` (alan tanımlayıcı ad) → `FieldConfig`

> **Not**: `key` frontend tarafından filtre/sıralama parametresi olarak kullanılır; `column` ise veritabanı kolon adıdır.

| Alan | Tip | Açıklama |
| --- | --- | --- |
| `column` | `string` | Veritabanındaki kolon adı. |
| `type` | `"string" \| "number" \| "boolean" \| "date" \| "enum"` | Alanın veri tipi. Filtre ve sıralama davranışını belirler. |
| `searchable?` | `boolean` | Global aramada (`search` parametresi) bu alan kullanılır. |
| `filterable?` | `boolean` | Bu alan üzerinde filtre uygulanabilir (`filters` parametresi). |
| `sortable?` | `boolean` | Bu alan üzerinde sıralama yapılabilir (`orderBy` parametresi). |
| `operators?` | `FilterOperator[]` | Bu alan için izin verilen filtre operatörleri. Belirtilmezse tüm operatörler kullanılabilir: `"eq"`, `"ne"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`, `"like"`, `"ilike"`, `"in"`, `"isNull"`, `"isNotNull"`. |
| `transform?` | `(value) => value` | Frontend'den gelen değer SQL sorgusuna gitmeden önce dönüştürülür (backend'de). |
| `fromRelation?` | `string` | Dokümantasyon amaçlı. Bu alan doğrudan ana tablodan değil bir relation'ın alanı olarak okunuyorsa relation adı belirtilir. |

### FieldSelection

Hem ana tablo hem relation seviyesinde geçerlidir.

```ts
{
  select?: string[];  // Yalnızca bu kolonları dahil et
  exclude?: string[]; // Bu kolonları hariç tut (select’den sonra uygulanır)
}
```

### customQueryBuilder ve customWhereBuilder

Bu iki alan **ileri seviye** ve nadiren kullanılır:

- **`customQueryBuilder`**: Drizzle Query API kullanırken tam kontrole ihtiyaç duyulursa. Normal senaryolarda `fields`, `relations`, `where` yeterlidir.
- **`customWhereBuilder`**: Standart filtrelerle yapılamayan özel koşullar için. Örneğin, iki alanın toplamına göre filtreleme veya JSON içinde arama.

Örnek:
```ts
customWhereBuilder: (filters) => {
  const conditions: SQL[] = [];
  if (filters.custom_logic) {
    conditions.push(sql`(price * quantity) > 1000`);
  }
  return conditions;
}
```

### Yardımcı Tipler

#### FilterOperator

Filtre operatörlerinin tam listesi:

- `"eq"`: Eşittir
- `"ne"`: Eşit değildir
- `"gt"`: Büyüktür
- `"gte"`: Büyük eşittir
- `"lt"`: Küçüktür
- `"lte"`: Küçük eşittir
- `"like"`: SQL LIKE (case-sensitive)
- `"ilike"`: SQL ILIKE (case-insensitive)
- `"in"`: Değer listesinde var mı
- `"isNull"`: NULL mu
- `"isNotNull"`: NULL değil mi

#### EntityName

`EntityName`, Drizzle tablo adlarını belirten tip. Şema dosyalarındaki tablo export adları (`"T_BifrostUsers"`, `"T_BifrostProfiles"` vb.) bu tipe uymalıdır.

#### WithSelector

`WithSelector`, Drizzle native relation'lar için kullanılır:

```ts
type WithSelector = true | { [key: string]: WithSelector }
```

Örnekler:
- `with: true` → İlgili relation tamamı yüklenir.
- `with: { profile: true }` → Nested profile relation'ı yüklenir.
- `with: { profile: { addresses: true } }` → profile içinde addresses yüklenir.

---

## 2. HybridRelationConfig

Bir relation’ın nasıl yükleneceğini tanımlar. Bu yapı hem ana relations listesinde hem de child relation listelerinde kullanılır.

| Alan | Tip | Açıklama |
| --- | --- | --- |
| `name` | `string` | Dönen JSON’daki relation adı. |
| `useDrizzleRelation?` | `boolean` | Drizzle `with` tanımı varsa `true`. Manuel fallback için diğer alanlar da tanımlanabilir. |
| `with?` | `WithSelector` | `useDrizzleRelation` kullanılırken nested `with` yapısı. |
| `type?` | `"one-to-one" \| "one-to-many" \| "many-to-many" \| "belongs-to"` | Manuel loader’ın ilişki tipini bilmesi için zorunlu. |
| `targetTable?` | `EntityName` | İlişkinin hedef tablosu. |
| `through?` | `{ table: EntityName; localKey: string; targetKey: string; }` | `many-to-many` için köprü tablosu bilgisi. `localKey`: köprüde ana tabloyu, `targetKey`: hedef tabloyu gösteren kolon. |
| `foreignKey?` | `string` | `one-to-many` / `one-to-one` ilişkilerde hedef tablodaki FK kolon. |
| `localKey?` | `string` | `belongs-to` veya özel durumlarda ana tablodaki FK kolon. |
| `includeJunctionFields?` | `string[]` | Köprü tablosundan JSON’a taşınacak ekstra kolonlar. |
| `junctionFieldsKey?` | `string` | `includeJunctionFields` çıktısının JSON’da görüneceği key. Belirtilmezse `"relation"` kullanılır. |
| `where?` | `(table: DbEntityWithId) => SQL` | İlişkinin sorgusuna ek koşul. Drizzle manuel fark etmeksizin uygulanır. |
| `orderBy?` | `{ field: string; direction: "asc" \| "desc" }[]` | İlişkisel kayıtların sıralaması. |
| `limit?` | `number` | İlişkisel kayıt sayısı limiti. |
| `childRelations?` | `ChildRelationConfig[]` | Aynı şema ile tanımlanan nested ilişkiler. |
| `fieldSelection?` | `FieldSelection` | Relation seviyesinde include/exclude. |
| `excluded_schemas?` | `string[]` | Bu relation’ın yüklenmemesi gereken şema adları. |

### through Nedir?

`many-to-many` ilişkilerde ana tablo (örneğin `users`) ile hedef tablo (`projects`) arasında bir köprü (junction) tablo vardır (`user_projects`).

- `table`: Junction tablo adı (`"T_BifrostUserProjects"`)
- `localKey`: Junction tablosunda ana tabloyu gösteren kolon (`"user_id"`)
- `targetKey`: Junction tablosunda hedef tabloyu gösteren kolon (`"project_id"`)

Bu bilgiler sayesinde GenericSearch önce köprü kayıtlarını çeker, ardından hedef kayıtları bulur ve `includeJunctionFields` ile istenen junction kolonlarını sonuçlara ekler.

### Relation Type'larının Anlamı

Aşağıdaki dört tip manuel loader'ın hangi ilişkiyi kuracağını belirler:

- **`"one-to-one"`**: Ana tablodaki her kayıt hedef tabloda en fazla tek bir kayda sahiptir. Yükleme, hedef tablodaki `foreignKey` (ör. `user_id`) üzerinden yapılır.
- **`"one-to-many"`**: Ana kayıt birden çok hedef kayda sahiptir. Hedef tablodaki `foreignKey` her zaman ana kaydı işaret eder; sonuç JSON'u bir dizi içerir.
- **`"many-to-many"`**: Ana ve hedef tablolar arasında köprü tablo (`through`) bulunur. Önce köprü kayıtları, sonra hedef kayıtlar alınır; junction alanları `includeJunctionFields` ile JSON’a eklenir.
- **`"belongs-to"`**: Ana kayıt hedef tabloda bulunan üst kayda aittir. Ana tabloda `localKey` (örn. `author_id`) vardır ve hedef tablodaki `id` ile eşleşir. `one-to-one`'dan farkı ilişki yönüdür: *belongs-to* ana tablonun FK tuttuğu durumdur; `one-to-one` ise hedef tablonun FK tuttuğu (ya da ana tabloya geri işaret ettiği) senaryodur.

### foreignKey vs localKey Farkı

- **`foreignKey`**: Hedef tabloda bulunan ve ana kaydı işaret eden kolon. `one-to-one` ve `one-to-many` için kullanılır.
  - Örnek: `users` → `profiles` ilişkisinde `profiles.user_id` foreignKey'dir.
- **`localKey`**: Ana tabloda bulunan ve hedef kaydı işaret eden kolon. `belongs-to` için kullanılır.
  - Örnek: `posts` → `users` ilişkisinde `posts.author_id` localKey'dir.

### orderBy Çoklu Alan Desteği

`orderBy` array'i birden fazla sıralama kriteri içerebilir:

```ts
{
  name: "posts",
  type: "one-to-many",
  targetTable: "T_BifrostPosts",
  orderBy: [
    { field: "is_pinned", direction: "desc" },  // Önce pinlenmiş
    { field: "created_at", direction: "desc" }  // Sonra tarih
  ]
}
```

### where Fonksiyonu Nasıl Kullanılır?

`where` parametresi relation yüklenirken ek SQL koşulu eklemenizi sağlar. Fonksiyon `DbEntityWithId` (Drizzle tablo objesi) alır ve `SQL` döner.

Örnek:
```ts
import { eq, and, gt } from 'drizzle-orm'

{
  name: "active_posts",
  type: "one-to-many",
  targetTable: "T_BifrostPosts",
  foreignKey: "user_id",
  where: (table) => and(
    eq(table.is_published, true),
    gt(table.view_count, 100)
  )
}
```

Bu örnekte, sadece yayınlanmış VE 100'den fazla görüntülenme alan postlar yüklenir.

### limit Parametresi

Relation seviyesindeki `limit`, **her ana kayıt için** o kadar ilişkili kayıt yükler. Yani 10 kullanıcı ve `limit: 5` ise toplamda en fazla 50 post yüklenir (her kullanıcı için 5).

### excluded_schemas Nasıl Çalışır?

`HybridGenericSearch` relation listesini işlerken `filterRelationsBySchema()` üzerinden her relation ve alt relation için `excluded_schemas` değerini kontrol eder. `schema_name` bu listede ise relation hiç yüklenmez. Hem Drizzle `with` hem manuel loader için geçerlidir.

---

## 3. ChildRelationConfig

`ChildRelationConfig`, `HybridRelationConfig` ile aynı alan setini kullanır. Tek fark, üst relation’ın target kayıtları üzerinde tekrar relation yüklenmesidir. Örneğin:

```ts
{
  name: "profile",
  type: "one-to-one",
  targetTable: "T_BifrostProfiles",
  childRelations: [
    {
      name: "addresses",
      type: "many-to-many",
      targetTable: "T_BifrostAddresses",
      through: {
        table: "T_BifrostProfileAddresses",
        localKey: "profile_id",
        targetKey: "address_id",
      },
      includeJunctionFields: ["tag"],
      excluded_schemas: ["main"],
    },
  ],
}
```

Çocuk relation’lar, aynı `FieldSelection`, `where`, `orderBy`, `limit`, `excluded_schemas` seçeneklerine sahiptir.

---

## 4. SearchParams (Arama Parametreleri)

`HybridGenericSearch` fonksiyonuna verilen `params` nesnesi aşağıdaki alanları destekler.

> **Not**: Bu parametreler **frontend'den gelen runtime değerleridir**. Şema config'i statik; search params dinamik.

| Alan | Tip | Açıklama |
| --- | --- | --- |
| `page?` | `number` | Sayfa numarası (varsayılan: 1). |
| `limit?` | `number` | Sayfa başına kayıt sayısı (varsayılan: config.maxLimit veya 50). |
| `search?` | `string` | Global arama metni. `searchable: true` alanlarında ILIKE ile aranır. |
| `orderBy?` | `string` | Sıralama yapılacak kolon adı (config.fields içindeki key). |
| `orderDirection?` | `"asc" \| "desc"` | Sıralama yönü. |
| `filters?` | `FiltersRecord` | Alan bazlı filtreler. Her alan bir değer, değer listesi veya `{ operator, value }` objesi alır. |
| `includeRelations?` | `string[] \| boolean` | `true` tüm relation'ları yükler; `false` hiçbirini yüklemez; `string[]` ise sadece belirtilenleri yükler. |

### FiltersRecord Örnekleri

`FiltersRecord` üç farklı format destekler:

1. **Basit Değer** (otomatik `"eq"` operatörü):
```ts
filters: {
  is_active: true,           // eq(is_active, true)
  user_id: "123",            // eq(user_id, '123')
}
```

2. **Değer Listesi** (otomatik `"in"` operatörü):
```ts
filters: {
  status: ["active", "pending"],  // status IN ('active', 'pending')
  ids: [1, 2, 3],                 // id IN (1, 2, 3)
}
```

3. **FilterValueObject** (manuel operatör seçimi):
```ts
filters: {
  age: { operator: "gte", value: 18 },
  email: { operator: "ilike", value: "%@example.com" },
  price: { operator: "lt", value: 100 },
}
```

### FilterValueObject Yapısı

Manuel operatör seçimi için:

```ts
type FilterValueObject = {
  operator: FilterOperator;                    // "eq", "gt", "in" vb.
  value: string | number | boolean | Date      // Tekil değer
       | Array<string | number | boolean | Date>; // veya liste
};
```

Örnekler:
- `{ operator: "gte", value: 18 }` → `age >= 18`
- `{ operator: "in", value: ["a", "b"] }` → `status IN ('a', 'b')`
- `{ operator: "isNull", value: true }` → `field IS NULL` (value kullanılmaz ama gerekli)

### SearchResult (Dönüş Tipi)

`HybridGenericSearch` çağrısı aşağıdaki yapıyı döner:

```ts
type SearchResult<TData> = {
  data: TData[];           // Ana kayıtlar (relation'larla birlikte)
  pagination: {
    page: number;          // Mevcut sayfa
    limit: number;         // Sayfa başına kayıt
    total: number;         // Toplam kayıt sayısı
    totalPages: number;    // Toplam sayfa sayısı
    hasNext: boolean;      // Sonraki sayfa var mı
    hasPrev: boolean;      // Önceki sayfa var mı
  };
};
```

---

## 5. Konfigürasyon Akışı

### Geliştirme Zamanı (Backend)

1. Şema dosyasında (`utilities/DbEntities/schemas/bifrost/user.ts` gibi) statik konfigürasyon tanımlanır:
   - `fields`: Hangi kolonlar aranabilir/filtrelenebilir/sıralanabilir
   - `relations`: Hangi ilişkiler yüklenebilir
   - `fieldSelection`, `maxLimit`, `useDrizzleQuery` vb.

2. **İki yöntem ile tanımlanabilir:**

   **A) Direkt Obje Literal (Tercih Edilen):**
   ```ts
   export const userSearchConfig: HybridSearchConfig = {
     table_name: "T_BifrostUsers",
     fields: {
       email: { column: "email", type: "string", searchable: true },
       // ...
     },
     relations: [/* ... */],
     useDrizzleQuery: true,
   };
   ```

   **B) `createHybridSearchConfig` Helper (Opsiyonel):**
   ```ts
   import { createHybridSearchConfig } from '@monorepo/generics/GenericSearch';
   
   export const userSearchConfig = createHybridSearchConfig(
     "T_BifrostUsers",
     {
       email: { column: "email", type: "string" },
       // Helper otomatik default'lar ekler:
       // - id, created_at, updated_at, is_active
       // - searchable/filterable/sortable varsayılanları
     },
     [/* relations */],
     true // useDrizzleQuery
   );
   ```

   Helper'in eklediği default'lar:
   - `defaultOrderBy: "created_at"`
   - `defaultOrderDirection: "desc"`
   - `maxLimit: 100`
   - Otomatik `id`, `created_at`, `updated_at`, `is_active` alanları
   - String alanlar otomatik `searchable: true`

3. Bu konfigürasyon backend'de export edilir ve frontend tarafından import edilir.

### Çalışma Zamanı (Runtime)

1. Frontend kullanıcıdan/UI'dan dinamik parametreler alır (`page`, `limit`, `search`, `filters`, `includeRelations` vb.).

2. Backend `HybridGenericSearch({ schema_name, config, params })` çağrılır:
   - `config`: Şema dosyasından gelen statik tanım
   - `params`: Frontend'den gelen dinamik değerler

3. `includeRelations` parametresi config'teki relation listesini runtime'da filtreler.

4. `excluded_schemas` kontrolü aktif tenant şemasına göre relation'ları otomatik devre dışı bırakır.

---

## 6. Önemli Notlar

1. **`useDrizzleRelation: true` kullanırken**:
   - İlgili şema dosyası mutlaka Drizzle'ın `relations(...)` helper'ı ile ilişkiyi export etmelidir. Aksi hâlde `db.query[table].findMany({ with })` çağrısı `normalizeRelation` aşamasında hata verir.
   - Yine de güvenli fallback için manuel alanları (`type`, `targetTable`, `through`, vb.) tanımlı tutun; böylece Drizzle tanımı olmadığında GenericSearch manuel yüklemeye dönebilir.

2. **`foreignKey` her zaman hedef tabloda**, `localKey` ise ana tablodadır. İlişki yönüne göre doğru olanı kullanın.

3. **`childRelations`** recursive yapıdır ama performans için 3 seviyeden derin gitmekten kaçının.

4. **`includeJunctionFields`** sadece `many-to-many` için anlamlıdır. Junction tablosundan ek veri taşımak için kullanılır.

5. **`excluded_schemas`** runtime'da schema bazlı kontrol yapar; compile-time değil. Schema adı tam eşleşmeli (case-sensitive).

6. **`search` parametresi** yalnızca `searchable: true` olan alanlarda çalışır; filtrelerden ayrıdır.

7. **Konfig değişikliği** için şema dosyası güncellenir; frontend dinamik olarak config değiştiremez.

8. **`createHybridSearchConfig` helper'i kullanırken** partial field config yeterlidir; eksik alanlar otomatik doldurulur. Direkt obje literal'de tüm alanları manuel tanımlamanız gerekir.

---

## 7. Hızlı Referans Tablosu

| Yapı | Alan | Zorunlu | Not |
| --- | --- | --- | --- |
| `HybridSearchConfig` | `table_name` | ✔ | Tablo adı. |
|  | `fields` | ✔ | En az bir alan önerilir. |
|  | `relations` | ✖ | İhtiyaca göre. |
|  | `useDrizzleQuery` | ✖ | Varsayılan `false`. |
|  | `fieldSelection` | ✖ | Ana tablo alanlarını sınırlandırır. |
| `FieldConfig` | `column` | ✔ | DB kolonu. |
|  | `type` | ✔ | UI/filtre tipi. |
|  | `operators` | ✖ | Filtre operatörleri. |
| `HybridRelationConfig` | `name` | ✔ | JSON’da relation adı. |
|  | `type`/`targetTable` | ✔ (`useDrizzleRelation` yoksa) | Manuel yükleme için gerekli. |
|  | `through` | ✖ | Sadece `many-to-many`. |
|  | `childRelations` | ✖ | Daha derin ilişki gerekiyorsa. |
|  | `excluded_schemas` | ✖ | Şema bazlı kapatma. |
| `ChildRelationConfig` | — | — | Aynı alanlar geçerli. |

---

Bu referans dosyası sadece GenericSearch konfigürasyon alanlarını kapsar. UI, store ya da farklı modüllerle ilgili bilgiler burada yer almaz. Yeni relation veya alan eklemeden önce hızlıca kontrol edip doğru parametreleri kullandığınızdan emin olmak için bu dosyayı kullanabilirsiniz.
