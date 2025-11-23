# Supabase Schema Notes

## Companies Table

The `companies` table stores transportation company information.

### Table Structure

```sql
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  dot_number TEXT,
  mc_number TEXT,
  type TEXT
);
```

### Columns

- **id** (uuid, primary key)
  - Default: `gen_random_uuid()`
  - Unique identifier for each company

- **created_at** (timestamp with time zone)
  - Default: `now()`
  - Timestamp when the record was created

- **name** (text, required)
  - Company name
  - Cannot be null

- **dot_number** (text, nullable)
  - DOT (Department of Transportation) number
  - Optional

- **mc_number** (text, nullable)
  - MC (Motor Carrier) number
  - Optional

- **type** (text, nullable)
  - Company type (e.g., 'carrier', 'broker', 'shipper')
  - Optional

### Row Level Security (RLS)

RLS is enabled on this table with a permissive policy allowing anonymous SELECT access for testing purposes.

### Sample Data

The table currently contains 2 sample companies:
- Acme Transport Co. (DOT: 1234567, MC: MC-123456, Type: carrier)
- Global Logistics LLC (DOT: 9876543, MC: MC-987654, Type: broker)

