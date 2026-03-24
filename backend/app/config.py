from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
ARTIFACT_DIR = BASE_DIR / "artifacts"
THREEDFFA_DIR = PROJECT_ROOT / "3DDFA_V2-master"
OBJ_TO_DXF_DIR = PROJECT_ROOT / "objTOdxf"
MODEL_TRANSFORMER_BIN = (
    OBJ_TO_DXF_DIR / "ModelTransformer-main" / "build" / "ModelTransformer"
)
OBJ_TO_DXF_PIPELINE = OBJ_TO_DXF_DIR / "deploy" / "pipeline.py"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
