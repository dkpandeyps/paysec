/**
 * paysec-core@1.0.0 schema pack validation (T1).
 *
 * Asserts the schema pack is well-formed and matches the v1.48 plan:
 *   - Exactly 8 page types (7 entities + 1 take)
 *   - Frontmatter shape is internally consistent
 *   - Retention policies match SKILL_RUN_RETENTION_DAYS spec
 *   - Link verbs only reference declared verbs
 *   - JSON payload shape is acceptable to mcp__gbrain__schema_apply_mutations
 *
 * Gate-tier, free, pure import + assertion.
 */

import { describe, test, expect } from 'bun:test';
import {
  PAYSEC_CORE_SCHEMA_PACK,
  getSchemaPackMutationPayload,
  getSchemaPackTypeNames,
  getRetentionPolicy,
} from '../scripts/paysec-schema-pack';
import {
  PAYSEC_SCHEMA_PACK_NAME,
  PAYSEC_SCHEMA_PACK_VERSION,
} from '../scripts/brain-cache-spec';

describe('paysec-core schema pack', () => {
  test('identity matches brain-cache-spec constants', () => {
    expect(PAYSEC_CORE_SCHEMA_PACK.name).toBe(PAYSEC_SCHEMA_PACK_NAME);
    expect(PAYSEC_CORE_SCHEMA_PACK.version).toBe(PAYSEC_SCHEMA_PACK_VERSION);
  });

  test('declares exactly 8 page types (7 entities + paysec/take)', () => {
    expect(PAYSEC_CORE_SCHEMA_PACK.page_types.length).toBe(8);
  });

  test('all 7 brain-cache entities have a matching schema page type', () => {
    const types = getSchemaPackTypeNames();
    const required = [
      'paysec/user-profile',
      'paysec/product',
      'paysec/goal',
      'paysec/developer-persona',
      'paysec/brand',
      'paysec/competitive-intel',
      'paysec/skill-run',
    ];
    for (const name of required) {
      expect(types).toContain(name);
    }
  });

  test('paysec/take exists with kind=bet supported (Phase 2 / E5)', () => {
    const take = PAYSEC_CORE_SCHEMA_PACK.page_types.find((t) => t.type === 'paysec/take');
    expect(take).toBeDefined();
    const kind = take!.fields.find((f) => f.name === 'kind');
    expect(kind?.values).toContain('bet');
    expect(kind?.values).toContain('fact');
  });

  test('every page type has a required type + slug field', () => {
    for (const def of PAYSEC_CORE_SCHEMA_PACK.page_types) {
      const typeField = def.fields.find((f) => f.name === 'type');
      const slugField = def.fields.find((f) => f.name === 'slug');
      expect(typeField?.required).toBe(true);
      expect(slugField?.required).toBe(true);
    }
  });

  test('enum fields declare their values', () => {
    for (const def of PAYSEC_CORE_SCHEMA_PACK.page_types) {
      for (const field of def.fields) {
        if (field.type === 'enum') {
          expect(field.values).toBeDefined();
          expect(field.values!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('skill-run is the only archive-after-90d type', () => {
    const archived = PAYSEC_CORE_SCHEMA_PACK.page_types
      .filter((t) => t.retention === 'archive-after-90d')
      .map((t) => t.type);
    expect(archived).toEqual(['paysec/skill-run']);
  });

  test('paysec/take is never-archive (calibration scorecard preservation)', () => {
    expect(getRetentionPolicy('paysec/take')).toBe('never-archive');
  });

  test('getRetentionPolicy throws on unknown type (defensive)', () => {
    expect(() => getRetentionPolicy('paysec/nonexistent')).toThrow();
  });

  test('link verbs declared on emits_links are also in pack.link_verbs', () => {
    const declared = new Set(PAYSEC_CORE_SCHEMA_PACK.link_verbs);
    for (const def of PAYSEC_CORE_SCHEMA_PACK.page_types) {
      for (const link of def.emits_links ?? []) {
        expect(declared.has(link.verb)).toBe(true);
      }
    }
  });

  test('link verbs only target declared paysec/ page types', () => {
    const declared = new Set(getSchemaPackTypeNames());
    for (const def of PAYSEC_CORE_SCHEMA_PACK.page_types) {
      for (const link of def.emits_links ?? []) {
        expect(declared.has(link.target_type)).toBe(true);
      }
    }
  });

  test('mutation payload is well-formed JSON', () => {
    const payload = getSchemaPackMutationPayload();
    expect(payload.schema_version).toBe(1);
    expect(payload.schema_pack).toBeDefined();
    expect(typeof payload.schema_pack.name).toBe('string');
    expect(Array.isArray(payload.schema_pack.page_types)).toBe(true);
    // round-trip through JSON to catch unserializable values (functions, undefined, etc.)
    const json = JSON.stringify(payload);
    const reparsed = JSON.parse(json);
    expect(reparsed.schema_pack.name).toBe(payload.schema_pack.name);
  });

  test('paysec/product has expected emits_links graph (product → goal/persona/brand/etc.)', () => {
    const product = PAYSEC_CORE_SCHEMA_PACK.page_types.find((t) => t.type === 'paysec/product')!;
    const verbs = (product.emits_links ?? []).map((l) => `${l.verb}:${l.target_type}`);
    expect(verbs).toContain('targets:paysec/goal');
    expect(verbs).toContain('observed_by:paysec/developer-persona');
    expect(verbs).toContain('has_brand:paysec/brand');
    expect(verbs).toContain('competes_with:paysec/competitive-intel');
  });

  test('paysec/goal has lifecycle status enum (active/resolved/expired/archived)', () => {
    const goal = PAYSEC_CORE_SCHEMA_PACK.page_types.find((t) => t.type === 'paysec/goal')!;
    const status = goal.fields.find((f) => f.name === 'status');
    expect(status?.values).toEqual(['active', 'resolved', 'expired', 'archived']);
  });

  test('paysec/skill-run records the bet count for calibration coverage', () => {
    const sr = PAYSEC_CORE_SCHEMA_PACK.page_types.find((t) => t.type === 'paysec/skill-run')!;
    const takesField = sr.fields.find((f) => f.name === 'takes_written');
    expect(takesField).toBeDefined();
    expect(takesField?.type).toBe('number');
  });

  test('paysec/user-profile is never-archive (cross-project, long-lived)', () => {
    expect(getRetentionPolicy('paysec/user-profile')).toBe('never-archive');
  });
});
