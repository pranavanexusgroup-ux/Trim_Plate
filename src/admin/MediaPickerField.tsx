import React, { useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../services/api';
import { MediaItem } from '../types';
import { MEDIA_ASSETS, resolveFoodImage } from '../assets/mediaMap';
import { useToast } from '../context/ToastContext';

interface MediaPickerFieldProps {
  label: string;
  value: string;
  onChange: (nextUrl: string) => void;
  folder?: string;
}

export function MediaPickerField({
  label,
  value,
  onChange,
  folder = 'Uploads',
}: MediaPickerFieldProps) {
  const { showToast } = useToast();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);

  const openLibrary = async () => {
    setLibraryOpen(true);
    try {
      const { data } = await api.get<MediaItem[]>('/cms/media');
      setLibraryItems(data);
    } catch {
      setLibraryItems([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      onChange(dataUrl);
      try {
        await api.post('/cms/media', {
          title: file.name.replace(/\.[^.]+$/, ''),
          file_url: dataUrl,
          folder,
          alt_text: file.name,
        });
        showToast('Image uploaded & saved to Media Library');
      } catch {
        // still set locally
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[#202124]">{label}</label>
      <div className="flex items-center gap-3">
        <img
          src={resolveFoodImage(value, value)}
          alt={label}
          className="w-14 h-14 rounded-xl object-cover border border-[#EEEEEE] shrink-0 bg-[#FFF8ED]"
        />
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Asset key (e.g. hero_bowl) or image URL..."
            className="w-full px-3 py-2 rounded-xl border border-[#EEEEEE] text-xs outline-none focus:border-[#0B8F4D]"
          />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#E8F5E9] text-[#0B8F4D] text-[11px] font-bold cursor-pointer hover:bg-[#0B8F4D] hover:text-white transition-colors">
              <Upload className="w-3.5 h-3.5" /> Upload Image
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            <button
              type="button"
              onClick={openLibrary}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EEEEEE] text-[11px] font-bold text-[#202124] hover:bg-[#F5F6F7]"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#0B8F4D]" /> Choose from Media Library
            </button>
          </div>
        </div>
      </div>

      {libraryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
              <h3 className="text-base font-extrabold text-[#202124]">Select Media Asset</h3>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F5F6F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-2">
                Media Library & Studio Assets
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {libraryItems.map((m) => (
                  <button
                    key={`lib-${m.id}`}
                    type="button"
                    onClick={() => {
                      onChange(m.file_url);
                      setLibraryOpen(false);
                    }}
                    className="group rounded-xl border border-[#EEEEEE] hover:border-[#0B8F4D] overflow-hidden text-left"
                  >
                    <img
                      src={resolveFoodImage(m.file_url, m.file_url)}
                      alt={m.title}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-[#202124] truncate">{m.title}</p>
                      <p className="text-[10px] text-[#777777]">{m.folder}</p>
                    </div>
                  </button>
                ))}
                {Object.keys(MEDIA_ASSETS).map((key) => (
                  <button
                    key={`preset-${key}`}
                    type="button"
                    onClick={() => {
                      onChange(key);
                      setLibraryOpen(false);
                    }}
                    className="group rounded-xl border border-[#EEEEEE] hover:border-[#0B8F4D] overflow-hidden text-left"
                  >
                    <img
                      src={resolveFoodImage(key)}
                      alt={key}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-[#202124] truncate">{key}</p>
                      <p className="text-[10px] text-[#0B8F4D]">Built-in Studio</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
