# MoveBoss AI Service Architecture

## Overview

A unified AI layer that powers all intelligent features across MoveBoss - document extraction, smart suggestions, natural language queries, and automated workflows. Built once, used everywhere (web + mobile).

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
├─────────────────────────────┬──────────────────────────────────────────────┤
│         Web App             │              Mobile App                       │
│    (Next.js + React)        │           (React Native)                      │
│                             │                                               │
│  ┌───────────────────────┐  │  ┌───────────────────────────────────────┐   │
│  │  useAI() hook         │  │  │  useAI() hook                         │   │
│  │  useDocumentScan()    │  │  │  useDocumentScan()                    │   │
│  │  useAISuggestions()   │  │  │  useAISuggestions()                   │   │
│  └───────────────────────┘  │  └───────────────────────────────────────┘   │
└─────────────────────────────┴──────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           AI SERVICE API                                    │
│                         POST /api/ai                                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   EXTRACT   │  │   SUGGEST   │  │   GENERATE  │  │    QUERY    │       │
│  │             │  │             │  │             │  │             │       │
│  │ Documents   │  │ Load match  │  │ Messages    │  │ "Profit     │       │
│  │ → Struct    │  │ Pricing     │  │ Estimates   │  │  this       │       │
│  │   Data      │  │ Actions     │  │ Contracts   │  │  month?"    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
├────────────────────────────────────────────────────────────────────────────┤
│                          SHARED SERVICES                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Context    │  │    Schema    │  │    Prompt    │  │     Cost     │   │
│  │   Builder    │  │   Registry   │  │   Manager    │  │   Tracker    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           AI PROVIDERS                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │   Claude (Anthropic) │  │   Future: OpenAI,    │                        │
│  │   - Vision (images)  │  │   Gemini, etc.       │                        │
│  │   - Text (analysis)  │  │                      │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Capability Types

| Type | Purpose | Example Use Cases |
|------|---------|-------------------|
| `extract` | Pull structured data from unstructured input | Scan BOL → load fields, Scan license → driver fields |
| `suggest` | Recommend actions or options | "Load X matches your route", "Price seems low" |
| `generate` | Create content | Draft customer message, generate estimate |
| `query` | Answer questions about business data | "What's my profit this month?", "Which drivers are expiring?" |
| `action` | Execute an AI-suggested workflow | "Create receivable for delivered load" |

### 2. Request Structure

```typescript
interface AIRequest {
  // What capability to use
  type: 'extract' | 'suggest' | 'generate' | 'query' | 'action';

  // What form/screen/feature is calling this
  context: AIContext;

  // The actual input (varies by type)
  input: AIInput;

  // Optional: override default behavior
  options?: AIOptions;
}

interface AIContext {
  // Which feature is calling
  feature: 'load_creation' | 'driver_creation' | 'expense_entry' | 'messaging' | 'dashboard' | ...;

  // User info (injected server-side)
  user?: {
    id: string;
    role: 'owner' | 'dispatcher' | 'driver';
    companyId: string;
  };

  // Related entities (optional, for richer context)
  entities?: {
    tripId?: string;
    loadId?: string;
    driverId?: string;
  };
}

interface AIInput {
  // For extract: image or document
  image?: string; // base64
  document?: string; // base64 PDF

  // For query/generate: text prompt
  prompt?: string;

  // For suggest: what to suggest about
  subject?: Record<string, unknown>;
}

interface AIOptions {
  // Which schema to use for extraction
  schema?: string;

  // Model preference (cost vs quality)
  quality?: 'fast' | 'balanced' | 'best';

  // Max tokens (for cost control)
  maxTokens?: number;
}
```

### 3. Response Structure

```typescript
interface AIResponse {
  success: boolean;

  // The extracted/generated/suggested data
  data?: Record<string, unknown>;

  // Confidence scores per field (for extract)
  confidence?: Record<string, number>;

  // Fields that need human review
  needsReview?: string[];

  // For suggestions: multiple options
  suggestions?: AISuggestion[];

  // Error info
  error?: string;

  // Cost tracking
  usage?: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    cost: number; // in cents
  };
}

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  action?: {
    type: string;
    payload: Record<string, unknown>;
  };
}
```

