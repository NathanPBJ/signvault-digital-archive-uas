from __future__ import annotations

import argparse
import base64
import cgi
import hashlib
import json
import mimetypes
import os
import re
import shutil
import sqlite3
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"
KEY_DIR = BASE_DIR / "keys"
DB_PATH = DATA_DIR / "archive.db"
PRIVATE_KEY_PATH = KEY_DIR / "private_key.pem"
PUBLIC_KEY_PATH = KEY_DIR / "public_key.pem"
MAX_UPLOAD_SIZE = 25 * 1024 * 1024


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    KEY_DIR.mkdir(parents=True, exist_ok=True)


def ensure_keys() -> None:
    if PRIVATE_KEY_PATH.exists() and PUBLIC_KEY_PATH.exists():
        return

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    PRIVATE_KEY_PATH.write_bytes(private_bytes)
    PUBLIC_KEY_PATH.write_bytes(public_bytes)


def load_private_key():
    return serialization.load_pem_private_key(PRIVATE_KEY_PATH.read_bytes(), password=None)


def load_public_key():
    return serialization.load_pem_public_key(PUBLIC_KEY_PATH.read_bytes())


def public_key_fingerprint() -> str:
    public_key = load_public_key()
    der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    digest = hashlib.sha256(der).hexdigest().upper()
    return ":".join(digest[i : i + 2] for i in range(0, 32, 2))


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                owner TEXT NOT NULL,
                signer TEXT NOT NULL,
                classification TEXT NOT NULL,
                filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                sha256 TEXT NOT NULL,
                signature_b64 TEXT NOT NULL,
                signature_algorithm TEXT NOT NULL,
                public_key_fingerprint TEXT NOT NULL,
                created_at TEXT NOT NULL,
                verified_at TEXT,
                last_verification_status TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT,
                action TEXT NOT NULL,
                detail TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def db_row_to_dict(row: sqlite3.Row) -> dict:
    return {key: row[key] for key in row.keys()}


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sign_hash(hash_hex: str) -> bytes:
    private_key = load_private_key()
    return private_key.sign(
        bytes.fromhex(hash_hex),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256(),
    )


def verify_hash_signature(hash_hex: str, signature_b64: str) -> bool:
    public_key = load_public_key()
    try:
        public_key.verify(
            base64.b64decode(signature_b64),
            bytes.fromhex(hash_hex),
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )
        return True
    except InvalidSignature:
        return False


def sanitize_filename(filename: str) -> str:
    filename = Path(filename or "document.bin").name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", filename).strip()
    return cleaned or "document.bin"


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict | list) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)


def error_response(handler: BaseHTTPRequestHandler, status: int, message: str) -> None:
    json_response(handler, status, {"error": message, "status": status})


def add_audit_event(document_id: str | None, action: str, detail: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO audit_events (document_id, action, detail, created_at) VALUES (?, ?, ?, ?)",
            (document_id, action, detail, utc_now()),
        )


def parse_multipart(handler: BaseHTTPRequestHandler) -> cgi.FieldStorage:
    content_length = int(handler.headers.get("Content-Length", "0"))
    if content_length <= 0:
        raise ValueError("Body request kosong.")
    if content_length > MAX_UPLOAD_SIZE:
        raise ValueError("Ukuran file melebihi batas 25 MB.")

    content_type = handler.headers.get("Content-Type", "")
    if not content_type.startswith("multipart/form-data"):
        raise ValueError("Gunakan multipart/form-data.")

    return cgi.FieldStorage(
        fp=handler.rfile,
        headers=handler.headers,
        environ={
            "REQUEST_METHOD": "POST",
            "CONTENT_TYPE": content_type,
            "CONTENT_LENGTH": str(content_length),
        },
    )


def form_value(form: cgi.FieldStorage, name: str, default: str = "") -> str:
    field = form[name] if name in form else None
    if field is None or getattr(field, "file", None) is not None and field.filename:
        return default
    return str(field.value).strip() or default


