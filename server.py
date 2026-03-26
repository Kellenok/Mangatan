import io
import os
import json
import time
import threading
import base64
import copy
import requests
from urllib.parse import quote
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
from dataclasses import asdict
from waitress import serve

from owocr.ocr import GoogleLens, ChromeScreenAI
from owocr.run import OutputResult

# --- Configuration ---
CACHE_FILE_PATH = os.path.join(os.getcwd(), "ocr-cache.json")
SERVER_URL_BASE = "http://127.0.0.1:3000"
MAX_HEIGHT = 3000

app = Flask(__name__)
CORS(app)

# --- Global State ---
ocr_cache = {}
cache_lock = threading.Lock()
ocr_requests_processed = 0

ACTIVE_JOB_COUNT = 0
active_job_lock = threading.Lock()

# --- owocr Initialization ---
processor = OutputResult()
engines = {
    "glens": GoogleLens(),
    "screenai": ChromeScreenAI()
}

# --- Cache Utilities ---
def load_cache():
    global ocr_cache
    if os.path.exists(CACHE_FILE_PATH):
        try:
            with open(CACHE_FILE_PATH, "r", encoding="utf-8") as f:
                ocr_cache = json.load(f)
            print(f"[*] Cache loaded: {len(ocr_cache)} entries.")
        except json.JSONDecodeError:
            print("[!] Cache decoding failed. Starting fresh.")

