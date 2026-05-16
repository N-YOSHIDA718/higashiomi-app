'use client';
import { useState } from 'react';
import { MOCK_MISTAKES, MOCK_DRAWINGS } from '@/lib/mockData';

type Mistake = {
  日時: string; 図番: string; 案件番号: string; 工程: string;
  ミス種別: string; 数量: number; 損失金額: number; 原因: string; 対策: string; 担当者: string;
};

const MISTAKE_TYPES = ['寸法不良','材料傷','加工ミス','溶接不良','数量ミス','プログラムミス','その他'];
const PROC_LIST = ['レーザー','曲げ','溶接','タップ','切断','検査','その他'];

const EMPTY: Partial<Mistake> = { 数量:1, 損失金額:0 };

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>(MOCK_MISTAKES as Mistake[]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Mistake>>(EMPTY);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  const figures = [...new Set(MOCK_DRAWINGS.map((d: { 図番: string; 案件番号: string }) => ({ 図番: d.図番, 案件番号: d.案件番号 })))];

  function submit() {
    const now = new Date().toISOString();
    setMistakes([{ ...form, 日時: now } as Mistake, ...mistakes]);
    setForm(EMPTY);
    setShowForm(false);
    flash('ミスを記録しました');
  }

  const filtered = mistakes.filter(m =>
    !filter || m.図番?.includes(filter) || m.工程?.includes(filter) || m.担当者?.includes(filter)
  );

  const totalLoss = filtered.reduce((s, m) => s + Number(m.損失金額), 0);
  const byType = MISTAKE_TYPES.map(t => ({
    type: t, count: filtered.filter(m => m.ミス種別 === t).length,
    loss: filtered.filter(m => m.ミス種別 === t).reduce((s, m) => s + Number(m.損失金額), 0)
  })).filter(x => x.count > 0);
  const byProc = PROC_LIST.map(p => ({
    proc: p, count: filtered.filter(m => m.工程 === p).length,
    loss: filtered.filter(m => m.工程 === p).reduce((s, m) => s + Number(m.損失金額), 0)
  })).filter(x => x.count > 0);

  const drawingLoss = MOCK_DRAWINGS.map((d: { 図番: string; 案件番号: string; 原価合計: number; 販売単価: number }) => {
    const mLoss = filtered.filter(m => m.図番 === d.図番).reduce((s, m) => s + Number(m.損失金額), 0);
    const adjCost = d.原価合計 + mLoss;
    const adjMargin = d.販売単価 > 0 ? Math.round((d.販売単価 - adjCost) / d.販売単価 * 100) : 0;
    return { ...d, ミス損失: mLoss, 修正後原価: adjCost, 修正後粗利率: adjMargin };
  }).filter(d => d.ミス損失 > 0);

  return (
    <div>
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">ミス件数</div>
          <div className="summary-value" style={{color: filtered.length > 0 ? '#A32D2D' : '#3B6D11'}}>{filtered.length}件</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">損失金額合計</div>
          <div className="summary-value" style={{fontSize:16,color:'#A32D2D'}}>¥{totalLoss.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">影響図番数</div>
          <div className="summary-value">{drawingLoss.length}件</div>
        </div>
      </div>

      {/* ミスが原価に与える影響 */}
      {drawingLoss.length > 0 && (
        <div className="card">
          <h3 style={{fontSize:14,fontWeight:600,marginBottom:12,color:'#A32D2D'}}>⚠️ ミス損失による原価への影響</h3>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>図番</th><th className="num">元原価</th><th className="num">ミス損失</th>
                  <th className="num">修正後原価</th><th className="num">販売単価</th>
                  <th className="num">修正後粗利率</th>
                </tr>
              </thead>
              <tbody>
                {drawingLoss.map(d => (
                  <tr key={d.図番}>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{d.図番}</td>
                    <td className="num">¥{d.原価合計.toLocaleString()}</td>
                    <td className="num" style={{color:'#A32D2D',fontWeight:500}}>+¥{d.ミス損失.toLocaleString()}</td>
                    <td className="num" style={{fontWeight:600}}>¥{d.修正後原価.toLocaleString()}</td>
                    <td className="num">¥{d.販売単価.toLocaleString()}</td>
                    <td className={`num ${d.修正後粗利率 < 0 ? 'profit-neg' : d.修正後粗利率 < 10 ? 'profit-low' : 'profit-pos'}`}>
                      {d.修正後粗利率}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 分析 */}
      {byType.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div className="card">
            <h3 style={{fontSize:13,fontWeight:600,marginBottom:10}}>ミス種別</h3>
            {byType.map(x => (
              <div key={x.type} style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                <span>{x.type}（{x.count}件）</span>
                <span style={{color:'#A32D2D'}}>¥{x.loss.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{fontSize:13,fontWeight:600,marginBottom:10}}>工程別</h3>
            {byProc.map(x => (
              <div key={x.proc} style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                <span>{x.proc}（{x.count}件）</span>
                <span style={{color:'#A32D2D'}}>¥{x.loss.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <input style={{flex:1,maxWidth:300}} placeholder="図番・工程・担当者で検索"
                 value={filter} onChange={e=>setFilter(e.target.value)}/>
          <button className="btn btn-red btn-sm" style={{marginLeft:8}} onClick={()=>{setForm(EMPTY);setShowForm(true)}}>
            ＋ ミス記録
          </button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>日時</th><th>図番</th><th>工程</th><th>ミス種別</th>
                <th className="num">数量</th><th className="num">損失金額</th>
                <th>原因</th><th>対策</th><th>担当者</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{textAlign:'center',color:'#888780',padding:'24px'}}>
                  ミス記録がありません
                </td></tr>
              )}
              {filtered.map((m, i) => (
                <tr key={i}>
                  <td style={{fontSize:11}}>{new Date(m.日時).toLocaleDateString('ja')}</td>
                  <td style={{fontFamily:'monospace',fontSize:11}}>{m.図番}</td>
                  <td>{m.工程}</td>
                  <td><span className="badge badge-err">{m.ミス種別}</span></td>
                  <td className="num">{m.数量}</td>
                  <td className="num profit-neg">¥{Number(m.損失金額).toLocaleString()}</td>
                  <td style={{fontSize:12,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.原因}</td>
                  <td style={{fontSize:12,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.対策}</td>
                  <td style={{fontSize:12}}>{m.担当者}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:16,color:'#A32D2D'}}>ミス・不良品を記録する</h3>
            <div className="form-row form-row-2">
              <div><label>図番</label>
                <select value={form.図番||''} onChange={e=>{
                  const d = figures.find(f => f.図番 === e.target.value);
                  setForm({...form,図番:e.target.value,案件番号:d?.案件番号||''});
                }}>
                  <option value="">選択してください</option>
                  {figures.map(f=><option key={f.図番} value={f.図番}>{f.図番}</option>)}
                </select></div>
              <div><label>工程</label>
                <select value={form.工程||''} onChange={e=>setForm({...form,工程:e.target.value})}>
                  <option value="">選択してください</option>
                  {PROC_LIST.map(p=><option key={p}>{p}</option>)}
                </select></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>ミス種別</label>
                <select value={form.ミス種別||''} onChange={e=>setForm({...form,ミス種別:e.target.value})}>
                  <option value="">選択してください</option>
                  {MISTAKE_TYPES.map(t=><option key={t}>{t}</option>)}
                </select></div>
              <div><label>担当者</label>
                <input value={form.担当者||''} onChange={e=>setForm({...form,担当者:e.target.value})}/></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>数量</label>
                <input type="number" value={form.数量||1} onChange={e=>setForm({...form,数量:Number(e.target.value)})}/></div>
              <div><label>損失金額（円）</label>
                <input type="number" value={form.損失金額||0} onChange={e=>setForm({...form,損失金額:Number(e.target.value)})}/></div>
            </div>
            <div className="form-row">
              <div><label>原因</label>
                <input value={form.原因||''} onChange={e=>setForm({...form,原因:e.target.value})} placeholder="ミスの原因"/></div>
            </div>
            <div className="form-row">
              <div><label>対策・再発防止</label>
                <input value={form.対策||''} onChange={e=>setForm({...form,対策:e.target.value})} placeholder="今後の対策"/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-red" style={{flex:1}} onClick={submit}>記録する</button>
              <button className="btn btn-outline" onClick={()=>setShowForm(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
