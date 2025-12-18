'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCcw, 
  Cpu, 
  Zap, 
  History,
  Globe,
  Terminal,
  Power,
  Waves,
  Box,
  Layers
} from 'lucide-react';

// 6 条链配置信息
const CHAIN_CONFIGS = [
  {
    id: 'eth',
    name: 'ETHEREUM',
    symbol: 'ETH',
    icon: <Globe size={20} />,
    rpc: 'https://eth-mainnet.public.blastapi.io',
    threshold: 30,
    color: 'border-cyan-400 text-cyan-400 shadow-cyan-900/50',
    accent: 'bg-cyan-400'
  },
  {
    id: 'sol',
    name: 'SOLANA',
    symbol: 'SOL',
    icon: <Zap size={20} />,
    rpc: 'https://solana.drpc.org',
    threshold: 15,
    color: 'border-lime-400 text-lime-400 shadow-lime-900/50',
    accent: 'bg-lime-400'
  },
  {
    id: 'sui',
    name: 'SUI_NETWORK',
    symbol: 'SUI',
    icon: <Waves size={20} />,
    rpc: 'https://fullnode.mainnet.sui.io:443',
    threshold: 20,
    color: 'border-yellow-400 text-yellow-400 shadow-yellow-900/50',
    accent: 'bg-yellow-400'
  },
  {
    id: 'bsc',
    name: 'BNB_CHAIN',
    symbol: 'BSC',
    icon: <Box size={20} />,
    rpc: 'https://binance.llamarpc.com',
    threshold: 15,
    color: 'border-orange-400 text-orange-400 shadow-orange-900/50',
    accent: 'bg-orange-400'
  },
  {
    id: 'polygon',
    name: 'POLYGON',
    symbol: 'MATIC',
    icon: <Activity size={20} />,
    rpc: 'https://polygon.llamarpc.com',
    threshold: 15,
    color: 'border-purple-400 text-purple-400 shadow-purple-900/50',
    accent: 'bg-purple-400'
  },
  {
    id: 'avax',
    name: 'AVALANCHE',
    symbol: 'AVAX',
    icon: <Layers size={20} />,
    rpc: 'https://avalanche.drpc.org',
    threshold: 15,
    color: 'border-fuchsia-400 text-fuchsia-400 shadow-fuchsia-900/50',
    accent: 'bg-fuchsia-400'
  }
];

