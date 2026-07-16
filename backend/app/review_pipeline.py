from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from langchain_chroma import Chroma
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai._common import GoogleGenerativeAIError
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from app.config import Settings


class MissingGoogleApiKeyError(RuntimeError):
    pass


class ReviewEmbeddingError(RuntimeError):
    pass


class ReviewLLMError(RuntimeError):
    pass


def get_embeddings(settings: Settings) -> GoogleGenerativeAIEmbeddings:
    if settings.google_api_key is None:
        raise MissingGoogleApiKeyError(
            "Gemini 임베딩을 사용하려면 backend/.env에 GEMINI_API_KEY를 설정하세요."
        )

    return GoogleGenerativeAIEmbeddings(
        model=settings.embedding_model,
        google_api_key=settings.google_api_key.get_secret_value(),
    )


def get_llm(settings: Settings) -> ChatGoogleGenerativeAI:
    if settings.google_api_key is None:
        raise MissingGoogleApiKeyError(
            "Gemini LLM을 사용하려면 backend/.env에 GEMINI_API_KEY를 설정하세요."
        )

    return ChatGoogleGenerativeAI(
        model=settings.llm_model,
        google_api_key=settings.google_api_key.get_secret_value(),
        temperature=0.3,
    )


def load_review_documents(csv_path: Path) -> list[Document]:
    loader = CSVLoader(
        file_path=str(csv_path),
        encoding="utf-8",
        csv_args={
            "delimiter": ",",
            "quotechar": '"',
        },
    )
    documents = loader.load()

    parsed_documents: list[Document] = []
    for document in documents:
        metadata = _normalize_metadata(document.metadata)
        row = _parse_csv_loader_page_content(document.page_content)
        metadata.update(row)

        title = row.get("title", "")
        content = row.get("content", "")
        rating = row.get("rating", "")
        page_content = f"평점: {rating}\n제목: {title}\n리뷰: {content}"

        parsed_documents.append(Document(page_content=page_content, metadata=metadata))

    return parsed_documents


def build_vector_store(settings: Settings, reset: bool = True) -> Chroma:
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    embeddings = get_embeddings(settings)

    if reset:
        existing_store = Chroma(
            collection_name=settings.collection_name,
            embedding_function=embeddings,
            persist_directory=str(settings.chroma_dir),
        )
        existing_store.delete_collection()

    documents = load_review_documents(settings.csv_path)
    vector_store = Chroma(
        collection_name=settings.collection_name,
        embedding_function=embeddings,
        persist_directory=str(settings.chroma_dir),
    )

    try:
        for index in range(0, len(documents), settings.index_batch_size):
            batch = documents[index : index + settings.index_batch_size]
            vector_store.add_documents(batch)
            has_more_batches = index + settings.index_batch_size < len(documents)
            if has_more_batches and settings.index_batch_delay_seconds > 0:
                time.sleep(settings.index_batch_delay_seconds)
    except GoogleGenerativeAIError as exc:
        raise ReviewEmbeddingError(str(exc)) from exc

    return vector_store


def get_vector_store(settings: Settings) -> Chroma:
    return Chroma(
        collection_name=settings.collection_name,
        embedding_function=get_embeddings(settings),
        persist_directory=str(settings.chroma_dir),
    )


def search_reviews(settings: Settings, query: str, top_k: int) -> list[dict[str, Any]]:
    vector_store = get_vector_store(settings)
    try:
        matches = vector_store.similarity_search_with_score(query, k=top_k)
    except GoogleGenerativeAIError as exc:
        raise ReviewEmbeddingError(str(exc)) from exc

    results: list[dict[str, Any]] = []
    for document, score in matches:
        metadata = document.metadata
        results.append(
            {
                "id": str(metadata.get("id", "")),
                "rating": _to_int(metadata.get("rating"), default=0),
                "title": str(metadata.get("title", "")),
                "content": str(metadata.get("content", "")),
                "author": str(metadata.get("author", "")),
                "date": str(metadata.get("date", "")),
                "helpful": _to_int(metadata.get("helpful"), default=0),
                "votes": _to_int(metadata.get("votes"), default=0),
                "verified_purchase": _to_bool(metadata.get("verified_purchase")),
                "score": float(score),
            }
        )

    return results


def generate_shopping_assistant_answer(
    settings: Settings,
    query: str,
    reviews: list[dict[str, Any]],
) -> str:
    if not reviews:
        return "관련 리뷰를 찾지 못했습니다. 질문을 조금 더 구체적으로 바꿔 다시 시도해 주세요."

    context = "\n\n".join(
        [
            (
                f"[출처 {index}] 리뷰 ID: {review['id']}\n"
                f"평점: {review['rating']}점\n"
                f"제목: {review['title']}\n"
                f"내용: {review['content']}\n"
                f"작성자: {review['author']}, 날짜: {review['date']}"
            )
            for index, review in enumerate(reviews, start=1)
        ]
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "당신은 쇼핑도우미 전문가입니다. 사용자가 제품 구매 판단을 빠르게 할 수 있도록 "
                    "친절하고 실용적으로 답변하세요. 반드시 제공된 리뷰 근거만 사용하고, "
                    "없는 내용은 추측하지 마세요. 답변에는 핵심 판단, 이유, 구매 조언을 포함하세요. "
                    "마지막에는 반드시 '출처' 섹션을 만들고 사용한 출처 번호와 리뷰 ID를 표시하세요."
                ),
            ),
            (
                "human",
                (
                    "사용자 질문: {query}\n\n"
                    "검색된 리뷰 근거:\n{context}\n\n"
                    "한국어로 4~6문장으로 답변해 주세요."
                ),
            ),
        ]
    )

    try:
        chain = prompt | get_llm(settings) | StrOutputParser()
        return chain.invoke({"query": query, "context": context})
    except GoogleGenerativeAIError as exc:
        raise ReviewLLMError(str(exc)) from exc


def _parse_csv_loader_page_content(page_content: str) -> dict[str, str]:
    row: dict[str, str] = {}
    for line in page_content.splitlines():
        key, separator, value = line.partition(":")
        if separator:
            row[key.strip()] = value.strip()
    return row


def _normalize_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(metadata)
    normalized.pop("source", None)
    normalized.pop("row", None)
    return normalized


def _to_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y"}
