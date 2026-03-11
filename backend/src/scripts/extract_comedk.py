#!/usr/bin/env python3
"""
Extract COMEDK cutoff data from official PDFs and produce aggregated CSV.

Usage:
    pip install pdfplumber pandas
    python extract_comedk.py

Expected PDF files in the same directory (or adjust PDFS list below):
    - comedk_2024_round2_phase2.pdf  (72 pages, GM only)
    - comedk_2025_round1.pdf         (160 pages, GM + KKR)
    - comedk_2025_round2.pdf         (70 pages, GM + KKR)
    - comedk_2025_round3.pdf         (80 pages, GM only)

PDF format:
    Wide tables with branches as columns (7 per section), ~9 sections cycling
    through all colleges. Cell values are closing cutoff ranks.
    Each page has: College Code | College Name | Seat Category (GM/KKR) | 7 branch columns.
    Branch headers change every ~8 pages (new section).

Output:
    ../data/comedk_raw.csv       - raw extracted rows
    ../data/comedk_cutoffs.csv   - aggregated (averaged across years per round)
"""

import os
import sys
import re
import csv
from collections import defaultdict

try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber is required. Install with: pip install pdfplumber")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')

# Define PDF sources — adjust filenames as needed
PDFS = [
    {
        'file': os.path.join(SCRIPT_DIR, 'comedk_2024_round2_phase2.pdf'),
        'year': 2024,
        'round': 'Round 2',
        'categories': ['GM'],
    },
    {
        'file': os.path.join(SCRIPT_DIR, 'comedk_2025_round1.pdf'),
        'year': 2025,
        'round': 'Round 1',
        'categories': ['GM', 'KKR'],
    },
    {
        'file': os.path.join(SCRIPT_DIR, 'comedk_2025_round2.pdf'),
        'year': 2025,
        'round': 'Round 2',
        'categories': ['GM', 'KKR'],
    },
    {
        'file': os.path.join(SCRIPT_DIR, 'comedk_2025_round3.pdf'),
        'year': 2025,
        'round': 'Round 3',
        'categories': ['GM'],
    },
]

RAW_CSV = os.path.join(DATA_DIR, 'comedk_raw.csv')
AGG_CSV = os.path.join(DATA_DIR, 'comedk_cutoffs.csv')


def clean_text(text):
    """Normalise whitespace and strip a string."""
    if not text:
        return ''
    return re.sub(r'\s+', ' ', str(text)).strip()


def is_rank_value(val):
    """Check if a cell value looks like a closing rank (numeric)."""
    if not val:
        return False
    cleaned = re.sub(r'[,\s]', '', str(val))
    return cleaned.isdigit() and int(cleaned) > 0


def parse_rank(val):
    """Parse a rank string to int, handling commas."""
    if not val:
        return None
    cleaned = re.sub(r'[,\s]', '', str(val))
    try:
        return int(cleaned)
    except ValueError:
        return None


