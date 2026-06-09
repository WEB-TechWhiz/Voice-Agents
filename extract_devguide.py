import sys
from docx import Document
import pathlib

# Paths
docx_path = pathlib.Path(r"d:/Voice Agents/VoiceAI_ZeroCost_DevGuide_v2.docx")
output_path = pathlib.Path(r"d:/Voice Agents/VoiceAI_ZeroCost_DevGuide_v2.txt")

if not docx_path.is_file():
    print(f"Docx file not found: {docx_path}", file=sys.stderr)
    sys.exit(1)

doc = Document(docx_path)
text_lines = []
for para in doc.paragraphs:
    text_lines.append(para.text)

# Write to txt
output_path.write_text("\n".join(text_lines), encoding="utf-8")
print(f"Extracted text to {output_path}")
