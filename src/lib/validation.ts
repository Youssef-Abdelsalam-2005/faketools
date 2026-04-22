import { z, ZodType } from "zod";
import type { InputField } from "@/lib/db/schema";

export function fieldsToZod(fields: InputField[]): ZodType {
  const shape: Record<string, ZodType> = {};
  for (const f of fields) {
    let s: ZodType;
    switch (f.type) {
      case "string":
        s = z.string();
        break;
      case "number":
        s = z.number();
        break;
      case "boolean":
        s = z.boolean();
        break;
      case "object":
        s = z.record(z.string(), z.unknown());
        break;
      case "array":
        s = z.array(z.unknown());
        break;
      default:
        s = z.unknown();
    }
    if (!f.required) s = s.optional();
    shape[f.name] = s;
  }
  return z.object(shape).passthrough();
}
