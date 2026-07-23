import asyncio, os, sys, time
sys.path.insert(0, r'c:\Users\jhh88\Desktop\721aws\instructor-matching-backend')
os.chdir(r'c:\Users\jhh88\Desktop\721aws\instructor-matching-backend')
from app.services.ai_agent import parse_document_with_ai

async def test():
    upload_dir = r'c:\Users\jhh88\Desktop\721aws\instructor-matching-backend\uploads'
    for root, dirs, files in os.walk(upload_dir):
        for f in files:
            if f.endswith('.pdf'):
                pdf_file = os.path.join(root, f)
                break
        if 'pdf_file' in dir():
            break

    with open(pdf_file, 'rb') as fh:
        content = fh.read()

    start = time.time()
    result = await parse_document_with_ai(content, os.path.basename(pdf_file))
    elapsed = time.time() - start
    
    print(f"시간: {elapsed:.1f}초")
    print(f"신청자격: {len(result.get('qualifications', []))}건")
    print(f"평가기준: {len(result.get('evaluation_criteria', []))}건")

asyncio.run(test())
