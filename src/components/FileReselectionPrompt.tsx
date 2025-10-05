import React, { useRef, useState } from 'react';
import { ScheduledJobFromDB } from '../../utils/scheduledTransferDB';
import { formatBytes } from '../../utils/formatters';
import { DocumentIcon, UploadCloudIcon, XCircleIcon } from './icons/Icons';

interface FileReselectionPromptProps {
  job: ScheduledJobFromDB;
  onFilesReady: (files: File[]) => void;
  onCancel: () => void;
}

const FileReselectionPrompt: React.FC<FileReselectionPromptProps> = ({ job, onFilesReady, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setError(null);

    if (selectedFiles.length !== job.fileMetadata.length) {
      setError(`Validation failed: Expected ${job.fileMetadata.length} files, but you selected ${selectedFiles.length}. Please select the exact files from the scheduled transfer.`);
      return;
    }
    
    // A more robust validation by creating signatures for metadata and selected files.
    const getFileSignature = (file: { name: string; size: number; type: string; }) => `${file.name}-${file.size}-${file.type}`;
    
    const metadataSignatures = new Set(job.fileMetadata.map(getFileSignature));
    const selectedSignatures = new Set(selectedFiles.map(getFileSignature));

    if (metadataSignatures.size !== selectedSignatures.size) {
        setError(`Validation failed: The number of unique files does not match. Please ensure you select the correct files.`);
        return;
    }

    let allMatch = true;
    for (const sig of metadataSignatures) {
        if (!selectedSignatures.has(sig)) {
            allMatch = false;
            break;
        }
    }

    if (allMatch) {
      onFilesReady(selectedFiles);
    } else {
      setError(`Validation failed: The files you selected do not match the files from the scheduled transfer. Please check names, sizes, and types, then try again.`);
    }
  };

  return (
    <div className="w-full max-w-lg text-center p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-dashed border-yellow-400 dark:border-yellow-700 rounded-lg animate-slide-in">
      <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">Resume Scheduled Transfer</h2>
      <p className="mt-2 text-yellow-700 dark:text-yellow-400">
        To resume the transfer scheduled for {new Date(job.scheduledTime).toLocaleString()}, please re-select the original files.
      </p>
      <div className="my-4 p-3 bg-white dark:bg-gray-800 rounded-md text-left max-h-40 overflow-y-auto space-y-2">
        <h3 className="font-semibold text-sm">Required files:</h3>
        {job.fileMetadata.map((meta, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <DocumentIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate font-mono" title={meta.name}>{meta.name}</span>
            <span className="ml-auto flex-shrink-0 text-gray-500">{formatBytes(meta.size)}</span>
          </div>
        ))}
      </div>
      
      {error && (
        <div className="p-3 mb-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm text-left flex items-start gap-2">
            <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5"/>
            <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-lg shadow-md hover:bg-opacity-80 transition-all active:scale-95"
        >
          <UploadCloudIcon className="w-6 h-6"/>
          Reselect Files
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-all active:scale-95"
        >
          Cancel Schedule
        </button>
      </div>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
export default FileReselectionPrompt;
