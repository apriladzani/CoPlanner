import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Film, Plus, Sparkles, Trash2, Layout, List, Play, Camera, MessageSquare, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Scene {
  description: string;
  angle: string;
  script: string;
  visualSuggestion: string;
}

export default function StoryboardStudio() {
  const [idea, setIdea] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const generateStoryboard = async () => {
    if (!idea.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { role: 'user', parts: [{ text: `Generate a detailed video storyboard for this idea: ${idea}. Break it down into 5-7 scenes.` }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING, description: "Visual description of the scene" },
                angle: { type: Type.STRING, description: "Camera angle or movement" },
                script: { type: Type.STRING, description: "Dialogue or narration" },
                visualSuggestion: { type: Type.STRING, description: "Detailed visual suggestion for the shot" }
              },
              required: ["description", "angle", "script", "visualSuggestion"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || "[]");
      setScenes(data);
    } catch (error) {
      console.error('Storyboard Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Storyboard Studio</h1>
          <p className="text-gray-400 mt-1">Convert ideas into professional scene breakdowns.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")}
            >
              <Layout className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">What's your vision?</h2>
          <div className="relative">
            <textarea 
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="Describe your video idea in detail (e.g., A cinematic tech review of the latest smartphone in a futuristic city...)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-purple-500 transition-all resize-none h-32 text-lg"
            />
            <button 
              onClick={generateStoryboard}
              disabled={!idea.trim() || isGenerating}
              className="absolute bottom-4 right-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {isGenerating ? 'Generating...' : 'Generate Storyboard'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {scenes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}
          >
            {scenes.map((scene, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group hover:border-purple-500/30 transition-all"
              >
                <div className="aspect-video bg-white/[0.02] border-b border-white/5 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="text-gray-700 group-hover:text-purple-500/20 transition-colors">
                    <Film className="w-16 h-16" />
                  </div>
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                    Scene {i + 1}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Camera className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Angle & Movement</p>
                      <p className="text-sm font-medium text-white">{scene.angle}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Script / Narration</p>
                      <p className="text-sm text-gray-300 italic">"{scene.script}"</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Visual Description</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{scene.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
