from pathlib import Path


import platform

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
ARTIFACT_DIR = BASE_DIR / "artifacts"
THREEDFFA_DIR = PROJECT_ROOT / "3DDFA_V2-master"
OBJ_TO_DXF_DIR = PROJECT_ROOT / "objTOdxf"


def get_model_transformer_bin() -> Path:
    # 优先检测本地编译目录
    linux_build = (
        OBJ_TO_DXF_DIR / "ModelTransformer-main" / "build_linux" / "ModelTransformer"
    )
    if linux_build.exists():
        return linux_build

    # 兜底旧路径
    default_build = (
        OBJ_TO_DXF_DIR / "ModelTransformer-main" / "build" / "ModelTransformer"
    )
    return default_build


MODEL_TRANSFORMER_BIN = get_model_transformer_bin()
OBJ_TO_DXF_PIPELINE = OBJ_TO_DXF_DIR / "deploy" / "pipeline.py"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
