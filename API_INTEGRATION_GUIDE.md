# 📡 Edge-AI Camera Pipeline & GCP Integration Guide

This guide is for the engineer developing the computer vision / camera tracking software and deploying the backend to **Google Cloud Platform (GCP)** under `https://camera.carching.co`.

---

## 📑 Table of Contents
1. [Base URL & Authentication](#1-base-url--authentication)
2. [Data Ingestion Endpoints](#2-data-ingestion-endpoints)
   - [A. Batch Visitor Sessions (Recommended)](#a-batch-visitor-sessions-recommended)
   - [B. Single Visitor Session](#b-single-visitor-session)
   - [C. CCTV Snapshot Upload (GCP Cloud Storage)](#c-cctv-snapshot-upload-gcp-cloud-storage)
3. [Field Specifications & Validation Rules](#3-field-specifications--validation-rules)
4. [Python Edge Pipeline Code Example](#4-python-edge-pipeline-code-example)
5. [GCP Environment Variables & Deployment](#5-gcp-environment-variables--deployment)

---

## 1. Base URL & Authentication

* **Production (GCP):** `https://camera.carching.co/api`
* **Local Development:** `http://localhost:3001/api`
* **Authentication:** Currently open on the private network or secured via GCP firewall/API token if configured.

---

## 2. Data Ingestion Endpoints

### A. Batch Visitor Sessions (Recommended)
Edge cameras should queue detected visitor tracks and flush them in batches every 5–30 seconds.

* **Endpoint:** `POST /api/sessions/batch`
* **Content-Type:** `application/json`

#### Request Payload:
```json
{
  "sessions": [
    {
      "visitor_id": "VIS-TRACK-1042",
      "start_time": "2026-10-15T10:15:20.000Z",
      "end_time": "2026-10-15T10:19:40.000Z",
      "dwell_time": 260,
      "gender": "M",
      "age_group": "Adult",
      "evidence_image_url": "https://storage.googleapis.com/cctv-snapshots/evidence/crop-1042.jpg"
    },
    {
      "visitor_id": "VIS-TRACK-1043",
      "start_time": "2026-10-15T10:16:05.000Z",
      "dwell_time": 195,
      "gender": "F",
      "age_group": "Adult"
    }
  ]
}
```
*(Alternatively, you can also send a raw JSON array: `[{ ... }, { ... }]`)*

#### Success Response (`HTTP 201 Created`):
```json
{
  "success": true,
  "message": "Successfully inserted 2 visitor session(s).",
  "count": 2,
  "inserted_ids": ["VIS-TRACK-1042", "VIS-TRACK-1043"]
}
```

---

### B. Single Visitor Session
Convenience endpoint for individual visitor events.

* **Endpoint:** `POST /api/sessions`
* **Content-Type:** `application/json`

#### Request Payload:
```json
{
  "visitor_id": "VIS-TRACK-1044",
  "start_time": "2026-10-15T10:20:00.000Z",
  "dwell_time": 210,
  "gender": "F",
  "age_group": "Kid"
}
```

---

### C. CCTV Snapshot Upload (GCP Cloud Storage)
Periodically upload a wide-angle snapshot of the booth (e.g. once every 30–60 seconds). The backend automatically streams the image to **Google Cloud Storage (GCS)**, saves the public URL, and displays it in the live CCTV carousel on the dashboard.

* **Endpoint:** `POST /api/snapshots`
* **Content-Type:** `multipart/form-data`

#### Form Fields:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | Binary File | **Yes** | Image file (`.jpg`, `.jpeg`, `.png`) |
| `timestamp` | String (ISO) | No | Defaults to current server time |
| `campaign_id`| Integer | No | Defaults to currently active event |

#### Success Response (`HTTP 201 Created`):
```json
{
  "success": true,
  "provider": "gcp",
  "snapshot": {
    "id": 14,
    "campaign_id": 2,
    "timestamp": "2026-10-15T10:25:00.000Z",
    "image_url": "https://camera.carching.co/snapshots/2026-10-15/1792105300-booth_view.jpg"
  }
}
```

---

## 3. Field Specifications & Validation Rules

| Field Name | Type | Allowed Values | Auto-Derivation / Fallback |
| :--- | :--- | :--- | :--- |
| `visitor_id` | `string` | Unique tracking ID | Auto-generates `VIS-<timestamp>-<index>` if omitted |
| `start_time` | `string` | ISO 8601 string (e.g. `2026-10-15T09:30:00Z`) | Defaults to current UTC timestamp |
| `end_time` | `string` | ISO 8601 string | If omitted, calculated as `start_time + dwell_time` |
| `dwell_time` | `integer` | Seconds (e.g. `240`) | If omitted, calculated from `end_time - start_time` |
| `gender` | `string` | `'M'`, `'F'` *(case-insensitive: accepts `'Male'`, `'Female'`)* | Defaults to `'M'` if unrecognized |
| `age_group` | `string` | `'Adult'`, `'Kid'` *(accepts `'adult'`, `'kid'`, `'child'`)* | Defaults to `'Adult'` if unrecognized |
| `shift_date` | `string` | `YYYY-MM-DD` | **Auto-derived** from `start_time` date |
| `shift_id` | `integer` | `1` (09:00 - 14:59) or `2` (15:00 - 20:59) | **Auto-derived** from `start_time` local hour |
| `campaign_id`| `integer` | Event ID (e.g. `1`, `2`) | **Auto-assigned** to currently active event |
| `evidence_image_url` | `string` | Optional URL to cropped face/person image | `null` if not provided |

---

## 4. Python Edge Pipeline Code Example

Your colleague can drop this Python snippet directly into their edge-AI tracking script:

```python
import requests
import datetime
import time

API_BASE = "https://camera.carching.co/api"  # Or "http://localhost:3001/api" during testing

def send_visitor_batch(sessions_list):
    """
    Sends a batch of detected visitor sessions to the backend.
    """
    url = f"{API_BASE}/sessions/batch"
    payload = {"sessions": sessions_list}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 201:
            print(f"[Success] Flushed {len(sessions_list)} visitor sessions.")
            return True
        else:
            print(f"[Error] Failed to ingest sessions: {response.status_code} {response.text}")
            return False
    except Exception as e:
        print(f"[Network Error] {e}")
        return False

def upload_cctv_snapshot(image_path):
    """
    Uploads a snapshot frame directly to Google Cloud Storage via the backend.
    """
    url = f"{API_BASE}/snapshots"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    try:
        with open(image_path, "rb") as f:
            files = {"image": ("snapshot.jpg", f, "image/jpeg")}
            data = {"timestamp": now_iso}
            response = requests.post(url, files=files, data=data, timeout=15)
            
        if response.status_code == 201:
            print("[Snapshot Uploaded]", response.json().get("snapshot", {}).get("image_url"))
            return True
        else:
            print("[Snapshot Error]", response.text)
            return False
    except Exception as e:
        print(f"[Snapshot Network Error] {e}")
        return False

# Example Usage:
if __name__ == "__main__":
    now = datetime.datetime.now(datetime.timezone.utc)
    
    sample_sessions = [
        {
            "visitor_id": "CAM1-TRACK-5001",
            "start_time": now.isoformat(),
            "dwell_time": 240,
            "gender": "M",
            "age_group": "Adult"
        },
        {
            "visitor_id": "CAM1-TRACK-5002",
            "start_time": now.isoformat(),
            "dwell_time": 180,
            "gender": "F",
            "age_group": "Kid"
        }
    ]
    
    send_visitor_batch(sample_sessions)
```

---

## 5. GCP Environment Variables & Deployment

Because `.env` is omitted from Git for security, your colleague needs to configure these environment variables on the GCP hosting service (Cloud Run, Compute Engine, or App Engine):

```env
# 1. Storage Provider Configuration
STORAGE_PROVIDER=gcp
GCS_BUCKET_NAME=cctv-snapshots
GCP_PROJECT_ID=carching-visitor-tracker

# 2. Public Domain
BASE_URL=https://camera.carching.co

# 3. Server Port (Cloud Run automatically injects PORT=8080)
PORT=8080
```

### GCP Cloud Storage (GCS) Permissions:
* When running on GCP (Cloud Run or Compute Engine), the service uses **Application Default Credentials (ADC)** automatically.
* Ensure the **GCP Service Account** assigned to the Cloud Run service / VM has the following IAM role on the `cctv-snapshots` bucket:
  - `Storage Object Admin` (or `Storage Object Creator`)
* Ensure the bucket allows public read access if images will be rendered in the browser:
  - Principal: `allUsers`
  - Role: `Storage Object Viewer`

