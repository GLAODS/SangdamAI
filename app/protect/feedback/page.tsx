import { Feedback } from '@/components/feedback'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '상담 세션 피드백',
  description: 'AI가 분석한 상담 세션의 피드백을 확인하세요.',
}

export default function FeedbackPage() {
  return <Feedback />
} 