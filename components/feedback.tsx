'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ThumbsUp, ThumbsDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Moon, Sun } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import Image from 'next/image'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// 타입 정의
type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type ChatHistory = {
  messages: ChatMessage[];
  sessionMetrics: {
    responseCount: number;
    startTime: string;
    endTime: string;
  };
}

type FeedbackData = {
  summary: {
    strengths: string[];
    improvements: string[];
  };
  rubric: Array<{
    category: string;
    score: number;
    maxScore: number;
    feedback: string;
    evidence: string[];
  }>;
  sentenceAnalysis: {
    effectiveSentences: Array<{
      sentence: string;
      explanation: string;
    }>;
    improvementNeeded: Array<{
      sentence: string;
      suggestion: string;
    }>;
  };
  detailedFeedback: string;
}

// 차트 데이터 타입 정의 추가
type ChartDataEntry = {
  name: string;
  value: number;
  maxScore?: number;
}

// 기본 피드백 데이터 정의
const defaultFeedback: FeedbackData = {
  summary: {
    strengths: [
      "기본적인 상담 구조화 시도",
      "경청하는 태도 유지",
      "상담 진행 노력"
    ],
    improvements: [
      "더 구체적인 질문하기",
      "공감 표현 강화",
      "명확한 목표 설정"
    ]
  },
  rubric: [
    {
      category: "상담자 전문성",
      score: 2,
      maxScore: 3,
      feedback: "기본적인 상담 기술을 보여주었으나, 더 깊이 있는 전문적 개입이 필합니다.",
      evidence: [
        "대화 내용에서 발견된 구체적인 근거1",
        "대화 내용에서 발견된 구체적인 근거2"
      ]
    },
    {
      category: "치료적 관계  ",
      score: 2,
      maxScore: 3,
      feedback: "기본적인 라포는 형성되었으나, 더 깊은 신뢰 관계 구축이 필요합니다.",
      evidence: [
        "대화 내용에서 발견된 구체적인 근거1",
        "대화 내용에서 발견된 구체적인 근거2"
      ]
    },
    {
      category: "목표 지향적 개입",
      score: 2,
      maxScore: 3,
      feedback: "목표 설정은 시도되었으나, 더 구체적인 행동 계획이 필요합니다.",
      evidence: [
        "대화 내용에서 발견된 구체적인 근거1",
        "대화 내용에서 발견된 구체적인 근거2"
      ]
    }
  ],
  sentenceAnalysis: {
    effectiveSentences: [
      {
        sentence: "말씀하신 내용이 많이 힘드셨을 것 같네요",
        explanation: "기본적인 공감 표현을 적절히 사용"
      }
    ],
    improvementNeeded: [
      {
        sentence: "그렇군요",
        suggestion: "단순 호응이 아닌 구체적인 공감 표현으로 대체 필요"
      }
    ]
  },
  detailedFeedback: "이번 상담 세션에서는 기본적인 상담 구조와 진행이 시도되었습니다. 하지만  과적인 상담을 위해서는 구체적인 질문과 명확한 목표 설정이 필요합니다. 전문성 향상과 이 있는 개입을 위한 속적인 노력이 요구됩니다."
};

