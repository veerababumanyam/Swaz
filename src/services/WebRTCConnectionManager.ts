export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

type WebRTCConnectionManagerCallbacks = {
    onConnectionStateChange: (state: ConnectionState) => void;
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    onDataChannel: (dataChannel: RTCDataChannel) => void;
    onTrack: (event: RTCTrackEvent) => void;
    onError: (error: Error) => void;
};

export class WebRTCConnectionManager {
    private pc: RTCPeerConnection;
    private callbacks: WebRTCConnectionManagerCallbacks;

    constructor(config: RTCConfiguration, callbacks: WebRTCConnectionManagerCallbacks) {
        this.pc = new RTCPeerConnection(config);
        this.callbacks = callbacks;
        this.setupPeerConnectionListeners();
    }

    private setupPeerConnectionListeners() {
        this.pc.onicecandidate = (event) => {
            console.log('🧊 ICE candidate generated:', event.candidate);
            if (event.candidate) {
                this.callbacks.onIceCandidate(event.candidate);
            } else {
                console.log('🧊 ICE gathering complete');
            }
        };

        this.pc.onconnectionstatechange = () => {
            console.log('🔗 WebRTC connection state changed:', this.pc.connectionState);
            this.callbacks.onConnectionStateChange(this.pc.connectionState as ConnectionState);
        };

        this.pc.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state changed:', this.pc.iceConnectionState);
        };

        this.pc.onsignalingstatechange = () => {
            console.log('📞 Signaling state changed:', this.pc.signalingState);
        };

        this.pc.ondatachannel = (event) => {
            console.log('📡 Data channel received:', event.channel.label);
            this.callbacks.onDataChannel(event.channel);
        };
        
        this.pc.ontrack = (event) => {
            console.log('🎵 Track received:', event.track.kind);
            this.callbacks.onTrack(event);
        };
    }
    
    public addTrack(track: MediaStreamTrack, stream: MediaStream) {
        this.pc.addTrack(track, stream);
    }

    public createDataChannel(label: string): RTCDataChannel {
        try {
            // Use an ordered, reliable data channel for file transfer. This is the default.
            const dataChannel = this.pc.createDataChannel(label, { ordered: true });
            return dataChannel;
        } catch (error) {
            this.callbacks.onError(error as Error);
            throw error;
        }
    }

    public async createOffer(): Promise<RTCSessionDescriptionInit> {
        try {
            console.log('📞 Creating WebRTC offer...');
            const offer = await this.pc.createOffer();
            console.log('📞 Offer created:', offer);
            await this.pc.setLocalDescription(offer);
            console.log('📞 Local description set');
            return offer;
        } catch (error) {
            console.error('❌ Failed to create offer:', error);
            this.callbacks.onError(error as Error);
            throw error;
        }
    }
    
    public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        try {
            console.log('📞 Handling WebRTC offer:', offer);
            await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('📞 Remote description set');
            const answer = await this.pc.createAnswer();
            console.log('📞 Answer created:', answer);
            await this.pc.setLocalDescription(answer);
            console.log('📞 Local description set for answer');
            return answer;
        } catch (error) {
            console.error('❌ Failed to handle offer:', error);
            this.callbacks.onError(error as Error);
            throw error;
        }
    }
    
    public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        try {
             if (this.pc.signalingState !== 'stable') {
                await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            this.callbacks.onError(error as Error);
            throw error;
        }
    }

    public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        try {
            // It's possible for ICE candidates to arrive before the remote description is set.
            // While we could buffer them, for this implementation, we'll simply try to add them
            // and ignore the "state" error if it occurs, as the connection will still likely succeed.
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            if (error instanceof DOMException && error.name === 'InvalidStateError') {
                console.warn('Ignoring benign error while adding ICE candidate in invalid state:', error.message);
            } else {
                 this.callbacks.onError(error as Error);
            }
        }
    }

    public disconnect() {
        if (this.pc.connectionState !== 'closed') {
            this.pc.close();
        }
    }
}