---

## Schema Registry

Schemas define what fields to extract for each form type. This makes the extraction generic - same code, different schemas.

```typescript
// packages/shared/src/ai/schemas.ts

export const schemas = {
  // Load creation - scan estimate, BOL, contract
  load_creation: {
    fields: {
      customer_name: { type: 'string', description: 'Customer full name' },
      customer_phone: { type: 'string', description: 'Customer phone number' },
      customer_email: { type: 'string', description: 'Customer email address' },
      origin_address: { type: 'string', description: 'Pickup address' },
      origin_city: { type: 'string', description: 'Pickup city' },
      origin_state: { type: 'string', description: 'Pickup state' },
      origin_zip: { type: 'string', description: 'Pickup ZIP code' },
      destination_address: { type: 'string', description: 'Delivery address' },
      destination_city: { type: 'string', description: 'Delivery city' },
      destination_state: { type: 'string', description: 'Delivery state' },
      destination_zip: { type: 'string', description: 'Delivery ZIP code' },
      estimated_weight: { type: 'number', description: 'Estimated weight in lbs' },
      estimated_cuft: { type: 'number', description: 'Estimated cubic feet' },
      total_rate: { type: 'number', description: 'Total move cost/rate' },
      rate_per_cuft: { type: 'number', description: 'Rate per cubic foot' },
      pickup_date: { type: 'date', description: 'Scheduled pickup date' },
      delivery_date: { type: 'date', description: 'Scheduled or estimated delivery date' },
      job_number: { type: 'string', description: 'Reference or job number' },
      special_instructions: { type: 'string', description: 'Special handling instructions' },
    },
    documentTypes: ['moving_estimate', 'bill_of_lading', 'contract', 'military_gbl', 'corporate_po'],
  },

  // Driver creation - scan license
  driver_creation: {
    fields: {
      first_name: { type: 'string', description: 'First name on license' },
      last_name: { type: 'string', description: 'Last name on license' },
      license_number: { type: 'string', description: 'Driver license number' },
      license_state: { type: 'string', description: 'Issuing state' },
      license_class: { type: 'string', description: 'License class (A, B, C, CDL)' },
      license_expiration: { type: 'date', description: 'License expiration date' },
      date_of_birth: { type: 'date', description: 'Date of birth' },
      address: { type: 'string', description: 'Address on license' },
      endorsements: { type: 'string[]', description: 'CDL endorsements' },
      restrictions: { type: 'string[]', description: 'License restrictions' },
    },
    documentTypes: ['drivers_license', 'cdl'],
  },

  // Truck/trailer creation - scan registration
  vehicle_creation: {
    fields: {
      vin: { type: 'string', description: 'Vehicle Identification Number' },
      plate_number: { type: 'string', description: 'License plate number' },
      plate_state: { type: 'string', description: 'Plate issuing state' },
      year: { type: 'number', description: 'Vehicle year' },
      make: { type: 'string', description: 'Vehicle make' },
      model: { type: 'string', description: 'Vehicle model' },
      registration_expiration: { type: 'date', description: 'Registration expiration date' },
      registered_owner: { type: 'string', description: 'Registered owner name' },
    },
    documentTypes: ['vehicle_registration', 'title'],
  },

  // Expense entry - scan receipt
  expense_entry: {
    fields: {
      vendor_name: { type: 'string', description: 'Business/vendor name' },
      amount: { type: 'number', description: 'Total amount' },
      date: { type: 'date', description: 'Transaction date' },
      category: {
        type: 'enum',
        options: ['fuel', 'tolls', 'food', 'lodging', 'maintenance', 'other'],
        description: 'Expense category'
      },
      payment_method: { type: 'string', description: 'Payment method used' },
      location: { type: 'string', description: 'Business location/address' },
      gallons: { type: 'number', description: 'Gallons (for fuel)' },
      price_per_gallon: { type: 'number', description: 'Price per gallon (for fuel)' },
    },
    documentTypes: ['receipt', 'invoice'],
  },

  // Compliance documents - scan insurance, medical card, etc.
  compliance_document: {
    fields: {
      document_type: {
        type: 'enum',
        options: ['insurance_certificate', 'medical_card', 'drug_test', 'mvr', 'w9', 'hauling_agreement'],
        description: 'Type of compliance document'
      },
      entity_name: { type: 'string', description: 'Name on document (driver or company)' },
      policy_number: { type: 'string', description: 'Policy or certificate number' },
      effective_date: { type: 'date', description: 'Effective/issue date' },
      expiration_date: { type: 'date', description: 'Expiration date' },
      issuer: { type: 'string', description: 'Issuing company or authority' },
      coverage_amount: { type: 'number', description: 'Coverage amount (for insurance)' },
    },
    documentTypes: ['insurance_certificate', 'medical_card', 'drug_test_result', 'mvr_report', 'w9_form'],
  },

  // Partner load sheet - scan load details from partners
  partner_load: {
    fields: {
      partner_company: { type: 'string', description: 'Partner company name' },
      job_number: { type: 'string', description: 'Partner job/reference number' },
      customer_name: { type: 'string', description: 'Customer name' },
      origin: { type: 'string', description: 'Origin location' },
      destination: { type: 'string', description: 'Destination location' },
      weight: { type: 'number', description: 'Weight in lbs' },
      cuft: { type: 'number', description: 'Cubic feet' },
      rate: { type: 'number', description: 'Rate offered' },
      balance_due: { type: 'number', description: 'Balance due on delivery' },
      pickup_window: { type: 'string', description: 'Pickup date/window' },
      delivery_window: { type: 'string', description: 'Delivery date/window' },
      accessorials: { type: 'string[]', description: 'Pre-charged accessorials' },
    },
    documentTypes: ['loading_report', 'partner_dispatch', 'rate_confirmation'],
  },
};
```

