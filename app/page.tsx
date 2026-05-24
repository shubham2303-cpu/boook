"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { storePdf } from "@/lib/pdfStore";

export default function Home() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Only PDF files accepted.");
        return;
      }
      setError("");
      setLoading(true);
      await storePdf(file);
      router.push("/read");
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0f1117] px-4">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
          📖 BookQuiz
        </h1>
        <p className="text-gray-400 text-lg">Read 15 pages. Answer a quiz. Earn a reward.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`w-full max-w-md border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-6 transition-all cursor-pointer ${
          dragging
            ? "border-indigo-400 bg-indigo-950/20"
            : "border-gray-700 hover:border-gray-500 bg-[#1a1d27]"
        }`}
        onClick={() => !loading && document.getElementById("pdf-input")?.click()}
      >
        <input
          type="file"
          accept=".pdf"
          id="pdf-input"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {loading ? (
          <>
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading PDF…</p>
          </>
        ) : (
          <>
            <svg
              className={`w-16 h-16 transition-colors ${dragging ? "text-indigo-400" : "text-gray-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Drop your PDF here</p>
              <p className="text-gray-500 text-sm mt-1">or click to browse</p>
            </div>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

      <p className="mt-8 text-gray-600 text-xs">
        <a href="/admin" className="underline hover:text-gray-400 transition-colors">
          Manage reward images →
        </a>
      </p>
    </main>
  );
}
