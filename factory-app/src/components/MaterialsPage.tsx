'use client';
import { useState } from 'react';
import { MOCK_MATERIALS } from '@/lib/mockData';

type Material = {
  材料ID: string; 材料名: string; 規格: string; 単位: string;
  現在庫: number; 単価: number; 最小在庫: number; 保管場所: string;
};

type LogEntry = {
  日時: string; 材料ID: string; 区分: string; 数量: number; 図番: string; 備考: string;
};

const EMPTY_MAT: Partial<Material> = {};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>(MOCK_MATERIALS as Material[]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<'list'|'log'>('list');
  const [modal, setModal] = useState<'in'|'out'|'scrap'|'add'|null>(null);
  const [selected, setSelected] = useState<Material | null>(null);
  const [qty, setQty] = useState('');
  const [figure, setFigure] = useState('');
  const [note, setNote] = useState('');
  const [newMat, setNewMat] = useState<Partial<Material>>(EMPTY_MAT);
  const [msg, setMsg] = useState('');

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  function doStock(type: '入庫'|'出庫'|'端材入庫') {
    if (!selected || !qty) return;
    const n = Number(qty);
    if (type === '出庫' && selected.現在庫 < n) { flash('在庫不足です'); return; }
    
    const now = new Date().toISOString();
    let newQty = selected.現在庫;
    if (type === '入庫' || type === '端材入庫') newQty += n;
    else newQty -= n;
    
    let matId = selected.材料ID;
    let matName = selected.材料名;
    if (type === '端材入庫') {
      matId = selected.材料ID + '_SCRAP_' + Date.now();
      matName = selected.材料名 + '（端材）';
      setMaterials([...materials.map(m => m.材料ID === selected.材料ID ? {...m} : m),
        { ...selected, 材料ID: matId, 材料名: matName, 現在庫: n, 規格: selected.規格 + ' 端材' }]);
    } else {
      setMaterials(materials.map(m => m.材料ID === selected.材料ID ? {...m, 現在庫: newQty} : m));
    }
    
    setLog([{ 日時:now, 材料ID:matId, 区分:type, 数量:n, 図番:figure, 備考:note }, ...log]);
    flash(`${type}しました: ${matName} ${n}${selected.単位}`);
    setModal(null); setQty(''); setFigure(''); setNote('');
  }

  function addMaterial() {
    if (!newMat.材料ID || !newMat.材料名) return;
    setMaterials([...materials, { ...newMat, 現在庫: 0, 単価:0, 最小在庫:0, 保管場所:'' } as Material]);
    setNewMat(EMPTY_MAT);
    setModal(null);
    flash('材料を登録しました: ' + newMat.材料ID);
  }

  const alerts = materials.filter(m => m.現在庫 <= m.最小在庫);

  return (
    <div>
      {msg && <div className="alert alert-ok">{msg}</div>}
      {alerts.length > 0 && (
        <div className="alert alert-warn">
          ⚠️ 在庫不足: {alerts.map(m => m.材料名 + '(' + m.現在庫 + m.単位 + ')').join(' / ')}
        </div>
      )}

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">材料種類</div>
          <div className="summary-value">{materials.length}<span style={{fontSize:13,fontWeight:400,marginLeft:2}}>種</span></div>
        </div>
        <div className="summary-card">
          <div className="summary-label">在庫不足</div>
          <div className="summary-value" style={{color: alerts.length > 0 ? '#A32D2D' : '#3B6D11'}}>{alerts.length}件</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">在庫金額（概算）</div>
          <div className="summary-value" style={{fontSize:16}}>
            ¥{materials.reduce((s,m) => s + m.現在庫 * m.単価, 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div className="tabs" style={{margin:0,flex:1,marginRight:12}}>
            <button className={`tab-btn ${tab==='list'?'active':''}`} onClick={()=>setTab('list')}>在庫一覧</button>
            <button className={`tab-btn ${tab==='log'?'active':''}`} onClick={()=>setTab('log')}>入出庫履歴</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>setModal('add')}>＋ 材料登録</button>
        </div>

        {tab === 'list' && (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>材料ID</th>
                  <th>材料名</th>
                  <th>規格</th>
                  <th className="num">現在庫</th>
                  <th className="num">単価</th>
                  <th>保管場所</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {materials.map(m => {
                  const low = m.現在庫 <= m.最小在庫;
                  return (
                    <tr key={m.材料ID}>
                      <td style={{fontFamily:'monospace',fontSize:11}}>{m.材料ID}</td>
                      <td style={{fontWeight:500}}>{m.材料名}</td>
                      <td style={{fontSize:12,color:'#888780'}}>{m.規格}</td>
                      <td className="num">
                        <span style={{fontWeight:600,color:low?'#A32D2D':'#3B6D11'}}>
                          {m.現在庫}
                        </span>
                        <span style={{fontSize:11,color:'#888780',marginLeft:2}}>{m.単位}</span>
                      </td>
                      <td className="num">¥{m.単価.toLocaleString()}</td>
                      <td style={{fontSize:12}}>{m.保管場所}</td>
                      <td>
                        <span className={`badge ${low?'badge-err':'badge-ok'}`}>
                          {low ? '不足' : '正常'}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          <button className="btn btn-green btn-sm" onClick={()=>{setSelected(m);setModal('in')}}>入庫</button>
                          <button className="btn btn-blue btn-sm" onClick={()=>{setSelected(m);setModal('out')}}>出庫</button>
                          <button className="btn btn-amber btn-sm" onClick={()=>{setSelected(m);setModal('scrap')}}>端材</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'log' && (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>日時</th>
                  <th>材料ID</th>
                  <th>区分</th>
                  <th className="num">数量</th>
                  <th>図番</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                {log.length === 0 && (
                  <tr><td colSpan={6} style={{textAlign:'center',color:'#888780',padding:'24px'}}>
                    入出庫履歴がありません
                  </td></tr>
                )}
                {log.map((l, i) => (
                  <tr key={i}>
                    <td style={{fontSize:12}}>{new Date(l.日時).toLocaleString('ja')}</td>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{l.材料ID}</td>
                    <td><span className={`badge ${l.区分==='入庫'||l.区分==='端材入庫'?'badge-ok':'badge-wip'}`}>{l.区分}</span></td>
                    <td className="num">{l.数量}</td>
                    <td style={{fontSize:12}}>{l.図番||'-'}</td>
                    <td style={{fontSize:12,color:'#888780'}}>{l.備考||'-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 入庫・出庫・端材モーダル */}
      {(modal === 'in' || modal === 'out' || modal === 'scrap') && selected && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:4}}>
              {{in:'入庫',out:'出庫',scrap:'端材入庫'}[modal]}
            </h3>
            <p style={{fontSize:13,color:'#888780',marginBottom:16}}>
              {selected.材料名}（{selected.規格}）— 現在庫: {selected.現在庫}{selected.単位}
            </p>
            <div className="form-row">
              <div><label>数量（{selected.単位}）</label>
                <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0" autoFocus/></div>
            </div>
            <div className="form-row">
              <div><label>引当図番（任意）</label>
                <input value={figure} onChange={e=>setFigure(e.target.value)} placeholder="741-XXX-X000"/></div>
            </div>
            <div className="form-row">
              <div><label>備考（任意）</label>
                <input value={note} onChange={e=>setNote(e.target.value)}/></div>
            </div>
            {modal === 'out' && Number(qty) > selected.現在庫 && (
              <div className="alert alert-err">在庫不足（現在庫: {selected.現在庫}{selected.単位}）</div>
            )}
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button className={`btn ${modal==='in'||modal==='scrap'?'btn-green':'btn-blue'}`} style={{flex:1}}
                      onClick={()=>doStock(modal==='in'?'入庫':modal==='out'?'出庫':'端材入庫')}>
                実行する
              </button>
              <button className="btn btn-outline" onClick={()=>setModal(null)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 材料登録モーダル */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>材料新規登録</h3>
            <div className="form-row form-row-2">
              <div><label>材料ID</label>
                <input value={newMat.材料ID||''} onChange={e=>setNewMat({...newMat,材料ID:e.target.value})} placeholder="SS-3.2-4x8-001"/></div>
              <div><label>材料名</label>
                <input value={newMat.材料名||''} onChange={e=>setNewMat({...newMat,材料名:e.target.value})} placeholder="SS400"/></div>
            </div>
            <div className="form-row form-row-2">
              <div><label>規格</label>
                <input value={newMat.規格||''} onChange={e=>setNewMat({...newMat,規格:e.target.value})} placeholder="3.2mm 4×8"/></div>
              <div><label>単位</label>
                <select value={newMat.単位||'枚'} onChange={e=>setNewMat({...newMat,単位:e.target.value})}>
                  <option>枚</option><option>本</option><option>kg</option><option>個</option><option>m</option>
                </select></div>
            </div>
            <div className="form-row form-row-3">
              <div><label>単価（円）</label>
                <input type="number" value={newMat.単価||0} onChange={e=>setNewMat({...newMat,単価:Number(e.target.value)})}/></div>
              <div><label>最小在庫</label>
                <input type="number" value={newMat.最小在庫||0} onChange={e=>setNewMat({...newMat,最小在庫:Number(e.target.value)})}/></div>
              <div><label>保管場所</label>
                <input value={newMat.保管場所||''} onChange={e=>setNewMat({...newMat,保管場所:e.target.value})} placeholder="A棚-1"/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={addMaterial}>登録する</button>
              <button className="btn btn-outline" onClick={()=>setModal(null)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