export default function App() {
  const [nodeData, setNodeData] = useState({
    eth: { height: 0, lastUpdate: Date.now(), status: 'connecting', latency: 0, history: [] },
    sol: { height: 0, lastUpdate: Date.now(), status: 'connecting', latency: 0, history: [] },
    sui: { height: 0, lastUpdate: Date.now(), status: 'connecting', latency: 0, history: [] },
    bsc: { height: 0, lastUpdate: Date.now(), status: 'connecting', latency: 0, history: [] },
    polygon: { height: 0, lastUpdate: Date.now(), status: 'connecting', latency: 0, history: [] },
    avax: { height: 0, lastUpdate: Date.now(), status: 'connecting', latency: 0, history: [] }
  });
  
  const [logs, setLogs] = useState([]);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  
  const nodeDataRef = useRef(nodeData);
  useEffect(() => {
    nodeDataRef.current = nodeData;
  }, [nodeData]);

  const addLog = useCallback((message, type = 'info') => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      message: typeof message === 'string' ? message : JSON.stringify(message),
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 30));
  }, []);

  // --- 抓取逻辑 ---
  const fetchNodeUpdate = useCallback(async (chainId) => {
    const config = CHAIN_CONFIGS.find(c => c.id === chainId);
    const startTime = Date.now();
    
    try {
      let currentHeight = 0;
      // 判断是否为 EVM 兼容链 (ETH, BSC, Polygon, AVAX)
      const isEvm = ['eth', 'bsc', 'polygon', 'avax'].includes(chainId);
      let method = isEvm 
        ? "eth_blockNumber" 
        : (chainId === 'sol' ? "getSlot" : "sui_getLatestCheckpointSequenceNumber");

      const response = await fetch(config.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: "2.0", method: method, params: [], id: 1 })
      });
      
      const data = await response.json();
      currentHeight = isEvm
        ? parseInt(data.result, 16) 
        : Number(data.result);

      if (!currentHeight || isNaN(currentHeight)) throw new Error("BAD_DATA");

      const latency = Date.now() - startTime;
      const prevData = nodeDataRef.current[chainId];
      const isNew = currentHeight > prevData.height;

      setNodeData(prev => ({
        ...prev,
        [chainId]: {
          height: currentHeight,
          lastUpdate: isNew ? Date.now() : prevData.lastUpdate,
          status: (Date.now() - (isNew ? Date.now() : prevData.lastUpdate)) / 1000 > config.threshold ? 'stalled' : 'healthy',
          latency: latency,
          history: [...prevData.history, currentHeight].slice(-12)
        }
      }));

      if (isNew && prevData.height !== 0) {
        addLog(`>> ${config.name} NEW_BLOCK: ${currentHeight}`, 'success');
      }

    } catch (error) {
      setNodeData(prev => ({
        ...prev,
        [chainId]: { ...prev[chainId], status: 'error' }
      }));
      addLog(`!! ${config.name} ALERT: NODE_RESPONSE_ERROR`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    if (!isAutoRefresh) return;
    CHAIN_CONFIGS.forEach(c => fetchNodeUpdate(c.id));
    const timers = [
      setInterval(() => fetchNodeUpdate('eth'), 12000),
      setInterval(() => fetchNodeUpdate('sol'), 4000),
      setInterval(() => fetchNodeUpdate('sui'), 5000),
      setInterval(() => fetchNodeUpdate('bsc'), 4000),
      setInterval(() => fetchNodeUpdate('polygon'), 4000),
      setInterval(() => fetchNodeUpdate('avax'), 4000)
    ];
    return () => timers.forEach(t => clearInterval(t));
  }, [isAutoRefresh, fetchNodeUpdate]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-mono overflow-x-hidden selection:bg-white selection:text-black">
      {/* CRT 扫视线效果 */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,143,0.03))] bg-[length:100%_4px,3px_100%] opacity-40"></div>

      <header className="max-w-7xl mx-auto border-4 border-white bg-black p-4 mb-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 text-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
            <Activity size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white">CrossPulse_v1.4</h1>
            <p className="text-white/60 text-xs tracking-[0.2em]">6_CHAIN_SENTINEL_TERMINAL</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`border-4 px-4 py-2 font-black transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${
              isAutoRefresh ? 'border-lime-400 text-lime-400' : 'border-red-500 text-red-500'
            }`}
          >
            {isAutoRefresh ? 'SCAN_ACTIVE' : 'SCAN_STOP'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 监控矩阵 */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {CHAIN_CONFIGS.map(config => {
              const data = nodeData[config.id];
              const isError = data.status === 'error';
              const isStalled = data.status === 'stalled';
              
              return (
                <div key={config.id} className={`border-4 p-5 shadow-[6px_6px_0px_0px] bg-black transition-all ${
                  isError ? 'border-red-600 shadow-red-900 text-red-600' : 
                  isStalled ? 'border-orange-500 shadow-orange-900 text-orange-500' : 
                  config.color
                }`}>
                  <div className="flex justify-between items-center mb-4 border-b-2 border-current pb-2">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="font-black text-sm">{config.name}</span>
                    </div>
                    <div className="animate-pulse text-[10px] font-bold">
                      {data.status === 'healthy' ? '[RUNNING]' : `[${data.status.toUpperCase()}]`}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/5 p-3 border-2 border-current shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <label className="text-[8px] uppercase mb-1 block opacity-60">
                        {config.id === 'sui' ? 'Checkpoint_Num' : 'Sequence_Height'}
                      </label>
                      <div className="text-xl font-black tracking-tighter truncate font-mono">
                        {data.height > 0 ? data.height.toLocaleString() : 'FETCHING...'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="border-2 border-current p-1">
                        <span className="text-[7px] block uppercase opacity-60">Delay</span>
                        <span className="text-xs font-bold">{data.latency}ms</span>
                      </div>
                      <div className="border-2 border-current p-1">
                        <span className="text-[7px] block uppercase opacity-60">Age</span>
                        <span className="text-xs font-bold">{Math.floor((Date.now() - data.lastUpdate)/1000)}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 终端配置区 */}
          <div className="border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex items-center gap-3 mb-4 text-white">
              <Terminal size={20} />
              <h3 className="font-black text-lg uppercase underline tracking-widest">Network_Endpoints</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHAIN_CONFIGS.map(config => (
                <div key={config.id} className="border-2 border-white/20 p-3 hover:border-white transition-colors bg-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="bg-white text-black px-1 font-bold text-[10px]">{config.symbol}</span>
                    <span className="text-[9px] opacity-50 font-mono">READY</span>
                  </div>
                  <div className="text-[10px] font-mono truncate opacity-70">
                    {config.rpc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 系统日志 */}
        <div className="lg:col-span-4 border-4 border-white bg-black flex flex-col h-[600px] lg:h-auto shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
          <div className="p-3 border-b-4 border-white bg-white text-black flex items-center gap-2">
            <History size={18} />
            <h3 className="font-black uppercase text-sm italic">System_Logs</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white/5 scrollbar-custom font-mono">
            {logs.length === 0 ? (
              <div className="text-[10px] text-white/20 animate-pulse italic">Initializing multi-chain communication links...</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={`text-[9px] leading-tight border-b border-white/5 pb-1 ${
                  log.type === 'success' ? 'text-lime-400' :
                  log.type === 'error' ? 'text-red-500' :
                  log.type === 'warning' ? 'text-orange-400' : 'text-white/60'
                }`}>
                  <span className="opacity-30 mr-1">[{log.time}]</span>
                  {log.message}
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t-2 border-white/20 bg-black text-[8px] text-white/30 flex justify-between font-bold">
            <span>UPTIME: 99.99%</span>
            <span className="text-lime-500 flex items-center gap-1">
              <Power size={8} /> LIVE
            </span>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 mb-10 p-4 border-t-4 border-white/10 flex justify-between items-center text-white/20 text-[9px] font-black italic">
        <p>CROSS_PULSE_SENTINEL_v1.4 // PROTOCOL: JSON-RPC</p>
        <p>ENCRYPTED_LINK_ACTIVE</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-custom::-webkit-scrollbar { width: 6px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: #000; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: #fff; border: 1px solid #000; }
      `}} />
    </div>
  );
}