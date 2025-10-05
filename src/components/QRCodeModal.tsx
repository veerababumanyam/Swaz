import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

interface QRCodeModalProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomId, isOpen, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    useEffect(() => {
        if (isOpen && roomId && canvasRef.current) {
            // Generate QR code with Room ID
            QRCode.toDataURL(canvasRef.current, roomId, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }).then((dataUrl) => {
                setQrDataUrl(dataUrl);
            }).catch((error) => {
                console.error('Error generating QR code:', error);
            });
        }
    }, [isOpen, roomId]);

    const handleCopyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            // You could add a toast notification here
        } catch (error) {
            console.error('Failed to copy Room ID:', error);
        }
    };

    const handleShareRoomId = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join My File Transfer Room',
                    text: `Join my secure file transfer room using Room ID: ${roomId}`,
                    url: window.location.origin
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback to copying
            await handleCopyRoomId();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Share Room ID
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="text-center mb-6">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4 inline-block">
                        <canvas ref={canvasRef} className="mx-auto" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Scan this QR code with another device to join the room
                    </p>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Room ID:</p>
                        <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white break-all">
                            {roomId}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleCopyRoomId}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy ID
                    </button>
                    <button
                        onClick={handleShareRoomId}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRCodeModal;
