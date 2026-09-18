// Replaces Supabase entirely: every project/deliverable/version/pin lives in
// this browser's IndexedDB. There is no server, so a review link only ever
// resolves in the same browser that created it — see the design doc for why
// that trade-off was accepted.
import type { FeedbackPin, ReviewPayload, VersionStatus } from "@/lib/proofsync-types";

const DB_NAME = "proofsync";
const DB_VERSION = 1;

type StoredProject = { id: string; title: string; client_name: string | null; created_at: string };
type StoredDeliverable = {
  id: string;
  project_id: string;
  title: string;
  share_token: string;
  created_at: string;
};
type StoredVersion = {
  id: string;
  deliverable_id: string;
  version_number: number;
  image_blob: Blob;
  status: VersionStatus;
  approved_at: string | null;
  approved_by_name: string | null;
  created_at: string;
};
type StoredPin = {
  id: string;
  version_id: string;
  x_coord_pct: number;
  y_coord_pct: number;
  comment: string;
  author_name: string;
  is_resolved: boolean;
  created_at: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("projects", { keyPath: "id" });
      const deliverables = db.createObjectStore("deliverables", { keyPath: "id" });
      deliverables.createIndex("project_id", "project_id");
      deliverables.createIndex("share_token", "share_token", { unique: true });
      const versions = db.createObjectStore("versions", { keyPath: "id" });
      versions.createIndex("deliverable_id", "deliverable_id");
      const pins = db.createObjectStore("feedback_pins", { keyPath: "id" });
      pins.createIndex("version_id", "version_id");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result: T;
    Promise.resolve(run(t))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return tx(db, [store], "readonly", (t) => reqToPromise(t.objectStore(store).getAll()));
}

async function getByIndex<T>(store: string, index: string, value: string): Promise<T[]> {
  const db = await openDb();
  return tx(db, [store], "readonly", (t) =>
    reqToPromise(t.objectStore(store).index(index).getAll(value)),
  );
}

async function getOneByIndex<T>(
  store: string,
  index: string,
  value: string,
): Promise<T | undefined> {
  const [first] = await getByIndex<T>(store, index, value);
  return first;
}

async function get<T>(store: string, id: string): Promise<T | undefined> {
  const db = await openDb();
  return tx(db, [store], "readonly", (t) => reqToPromise(t.objectStore(store).get(id)));
}

async function put(store: string, record: unknown): Promise<void> {
  const db = await openDb();
  await tx(db, [store], "readwrite", (t) => reqToPromise(t.objectStore(store).put(record)));
}

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ---- Creator dashboard ----

