from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
from PIL import Image
import numpy as np
import io
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = "Facenet"
THRESHOLD = 0.40   # cosine distance: kam = zyada match


def read_image(file_bytes: bytes):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    return np.array(img)


def get_embedding(img_array):
    result = DeepFace.represent(
        img_path=img_array,
        model_name=MODEL,
        detector_backend="retinaface",
        enforce_detection=True,
    )
    return result[0]["embedding"]


def cosine_dist(a, b):
    a, b = np.array(a), np.array(b)
    return float(1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


@app.get("/py/hello")
def hello():
    return {"message": "Hello from Python!"}


@app.post("/py/encode")
async def encode(file: UploadFile = File(...)):
    try:
        img = read_image(await file.read())
        embedding = get_embedding(img)
        return {"encoding": embedding}
    except Exception as e:
        print("ENCODE ERROR:", repr(e))
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/py/recognize")
async def recognize(
    file: UploadFile = File(...),
    students: str = Form("[]"),
):
    try:
        img = read_image(await file.read())
        probe = get_embedding(img)
    except Exception as e:
        print("RECOGNIZE ERROR:", repr(e))
        raise HTTPException(status_code=400, detail="Face not detected")

    student_list = json.loads(students)
    print("STUDENTS RECEIVED:", len(student_list))

    best_id, best_dist = None, 1e9
    for s in student_list:
        dist = cosine_dist(probe, s["encoding"])
        if dist < best_dist:
            best_id, best_dist = s["id"], dist

    print("BEST DIST:", best_dist, "THRESHOLD:", THRESHOLD)

    if best_id is not None and best_dist < THRESHOLD:
        return {"matched": True, "studentId": best_id, "distance": best_dist}
    return {"matched": False, "distance": best_dist}