def save_cache():
    with open(CACHE_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(ocr_cache, f, indent=2, ensure_ascii=False)

# --- Chunk Math ---
def adjust_chunk_coordinates(chunk_data, y_offset, chunk_height, full_height):
    """
    Adjusts relative Y and height coordinates from a chunk to the global full image.
    Maintains the exact dictionary structure expected by the v37 frontend.
    """
    for para in chunk_data.get('paragraphs', []):
        pb = para.get('bounding_box')
        if pb is not None:
            if 'center_y' in pb:
                pb['center_y'] = (pb['center_y'] * chunk_height + y_offset) / full_height
            if 'height' in pb:
                pb['height'] = (pb['height'] * chunk_height) / full_height
        
        for line in para.get('lines', []):
            lb = line.get('bounding_box')
            if lb is not None:
                if 'center_y' in lb:
                    lb['center_y'] = (lb['center_y'] * chunk_height + y_offset) / full_height
                if 'height' in lb:
                    lb['height'] = (lb['height'] * chunk_height) / full_height
    
    return chunk_data

# --- Background Worker ---
def run_chapter_processing_job(base_url, engine_key, auth_user, auth_pass):
    global ACTIVE_JOB_COUNT
    with active_job_lock:
        ACTIVE_JOB_COUNT += 1

    print(f"[*] Starting background job for ...{base_url[-40:]}")
    page_index = 0
    consecutive_errors = 0
    CONSECUTIVE_ERROR_THRESHOLD = 5 

    while consecutive_errors < CONSECUTIVE_ERROR_THRESHOLD:
        image_url = f"{base_url}{page_index}"
        cache_key = f"{image_url}|{engine_key}"

        with cache_lock:
            if cache_key in ocr_cache:
                print(f"[~] Skipping (already in cache): {image_url}")
                page_index += 1
                consecutive_errors = 0
                continue

        encoded_url = quote(image_url, safe="")
        target_url = f"{SERVER_URL_BASE}/ocr?url={encoded_url}&engine={engine_key}"
        if auth_user:
            target_url += f"&user={auth_user}&pass={auth_pass}"

        try:
            print(f"[>] Prefetching: {image_url}")
            resp = requests.get(target_url, timeout=45)
            
            if resp.status_code == 200:
                consecutive_errors = 0
            else:
                consecutive_errors += 1
                if resp.status_code == 404:
                    print(f"[i] 404 for {image_url} (Likely end of chapter).")
                else:
                    print(f"[!] Server error {resp.status_code} for {image_url}")
                    
        except requests.exceptions.RequestException as e:
            consecutive_errors += 1
            print(f"[!] Prefetch network error: {e}")

        page_index += 1
        time.sleep(0.1)

    print(f"[*] Job finished for ...{base_url[-40:]}")
    with active_job_lock:
        ACTIVE_JOB_COUNT -= 1

# --- Endpoints ---
@app.route("/")
def status_endpoint():
    with cache_lock:
        req_proc = ocr_requests_processed
        cache_size = len(ocr_cache)
    with active_job_lock:
        active_jobs = ACTIVE_JOB_COUNT
    return jsonify({
        "status": "alive",
        "requests_processed": req_proc,
        "items_in_cache": cache_size,
        "active_preprocess_jobs": active_jobs,
        "engines_loaded": list(engines.keys())
    })

@app.route('/ocr', methods=['GET'])
def perform_ocr():
    global ocr_requests_processed
    
    img_url = request.args.get('url')
    engine_key = request.args.get('engine', 'glens')
    
    if not img_url:
        return jsonify({"error": "No URL provided"}), 400
    
    engine = engines.get(engine_key)
    if not engine:
        return jsonify({"error": "Invalid engine choice"}), 400

    cache_key = f"{img_url}|{engine_key}"
    with cache_lock:
        if cache_key in ocr_cache:
            return jsonify(ocr_cache[cache_key])

    try:
        req_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        auth_user = request.args.get("user")
        if auth_user:
            auth_pass = request.args.get("pass", "")
            auth_string = f"{auth_user}:{auth_pass}"
            auth_b64 = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")
            req_headers["Authorization"] = f"Basic {auth_b64}"

        resp = requests.get(img_url, headers=req_headers, timeout=15)
        if resp.status_code != 200:
            return jsonify({"error": f"Target server returned {resp.status_code}"}), resp.status_code

        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        full_width, full_height = img.size
        
        final_data = {}

        if full_height > MAX_HEIGHT:
            print(f"[*] Long strip detected ({full_height}px). Chunking by {MAX_HEIGHT}px...")
            final_paragraphs = []
            final_text = ""
            y_offset = 0

            while y_offset < full_height:
                chunk_box = (0, y_offset, full_width, min(y_offset + MAX_HEIGHT, full_height))
                chunk_img = img.crop(chunk_box).copy()
                chunk_width, chunk_height = chunk_img.size
                
                print(f"  [>] Processing chunk at Y-offset: {y_offset} ({chunk_width}x{chunk_height})")
                success, raw_result = engine(chunk_img)
                
                if success:
                    processed_result = processor.filtering.order_paragraphs_and_lines(raw_result, filter_text=True)
                    
                    # Deep copy to prevent reference mutation
                    chunk_dict = copy.deepcopy(asdict(processed_result))
                    
                    # Align chunk relative coordinates to full image relative coordinates
                    adjusted_chunk = adjust_chunk_coordinates(chunk_dict, y_offset, chunk_height, full_height)
                    
                    final_paragraphs.extend(adjusted_chunk.get('paragraphs', []))
                    final_text += adjusted_chunk.get('text', '') + "\n"
                
                y_offset += MAX_HEIGHT

            final_data = {
                "text": final_text.strip(),
                "paragraphs": final_paragraphs
            }
        else:
            success, raw_result = engine(img)
            if not success:
                return jsonify({"error": "OCR Engine failed"}), 500
                
            processed_result = processor.filtering.order_paragraphs_and_lines(raw_result, filter_text=True)
            final_data = asdict(processed_result)

        with cache_lock:
            ocr_cache[cache_key] = final_data
            ocr_requests_processed += 1
            save_cache()

        print(f"[+] OCR Successful. Paragraphs: {len(final_data.get('paragraphs', []))} | URL: {img_url[-40:]}")
        return jsonify(final_data)

    except requests.exceptions.RequestException as e:
        print(f"[!] Network error fetching {img_url}: {str(e)}")
        return jsonify({"error": f"Network error: {str(e)}"}), 404
    except Exception as e:
        print(f"[!] OCR Execution Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/preprocess-chapter", methods=["POST"])
def preprocess_chapter_endpoint():
    data = request.json or {}
    base_url = data.get("baseUrl")
    engine_key = data.get("engine", "glens")
    
    if not base_url:
        return jsonify({"error": "baseUrl is required"}), 400

    threading.Thread(
        target=run_chapter_processing_job,
        args=(base_url, engine_key, data.get("user"), data.get("pass")),
        daemon=True,
    ).start()

    return jsonify({"status": "accepted", "message": "Job started"}), 202

@app.route("/purge-cache", methods=["POST"])
def purge_cache_endpoint():
    with cache_lock:
        count = len(ocr_cache)
        ocr_cache.clear()
        save_cache()
    return jsonify({"status": "success", "purged_items": count})

@app.route("/export-cache")
def export_cache_endpoint():
    if not os.path.exists(CACHE_FILE_PATH):
        return jsonify({"error": "No cache"}), 404
    return send_file(CACHE_FILE_PATH, as_attachment=True, download_name="ocr-cache.json")

@app.route("/import-cache", methods=["POST"])
def import_cache_endpoint():
    if "cacheFile" not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files["cacheFile"]
    try:
        imported_data = json.loads(file.read().decode("utf-8"))
        if not isinstance(imported_data, dict):
            return jsonify({"error": "Invalid format"}), 400
            
        with cache_lock:
            new_items = 0
            for k, v in imported_data.items():
                if k not in ocr_cache:
                    ocr_cache[k] = v
                    new_items += 1
            if new_items > 0:
                save_cache()
        return jsonify({"message": f"Imported {new_items} items", "total": len(ocr_cache)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    load_cache()
    print("--- owocr Advanced Bridge + Cache + Chunking ---")
    print(f"[*] Engines loaded: {list(engines.keys())}")
    print("[*] Serving on http://127.0.0.1:3000")
    serve(app, host="127.0.0.1", port=3000, threads=8)