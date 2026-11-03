import hmac
import os
import re

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Response, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from document_types import DOCUMENT_TYPE_LABELS, DocumentType
import models
from database import engine, get_db
from schemas import BusinessCreate, BusinessRead, BusinessUpdate


app = FastAPI(title="Business Document API")
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024


@app.on_event("startup")
def create_local_dev_tables():
    if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
        models.Base.metadata.create_all(bind=engine)


def require_api_key(x_api_key: str = Header(default="")):
    expected_key = os.getenv("BUSINESS_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=503, detail="API key is not configured")
    if not hmac.compare_digest(x_api_key, expected_key):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def save_business(db: Session, business: models.Business):
    try:
        db.add(business)
        db.commit()
        db.refresh(business)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Registration number is already in use") from exc
    return business


@app.post("/businesses", response_model=BusinessRead, status_code=201, dependencies=[Depends(require_api_key)])
def create_business(payload: BusinessCreate, db: Session = Depends(get_db)):
    return save_business(db, models.Business(**payload.model_dump(mode="json")))


@app.get("/businesses", response_model=list[BusinessRead], dependencies=[Depends(require_api_key)])
def list_businesses(
    q: str | None = Query(default=None, min_length=1, max_length=200),
    city: str | None = Query(default=None, max_length=100),
    province: str | None = Query(default=None, max_length=100),
    industry: str | None = Query(default=None, max_length=100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.Business)
    if q:
        query = query.filter(models.Business.name.ilike(f"%{q}%"))
    if city:
        query = query.filter(models.Business.city.ilike(f"%{city}%"))
    if province:
        query = query.filter(models.Business.province.ilike(f"%{province}%"))
    if industry:
        query = query.filter(models.Business.industry.ilike(f"%{industry}%"))
    return query.order_by(models.Business.name, models.Business.id).offset(skip).limit(limit).all()


@app.get("/businesses/{business_id}", response_model=BusinessRead, dependencies=[Depends(require_api_key)])
def get_business(business_id: int, db: Session = Depends(get_db)):
    business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if business is None:
        raise HTTPException(status_code=404, detail="Business not found")
    return business


@app.patch("/businesses/{business_id}", response_model=BusinessRead, dependencies=[Depends(require_api_key)])
def update_business(business_id: int, payload: BusinessUpdate, db: Session = Depends(get_db)):
    business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if business is None:
        raise HTTPException(status_code=404, detail="Business not found")
    changes = payload.model_dump(exclude_unset=True, mode="json")
    if changes.get("name", "present") is None or changes.get("country", "present") is None:
        raise HTTPException(status_code=422, detail="Name and country cannot be null")
    for field, value in changes.items():
        setattr(business, field, value)
    return save_business(db, business)


@app.delete("/businesses/{business_id}", status_code=204, dependencies=[Depends(require_api_key)])
def delete_business(business_id: int, db: Session = Depends(get_db)):
    business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if business is None:
        raise HTTPException(status_code=404, detail="Business not found")
    db.delete(business)
    db.commit()
    return Response(status_code=204)


@app.get("/document-types", dependencies=[Depends(require_api_key)])
def list_document_types():
    return [
        {"value": document_type.value, "label": label}
        for document_type, label in DOCUMENT_TYPE_LABELS.items()
    ]


@app.post("/businesses/{business_id}/documents", dependencies=[Depends(require_api_key)])
async def upload_document(
    business_id: int,
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if business is None:
        raise HTTPException(status_code=404, detail="Business not found")
    if not file.filename:
        raise HTTPException(status_code=422, detail="A filename is required")
    file_content = await file.read(MAX_DOCUMENT_BYTES + 1)
    if len(file_content) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="Document exceeds the 10 MB limit")
    safe_filename = file.filename.replace("\\", "/").split("/")[-1]
    safe_filename = re.sub(r"[\x00-\x1f\x7f\"]", "", safe_filename).strip() or "document"
    new_doc = models.BusinessDocument(
        business_id=business_id,
        document_type=document_type.value,
        filename=safe_filename[:255],
        content_type=file.content_type or "application/octet-stream",
        file_data=file_content,
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return {"message": "Document uploaded successfully", "document_id": new_doc.id}


@app.get("/businesses/{business_id}/documents/{document_id}", dependencies=[Depends(require_api_key)])
def download_document(business_id: int, document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.BusinessDocument).filter(
        models.BusinessDocument.id == document_id,
        models.BusinessDocument.business_id == business_id,
    ).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    safe_filename = doc.filename.replace('"', "")
    return Response(
        content=doc.file_data,
        media_type=doc.content_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )
