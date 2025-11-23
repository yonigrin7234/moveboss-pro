export type FormValue = string | boolean | null

interface ExtractOptions {
  booleanFields?: readonly string[]
}

export function extractFormValues(
  formData: FormData,
  fields: readonly string[],
  options?: ExtractOptions
): Record<string, FormValue> {
  const booleanSet = new Set(options?.booleanFields ?? [])
  const values: Record<string, FormValue> = {}

  fields.forEach((field) => {
    if (booleanSet.has(field)) {
      const formValue = formData.get(field)
      // Handle both checkbox "on" and hidden input "true"/"false"
      values[field] = formValue === "on" || formValue === "true"
      return
    }

    const value = formData.get(field)
    if (typeof value === "string" && value !== "") {
      values[field] = value
    }
  })

  return values
}

export function cleanFormValues(values: Record<string, FormValue>): Record<string, FormValue> {
  const cleaned: Record<string, FormValue> = {}

  Object.entries(values).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      cleaned[key] = value
      return
    }

    if (value === null || value === undefined) {
      return
    }

    const trimmed = value.trim()
    if (trimmed) {
      cleaned[key] = trimmed
    }
  })

  return cleaned
}


