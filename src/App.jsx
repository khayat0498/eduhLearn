import { useEffect, useRef, useState } from "react";

function latexToHtml(latex) {
  let s = latex;
  s = s.replace(/\\text\{([^}]*)}/g, "$1");
  s = s.replace(/\\textbf\{([^}]*)}/g, "<b>$1</b>");
  s = s.replace(/\\textit\{([^}]*)}/g, "<i>$1</i>");
  s = s.replace(/\\frac\{([^}]*)}\{([^}]*)}/g,
    '<span class="frac"><span class="frac-n">$1</span><span class="frac-d">$2</span></span>');
  s = s.replace(/\\sqrt\{([^}]*)}/g, "√($1)");
  s = s.replace(/\_{([^}]*)}/g, "<sub>$1</sub>");
  s = s.replace(/_([A-Za-z0-9])/g, "<sub>$1</sub>");
  s = s.replace(/\^{([^}]*)}/g, "<sup>$1</sup>");
  s = s.replace(/\^([A-Za-z0-9])/g, "<sup>$1</sup>");
  s = s.replace(/\\to\b/g, "→");
  s = s.replace(/\\rightarrow\b/g, "→");
  s = s.replace(/\\leftarrow\b/g, "←");
  s = s.replace(/\\times\b/g, "×");
  s = s.replace(/\\cdot\b/g, "·");
  s = s.replace(/\\pm\b/g, "±");
  s = s.replace(/\\leq\b/g, "≤");
  s = s.replace(/\\geq\b/g, "≥");
  s = s.replace(/\\neq\b/g, "≠");
  s = s.replace(/\\approx\b/g, "≈");
  s = s.replace(/\\infty\b/g, "∞");
  s = s.replace(/\\alpha\b/g, "α");
  s = s.replace(/\\beta\b/g, "β");
  s = s.replace(/\\gamma\b/g, "γ");
  s = s.replace(/\\delta\b/g, "δ");
  s = s.replace(/\\Delta\b/g, "Δ");
  s = s.replace(/\\theta\b/g, "θ");
  s = s.replace(/\\pi\b/g, "π");
  s = s.replace(/\\mu\b/g, "μ");
  s = s.replace(/\\lambda\b/g, "λ");
  s = s.replace(/\\sigma\b/g, "σ");
  s = s.replace(/\\omega\b/g, "ω");
  s = s.replace(/\\[!,;:]+/g, "");
  s = s.replace(/\\q?quad\b/g, " ");
  s = s.replace(/\\\\/g, "<br>");
  s = s.replace(/\\[a-zA-Z]+/g, "");
  s = s.replace(/[{}]/g, "");
  s = s.replace(/ {2,}/g, " ");
  return s.trim();
}

const subjects = [
  { id: "math", label: "Matematika" },
  { id: "physics", label: "Fizika" },
  { id: "chemistry", label: "Kimyo" },
];

const levels = [
  { id: "easy", label: "Oson" },
  { id: "medium", label: "O'rtacha" },
  { id: "hard", label: "Qiyin" },
];

