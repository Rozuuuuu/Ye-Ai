"""
Kornia TPS Warp Engine — FastAPI backend for garment warping.

Uses Kornia's ThinPlateSpline (TPS) to warp 2D garment images
based on MediaPipe body landmarks (11, 12, 23, 24).

API Reference (from github.com/Rozuuuuu/kornia):
  - get_tps_transform(points_src, points_dst) → (kernel_weights, affine_weights)
  - warp_image_tps(image, kernel_centers, kernel_weights, affine_weights)
  - For image warping, use REVERSE transform: get_tps_transform(p_dst, p_src)

Setup:
  pip install torch kornia fastapi uvicorn[standard] opencv-python pillow numpy

Run:
  uvicorn kornia_warp_engine:app --host 0.0.0.0 --port 8000
"""

import torch
import kornia
import numpy as np
import cv2
import base64
import io
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Ye-Ai Kornia Warp Engine",
    description="TPS-based garment warping for hybrid AR try-on",
    version="1.0.0",
)

# ── CORS: Allow Vite dev server and common local origins ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev
        "http://localhost:3000",   # Fallback
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ───────────────────────────────────────────────────────────────────

class KeyPoint(BaseModel):
    x: float
    y: float
    z: Optional[float] = 0.0


class WarpRequest(BaseModel):
    garment_image_b64: str
    # MediaPipe landmarks (usually indices 11, 12, 23, 24 for upper body)
    landmarks: List[KeyPoint]
    # Normalized coordinates on the flat garment image [x, y]
    # Default: Top-Left, Top-Right, Bottom-Left, Bottom-Right
    anchor_points: Optional[List[List[float]]] = [
        [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]
    ]


# ── Helpers ──────────────────────────────────────────────────────────────────

def base64_to_tensor(base64_str: str, device: torch.device) -> torch.Tensor:
    """Decode a base64 image string into a (B, C, H, W) tensor normalized to [-1, 1]."""
    if "base64," in base64_str:
        base64_str = base64_str.split("base64,")[1]
    img_data = base64.b64decode(base64_str)
    img = Image.open(io.BytesIO(img_data)).convert("RGBA")
    img_np = np.array(img)
    # Convert to tensor (B, C, H, W) and normalize to [-1, 1]
    tensor = kornia.utils.image_to_tensor(img_np).float() / 255.0
    return (tensor * 2.0 - 1.0).unsqueeze(0).to(device)


def tensor_to_base64(tensor: torch.Tensor) -> str:
    """Encode a (B, C, H, W) tensor (range [-1, 1]) back to a base64 PNG string."""
    # Denormalize from [-1, 1] to [0, 1]
    tensor = (tensor.squeeze(0).cpu() + 1.0) / 2.0
    img_np = kornia.utils.tensor_to_image(tensor.clamp(0, 1))
    img_np = (img_np * 255).astype(np.uint8)

    # Handle RGBA → encode as PNG with alpha
    if img_np.shape[-1] == 4:
        _, buffer = cv2.imencode('.png', cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGRA))
    else:
        _, buffer = cv2.imencode('.png', cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR))

    return base64.b64encode(buffer).decode('utf-8')


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check — also reports CUDA availability."""
    return {
        "status": "ok",
        "cuda_available": torch.cuda.is_available(),
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "kornia_version": kornia.__version__,
        "torch_version": torch.__version__,
    }


@app.post("/warp")
async def warp_garment(request: WarpRequest):
    """
    Warp a flat garment image using TPS (Thin Plate Spline) transform.

    Expects:
      - garment_image_b64: base64-encoded garment PNG (with alpha for transparency)
      - landmarks: 4 body keypoints [L_Shoulder, R_Shoulder, L_Hip, R_Hip]
        as normalized (0-1) coordinates from MediaPipe
      - anchor_points: 4 corresponding points on the flat garment image (normalized 0-1)

    Returns:
      - warped_image: base64-encoded warped PNG
    """
    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # 1. Load Garment
        img_tensor = base64_to_tensor(request.garment_image_b64, device)

        # 2. Prepare Points
        # Kornia TPS expects points in range [-1, 1]
        # src: Points on the flat garment image (anchor positions)
        p_src = torch.tensor(
            request.anchor_points, device=device, dtype=torch.float32
        ).unsqueeze(0) * 2.0 - 1.0

        # dst: Points on the user's body (from MediaPipe landmarks)
        # Order: L_Shoulder (11), R_Shoulder (12), L_Hip (23), R_Hip (24)
        p_dst = torch.tensor(
            [[p.x, p.y] for p in request.landmarks],
            device=device, dtype=torch.float32
        ).unsqueeze(0) * 2.0 - 1.0

        # 3. Compute TPS Transform
        # REVERSE mapping (dst → src) for image sampling
        # Reference: kornia/geometry/transform/thin_plate_spline.py docstring
        kernel_weights, affine_weights = kornia.geometry.transform.get_tps_transform(
            p_dst, p_src
        )

        # 4. Warp Image
        # kernel_centers = p_src (the source points from get_tps_transform's second arg)
        warped_tensor = kornia.geometry.transform.warp_image_tps(
            img_tensor, p_src, kernel_weights, affine_weights
        )

        # 5. Return Result
        return {"warped_image": tensor_to_base64(warped_tensor)}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Kornia Warp Engine on http://0.0.0.0:8000")
    print("📋 Health check: http://localhost:8000/health")
    print("📋 API docs:     http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
