# Shopping Review Search API

FastAPI, LangChain, Gemini Embedding, ChromaDB, Gemini LLM으로 구성한 리뷰 챗봇 백엔드입니다.
CSV 리뷰를 벡터화한 뒤 관련 리뷰를 검색하고, 쇼핑도우미 전문가 페르소나로 답변합니다.

## 환경 변수

`backend/.env` 파일을 만들고 Gemini API 키를 등록하세요.

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## 실행

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

## Swagger 확인 순서

1. `POST /reviews/index`
   - `samples/review.csv`를 로드하고 파싱한 뒤 `gemini-embedding-001` 임베딩으로 ChromaDB에 저장합니다.
2. `POST /reviews/search`
   - 관련 리뷰를 검색하고 Gemini LLM 답변과 출처를 반환합니다. 예시 요청:

```json
{
  "query": "노이즈 캔슬링과 착용감이 좋은 리뷰를 찾아줘",
  "top_k": 5
}
```

## 추가 설정

- `REVIEW_API_CSV_PATH`
- `REVIEW_API_CHROMA_DIR`
- `REVIEW_API_COLLECTION_NAME`
- `REVIEW_API_EMBEDDING_MODEL`
- `REVIEW_API_LLM_MODEL`
- `REVIEW_API_SEARCH_K`
- `REVIEW_API_INDEX_BATCH_SIZE`
- `REVIEW_API_INDEX_BATCH_DELAY_SECONDS`
