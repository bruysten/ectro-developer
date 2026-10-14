CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('user','teacher','admin')), active INTEGER NOT NULL DEFAULT 1,
 features TEXT NOT NULL DEFAULT '{}', auth_version INTEGER NOT NULL DEFAULT 1,
 must_change_password INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, last_login TEXT
);
CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', features TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS group_members (group_id TEXT REFERENCES groups(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(group_id,user_id));
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, group_id TEXT REFERENCES groups(id) ON DELETE CASCADE, created_by TEXT REFERENCES users(id) ON DELETE SET NULL, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK ((user_id IS NULL) != (group_id IS NULL)));
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, path TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'file', content TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, UNIQUE(project_id,path));
CREATE TABLE IF NOT EXISTS project_types (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, description TEXT NOT NULL DEFAULT '', language TEXT NOT NULL CHECK(language IN ('web','php','python')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS project_type_files (type_id TEXT REFERENCES project_types(id) ON DELETE CASCADE, path TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', PRIMARY KEY(type_id,path));
CREATE TABLE IF NOT EXISTS file_updates (file_id TEXT REFERENCES files(id) ON DELETE CASCADE, version INTEGER NOT NULL, client_id TEXT NOT NULL, changes TEXT NOT NULL, PRIMARY KEY(file_id,version));
CREATE TABLE IF NOT EXISTS file_editors (file_id TEXT REFERENCES files(id) ON DELETE CASCADE, client_id TEXT NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, touched INTEGER NOT NULL, PRIMARY KEY(file_id,client_id));
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS messages_group ON messages(group_id,id);
CREATE TABLE IF NOT EXISTS connections (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, host TEXT NOT NULL, db_name TEXT NOT NULL, username TEXT NOT NULL, secret TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, event TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS events_date ON events(created_at);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL);
INSERT OR IGNORE INTO settings(key,value) VALUES('features','{"files":true,"editor":true,"html":true,"php":true,"python":true,"database":true,"chat":true}');
INSERT OR IGNORE INTO settings(key,value) VALUES('converter_formats','["csv","tsv","json","xml"]');

CREATE TABLE IF NOT EXISTS chat_attachments (id TEXT PRIMARY KEY,message_id INTEGER NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,name TEXT NOT NULL,extension TEXT NOT NULL,size INTEGER NOT NULL,content BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS chat_state (group_id TEXT PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS chat_presence (group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,touched INTEGER NOT NULL,PRIMARY KEY(group_id,user_id));

CREATE INDEX IF NOT EXISTS group_members_user ON group_members(user_id,group_id);

CREATE TABLE IF NOT EXISTS workspace_uploads (file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,extension TEXT NOT NULL,size INTEGER NOT NULL,content BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS mail_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, subject TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS welcome_mails (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_by TEXT REFERENCES users(id) ON DELETE SET NULL, request_key TEXT NOT NULL UNIQUE, recipient TEXT NOT NULL, template_name TEXT NOT NULL, auth_version INTEGER NOT NULL, payload TEXT, status TEXT NOT NULL CHECK(status IN ('pending','sending','sent','failed','uncertain','expired','cancelled')), error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS welcome_mails_created ON welcome_mails(created_at);
CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', urls TEXT NOT NULL DEFAULT '[]', picture BLOB, picture_mime TEXT, picture_version INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS profile_sharing (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, consent_version TEXT NOT NULL, consent_text TEXT NOT NULL, granted_at TEXT NOT NULL);
