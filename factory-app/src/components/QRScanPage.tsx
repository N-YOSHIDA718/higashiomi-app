'use client';
import { useState, useRef, useEffect } from 'react';
import { MOCK_DRAWINGS, MOCK_MATERIALS } from '@/lib/mockData';

export default function QRScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const [mode, setMode] = useState<'material'|'drawing'|'process'>('material');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [action, setAction] = useState<'in'|'out'|'scrap'|null>(null);
  const [qty, setQty] = useState('1');
  const [figure, setFigure] = useState('');
  const [msg, setMsg] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  async function startScan() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setScanning(true);
      timerRef.current = setInterval(tick, 500);
    } catch {
      flash('カメラへのアクセスが拒否されました');
    }
  }

  function tick() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    if (v.readyState !== v.HAVE_ENOUGH_DATA) return;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    // @ts-ignore
    if (typeof window.jsQR === 'function') {
      // @ts-ignore
      const code = window.jsQR(d.data, d.width, d.height);
      if (code) handleScan(code.data);
    }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setScanning(false);
  }

  function handleScan(data: string) {
    stopScan();
    setScanned(data);
    let id = data;
    try { const p = JSON.parse(data); id = p.id || data; } catch {}
    const mat = (MOCK_MATERIALS as Record<string, unknown>[]).find(m => (m['材料ID'] as string) === id || data.includes(m['材料ID'] as string));
    const draw = (MOCK_DRAWINGS as Record<string, unknown>[]).find(d => (d['図番'] as string) === id || data.includes(d['図番'] as string));
    if (mat) { setResult({ type: 'material', ...mat }); setMode('material'); }
    else if (draw) { setResult({ type: 'drawing', ...draw }); setMode('drawing'); }
    else setResult({ type: 'unknown', raw: data });
  }

  function simulateScan(id: string) { handleScan(id); }

  function doStockAction() {
    if (!result || !action) return;
    const label = action === 'in' ? '入庫' : action === 'out' ? '出庫' : '端材入庫';
    flash(`✓ ${label}: ${result['材料名']} ${qty}${result['単位']}${figure ? ' → 図番: ' + figure : ''}`);
    setAction(null); setQty('1'); setFigure('');
  }

  useEffect(() => () => stopScan(), []);

  return (
    <div>
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="tabs">
        <button className={`tab-btn ${mode==='material'?'active':''}`} onClick={()=>setMode('material')}>材料スキャン</button>
        <button className={`tab-btn ${mode==='drawing'?'active':''}`} onClick={()=>setMode('drawing')}>図番スキャン</button>
        <button className={`tab-btn ${mode==='process'?'active':''}`} onClick={()=>setMode('process')}>工程スキャン</button>
      </div>

      <div className="card" style={{textAlign:'center'}}>
        <p style={{fontSize:13,color:'#888780',marginBottom:12}}>
          {mode==='material' ? '材料ロールや板材に貼ったQRを読み取って入出庫できます' :
           mode==='drawing' ? '図番QRを読み取ると原価・工程情報を確認できます' :
           '工程QRを読み取ると進捗を更新できます'}
        </p>

        {!scanning && !scanned && (
          <button className="btn btn-primary btn-lg" style={{maxWidth:300,margin:'0 auto'}} onClick={startScan}>
            カメラを起動してスキャン
          </button>
        )}

        {scanning && (
          <div>
            <video ref={videoRef} style={{width:'100%',maxWidth:360,borderRadius:12,margin:'0 auto',display:'block'}} playsInline muted/>
            <canvas ref={canvasRef} style={{display:'none'}}/>
            <p style={{marginTop:12,fontSize:13,color:'#888780'}}>QRコードをカメラに向けてください</p>
            <button className="btn btn-outline" style={{marginTop:8}} onClick={stopScan}>キャンセル</button>
          </div>
        )}

        {scanned && result && (
          <div>
            <div className="alert alert-ok" style={{textAlign:'left',marginBottom:12}}>QR読み取り成功</div>

            {result['type'] === 'material' && (
              <div className="card" style={{textAlign:'left',background:'#faf9f6'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:15}}>{result['材料名'] as string}</div>
                    <div style={{fontSize:12,color:'#888780'}}>{result['規格'] as string} / {result['保管場所'] as string}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:600,fontSize:18,color:Number(result['現在庫'])<=Number(result['最小在庫'])?'#A32D2D':'#3B6D11'}}>
                      {result['現在庫'] as number}{result['単位'] as string}
                    </div>
                    <div style={{fontSize:11,color:'#888780'}}>現在庫</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:action?12:0}}>
                  <button className="btn btn-green" style={{flex:1}} onClick={()=>setAction('in')}>入庫</button>
                  <button className="btn btn-blue" style={{flex:1}} onClick={()=>setAction('out')}>出庫</button>
                  <button className="btn btn-amber" style={{flex:1}} onClick={()=>setAction('scrap')}>端材</button>
                </div>
                {action && (
                  <div>
                    <div className="form-row form-row-2" style={{marginTop:8}}>
                      <div><label>数量（{result['単位'] as string}）</label>
                        <input type="number" value={qty} onChange={e=>setQty(e.target.value)} autoFocus/></div>
                      <div><label>引当図番（任意）</label>
                        <input value={figure} onChange={e=>setFigure(e.target.value)} placeholder="741-XXX"/></div>
                    </div>
                    <button className="btn btn-primary" style={{width:'100%'}} onClick={doStockAction}>
                      {action==='in'?'入庫する':action==='out'?'出庫する':'端材入庫する'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {result['type'] === 'drawing' && (
              <div className="card" style={{textAlign:'left',background:'#faf9f6'}}>
                <div style={{fontFamily:'monospace',fontWeight:600,fontSize:15,marginBottom:4}}>{result['図番'] as string}</div>
                <div style={{fontSize:12,color:'#888780',marginBottom:8}}>{result['品名'] as string} / {result['案件番号'] as string}</div>
                <table style={{minWidth:'unset',width:'100%',fontSize:13}}>
                  <tbody>
                    <tr><td style={{color:'#888780'}}>材料費</td><td className="num">¥{Number(result['材料費']).toLocaleString()}</td></tr>
                    <tr><td style={{color:'#888780'}}>原価合計</td><td className="num" style={{fontWeight:600}}>¥{Number(result['原価合計']).toLocaleString()}</td></tr>
                    <tr><td style={{color:'#888780'}}>販売単価</td><td className="num">¥{Number(result['販売単価']).toLocaleString()}</td></tr>
                    <tr><td style={{color:'#888780'}}>粗利率</td>
                      <td className={`num ${Number(result['粗利率'])<0?'profit-neg':'profit-pos'}`}>{result['粗利率'] as number}%</td></tr>
                    <tr><td style={{color:'#888780'}}>納期</td><td>{result['納期'] as string || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
            )}

            {result['type'] === 'unknown' && (
              <div className="card" style={{textAlign:'left',background:'#faf9f6'}}>
                <div style={{color:'#888780',fontSize:13}}>登録されていないQRコードです</div>
                <div style={{fontFamily:'monospace',fontSize:11,marginTop:8,wordBreak:'break-all'}}>{result['raw'] as string}</div>
              </div>
            )}

            <button className="btn btn-outline" style={{marginTop:12,width:'100%'}}
                    onClick={()=>{setScanned(null);setResult(null);setAction(null);}}>
              もう一度スキャン
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <p style={{fontSize:12,color:'#888780',marginBottom:8}}>デモ: QRスキャンのシミュレーション</p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {(MOCK_MATERIALS as {材料ID:string;材料名:string}[]).slice(0,3).map(m => (
            <button key={m.材料ID} className="btn btn-outline btn-sm" onClick={()=>simulateScan(m.材料ID)}>
              {m.材料名}
            </button>
          ))}
          {(MOCK_DRAWINGS as {図番:string}[]).slice(0,2).map(d => (
            <button key={d.図番} className="btn btn-outline btn-sm" onClick={()=>simulateScan(d.図番)}>
              {d.図番}
            </button>
          ))}
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
    </div>
  );
}
