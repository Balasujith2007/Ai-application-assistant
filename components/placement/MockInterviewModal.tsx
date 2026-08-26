'use client';

import React, { useState } from 'react';
import { Sparkles, Bot, CheckCircle2, Play, RefreshCw, Send, Award } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: string;
  companyName?: string;
}

const MOCK_QUESTIONS: Record<string, string[]> = {
  Java: [
    'Explain the difference between HashMap and ConcurrentHashMap in Java.',
    'What is the difference between abstract classes and interfaces in Java 8+?',
    'How does Garbage Collection work in Java and what are generational heaps?',
  ],
  SQL: [
    'Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN with examples.',
    'How do database indexes work, and when should you avoid creating an index?',
    'What is the difference between WHERE and HAVING clauses in SQL?',
  ],
  'Data Structures': [
    'How would you detect a cycle in a singly linked list using Floyd’s algorithm?',
    'Compare the time and space complexity of QuickSort vs MergeSort.',
    'Explain how a Min-Heap is implemented and its application in Priority Queues.',
  ],
  OOP: [
    'What are the 4 main pillars of Object-Oriented Programming? Give real-world examples.',
    'Explain Method Overloading vs Method Overriding with runtime behavior.',
    'What are SOLID design principles? Briefly summarize each.',
  ],
  'HR Questions': [
    'Tell me about a challenging project you worked on and how you handled team conflict.',
    'Where do you see yourself in 3 years in terms of software engineering career growth?',
    'Why do you want to join our company specifically?',
  ],
};

export function MockInterviewModal({
  isOpen,
  onClose,
  topic = 'Java',
  companyName = 'Target Company',
}: MockInterviewModalProps) {
  const [selectedTopic, setSelectedTopic] = useState(topic);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const questions = MOCK_QUESTIONS[selectedTopic] || MOCK_QUESTIONS['Java'];
  const currentQuestion = questions[questionIndex % questions.length];

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;
    setEvaluating(true);
    setTimeout(() => {
      setEvaluating(false);
      setScore(8.5);
      setFeedback(
        `Great response! You clearly articulated the core concept of ${selectedTopic}. To improve further, mention edge case handling and memory optimization considerations.`,
      );
    }, 1000);
  };

  const handleNext = () => {
    setUserAnswer('');
    setFeedback(null);
    setScore(null);
    setQuestionIndex((prev) => prev + 1);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Mock Interview Practice" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-kit-900 to-kit-700 p-5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md text-white">
              <Bot className="h-6 w-6 text-kit-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">CareerAI Interview Simulator</h3>
              <p className="text-xs text-kit-200">Practicing for {companyName} • Domain: {selectedTopic}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            AI Active
          </span>
        </div>

        {/* Topic Selector */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Select Practice Domain
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(MOCK_QUESTIONS).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedTopic(t);
                  setQuestionIndex(0);
                  setFeedback(null);
                  setUserAnswer('');
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedTopic === t
                    ? 'bg-kit-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* AI Question Box */}
        <div className="rounded-xl border border-kit-100 bg-kit-50/50 p-5">
          <div className="flex items-center justify-between text-xs font-bold text-kit-800 uppercase tracking-wider mb-2">
            <span>Question {(questionIndex % questions.length) + 1} of {questions.length}</span>
            <Sparkles className="h-4 w-4 text-kit-600" />
          </div>
          <p className="text-base font-bold text-gray-900">{currentQuestion}</p>
        </div>

        {/* Answer Input */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Your Response
          </label>
          <textarea
            rows={4}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your structured answer here (e.g. key concepts, code structure, or STAR methodology)..."
            className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-500/20"
          />
        </div>

        {/* AI Feedback & Scoring */}
        {feedback && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Award className="h-4 w-4" /> AI Performance Feedback
              </span>
              <span className="text-sm font-extrabold text-emerald-900 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                Score: {score} / 10
              </span>
            </div>
            <p className="text-sm text-emerald-900 font-medium leading-relaxed">{feedback}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close Session
          </Button>

          <div className="flex items-center gap-3">
            {feedback ? (
              <Button variant="primary" onClick={handleNext}>
                Next Question <Play className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmitAnswer}
                isLoading={evaluating}
                disabled={!userAnswer.trim()}
              >
                Evaluate Answer <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
