from pydantic import BaseModel, Field


class IndexResponse(BaseModel):
    indexed_count: int = Field(..., description="ChromaDB에 저장된 리뷰 문서 수")
    collection_name: str
    csv_path: str


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, examples=["노이즈 캔슬링과 착용감이 좋은가요?"])
    top_k: int = Field(5, ge=1, le=20, description="검색할 관련 리뷰 개수")


class ReviewSearchResult(BaseModel):
    id: str
    rating: int
    title: str
    content: str
    author: str
    date: str
    helpful: int
    votes: int
    verified_purchase: bool
    score: float | None = Field(None, description="Chroma 유사도 점수. 낮을수록 더 가까운 거리입니다.")


class SearchResponse(BaseModel):
    query: str
    answer: str
    count: int
    results: list[ReviewSearchResult]


class HealthResponse(BaseModel):
    status: str
    app: str
