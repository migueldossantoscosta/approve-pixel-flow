export type VersionStatus = "pending_review" | "changes_requested" | "approved";

export type FeedbackPin = {
  id: string;
  x_coord_pct: number;
  y_coord_pct: number;
  comment: string;
  author_name: string;
  is_resolved: boolean;
  created_at: string;
};

export type DeliverableVersion = {
  id: string;
  version_number: number;
  image_url: string;
  status: VersionStatus;
  approved_at: string | null;
  approved_by_name: string | null;
  created_at: string;
  pins: FeedbackPin[];
};

export type ReviewPayload = {
  deliverable: { id: string; title: string };
  project: { title: string; client_name: string | null };
  versions: DeliverableVersion[];
};

/** Draft pin position, before the comment is written. */
export type DraftPin = { x: number; y: number };
