# API Calling Guide - useGenericApiActions

Bu dokümantasyon, Nucleus frontend uygulamasında API çağrılarının nasıl yapılacağını açıklar.

## Temel Kullanım

```tsx
const actions = useGenericApiActions()

actions.ENDPOINT_NAME.start({
  payload: { /* request payload */ },
  onAfterHandle: (data) => {
    // data zaten type-safe, assertion yapma
    console.log(data)
  },
  onErrorHandle: (error) => {
    // error zaten type-safe, assertion yapma
    console.error(error)
  },
})
```

## Kurallar

### ✅ DOĞRU Kullanım

```tsx
// 1. Hook'u al
const actions = useGenericApiActions()

// 2. Endpoint'i çağır (callback pattern)
actions.GET_USERS.start({
  payload: { page: 1, limit: 10 },
  onAfterHandle: (data) => {
    // data type-safe
    userStore.users = data
  },
  onErrorHandle: (error) => {
    toast.error(error.message)
  },
})

// 3. Loading state için
{actions.GET_USERS.state.isPending && <Spinner />}

// 4. Data'ya callback dışında erişim
const users = actions.GET_USERS.state.data
```

### ❌ YANLIŞ Kullanım

```tsx
// ❌ try/catch kullanma
try {
  await actions.GET_USERS.start(...)
} catch (e) { }

// ❌ await kullanma
const data = await actions.GET_USERS.start(...)

// ❌ Type assertion yapma
onAfterHandle: (data) => {
  const users = data as UserType[] // YANLIŞ!
}

// ❌ Dependency array'e start koyma (infinite loop!)
useEffect(() => {
  actions.GET_USERS.start(...)
}, [actions.GET_USERS.start]) // YANLIŞ!
```

## State Özellikleri

| Property | Tip | Açıklama |
|----------|-----|----------|
| `state.isPending` | `boolean` | İstek devam ediyor mu |
| `state.data` | `T \| null` | Son başarılı response |
| `state.error` | `Error \| null` | Son hata |

## Endpoint Tanımları

Endpoint'ler aşağıdaki dosyalarda tanımlıdır:

- **Settings**: `utilities/Nextjs/Actions/Factory/settings.ts`
- **Types**: `utilities/Nextjs/Actions/Factory/types.ts`
- **Schemas**: `utilities/DbEntities/schemas/default/` (Generic endpoint'ler için)

## Örnek: CRUD İşlemleri

```tsx
// READ
actions.GET_USERS.start({
  payload: { page: 1, limit: 20, search: 'john' },
  onAfterHandle: (data) => { store.users = data },
})

// CREATE
actions.CREATE_USER.start({
  payload: { name: 'John', email: 'john@example.com' },
  onAfterHandle: (data) => { 
    toast.success('Kullanıcı oluşturuldu')
    refetchUsers()
  },
})

// UPDATE
actions.UPDATE_USER.start({
  payload: { id: '123', name: 'John Updated' },
  onAfterHandle: (data) => { toast.success('Güncellendi') },
})

// DELETE
actions.DELETE_USER.start({
  payload: { id: '123' },
  onAfterHandle: () => { toast.success('Silindi') },
})
```

## Örnek: useEffect ile Kullanım

```tsx
useEffect(() => {
  actions.GET_AUDIT_LOGS.start({
    payload: buildPayload(),
    onAfterHandle: (data) => {
      if (!data) return
      auditStore.audits = data
    },
    onErrorHandle: (error) => {
      console.log('error', error)
    },
  })
}, []) // ⚠️ start'ı dependency'e KOYMA!
```

## Conditional Loading UI

```tsx
function UserList() {
  const actions = useGenericApiActions()
  
  return (
    <div>
      {actions.GET_USERS.state.isPending ? (
        <LoadingSpinner />
      ) : (
        <UserTable data={actions.GET_USERS.state.data} />
      )}
    </div>
  )
}
```
