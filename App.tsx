
import React, { useState, useCallback, useRef } from 'react';
import { DESIGN_STYLES } from './constants';
import { DesignStyle, ChatMessage, GroundingSource } from './types';
import { reimagineSpace, editDesign, getChatResponse } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<DesignStyle | null>(null);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setGeneratedImage(null);
        setCurrentStyle(null);
        setChatMessages([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleSelect = async (style: DesignStyle) => {
    if (!originalImage || isProcessing) return;
    
    setIsProcessing(true);
    setCurrentStyle(style);
    
    const result = await reimagineSpace(originalImage, style.prompt);
    if (result) {
      setGeneratedImage(result);
    }
    setIsProcessing(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isChatLoading) return;

    const messageText = userInput;
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: messageText }]);
    setIsChatLoading(true);

    // Simple heuristic to detect if the user wants a visual change
    const visualKeywords = ['change', 'make', 'add', 'remove', 'color', 'blue', 'red', 'green', 'style', 'furniture', 'rug', 'curtain'];
    const isLikelyVisualChange = visualKeywords.some(kw => messageText.toLowerCase().includes(kw));

    if (isLikelyVisualChange && generatedImage) {
        setChatMessages(prev => [...prev, { role: 'model', text: "Analyzing your request... I'll apply those visual changes for you now." }]);
        const edited = await editDesign(generatedImage, messageText);
        if (edited) {
            setGeneratedImage(edited);
            setChatMessages(prev => [...prev, { role: 'model', text: "I've updated the design! How does it look?", isImageAction: true }]);
        } else {
            setChatMessages(prev => [...prev, { role: 'model', text: "I had some trouble editing the image, but I can still talk about it! What else would you like to know?" }]);
        }
    } else {
        const history = chatMessages.map(m => ({ 
            role: m.role, 
            parts: [{ text: m.text }] 
        }));
        const response = await getChatResponse(messageText, history);
        
        let groundedText = response.text;
        if (response.groundingChunks.length > 0) {
            groundedText += "\n\n**Helpful Links:**\n";
            response.groundingChunks.forEach((chunk: any) => {
                if (chunk.web) {
                    groundedText += `\n• [${chunk.web.title}](${chunk.web.uri})`;
                }
            });
        }
        
        setChatMessages(prev => [...prev, { role: 'model', text: groundedText }]);
    }

    setIsChatLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  return (
    <div className="min-h-screen flex flex-col pb-12">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <i className="fa-solid fa-couch text-white text-lg"></i>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              AuraDesign AI
            </h1>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-indigo-600 transition">Showcase</a>
            <a href="#" className="hover:text-indigo-600 transition">Styles</a>
            <a href="#" className="hover:text-indigo-600 transition">About</a>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visuals */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Main Visualizer */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
            {!originalImage ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center group hover:border-indigo-400 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-cloud-arrow-up text-indigo-600 text-2xl"></i>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload your room photo</h2>
                <p className="text-gray-500 max-w-sm">
                  Snap a photo of your living room, bedroom, or office and see it reimagined in seconds.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Your Room Transformation</h2>
                    <p className="text-sm text-gray-500">Compare original and AI-generated design</p>
                  </div>
                  <button 
                    onClick={() => { setOriginalImage(null); setGeneratedImage(null); }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition px-3 py-1.5 bg-indigo-50 rounded-lg"
                  >
                    Change Photo
                  </button>
                </div>

                <div className="relative">
                  {generatedImage ? (
                    <ComparisonSlider beforeImage={generatedImage} afterImage={originalImage} />
                  ) : (
                    <div className="relative aspect-video md:aspect-[16/9] rounded-xl overflow-hidden shadow-lg bg-gray-100">
                      <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-6 text-center">
                          <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <h3 className="text-lg font-bold">Dreaming up your {currentStyle?.name} room...</h3>
                          <p className="text-sm opacity-80 mt-2">Gemini is rethinking every detail of your space.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Style Carousel */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Choose a style</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {DESIGN_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style)}
                  disabled={!originalImage || isProcessing}
                  className={`flex-shrink-0 w-32 group transition-all ${
                    currentStyle?.id === style.id ? 'scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`aspect-[4/5] rounded-2xl overflow-hidden mb-3 shadow-md border-2 transition-colors ${
                    currentStyle?.id === style.id ? 'border-indigo-500' : 'border-transparent'
                  }`}>
                    <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className={`text-xs font-bold block truncate ${
                    currentStyle?.id === style.id ? 'text-indigo-600' : 'text-gray-600'
                  }`}>
                    {style.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Chat & Refinements */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[700px]">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/30">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                <i className="fa-solid fa-robot"></i>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Design Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-gray-500 font-medium">Ready to help</span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <i className="fa-regular fa-comment-dots text-2xl"></i>
                  </div>
                  <p className="text-sm">Ask me to change colors, add furniture, or explain design choices!</p>
                  <p className="text-xs mt-2 italic">Example: "Keep the layout but make the sofa dark blue"</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
                      msg.role === 'user' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 rounded-tr-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                    }`}>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </div>
                      {msg.isImageAction && (
                        <div className="mt-2 text-[10px] font-bold text-indigo-500 uppercase">
                          Visuals updated
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl p-3 flex gap-1 animate-pulse">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-200"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-400"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
              <div className="relative group">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={generatedImage ? "Suggest a change..." : "Upload a photo to start chatting"}
                  disabled={!generatedImage || isChatLoading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || isChatLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-30 disabled:hover:bg-indigo-600"
                >
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                </button>
              </div>
              <p className="text-[10px] text-center text-gray-400 mt-3">
                Gemini may provide suggestions. Use professional judgment for renovations.
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Floating Action Button (Mobile) */}
      {!originalImage && (
        <label className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-all active:scale-95">
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <i className="fa-solid fa-plus text-xl"></i>
        </label>
      )}
    </div>
  );
};

export default App;
