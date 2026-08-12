-- CourseCollab Cora chat history (faculty + student)
-- Apply on the web/backend Postgres database. Mobile syncs via /api/instructor/cora/threads and /api/cora/threads.

CREATE TABLE IF NOT EXISTS cora_chat_threads (
  id VARCHAR(64) PRIMARY KEY,
  portal VARCHAR(16) NOT NULL CHECK (portal IN ('faculty', 'student')),
  owner_id VARCHAR(64) NOT NULL,
  course_id INTEGER,
  capability_id VARCHAR(64),
  title VARCHAR(256) NOT NULL DEFAULT 'Cora conversation',
  preview VARCHAR(512) NOT NULL DEFAULT '',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cora_chat_threads_owner_updated
  ON cora_chat_threads (portal, owner_id, course_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cora_chat_session_prefs (
  portal VARCHAR(16) NOT NULL CHECK (portal IN ('faculty', 'student')),
  owner_id VARCHAR(64) NOT NULL,
  course_id INTEGER NOT NULL DEFAULT 0,
  active_thread_id VARCHAR(64),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (portal, owner_id, course_id),
  CONSTRAINT fk_cora_chat_active_thread
    FOREIGN KEY (active_thread_id)
    REFERENCES cora_chat_threads (id)
    ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION cora_chat_threads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cora_chat_threads_updated_at ON cora_chat_threads;
CREATE TRIGGER trg_cora_chat_threads_updated_at
  BEFORE UPDATE ON cora_chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION cora_chat_threads_set_updated_at();
