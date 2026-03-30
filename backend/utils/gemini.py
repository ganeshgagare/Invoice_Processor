import google.generativeai as genai
import base64
from pathlib import Path
from config import settings
import json

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


async def extract_data_from_invoice(file_path: str, user_prompt: str = "") -> dict:
    """
    Extract data from invoice using Gemini API
    Supports PDF and image files
    """
    
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    print(f"\n[Gemini] Processing file: {file_path.name}")
    print(f"[Gemini] User prompt provided: {bool(user_prompt)}")
    if user_prompt:
        print(f"[Gemini] User prompt: {user_prompt[:100]}...")
    
    # Read file and encode to base64
    with open(file_path, "rb") as f:
        file_data = f.read()
    
    print(f"[Gemini] File size: {len(file_data)} bytes")
    
    # Determine mime type
    suffix = file_path.suffix.lower()
    mime_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    
    mime_type = mime_types.get(suffix, "application/pdf")
    print(f"[Gemini] MIME type: {mime_type}")
    
    # Encode file to base64
    file_base64 = base64.standard_b64encode(file_data).decode()
    
    # Create prompt for Gemini
    default_prompt = """
    Extract all invoice information from this document. Please provide:
    1. Invoice Number
    2. Invoice Date
    3. Due Date
    4. Vendor/Supplier Name
    5. Vendor Address
    6. Vendor Contact Info
    7. Bill To (Customer Name)
    8. Customer Address
    9. Line Items (Description, Quantity, Unit Price, Amount)
    10. Subtotal
    11. Tax Amount
    12. Total Amount
    13. Payment Terms
    14. Notes or Special Instructions
    
    Return the data in clean JSON format.
    """
    
    full_prompt = default_prompt
    if user_prompt:
        full_prompt += f"\n\nAdditional instructions from user: {user_prompt}"
    
    print(f"[Gemini] Sending to Gemini API with user instructions: {bool(user_prompt)}")
    
    # Call Gemini API with base64-encoded file data
    # Use gemini-2.5-flash which is the latest and most efficient model
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    # Create content with inline base64 data
    response = model.generate_content([
        {
            "mime_type": mime_type,
            "data": file_base64
        },
        full_prompt
    ])
    
    print(f"[Gemini] Response received from API")
    
    # Parse response
    response_text = response.text
    
    # Try to extract JSON from response
    extracted_data = parse_gemini_response(response_text)
    
    return extracted_data


def parse_gemini_response(response_text: str) -> dict:
    """Parse Gemini response and extract JSON"""
    
    # Try to find JSON in response
    try:
        # Look for JSON block
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()
        else:
            json_str = response_text
        
        # Parse JSON
        extracted_data = json.loads(json_str)
        return extracted_data
    except json.JSONDecodeError:
        # If JSON parsing fails, return structured response
        return {
            "raw_response": response_text,
            "error": "Could not parse invoice data as JSON",
            "status": "partial_success",
        }
