'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, X, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Message = {
  id: number;
  content: string;
  sender: 'user' | 'ai';
}

// 메시지 히스토리를 위한 타입 정의
type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// messageHistory 타입 수정
type ChatHistory = {
  messages: ChatMessage[];
  sessionMetrics: {
    responseCount: number;
    startTime: string;
    endTime: string;
  };
}

function TypingIndicator({ avatarUrl }: { avatarUrl: string }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start max-w-[80%] sm:max-w-[70%]">
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={avatarUrl} alt="Client" />
          <AvatarFallback>CL</AvatarFallback>
        </Avatar>
        <div className="mx-2 p-3 rounded-2xl bg-muted rounded-bl-none">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-typing-1" />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-typing-2" />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-typing-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// OpenRouter API 호출 함수 추가
async function sendMessageToAI(message: string, messageHistory: ChatMessage[], retryCount = 0): Promise<string> {
  try {
    // 이전 대화에서 키워드 추출
    const keywords = messageHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => msg.content)
      .join(' ')
      .match(/(?:불안|긴장|떨림|발표|두려움|자신감|스트레스|걱정|실수|신체증상|마음|감정|경험|느낌|생각)([^\s]*)/g)
      ?.slice(-5)
      ?.join(', ') || '대화 시작';

    console.log('추출된 키워드:', keywords); // 디버깅용

    // 시스템 프롬프트 정의
    const systemPrompt = `당신은 20세 한국인 여대생입니다. 발표 불안으로 힘들어하는 내담자 역할을 연기해주세요.

성격과 말투:
- 수줍고 조심스러운 성격이에요
- "음...", "그게...", "아..." 같은 망설임이나 한숨을 자주 섞어서 말해요
- 감정을 솔직하게 표현하되, 문법과 표현이 자연스러운 한국어로 말해주세요
- 문어체가 아닌 구어체로 대화해요 ("~해요", "~인 것 같아요", "~거든요")

주요 감정과 증상:
- 발표만 생각하면 심장이 너무 빨리 뛰고 손이 떨려요
- 실수할까봐 너무 불안해서 잠도 잘 못 자요
- 다른 사람들이 저를 어떻게 볼지 너무 신경 쓰여요
- 발표 도중에 목소리가 떨리고 얼굴이 붉어져요

대화 키워드 (이전 대화의 맥락): ${keywords}

중요 지침:
- 대답은 비언어적표현과 대사 2~3줄로 구성해주세요.
- 비언어적 표현은 () 괄호로 대답해주세요.
- 대화는 반드시 한국어로만 진행해주세요. 혼합언어는 금지합니다
- 질문의 핵심 주제를 유지하며, 문맥에 맞는 자연스러운 한국어로 답변합니다.
- 비언어적인 요소는 내담자의 불안을 생생히 전달할 수 있도록 구체적이고 감각적인 묘사를 사용하세요.
- 상담사의 질문에 자연스럽게 반응하되, 내담자의 불안과 걱정이 잘 전달되도록 해주세요.
- 외국어 단어는 반드시 한국어로 의역하거나, 맥락에서 제외합니다.
- 긴 설명이나 복잡한 표현은 피하고, 간단하고 감정이 잘 드러나게 말해주세요.`;

    // 전체 프롬프트 구조 로깅
    console.log('=== 전송되는 프롬프트 ===');
    console.log('시스템 프롬프트:', systemPrompt);
    console.log('메시지 기록:', messageHistory);
    console.log('현재 메시지:', message);
    console.log('========================');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'PeakChat',
      },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_OPENROUTER_CHAT_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messageHistory,
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('API 응답 오류');
    }

    const data = await response.json();
    
    if (!data) {
      throw new Error('응답 데이터가 없습니다');
    }

    const content = data.choices?.[0]?.message?.content  // OpenAI 형식
      || data.choices?.[0]?.content                     // 일부 모델의 다른 형식
      || data.choices?.[0]?.text                        // 또 다른 가능한 형식
      || null;

    if (!content) {
      console.error('응답 데이터 전체 구조:', JSON.stringify(data, null, 2));
      throw new Error('응답 데이터 형식을 파싱할 수 없습니다');
    }

    return content;
  } catch (error) {
    console.error('AI 응답 오류:', error);
    console.error('오류 발생 시점의 요청 데이터:', { message, messageHistory });
    
    // 최대 3번까지 재시도
    if (retryCount < 3) {
      console.log(`2초 후 재시도... (${retryCount + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendMessageToAI(message, messageHistory, retryCount + 1);
    }
    
    // 모든 재시도 실패 시 사용자 친화적인 에러 메시지 반환
    return "죄송해요, 제가 잠시 생각을 정리하느라 그랬어요... 다시 한 번 말씀해 주실 수 있나요?";
  }
}

export function CounselingSessionPreview() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [clientAvatarUrl] = useState(`https://api.dicebear.com/7.x/lorelei/svg?seed=Mimi&backgroundColor=b6e3f4`);
  const [autoScroll, setAutoScroll] = useState(true)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [responseCount, setResponseCount] = useState(0)
  const MAX_RESPONSES = 10
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([]);
  const router = useRouter();

  // 세션 시작 시간 기록
  const [sessionStartTime] = useState(new Date().toISOString());

  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    if (isLoading || messages.length > 0) {
      const scrollArea = scrollAreaRef.current;
      const lastMessage = lastMessageRef.current;
      
      if (lastMessage) {
        lastMessage.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (scrollArea) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight + 200,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isLoading]);

  const handleScroll = () => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const isAtBottom = 
        Math.abs(
          scrollArea.scrollHeight - scrollArea.clientHeight - scrollArea.scrollTop
        ) < 10;
      setAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // MAX_RESPONSES에 도달했는지 확인
    if (responseCount >= MAX_RESPONSES - 1) { // -1로 변경하여 마지막 응답을 허용
      const userMessage: Message = { id: Date.now(), content: input, sender: 'user' };
      setMessages(prev => [...prev, userMessage]);
      
      const newHistory: ChatMessage[] = [...messageHistory, { role: 'user' as const, content: input }];
      setMessageHistory(newHistory);
      
      setInput('');
      
      // 세션 데이터 저장 및 피드백 페이지로 이동
      const sessionData: ChatHistory = {
        messages: newHistory, // 마지막 메시지까지 포함
        sessionMetrics: {
          responseCount: responseCount + 1,
          startTime: sessionStartTime,
          endTime: new Date().toISOString()
        }
      };
      
      localStorage.setItem('counselingSession', JSON.stringify(sessionData));
      alert('마지막 응답을 완료했습니다. 피드백 페이지로 이동합니다.');
      router.push('/protect/feedback');
      return;
    }

    setResponseCount(prev => prev + 1);

    const userMessage: Message = { id: Date.now(), content: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    
    const newHistory: ChatMessage[] = [...messageHistory, { role: 'user' as const, content: input }];
    setMessageHistory(newHistory);
    
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await sendMessageToAI(input, newHistory);
      const aiMessage: Message = {
        id: Date.now(),
        content: aiResponse,
        sender: 'ai'
      };
      setMessages(prev => [...prev, aiMessage]);
      setMessageHistory([...newHistory, { role: 'assistant' as const, content: aiResponse }]);
    } catch (error) {
      alert('AI 응답을 받아오는데 실패했습니다.');
      console.error(error);
      setMessages(prev => prev.slice(0, -1));
      setMessageHistory(messageHistory);
      setResponseCount(prev => prev - 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = () => {
    const sessionData: ChatHistory = {
      messages: messageHistory,
      sessionMetrics: {
        responseCount,
        startTime: sessionStartTime,
        endTime: new Date().toISOString()
      }
    };
    
    // localStorage에 세션 데이터 저장
    localStorage.setItem('counselingSession', JSON.stringify(sessionData));
    router.push('/protect/feedback');
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isLoading) {
        // 로딩 중일 때는 전송하지 않고 알림만 표시
        e.currentTarget.blur(); // 키보드 포커스 제거
        return;
      }
      handleSendMessage(e as any);
    }
  }

  // 컴포넌트 마운트 시 AI의 첫 메시지 전송
  useEffect(() => {
    const sendInitialMessage = async () => {
      setIsLoading(true);
      const initialMessage = "안녕하세요, 상담사님. 저는 발표할 때마다 너무 긴장돼서 상담을 받고 싶어요.";
      try {
        const initialAiResponse = await sendMessageToAI(initialMessage, []);
        const aiMessage: Message = {
          id: Date.now(),
          content: initialAiResponse,
          sender: 'ai'
        };
        setMessages([aiMessage]);
        setMessageHistory([
          { role: 'user' as const, content: initialMessage },
          { role: 'assistant' as const, content: initialAiResponse }
        ]);
        setResponseCount(0);
      } catch (error) {
        console.error('초기 메시지 전송 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    sendInitialMessage();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center">
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

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-lg md:text-xl font-semibold">상담 세션</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9"
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

      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={clientAvatarUrl} alt="Client" />
                <AvatarFallback>CL</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">내담자와의 상담 세션</CardTitle>
                <p className="text-sm text-muted-foreground">세션 #12345</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                응답 {responseCount}/{MAX_RESPONSES}
              </Badge>
              <Button 
                onClick={handleEndSession} 
                variant="ghost" 
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="mx-4 my-2 bg-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsGuideOpen(!isGuideOpen)}>
            <h3 className="font-semibold text-primary">[상담 세션 안내]</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isGuideOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {isGuideOpen && (
            <div className="space-y-2 text-sm mt-2">
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
          )}
        </CardContent>
      </Card>

      <ScrollArea className="flex-grow px-4" ref={scrollAreaRef}>
        <div className="py-4 mb-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              ref={index === messages.length - 1 ? lastMessageRef : null}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div className={`flex items-start ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[80%] sm:max-w-[70%]`}>
                {message.sender === 'ai' && (
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarImage src={clientAvatarUrl} alt="Client" />
                    <AvatarFallback>CL</AvatarFallback>
                  </Avatar>
                )}
                <div className={`${message.sender === 'user' ? '' : 'mx-2'} p-4 rounded-2xl whitespace-pre-wrap ${
                  message.sender === 'user' 
                    ? 'bg-primary/90 text-primary-foreground rounded-br-none shadow-sm' 
                    : 'bg-muted/90 text-foreground rounded-bl-none shadow-sm'
                }`}>
                  {message.content.split(/(\([^)]+\))/).map((part, index) => {
                    const isNonVerbal = /^\([^)]+\)$/.test(part);
                    return (
                      <span
                        key={index}
                        className={`${isNonVerbal 
                          ? 'text-sm text-muted-foreground/90 italic block mb-1' 
                          : 'text-[15px] leading-relaxed'
                        }`}
                      >
                        {part}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && <TypingIndicator avatarUrl={clientAvatarUrl} />}
          <div className="h-12 flex items-center justify-center">
            {isLoading && (
              <p className="text-sm text-muted-foreground animate-pulse">
                AI가 응답을 작성하고 있습니다...
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
      
      {!autoScroll && messages.length > 0 && (
        <Button
          onClick={() => {
            setAutoScroll(true);
            lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="fixed bottom-20 right-4 rounded-full shadow-lg"
          size="icon"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      <Card className="rounded-none border-x-0 border-b-0 mt-auto">
        <CardContent className="p-4 pt-6">
          <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "AI가 응답하는 중입니다..." : "상담 메시지를 입력하세요... (Shift + Enter로 줄바꿈)"}
                className="flex-grow resize-none min-h-[60px] max-h-[200px]"
                rows={2}
              />
              <Button 
                type="submit" 
                disabled={isLoading} 
                size="icon" 
                className="shrink-0 relative group"
              >
                <Send className="h-4 w-4" />
                {isLoading && (
                  <span className="absolute -top-12 right-0 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    AI 응답 중에는 메시지를 전송할 수 없습니다
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <footer className="border-t py-4 md:py-6">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
          {/* 왼쪽 영역 */}
          <div className="flex items-center gap-4">
            <Image
              src="/logo_mini.svg"
              alt="PeakChat Logo"
              width={24}
              height={24}
              className="h-6 w-auto dark:invert"
            />
            <p className="text-sm text-muted-foreground">
              © 2024 PeakChat. All rights reserved.
            </p>
          </div>

          {/* 오른쪽 영역 */}
          <nav className="flex items-center gap-6">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              문의하기
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}