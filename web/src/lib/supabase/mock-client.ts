import {
  mockProfile,
  mockAccounts,
  mockTrades,
  mockOpenPositions,
  mockJournals,
  mockTags,
  mockCandles,
  MOCK_USER_ID,
} from "@/lib/mock-data";
import type { Trade, Journal, Tag, OpenPosition } from "@/types";

// Mutable copies so inserts/updates persist within process
const store: Record<string, any[]> = {
  profiles: [mockProfile],
  accounts: [...mockAccounts],
  trades: [...mockTrades],
  open_positions: [...mockOpenPositions],
  journals: [...mockJournals],
  tags: [...mockTags],
  candle_cache: [...mockCandles],
  hot_symbols: [],
  analytics_cache: [],
};

function uuid() {
  return "00000000-0000-0000-0000-" + Math.random().toString(36).slice(2, 14).padEnd(12, "0");
}

// ---------- Query builder that mimics Supabase's chaining API ----------

type FilterFn = (row: any) => boolean;

interface QueryResult<T = any> {
  data: T | null;
  error: any;
  count?: number | null;
}

class MockQueryBuilder {
  private table: string;
  private filters: FilterFn[] = [];
  private _orderBy: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private _limit: number | null = null;
  private _rangeFrom: number | null = null;
  private _rangeTo: number | null = null;
  private _single = false;
  private _count: "exact" | null = null;
  private _selectColumns: string | null = null;
  private _insertData: any = null;
  private _updateData: any = null;
  private _upsertData: any = null;
  private _upsertOptions: any = {};
  private _deleteMode = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: { count?: "exact" }) {
    this._selectColumns = columns || "*";
    if (options?.count) this._count = options.count;
    return this;
  }

  insert(data: any) {
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: any) {
    this._updateData = data;
    return this;
  }

  upsert(data: any, options?: any) {
    this._upsertData = Array.isArray(data) ? data : [data];
    this._upsertOptions = options || {};
    return this;
  }

  delete() {
    this._deleteMode = true;
    return this;
  }

  eq(col: string, val: any) { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: any) { this.filters.push((r) => r[col] !== val); return this; }
  gt(col: string, val: any) { this.filters.push((r) => r[col] > val); return this; }
  gte(col: string, val: any) { this.filters.push((r) => r[col] >= val); return this; }
  lt(col: string, val: any) { this.filters.push((r) => r[col] < val); return this; }
  lte(col: string, val: any) { this.filters.push((r) => r[col] <= val); return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  ilike(col: string, pattern: string) {
    const p = pattern.replace(/%/g, "").toLowerCase();
    this.filters.push((r) => String(r[col] || "").toLowerCase().includes(p));
    return this;
  }
  is(col: string, val: any) { this.filters.push((r) => r[col] === val); return this; }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this._orderBy.push({ col, asc: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst ?? false });
    return this;
  }

  limit(n: number) { this._limit = n; return this; }

  range(from: number, to: number) {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  single() { this._single = true; return this; }

  // Resolve the query
  then(resolve: (result: QueryResult) => void, reject?: (err: any) => void) {
    try {
      resolve(this._execute());
    } catch (e) {
      if (reject) reject(e); else resolve({ data: null, error: e });
    }
  }

  private _execute(): QueryResult {
    const rows = store[this.table] || [];

    // DELETE
    if (this._deleteMode) {
      const before = rows.length;
      store[this.table] = rows.filter((r) => !this.filters.every((f) => f(r)));
      return { data: null, error: null };
    }

    // INSERT
    if (this._insertData) {
      const inserted: any[] = [];
      for (const item of this._insertData) {
        const row = {
          id: item.id || uuid(),
          user_id: item.user_id || MOCK_USER_ID,
          ...item,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        rows.push(row);
        inserted.push(row);
      }
      if (this._single) return { data: inserted[0] || null, error: null };
      return { data: inserted, error: null };
    }

    // UPSERT
    if (this._upsertData) {
      const inserted: any[] = [];
      const conflictCols = this._upsertOptions.onConflict?.split(",").map((c: string) => c.trim()) || ["id"];
      for (const item of this._upsertData) {
        const existing = rows.findIndex((r) => conflictCols.every((c: string) => r[c] === item[c]));
        if (existing >= 0) {
          if (!this._upsertOptions.ignoreDuplicates) {
            Object.assign(rows[existing], item, { updated_at: new Date().toISOString() });
            inserted.push(rows[existing]);
          }
        } else {
          const row = {
            id: item.id || uuid(),
            user_id: item.user_id || MOCK_USER_ID,
            ...item,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          rows.push(row);
          inserted.push(row);
        }
      }
      if (this._single) return { data: inserted[0] || null, error: null };
      return { data: inserted, error: null };
    }

    // UPDATE
    if (this._updateData) {
      const updated: any[] = [];
      for (const r of rows) {
        if (this.filters.every((f) => f(r))) {
          Object.assign(r, this._updateData, { updated_at: new Date().toISOString() });
          updated.push(r);
        }
      }
      if (this._single) return { data: updated[0] || null, error: null };
      return { data: updated, error: null };
    }

    // SELECT
    let result = rows.filter((r) => this.filters.every((f) => f(r)));
    const totalCount = result.length;

    // Order
    for (const o of [...this._orderBy].reverse()) {
      result.sort((a, b) => {
        const av = a[o.col], bv = b[o.col];
        if (av == null && bv == null) return 0;
        if (av == null) return o.nullsFirst ? -1 : 1;
        if (bv == null) return o.nullsFirst ? 1 : -1;
        if (av < bv) return o.asc ? -1 : 1;
        if (av > bv) return o.asc ? 1 : -1;
        return 0;
      });
    }

    // Range / limit
    if (this._rangeFrom !== null && this._rangeTo !== null) {
      result = result.slice(this._rangeFrom, this._rangeTo + 1);
    } else if (this._limit !== null) {
      result = result.slice(0, this._limit);
    }

    // Handle joined selects like "*, trade:trades(*)"
    if (this._selectColumns && this._selectColumns.includes(":")) {
      const joinMatch = this._selectColumns.match(/(\w+):(\w+)\(\*\)/);
      if (joinMatch) {
        const [, alias, joinTable] = joinMatch;
        const joinRows = store[joinTable] || [];
        const fkCol = alias === "trade" ? "trade_id" : `${alias}_id`;
        result = result.map((r) => ({
          ...r,
          [alias]: joinRows.find((jr) => jr.id === r[fkCol]) || null,
        }));
      }
    }

    if (this._single) {
      return { data: result[0] || null, error: result[0] ? null : null };
    }

    const out: QueryResult = { data: result, error: null };
    if (this._count === "exact") out.count = totalCount;
    return out;
  }
}

// ---------- Mock Storage ----------

const memoryStorage: Record<string, string> = {};

class MockStorageBucket {
  private bucket: string;
  constructor(bucket: string) { this.bucket = bucket; }

  async upload(path: string, file: Blob | File, _opts?: any) {
    // Store as data URL in memory
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary);
    const type = (file as any).type || "image/png";
    memoryStorage[`${this.bucket}/${path}`] = `data:${type};base64,${base64}`;
    return { data: { path }, error: null };
  }

  getPublicUrl(path: string) {
    const url = memoryStorage[`${this.bucket}/${path}`] || `/mock-storage/${this.bucket}/${path}`;
    return { data: { publicUrl: url } };
  }

  async remove(paths: string[]) {
    for (const p of paths) delete memoryStorage[`${this.bucket}/${p}`];
    return { data: null, error: null };
  }
}

// ---------- Mock Auth ----------

const mockUser = {
  id: MOCK_USER_ID,
  email: "demo@rawjournal.pro",
  app_metadata: {},
  user_metadata: { full_name: "Demo Trader" },
  aud: "authenticated",
  created_at: "2025-06-01T00:00:00Z",
};

const mockAuth = {
  async getUser() {
    return { data: { user: mockUser }, error: null };
  },
  async signInWithPassword(_creds: any) {
    return { data: { user: mockUser, session: { access_token: "mock-token" } }, error: null };
  },
  async signUp(_creds: any) {
    return { data: { user: mockUser, session: null }, error: null };
  },
  async signOut() {
    return { error: null };
  },
  onAuthStateChange(_cb: any) {
    return { data: { subscription: { unsubscribe() {} } } };
  },
};

// ---------- Export mock client ----------

export function createMockClient() {
  return {
    auth: mockAuth,
    from(table: string) {
      return new MockQueryBuilder(table);
    },
    storage: {
      from(bucket: string) {
        return new MockStorageBucket(bucket);
      },
    },
    rpc(_fn: string, _params?: any) {
      return Promise.resolve({ data: null, error: null });
    },
  };
}