def extract_pdf(pdf_config):
    """
    Extract cutoff rows from a single COMEDK PDF.

    The PDF has wide tables with this structure:
    - Row 0 (header): College Code | College Name | Category | Branch1 | Branch2 | ... | Branch7
    - Subsequent rows: code | name | GM/KKR | rank1 | rank2 | ... | rank7

    Branch headers change every ~8 pages (new section).
    """
    filepath = pdf_config['file']
    year = pdf_config['year']
    round_name = pdf_config['round']

    if not os.path.exists(filepath):
        print(f"  WARNING: {filepath} not found, skipping.")
        return []

    print(f"  Processing: {os.path.basename(filepath)} ({year} {round_name})")

    rows = []
    current_branches = []

    with pdfplumber.open(filepath) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            if not tables:
                continue

            for table in tables:
                if not table or len(table) < 2:
                    continue

                # Check if first row is a header (contains branch names)
                header_row = table[0]
                if header_row and len(header_row) > 3:
                    # Heuristic: if columns 3+ contain text that doesn't look
                    # like numbers, it's likely a branch header row
                    potential_branches = []
                    is_header = False
                    for cell in header_row[3:]:
                        txt = clean_text(cell)
                        if txt and not is_rank_value(txt):
                            is_header = True
                            potential_branches.append(txt)
                        else:
                            potential_branches.append(txt)

                    if is_header and any(potential_branches):
                        current_branches = potential_branches
                        # Process data rows (skip header)
                        data_rows = table[1:]
                    else:
                        # No new header — use previous branches
                        data_rows = table
                else:
                    data_rows = table

                if not current_branches:
                    continue

                for row_data in data_rows:
                    if not row_data or len(row_data) < 4:
                        continue

                    college_code = clean_text(row_data[0])
                    college_name = clean_text(row_data[1])
                    category = clean_text(row_data[2]).upper() if row_data[2] else ''

                    if not college_name or not category:
                        continue
                    if category not in ('GM', 'KKR'):
                        continue

                    # Extract rank values for each branch column
                    branch_values = row_data[3:]
                    for i, val in enumerate(branch_values):
                        if i >= len(current_branches):
                            break

                        branch = current_branches[i]
                        if not branch:
                            continue

                        rank = parse_rank(val)
                        if rank is None:
                            continue

                        rows.append({
                            'College': college_name,
                            'Branch': branch,
                            'Category': category,
                            'Closing Rank': rank,
                            'Round': round_name,
                            'Year': year,
                        })

    print(f"    Extracted {len(rows)} rows")
    return rows


def aggregate(raw_rows):
    """
    For each unique (College, Branch, Category, Round) group,
    average the closing rank across years.
    """
    groups = defaultdict(list)
    for row in raw_rows:
        key = (row['College'], row['Branch'], row['Category'], row['Round'])
        groups[key].append(row['Closing Rank'])

    aggregated = []
    for (college, branch, category, round_name), ranks in sorted(groups.items()):
        avg_cutoff = round(sum(ranks) / len(ranks))
        aggregated.append({
            'College': college,
            'Branch': branch,
            'Category': category,
            'Closing Rank': avg_cutoff,
            'Round': round_name,
        })

    return aggregated


def main():
    print("COMEDK PDF Extraction Script")
    print("=" * 50)

    os.makedirs(DATA_DIR, exist_ok=True)

    # Extract from all PDFs
    all_raw = []
    for pdf_config in PDFS:
        rows = extract_pdf(pdf_config)
        all_raw.extend(rows)

    if not all_raw:
        print("\nNo data extracted from any PDF.")
        print("Make sure PDF files are placed in:", SCRIPT_DIR)
        print("Expected files:")
        for p in PDFS:
            print(f"  - {os.path.basename(p['file'])}")
        sys.exit(1)

    # Write raw CSV
    print(f"\nWriting raw data to {RAW_CSV}")
    with open(RAW_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['College', 'Branch', 'Category', 'Closing Rank', 'Round', 'Year'])
        writer.writeheader()
        writer.writerows(all_raw)
    print(f"  {len(all_raw)} raw rows written")

    # Aggregate
    aggregated = aggregate(all_raw)

    # Write aggregated CSV
    print(f"\nWriting aggregated data to {AGG_CSV}")
    with open(AGG_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['College', 'Branch', 'Category', 'Closing Rank', 'Round'])
        writer.writeheader()
        writer.writerows(aggregated)
    print(f"  {len(aggregated)} aggregated rows written")

    # Summary
    rounds = set(r['Round'] for r in aggregated)
    categories = set(r['Category'] for r in aggregated)
    colleges = set(r['College'] for r in aggregated)
    print(f"\nSummary:")
    print(f"  Rounds: {sorted(rounds)}")
    print(f"  Categories: {sorted(categories)}")
    print(f"  Unique colleges: {len(colleges)}")
    print(f"  Total entries: {len(aggregated)}")


if __name__ == '__main__':
    main()