---

## API Endpoint

### `POST /api/ai`

Single endpoint that handles all AI capabilities.

```typescript
// apps/web/src/app/api/ai/route.ts

import Anthropic from '@anthropic-ai/sdk';
import { schemas } from '@moveboss/shared/ai/schemas';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { type, context, input, options } = await req.json();

  // Build full context with user info
  const fullContext = {
    ...context,
    user: {
      id: user.id,
      // Fetch role and company from database
    },
  };

  try {
    let result;

    switch (type) {
      case 'extract':
        result = await handleExtract(input, fullContext, options);
        break;
      case 'suggest':
        result = await handleSuggest(input, fullContext, options);
        break;
      case 'generate':
        result = await handleGenerate(input, fullContext, options);
        break;
      case 'query':
        result = await handleQuery(input, fullContext, options);
        break;
      default:
        return Response.json({ success: false, error: 'Unknown type' }, { status: 400 });
    }

    // Track usage
    await trackUsage(user.id, fullContext, result.usage);

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('AI error:', error);
    return Response.json({ success: false, error: 'AI processing failed' }, { status: 500 });
  }
}

async function handleExtract(
  input: { image?: string; document?: string },
  context: AIContext,
  options: AIOptions
) {
  const schema = schemas[options?.schema || context.feature];
  if (!schema) {
    throw new Error(`Unknown schema: ${context.feature}`);
  }

  // Build extraction prompt
  const prompt = buildExtractionPrompt(schema);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: input.image!,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  // Parse response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const data = parseExtractedData(text, schema);

  return {
    data,
    confidence: calculateConfidence(data, schema),
    needsReview: findLowConfidenceFields(data, schema),
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: 'claude-sonnet-4-20250514',
      cost: calculateCost(response.usage),
    },
  };
}

function buildExtractionPrompt(schema: Schema): string {
  const fields = Object.entries(schema.fields)
    .map(([key, def]) => `- ${key}: ${def.description}${def.type === 'enum' ? ` (options: ${def.options.join(', ')})` : ''}`)
    .join('\n');

  return `Extract the following fields from this document. Return valid JSON only.

Fields to extract:
${fields}

Rules:
- Return null for fields you cannot find or are unsure about
- For dates, use ISO format (YYYY-MM-DD)
- For numbers, return numeric values without currency symbols
- For addresses, include full address as a single string
- Be conservative - only extract what you're confident about

Return format:
{
  "extracted": { ... fields ... },
  "confidence": { "field_name": 0.0-1.0, ... },
  "notes": "any relevant observations"
}`;
}
```

