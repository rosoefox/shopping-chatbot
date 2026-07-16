"use client";

import { FormEvent, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8001";

type SearchResult = {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  helpful: number;
  votes: number;
  verified_purchase: boolean;
  score: number | null;
};

type ChatResponse = {
  answer: string;
  results: SearchResult[];
};

type IconName =
  | "plus"
  | "chat"
  | "history"
  | "chart"
  | "shapes"
  | "user"
  | "settings"
  | "download"
  | "star"
  | "thumbUp"
  | "thumbDown"
  | "check"
  | "close"
  | "send";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    chat: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-8.7 8.2 9.4 9.4 0 0 1-4.4-1.1L3 20l1.4-4.2A8.1 8.1 0 0 1 3 11.5a8.4 8.4 0 0 1 8.7-8.2A8.4 8.4 0 0 1 21 11.5Z" />
        <path d="M8 10h8M8 14h5" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5M12 7v5l3 2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 16v-4M12 16V8M16 16v-7" />
      </>
    ),
    shapes: <path d="m12 3 4 7H8l4-7ZM5 13h6v6H5zM17 13a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.7-3 3-5 7-5s6.3 2 7 5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.6-1H5.2v-3h.2A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.6 1h.2v3H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />
      </>
    ),
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    thumbUp: (
      <>
        <path d="M7 21H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3M7 21V11l4-8a2 2 0 0 1 3.7 1.5L13 11h6.2a2 2 0 0 1 2 2.3l-1.1 6A2 2 0 0 1 18.1 21H7Z" />
      </>
    ),
    thumbDown: (
      <>
        <path d="M7 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M7 3v10l4 8a2 2 0 0 0 3.7-1.5L13 13h6.2a2 2 0 0 0 2-2.3l-1.1-6A2 2 0 0 0 18.1 3H7Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        <path d="M22 2 11 13" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const navItems: { label: string; icon: IconName; active?: boolean }[] = [
  { label: "이어버드 리뷰 분석", icon: "chat", active: true },
  { label: "노이즈 캔슬링", icon: "history" },
  { label: "착용감 비교", icon: "chart" },
  { label: "배터리 평가", icon: "shapes" },
];

async function askReviewAssistant(query: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/reviews/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: 2 }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(errorBody?.detail ?? "리뷰 검색에 실패했습니다.");
  }

  const data = (await response.json()) as ChatResponse;
  return data;
}

