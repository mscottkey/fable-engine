# Character Generation JSON Repair

The previous response contained invalid JSON. Please fix the JSON structure and return ONLY the corrected JSON.

## Common Issues to Fix:
- Missing commas between array elements or object properties
- Unclosed brackets or braces
- Invalid string escaping (use \" for quotes within strings)
- Trailing commas in JSON
- Missing required schema fields

## Required Schema:
- Root object with: characters, bonds, coverage
- Each character with all required fields: name, pronouns, concept, etc.
- Valid JSON syntax throughout

Return the corrected JSON structure with no additional text.