---

## Client Hooks

### Shared Types (packages/shared)

```typescript
// packages/shared/src/ai/types.ts

export interface UseAIOptions {
  onSuccess?: (data: AIResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseDocumentScanOptions extends UseAIOptions {
  schema: keyof typeof schemas;
}
```

### Web Hook

```typescript
// apps/web/src/hooks/useAI.ts

import { useState, useCallback } from 'react';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (params: AIRequest): Promise<AIResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'AI request failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}

// Specialized hook for document scanning
export function useDocumentScan(schema: string) {
  const { request, loading, error } = useAI();

  const scan = useCallback(async (imageBase64: string) => {
    return request({
      type: 'extract',
      context: { feature: schema },
      input: { image: imageBase64 },
      options: { schema },
    });
  }, [request, schema]);

  return { scan, loading, error };
}
```

### Mobile Hook

```typescript
// apps/mobile/hooks/useAI.ts

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (params: AIRequest): Promise<AIResponse> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'AI request failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}

// Mobile-specific: capture + scan in one
export function useDocumentScan(schema: string) {
  const { request, loading, error } = useAI();
  const [photo, setPhoto] = useState<string | null>(null);

  const captureAndScan = useCallback(async () => {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission required');
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const uri = result.assets[0].uri;
    setPhoto(uri);

    // Convert to base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Send to AI
    return request({
      type: 'extract',
      context: { feature: schema },
      input: { image: base64 },
      options: { schema },
    });
  }, [request, schema]);

  const pickAndScan = useCallback(async () => {
    // Pick from gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const uri = result.assets[0].uri;
    setPhoto(uri);

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return request({
      type: 'extract',
      context: { feature: schema },
      input: { image: base64 },
      options: { schema },
    });
  }, [request, schema]);

  return { captureAndScan, pickAndScan, photo, loading, error };
}
```

---

## UI Components

### Web: DocumentScanButton

```typescript
// apps/web/src/components/ai/DocumentScanButton.tsx

'use client';

import { useRef, useState } from 'react';
import { useDocumentScan } from '@/hooks/useAI';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2 } from 'lucide-react';

interface DocumentScanButtonProps {
  schema: string;
  onExtract: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

export function DocumentScanButton({ schema, onExtract, onError }: DocumentScanButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { scan, loading, error } = useDocumentScan(schema);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Convert to base64
      const base64 = await fileToBase64(file);

      // Scan
      const result = await scan(base64);

      if (result.data) {
        onExtract(result.data);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Scan failed');
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            Scan Document
          </>
        )}
      </Button>
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Mobile: DocumentScanButton

```typescript
// apps/mobile/components/ai/DocumentScanButton.tsx

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDocumentScan } from '../../hooks/useAI';
import { theme } from '../../lib/theme';

interface DocumentScanButtonProps {
  schema: string;
  label?: string;
  onExtract: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

export function DocumentScanButton({
  schema,
  label = 'Scan Document',
  onExtract,
  onError
}: DocumentScanButtonProps) {
  const { captureAndScan, pickAndScan, loading, error } = useDocumentScan(schema);

  const handleCapture = async () => {
    try {
      const result = await captureAndScan();
      if (result?.data) {
        onExtract(result.data);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Scan failed');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handleCapture}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.text.primary} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.body,
    fontWeight: '600',
  },
});
```

---

## Usage in Forms

### Example: Load Creation Form (Web)

```typescript
// apps/web/src/app/(dashboard)/loads/new/page.tsx

'use client';

import { useForm } from 'react-hook-form';
import { DocumentScanButton } from '@/components/ai/DocumentScanButton';

export default function NewLoadPage() {
  const form = useForm({
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      origin_address: '',
      destination_address: '',
      estimated_cuft: 0,
      total_rate: 0,
      // ... other fields
    },
  });

  const handleExtract = (data: Record<string, unknown>) => {
    // Pre-fill form with extracted data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && form.getValues(key) !== undefined) {
        form.setValue(key, value, { shouldValidate: true });
      }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Scan button at the top */}
      <div className="mb-6 p-4 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground mb-2">
          Have a document? Scan it to auto-fill the form.
        </p>
        <DocumentScanButton
          schema="load_creation"
          onExtract={handleExtract}
        />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <Input label="Customer Name" {...form.register('customer_name')} />
        <Input label="Phone" {...form.register('customer_phone')} />
        {/* ... other fields */}
      </div>
    </form>
  );
}
```

---

## Cost Tracking

### Database Table

```sql
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  feature TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_company ON ai_usage(company_id, created_at);
CREATE INDEX idx_ai_usage_feature ON ai_usage(feature, created_at);
```

### Tracking Function

```typescript
async function trackUsage(
  userId: string,
  context: AIContext,
  usage: AIUsage
) {
  const supabase = await createClient();

  await supabase.from('ai_usage').insert({
    user_id: userId,
    company_id: context.user?.companyId,
    feature: context.feature,
    type: context.type,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_cents: Math.round(usage.cost * 100),
  });
}
```

---

## Future Capabilities

### 1. Smart Suggestions

```typescript
// Get load suggestions based on driver's route
const { data } = await ai.request({
  type: 'suggest',
  context: { feature: 'load_matching' },
  input: {
    subject: {
      tripId: 'trip-123',
      currentLocation: { lat: 33.4484, lng: -112.0740 },
      destination: { lat: 31.7619, lng: -106.4850 },
      availableCapacity: 800,
    },
  },
});

