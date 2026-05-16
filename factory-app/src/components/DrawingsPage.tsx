'use client';
import { useState, useEffect } from 'react';
import { MOCK_DRAWINGS } from '@/lib/mockData';

const PROC_KEYS = ['レーザー費','曲げ費','溶接費','タップ費','切断費','その他加工費','検査費','事務費'];
const PROC_COLORS: Record<string, string> = {
  'レーザー費':'#185FA5','曲げ費':'#3B6D11','溶接費':'#993C1D',
  'タップ費':'#534AB7','切断費':'#854F0B','その他加工費':'#5F5E5A',
  '検査費':'#0F6E56','事務費':'#888780',
};

type Drawing = {
  図番: string; 品名: string; 数量: number; 材料種別: string;
  材料費: number; レーザー費: number; 曲げ費: number; 溶接費: number;
  タップ費: number; 切断費: number; その他加工費: number; 検査費: number; 事務費: number;
  原価合計: number; 販売単価: number; 粗利率: number;
  案件番号: string; 納期: string; 備考?: string;
};

const EMPTY: Partial<Drawing> = {
  材料費:0, レーザー費:0, 曲げ費:0, 溶接費:0,
  タップ費:0, 切断費:0, その他加工費:0, 検査費:0, 事務費:0,
};

function calcTotal(d: Partial<Drawing>) {
  return (Number(d.材料費)||0) + PROC_KEYS.reduce((s,k) => s + (Number(d[k as keyof Drawing])||0), 0);
}

function CostBar({ row }: { row: Drawing }) {
  const total = row.原価合計;
  const items = [
    { key:'材料費', val:row.材料費, color:'#D3D1C7' },
    ...PROC_KEYS.map(k => ({ key:k, val:Number(row[k as keyof Drawing])||0, color:PROC_COLORS[k] }))
  ].filter(i => i.val > 0);
  return (
    <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', gap:1, minWidth:80, maxWidth:200 }}>
      {items.map(i => (
        <div key={i.key} title={`${i.key}: ¥${i.val.toLocaleString()}`}
             style={{ flex: i.val/total, background: i.color, minWidth:2 }}/>
      ))}
    </div>
  );
}

