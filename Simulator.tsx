"use client";

import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Stethoscope, 
  Loader2, 
  AlertOctagon, 
  Mic, 
  MicOff, 
  Send, 
  Image as ImageIcon, 
  X,
  MessageSquare,
  History,
  PlusCircle,
  Globe,
  RefreshCw,
  Activity,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "@/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  limit
} from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import ReactMarkdown from "react-markdown";

// Types for our chat
interface Message {
  id?: string;
  sender: "user" | "ai";
  text: string;
  type: "text" | "image" | "voice";
  imageUrl?: string;
  isError?: boolean;
  createdAt: any;
}

interface Session {
  id: string;
  status: "active" | "completed";
  severity?: string;
  summary?: string;
  createdAt: any;
}

const languageMap: { [key: string]: string } = {
  "English": "en-US",
  "Spanish": "es-ES",
  "French": "fr-FR",
  "Hindi": "hi-IN",
  "Arabic": "ar-SA",
  "Telugu": "te-IN",
  "Tamil": "ta-IN"
};

export default function Simulator() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [language, setLanguage] = useState("English");
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<{ text: string, image: string | null } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join("");
          setInputText(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };
      }
    }
  }, []);

  // Update speech recognition language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = languageMap[language] || "en-US";
    }
  }, [language]);

  // Fetch user sessions
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "sessions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[];
      setSessions(sessionList);
      
      // If no active session, we'll need to create one
      if (sessionList.length > 0 && sessionList[0].status === "active" && !currentSession) {
        setCurrentSession(sessionList[0]);
      }
    });

    return () => unsubscribe();
  }, [user, currentSession]);

  // Fetch messages for current session
  useEffect(() => {
    if (!currentSession) return;

    const q = query(
      collection(db, "sessions", currentSession.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgList);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [currentSession]);

  if (authLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl shadow-sm border border-slate-200 items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Initializing Clinical AI Assistant...</p>
      </div>
    );
  }

  const startNewSession = async () => {
    if (!user) {
      console.error("No user found. Please ensure you are logged in.");
      setError("Authentication error. Please try logging out and back in.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        userId: user.uid,
        status: "active",
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
      
      setCurrentSession({ id: docRef.id, status: "active", createdAt: new Date() });
      setMessages([]);
      
      // Initial AI greeting
      await addDoc(collection(db, "sessions", docRef.id, "messages"), {
        sessionId: docRef.id,
        sender: "ai",
        text: "Hello! I am your Clinical AI Triage assistant. Please describe your symptoms or upload an image of the affected area. I will analyze the data and provide a severity assessment based on clinical guidelines.",
        type: "text",
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error creating session:", err);
      setError("Failed to start a new analysis session. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };

  const sendMessage = async (isRetry = false) => {
    if (!isRetry && (!inputText.trim() && !image) || !currentSession || !user) return;

    const textToSend = isRetry ? lastUserMessage?.text || "" : inputText.trim();
    const imageToSend = isRetry ? lastUserMessage?.image : image;
    
    if (!isRetry) {
      setLastUserMessage({ text: textToSend, image: imageToSend || null });
      setInputText("");
      setImage(null);
    }
    
    setLoading(true);
    setError(null);

    try {
      // 1. Save user message (only if not a retry)
      if (!isRetry) {
        await addDoc(collection(db, "sessions", currentSession.id, "messages"), {
          sessionId: currentSession.id,
          sender: "user",
          text: textToSend || "Shared an image for analysis",
          type: imageToSend ? "image" : (isRecording ? "voice" : "text"),
          imageUrl: imageToSend || null,
          createdAt: serverTimestamp(),
        });
      }

      // 2. Call Gemini AI
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      
      const contents: any[] = [];
      if (imageToSend) {
        const base64Data = imageToSend.split(",")[1];
        const mimeType = imageToSend.split(";")[0].split(":")[1];
        contents.push({ inlineData: { data: base64Data, mimeType } });
      }
      
      const systemPrompt = `You are an expert AI Tele-Triage system. 
      Current Language: ${language}.
      User is describing a medical issue (skin or other outer body issues).
      Analyze the input (text and/or image).
      1. Identify potential issues (always include a medical disclaimer).
      2. Assess severity: Low, Medium, High, or Emergency.
      3. Provide clear next steps.
      4. If an image is provided, analyze it specifically for dermatological patterns.
      5. Respond in ${language}.
      
      Structure your response with clear headings and a 'Severity Assessment' section at the end in JSON format like this:
      ---SEVERITY_JSON---
      {"severity": "Low|Medium|High|Emergency", "condition": "name"}
      ---END_JSON---`;

      contents.push(textToSend || "Please analyze this image.");

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: systemPrompt },
          ...contents.map(c => typeof c === 'string' ? { text: c } : c)
        ],
      });

      if (!response || !response.text) {
        throw new Error("Empty response from AI");
      }

      const aiText = response.text;
      
      // Extract severity if present
      let severity = "Low";
      const jsonMatch = aiText.match(/---SEVERITY_JSON---([\s\S]*?)---END_JSON---/);
      let cleanAiText = aiText.replace(/---SEVERITY_JSON---[\s\S]*?---END_JSON---/, "").trim();

      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1].trim());
          if (!data.severity) throw new Error("Invalid JSON format: missing severity");
          severity = data.severity;
          // Update session severity
          await updateDoc(doc(db, "sessions", currentSession.id), {
            severity: severity,
            lastUpdated: serverTimestamp(),
          });
        } catch (e) {
          console.error("JSON parse error", e);
        }
      } else {
        console.warn("No severity JSON found in AI response");
        if (cleanAiText.length < 20) {
          throw new Error("AI response was too short or malformed");
        }
      }

      // 3. Save AI response
      await addDoc(collection(db, "sessions", currentSession.id, "messages"), {
        sessionId: currentSession.id,
        sender: "ai",
        text: cleanAiText,
        type: "text",
        createdAt: serverTimestamp(),
      });

    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to generate AI response. Please try again.");
      
      await addDoc(collection(db, "sessions", currentSession.id!, "messages"), {
        sessionId: currentSession.id,
        sender: "ai",
        text: "⚠️ **Clinical System Error**: I encountered an issue while processing your request. This might be due to a connection problem or a temporary service outage.",
        type: "text",
        isError: true,
        createdAt: serverTimestamp(),
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyles = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "low": return "bg-teal-50 text-teal-700 border-teal-200";
      case "medium": return "bg-amber-50 text-amber-700 border-amber-200";
      case "high": return "bg-orange-50 text-orange-700 border-orange-200";
      case "emergency": return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "low": return <CheckCircle className="w-4 h-4" />;
      case "medium": return <Clock className="w-4 h-4" />;
      case "high": return <AlertTriangle className="w-4 h-4" />;
      case "emergency": return <AlertOctagon className="w-4 h-4" />;
      default: return <Stethoscope className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
      {/* Chat Header */}
      <div className="px-8 py-5 border-b border-slate-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-teal-50 p-2.5 rounded-2xl border border-teal-100">
            <Activity className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Clinical AI Triage</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secure Diagnostic Channel</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentSession?.severity && (
            <div className={`px-4 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-2 tracking-wider ${getSeverityStyles(currentSession.severity)}`}>
              {getSeverityIcon(currentSession.severity)}
              {currentSession.severity.toUpperCase()} PRIORITY
            </div>
          )}
          
          <div className="relative group">
            <button className="px-3 py-2 hover:bg-slate-50 rounded-xl text-slate-500 flex items-center gap-2 transition-all border border-transparent hover:border-slate-100">
              <Globe className="w-4 h-4 text-teal-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{language}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 p-1">
              {["English", "Spanish", "French", "Hindi", "Arabic", "Telugu", "Tamil"].map(lang => (
                <button 
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-teal-50 hover:text-teal-600 rounded-xl transition-colors ${language === lang ? "text-teal-600 bg-teal-50/50" : "text-slate-500"}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-slate-100 mx-1" />

          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2.5 rounded-xl transition-all border ${showHistory ? "bg-teal-50 text-teal-600 border-teal-100" : "text-slate-400 hover:bg-slate-50 border-transparent hover:border-slate-100"}`}
            title="History"
          >
            <History className="w-5 h-5" />
          </button>
          
          <button 
            onClick={startNewSession}
            className="p-2.5 text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-transparent hover:border-teal-100"
            title="New Session"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-slate-100 bg-[#F8FAFC] overflow-y-auto"
            >
              <div className="p-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Clinical Records
                </h4>
                <div className="space-y-3">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentSession(s)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        currentSession?.id === s.id 
                          ? "bg-white border-teal-200 shadow-lg shadow-teal-500/5 text-teal-700" 
                          : "bg-transparent border-transparent text-slate-600 hover:bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                          {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : "Just now"}
                        </span>
                        {s.severity && (
                          <div className={`w-2 h-2 rounded-full ring-4 ring-white ${
                            s.severity === "Emergency" ? "bg-rose-500" : 
                            s.severity === "High" ? "bg-orange-500" : 
                            s.severity === "Medium" ? "bg-amber-500" : "bg-teal-500"
                          }`} />
                        )}
                      </div>
                      <p className="text-xs font-bold truncate leading-tight">
                        {s.summary || `Session ${s.id.slice(0, 8)}`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]/50">
          {!currentSession ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-teal-50 p-8 rounded-[2.5rem] mb-8 border border-teal-100 shadow-inner">
                <Stethoscope className="w-16 h-16 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Begin Clinical Triage</h3>
              <p className="text-slate-500 max-w-sm mb-10 text-sm leading-relaxed">
                Connect with our AI-powered clinical assistant for immediate assessment of dermatological and outer body conditions.
              </p>
              <button 
                onClick={startNewSession}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-teal-200 transition-all flex items-center gap-3 group"
              >
                <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                Start New Analysis
              </button>
            </div>
          ) : (
            <>
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8"
              >
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      <div className={`p-5 rounded-3xl shadow-sm border ${
                        msg.sender === "user" 
                          ? "bg-teal-600 text-white rounded-tr-none border-teal-500" 
                          : "bg-white border-slate-100 text-slate-800 rounded-tl-none"
                      }`}>
                        {msg.imageUrl && (
                          <div className="mb-4 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.imageUrl} alt="Uploaded for analysis" className="max-w-full h-auto max-h-80 object-cover" />
                          </div>
                        )}
                        <div className={`prose prose-sm max-w-none prose-slate ${msg.sender === "user" ? "text-white prose-invert" : "text-slate-700"}`}>
                          <ReactMarkdown>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                        {msg.isError && (
                          <button 
                            onClick={() => sendMessage(true)}
                            className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-rose-50 text-rose-700 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100"
                          >
                            <RefreshCw className="w-3 h-3" />
                            RETRY CLINICAL REQUEST
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                          {msg.sender === "user" ? "Patient" : "Clinical AI"} • {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Processing..."}
                        </span>
                        {msg.sender === "ai" && <ShieldCheck className="w-3 h-3 text-teal-400" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-4">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Clinical Analysis in progress...</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-8 bg-white border-t border-slate-100">
                {image && (
                  <div className="mb-6 relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Preview" className="w-24 h-24 object-cover rounded-[1.5rem] border-4 border-teal-50 shadow-lg" />
                    <button 
                      onClick={() => setImage(null)}
                      className="absolute -top-3 -right-3 bg-white border border-slate-200 rounded-full p-1.5 text-slate-400 hover:text-rose-500 shadow-xl transition-all hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-end gap-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={`Describe symptoms in ${language}...`}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-[1.5rem] py-5 pl-6 pr-14 text-sm focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all resize-none min-h-[64px] max-h-40 shadow-inner"
                      rows={1}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-1">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2.5 rounded-xl transition-all ${image ? "text-teal-600 bg-teal-50" : "text-slate-400 hover:bg-slate-100"}`}
                        title="Upload Clinical Image"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>

                  <button
                    onClick={toggleRecording}
                    className={`p-5 rounded-[1.5rem] transition-all border shadow-lg ${
                      isRecording 
                        ? "bg-rose-500 text-white animate-pulse shadow-rose-200 border-rose-400" 
                        : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200 shadow-slate-100"
                    }`}
                    title={isRecording ? "Stop Recording" : "Clinical Voice Input"}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => sendMessage()}
                    disabled={(!inputText.trim() && !image) || loading}
                    className="p-5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white rounded-[1.5rem] shadow-xl shadow-teal-100 transition-all disabled:shadow-none group"
                  >
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-teal-500" />
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">HIPAA SECURE</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">Clinical AI Analysis</span>
                  <div className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">Not a Diagnosis</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