def form_file(form: cgi.FieldStorage, name: str) -> tuple[str, bytes]:
    if name not in form:
        raise ValueError("File dokumen wajib diupload.")
    field = form[name]
    if isinstance(field, list):
        field = field[0]
    if not getattr(field, "filename", ""):
        raise ValueError("File dokumen wajib diupload.")
    data = field.file.read()
    if not data:
        raise ValueError("File tidak boleh kosong.")
    return sanitize_filename(field.filename), data


class ArchiveHandler(BaseHTTPRequestHandler):
    server_version = "DigitalArchive/1.0"

    def log_message(self, format: str, *args) -> None:
        return

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path

        if path == "/api/health":
            return json_response(
                self,
                HTTPStatus.OK,
                {
                    "ok": True,
                    "service": "Digital Signature Archive",
                    "public_key_fingerprint": public_key_fingerprint(),
                    "time": utc_now(),
                },
            )

        if path == "/api/public-key":
            return json_response(
                self,
                HTTPStatus.OK,
                {
                    "fingerprint": public_key_fingerprint(),
                    "algorithm": "RSA-PSS-3072 / SHA-256",
                    "public_key_pem": PUBLIC_KEY_PATH.read_text(encoding="utf-8"),
                },
            )

        if path == "/api/documents":
            return self.handle_list_documents()

        if path.startswith("/api/documents/"):
            parts = [unquote(part) for part in path.strip("/").split("/")]
            if len(parts) == 3:
                return self.handle_document_detail(parts[2])
            if len(parts) == 4 and parts[3] == "download":
                return self.handle_download(parts[2])

        return error_response(self, HTTPStatus.NOT_FOUND, "Endpoint tidak ditemukan.")

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            if path == "/api/documents":
                return self.handle_create_document()
            if path == "/api/verify":
                return self.handle_verify_document()
            return error_response(self, HTTPStatus.NOT_FOUND, "Endpoint tidak ditemukan.")
        except ValueError as exc:
            return error_response(self, HTTPStatus.BAD_REQUEST, str(exc))
        except Exception as exc:
            return error_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, f"Server error: {exc}")

    def handle_list_documents(self) -> None:
        with get_conn() as conn:
            rows = conn.execute(
                """
                SELECT id, title, category, owner, signer, classification, filename, size_bytes,
                       sha256, signature_algorithm, public_key_fingerprint, created_at,
                       verified_at, last_verification_status
                FROM documents
                ORDER BY created_at DESC
                """
            ).fetchall()
        return json_response(self, HTTPStatus.OK, {"documents": [db_row_to_dict(row) for row in rows]})

    def handle_document_detail(self, document_id: str) -> None:
        with get_conn() as conn:
            doc = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
            events = conn.execute(
                """
                SELECT action, detail, created_at
                FROM audit_events
                WHERE document_id = ?
                ORDER BY created_at DESC
                LIMIT 10
                """,
                (document_id,),
            ).fetchall()
        if not doc:
            return error_response(self, HTTPStatus.NOT_FOUND, "Dokumen tidak ditemukan.")

        payload = db_row_to_dict(doc)
        payload["audit_events"] = [db_row_to_dict(event) for event in events]
        return json_response(self, HTTPStatus.OK, {"document": payload})

    def handle_download(self, document_id: str) -> None:
        with get_conn() as conn:
            doc = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not doc:
            return error_response(self, HTTPStatus.NOT_FOUND, "Dokumen tidak ditemukan.")

        file_path = UPLOAD_DIR / doc["stored_filename"]
        if not file_path.exists():
            return error_response(self, HTTPStatus.NOT_FOUND, "File arsip tidak ditemukan di storage.")

        body = file_path.read_bytes()
        mime_type = doc["mime_type"] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Disposition", f'attachment; filename="{doc["filename"]}"')
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def handle_create_document(self) -> None:
        form = parse_multipart(self)
        filename, file_bytes = form_file(form, "file")

        title = form_value(form, "title", Path(filename).stem)
        category = form_value(form, "category", "Akademik")
        owner = form_value(form, "owner", "Institusi")
        signer = form_value(form, "signer", "Admin Arsip")
        classification = form_value(form, "classification", "Internal")

        document_id = str(uuid.uuid4())
        suffix = Path(filename).suffix[:16]
        stored_filename = f"{document_id}{suffix}"
        sha256_hex = sha256_bytes(file_bytes)
        signature = sign_hash(sha256_hex)
        signature_b64 = base64.b64encode(signature).decode("ascii")
        mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        target = UPLOAD_DIR / stored_filename
        target.write_bytes(file_bytes)

        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO documents (
                    id, title, category, owner, signer, classification, filename, stored_filename,
                    mime_type, size_bytes, sha256, signature_b64, signature_algorithm,
                    public_key_fingerprint, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    document_id,
                    title,
                    category,
                    owner,
                    signer,
                    classification,
                    filename,
                    stored_filename,
                    mime_type,
                    len(file_bytes),
                    sha256_hex,
                    signature_b64,
                    "RSA-PSS-3072 / SHA-256",
                    public_key_fingerprint(),
                    utc_now(),
                ),
            )
        add_audit_event(document_id, "SIGNED", f"Dokumen {filename} ditandatangani oleh {signer}.")

        return json_response(
            self,
            HTTPStatus.CREATED,
            {
                "document": {
                    "id": document_id,
                    "title": title,
                    "filename": filename,
                    "sha256": sha256_hex,
                    "signature_b64": signature_b64,
                    "signature_algorithm": "RSA-PSS-3072 / SHA-256",
                    "public_key_fingerprint": public_key_fingerprint(),
                    "created_at": utc_now(),
                }
            },
        )

    def handle_verify_document(self) -> None:
        form = parse_multipart(self)
        document_id = form_value(form, "document_id")
        if not document_id:
            raise ValueError("Pilih dokumen arsip untuk diverifikasi.")
        filename, file_bytes = form_file(form, "file")

        with get_conn() as conn:
            doc = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not doc:
            raise ValueError("Dokumen arsip tidak ditemukan.")

        computed_hash = sha256_bytes(file_bytes)
        hash_matches = computed_hash == doc["sha256"]
        signature_valid = verify_hash_signature(computed_hash, doc["signature_b64"])
        status = "VALID" if hash_matches and signature_valid else "TAMPERED"

        with get_conn() as conn:
            conn.execute(
                "UPDATE documents SET verified_at = ?, last_verification_status = ? WHERE id = ?",
                (utc_now(), status, document_id),
            )
        detail = (
            f"Verifikasi file {filename}: hash_matches={hash_matches}, "
            f"signature_valid={signature_valid}."
        )
        add_audit_event(document_id, "VERIFIED", detail)

        return json_response(
            self,
            HTTPStatus.OK,
            {
                "result": {
                    "status": status,
                    "filename": filename,
                    "stored_filename": doc["filename"],
                    "document_id": document_id,
                    "expected_sha256": doc["sha256"],
                    "computed_sha256": computed_hash,
                    "hash_matches": hash_matches,
                    "signature_valid": signature_valid,
                    "verified_at": utc_now(),
                    "public_key_fingerprint": doc["public_key_fingerprint"],
                }
            },
        )


def bootstrap() -> None:
    ensure_directories()
    ensure_keys()
    init_db()


def main() -> None:
    parser = argparse.ArgumentParser(description="Digital Signature Archive API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    bootstrap()
    server = ThreadingHTTPServer((args.host, args.port), ArchiveHandler)
    print(f"Digital Signature Archive API running at http://{args.host}:{args.port}")
    print(f"Public key fingerprint: {public_key_fingerprint()}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
