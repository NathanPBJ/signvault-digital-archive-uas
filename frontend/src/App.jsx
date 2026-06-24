import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  CircleAlert,
  Download,
  FileCheck2,
  FileLock2,
  FileSearch,
  Fingerprint,
  KeyRound,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const CATEGORIES = ['Akademik', 'Legal', 'Surat Resmi', 'Sertifikat', 'Kontrak'];
const CLASSIFICATIONS = ['Internal', 'Rahasia', 'Publik', 'Terbatas'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function shortHash(hash = '') {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function dateLabel(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal.');
  return data;
}

async function apiFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Backend tidak terhubung. Jalankan server Python di http://127.0.0.1:8000 lalu coba lagi.');
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Field({ label, children, full }) {
  return (
    <label className={`field${full ? ' field-full' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }) {
  const normalized = (status || 'UNVERIFIED').toUpperCase();
  const cls =
    normalized === 'VALID'
      ? 'pill pill-valid'
      : normalized === 'TAMPERED'
      ? 'pill pill-tampered'
      : 'pill pill-unverified';
  return <span className={cls}>{normalized}</span>;
}

function Dropzone({ fileRef, fileName, onChange, hint, compact }) {
  const hasFile = Boolean(fileName);
  return (
    <label className={`dropzone${hasFile ? ' has-file' : ''}`} style={compact ? { minHeight: 88 } : {}}>
      <UploadCloud size={20} strokeWidth={1.5} />
      {hasFile ? (
        <span className="dropzone-name">{fileName}</span>
      ) : (
        <span className="dropzone-name" style={{ color: 'var(--gray-400)', fontWeight: 500 }}>
          Seret file ke sini, atau klik untuk pilih
        </span>
      )}
      <span className="dropzone-hint">{hint}</span>
      <input ref={fileRef} type="file" onChange={onChange} />
    </label>
  );
}

// ─── Sign Tab ────────────────────────────────────────────────────────────────

function SignTab({ busy, onSign }) {
  const signFileRef = useRef(null);
  const [signFileName, setSignFileName] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: 'Akademik',
    owner: 'Fakultas / Prodi',
    signer: 'Admin Arsip Akademik',
    classification: 'Internal',
  });

  function patch(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const file = signFileRef.current?.files?.[0];
    const ok = await onSign({ form, file });
    if (ok) {
      setForm((f) => ({ ...f, title: '' }));
      setSignFileName('');
      if (signFileRef.current) signFileRef.current.value = '';
    }
  }

  return (
    <div className="workflow-grid">
      {/* Step 1 — Metadata */}
      <div className="step-card">
        <div className="step-header">
          <div className="step-number">1</div>
          <div>
            <div className="step-title">Metadata Dokumen</div>
            <div className="step-desc">Isi informasi identitas dokumen sebelum penandatanganan.</div>
          </div>
        </div>

        <div className="sign-form">
          <Field label="Judul Dokumen" full>
            <input
              id="sign-title"
              value={form.title}
              onChange={(e) => patch('title', e.target.value)}
              placeholder="cth. Surat Keterangan Aktif Kuliah"
            />
          </Field>

          <Field label="Kategori">
            <select id="sign-category" value={form.category} onChange={(e) => patch('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Klasifikasi">
            <select id="sign-classification" value={form.classification} onChange={(e) => patch('classification', e.target.value)}>
              {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Pemilik Dokumen" full>
            <input
              id="sign-owner"
              value={form.owner}
              onChange={(e) => patch('owner', e.target.value)}
            />
          </Field>

          <Field label="Penandatangan" full>
            <input
              id="sign-signer"
              value={form.signer}
              onChange={(e) => patch('signer', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Step 2 — File + Sign */}
      <div className="step-card">
        <div className="step-header">
          <div className="step-number">2</div>
          <div>
            <div className="step-title">Lampirkan &amp; Tanda Tangani</div>
            <div className="step-desc">Unggah file dokumen. Tanda tangan RSA-PSS akan diterapkan secara otomatis.</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <Dropzone
            fileRef={signFileRef}
            fileName={signFileName}
            onChange={(e) => setSignFileName(e.target.files?.[0]?.name || '')}
            hint="PDF, DOCX, gambar, atau teks — maks. 25 MB"
          />

          <button id="sign-submit" className="btn-primary" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={17} /> : <FileLock2 size={17} />}
            Tanda Tangani &amp; Arsipkan
          </button>
        </form>

        {/* Algorithm note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: 12 }}>
          <Fingerprint size={14} />
          Digest SHA-256 · Tanda tangan RSA-PSS · Disimpan di arsip
        </div>
      </div>
    </div>
  );
}

// ─── Verify Tab ───────────────────────────────────────────────────────────────

function VerifyTab({ documents, busy, onVerify }) {
  const verifyFileRef = useRef(null);
  const [verifyFileName, setVerifyFileName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const file = verifyFileRef.current?.files?.[0];
    const result = await onVerify({ selectedId, file });
    if (result) setVerifyResult(result);
  }

  return (
    <div className="workflow-grid">
      {/* Verify form */}
      <div className="step-card">
        <div className="step-header">
          <div className="step-number" style={{ background: 'var(--gray-400)' }}>
            <ShieldCheck size={13} />
          </div>
          <div>
            <div className="step-title">Verifikasi Integritas</div>
            <div className="step-desc">
              Pilih dokumen arsip dan unggah salinan file untuk memeriksa keasliannya.
            </div>
          </div>
        </div>

        <form className="verify-panel" onSubmit={handleSubmit}>
          <Field label="Dokumen Referensi dari Arsip">
            <select
              id="verify-ref"
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setVerifyResult(null); }}
            >
              <option value="">— Pilih dokumen arsip —</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
          </Field>

          <Dropzone
            fileRef={verifyFileRef}
            fileName={verifyFileName}
            onChange={(e) => { setVerifyFileName(e.target.files?.[0]?.name || ''); setVerifyResult(null); }}
            hint="Unggah file yang ingin diverifikasi terhadap arsip"
            compact
          />

          <button id="verify-submit" className="btn-primary" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={17} /> : <ShieldCheck size={17} />}
            Jalankan Verifikasi
          </button>
        </form>
      </div>

      {/* Result */}
      <div className="step-card" style={{ alignContent: 'start' }}>
        <div className="step-header">
          <div className="step-number" style={{ background: 'var(--gray-200)', color: 'var(--gray-500)' }}>?</div>
          <div>
            <div className="step-title">Hasil Verifikasi</div>
            <div className="step-desc">Hasil kriptografi akan muncul di sini setelah verifikasi dijalankan.</div>
          </div>
        </div>

        {verifyResult ? (
          <div className={`verdict ${verifyResult.status === 'VALID' ? 'valid' : 'tampered'}`}>
            <div className="verdict-headline">
              {verifyResult.status === 'VALID'
                ? <BadgeCheck size={22} />
                : <CircleAlert size={22} />}
              {verifyResult.status === 'VALID' ? 'Dokumen Asli' : 'Manipulasi Terdeteksi'}
              <span className="verdict-stamp">{verifyResult.status}</span>
            </div>

            <dl className="verdict-grid">
              <dt>Kecocokan Hash</dt>
              <dd>{verifyResult.hash_matches ? 'Ya — hash cocok' : 'Tidak — hash tidak cocok'}</dd>
              <dt>Tanda Tangan</dt>
              <dd>{verifyResult.signature_valid ? 'RSA-PSS Valid' : 'Tanda tangan tidak valid'}</dd>
              <dt>SHA-256 Terhitung</dt>
              <dd>{verifyResult.computed_sha256 || '—'}</dd>
            </dl>
          </div>
        ) : (
          <div style={{
            flex: 1,
            minHeight: 140,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--gray-300)',
            fontSize: 13,
            border: '1px dashed var(--gray-200)',
            borderRadius: 8,
            textAlign: 'center',
            padding: 20,
          }}>
            <div>
              <ShieldCheck size={28} strokeWidth={1} style={{ marginBottom: 8, color: 'var(--gray-200)' }} />
              <div>Belum ada hasil — pilih dokumen dan unggah file untuk diverifikasi.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Archive Tab ──────────────────────────────────────────────────────────────

function ArchiveTab({ documents, loading, onRefresh }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) =>
      `${doc.title} ${doc.filename} ${doc.category} ${doc.owner} ${doc.signer}`.toLowerCase().includes(needle)
    );
  }, [documents, query]);

  async function selectDoc(doc) {
    setSelectedId(doc.id);
    try {
      const data = await apiFetch(`${API_BASE}/api/documents/${doc.id}`).then(readJson);
      setSelectedDoc(data.document);
    } catch {
      setSelectedDoc(doc);
    }
  }

  function downloadSelected() {
    if (!selectedId) return;
    window.open(`${API_BASE}/api/documents/${selectedId}/download`, '_blank', 'noopener,noreferrer');
  }

  const activeDoc = selectedDoc?.id === selectedId ? selectedDoc : documents.find((d) => d.id === selectedId);

  return (
    <div className="archive-layout">
      {/* Ledger */}
      <div>
        <div className="ledger-toolbar">
          <div className="search-wrap">
            <Search size={14} style={{ color: 'var(--gray-300)', flexShrink: 0 }} />
            <input
              id="archive-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari arsip…"
            />
          </div>
          <button id="archive-refresh" className="icon-btn" onClick={onRefresh} disabled={loading} title="Perbarui arsip">
            {loading ? <Loader2 className="spin" size={15} /> : <RefreshCcw size={15} />}
          </button>
        </div>

        <div className="ledger">
          <div className="ledger-head">
            <span className="ledger-col-label">Dokumen</span>
            <span className="ledger-col-label">Kategori</span>
            <span className="ledger-col-label">SHA-256</span>
            <span className="ledger-col-label">Status</span>
          </div>

          {filtered.length === 0 ? (
            <div className="ledger-empty">
              <Archive size={28} strokeWidth={1} />
              <strong>{query ? 'Tidak ada hasil ditemukan' : 'Arsip masih kosong'}</strong>
              <span>{query ? 'Coba ubah kata kunci pencarian.' : 'Tanda tangani dokumen untuk menambah rekaman pertama.'}</span>
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                className={`ledger-row${doc.id === selectedId ? ' selected' : ''}`}
                onClick={() => selectDoc(doc)}
                id={`doc-row-${doc.id}`}
              >
                <div>
                  <span className="ledger-doc-name">{doc.title}</span>
                  <span className="ledger-doc-file">{doc.filename}</span>
                </div>
                <span className="ledger-cat">{doc.category}</span>
                <span className="ledger-hash mono">{shortHash(doc.sha256)}</span>
                <StatusPill status={doc.last_verification_status} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Passport */}
      <div className="passport">
        {activeDoc ? (
          <>
            <div className="passport-header">
              <div style={{ minWidth: 0 }}>
                <FileLock2 size={14} style={{ opacity: 0.6, marginBottom: 4 }} />
                <div className="passport-title">{activeDoc.title}</div>
                <div className="passport-file">{activeDoc.filename}</div>
              </div>
              <button
                id="passport-download"
                className="icon-btn"
                onClick={downloadSelected}
                title="Unduh"
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', flexShrink: 0 }}
              >
                <Download size={15} />
              </button>
            </div>

            <div className="passport-body">
              <dl className="passport-row">
                <dt>Pemilik</dt>
                <dd>{activeDoc.owner || '—'}</dd>
                <dt>Penandatangan</dt>
                <dd>{activeDoc.signer || '—'}</dd>
                <dt>Kategori</dt>
                <dd>{activeDoc.category || '—'}</dd>
                <dt>Klasifikasi</dt>
                <dd>{activeDoc.classification || '—'}</dd>
                <dt>Ukuran</dt>
                <dd>{formatBytes(activeDoc.size_bytes)}</dd>
                <dt>Ditandatangani</dt>
                <dd>{dateLabel(activeDoc.created_at)}</dd>
                <dt>Algoritma</dt>
                <dd>{activeDoc.signature_algorithm || '—'}</dd>
                <dt>Status</dt>
                <dd><StatusPill status={activeDoc.last_verification_status} /></dd>
              </dl>

              <div className="passport-divider" />

              <div className="hash-entry">
                <span className="hash-label">Hash SHA-256</span>
                <span className="hash-value">{activeDoc.sha256 || '—'}</span>
              </div>

              <div className="hash-entry">
                <span className="hash-label">Sidik Jari Kunci</span>
                <span className="hash-value">{activeDoc.public_key_fingerprint || '—'}</span>
              </div>

              {activeDoc.audit_events?.length > 0 && (
                <>
                  <div className="passport-divider" />
                  <div>
                    <span className="hash-label" style={{ display: 'block', marginBottom: 10 }}>Riwayat Audit</span>
                    <div className="audit-trail">
                      {activeDoc.audit_events.map((ev) => (
                        <div key={`${ev.created_at}-${ev.action}`} className="audit-item">
                          <div className="audit-dot" />
                          <div>
                            <div className="audit-action">{ev.action}</div>
                            <div className="audit-detail">{ev.detail}</div>
                            <time className="audit-time">{dateLabel(ev.created_at)}</time>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="passport-empty">
            <FileSearch size={28} strokeWidth={1} />
            <strong>Belum ada rekaman dipilih</strong>
            <span>Klik baris mana saja pada arsip untuk memeriksa paspor tanda tangannya.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('archive');
  const [documents, setDocuments] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [docData, healthData] = await Promise.all([
        apiFetch(`${API_BASE}/api/documents`).then(readJson),
        apiFetch(`${API_BASE}/api/health`).then(readJson),
      ]);
      setDocuments(docData.documents || []);
      setHealth(healthData);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSign({ form, file }) {
    if (!file) { showToast('Pilih file dokumen terlebih dahulu.'); return false; }
    const payload = new FormData();
    payload.append('file', file);
    Object.entries(form).forEach(([k, v]) => payload.append(k, v));
    setBusy(true);
    try {
      const data = await apiFetch(`${API_BASE}/api/documents`, { method: 'POST', body: payload }).then(readJson);
      showToast(`Ditandatangani & diarsipkan: ${data.document.title}`);
      await loadAll();
      setTab('archive');
      return true;
    } catch (err) {
      showToast(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify({ selectedId, file }) {
    if (!selectedId) { showToast('Pilih dokumen arsip terlebih dahulu.'); return null; }
    if (!file) { showToast('Unggah file yang ingin diverifikasi.'); return null; }
    const payload = new FormData();
    payload.append('document_id', selectedId);
    payload.append('file', file);
    setBusy(true);
    try {
      const data = await apiFetch(`${API_BASE}/api/verify`, { method: 'POST', body: payload }).then(readJson);
      showToast(data.result.status === 'VALID' ? 'Dokumen terverifikasi — VALID.' : 'Peringatan: dokumen terindikasi DIMANIPULASI.');
      await loadAll();
      return data.result;
    } catch (err) {
      showToast(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const fingerprint = health?.public_key_fingerprint || null;

  return (
    <div className="app-shell">
      {/* Top Navigation */}
      <nav className="topnav" role="navigation" aria-label="Navigasi utama">
        <a href="#" className="brand" aria-label="Beranda SignVault">
          <div className="brand-seal" aria-hidden="true">
            <FileLock2 size={16} />
          </div>
          <div>
            <div className="brand-name">SignVault</div>
            <div className="brand-sub">Arsip Akademik</div>
          </div>
        </a>

        <div className="nav-tabs" role="tablist">
          <button
            id="tab-archive"
            role="tab"
            aria-selected={tab === 'archive'}
            className={`nav-tab${tab === 'archive' ? ' active' : ''}`}
            onClick={() => setTab('archive')}
          >
            <Archive size={15} />
            Arsip
          </button>
          <button
            id="tab-sign"
            role="tab"
            aria-selected={tab === 'sign'}
            className={`nav-tab${tab === 'sign' ? ' active' : ''}`}
            onClick={() => setTab('sign')}
          >
            <FileCheck2 size={15} />
            Tanda Tangan
          </button>
          <button
            id="tab-verify"
            role="tab"
            aria-selected={tab === 'verify'}
            className={`nav-tab${tab === 'verify' ? ' active' : ''}`}
            onClick={() => setTab('verify')}
          >
            <ShieldCheck size={15} />
            Verifikasi
          </button>
        </div>

        <div className="nav-end">
          {fingerprint && (
            <div className="key-badge" title={fingerprint}>
              <KeyRound size={12} style={{ flexShrink: 0 }} />
              <code>{fingerprint}</code>
            </div>
          )}
        </div>
      </nav>

      {/* Workspace */}
      <main className="workspace" role="main">
        {/* Page Header */}
        <header className="page-header">
          <div>
            <p className="page-kicker">Keamanan Data dan Jaringan</p>
            <h1 className="page-title">
              {tab === 'archive' && 'Arsip Dokumen'}
              {tab === 'sign' && 'Tanda Tangan Dokumen'}
              {tab === 'verify' && 'Verifikasi Integritas'}
            </h1>
          </div>
          {tab === 'archive' && (
            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>
              {documents.length} rekaman dalam arsip
            </span>
          )}
          {tab === 'sign' && (
            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>
              RSA-PSS · SHA-256
            </span>
          )}
          {tab === 'verify' && (
            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>
              Pemeriksaan integritas kriptografi
            </span>
          )}
        </header>

        {/* Tab Content */}
        {tab === 'archive' && (
          <ArchiveTab documents={documents} loading={loading} onRefresh={loadAll} />
        )}
        {tab === 'sign' && (
          <SignTab busy={busy} onSign={handleSign} />
        )}
        {tab === 'verify' && (
          <VerifyTab documents={documents} busy={busy} onVerify={handleVerify} />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast}</span>
          <button className="toast-close" aria-label="Tutup notifikasi" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
