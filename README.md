# 🛍️ mysqllab

> Lightweight, interactive Terminal User Interface (TUI) e-commerce application powered by **Node.js / Bun**, **TypeScript**, and **Ink (React for CLI)**. Connects dynamically to a live **MySQL database URL** or seamlessly falls back to a **local database file (SQLite)** with zero external database setup required.

[![GitHub Repo](https://img.shields.io/badge/GitHub-a23mg%2Fmysqllab-blue?logo=github)](https://github.com/a23mg/mysqllab)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Ink](https://img.shields.io/badge/UI-Ink%20(React%20TUI)-success)](https://github.com/vadimdemedes/ink)

---

## ✨ Features

- **Terminal User Interface (TUI)**: Beautiful, full-screen interactive dashboard built with Ink (React terminal UI) with tabs, tables, status indicators, and modals.
- **Dual Database Flexibility**:
  - **MySQL Connection**: Connect via connection string (`--url mysql://user:pass@host:3306/db` or `DATABASE_URL`).
  - **Local File Fallback**: If no URL is provided, automatically uses an embedded local SQLite file (`data/mysqllab.db`).
  - Schema auto-migration on launch for both MySQL and SQLite.
- **DummyJSON Seeder**: One-command and in-app seeder pulling rich product catalogs directly from [DummyJSON](https://dummyjson.com/products).
- **Product Catalog & Search**:
  - Full catalog view with pagination
  - Real-time search query filtering
  - Category selector & cycling
  - Detailed product inspector modal
- **Product Management (CRUD)**:
  - `[N]` Add new products with full field forms
  - `[E]` Edit title, category, price, and stock
  - `[D]` Delete products with confirmation modal
- **Interactive Shopping Cart**:
  - Add items from catalog
  - Increment/decrement quantities with real-time stock validation
  - Subtotal and tax calculations
  - Customer name personalization
- **Checkout & Inventory Tracking**:
  - Real-time atomic inventory deduction on checkout
  - Complete order history and itemized breakdown view

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/a23mg/mysqllab.git
cd mysqllab

# Using Bun (Recommended)
bun install

# Or using npm / Node.js
npm install
```

### 2. Seed the Database

Populate products from [DummyJSON](https://dummyjson.com/products):

```bash
# Seed into default local SQLite file
bun run seed

# Or seed with the CLI flag
bun run src/index.tsx --seed-only
```

### 3. Launch the Application

```bash
# Launch with local SQLite file
bun start

# Or specify a custom MySQL connection URL
bun start -- --url mysql://root:password@localhost:3306/mysqllab

# Or seed and launch together
bun start -- --seed
```

---

## ⌨️ Keyboard Navigation & Shortcuts

| Key | Description |
|---|---|
| `1` | Switch to **📦 Products Catalog** |
| `2` | Switch to **⚙️ Manage CRUD** |
| `3` | Switch to **🛒 Cart & Checkout** |
| `4` | Switch to **📋 Orders History** |
| `5` | Switch to **🔄 Seeder / DB Control** |
| `↑` / `↓` | Navigate rows and selections |
| `Enter` | View Details / Save / Place Order |
| `/` or `s` | Focus Search Bar (Catalog) |
| `c` | Cycle categories (Catalog) |
| `p` / `n` | Previous / Next page |
| `a` | Add selected product to cart |
| `+` / `-` | Increase / Decrease item quantity in cart |
| `r` | Remove selected item from cart |
| `Tab` | Switch between form fields |
| `Esc` | Close modal / cancel form / clear selection |
| `Ctrl+C` | Exit application |

---

## ⚙️ CLI Options & Flags

```
Usage: mysqllab [options]

Options:
  -V, --version        output the version number
  -u, --url <string>   MySQL connection URL (e.g. mysql://user:password@localhost:3306/db)
  -f, --file <string>  SQLite local database file path (defaults to data/mysqllab.db)
  -s, --seed           Seed database from DummyJSON before starting TUI
  --seed-only          Seed database from DummyJSON and exit immediately
  -h, --help           display help for command
```

---

## 🧪 Testing

Run automated tests:

```bash
bun test
```

---

## 📂 Project Structure

```
mysqllab/
├── src/
│   ├── types/
│   │   └── index.ts          # Core domain models & DatabaseAdapter interface
│   ├── db/
│   │   ├── adapter.test.ts   # Database CRUD & order transaction test suite
│   │   ├── index.ts          # Database factory (MySQL vs SQLite switch)
│   │   ├── mysql.ts          # MySQL adapter (mysql2/promise with connection pooling)
│   │   ├── seeder.ts         # DummyJSON fetch & batch upsert seeder
│   │   └── sqlite.ts         # Fast zero-setup SQLite adapter
│   ├── scripts/
│   │   └── seed.ts           # Standalone seed script
│   ├── ui/
│   │   ├── App.tsx           # Ink TUI application shell & global state
│   │   ├── components/
│   │   │   ├── Footer.tsx    # Keyboard hints & alert bar
│   │   │   └── Header.tsx    # Header banner, DB info, cart pill, and tabs
│   │   └── views/
│   │       ├── CartView.tsx  # Cart management & checkout simulation
│   │       ├── CatalogView.tsx # Product catalog, search, and details
│   │       ├── ManageView.tsx  # Product CRUD operations and forms
│   │       ├── OrdersView.tsx  # Order history and line item breakdown
│   │       └── SeederView.tsx  # In-app DummyJSON seeder & DB stats
│   └── index.tsx             # CLI entrypoint with Commander & Ink renderer
├── .env.example              # Environment variables template
├── package.json
└── tsconfig.json
```

---

## 📜 License

MIT © [a23mg](https://github.com/a23mg)
