'use client';
import { useState } from 'react';
import { MOCK_PROCESSES, MOCK_DRAWINGS } from '@/lib/mockData';

type Process = {
  図番: string; 案件番号: string; 工程: string; 担当者: string;
  予定開始: string; 予定終了: string; 実績開始: string; 実績終了: string;
  ステータス: string; 備考: string;
};

const STATUS_LIST = ['未着手','作業中','完了','保留'];
const PROC_LIST = ['レーザー','曲げ','溶接','タップ','切断','検査'];

export default function ProcessPage() {
  const [processes, setProcesses] = useState<Process[]>(MOCK_PROCESSES as Process[]);
  const [view, setView] = useState<'kanban'|'list'>('kanban');
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState<Process | null>(null);
  const [form, setForm] = useState<Partial<Process>>({});
  const [addModal, setAddModal] = useState(false);
  const [msg, setMsg] = useState('');

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  const figures = [...new Set(MOCK_DRAWINGS.map((d: { 図番: string }) => d.図番))];

  function openEdit(p: Process) { setModal(p); setForm({...p}); }

  function updateStatus(p: Process, status: string) {
    const now = new Date().toISOString().split('T')[0];
    setProcesses(processes.map(pr => {
      if (pr.図番 === p.図番 && pr.工程 === p.工程) {
        return {
          ...pr, ステータス: status,
          実績開始: status === '作業中' && !pr.実績開始 ? now : pr.実績開始,
          実績終了: status === '完了' ? now : pr.実績終了,
        };
      }
      return pr;
    }));
    flash(`${p.図番} / ${p.工程}: ${status}`);
  }

  function saveForm() {
    if (!modal) return;
    setProcesses(processes.map(p =>
      p.図番 === modal.図番 && p.工程 === modal.工程 ? { ...p, ...form } : p
    ));
    setModal(null);
    flash('更新しました');
  }

  function addProcess() {
    const p = form as Process;
    if (!p.図番 || !p.工程) return;
    setProcesses([...processes, { ...p, ステータス: p.ステータス || '未着手', 備考: p.備考 || '' }]);
    setAddModal(false);
    setForm({});
    flash('工程を追加しました');
  }

  const filtered = processes.filter(p =>
    !filter || p.図番.includes(filter) || p.案件番号?.includes(filter) || p.担当者?.includes(filter)
  );

  const byFigure = filtered.reduce((acc, p) => {
    if (!acc[p.図番]) acc[p.図番] = [];
    acc[p.図番].push(p);
    return acc;
  }, {} as Record<string, Process[]>);

  const statusColor: Record<string, string> = {
    '完了':'#3B6D11', '作業中':'#185FA5', '未着手':'#888780', '保留':'#854F0B'
  };
  const statusBadge: Record<string, string> = {
    '完了':'badge-done', '作業中':'badge-wip', '未着手':'badge-todo', '保留':'badge-warn'
  };

  return (
    <div>
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="summary-grid">
        {STATUS_LIST.map(s => (
          <div className="summary-card" key={s}>
            <div className="summary-label">{s}</div>
            <div className="summary-value" style={{color:statusColor[s]}}>
              {processes.filter(p => p.ステータス === s).length}件
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <input style={{flex:1,minWidth:140}} placeholder="図番・案件番号・担当者で検索"
               value={filter} onChange={e=>setFilter(e.target.value)}/>
        <div className="tabs" style={{margin:0,minWidth:160}}>
          <button className={`tab-btn ${view==='kanban'?'active':''}`} onClick={()=>setView('kanban')}>ボード</button>
          <button className={`tab-btn ${view==='list'?'active':''}`} onClick={()=>setView('list')}>一覧</button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setForm({});setAddModal(true)}}>＋ 工程追加</button>
      </div>

      {/* カンバンビュー */}
      {view === 'kanban' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {Object.entries(byFigure).map(([fig, procs]) => {
            const drawing = MOCK_DRAWINGS.find((d: { 図番: string }) => d.図番 === fig);
            const allDone = procs.every(p => p.ステータス === '完了');
            return (
              <div className="card" key={fig} style={{padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:'monospace',fontSize:12,fontWeight:600}}>{fig}</div>
                    <div style={{fontSize:11,color:'#888780'}}>{drawing?.案件番号} / 納期: {drawing?.納期||'-'}</div>
                  </div>
                  <span className={`badge ${allDone?'badge-done':'badge-wip'}`}>
                    {allDone?'完了':procs.filter(p=>p.ステータス==='作業中').length+'件稼働'}
                  </span>
                </div>
                <div className="process-bar" style={{flexDirection:'column',gap:4}}>
                  {PROC_LIST.map(proc => {
                    const p = procs.find(pr => pr.工程 === proc);
                    if (!p) return null;
                    return (
                      <div key={proc} style={{display:'flex',gap:6,alignItems:'center'}}>
                        <span className={`process-step ${p.ステータス==='完了'?'step-done':p.ステータス==='作業中'?'step-wip':'step-todo'}`}
                              style={{minWidth:60,textAlign:'center',cursor:'pointer'}}
                              onClick={()=>openEdit(p)}>
                          {proc}
                        </span>
                        <span className={`badge ${statusBadge[p.ステータス]}`} style={{fontSize:10}}>
                          {p.ステータス}
                        </span>
                        {p.担当者 && <span style={{fontSize:10,color:'#888780'}}>{p.担当者}</span>}
                        {p.ステータス !== '完了' && (
                          <button className="btn btn-green btn-sm" style={{fontSize:10,padding:'2px 6px',marginLeft:'auto'}}
                                  onClick={()=>updateStatus(p, p.ステータス==='未着手'?'作業中':'完了')}>
                            {p.ステータス==='未着手'?'開始':'完了'}
                          </button>
                        )}
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* リストビュー */}
      {view === 'list' && (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>図番</th><th>案件番号</th><th>工程</th><th>担当者</th>
                  <th>予定開始</th><th>予定終了</th><th>実績開始</th><th>実績終了</th>
                  <th>ステータス</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i}>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{p.図番}</td>
                    <td style={{fontSize:12}}>{p.案件番号}</td>
                    <td style={{fontWeight:500}}>{p.工程}</td>
                    <td style={{fontSize:12}}>{p.担当者||'-'}</td>
                    <td style={{fontSize:12}}>{p.予定開始||'-'}</td>
                    <td style={{fontSize:12}}>{p.予定終了||'-'}</td>
                    <td style={{fontSize:12}}>{p.実績開始||'-'}</td>
                    <td style={{fontSize:12}}>{p.実績終了||'-'}</td>
                    <td><span className={`badge ${statusBadge[p.ステータス]}`}>{p.ステータス}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {p.ステータス !== '完了' && (
                          <button className="btn btn-green btn-sm"
                                  onClick={()=>updateStatus(p, p.ステータス==='未着手'?'作業中':'完了')}>
                            {p.ステータス==='未着手'?'開始':'完了'}
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(p)}>編集</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>
              {modal.図番} / {modal.工程}
            </h3>
            <div className="form-row form-row-2">
              <div><label>担当者</label>
                <input value={form.担当者||''} onChange={e=>setForm({...form,担当者:e.target.value})}/></div>
              <div><label>ステータス</label>
                <select value={form.ステータス||'未着手'} onChange={e=>setForm({...form,ステータス:e.target.value})}>
                  {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                </select></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>予定開始</label>
                <input type="date" value={form.予定開始||''} onChange={e=>setForm({...form,予定開始:e.target.value})}/></div>
              <div><label>予定終了</label>
                <input type="date" value={form.予定終了||''} onChange={e=>setForm({...form,予定終了:e.target.value})}/></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>実績開始</label>
                <input type="date" value={form.実績開始||''} onChange={e=>setForm({...form,実績開始:e.target.value})}/></div>
              <div><label>実績終了</label>
                <input type="date" value={form.実績終了||''} onChange={e=>setForm({...form,実績終了:e.target.value})}/></div>
            </div>
            <div className="form-row">
              <div><label>備考</label>
                <input value={form.備考||''} onChange={e=>setForm({...form,備考:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={saveForm}>更新する</button>
              <button className="btn btn-outline" onClick={()=>setModal(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 追加モーダル */}
      {addModal && (
        <div className="modal-overlay" onClick={()=>setAddModal(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>工程追加</h3>
            <div className="form-row form-row-2">
              <div><label>図番</label>
                <select value={form.図番||''} onChange={e=>setForm({...form,図番:e.target.value})}>
                  <option value="">選択してください</option>
                  {figures.map(f=><option key={f}>{f}</option>)}
                </select></div>
              <div><label>工程</label>
                <select value={form.工程||''} onChange={e=>setForm({...form,工程:e.target.value})}>
                  <option value="">選択してください</option>
                  {PROC_LIST.map(p=><option key={p}>{p}</option>)}
                </select></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>担当者</label>
                <input value={form.担当者||''} onChange={e=>setForm({...form,担当者:e.target.value})}/></div>
              <div><label>案件番号</label>
                <input value={form.案件番号||''} onChange={e=>setForm({...form,案件番号:e.target.value})}/></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>予定開始</label>
                <input type="date" value={form.予定開始||''} onChange={e=>setForm({...form,予定開始:e.target.value})}/></div>
              <div><label>予定終了</label>
                <input type="date" value={form.予定終了||''} onChange={e=>setForm({...form,予定終了:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={addProcess}>追加する</button>
              <button className="btn btn-outline" onClick={()=>setAddModal(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
