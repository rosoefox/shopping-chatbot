from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.review_pipeline import (
    MissingGoogleApiKeyError,
    ReviewEmbeddingError,
    ReviewLLMError,
    build_vector_store,
    generate_shopping_assistant_answer,
    search_reviews,
)
from app.schemas import HealthResponse, IndexResponse, SearchRequest, SearchResponse


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=(
        "LangChain, Gemini Embedding, ChromaDB, Gemini LLM을 사용한 쇼핑 리뷰 챗봇 API입니다."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", app=settings.app_name)


@app.post("/reviews/index", response_model=IndexResponse, tags=["reviews"])
async def index_reviews() -> IndexResponse:
    if not settings.csv_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CSV 파일을 찾을 수 없습니다: {settings.csv_path}",
        )

    try:
        vector_store = build_vector_store(settings, reset=True)
    except MissingGoogleApiKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ReviewEmbeddingError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Gemini 임베딩 API 쿼터를 초과했습니다. 잠시 후 다시 시도하세요. "
                f"원문 오류: {exc}"
            ),
        ) from exc

    collection = vector_store.get()

    return IndexResponse(
        indexed_count=len(collection.get("ids", [])),
        collection_name=settings.collection_name,
        csv_path=str(settings.csv_path),
    )


@app.post("/reviews/search", response_model=SearchResponse, tags=["reviews"])
async def search_related_reviews(request: SearchRequest) -> SearchResponse:
    if not settings.chroma_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="먼저 /reviews/index 엔드포인트로 CSV 리뷰를 인덱싱하세요.",
        )

    try:
        results = search_reviews(settings, query=request.query, top_k=request.top_k)
        answer = generate_shopping_assistant_answer(settings, query=request.query, reviews=results)
    except MissingGoogleApiKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ReviewEmbeddingError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Gemini 임베딩 API 쿼터를 초과했습니다. 잠시 후 다시 시도하세요. "
                f"원문 오류: {exc}"
            ),
        ) from exc
    except ReviewLLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini LLM 응답 생성에 실패했습니다. 원문 오류: {exc}",
        ) from exc

    return SearchResponse(query=request.query, answer=answer, count=len(results), results=results)