// AI 피드백 생성을 위한 프롬프트 템플릿
const generateFeedbackPrompt = (chatHistory: ChatHistory) => {
  return `아래 상담 내용을 평가하고, 상담 세션의 효과성과 상담자의 개입 방식에 대해 분석한 뒤, JSON 형식으로 응답해주세요.

목표:
1. 상담자의 강점과 개선점을 명확히 식별
2. 각 평가 항목에 대한 점수와 구체적인 이유 제공
3. 상담 세션 전반에 대한 상세 피드백 제공

평가 기준:
1. 상담자 전문성 (3점 만점)
   - 전문적이고 명확한 개입을 보여주었는가?
   - 적절한 상담 기법과 전략을 사용하였는가?
   - 내담자의 문제를 정확히 파악하고 있는가?

2. 치료적 관계 형성 (3점 만점)
   - 상담자와 내담자 간의 신뢰 관계가 형성되었는가?
   - 공감적 이해와 경청이 효과적으로 이루어졌는가?
   - 내담자가 안전하게 자신을 표현할 수 있는 환경을 조성하였는가?

3. 목표 지향적 개입 (3점 만점)
   - 체적인 상담 목표가 설정되었는가?
   - 실천 가능한 행동 계획이 제시되었는가?
   - 내담자의 변화를 위한 명확한 방향성이 시되었는가?

분석 요청 사항:
- 상담자의 청 태도, 공감 표현, 목표 설정 및 구체적 조언 여부를 평가
- 내담자의 반응과 피드백에 대한 상담자의 대처 방식 분석
- 상담 세션의 구조화와 대화 흐름에 대한 전반적인 평가

추가 분석 요청 사항:
1. 상담사가 효과적으로 사용한 구체적인 문장들을 식별하고 그 이유를 설명
2. 개선이 필요한 문장들을 식별하고 구체적인 개선 제안 제시

상담 내용:
${chatHistory.messages.map(msg => 
  `${msg.role === 'user' ? '상담사' : '내담자'}: ${msg.content}`
).join('\n')}

세션 정보:
- 시작 시간: ${new Date(chatHistory.sessionMetrics.startTime).toLocaleString()}
- 종료 시간: ${new Date(chatHistory.sessionMetrics.endTime).toLocaleString()}
- 총 응답 수: ${chatHistory.sessionMetrics.responseCount}

다음 JSON 형식으로 응답해주세요:
{
  "summary": {
    "strengths": ["강점1", "강점2", "강점3"],
    "improvements": ["개선점1", "개선점2", "개선점3"]
  },
  "rubric": [
    {
      "category": "상담자 전문성",
      "score": 2,
      "maxScore": 3,
      "feedback": "구체적인 피드백 내용",
      "evidence": [
        "대화 내용에서 발견된 구체적인 근거1",
        "대화 내용에서 발견된 구체적인 근거2"
      ]
    },
    {
      "category": "치료적 관계 형성",
      "score": 2,
      "maxScore": 3,
      "feedback": "구체적인 피드백 내용",
      "evidence": [
        "대화 내용에서 발견된 구체적인 근거1",
        "대화 내용에서 발견된 구체적인 근거2"
      ]
    },
    {
      "category": "목표 지향적 개입",
      "score": 2,
      "maxScore": 3,
      "feedback": "구체적인 피드백 내용",
      "evidence": [
        "대화 내용에서 발견된 구체적인 근거1",
        "대화 내용에서 발견된 구체적인 근거2"
      ]
    }
  ],
  "sentenceAnalysis": {
    "effectiveSentences": [
      {
        "sentence": "상담사가 사용한 좋은 문장",
        "explanation": "해당 장이 효과적인 이유 설명"
      }
    ],
    "improvementNeeded": [
      {
        "sentence": "상담사가 사용한 반드시 개선이 필요한 문장",
        "suggestion": "구체적인 개선 제안"
      }
    ]
  },
  "detailedFeedback": "세션 전반에 대한 상세 피드백 내용"
}

위 내용을 바탕으로 JSON 식으로만 주세요.`;
};