// Returns
{
  suggestions: [
    {
      id: 'load-456',
      title: 'Phoenix → El Paso pickup',
      description: '600 CF, $1,200 - on your route',
      confidence: 0.94,
      action: { type: 'view_load', payload: { loadId: 'load-456' } },
    },
  ],
}
```

### 2. Natural Language Queries

```typescript
// Ask questions about your business
const { data } = await ai.request({
  type: 'query',
  context: { feature: 'dashboard' },
  input: {
    prompt: "What's my profit this month compared to last month?",
  },
});

// Returns
{
  data: {
    answer: "Your profit this month is $42,180, which is 18% higher than last month ($35,720).",
    visualization: {
      type: 'comparison',
      data: { current: 42180, previous: 35720, change: 0.18 },
    },
  },
}
```

### 3. Content Generation

```typescript
// Generate a message to send to customer
const { data } = await ai.request({
  type: 'generate',
  context: { feature: 'messaging' },
  input: {
    prompt: 'delivery_update',
    subject: {
      loadId: 'load-123',
      customerName: 'Johnson Family',
      eta: '2:30 PM',
      driverName: 'Marcus',
    },
  },
});

// Returns
{
  data: {
    message: "Hi Johnson Family, this is an update on your delivery. Marcus is on schedule and will arrive at approximately 2:30 PM today. Please ensure someone is available to receive the shipment. Reply to this message if you have any questions.",
  },
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `/api/ai` endpoint with extract capability
- [ ] Implement schema registry with load_creation schema
- [ ] Build web `useDocumentScan` hook
- [ ] Build mobile `useDocumentScan` hook
- [ ] Add DocumentScanButton to web load creation form
- [ ] Add DocumentScanButton to mobile (owner flow)
- [ ] Create ai_usage table for cost tracking

### Phase 2: Expand Extraction (Week 2)
- [ ] Add driver_creation schema (license scanning)
- [ ] Add vehicle_creation schema (registration scanning)
- [ ] Add expense_entry schema (receipt scanning)
- [ ] Add compliance_document schema
- [ ] Integrate into respective forms

### Phase 3: Suggestions (Week 3-4)
- [ ] Implement suggest capability
- [ ] Load matching suggestions
- [ ] Pricing suggestions
- [ ] Dashboard action suggestions

### Phase 4: Advanced (Future)
- [ ] Natural language queries
- [ ] Content generation
- [ ] Workflow automation
- [ ] Voice input

---

## Summary

This architecture gives you:

1. **Single API endpoint** - All AI goes through `/api/ai`
2. **Schema-driven extraction** - Add new forms by adding schemas, not code
3. **Shared hooks** - Same patterns for web and mobile
4. **Cost visibility** - Track every AI call
5. **Future-proof** - Easy to add suggestions, queries, generation later

Document scanning becomes the first feature built on a foundation that supports your entire AI vision.
