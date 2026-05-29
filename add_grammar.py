# -*- coding: utf-8 -*-
"""
JLPT Grammar Batch Add Helper
Usage: Edit new_items list, then run:
  $env:PYTHONIOENCODING = "utf-8"; python add_grammar.py
"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

# Change this to target a different level
DATA_FILE = 'src/data/grammar-n1.json'

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

new_items = [
    # Add new grammar items here, e.g.:
    # {
    #     "id": "n1-128",
    #     "level": "N1",
    #     "grammar": "〜...",
    #     "meaning": "...",
    #     "structure": "...",
    #     "explanation": "...",
    #     "examples": [
    #         {"jp": "...", "reading": "...", "zh": "...", "blank": "...", "answer": "..."},
    #         {"jp": "...", "reading": "...", "zh": "...", "blank": "...", "answer": "..."}
    #     ],
    #     "tags": ["..."]
    # },
]

if not new_items:
    print(f"No new items to add. Current total: {len(data)}")
else:
    data.extend(new_items)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Added {len(new_items)} items. Total now: {len(data)}")
