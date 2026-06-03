#!/usr/bin/env python3
"""
PDF Text Extractor with OCR Fallback
-----------------------------------
Attempts to extract text from a PDF digitally. If the PDF is scanned
(image-only) or returns insufficient text, falls back to OCR.

Requirements:
    pip install pypdf pdf2image pytesseract pillow

System Requirement:
    - Tesseract OCR engine installed and added to system PATH.
    - Poppler installed and added to system PATH (required by pdf2image).
"""

import os
import sys

# Force UTF-8 encoding for standard streams to prevent Windows console encoding crashes
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import argparse
from PIL import Image

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None

try:
    import pytesseract
except ImportError:
    pytesseract = None


def extract_digital_text(pdf_path: str) -> str:
    """Extracts selectable/digital text from the PDF using pypdf."""
    if pypdf is None:
        print("⚠️ Warning: 'pypdf' package not installed. Skipping digital extraction.", file=sys.stderr)
        return ""

    try:
        text_content = []
        with open(pdf_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
        return "\n".join(text_content)
    except Exception as e:
        print(f"⚠️ Digital extraction error: {e}", file=sys.stderr)
        return ""


def extract_ocr_text(pdf_path: str) -> str:
    """Converts PDF to images and performs OCR using Tesseract."""
    if convert_from_path is None:
        print("❌ Error: 'pdf2image' is not installed. OCR extraction aborted.", file=sys.stderr)
        return ""
    if pytesseract is None:
        print("❌ Error: 'pytesseract' is not installed. OCR extraction aborted.", file=sys.stderr)
        return ""

    try:
        print("🔄 Converting PDF pages to images for OCR (this may take a moment)...")
        # Convert PDF to PIL Images with optimized DPI and threading to support larger documents
        pages = convert_from_path(pdf_path, dpi=150, thread_count=2)
        
        ocr_text_content = []
        for i, page_image in enumerate(pages):
            print(f"📖 Performing OCR on Page {i + 1}/{len(pages)}...")
            page_text = pytesseract.image_to_string(page_image)
            ocr_text_content.append(page_text)
            
        return "\n".join(ocr_text_content)
    except Exception as e:
        print(f"❌ OCR Extraction failed: {e}", file=sys.stderr)
        print("\n💡 Tips for fixing OCR errors:", file=sys.stderr)
        print("1. Ensure 'Tesseract OCR' is installed on your OS and the 'tesseract' command is in your PATH.", file=sys.stderr)
        print("2. Ensure 'Poppler' is installed and in your PATH (required by pdf2image).", file=sys.stderr)
        return ""


def extract_text_with_fallback(pdf_path: str, min_char_threshold: int = 50) -> str:
    """
    Main extraction routine:
    Attempts normal digital text extraction. If the resulting text is empty 
    or shorter than threshold (indicates scanned or empty document), falls back to OCR.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    if pypdf is not None:
        try:
            with open(pdf_path, 'rb') as f:
                reader = pypdf.PdfReader(f)
                page_count = len(reader.pages)
                if page_count > 20:
                    raise ValueError(f"PDF exceeds the limit of 20 pages (has {page_count} pages). Please upload a smaller document.")
        except ValueError as ve:
            raise ve
        except Exception as e:
            print(f"⚠️ Page count check failed: {e}", file=sys.stderr)

    print(f"🔍 Inspecting PDF: {os.path.basename(pdf_path)}")
    
    # Step 1: Normal text extraction
    text = extract_digital_text(pdf_path)
    clean_text = text.strip()
    
    print(f"📊 Digital extraction retrieved {len(clean_text)} characters.")

    # Step 2: Fall back to OCR if digital text is empty/too short
    if len(clean_text) < min_char_threshold:
        print(f"⚠️ Digital text length ({len(clean_text)} chars) is below threshold ({min_char_threshold} chars).")
        print("💡 Falling back to OCR extraction...")
        text = extract_ocr_text(pdf_path)
    else:
        print("✅ Digital extraction succeeded.")

    return text


def main():
    parser = argparse.ArgumentParser(description="Extract text from PDF files with OCR fallback.")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("-t", "--threshold", type=int, default=50, 
                        help="Character count threshold below which OCR fallback is triggered (default: 50)")
    parser.add_argument("-o", "--output", help="Path to save the extracted text file")
    
    args = parser.parse_args()

    try:
        extracted_text = extract_text_with_fallback(args.pdf_path, args.threshold)
        
        if not extracted_text.strip():
            print("❌ No text could be extracted from the PDF (even after OCR fallback).")
            sys.exit(1)
            
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(extracted_text)
            print(f"💾 Extracted text saved to: {args.output}")
        else:
            print("\n--- Extracted Text Preview ---")
            print(extracted_text[:1000])
            if len(extracted_text) > 1000:
                print("\n[... truncated preview ...]")
            print("------------------------------")
            
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
