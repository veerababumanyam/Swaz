import React, { useState, useEffect, useRef } from 'react';
import { WebRTCConnectionManager, ConnectionState } from '../services/WebRTCConnectionManager';
import { P2PTransferModal } from './P2PTransferModal';
import { LinkIcon, PhoneIcon, MicrophoneOnIcon, MicrophoneOffIcon, PhoneHangUpIcon, ShieldCheckIcon, CopyIcon, CheckIcon } from './icons/Icons';

const getSignalingServerUrl = (): string => {
  // Use environment variables for production, fallback to current hostname for development
  const protocol = import.meta.env.VITE_WEBSOCKET_PROTOCOL || (window.location.protocol === 'https:' ? 'wss' : 'ws');
  const port = import.meta.env.VITE_SIGNALING_SERVER_PORT || '8080';
  const host = import.meta.env.VITE_SIGNALING_SERVER_HOST || window.location.hostname;
  
  // For production, use the configured domain without port for WebSocket connections
  if (import.meta.env.PROD && import.meta.env.VITE_DOMAIN) {
    return `${protocol}://${import.meta.env.VITE_DOMAIN}`;
  }
  
  return `${protocol}://${host}:${port}`;
};

const SIGNALING_SERVER_URL = getSignalingServerUrl();
const ICE_SERVERS = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
]};

type CallState = 'idle' | 'requesting_media' | 'creating' | 'waiting' | 'joining' | 'connecting' | 'connected' | 'ended' | 'error';
type View = 'initial' | 'host' | 'receiver';

