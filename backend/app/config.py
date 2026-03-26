from pathlib import Path


import platform

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
ARTIFACT_DIR = BASE_DIR / "artifacts"
THREEDFFA_DIR = PROJECT_ROOT / "3DDFA_V2-master"
OBJ_TO_DXF_DIR = PROJECT_ROOT / "objTOdxf"


def get_model_transformer_bin() -> Path:
    model_root = OBJ_TO_DXF_DIR / "ModelTransformer-main"
    is_windows = platform.system().lower().startswith("win")

    windows_candidates = [
        model_root / "build_win" / "Release" / "ModelTransformer.exe",
        model_root / "build" / "Release" / "ModelTransformer.exe",
    ]
    linux_candidates = [
        model_root / "build_linux" / "ModelTransformer",
        model_root / "build" / "ModelTransformer",
    ]

    candidates = windows_candidates if is_windows else linux_candidates
    for path in candidates:
        if path.exists():
            return path

    return candidates[0]


MODEL_TRANSFORMER_BIN = get_model_transformer_bin()
OBJ_TO_DXF_PIPELINE = OBJ_TO_DXF_DIR / "deploy" / "pipeline.py"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
