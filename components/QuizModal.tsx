"use client";

import { useState } from "react";
import type { Quiz } from "@/lib/types";

interface Props {
  quiz: Quiz;
  onPass: () => void;
  onClose: () => void;
}

type Phase = "answering" | "result";

export default function QuizModal({ quiz, onPass, onClose }: Props) {
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(quiz.questions.length).fill(null)
  );
  const [phase, setPhase] = useState<Phase>("answering");
  const [showHints, setShowHints] = useState<boolean[]>(
    Array(quiz.questions.length).fill(false)
  );
  const [showAnswers, setShowAnswers] = useState(false);

  const allAnswered = selected.every((s) => s !== null);

  const correct = quiz.questions.map((q, i) => selected[i] === q.correctIndex);
  const score = correct.filter(Boolean).length;
  const passed = score >= 2;

  function submit() {
    setPhase("result");
    if (passed) {
      setTimeout(onPass, 1200);
    }
  }

  function retry() {
    setSelected(Array(quiz.questions.length).fill(null));
    setShowHints(Array(quiz.questions.length).fill(false));
    setShowAnswers(false);
    setPhase("answering");
  }

  function toggleHint(i: number) {
    setShowHints((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-[#1a1d27] rounded-2xl border border-[#2a2d3a] shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2a2d3a] flex items-center justify-between">
          <div>
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">
              Checkpoint {quiz.checkpoint + 1}
            </p>
            <h2 className="text-white text-xl font-bold">Quiz Time!</h2>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">
              {quiz.questions.length} questions
            </p>
            <p className="text-gray-600 text-xs">Pass 2 of 3 to continue</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto space-y-6">
          {quiz.questions.map((q, qi) => {
            const isCorrect = phase === "result" && correct[qi];
            const isWrong = phase === "result" && !correct[qi];

            return (
              <div key={qi} className={`rounded-xl p-4 border transition-colors ${
                phase === "result"
                  ? isCorrect
                    ? "border-green-500/40 bg-green-950/20"
                    : "border-red-500/40 bg-red-950/20"
                  : "border-[#2a2d3a]"
              }`}>
                <p className="text-white font-medium mb-3 leading-relaxed">
                  <span className="text-gray-500 mr-2">Q{qi + 1}.</span>
                  {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected[qi] === oi;
                    const isCorrectOpt = phase === "result" && oi === q.correctIndex;
                    const isWrongSelected =
                      phase === "result" && isSelected && oi !== q.correctIndex;

                    let btnClass =
                      "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ";
                    if (phase === "answering") {
                      btnClass += isSelected
                        ? "border-indigo-500 bg-indigo-600/20 text-indigo-200"
                        : "border-[#2a2d3a] bg-[#0f1117] text-gray-300 hover:border-gray-500 hover:text-white";
                    } else {
                      if (isCorrectOpt)
                        btnClass += "border-green-500 bg-green-600/20 text-green-200";
                      else if (isWrongSelected)
                        btnClass += "border-red-500 bg-red-600/20 text-red-200";
                      else
                        btnClass += "border-[#2a2d3a] bg-[#0f1117] text-gray-500";
                    }

                    return (
                      <button
                        key={oi}
                        disabled={phase === "result"}
                        onClick={() => {
                          if (phase !== "answering") return;
                          setSelected((prev) => {
                            const next = [...prev];
                            next[qi] = oi;
                            return next;
                          });
                        }}
                        className={btnClass}
                      >
                        <span className="text-gray-500 mr-2">
                          {["A", "B", "C", "D"][oi]}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Hints / answers */}
                {phase === "result" && isWrong && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleHint(qi)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                      >
                        {showHints[qi] ? "Hide hint" : "Show hint"}
                      </button>
                      {showAnswers && (
                        <span className="text-xs text-green-400">
                          ✓ Correct: {q.options[q.correctIndex]}
                        </span>
                      )}
                    </div>
                    {showHints[qi] && (
                      <p className="text-xs text-yellow-300/80 bg-yellow-950/30 border border-yellow-800/30 rounded-lg px-3 py-2">
                        💡 {q.hint}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[#2a2d3a]">
          {phase === "answering" && (
            <button
              disabled={!allAnswered}
              onClick={submit}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"
            >
              Submit Answers
            </button>
          )}

          {phase === "result" && passed && (
            <div className="text-center">
              <p className="text-green-400 font-bold text-lg mb-1">
                {score === 3 ? "🎯 Perfect score!" : "✅ Passed!"}
              </p>
              <p className="text-gray-400 text-sm">Loading your reward...</p>
            </div>
          )}

          {phase === "result" && !passed && (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <p className="text-red-400 font-bold text-lg mb-1">
                  {score}/3 — so close!
                </p>
                <p className="text-gray-400 text-sm">You need at least 2 correct to pass.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAnswers(true)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm transition-all"
                >
                  Show Answers
                </button>
                <button
                  onClick={retry}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
                >
                  Try Again
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Skip quiz and continue reading
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