export async function listProjects() {
  const [projects, deliverables] = await Promise.all([
    getAll<StoredProject>("projects"),
    getAll<StoredDeliverable>("deliverables"),
  ]);
  return projects
    .map((p) => ({ ...p, deliverables: deliverables.filter((d) => d.project_id === p.id) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createProject(input: { title: string; client_name: string | null }) {
  await put("projects", { id: newId(), created_at: now(), ...input });
}

export async function getProjectWithDeliverables(projectId: string) {
  const project = await get<StoredProject>("projects", projectId);
  if (!project) return null;
  const deliverables = await getByIndex<StoredDeliverable>("deliverables", "project_id", projectId);
  const withVersions = await Promise.all(
    deliverables.map(async (d) => {
      const versions = await getByIndex<StoredVersion>("versions", "deliverable_id", d.id);
      const withPins = await Promise.all(
        versions.map(async (v) => ({
          id: v.id,
          version_number: v.version_number,
          status: v.status,
          feedback_pins: await getByIndex<StoredPin>("feedback_pins", "version_id", v.id),
        })),
      );
      return { ...d, versions: withPins };
    }),
  );
  return { ...project, deliverables: withVersions };
}

export async function addDeliverable(projectId: string, title: string) {
  await put("deliverables", {
    id: newId(),
    project_id: projectId,
    title,
    share_token: newId(),
    created_at: now(),
  });
}

export async function getDeliverableWithVersions(deliverableId: string) {
  const deliverable = await get<StoredDeliverable>("deliverables", deliverableId);
  if (!deliverable) return null;
  const project = await get<StoredProject>("projects", deliverable.project_id);
  const rawVersions = await getByIndex<StoredVersion>("versions", "deliverable_id", deliverableId);
  const versions = await Promise.all(
    rawVersions
      .sort((a, b) => a.version_number - b.version_number)
      .map(async (v) => ({
        id: v.id,
        version_number: v.version_number,
        image_url: URL.createObjectURL(v.image_blob),
        status: v.status,
        approved_at: v.approved_at,
        approved_by_name: v.approved_by_name,
        created_at: v.created_at,
        pins: await getByIndex<FeedbackPin>("feedback_pins", "version_id", v.id),
      })),
  );
  return {
    deliverable: { ...deliverable, project_id: deliverable.project_id, projects: project },
    versions,
  };
}

export async function addVersion(deliverableId: string, file: File) {
  const existing = await getByIndex<StoredVersion>("versions", "deliverable_id", deliverableId);
  const nextNumber = existing.reduce((max, v) => Math.max(max, v.version_number), 0) + 1;
  await put("versions", {
    id: newId(),
    deliverable_id: deliverableId,
    version_number: nextNumber,
    image_blob: file,
    status: "pending_review" satisfies VersionStatus,
    approved_at: null,
    approved_by_name: null,
    created_at: now(),
  });
}

export async function togglePinResolved(pinId: string) {
  const pin = await get<StoredPin>("feedback_pins", pinId);
  if (!pin) return;
  await put("feedback_pins", { ...pin, is_resolved: !pin.is_resolved });
}

// ---- Public review (same-browser only — see design doc) ----

export async function getReviewByToken(token: string): Promise<ReviewPayload | null> {
  const deliverable = await getOneByIndex<StoredDeliverable>("deliverables", "share_token", token);
  if (!deliverable) return null;
  const project = await get<StoredProject>("projects", deliverable.project_id);
  const rawVersions = await getByIndex<StoredVersion>("versions", "deliverable_id", deliverable.id);
  const versions = await Promise.all(
    rawVersions
      .sort((a, b) => a.version_number - b.version_number)
      .map(async (v) => ({
        id: v.id,
        version_number: v.version_number,
        image_url: URL.createObjectURL(v.image_blob),
        status: v.status,
        approved_at: v.approved_at,
        approved_by_name: v.approved_by_name,
        created_at: v.created_at,
        pins: await getByIndex<FeedbackPin>("feedback_pins", "version_id", v.id),
      })),
  );
  return {
    deliverable: { id: deliverable.id, title: deliverable.title },
    project: { title: project?.title ?? "", client_name: project?.client_name ?? null },
    versions,
  };
}

export async function addPinByToken(input: {
  token: string;
  versionId: string;
  x: number;
  y: number;
  comment: string;
  authorName?: string;
}) {
  const deliverable = await getOneByIndex<StoredDeliverable>(
    "deliverables",
    "share_token",
    input.token,
  );
  if (!deliverable) throw new Error("Link inválido");
  const version = await get<StoredVersion>("versions", input.versionId);
  if (!version || version.deliverable_id !== deliverable.id) throw new Error("Versão inválida");
  if (version.status === "approved") throw new Error("Versão já aprovada");

  const comment = input.comment.trim().slice(0, 2000);
  if (!comment) throw new Error("A nota não pode estar vazia");

  await put("feedback_pins", {
    id: newId(),
    version_id: input.versionId,
    x_coord_pct: Math.min(100, Math.max(0, input.x)),
    y_coord_pct: Math.min(100, Math.max(0, input.y)),
    comment,
    author_name: (input.authorName ?? "Cliente").trim().slice(0, 120) || "Cliente",
    is_resolved: false,
    created_at: now(),
  });

  if (version.status === "pending_review") {
    await put("versions", { ...version, status: "changes_requested" satisfies VersionStatus });
  }
}

export async function approveVersionByToken(input: {
  token: string;
  versionId: string;
  clientName: string;
}) {
  const deliverable = await getOneByIndex<StoredDeliverable>(
    "deliverables",
    "share_token",
    input.token,
  );
  if (!deliverable) throw new Error("Link inválido");
  const version = await get<StoredVersion>("versions", input.versionId);
  if (!version || version.deliverable_id !== deliverable.id) throw new Error("Versão inválida");

  const clientName = input.clientName.trim().slice(0, 200);
  if (!clientName) throw new Error("Indica o teu nome para aprovar");

  await put("versions", {
    ...version,
    status: "approved" satisfies VersionStatus,
    approved_at: now(),
    approved_by_name: clientName,
  });
}
