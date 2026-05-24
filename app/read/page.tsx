"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { getPdfData, getPdfName, hasPdf } from "@/lib/pdfStore";
import type { Quiz, QuizStatus } from "@/lib/types";

const Document = dynamic(() => import("react-pdf").then((m) => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), { ssr: false });
const QuizModal = dynamic(() => import("@/components/QuizModal"), { ssr: false });
const SuccessModal = dynamic(() => import("@/components/SuccessModal"), { ssr: false });

const QUIZ_INTERVAL = 15;

export default function ReadPage() {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(600);
  const [quizStatus, setQuizStatus] = useState<QuizStatus>("idle");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [successImage, setSuccessImage] = useState<string | null>(null);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [workerReady, setWorkerReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<unknown>(null);

  // Setup pdf.js worker — served locally to avoid CDN/proxy issues
  useEffect(() => {
    import("react-pdf").then(({ pdfjs }) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      setWorkerReady(true);
    });
  }, []);

  // Load PDF data from module store (populated when user uploaded on home page)
  useEffect(() => {
    if (!hasPdf()) {
      window.location.href = "/";
      return;
    }
    const data = getPdfData()!;
    const name = getPdfName();
    setPdfData(data);
    setPdfName(name);

    const savedPage = localStorage.getItem(`bookquiz-page-${name}`);
    if (savedPage) setCurrentPage(parseInt(savedPage, 10));

    const savedCheckpoints = localStorage.getItem(`bookquiz-checkpoints-${name}`);
    if (savedCheckpoints) {
      setCompletedCheckpoints(new Set(JSON.parse(savedCheckpoints)));
    }
  }, []);

  // Fetch reward images
  useEffect(() => {
    fetch("/api/images")
      .then((r) => r.json())
      .then((data) => { if (data.images) setImages(data.images.map((img: { url: string }) => img.url)); })
      .catch(() => {});
  }, []);

  // Responsive width
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (containerRef.current) {
        setContainerWidth(Math.min(containerRef.current.clientWidth - 32, 900));
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Save page progress
  useEffect(() => {
    if (pdfName && currentPage) {
      localStorage.setItem(`bookquiz-page-${pdfName}`, String(currentPage));
    }
  }, [currentPage, pdfName]);

  // Memoize file prop so react-pdf doesn't reload on every render
  // Give react-pdf a copy so it can transfer/detach that buffer; pdfData stays intact for extraction.
  const pdfFile = useMemo(() => (pdfData ? { data: pdfData.slice() } : null), [pdfData]);

  function saveCheckpoints(checkpoints: Set<number>) {
    if (pdfName) {
      localStorage.setItem(
        `bookquiz-checkpoints-${pdfName}`,
        JSON.stringify(Array.from(checkpoints))
      );
    }
  }

  const isCheckpointPage = (page: number) => page % QUIZ_INTERVAL === 0;
  const checkpointIndex = (page: number) => Math.floor(page / QUIZ_INTERVAL) - 1;
  const isAtUnpassedCheckpoint =
    isCheckpointPage(currentPage) && !completedCheckpoints.has(checkpointIndex(currentPage));

  type PdfDoc = {
    numPages: number;
    getPage: (n: number) => Promise<{
      getTextContent: () => Promise<{ items: { str?: string }[] }>;
      getViewport: (opts: { scale: number }) => { width: number; height: number };
      render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
    }>;
  };

  async function getPdfDoc(): Promise<PdfDoc> {
    const data = getPdfData();
    if (!data) throw new Error("PDF not loaded");
    const { pdfjs } = await import("react-pdf");
    if (!pdfDocRef.current) {
      pdfDocRef.current = await pdfjs.getDocument({ data: data.slice() }).promise;
    }
    return pdfDocRef.current as PdfDoc;
  }

  async function extractText(startPage: number, endPage: number): Promise<string> {
    const pdf = await getPdfDoc();
    let text = "";
    for (let i = startPage; i <= Math.min(endPage, pdf.numPages); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str ?? "").join(" ") + "\n";
    }
    return text.trim();
  }

  async function extractPageImages(startPage: number, endPage: number): Promise<string[]> {
    const pdf = await getPdfDoc();
    const images: string[] = [];
    const last = Math.min(endPage, pdf.numPages);
    const step = Math.max(1, Math.floor((last - startPage + 1) / 8));
    for (let i = startPage; i <= last; i += step) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.8 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.55));
    }
    return images;
  }

  const triggerQuiz = useCallback(async () => {
    const cp = checkpointIndex(currentPage);
    setQuizStatus("loading");
    setError("");

    const startPage = cp * QUIZ_INTERVAL + 1;
    const endPage = (cp + 1) * QUIZ_INTERVAL;

    let text = "";
    let images: string[] = [];

    try {
      text = await extractText(startPage, endPage);
    } catch {
      // will fall through to image path
    }

    if (!text) {
      try {
        images = await extractPageImages(startPage, endPage);
      } catch (err) {
        console.error("image extraction failed:", err);
        setError("Could not read pages from this PDF.");
        setQuizStatus("idle");
        return;
      }
    }

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text || undefined, images: images.length ? images : undefined, checkpoint: cp }),
      });
      const data = await res.json();
      if (!res.ok || !data.questions) {
        setError("Failed to generate quiz. Try again.");
        setQuizStatus("idle");
        return;
      }
      setQuiz(data as Quiz);
      setQuizStatus("active");
    } catch {
      setError("Network error. Try again.");
      setQuizStatus("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  function onQuizPass() {
    const cp = checkpointIndex(currentPage);
    const next = new Set(completedCheckpoints).add(cp);
    setCompletedCheckpoints(next);
    saveCheckpoints(next);
    setSuccessImage(images[cp] ?? null);
    setQuizStatus("success");
  }

  function onQuizSkip() {
    setQuizStatus("idle");
    setQuiz(null);
    advancePage();
  }

  function onSuccessContinue() {
    setQuizStatus("idle");
    setQuiz(null);
    setSuccessImage(null);
    advancePage();
  }

  function advancePage() {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }

  function goNext() {
    if (isAtUnpassedCheckpoint) {
      if (quizStatus === "idle") triggerQuiz();
      return;
    }
    advancePage();
  }

  function goPrev() {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  if (!pdfFile || !workerReady) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#2a2d3a] bg-[#0f1117]/80 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => (window.location.href = "/")}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Home
        </button>
        <div className="text-center">
          <p className="text-white text-sm font-medium truncate max-w-48">{pdfName}</p>
          <p className="text-gray-500 text-xs">Page {currentPage} of {totalPages || "…"}</p>
        </div>
        <div className="text-gray-500 text-xs text-right">
          {completedCheckpoints.size} checkpoint{completedCheckpoints.size !== 1 ? "s" : ""} cleared
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-[#2a2d3a]">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* PDF area */}
      <main ref={containerRef} className="flex-1 flex flex-col items-center py-8 px-4 gap-6">
        {quizStatus === "loading" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white font-medium">Generating quiz…</p>
              <p className="text-gray-400 text-sm mt-1">Analysing pages {checkpointIndex(currentPage) * QUIZ_INTERVAL + 1}–{currentPage}</p>
            </div>
          </div>
        )}

        <Document
          file={pdfFile}
          onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
          loading={<div className="text-gray-500 text-sm animate-pulse mt-20">Loading PDF…</div>}
          error={<div className="text-red-400 text-sm mt-20">Failed to load PDF.</div>}
        >
          <Page
            pageNumber={currentPage}
            width={containerWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>

        {/* Quiz gate */}
        {isAtUnpassedCheckpoint && quizStatus === "idle" && (
          <div className="w-full max-w-md bg-indigo-950/40 border border-indigo-500/40 rounded-xl px-5 py-4 text-center animate-fade-in">
            <p className="text-indigo-300 font-semibold mb-1">🎓 Checkpoint reached!</p>
            <p className="text-gray-400 text-sm mb-3">Complete the quiz to unlock the next section.</p>
            <button
              onClick={triggerQuiz}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-all active:scale-95"
            >
              Start Quiz
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={goPrev}
            disabled={currentPage <= 1}
            className="px-5 py-2.5 rounded-xl border border-[#2a2d3a] text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-all"
          >
            ← Prev
          </button>

          <span className="text-gray-600 text-sm min-w-24 text-center">
            {currentPage} / {totalPages || "…"}
          </span>

          <button
            onClick={goNext}
            disabled={currentPage >= totalPages || quizStatus === "loading"}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isAtUnpassedCheckpoint
                ? "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500"
                : "border border-[#2a2d3a] text-gray-300 hover:text-white hover:border-gray-500"
            }`}
          >
            {isAtUnpassedCheckpoint ? "📝 Take Quiz" : "Next →"}
          </button>
        </div>

        {/* Checkpoint dots */}
        {totalPages > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center max-w-xl">
            {Array.from({ length: Math.floor(totalPages / QUIZ_INTERVAL) }, (_, i) => (
              <div
                key={i}
                title={`Checkpoint ${i + 1} — page ${(i + 1) * QUIZ_INTERVAL}`}
                className={`w-2 h-2 rounded-full transition-colors ${
                  completedCheckpoints.has(i)
                    ? "bg-green-500"
                    : currentPage >= (i + 1) * QUIZ_INTERVAL
                    ? "bg-indigo-500"
                    : "bg-[#2a2d3a]"
                }`}
              />
            ))}
          </div>
        )}
      </main>

      {quizStatus === "active" && quiz && (
        <QuizModal quiz={quiz} onPass={onQuizPass} onClose={onQuizSkip} />
      )}

      {quizStatus === "success" && quiz && (
        <SuccessModal imageUrl={successImage} checkpoint={quiz.checkpoint} onContinue={onSuccessContinue} />
      )}
    </div>
  );
}