export default function App() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const mathRef = useRef(null);
  const scaleRef = useRef(1);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const [base64, setBase64] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [tryMode, setTryMode] = useState(false);
  const [questionLatex, setQuestionLatex] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [feedback, setFeedback] = useState("");
  const feedbackRef = useRef(null);
  const [tokenCount, setTokenCount] = useState(0);
  const [tool, setTool] = useState("pen");
  const [strokeSize, setStrokeSize] = useState(4);
  const [subject, setSubject] = useState("math");
  const [level, setLevel] = useState("easy");
  const [questionOpen, setQuestionOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("tokenCount");
    if (saved) setTokenCount(Number(saved) || 0);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("tokenCount", String(tokenCount));
  }, [tokenCount]);

  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener("contextmenu", prevent, { passive: false });
    document.addEventListener("selectstart", prevent, { passive: false });
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("selectstart", prevent);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      scaleRef.current = scale;
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [tryMode]);

  useEffect(() => {
    if (!mathRef.current || !questionLatex) return;
    const container = mathRef.current;

    if (/\\text\s*\{/.test(questionLatex)) {
      container.className = "math-display";
      container.innerHTML = latexToHtml(questionLatex);
    } else {
      container.className = "math-display math-pure";
      container.innerHTML = "";
      const mf = document.createElement("math-field");
      mf.setAttribute("read-only", "");
      mf.className = "pure-math-field";
      container.appendChild(mf);
      requestAnimationFrame(() => {
        try {
          if (typeof mf.setValue === "function") mf.setValue(questionLatex);
          else mf.value = questionLatex;
        } catch {}
      });
    }
  }, [questionLatex]);

  useEffect(() => {
    if (!feedbackRef.current || !feedback) return;

    const renderLatex = () => {
      const container = feedbackRef.current;
      if (!container || !window.MathLive) return;

      // $...$ formatidagi LaTeX ni topish va render qilish
      const parts = feedback.split(/(\$[^$]+\$)/g);

      container.innerHTML = '';

      parts.forEach((part) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // LaTeX formula
          const latex = part.slice(1, -1);
          const span = document.createElement('span');
          span.className = 'latex-inline';
          span.innerHTML = `\\(${latex}\\)`;
          container.appendChild(span);

          // MathLive bilan render qilish
          try {
            window.MathLive.renderMathInElement(span);
          } catch (e) {
            span.textContent = part;
          }
        } else {
          // Oddiy matn
          const textNode = document.createTextNode(part);
          container.appendChild(textNode);
        }
      });
    };

    setTimeout(renderLatex, 150);
  }, [feedback]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current || 1;
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: (clientX - rect.left) * scale,
      y: (clientY - rect.top) * scale,
    };
  };

  const applyBrush = (ctx) => {
    const scale = scaleRef.current || 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = strokeSize * 2 * scale;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = strokeSize * scale;
    }
  };

  const handleStart = (event) => {
    event.preventDefault();
    if (event.pointerId && canvasRef.current?.setPointerCapture) {
      canvasRef.current.setPointerCapture(event.pointerId);
    }
    isDrawingRef.current = true;
    lastPointRef.current = getPoint(event);
    setStatus("Drawing");
  };

  const handleMove = (event) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    applyBrush(ctx);
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const handleEnd = (event) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    if (event.pointerId && canvasRef.current?.releasePointerCapture) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    setStatus("Captured");
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setBase64("");
    setOcrText("");
    setFeedback("");
    setStatus("Ready");
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    const data = canvas.toDataURL("image/png");
    setBase64(data);
    setStatus("Base64 ready");
  };

  const addTokens = (delta) => {
    if (!delta || Number.isNaN(delta)) return;
    setTokenCount((prev) => prev + Number(delta));
  };

  const handleOcr = async () => {
    if (!base64) {
      setOcrText("No image yet. Click Scan first.");
      return;
    }
    try {
      setIsOcrLoading(true);
      setStatus("OCR running");
      const response = await fetch("https://back-eduhpro.onrender.com/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOcrText(data?.details || data?.error || "OCR failed");
        setStatus("OCR failed");
        return;
      }
      setOcrText(data?.text || "");
      addTokens(data?.tokenCount || 0);
      setStatus("OCR done");
    } catch (err) {
      setOcrText(err.message || "OCR failed");
      setStatus("OCR failed");
    } finally {
      setIsOcrLoading(false);
    }
  };

  const startTry = async () => {
    setTryMode(true);
    setQuestionOpen(true);
    setStatus("Loading question");
    setFeedback("");
    setOcrText("");
    setBase64("");
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    try {
      const response = await fetch("https://back-eduhpro.onrender.com/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, level }),
      });
      const data = await response.json();
      if (!response.ok) {
        setQuestionLatex("Question failed to load.");
        setAnswerText("");
        setStatus("Question failed");
        return;
      }
      let cleaned = String(data?.questionLatex || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/\$\$/g, "")
        .replace(/\$/g, "")
        .replace(/question[_\\s-]*latex\\s*[:=]/gi, "")
        .replace(/answer[_\\s-]*text\\s*[:=]/gi, "")
        .trim();
      if (cleaned.includes("\\text") && !cleaned.includes("\\\\") && cleaned.includes(";")) {
        cleaned = cleaned.replace(/\\s*;\\s*/g, " \\\\ ");
      }
      if (cleaned.includes("\\text") && cleaned.includes("\\n")) {
        cleaned = cleaned.replace(/\\n/g, " \\\\ ");
      }
      setQuestionLatex(cleaned);
      setAnswerText(data?.answerText || "");
      addTokens(data?.tokenCount || 0);
      setStatus("Ready");
    } catch (err) {
      setQuestionLatex("Question failed to load.");
      setAnswerText("");
      setStatus("Question failed");
    }
  };

  const handleCheck = async () => {
    if (!base64) {
      handleExport();
    }
    try {
      setIsOcrLoading(true);
      setStatus("Checking");
      const response = await fetch("https://back-eduhpro.onrender.com/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          questionLatex,
          answerText,
          subject,
          level,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback(data?.details || data?.error || "Check failed");
        setFeedbackOpen(true);
        setStatus("Check failed");
        return;
      }
      setFeedback(data?.feedback || "");
      setFeedbackOpen(true);
      addTokens(data?.tokenCount || 0);
      setStatus("Checked");
    } catch (err) {
      setFeedback(err.message || "Check failed");
      setFeedbackOpen(true);
      setStatus("Check failed");
    } finally {
      setIsOcrLoading(false);
    }
  };

  return (
    <div className="app" onContextMenu={(e) => e.preventDefault()}>
      <header className="topbar simple">
        <div className="brand">
          <div className="logo">Δ</div>
          <div>
            <div className="brand-title">AI Canvas Lab</div>
            <div className="brand-sub">Handwritten answers → verified</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="primary" onClick={startTry}>
            Start Try
          </button>
        </div>
      </header>

      {!tryMode && (
        <main className="layout simple">
          <section className="selector">
            <div className="selector-head">
              <div className="eyebrow">Fan va daraja</div>
              <h1>Qaysi fan bo'yicha ishlaymiz?</h1>
            </div>
            <div className="subject-grid">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  className={subject === s.id ? "subject-card active" : "subject-card"}
                  onClick={() => setSubject(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="level-row">
              {levels.map((l) => (
                <button
                  key={l.id}
                  className={level === l.id ? "primary" : "ghost"}
                  onClick={() => setLevel(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>
        </main>
      )}

      {tryMode && (
        <section
          className="try-mode"
          onContextMenu={(e) => e.preventDefault()}
          onSelectStart={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Floating: question toggle (chap) */}
          <button
            className="question-toggle"
            onClick={() => setQuestionOpen(true)}
          >
            ?
          </button>

          {/* Floating: tools toggle (o'ng) */}
          <button
            className="tools-toggle"
            onClick={() => setToolsOpen((v) => !v)}
          >
            {toolsOpen ? "✕" : "≡"}
          </button>

          {/* Question drawer */}
          <div className={`try-top${questionOpen ? " open" : ""}`}>
            <div className="try-top-header">
              <div className="try-title">Question</div>
              <button
                className="question-close"
                onClick={() => setQuestionOpen(false)}
              >
                →
              </button>
            </div>
            <div ref={mathRef} className="math-display" />
            {!questionLatex && (
              <div className="question-fallback">
                Question unavailable. Try again.
              </div>
            )}
          </div>

          {/* Fullscreen canvas */}
          <div className="try-canvas">
            <div className="canvas-stage try-stage" ref={wrapRef}>
              <div className="grid" />
              <canvas
                ref={canvasRef}
                className="draw-canvas"
                onPointerDown={handleStart}
                onPointerMove={handleMove}
                onPointerUp={handleEnd}
                onPointerLeave={handleEnd}
                onPointerCancel={handleEnd}
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="canvas-hint">Write your answer here</div>
            </div>

            {/* Tools popup */}
            <div className={`tool-row${toolsOpen ? " open" : ""}`}>
              <div className="tool-group">
                <button
                  className={tool === "pen" ? "primary small tool-icon" : "ghost small tool-icon"}
                  onClick={() => setTool("pen")}
                  title="Pen"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                </button>
                <button
                  className={tool === "eraser" ? "primary small tool-icon" : "ghost small tool-icon"}
                  onClick={() => setTool("eraser")}
                  title="Eraser"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
                    <path d="M22 21H7"/>
                  </svg>
                </button>
                <button
                  className="ghost small tool-icon"
                  onClick={handleClear}
                  title="Clear"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
                <button
                  className="ghost small tool-icon"
                  onClick={handleExport}
                  title="Scan"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
              </div>
              <input
                className="slider"
                type="range"
                min="2"
                max="14"
                value={strokeSize}
                onChange={(e) => setStrokeSize(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Feedback drawer */}
          <div
            className={`try-feedback${feedbackOpen ? " show" : ""}`}
          >
            <div className="feedback-header">
              <div className="feedback-title">Feedback</div>
              <button
                className="feedback-close"
                onClick={() => setFeedbackOpen(false)}
              >
                ←
              </button>
            </div>
            <div className="feedback-body" ref={feedbackRef}>
              {!feedback && "Awaiting submission..."}
            </div>
          </div>

          {/* Floating bottom bar */}
          <div className="floating-bottom">
            <button className="ghost small" onClick={() => setTryMode(false)}>
              Exit
            </button>
            <button className="ghost small" onClick={startTry}>
              New Q
            </button>
            <div className="token">
              Token: <span>{tokenCount}</span>
            </div>
            <button
              className="primary small"
              onClick={handleCheck}
              disabled={isOcrLoading}
            >
              {isOcrLoading ? "..." : "Check"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