export default function DrawingsPage() {
  const [rows, setRows] = useState<Drawing[]>(MOCK_DRAWINGS as Drawing[]);
  const [search, setSearch] = useState('');
  const [matFilter, setMatFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Drawing>>(EMPTY);
  const [editRow, setEditRow] = useState<Drawing | null>(null);
  const [detailRow, setDetailRow] = useState<Drawing | null>(null);
  const [msg, setMsg] = useState('');

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  const filtered = rows.filter(r => {
    if (search && !r.図番.includes(search) && !r.品名.includes(search) && !r.案件番号.includes(search)) return false;
    if (matFilter && r.材料種別 !== matFilter) return false;
    if (orderFilter && r.案件番号 !== orderFilter) return false;
    return true;
  }).sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol as keyof Drawing], bv = b[sortCol as keyof Drawing];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv), 'ja') * sortDir;
  });

  function sort(col: string) {
    if (sortCol === col) setSortDir(d => -d);
    else { setSortCol(col); setSortDir(1); }
  }

  function sf(k: string) {
    return sortCol === k ? (sortDir > 0 ? ' ↑' : ' ↓') : '';
  }

  function openEdit(r: Drawing) {
    setEditRow(r);
    setForm({ ...r });
    setShowForm(true);
  }

  function submit() {
    const total = calcTotal(form);
    const price = Number(form.販売単価) || 0;
    const margin = price > 0 ? Math.round((price - total) / price * 100) : 0;
    const newRow = { ...form, 原価合計: total, 粗利率: margin } as Drawing;
    if (editRow) {
      setRows(rows.map(r => r.図番 === editRow.図番 ? newRow : r));
      flash('更新しました: ' + newRow.図番);
    } else {
      setRows([...rows, newRow]);
      flash('追加しました: ' + newRow.図番);
    }
    setShowForm(false);
    setForm(EMPTY);
    setEditRow(null);
  }

  const orders = [...new Set(rows.map(r => r.案件番号))].sort();
  const totalRevenue = filtered.reduce((s,r) => s + r.販売単価 * r.数量, 0);
  const totalCost = filtered.reduce((s,r) => s + r.原価合計 * r.数量, 0);
  const avgMargin = filtered.length ? Math.round(filtered.reduce((s,r) => s + r.粗利率, 0) / filtered.length) : 0;
  const lossItems = filtered.filter(r => r.粗利率 < 0).length;

  return (
    <div>
      {msg && <div className="alert alert-ok">{msg}</div>}
      
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">表示件数</div>
          <div className="summary-value">{filtered.length}<span style={{fontSize:13,fontWeight:400,marginLeft:2}}>件</span></div>
        </div>
        <div className="summary-card">
          <div className="summary-label">売上合計（×数量）</div>
          <div className="summary-value" style={{fontSize:16}}>¥{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">原価合計（×数量）</div>
          <div className="summary-value" style={{fontSize:16}}>¥{totalCost.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">平均粗利率</div>
          <div className={`summary-value ${avgMargin < 0 ? 'profit-neg' : avgMargin < 10 ? 'profit-low' : 'profit-pos'}`}>{avgMargin}%</div>
          {lossItems > 0 && <div className="summary-sub" style={{color:'#A32D2D'}}>赤字 {lossItems}件</div>}
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
          <input style={{flex:1,minWidth:140}} placeholder="図番・品名・案件番号で検索"
                 value={search} onChange={e => setSearch(e.target.value)}/>
          <select value={matFilter} onChange={e => setMatFilter(e.target.value)} style={{width:'auto'}}>
            <option value="">材料：すべて</option>
            <option>鉄(SS)</option><option>SUS</option><option>FB</option>
          </select>
          <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} style={{width:'auto'}}>
            <option value="">案件：すべて</option>
            {orders.map(o => <option key={o}>{o}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditRow(null); setShowForm(true); }}>
            ＋ 追加
          </button>
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => sort('図番')}>図番{sf('図番')}</th>
                <th onClick={() => sort('品名')}>品名{sf('品名')}</th>
                <th onClick={() => sort('数量')} className="num">数量{sf('数量')}</th>
                <th>材料</th>
                <th>原価内訳</th>
                <th onClick={() => sort('材料費')} className="num">材料費{sf('材料費')}</th>
                <th onClick={() => sort('原価合計')} className="num">原価合計{sf('原価合計')}</th>
                <th onClick={() => sort('販売単価')} className="num">販売単価{sf('販売単価')}</th>
                <th onClick={() => sort('粗利率')} className="num">粗利率{sf('粗利率')}</th>
                <th onClick={() => sort('納期')}>納期{sf('納期')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.図番}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.図番}</td>
                  <td>{r.品名}</td>
                  <td className="num">{r.数量}</td>
                  <td>
                    <span className={`badge ${r.材料種別==='SUS'?'badge-sus':r.材料種別==='FB'?'badge-fb':'badge-iron'}`}>
                      {r.材料種別}
                    </span>
                  </td>
                  <td>
                    <CostBar row={r}/>
                    <div style={{fontSize:10,color:'#888780',marginTop:2}}>
                      {PROC_KEYS.filter(k => Number(r[k as keyof Drawing])>0)
                        .map(k => k.replace('費','')).join('・')}
                    </div>
                  </td>
                  <td className="num">¥{r.材料費.toLocaleString()}</td>
                  <td className="num" style={{fontWeight:500}}>¥{r.原価合計.toLocaleString()}</td>
                  <td className="num" style={{fontWeight:500}}>¥{r.販売単価.toLocaleString()}</td>
                  <td className={`num ${r.粗利率 < 0 ? 'profit-neg' : r.粗利率 < 10 ? 'profit-low' : 'profit-pos'}`}>
                    {r.粗利率}%
                  </td>
                  <td style={{fontSize:12,color:'#888780'}}>{r.納期 || '-'}</td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-outline btn-sm" onClick={() => setDetailRow(r)}>詳細</button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>編集</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom:16,fontSize:16,fontWeight:600}}>
              {editRow ? '図番を編集: ' + editRow.図番 : '新規図番を追加'}
            </h3>
            <div className="form-row form-row-2">
              <div><label>図番</label>
                <input value={form.図番||''} onChange={e=>setForm({...form,図番:e.target.value})} placeholder="741-XXX-X000"/></div>
              <div><label>品名</label>
                <input value={form.品名||''} onChange={e=>setForm({...form,品名:e.target.value})} placeholder="COVER"/></div>
            </div>
            <div className="form-row form-row-3">
              <div><label>数量</label>
                <input type="number" value={form.数量||''} onChange={e=>setForm({...form,数量:Number(e.target.value)})}/></div>
              <div><label>材料種別</label>
                <select value={form.材料種別||'鉄(SS)'} onChange={e=>setForm({...form,材料種別:e.target.value})}>
                  <option>鉄(SS)</option><option>SUS</option><option>FB</option>
                </select></div>
              <div><label>材料費（円）</label>
                <input type="number" value={form.材料費||0} onChange={e=>setForm({...form,材料費:Number(e.target.value)})}/></div>
            </div>
            <p style={{fontSize:12,color:'#888780',marginBottom:8,marginTop:-4}}>加工費（工程別に入力）</p>
            <div className="form-row form-row-4">
              {PROC_KEYS.map(k => (
                <div key={k}><label style={{color:PROC_COLORS[k]}}>{k}</label>
                  <input type="number" value={Number(form[k as keyof typeof form])||0}
                         onChange={e=>setForm({...form,[k]:Number(e.target.value)})}/></div>
              ))}
            </div>
            <div style={{background:'#f5f4f0',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:13}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'#5F5E5A'}}>原価合計（自動計算）</span>
                <strong>¥{calcTotal(form).toLocaleString()}</strong>
              </div>
            </div>
            <div className="form-row form-row-2">
              <div><label>販売単価（円）</label>
                <input type="number" value={form.販売単価||0} onChange={e=>setForm({...form,販売単価:Number(e.target.value)})}/></div>
              <div><label>粗利率（自動）</label>
                <input readOnly value={
                  form.販売単価 ? Math.round((Number(form.販売単価) - calcTotal(form)) / Number(form.販売単価) * 100) + '%' : '-'
                } style={{background:'#f5f4f0',color:'#5F5E5A'}}/></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>案件番号</label>
                <input value={form.案件番号||''} onChange={e=>setForm({...form,案件番号:e.target.value})}/></div>
              <div><label>納期</label>
                <input type="date" value={form.納期||''} onChange={e=>setForm({...form,納期:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={submit}>
                {editRow ? '更新する' : '追加する'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {detailRow && (
        <div className="modal-overlay" onClick={() => setDetailRow(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,fontFamily:'monospace'}}>{detailRow.図番}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setDetailRow(null)}>閉じる</button>
            </div>
            <table style={{minWidth:'unset',width:'100%'}}>
              <tbody>
                <tr><td style={{color:'#888780',fontSize:12,paddingRight:12}}>品名</td><td>{detailRow.品名}</td></tr>
                <tr><td style={{color:'#888780',fontSize:12}}>数量</td><td>{detailRow.数量}</td></tr>
                <tr><td style={{color:'#888780',fontSize:12}}>材料種別</td><td>{detailRow.材料種別}</td></tr>
                <tr><td style={{color:'#888780',fontSize:12}}>材料費</td><td className="num">¥{detailRow.材料費.toLocaleString()}</td></tr>
                {PROC_KEYS.map(k => Number(detailRow[k as keyof Drawing]) > 0 && (
                  <tr key={k}>
                    <td style={{color:PROC_COLORS[k],fontSize:12}}>　{k}</td>
                    <td className="num">¥{Number(detailRow[k as keyof Drawing]).toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{borderTop:'1px solid #e5e4e0'}}>
                  <td style={{fontWeight:600,fontSize:13}}>原価合計</td>
                  <td className="num" style={{fontWeight:600}}>¥{detailRow.原価合計.toLocaleString()}</td>
                </tr>
                <tr><td style={{color:'#888780',fontSize:12}}>販売単価</td><td className="num">¥{detailRow.販売単価.toLocaleString()}</td></tr>
                <tr><td style={{color:'#888780',fontSize:12}}>粗利</td>
                  <td className={`num ${detailRow.粗利率 < 0 ? 'profit-neg' : 'profit-pos'}`}>
                    ¥{(detailRow.販売単価 - detailRow.原価合計).toLocaleString()} ({detailRow.粗利率}%)
                  </td></tr>
                <tr><td style={{color:'#888780',fontSize:12}}>案件番号</td><td>{detailRow.案件番号}</td></tr>
                <tr><td style={{color:'#888780',fontSize:12}}>納期</td><td>{detailRow.納期||'-'}</td></tr>
              </tbody>
            </table>
            <div style={{marginTop:12}}>
              <CostBar row={detailRow}/>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                {[{key:'材料費',color:'#D3D1C7'},...PROC_KEYS.map(k=>({key:k,color:PROC_COLORS[k]}))].filter(i=>Number(detailRow[i.key as keyof Drawing])>0).map(i=>(
                  <span key={i.key} style={{fontSize:11,padding:'2px 6px',borderRadius:4,background:i.color+'22',color:i.color,border:'1px solid '+i.color+'44'}}>
                    {i.key}: ¥{Number(detailRow[i.key as keyof Drawing]).toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
