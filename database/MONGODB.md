# SmartStore — MongoDB (MongoDB Compass)

Le backend utilise **Mongoose** et se connecte à la base définie dans `backend/.env` :

```env
MONGODB_URI=mongodb://127.0.0.1:27017/smartstore
```

La base `smartstore` est créée **manuellement** dans MongoDB Compass. Le code ne crée ni ne remplit la base.

## Collections attendues

Mongoose utilise les noms de collections suivants (pluriel automatique) :

| Modèle | Collection |
| --- | --- |
| User | `users` |
| Category | `categories` |
| Supplier | `suppliers` |
| Product | `products` |
| Sale | `sales` |
| Order | `orders` |
| StockMovement | `stockmovements` |
| Counter | `counters` |

## Schémas

### `users`

```js
{
  name: String,          // obligatoire
  email: String,         // obligatoire, unique, minuscules
  passwordHash: String,  // obligatoire (bcrypt), jamais renvoyé par l'API
  role: String,          // "admin" | "gestionnaire" | "caissier"
  active: Boolean,       // true par défaut
  createdAt: Date,
  updatedAt: Date
}
```

Pour créer le premier administrateur dans Compass, générez le hash bcrypt :

```bash
node -e "console.log(require('bcryptjs').hashSync('VotreMotDePasse', 10))"
```

Puis collez le résultat dans `passwordHash`.

### `categories`

```js
{ name: String, description: String, createdAt: Date, updatedAt: Date }
```

### `suppliers`

```js
{
  name: String,
  contactName: String,
  email: String,
  phone: String,
  address: String,
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### `products`

```js
{
  name: String,
  barcode: String,              // unique
  category: ObjectId,           // référence vers categories._id
  supplier: ObjectId,           // référence vers suppliers._id
  price: Number,                // prix de vente
  purchasePrice: Number,        // prix d'achat (optionnel)
  stock: Number,
  lowStockThreshold: Number,    // 8 par défaut
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

> `category` et `supplier` doivent contenir des **ObjectId** valides, pas des chaînes.
> L'API accepte aussi un nom lors de la création/mise à jour : le backend retrouve
> ou crée automatiquement la catégorie/fournisseur correspondant.

### `sales`

```js
{
  invoice: String,              // unique, ex. FAC-2026-0001
  cashier: ObjectId,            // référence vers users._id
  date: Date,
  items: Number,
  total: Number,                // total d'origine (archivé)
  refundedTotal: Number,        // cumul des retours (0 par défaut)
  payment: String,              // "especes" | "carte"
  status: String,               // "validee" | "partielle" | "retournee"
  lines: [{
    product: ObjectId,
    name: String,
    quantity: Number,
    price: Number
  }],
  returns: [{
    product: ObjectId,
    name: String,
    quantity: Number,
    reason: String,
    date: Date,
    cashier: ObjectId
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### `orders`

```js
{
  number: String,               // unique, ex. CMD-2026-0001
  supplier: ObjectId,
  date: Date,
  items: Number,
  total: Number,
  status: String,               // "en_attente" | "validee" | "refusee" | "recue"
  source: String,               // "manuelle" | "automatique"
  stockApplied: Boolean,        // évite de doubler le stock à la réception
  lines: [{
    product: ObjectId,
    productName: String,
    quantity: Number,
    price: Number
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### `stockmovements`

```js
{
  product: ObjectId,
  type: String,                 // "entree" | "sortie" | "ajustement"
  quantity: Number,
  reason: String,
  user: ObjectId,
  date: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### `counters`

Collection technique pour les numéros de factures et de commandes.

```js
{ key: String, seq: Number }
```

## Index à créer dans Compass

Mongoose crée les index au démarrage, mais vous pouvez aussi les créer manuellement :

| Collection | Index |
| --- | --- |
| `users` | `{ email: 1 }` unique |
| `categories` | `{ name: 1 }` unique |
| `suppliers` | `{ name: 1 }` unique |
| `products` | `{ barcode: 1 }` unique |
| `sales` | `{ invoice: 1 }` unique |
| `sales` | `{ date: -1 }` |
| `orders` | `{ number: 1 }` unique |
| `orders` | `{ date: -1 }` |
| `stockmovements` | `{ date: -1 }` |
| `counters` | `{ key: 1 }` unique |

## Ordre de création conseillé

1. `users` (administrateur)
2. `categories`
3. `suppliers`
4. `products`
5. Le reste (`sales`, `orders`, `stockmovements`, `counters`) est alimenté par l'application.