function Sidebar({ onNewChat }: { onNewChat: () => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>ReviewTalk</strong>
        <span>AI 리뷰 분석</span>
      </div>
      <button className="new-chat" onClick={onNewChat}>
        <Icon name="plus" size={19} /> 새 채팅
      </button>
      <div className="recent-label">최근 채팅</div>
      <nav className="nav-list">
        {navItems.map((item) => (
          <button className={`nav-item ${item.active ? "active" : ""}`} key={item.label}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="account-links">
        <button>
          <Icon name="user" /> 계정
        </button>
        <button>
          <Icon name="settings" /> 설정
        </button>
      </div>
    </aside>
  );
}

function Rating({ value = "4.8", reviews = "1,248" }: { value?: string; reviews?: string }) {
  return (
    <section className="rating">
      <p>평균 평점</p>
      <strong>{value}</strong>
      <div className="rating-stars">{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={27} />)}</div>
      <span>인증된 리뷰 {reviews}개 기준</span>
    </section>
  );
}

function TopicsAndSentiment() {
  const topics = ["#음질", "#노이즈캔슬링", "#착용감", "#배터리", "#가격", "#통화품질", "#앱연결", "#디자인"];
  return (
    <section className="summary">
      <div className="summary-title">
        <span>리뷰 감성 분석</span>
        <Icon name="chart" />
      </div>
      <div className="sentiment-bar">
        <i />
        <i />
        <i />
      </div>
      <div className="sentiment-legend">
        <span><b className="positive" />긍정 (70%)</span>
        <span><b className="neutral" />중립 (20%)</span>
        <span><b className="negative" />부정 (10%)</span>
      </div>
      <div className="summary-title topics-title">
        <span>주요 리뷰 키워드</span>
        <b>#</b>
      </div>
      <div className="topics">
        {topics.map((topic) => <button key={topic}>{topic}</button>)}
      </div>
    </section>
  );
}

function ReviewList({ type }: { type: "pros" | "cons" }) {
  const pros = [
    ["선명한 음질", "보컬과 악기 분리가 좋고 다양한 장르에서 균형 잡힌 소리를 제공합니다."],
    ["편안한 착용감", "장시간 사용해도 귀가 덜 피곤하다는 리뷰가 많습니다."],
    ["안정적인 ANC", "대중교통과 카페 소음을 줄여 집중하기 좋다는 평가가 많습니다."],
  ];
  const cons = [
    ["높은 가격", "정가 기준으로는 부담스럽다는 의견이 일부 있습니다."],
    ["케이스 스크래치", "표면 흠집이 쉽게 보일 수 있어 보호 케이스를 권하는 리뷰가 있습니다."],
    ["야외 통화", "바람이 강한 환경에서는 마이크 품질이 떨어질 수 있습니다."],
  ];
  const list = type === "pros" ? pros : cons;

  return (
    <section className={`review-list ${type}`}>
      <h2>
        <Icon name={type === "pros" ? "thumbUp" : "thumbDown"} /> {type === "pros" ? "주요 장점" : "주요 아쉬움"}
      </h2>
      <div className="list-body">
        {list.map(([title, copy]) => (
          <article key={title}>
            <span className="list-icon"><Icon name={type === "pros" ? "check" : "close"} size={15} /></span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="analysis-grid">
        <Rating />
        <TopicsAndSentiment />
      </div>
      <div className="pros-cons">
        <ReviewList type="pros" />
        <ReviewList type="cons" />
      </div>
    </div>
  );
}

function ChatHeader() {
  return (
    <header className="chat-header">
      <p>리뷰 분석 중</p>
      <h1>프리미엄 무선 이어버드 프로</h1>
      <div>
        <span>4.5★ <small>평균</small></span>
        <span>1,204 <small>리뷰</small></span>
      </div>
    </header>
  );
}

function Chat({
  question,
  answer,
  results,
  isLoading,
  error,
}: {
  question: string;
  answer: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="chat-view">
      <ChatHeader />
      <div className="conversation">
        {question && (
          <div className="user-message">
            <label>나</label>
            <p>{question}</p>
          </div>
        )}

        <div className="ai-message">
          <label><i />ReviewTalk AI</label>
          <div className="answer-card">
            <p className="assistant-answer">
              {answer || "LangChain으로 관련 리뷰를 찾고, Gemini 쇼핑도우미가 답변을 준비하고 있습니다."}
            </p>

            {error && <p className="error-text">{error}</p>}

            {!error && !isLoading && results.length === 0 && (
              <p className="empty-text">아직 검색 결과가 없습니다. 질문을 입력하면 관련 리뷰 2개를 찾아드립니다.</p>
            )}

            {results.length > 0 && (
              <div className="review-results">
                <strong className="source-title">출처 리뷰</strong>
                {results.map((review, index) => (
                  <article className="review-result" key={review.id}>
                    <span className="result-rank">{index + 1}</span>
                    <div>
                      <h3>{review.title}</h3>
                      <p>{review.content}</p>
                      <small>
                        평점 {review.rating}점 · {review.author} · {review.date}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="thinking">
            <i />관련 리뷰 검색 중<span /><span /><span />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [isChat, setIsChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    setIsChat(true);
    setSubmittedQuestion(trimmedQuestion);
    setQuestion("");
    setAnswer("");
    setResults([]);
    setError(null);
    setIsLoading(true);

    try {
      const chatResponse = await askReviewAssistant(trimmedQuestion);
      setAnswer(chatResponse.answer);
      setResults(chatResponse.results);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "리뷰 검색 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setIsChat(false);
    setQuestion("");
    setSubmittedQuestion("");
    setAnswer("");
    setResults([]);
    setError(null);
    setIsLoading(false);
  };

  return (
    <main className="app-shell">
      <Sidebar onNewChat={startNewChat} />
      <section className="main-area">
        {isChat ? (
          <Chat question={submittedQuestion} answer={answer} results={results} isLoading={isLoading} error={error} />
        ) : (
          <>
            <header className="dashboard-header">
              <div>
                <h1>프리미엄 무선 이어버드 프로</h1>
                <p><Icon name="chat" size={19} /> 전체 리뷰 1,248개</p>
              </div>
              <button><Icon name="download" size={20} /> Download</button>
            </header>
            <Dashboard />
          </>
        )}

        <form className={`question-box ${isChat ? "chat-input" : ""}`} onSubmit={submit}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={isChat ? "계속 질문을 입력하세요..." : "이 제품 리뷰에 대해 무엇이든 물어보세요..."}
            disabled={isLoading}
          />
          <button type="submit" aria-label="질문 전송" disabled={isLoading}>
            <Icon name="send" size={20} />
          </button>
          {isChat && <small>LangChain 검색 결과를 바탕으로 Gemini 쇼핑도우미가 답변합니다.</small>}
        </form>
      </section>
    </main>
  );
}