// OpenAI API를 호출하여 피드백 생성
async function generateAIFeedback(chatHistory: ChatHistory) {
  const prompt = generateFeedbackPrompt(chatHistory);
  
  // 프롬프트 로깅
  console.log('=== AI 피드백 생성 프롬프트 ===');
  console.log(prompt);
  console.log('==============================');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'PeakChat',
      },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_OPENROUTER_FEED_BACK_MODEL,
        messages: [
          { 
            role: "system", 
            content: "상담 세션 피드백을 제공하는 AI입니다. 유효한 JSON 객체로만 응답하며 설명이나 마크다운 형식은 포함하지 않습니다."
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== API 응답 오류 ===');
      console.error(errorText);
      console.error('====================');
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 로깅
    console.log('=== API 응답 데이터 ===');
    console.log(JSON.stringify(data, null, 2));
    console.log('=====================');

    if (!data.choices?.[0]?.message?.content) {
      console.error('=== API 응답 데이터 누락 ===');
      console.error(data);
      console.error('=========================');
      return defaultFeedback;
    }

    let contentToProcess = data.choices[0].message.content;

    // 파싱된 응답 로깅
    console.log('=== 파싱된 응답 ===');
    console.log(contentToProcess);
    console.log('==================');

    try {
      const parsedContent = typeof contentToProcess === 'object' 
        ? contentToProcess 
        : JSON.parse(contentToProcess.trim()
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '')
            .replace(/^\s*{/, '{')
            .replace(/}\s*$/, '}')
            .replace(/\\"/g, '"')
            .replace(/[\n\r]/g, ' '));

      // 파싱 결과 로깅
      console.log('=== 최종 파싱 결과 ===');
      console.log(JSON.stringify(parsedContent, null, 2));
      console.log('=====================');

      if (!parsedContent.summary?.strengths || 
          !parsedContent.summary?.improvements || 
          !parsedContent.rubric || 
          !parsedContent.sentenceAnalysis || 
          !parsedContent.detailedFeedback) {
        console.error('=== 필수 필드 누락 ===');
        console.error(parsedContent);
        console.error('====================');
        return defaultFeedback;
      }

      return parsedContent as FeedbackData;
    } catch (parseError) {
      console.error('=== JSON 파싱 오류 ===');
      console.error(parseError);
      console.error('파싱 시도한 문자열:', contentToProcess);
      console.error('====================');
      return defaultFeedback;
    }
  } catch (error) {
    console.error('=== AI 피드백 생성 오류 ===');
    console.error(error);
    console.error('=========================');
    return defaultFeedback;
  }
}

// 상단에 아바타 URL 상수들 추가
const clientAvatarUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=Mimi&backgroundColor=b6e3f4`;
const counselorAvatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=Counselor&backgroundColor=f0f8ff`;

