"""
MOIL-PRAGYA: Backend Server & REST API
High-performance Python server powering Space & AI-guided Manganese Reserve
Exploration, Sub-surface Voxel Modeling, Shortfall Prediction, and Prescriptive Ops.
"""

import sys
import os
import json
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Import data engine
from data.mining_data import (
    MOIL_MINES,
    generate_satellite_layers,
    generate_boreholes,
    generate_3d_voxels,
    generate_production_and_shortfall,
    solve_prescriptive_optimization
)

PORT = int(os.environ.get("PORT", 8085))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

class MoilRequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, data, status=200):
        response_bytes = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # API Endpoints
        if path == "/api/mines":
            mines_list = list(MOIL_MINES.values())
            self.send_json({"status": "success", "mines": mines_list})
            return

        elif path == "/api/mine-detail":
            mine_id = query.get("id", ["balaghat"])[0]
            mine = MOIL_MINES.get(mine_id)
            if mine:
                self.send_json({"status": "success", "mine": mine})
            else:
                self.send_json({"status": "error", "message": "Mine not found"}, 404)
            return

        elif path == "/api/satellite-layers":
            mine_id = query.get("mine", ["balaghat"])[0]
            data = generate_satellite_layers(mine_id)
            self.send_json({"status": "success", "data": data})
            return

        elif path == "/api/boreholes":
            mine_id = query.get("mine", ["balaghat"])[0]
            boreholes = generate_boreholes(mine_id)
            self.send_json({"status": "success", "boreholes": boreholes})
            return

        elif path == "/api/reserves-3d":
            mine_id = query.get("mine", ["balaghat"])[0]
            try:
                cutoff = float(query.get("cutoff", ["35.0"])[0])
            except ValueError:
                cutoff = 35.0
            data = generate_3d_voxels(mine_id, cutoff)
            self.send_json({"status": "success", "data": data})
            return

        elif path == "/api/shortfall-forecast":
            mine_id = query.get("mine", ["balaghat"])[0]
            data = generate_production_and_shortfall(mine_id)
            self.send_json({"status": "success", "data": data})
            return

        elif path == "/api/health":
            self.send_json({"status": "healthy", "service": "MOIL-PRAGYA Engine"})
            return

        # Serve static assets from public/
        if path == "/" or path == "":
            rel_path = "index.html"
        else:
            rel_path = path.lstrip("/")

        file_path = os.path.join(PUBLIC_DIR, rel_path)

        # Prevent directory traversal
        if not os.path.commonpath([PUBLIC_DIR, os.path.abspath(file_path)]).startswith(PUBLIC_DIR):
            self.send_error(403, "Access Denied")
            return

        if os.path.exists(file_path) and os.path.isfile(file_path):
            content_type, _ = mimetypes.guess_type(file_path)
            if content_type is None:
                content_type = "application/octet-stream"
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"Error reading file: {str(e)}")
        else:
            self.send_error(404, "File Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"

        try:
            body = json.loads(post_data)
        except Exception:
            body = {}

        if path == "/api/simulate-scenario":
            weather = float(body.get("weather_severity", 1.0))
            shovel_dt = int(body.get("shovel_downtime", 0))
            blasting_dt = int(body.get("blasting_delay_days", 0))
            target_t = float(body.get("target_tonnes", 1450))
            target_grade = float(body.get("target_mn_grade", 42.5))

            result = solve_prescriptive_optimization(
                weather_severity=weather,
                shovel_downtime=shovel_dt,
                blasting_delay_days=blasting_dt,
                target_tonnes=target_t,
                target_mn_grade=target_grade
            )
            self.send_json({"status": "success", "result": result})
            return

        elif path == "/api/optimize-blend":
            target_grade = float(body.get("target_mn_grade", 42.5))
            result = solve_prescriptive_optimization(target_mn_grade=target_grade)
            self.send_json({"status": "success", "result": result["stockpile_blend"]})
            return

        else:
            self.send_json({"status": "error", "message": "Unknown endpoint"}, 404)

def run_tests():
    """CLI test runner to verify core endpoints and data integrity."""
    print("Running MOIL-PRAGYA programmatic verification...")
    # Test mines
    assert len(MOIL_MINES) >= 5, "Should have at least 5 MOIL mines"
    # Test satellite layer generator
    sat = generate_satellite_layers("balaghat")
    assert "points" in sat and len(sat["points"]) > 50, "Satellite grid failed"
    # Test boreholes
    bh = generate_boreholes("balaghat")
    assert len(bh) == 16, "Should generate 16 exploration boreholes"
    # Test 3d voxels
    vox = generate_3d_voxels("balaghat", cutoff_grade=35.0)
    assert vox["total_reserve_tonnes"] > 1_000_000, "Voxel reserve calculation error"
    # Test shortfall
    sf = generate_production_and_shortfall("balaghat")
    assert len(sf["forecast"]) == 14, "Should forecast 14 days"
    # Test prescriptive engine
    opt = solve_prescriptive_optimization(weather_severity=1.5, shovel_downtime=1, blasting_delay_days=2)
    assert opt["recovery_rate_pct"] > 50, "Prescriptive mitigation underperforming"
    print("All backend tests PASSED successfully!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
        sys.exit(0)

    server_address = ("", PORT)
    httpd = HTTPServer(server_address, MoilRequestHandler)
    print(f"============================================================")
    print(f">> MOIL-PRAGYA Server listening on http://localhost:{PORT}")
    print(f">> Space Exploration | 3D Voxel Reserves | Shortfall Predictor")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping MOIL-PRAGYA server...")
        httpd.server_close()
