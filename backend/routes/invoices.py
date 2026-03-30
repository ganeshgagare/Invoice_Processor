import os
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from pathlib import Path
from database import get_db
from models import User, Invoice
from schemas import InvoiceResponse, InvoiceListResponse
from auth import get_current_user
from utils.gemini import extract_data_from_invoice
from utils.html_generator import generate_html_report

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    user_prompt: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an invoice file and process it with Gemini AI"""

    # Validate file type
    allowed_types = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, JPEG, PNG, and WebP files are allowed",
        )

    # Save uploaded file
    file_content = await file.read()
    user_dir = UPLOAD_DIR / str(current_user.id)
    user_dir.mkdir(exist_ok=True)

    # Generate unique filename
    filename = f"{current_user.id}_{Path(file.filename).stem}_{int(__import__('time').time())}{Path(file.filename).suffix}"
    file_path = user_dir / filename

    with open(file_path, "wb") as f:
        f.write(file_content)

    # Create invoice record
    db_invoice = Invoice(
        user_id=current_user.id,
        filename=filename,
        original_filename=file.filename,
        file_path=str(file_path),
        user_prompt=user_prompt if user_prompt else None,
        status="processing",
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)

    # Process with Gemini
    try:
        extracted_data = await extract_data_from_invoice(
            file_path, user_prompt
        )
        
        # Generate HTML report
        html_output = generate_html_report(
            extracted_data, file.filename, current_user.email
        )

        # Update invoice record
        db_invoice.extracted_data = extracted_data
        db_invoice.html_output = html_output
        db_invoice.status = "completed"
    except Exception as e:
        db_invoice.status = "failed"
        db_invoice.error_message = str(e)

    db.commit()
    db.refresh(db_invoice)

    return {
        "id": db_invoice.id,
        "status": db_invoice.status,
        "message": "Invoice processed successfully" if db_invoice.status == "completed" else f"Error: {db_invoice.error_message}",
    }


@router.get("/list", response_model=InvoiceListResponse)
def list_invoices(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all invoices for the current user"""
    invoices = (
        db.query(Invoice)
        .filter(Invoice.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    total = db.query(Invoice).filter(Invoice.user_id == current_user.id).count()
    return {"invoices": invoices, "total": total}


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this invoice",
        )

    return invoice


@router.get("/{invoice_id}/html")
def get_invoice_html(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get invoice HTML output"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this invoice",
        )

    if not invoice.html_output:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice not yet processed",
        )

    return {
        "html": invoice.html_output,
        "filename": invoice.original_filename,
    }


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this invoice",
        )

    # Delete file
    if Path(invoice.file_path).exists():
        Path(invoice.file_path).unlink()

    db.delete(invoice)
    db.commit()

    return {"message": "Invoice deleted successfully"}
