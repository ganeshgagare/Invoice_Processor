from datetime import datetime
import json


def generate_html_report(extracted_data: dict, filename: str, user_email: str) -> str:
    """Generate HTML report from extracted invoice data"""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Report - {filename}</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 20px;
                min-height: 100vh;
            }}
            
            .container {{
                max-width: 1000px;
                margin: 0 auto;
                background: white;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
            }}
            
            .header h1 {{
                font-size: 32px;
                margin-bottom: 10px;
            }}
            
            .header p {{
                opacity: 0.9;
                font-size: 14px;
            }}
            
            .content {{
                padding: 40px;
            }}
            
            .section {{
                margin-bottom: 40px;
            }}
            
            .section-title {{
                font-size: 20px;
                font-weight: 600;
                color: #333;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #667eea;
            }}
            
            .info-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }}
            
            .info-box {{
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }}
            
            .info-box label {{
                display: block;
                font-weight: 600;
                color: #667eea;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 5px;
                letter-spacing: 0.5px;
            }}
            
            .info-box value {{
                display: block;
                color: #333;
                font-size: 16px;
                word-break: break-word;
            }}
            
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            
            table thead {{
                background: #f8f9fa;
            }}
            
            table th {{
                padding: 12px;
                text-align: left;
                font-weight: 600;
                color: #333;
                border-bottom: 2px solid #667eea;
            }}
            
            table td {{
                padding: 12px;
                border-bottom: 1px solid #e0e0e0;
                color: #666;
            }}
            
            table tbody tr:hover {{
                background: #f8f9fa;
            }}
            
            .summary-box {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 8px;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 30px;
            }}
            
            .summary-item {{
                text-align: center;
            }}
            
            .summary-label {{
                font-size: 12px;
                text-transform: uppercase;
                opacity: 0.9;
                margin-bottom: 8px;
                letter-spacing: 0.5px;
            }}
            
            .summary-value {{
                font-size: 28px;
                font-weight: 700;
            }}
            
            .footer {{
                background: #f8f9fa;
                padding: 20px 40px;
                text-align: center;
                color: #999;
                font-size: 12px;
                border-top: 1px solid #e0e0e0;
            }}
            
            .error {{
                background: #fee;
                color: #c33;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #c33;
            }}
            
            .success {{
                background: #efe;
                color: #3c3;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #3c3;
            }}
            
            .raw-data {{
                background: #f5f5f5;
                padding: 15px;
                border-radius: 8px;
                overflow-x: auto;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #333;
                border: 1px solid #ddd;
            }}
            
            @media print {{
                body {{
                    background: white;
                    padding: 0;
                }}
                .container {{
                    box-shadow: none;
                    border-radius: 0;
                }}
                .header {{
                    background: #667eea;
                    color: white;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📄 Invoice Extraction Report</h1>
                <p>Processed on {timestamp} | User: {user_email}</p>
                <p>File: {filename}</p>
            </div>
            
            <div class="content">
                {generate_report_content(extracted_data)}
            </div>
            
            <div class="footer">
                <p>This report was generated using AI-powered invoice extraction. For accurate records, please verify all information.</p>
                <p>Generated at {timestamp}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


def generate_report_content(extracted_data: dict) -> str:
    """Generate the main content of the report"""
    
    if "error" in extracted_data and extracted_data.get("status") == "partial_success":
        return f"""
        <div class="section">
            <div class="error">
                <strong>⚠️ Parsing Error:</strong> The invoice data could not be automatically parsed as structured JSON.
                Here is the raw extracted text:
            </div>
            <div class="raw-data">
                {extracted_data.get('raw_response', 'No data available')}
            </div>
        </div>
        """
    
    content = ""
    
    # Vendor Information
    if any(key in extracted_data for key in ["vendor_name", "supplier_name", "Vendor", "Supplier"]):
        content += """
        <div class="section">
            <h2 class="section-title">Vendor Information</h2>
            <div class="info-grid">
        """
        
        vendor_fields = {
            "vendor_name": "Vendor Name",
            "supplier_name": "Supplier Name",
            "Vendor": "Vendor Name",
            "vendor_address": "Address",
            "vendor_contact": "Contact Info",
            "tax_id": "Tax ID"
        }
        
        for key, label in vendor_fields.items():
            if key in extracted_data:
                value = extracted_data[key]
                content += f"""
                <div class="info-box">
                    <label>{label}</label>
                    <value>{value}</value>
                </div>
                """
        
        content += "</div></div>"
    
    # Invoice Details
    if any(key in extracted_data for key in ["invoice_number", "invoice_date", "due_date"]):
        content += """
        <div class="section">
            <h2 class="section-title">Invoice Details</h2>
            <div class="info-grid">
        """
        
        detail_fields = {
            "invoice_number": "Invoice Number",
            "invoice_date": "Invoice Date",
            "due_date": "Due Date",
            "payment_terms": "Payment Terms"
        }
        
        for key, label in detail_fields.items():
            if key in extracted_data:
                value = extracted_data[key]
                content += f"""
                <div class="info-box">
                    <label>{label}</label>
                    <value>{value}</value>
                </div>
                """
        
        content += "</div></div>"
    
    # Bill To Information
    if any(key in extracted_data for key in ["customer_name", "bill_to", "customer_address"]):
        content += """
        <div class="section">
            <h2 class="section-title">Bill To</h2>
            <div class="info-grid">
        """
        
        bill_fields = {
            "customer_name": "Customer Name",
            "bill_to": "Bill To",
            "customer_address": "Address"
        }
        
        for key, label in bill_fields.items():
            if key in extracted_data:
                value = extracted_data[key]
                content += f"""
                <div class="info-box">
                    <label>{label}</label>
                    <value>{value}</value>
                </div>
                """
        
        content += "</div></div>"
    
    # Line Items
    if "line_items" in extracted_data and extracted_data["line_items"]:
        content += """
        <div class="section">
            <h2 class="section-title">Line Items</h2>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for item in extracted_data["line_items"]:
            if isinstance(item, dict):
                desc = item.get("description", "-")
                qty = item.get("quantity", "-")
                price = item.get("unit_price", "-")
                amount = item.get("amount", "-")
            else:
                desc = qty = price = amount = "-"
            
            content += f"""
            <tr>
                <td>{desc}</td>
                <td>{qty}</td>
                <td>{price}</td>
                <td>{amount}</td>
            </tr>
            """
        
        content += """
                </tbody>
            </table>
        </div>
        """
    
    # Totals Summary
    if any(key in extracted_data for key in ["subtotal", "tax_amount", "total_amount", "total"]):
        content += """
        <div class="section">
            <div class="summary-box">
        """
        
        if "subtotal" in extracted_data:
            content += f"""
            <div class="summary-item">
                <div class="summary-label">Subtotal</div>
                <div class="summary-value">{extracted_data['subtotal']}</div>
            </div>
            """
        
        if "tax_amount" in extracted_data:
            content += f"""
            <div class="summary-item">
                <div class="summary-label">Tax</div>
                <div class="summary-value">{extracted_data['tax_amount']}</div>
            </div>
            """
        
        if "total_amount" in extracted_data:
            total = extracted_data["total_amount"]
        elif "total" in extracted_data:
            total = extracted_data["total"]
        else:
            total = None
        
        if total:
            content += f"""
            <div class="summary-item">
                <div class="summary-label">Total</div>
                <div class="summary-value">{total}</div>
            </div>
            """
        
        content += """
            </div>
        </div>
        """
    
    # Additional Notes
    if "notes" in extracted_data:
        content += f"""
        <div class="section">
            <h2 class="section-title">Notes</h2>
            <div class="info-box">
                <value>{extracted_data['notes']}</value>
            </div>
        </div>
        """
    
    # Raw JSON Data
    content += """
    <div class="section">
        <h2 class="section-title">Raw Extracted Data (JSON)</h2>
        <div class="raw-data">
    """
    content += "<pre>" + json.dumps(extracted_data, indent=2) + "</pre>"
    content += """
        </div>
    </div>
    """
    
    return content
