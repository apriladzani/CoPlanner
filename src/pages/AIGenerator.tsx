import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Sparkles, User, Bot, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIGenerator() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your Uni - LLMedia AI assistant. I can help you generate content ideas, social media scripts, video hooks, and more. What are we creating today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: "You are an expert content strategist and scriptwriter for Uni - LLMedia. Your goal is to help creators produce high-quality, engaging media content. Provide creative ideas, viral hooks, detailed scripts, and catchy captions. Keep the tone professional yet creative and modern.",
        }
      });

      const aiResponse = response.text || "I'm sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold">AI Content Assistant</h2>
            <p className="text-xs text-gray-500">Powered by Gemini 3.1 Pro</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([{ role: 'assistant', content: "Chat cleared. How else can I help?" }])}
          className="p-2 text-gray-500 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={cn(
              "flex gap-4 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border",
              msg.role === 'user' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-purple-500/10 border-purple-500/20 text-purple-400"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl relative group",
              msg.role === 'user' ? "bg-blue-600 text-white" : "bg-white/5 border border-white/10 text-gray-200"
            )}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.role === 'assistant' && (
                <button 
                  onClick={() => copyToClipboard(msg.content)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 italic text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-white/[0.02] border-t border-white/5">
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me to write a script, generate hooks, or brainstorm ideas..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-16 focus:outline-none focus:border-purple-500 transition-all resize-none h-24 custom-scrollbar"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute bottom-4 right-4 p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            "Viral hook for tech review",
            "Script for daily vlog",
            "10 content ideas for media team",
            "Instagram caption for behind-the-scenes"
          ].map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setInput(suggestion)}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
