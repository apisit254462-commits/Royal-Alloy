
import React, { useState, useMemo, useEffect } from 'react';
import { Appointment } from './types';
import { Icons, GOOGLE_FORM_URL, DEFAULT_CSV_URL } from './constants';
import AppointmentCard from './components/AppointmentCard';
import { analyzeSchedule, getSmartResponse } from './services/geminiService';

const App: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // ใช้ลิงก์ CSV จากที่คุณส่งมาเป็นค่าตั้งต้น
  const [sheetCsvUrl, setSheetCsvUrl] = useState<string>(() => localStorage.getItem('sheet_csv_url') || DEFAULT_CSV_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ฟังก์ชันดึงข้อมูลจาก Google Sheets จริง (ไม่มีการสุ่มข้อมูลปลอม)
  const fetchRealData = async (url: string) => {
    if (!url) return;
    setIsSyncing(true);
    setError(null);
    try {
      // ป้องกันการ Cache โดยเพิ่ม Timestamp เข้าไปใน URL
      const fetchUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) throw new Error('ไม่สามารถเชื่อมต่อ Google Sheets ได้ โปรดตรวจสอบสถานะ Publish to Web');
      
      const csvText = await response.text();
      
      // Parse CSV
      const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        setAppointments([]); // มีแค่ Header หรือว่างเปล่า
        return;
      }

      const dataRows = lines.slice(1); // ข้ามบรรทัดหัวข้อ
      
      const parsedData: Appointment[] = dataRows.map((line, index) => {
        // จัดการเรื่อง Comma ในเครื่องหมายคำพูด
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        // Mapping columns ตามลำดับปกติของ Google Form
        // 0: Timestamp, 1: ชื่อ, 2: วันที่, 3: เวลา, 4: บริการ, 5: เบอร์ติดต่อ
        const clean = (val: string) => val?.replace(/^"|"$/g, '').trim() || '-';

        // Add 'as const' to fix type mismatch with Appointment status
        return {
          id: `row-${index}-${clean(cols[0])}`,
          customerName: clean(cols[1]),
          date: clean(cols[2]),
          time: clean(cols[3]),
          serviceType: clean(cols[4]),
          status: 'Confirmed' as const,
          contact: clean(cols[5])
        };
      }).filter(item => item.customerName !== '-'); // กรองแถวที่ไม่มีชื่อออก

      setAppointments(parsedData.reverse()); // ล่าสุดอยู่บนสุด
      localStorage.setItem('sheet_csv_url', url);
    } catch (err: any) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // ดึงข้อมูลอัตโนมัติเมื่อเปิดแอป
  useEffect(() => {
    fetchRealData(sheetCsvUrl);
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => 
      app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [appointments, searchTerm]);

  const handleAnalyze = async () => {
    if (appointments.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeSchedule(appointments);
    setAiInsight(result || 'ไม่พบข้อมูลเพียงพอสำหรับการวิเคราะห์');
    setIsAnalyzing(false);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setChatResponse('กำลังประมวลผลข้อมูลจริง...');
    const result = await getSmartResponse(chatQuery, appointments);
    setChatResponse(result || '');
    setChatQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-['Prompt']">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-white p-6 flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Icons.Calendar />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Service Dash</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-all ${!showSettings ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            onClick={() => setShowSettings(false)}
          >
            <Icons.Calendar /> <span>รายการนัดหมายจริง</span>
          </button>
          <button 
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-medium transition-all ${showSettings ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            onClick={() => setShowSettings(true)}
          >
            <Icons.Settings /> <span>ตั้งค่าระบบ</span>
          </button>
          
          <div className="pt-6">
            <p className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-widest">Customer Entry</p>
            <a 
              href={GOOGLE_FORM_URL}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full p-3 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-xl text-indigo-400 transition-colors border border-indigo-500/20"
            >
              <Icons.Link /> <span>เปิดหน้าฟอร์มให้ลูกค้า</span>
            </a>
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 shadow-xl">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Icons.Sparkles /> ระบบวิเคราะห์ AI
            </h4>
            <p className="text-[10px] text-indigo-100 opacity-80 mb-3">ตรวจสอบความหนาแน่นและลำดับงานจากข้อมูลจริงใน Sheets</p>
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || appointments.length === 0}
              className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
            >
              {isAnalyzing ? 'กำลังประมวลผล...' : 'วิเคราะห์ข้อมูลตอนนี้'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {showSettings ? (
          <section className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">ตั้งค่าการเชื่อมต่อ</h2>
              <p className="text-slate-500 mb-8 text-sm leading-relaxed">ข้อมูลจะถูกดึงจาก Google Sheets ของคุณแบบ Real-time โปรดตรวจสอบให้มั่นใจว่าคุณได้ทำ "Publish to Web" เป็นไฟล์ CSV แล้ว</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Google Sheets CSV URL</label>
                  <input 
                    type="text" 
                    value={sheetCsvUrl}
                    onChange={(e) => setSheetCsvUrl(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-mono"
                  />
                </div>
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100 font-medium">
                    ⚠️ {error}
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => fetchRealData(sheetCsvUrl)}
                    disabled={isSyncing || !sheetCsvUrl}
                    className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isSyncing ? 'กำลังตรวจสอบ...' : 'บันทึกและอัปเดตข้อมูล'}
                  </button>
                  <button 
                    onClick={() => { setSheetCsvUrl(DEFAULT_CSV_URL); fetchRealData(DEFAULT_CSV_URL); }}
                    className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                  >
                    คืนค่าเดิม
                  </button>
                </div>
              </div>

              <div className="mt-10 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <h4 className="font-bold text-indigo-900 text-sm mb-3">สถานะการเชื่อมต่อปัจจุบัน:</h4>
                <div className="text-[11px] text-indigo-700/70 space-y-1">
                  <p>• ลิงก์ฟอร์ม: <span className="underline">{GOOGLE_FORM_URL}</span></p>
                  <p>• จำนวนข้อมูลที่พบ: {appointments.length} รายการ</p>
                  <p>• การดึงข้อมูล: อัตโนมัติทุกครั้งที่กด Refresh</p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">รายการนัดหมายลูกค้า</h2>
                <div className="flex items-center gap-2 text-slate-400 text-xs mt-1 font-medium">
                  <span className={`h-2 w-2 rounded-full ${appointments.length > 0 ? 'bg-green-500' : 'bg-slate-300'} animate-pulse`}></span>
                  เชื่อมต่อข้อมูลจริงจาก Google Sheets
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Icons.Search />
                  </div>
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อลูกค้า..."
                    className="block w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none shadow-sm transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => fetchRealData(sheetCsvUrl)}
                  disabled={isSyncing || !sheetCsvUrl}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  <span className={`${isSyncing ? 'animate-spin' : ''}`}>
                    <Icons.Refresh />
                  </span>
                  <span>{isSyncing ? 'กำลังดึงข้อมูล...' : 'รีเฟรชข้อมูล'}</span>
                </button>
              </div>
            </header>

            {/* AI Result Card */}
            {aiInsight && (
              <section className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h4 className="font-bold flex items-center gap-3 text-lg">
                    <div className="bg-indigo-500 p-1.5 rounded-lg"><Icons.Sparkles /></div>
                    บทวิเคราะห์ตารางนัดหมาย
                  </h4>
                  <button onClick={() => setAiInsight('')} className="bg-white/10 hover:bg-white/20 p-1 rounded-full transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-slate-200 leading-relaxed text-sm backdrop-blur-sm relative z-10">
                  {aiInsight}
                </div>
              </section>
            )}

            {/* List Section */}
            <section className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-700">ข้อมูลจาก Google Form ({appointments.length})</h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-tighter">Live Sync</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map(app => (
                    <AppointmentCard key={app.id} appointment={app} />
                  ))
                ) : (
                  <div className="col-span-full py-28 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[3rem] text-center space-y-5 shadow-sm">
                    <div className="bg-slate-50 p-8 rounded-full text-slate-200 border border-slate-100">
                      <Icons.Clipboard />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-slate-800">ยังไม่มีใครกรอกข้อมูลนัดหมาย</h4>
                      <p className="text-slate-400 text-sm max-w-xs mx-auto px-6">
                        เมื่อมีลูกค้ากรอกข้อมูลผ่าน <a href={GOOGLE_FORM_URL} target="_blank" className="text-indigo-600 font-bold hover:underline">Google Form</a> ข้อมูลจะมาปรากฏที่นี่โดยอัตโนมัติ
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Smart Chat assistant */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden group">
              <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
                <div className="text-indigo-500 bg-white p-2 rounded-xl shadow-sm"><Icons.Sparkles /></div>
                <div>
                  <span className="font-bold text-slate-800 block leading-none">ผู้ช่วย AI อัจฉริยะ</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1 inline-block">Query real data directly</span>
                </div>
              </div>
              <div className="p-8">
                {chatResponse && (
                  <div className="mb-6 p-5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl text-slate-700 text-sm leading-relaxed animate-in slide-in-from-bottom-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2 opacity-60">AI Assistant Response</span>
                    {chatResponse}
                  </div>
                )}
                <form onSubmit={handleChat} className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="ถาม AI เช่น 'นัดของวันนี้มีใครบ้าง?' หรือ 'คุณสมชายมาตอนกี่โมง?'"
                    className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-400 transition-all text-sm"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={!chatQuery.trim() || appointments.length === 0}
                    className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-20 shadow-xl shadow-slate-200"
                  >
                    ค้นหา
                  </button>
                </form>
                {appointments.length === 0 && (
                  <p className="text-[10px] text-slate-400 mt-4 text-center">ต้องมีข้อมูลนัดหมายอย่างน้อย 1 รายการเพื่อให้ AI เริ่มทำงาน</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
