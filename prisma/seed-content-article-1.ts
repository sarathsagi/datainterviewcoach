import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const content = `
## What Is Logical Data Modeling?

A logical data model defines **what** data you need to store and how different entities relate to each other — independent of any specific database technology. It sits between a high-level conceptual model ("we need customers and orders") and a physical model ("here's the exact SQL DDL").

In an interview, when an interviewer asks you to "design the data model," they usually want the logical model first. Start here before jumping to tables.

---

## The Three Core Concepts

### 1. Entities
An entity is a distinct "thing" your business cares about. In an e-commerce context:

- **Customer** — a person who places orders
- **Order** — a transaction linking a customer to products
- **Product** — something sold
- **Warehouse** — where inventory lives

> **Interview tip:** Ask clarifying questions before modeling. "Does a customer have one shipping address or many?" changes the entire model.

### 2. Attributes
Attributes describe the properties of an entity.

| Entity | Key Attributes |
|--------|---------------|
| Customer | customer_id, name, email, created_at |
| Order | order_id, customer_id, placed_at, status |
| Product | product_id, name, price, category |

Keep attributes atomic — store \`first_name\` and \`last_name\` separately, not a combined \`full_name\` field you'll have to parse later.

### 3. Relationships
Relationships define how entities connect. The three types are:

**One-to-One (1:1)**
One entity instance relates to exactly one other. Rare in practice.
\`\`\`
User ──── UserProfile
\`\`\`

**One-to-Many (1:N)**
One entity relates to many of another. The most common type.
\`\`\`
Customer ──< Orders
Order ──< OrderItems
\`\`\`

**Many-to-Many (M:N)**
Many instances on both sides. Always resolved with a junction/bridge table.
\`\`\`
Orders >──< Products   →   resolved via OrderItems
Students >──< Courses  →   resolved via Enrollments
\`\`\`

---

## Cardinality Notation

You'll see cardinality written in ERD (Entity-Relationship Diagram) notation. The most common is **Crow's Foot**:

\`\`\`
Customer ||──o{ Order    (one customer has zero or many orders)
Order    ||──|{ OrderItem (one order has one or many items)
Product  ||──o{ OrderItem (one product appears in zero or many orders)
\`\`\`

Symbols:
- \`||\` = exactly one (mandatory)
- \`o|\` = zero or one (optional)
- \`o{\` = zero or many
- \`|{\` = one or many (mandatory many)

---

## A Worked Example — E-Commerce

**Business requirements:**
- Customers place orders
- Each order contains one or more products
- Products belong to categories
- Customers can have multiple shipping addresses

**Logical model:**

\`\`\`
Customer
  - customer_id (PK)
  - email
  - name
  - created_at

Address
  - address_id (PK)
  - customer_id (FK → Customer)
  - street, city, state, zip, country
  - is_default

Order
  - order_id (PK)
  - customer_id (FK → Customer)
  - shipping_address_id (FK → Address)
  - placed_at
  - status  (ENUM: pending, shipped, delivered, cancelled)
  - total_amount

OrderItem
  - order_item_id (PK)
  - order_id (FK → Order)
  - product_id (FK → Product)
  - quantity
  - unit_price_at_purchase   ← snapshot price, not current product price

Category
  - category_id (PK)
  - name
  - parent_category_id (FK → Category, self-referential for hierarchy)

Product
  - product_id (PK)
  - category_id (FK → Category)
  - name
  - description
  - current_price
\`\`\`

> **Key decision:** \`unit_price_at_purchase\` on \`OrderItem\` is a deliberate denormalization. Product prices change — you need the price at the time of purchase for correct revenue reporting, not today's price.

---

## Logical vs. Physical: What's Different

| Aspect | Logical Model | Physical Model |
|--------|--------------|----------------|
| Focus | Business rules & relationships | Database implementation |
| Data types | Generic (string, integer, date) | Specific (VARCHAR(255), BIGINT, TIMESTAMP) |
| Indexes | Not defined | Defined and tuned |
| Partitioning | Not defined | Defined |
| Technology | Database-agnostic | Specific to Postgres, Snowflake, BigQuery, etc. |

---

## Common Interview Questions on This Topic

**"How would you model a many-to-many relationship?"**
Always introduce a junction table. Don't store arrays of foreign keys in a column — that violates first normal form and makes querying painful.

**"How do you handle a product that can belong to multiple categories?"**
Two options: (1) self-referential hierarchy with a single category per product, or (2) a \`ProductCategory\` junction table if multi-category is a genuine requirement. Clarify the requirement before choosing.

**"What's the difference between a logical and physical data model?"**
Logical is technology-agnostic and expresses business rules. Physical is the actual DDL for a specific database system including types, indexes, and partitions.

---

## Key Takeaways

- Start every design with entities and relationships before touching SQL
- Cardinality notation (Crow's Foot) communicates intent clearly to stakeholders
- Resolve M:N relationships with junction tables
- Capture business facts at point-in-time (like price snapshots) rather than pointing to the current value
- Ask clarifying questions — the model changes significantly based on edge cases
`;

async function main() {
  const updated = await prisma.learningModule.updateMany({
    where: { slug: "logical-data-modeling" },
    data: {
      content: content.trim(),
      readTimeMinutes: 8,
      description: "Learn to model entities, attributes, and relationships — the foundation of every data engineering design interview.",
    },
  });

  console.log(`✅  Updated ${updated.count} module(s): Logical Data Modeling`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