const P2PCallPage: React.FC = () => {
    const [view, setView] = useState<View>('initial');
    const [roomId, setRoomId] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [joinRoomIdError, setJoinRoomIdError] = useState('');
    const [callState, setCallState] = useState<CallState>('idle');
    const [statusMessage, setStatusMessage] = useState('Ready to make a call.');
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const ws = useRef<WebSocket | null>(null);
    const webRTCManager = useRef<WebRTCConnectionManager | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const callTimerRef = useRef<number | null>(null);
    const isInitiator = useRef(false);

    useEffect(() => {
        return () => {
            // Cleanup on component unmount
            hangUp();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startCallTimer = () => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setCallDuration(0);
        callTimerRef.current = window.setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const stopCallTimer = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };
    
    const hangUp = () => {
        stopCallTimer();
        
        // Stop media tracks
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        
        // Close connections
        webRTCManager.current?.disconnect();
        ws.current?.close();
        
        webRTCManager.current = null;
        ws.current = null;

        // Reset state
        setView('initial');
        setCallState('ended');
        setStatusMessage('Call ended.');
        setTimeout(() => {
            setCallState('idle');
            setStatusMessage('Ready to make a call.');
        }, 3000);
        setRoomId('');
        setJoinRoomId('');
        setIsMuted(false);
        setCallDuration(0);
    };

    const connectWebSocket = (onOpenCallback: () => void) => {
        if (ws.current && ws.current.readyState < 2) {
             if (ws.current.readyState === 1) onOpenCallback();
             return;
        }
        ws.current = new WebSocket(SIGNALING_SERVER_URL);
        ws.current.onopen = onOpenCallback;
        ws.current.onmessage = handleSignalingMessage;
        ws.current.onerror = () => {
            setCallState('error');
            setStatusMessage('Failed to connect to signaling server.');
        };
        ws.current.onclose = () => setStatusMessage('Disconnected from signaling server.');
    };

    const initializeModules = async () => {
        try {
            setCallState('requesting_media');
            setStatusMessage('Requesting microphone access...');
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setStatusMessage('Microphone access granted.');
    
            webRTCManager.current = new WebRTCConnectionManager(ICE_SERVERS, {
                onConnectionStateChange: (state: ConnectionState) => {
                    if (state === 'connected') {
                        setCallState('connected');
                        setStatusMessage('Call connected.');
                        startCallTimer();
                    }
                    if (['disconnected', 'failed', 'closed'].includes(state)) {
                        setStatusMessage('Peer disconnected.');
                        hangUp();
                    }
                },
                onIceCandidate: (candidate) => sendMessage('ice-candidate', { candidate }),
                onDataChannel: () => {}, // Not used for calls
                onTrack: (event: RTCTrackEvent) => {
                    remoteStreamRef.current = event.streams[0];
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = remoteStreamRef.current;
                    }
                },
                onError: (error) => {
                    setCallState('error');
                    setStatusMessage(`WebRTC Error: ${error.message}`);
                }
            });
    
            localStreamRef.current.getTracks().forEach(track => {
                webRTCManager.current?.addTrack(track, localStreamRef.current!);
            });

            return true;
        } catch (error) {
            console.error("Failed to get user media:", error);
            setCallState('error');
            setStatusMessage('Microphone access denied. Please enable it in your browser settings.');
            return false;
        }
    };
    
    const handleSignalingMessage = async (message: MessageEvent) => {
        const data = JSON.parse(message.data);
        if (!webRTCManager.current) return;

        switch (data.type) {
            case 'room-joined':
                setRoomId(data.payload.roomId);
                setIsShareModalOpen(true);
                break;
            case 'peer-joined':
                isInitiator.current = data.payload.initiator;
                if (isInitiator.current) {
                    setCallState('connecting');
                    setStatusMessage('Peer joined. Creating offer...');
                    const offer = await webRTCManager.current.createOffer();
                    sendMessage('offer', { sdp: offer });
                } else {
                    setStatusMessage('Peer joined. Waiting for offer...');
                }
                break;
            case 'offer':
                setCallState('connecting');
                setStatusMessage('Received offer. Creating answer...');
                const answer = await webRTCManager.current.handleOffer(data.payload.sdp);
                sendMessage('answer', { sdp: answer });
                break;
            case 'answer':
                setStatusMessage('Received answer. Finalizing connection...');
                await webRTCManager.current.handleAnswer(data.payload.sdp);
                break;
            case 'ice-candidate':
                await webRTCManager.current.addIceCandidate(data.payload.candidate);
                break;
            case 'peer-left':
                setStatusMessage('Peer has left the room.');
                hangUp();
                break;
            case 'error': 
                setCallState('error');
                setStatusMessage(`Signaling Error: ${data.payload.message}`);
                break;
        }
    };

    const sendMessage = (type: string, payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload: { ...payload, roomId: roomId || joinRoomId } }));
        }
    };

    const handleCreateCall = async () => {
        setView('host');
        setCallState('creating');
        if(await initializeModules()) {
            setStatusMessage('Creating secure room...');
            connectWebSocket(() => sendMessage('join-room', {}));
            setCallState('waiting');
        }
    };

    const handleJoinCall = async () => {
        const trimmedId = joinRoomId.trim();
        if (!trimmedId || joinRoomIdError) return;

        setView('receiver');
        setCallState('joining');
        if (await initializeModules()) {
            setStatusMessage(`Joining room: ${trimmedId}...`);
            connectWebSocket(() => sendMessage('join-room', { roomId: trimmedId }));
        }
    };
    
    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(prev => !prev);
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const handleJoinIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setJoinRoomId(value);
        const validRoomIdRegex = /^[a-zA-Z0-9-]*$/; // Allow empty string while typing
        if (!validRoomIdRegex.test(value)) {
            setJoinRoomIdError('Invalid characters. Use only letters, numbers, and hyphens.');
        } else {
            setJoinRoomIdError('');
        }
    };

    const renderInitialView = () => (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-full">
                <PhoneIcon className="w-12 h-12 text-primary-light mb-4"/>
                <h2 className="text-2xl font-bold mb-2">Create a Call</h2>
                <p className="text-gray-500 dark:text-gray-400 flex-grow mb-4">Start a new secure call and invite someone to join.</p>
                <button onClick={handleCreateCall} className="w-full px-6 py-3 bg-primary-light text-white font-bold rounded-lg shadow-md hover:bg-secondary-light transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    Create Secure Call Room
                </button>
            </div>
            <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-full">
                <LinkIcon className="w-12 h-12 text-accent mb-4"/>
                <h2 className="text-2xl font-bold mb-2">Join a Call</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Enter a Room ID from a host to join a call.</p>
                <div className="w-full">
                    <input 
                        type="text"
                        value={joinRoomId}
                        onChange={handleJoinIdChange}
                        placeholder="Enter Room ID"
                        aria-label="Enter Room ID to join call"
                        className="w-full text-center font-mono text-lg px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                        aria-invalid={!!joinRoomIdError}
                        aria-describedby="room-id-error-call"
                    />
                    {joinRoomIdError && <p id="room-id-error-call" className="text-red-500 text-sm mt-1">{joinRoomIdError}</p>}
                </div>
                <button onClick={handleJoinCall} disabled={!joinRoomId.trim() || !!joinRoomIdError} className="mt-4 w-full px-6 py-3 bg-accent text-white font-bold rounded-lg shadow-md hover:bg-opacity-80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    Join Call
                </button>
            </div>
        </div>
    );
    
    const renderCallView = () => {
        const role = view === 'host' ? 'Host' : 'Receiver';

        return (
            <div className="w-full max-w-md text-center flex flex-col justify-between h-full min-h-[350px]">
                {isShareModalOpen && view === 'host' && (
                    <P2PTransferModal 
                        shareableLink={`${window.location.origin}${window.location.pathname}?join=${roomId}`} 
                        onClose={() => setIsShareModalOpen(false)} 
                    />
                )}
                
                {/* Top status area */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-bold">Role: {role}</span>
                        {callState === 'connected' && (
                             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${isMuted ? 'bg-gray-200 dark:bg-gray-700' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'}`}>
                                {isMuted ? <MicrophoneOffIcon className="w-5 h-5" /> : <MicrophoneOnIcon className="w-5 h-5" />}
                                <span>Mic {isMuted ? 'Off' : 'On'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main content area */}
                <div className="flex-grow flex flex-col items-center justify-center">
                    {callState === 'waiting' && view === 'host' ? (
                        <div className="w-full">
                            <h3 className="text-2xl font-bold mb-2">Room Created</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Waiting for peer to join...</p>
                            <label htmlFor="room-id-input" className="sr-only">Room ID</label>
                            <div className="relative">
                                <input
                                    id="room-id-input"
                                    type="text"
                                    readOnly
                                    value={roomId}
                                    className="w-full text-center font-mono text-lg px-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-gray-300 dark:border-gray-700"
                                />
                                <button 
                                    onClick={handleCopyRoomId}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-accent text-white font-semibold rounded-md text-sm hover:bg-opacity-80 transition-colors"
                                >
                                    {isCopied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                        </div>
                    ) : callState === 'connected' ? (
                        <>
                            <p className="text-6xl font-mono my-4 tracking-wider">{formatDuration(callDuration)}</p>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-center items-center h-12 mb-2">
                                <div className="w-3 h-3 bg-accent rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-3 h-3 bg-accent rounded-full animate-pulse [animation-delay:-0.15s] mx-2"></div>
                                <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                            </div>
                            <h3 className="text-2xl font-bold capitalize">{callState}...</h3>
                        </>
                    )}
                </div>

                {/* Control Bar */}
                <div className="mt-8 flex justify-center items-center gap-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    <button 
                        onClick={toggleMute}
                        className="flex flex-col items-center gap-1 text-sm font-semibold p-2 rounded-lg transition-colors w-20"
                        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    >
                        <div className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${isMuted ? 'bg-gray-500 text-white' : 'bg-accent text-white'}`}>
                            {isMuted ? <MicrophoneOffIcon className="w-7 h-7"/> : <MicrophoneOnIcon className="w-7 h-7" />}
                        </div>
                        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                    <button 
                        onClick={hangUp}
                        className="flex flex-col items-center gap-1 text-sm font-semibold p-2 rounded-lg transition-colors text-red-600 w-20"
                        aria-label="Hang up call"
                    >
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-transform active:scale-95">
                            <PhoneHangUpIcon className="w-8 h-8"/>
                        </div>
                        <span>Hang Up</span>
                    </button>
                </div>
                
                <audio ref={remoteAudioRef} autoPlay playsInline />
            </div>
        );
    }
    
    return (
        <div className="animate-slide-in space-y-8">
            <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">Peer-to-Peer Secure Calling</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    Talk directly with another person using a secure, end-to-end encrypted audio call. No servers, no logs, just your conversation.
                </p>
                 <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 max-w-3xl mx-auto border-t border-gray-200 dark:border-gray-700 pt-2">
                    <p><strong>User Responsibility Disclaimer:</strong> You are solely responsible for the conversations you have using this peer-to-peer service. This platform is end-to-end encrypted; we do not monitor, access, or store your data. By using this service, you agree to comply with all applicable Indian laws and not engage in any illegal activities. Swaz Data Recovery Labs holds no liability for user conduct or its consequences.</p>
                </div>
            </div>
            
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg min-h-[400px] flex flex-col justify-center items-center">
                {view === 'initial' ? renderInitialView() : renderCallView()}
            </div>
             <footer className="text-center h-6" aria-live="polite">
                <p className={`text-sm font-semibold transition-colors ${callState === 'error' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {statusMessage}
                </p>
            </footer>
        </div>
    );
};

export default P2PCallPage;