CREATE TYPE public.version_status AS ENUM ('pending_review','changes_requested','approved');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projects_creator_idx ON public.projects(creator_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX deliverables_project_idx ON public.deliverables(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliverables TO authenticated;
GRANT ALL ON public.deliverables TO service_role;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deliverables" ON public.deliverables FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = auth.uid()));

CREATE TABLE public.versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  image_url TEXT NOT NULL,
  status public.version_status NOT NULL DEFAULT 'pending_review',
  approved_at TIMESTAMPTZ,
  approved_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id, version_number)
);
CREATE INDEX versions_deliverable_idx ON public.versions(deliverable_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.versions TO authenticated;
GRANT ALL ON public.versions TO service_role;
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON public.versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deliverables d JOIN public.projects p ON p.id = d.project_id WHERE d.id = deliverable_id AND p.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.deliverables d JOIN public.projects p ON p.id = d.project_id WHERE d.id = deliverable_id AND p.creator_id = auth.uid()));

CREATE TABLE public.feedback_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
  x_coord_pct DOUBLE PRECISION NOT NULL,
  y_coord_pct DOUBLE PRECISION NOT NULL,
  comment TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Cliente',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX feedback_pins_version_idx ON public.feedback_pins(version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_pins TO authenticated;
GRANT ALL ON public.feedback_pins TO service_role;
ALTER TABLE public.feedback_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pins" ON public.feedback_pins FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.versions v JOIN public.deliverables d ON d.id = v.deliverable_id JOIN public.projects p ON p.id = d.project_id WHERE v.id = version_id AND p.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.versions v JOIN public.deliverables d ON d.id = v.deliverable_id JOIN public.projects p ON p.id = d.project_id WHERE v.id = version_id AND p.creator_id = auth.uid()));

-- Public (token-scoped) access
CREATE OR REPLACE FUNCTION public.get_review(p_token UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'deliverable', jsonb_build_object('id', d.id, 'title', d.title),
    'project', jsonb_build_object('title', p.title, 'client_name', p.client_name),
    'versions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id,
        'version_number', v.version_number,
        'image_url', v.image_url,
        'status', v.status,
        'approved_at', v.approved_at,
        'approved_by_name', v.approved_by_name,
        'created_at', v.created_at,
        'pins', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', fp.id, 'x_coord_pct', fp.x_coord_pct, 'y_coord_pct', fp.y_coord_pct,
            'comment', fp.comment, 'author_name', fp.author_name,
            'is_resolved', fp.is_resolved, 'created_at', fp.created_at
          ) ORDER BY fp.created_at)
          FROM feedback_pins fp WHERE fp.version_id = v.id
        ), '[]'::jsonb)
      ) ORDER BY v.version_number)
      FROM versions v WHERE v.deliverable_id = d.id
    ), '[]'::jsonb)
  )
  FROM deliverables d
  JOIN projects p ON p.id = d.project_id
  WHERE d.share_token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.add_pin_by_token(
  p_token UUID, p_version_id UUID, p_x DOUBLE PRECISION, p_y DOUBLE PRECISION,
  p_comment TEXT, p_author TEXT DEFAULT 'Cliente'
)
RETURNS public.feedback_pins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row versions;
  new_pin feedback_pins;
BEGIN
  SELECT v.* INTO v_row FROM versions v
  JOIN deliverables d ON d.id = v.deliverable_id
  WHERE v.id = p_version_id AND d.share_token = p_token;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'invalid token or version'; END IF;
  IF v_row.status = 'approved' THEN RAISE EXCEPTION 'version already approved'; END IF;
  IF p_x < 0 OR p_x > 100 OR p_y < 0 OR p_y > 100 THEN RAISE EXCEPTION 'coordinates out of range'; END IF;
  IF length(coalesce(p_comment,'')) = 0 THEN RAISE EXCEPTION 'comment required'; END IF;

  INSERT INTO feedback_pins (version_id, x_coord_pct, y_coord_pct, comment, author_name)
  VALUES (p_version_id, p_x, p_y, left(p_comment, 2000), coalesce(nullif(trim(p_author),''), 'Cliente'))
  RETURNING * INTO new_pin;

  UPDATE versions SET status = 'changes_requested'
  WHERE id = p_version_id AND status = 'pending_review';

  RETURN new_pin;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_version_by_token(
  p_token UUID, p_version_id UUID, p_client_name TEXT
)
RETURNS public.versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated versions;
BEGIN
  IF length(coalesce(trim(p_client_name),'')) = 0 THEN RAISE EXCEPTION 'client name required'; END IF;

  UPDATE versions v
  SET status = 'approved', approved_at = now(), approved_by_name = left(trim(p_client_name), 200)
  WHERE v.id = p_version_id
    AND v.status <> 'approved'
    AND EXISTS (SELECT 1 FROM deliverables d WHERE d.id = v.deliverable_id AND d.share_token = p_token)
  RETURNING v.* INTO updated;

  IF updated.id IS NULL THEN RAISE EXCEPTION 'invalid token, version, or already approved'; END IF;
  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.get_review(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_pin_by_token(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_version_by_token(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_pin_by_token(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_version_by_token(UUID, UUID, TEXT) TO anon, authenticated;