export function Feedback() {
  const [sessionData, setSessionData] = useState<ChatHistory | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    let mounted = true;

    const loadFeedback = async () => {
      if (!mounted) return;
      
      const savedSession = localStorage.getItem('counselingSession');
      if (!savedSession) {
        setError('세션 데이터를 찾을  없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        const parsedSession = JSON.parse(savedSession);
        if (mounted) {
          setSessionData(parsedSession);
          const feedback = await generateAIFeedback(parsedSession);
          if (mounted) {
            setFeedbackData(feedback);
          }
        }
      } catch (error) {
        if (mounted) {
          setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadFeedback();

    return () => {
      mounted = false;
    };
  }, []);

  // 차트 데이터 생성
  const createChartData = (data: FeedbackData): {
    barChartData: ChartDataEntry[];
    pieChartData: ChartDataEntry[];
  } => {
    const barChartData = [
      { 
        name: '강점', 
        value: data.summary.strengths.length
      },
      { 
        name: '개선점', 
        value: data.summary.improvements.length
      }
    ];

    const pieChartData = data.rubric.map(item => ({
      name: item.category,
      value: item.score,
      maxScore: item.maxScore
    }));

    return { barChartData, pieChartData };
  };

  // 메모이제이션을 통한 불필요한 재렌더링 방지
  const chartData = useMemo(() => {
    if (!feedbackData) {
      return createChartData(defaultFeedback);
    }
    return createChartData(feedbackData);
  }, [feedbackData]);

  // 이벤트 핸들러 메모이제이션
  const handleDarkModeToggle = useCallback(() => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  }, [isDarkMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[300px]">
          <CardHeader>
            <CardTitle className="text-center">분석 </CardTitle>
            <CardDescription className="text-center">
              상담 세션을 분석하고 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <Progress value={100} className="w-full animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">오류 발생</CardTitle>
            <CardDescription>피드백을 생성하는 중 문제가 발생했습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!feedbackData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Alert>
          <AlertTitle>데이터 없음</AlertTitle>
          <AlertDescription>피드백 데이터를 찾을 수 없습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 차트 데이터 생성
  const { barChartData, pieChartData } = createChartData(feedbackData);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center pl-4 md:pl-6">
              <Image
                src="/logo_mini.svg"
                alt="PeakChat Logo"
                width={32}
                height={32}
                className="h-8 w-auto dark:invert"
                priority
              />
            </Link>
          </div>

          <div className="flex-1 flex justify-center">
            <h1 className="text-lg md:text-xl font-semibold">상담 세션 피드</h1>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9"
              aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {isDarkMode ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              )}
              <span className="sr-only">테마 변경</span>
            </Button>
            
            <Link href="/dashboard">
              <Button variant="ghost" className="hidden md:flex">
                <ArrowLeft className="mr-2 h-4 w-4" />
                대시보드
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">대시보드로 돌아가기</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-6">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">요약</TabsTrigger>
            <TabsTrigger value="rubric">루브릭 평가</TabsTrigger>
            <TabsTrigger value="analysis">문장 분석</TabsTrigger>
            <TabsTrigger value="detailed">상세 피드백</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="grid gap-6">
              {/* 세션 정보 카드 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">세션 정보</CardTitle>
                      <CardDescription className="text-sm">상담 세션의 기본 정보입니다.</CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      총 {sessionData?.sessionMetrics.responseCount || 0}회 응답
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">시작 시간</p>
                      <p className="text-sm font-medium">
                        {sessionData && new Date(sessionData.sessionMetrics.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 8 14" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">종료 시간</p>
                      <p className="text-sm font-medium">
                        {sessionData && new Date(sessionData.sessionMetrics.endTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">상담 시간</p>
                      <p className="text-sm font-medium">
                        {sessionData && Math.round((new Date(sessionData.sessionMetrics.endTime).getTime() - 
                          new Date(sessionData.sessionMetrics.startTime).getTime()) / 1000 / 60)}분
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">날짜</p>
                      <p className="text-sm font-medium">
                        {sessionData && new Date(sessionData.sessionMetrics.startTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 통합된 내담자 정보 및 상담 세션 안내 카드 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={clientAvatarUrl} alt="Client" />
                      <AvatarFallback>CL</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>내담자 정보</CardTitle>
                      <CardDescription>상담 세션의 내담자 정보와 대화 내용입니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 상담 세션 안내 섹션 */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">내담자:</span> 20세 여성 대학생</p>
                      <p><span className="font-medium">주 호소 문제:</span> 사람들 앞에서 말하거나 발표할 때 극심한 불안과 신체 증상 경험 (심장 두근거림, 손 떨림 등)</p>
                      <p><span className="font-medium">상담 목표:</span></p>
                      <ul className="list-disc list-inside pl-4">
                        <li>불안감 감소</li>
                        <li>이완 기법 습득</li>
                        <li>자신감 회복</li>
                        <li>사회적 상황에 대한 두려움 극복</li>
                      </ul>
                    </div>
                  </div>

                  {/* 대화 내용 아코디언 */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="chat-history">
                      <AccordionTrigger className="text-sm font-medium">
                        대화 내용 보기
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 mt-2">
                          {sessionData?.messages
                            .filter(message => message.role !== 'system')
                            .slice(1)
                            .map((message, index) => (
                              <div
                                key={index}
                                className={`flex gap-3 ${
                                  message.role === 'user'
                                    ? 'flex-row-reverse'
                                    : 'flex-row'
                                }`}
                              >
                                {message.role === 'assistant' && (
                                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={clientAvatarUrl} alt="Client" />
                                      <AvatarFallback>CL</AvatarFallback>
                                    </Avatar>
                                  </div>
                                )}
                                <div
                                  className={`rounded-lg px-4 py-2 text-sm ${
                                    message.role === 'user'
                                      ? 'bg-primary/10'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {message.content}
                                </div>
                              </div>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* 평가 요약 카드 */}
              <Card>
                <CardHeader>
                  <CardTitle>평가 요약</CardTitle>
                  <CardDescription>AI가 분석한 상담 성과입니다.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold flex items-center mb-3 text-green-600">
                        <ThumbsUp className="mr-2 h-5 w-5" />
                        잘한 점
                      </h3>
                      <div className="space-y-2">
                        {feedbackData.summary.strengths.map((strength, index) => (
                          <div key={index} className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                            <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                            <p className="text-sm">{strength}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold flex items-center mb-3 text-red-600">
                        <ThumbsDown className="mr-2 h-5 w-5" />
                        개선할 점
                      </h3>
                      <div className="space-y-2">
                        {feedbackData.summary.improvements.map((improvement, index) => (
                          <div key={index} className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                            <div className="mt-1 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                            <p className="text-sm">{improvement}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 점수 분포 카드 */}
              <Card>
                <CardHeader>
                  <CardTitle>점수 분포</CardTitle>
                  <CardDescription>각 평가 영역별 점수 분포입니다.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 lg:gap-8">
                  <div className="h-[300px] min-h-[250px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart aria-label="평가 점수 분포 차트">
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          innerRadius={60}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, value, maxScore }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            return (
                              <text
                                x={x}
                                y={y}
                                fill="#000000"
                                textAnchor="middle"
                                dominantBaseline="central"
                                style={{ 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  fill: '#000000'
                                }}
                              >
                                {`${value}/${maxScore}`}
                              </text>
                            );
                          }}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={5}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`hsl(${index * 120}, 70%, 50%)`} 
                            />
                          ))}
                        </Pie>
                        <Legend
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{
                            paddingLeft: "20px",
                            fontSize: "12px",
                            color: "var(--foreground)"
                          }}
                          formatter={(value: string) => {
                            const item = pieChartData.find(d => d.name === value);
                            return `${value} (${item?.value}/${item?.maxScore})`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {feedbackData.rubric.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.score}/{item.maxScore}
                          </span>
                        </div>
                        <Progress 
                          value={(item.score / item.maxScore) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rubric">
            <Card>
              <CardHeader>
                <CardTitle>루브릭 평가</CardTitle>
                <CardDescription>각 평가 영역 점수와 피드백입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          innerRadius={60}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, value, maxScore }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            return (
                              <text
                                x={x}
                                y={y}
                                fill="#000000"
                                textAnchor="middle"
                                dominantBaseline="central"
                                style={{ 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  fill: '#000000'
                                }}
                              >
                                {`${value}/${maxScore}`}
                              </text>
                            );
                          }}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={5}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`hsl(${index * 120}, 70%, 50%)`} 
                            />
                          ))}
                        </Pie>
                        <Legend
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{
                            paddingLeft: "20px",
                            fontSize: "12px",
                            color: "var(--foreground)"
                          }}
                          formatter={(value: string) => {
                            const item = pieChartData.find(d => d.name === value);
                            return `${value} (${item?.value}/${item?.maxScore})`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {feedbackData.rubric.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.score}/{item.maxScore}
                          </span>
                        </div>
                        <Progress 
                          value={(item.score / item.maxScore) * 100} 
                          className="h-2"
                        />
                        <p className="text-sm text-muted-foreground mt-2">{item.feedback}</p>
                        {item.evidence && item.evidence.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-sm font-medium mb-1">평가 근거:</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {item.evidence.map((evidence, idx) => (
                                <li key={idx}>{evidence}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Accordion type="single" collapsible className="w-full mt-6">
                  {/* 루브릭 상세 내용 */}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>문장 분석</CardTitle>
                <CardDescription>상담 대화에서 사용된 문장들에 대한 구체적인 분석입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div>
                    <h3 className="font-semibold text-green-600 mb-3">효과적으로 사용된 문장</h3>
                    <div className="space-y-4">
                      {feedbackData.sentenceAnalysis.effectiveSentences.map((item, index) => (
                        <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                          <p className="font-medium">"{item.sentence}"</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-red-600 mb-3">개선이 필요한 문장</h3>
                    <div className="space-y-4">
                      {feedbackData.sentenceAnalysis.improvementNeeded.map((item, index) => (
                        <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                          <p className="font-medium">"{item.sentence}"</p>
                          <p className="text-sm text-muted-foreground mt-1">제안: {item.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed">
            <Card>
              <CardHeader>
                <CardTitle>상세 피드백</CardTitle>
                <CardDescription>AI가 제공하는 구체적인 피드백 내용입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {feedbackData.detailedFeedback}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-4 md:py-6">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <div className="pl-4 md:pl-6">
              <Image
                src="/logo_mini.svg"
                alt="PeakChat Logo"
                width={24}
                height={24}
                className="h-6 w-auto dark:invert"
              />
            </div>
            <p className="ml-4">© 2024 PeakChat. All rights reserved.</p>
          </div>
          <nav className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/terms" className="hover:underline">이용약관</Link>
            <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
            <Link href="/contact" className="hover:underline">문의하기</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}