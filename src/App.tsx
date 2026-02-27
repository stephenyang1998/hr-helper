import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  LayoutGrid, 
  Upload, 
  Trash2, 
  Plus, 
  Download, 
  RotateCcw, 
  Play,
  UserPlus,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

interface Participant {
  id: string;
  name: string;
}

type Tab = 'participants' | 'draw' | 'grouping';

// --- Components ---

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('participants');
  const [inputText, setInputText] = useState('');
  
  // Lucky Draw State
  const [winners, setWinners] = useState<Participant[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState<Participant | null>(null);
  const [allowRepeat, setAllowRepeat] = useState(false);
  
  // Grouping State
  const [groupSize, setGroupSize] = useState(3);
  const [groups, setGroups] = useState<Participant[][]>([]);

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const newParticipants: Participant[] = results.data
          .flat()
          .filter((name: any) => typeof name === 'string' && name.trim().length > 0)
          .map((name: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: name.trim()
          }));
        setParticipants(prev => [...prev, ...newParticipants]);
      },
      header: false,
      skipEmptyLines: true
    });
  };

  const handleAddFromText = () => {
    const names = inputText
      .split(/[\n,]/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
    
    const newParticipants: Participant[] = names.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name
    }));

    setParticipants(prev => [...prev, ...newParticipants]);
    setInputText('');
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const clearParticipants = () => {
    if (confirm('確定要清空所有名單嗎？')) {
      setParticipants([]);
      setWinners([]);
      setGroups([]);
    }
  };

  // --- Lucky Draw Logic ---

  const startDraw = () => {
    if (participants.length === 0) return;
    
    const available = allowRepeat 
      ? participants 
      : participants.filter(p => !winners.find(w => w.id === p.id));

    if (available.length === 0) {
      alert('沒有可抽取的名單了！');
      return;
    }

    setIsDrawing(true);
    let counter = 0;
    const duration = 2000;
    const interval = 80;
    const steps = duration / interval;

    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * available.length);
      setCurrentCandidate(available[randomIndex]);
      counter++;

      if (counter >= steps) {
        clearInterval(timer);
        const finalWinner = available[Math.floor(Math.random() * available.length)];
        setWinners(prev => [finalWinner, ...prev]);
        setCurrentCandidate(finalWinner);
        setIsDrawing(false);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, interval);
  };

  // --- Grouping Logic ---

  const generateGroups = () => {
    if (participants.length === 0) return;
    
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const newGroups: Participant[][] = [];
    
    for (let i = 0; i < shuffled.length; i += groupSize) {
      newGroups.push(shuffled.slice(i, i + groupSize));
    }
    
    setGroups(newGroups);
  };

  const downloadGroupsCSV = () => {
    if (groups.length === 0) return;

    const csvData = groups.flatMap((group, idx) => 
      group.map(p => ({
        '組別': `第 ${idx + 1} 組`,
        '姓名': p.name
      }))
    );

    const csv = Papa.unparse(csvData);
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `分組方案_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Users className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">HR 抽籤分組工具</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Lucky Draw & Grouping Tool</p>
          </div>
        </div>
        
        <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <TabButton 
            active={activeTab === 'participants'} 
            onClick={() => setActiveTab('participants')}
            icon={<UserPlus size={18} />}
            label="名單管理"
          />
          <TabButton 
            active={activeTab === 'draw'} 
            onClick={() => setActiveTab('draw')}
            icon={<Trophy size={18} />}
            label="獎品抽籤"
          />
          <TabButton 
            active={activeTab === 'grouping'} 
            onClick={() => setActiveTab('grouping')}
            icon={<LayoutGrid size={18} />}
            label="自動分組"
          />
        </nav>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'participants' && (
            <motion.div
              key="participants"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Input Section */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus className="text-indigo-600" size={20} />
                    新增名單
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        貼上姓名 (以換行或逗號分隔)
                      </label>
                      <textarea 
                        className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="例如：\n王小明\n李小華\n張大千"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />
                      <button 
                        onClick={handleAddFromText}
                        disabled={!inputText.trim()}
                        className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        確認新增
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200"></span>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400">或</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        上傳 CSV 檔案
                      </label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <p className="text-sm text-slate-500">點擊或拖曳檔案</p>
                        </div>
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                  <h4 className="text-indigo-900 font-semibold flex items-center gap-2 mb-2">
                    <AlertCircle size={18} />
                    小提示
                  </h4>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    您可以先在 Excel 整理好名單，另存為 CSV 格式後直接上傳，系統會自動提取所有姓名。
                  </p>
                </div>
              </div>

              {/* List Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">目前名單</h3>
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {participants.length} 人
                      </span>
                    </div>
                    <button 
                      onClick={clearParticipants}
                      className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                      title="清空名單"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="max-h-[600px] overflow-y-auto p-4">
                    {participants.length === 0 ? (
                      <div className="py-20 text-center">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400">尚未加入任何名單</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {participants.map((p) => (
                          <div 
                            key={p.id}
                            className="group relative bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between hover:border-indigo-300 hover:bg-white transition-all"
                          >
                            <span className="text-sm font-medium text-slate-700 truncate pr-4">{p.name}</span>
                            <button 
                              onClick={() => removeParticipant(p.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'draw' && (
            <motion.div
              key="draw"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {/* Draw Controls */}
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">獎品抽籤</h2>
                  <p className="text-slate-500">點擊按鈕開始隨機抽取幸運兒</p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    <span className="text-sm font-medium text-slate-600">總人數:</span>
                    <span className="text-sm font-bold text-slate-900">{participants.length}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" />
                    <span className="text-sm font-medium text-slate-600">未中獎人數:</span>
                    <span className="text-sm font-bold text-slate-900">
                      {participants.filter(p => !winners.find(w => w.id === p.id)).length}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center items-center gap-8 mb-12">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">重複抽取</span>
                    <button 
                      onClick={() => setAllowRepeat(!allowRepeat)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        allowRepeat ? "bg-indigo-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        allowRepeat ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                <div className="relative h-48 flex items-center justify-center mb-12">
                  <AnimatePresence mode="wait">
                    {currentCandidate ? (
                      <motion.div
                        key={currentCandidate.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                          "text-6xl font-black tracking-tighter",
                          isDrawing ? "text-slate-300 blur-[2px]" : "text-indigo-600"
                        )}
                      >
                        {currentCandidate.name}
                      </motion.div>
                    ) : (
                      <div className="text-slate-200 text-6xl font-black tracking-tighter uppercase opacity-20">
                        Ready
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={startDraw}
                  disabled={isDrawing || participants.length === 0}
                  className="group relative inline-flex items-center justify-center px-12 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isDrawing ? "抽籤中..." : "開始抽籤"}
                  {!isDrawing && <Play className="ml-2 w-5 h-5 fill-current" />}
                </button>
              </div>

              {/* Winners History */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" />
                    中獎名單
                  </h3>
                  <button 
                    onClick={() => setWinners([])}
                    className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                  >
                    <RotateCcw size={14} /> 重置
                  </button>
                </div>
                <div className="p-6">
                  {winners.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 italic">目前尚無中獎者</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {winners.map((winner, idx) => (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          key={`${winner.id}-${idx}`}
                          className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full font-bold flex items-center gap-2"
                        >
                          <span className="text-xs opacity-50">#{winners.length - idx}</span>
                          {winner.name}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'grouping' && (
            <motion.div
              key="grouping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Grouping Controls */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-slate-900">分組設定</h3>
                  <p className="text-sm text-slate-500">設定每組的人數，系統將隨機分配</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-slate-100 rounded-xl p-1">
                    <button 
                      onClick={() => setGroupSize(Math.max(2, groupSize - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-colors text-slate-600"
                    >
                      -
                    </button>
                    <span className="w-16 text-center font-bold text-slate-900">{groupSize} 人</span>
                    <button 
                      onClick={() => setGroupSize(groupSize + 1)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-lg transition-colors text-slate-600"
                    >
                      +
                    </button>
                  </div>
                  
                  <button 
                    onClick={generateGroups}
                    disabled={participants.length === 0}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw size={18} />
                    重新分組
                  </button>

                  <button 
                    onClick={downloadGroupsCSV}
                    disabled={groups.length === 0}
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <Download size={18} />
                    下載方案
                  </button>
                </div>
              </div>

              {/* Groups Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400">請點擊上方按鈕開始分組</p>
                  </div>
                ) : (
                  groups.map((group, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                    >
                      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-900">第 {idx + 1} 組</span>
                        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {group.length} 人
                        </span>
                      </div>
                      <div className="p-5 space-y-2 flex-1">
                        {group.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 text-slate-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-400">
          © {new Date().getFullYear()} HR Toolset. 讓行政工作更輕鬆。
        </p>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
        active 
          ? "bg-white text-indigo-600 shadow-sm" 
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
