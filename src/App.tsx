/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import JSZip from 'jszip';
// Client-side secure proxy for GoogleGenAI to ensure server-side API execution
class GoogleGenAI {
  constructor(config?: { apiKey?: string }) {}
  models = {
    generateContent: async ({ model, contents, config }: { model: string, contents: any, config?: any }) => {
      const userKey = window.localStorage.getItem('user_gemini_api_key') || '';
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-API-Key': userKey
        },
        body: JSON.stringify({ model, contents, config })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }
      return await response.json();
    }
  };
}
import { 
  Upload, Scissors, SplitSquareHorizontal, Download, 
  Moon, Sun, Languages, Video, LayoutDashboard, 
  Settings, Play, Loader2, AlertCircle, FileVideo,
  Sparkles, Archive, Monitor, ExternalLink, Captions, FileText,
  Gauge, Facebook, Youtube, X, Image as ImageIcon, Copy, Check, Clock, HelpCircle,
  Trash2, Plus, Music, Mic, Database, ChevronRight, Menu, Zap, Eraser, ImagePlus, UserCircle2, Maximize2, Shield, Type, Crop, Search, Pin, Key, Eye, EyeOff
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';

import { SecureChat } from './SecureChat';
import { OCRVideo } from './components/OCRVideo';

const makeTransparent = async (base64Str: string, mode: 'chibi' | 'frame'): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(base64Str);

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;

        const visited = new Uint8Array(w * h);
        const stack: [number, number][] = [];

        if (mode === 'chibi') {
          stack.push([0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]);
        } else if (mode === 'frame') {
          stack.push([Math.floor(w / 2), Math.floor(h / 2)]);
          // Also flood fill from outside for the frame
          stack.push([0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]);
        }

        const tolerance = 40; // Tolerate slightly off-white (JPEG artifacts)

        while (stack.length > 0) {
          const [x, y] = stack.pop()!;
          if (x < 0 || x >= w || y < 0 || y >= h) continue;

          const pIdx = y * w + x;
          if (visited[pIdx]) continue;
          visited[pIdx] = 1;

          const idx = pIdx * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Check if close to white
          if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) {
            data[idx + 3] = 0; // Make transparent
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

const translations = {
  en: {
    upload: 'Upload Video',
    drop: 'Drop video here or click to browse',
    cut: 'Cut',
    split: 'Split',
    startTime: 'Start Time (HH:MM:SS)',
    endTime: 'End Time (HH:MM:SS)',
    duration: 'Duration per part (sec)',
    execute: 'Execute',
    processing: 'Processing...',
    export: 'Export',
    language: 'Language',
    theme: 'Theme',
    output: 'Output Files',
    supported: 'Supported: MP4, WEBM, MOV',
    projectName: 'Untitled Project',
    tools: 'Tools',
    preview: 'Preview',
    timeline: 'Timeline',
    settings: 'Settings',
    download: 'Download',
    downloadAll: 'Download All (ZIP)',
    error: 'Error',
    success: 'Success',
    initializing: 'Initializing FFmpeg...',
    selectVideo: 'Select a video to start editing',
    logs: 'Process Logs',
    compressing: 'Compressing to ZIP...',
    changeFile: 'Change File',
    noFile: 'No file',
    externalApp: 'External App',
    openInNewTab: 'Open in New Tab',
    iframeNotice: 'If the application does not load, please use the button above to open it in a new tab.',
    subtitle: 'Extract Subtitles',
    extractSubtitle: 'Extract Subtitles',
    noSubtitleFound: 'No subtitle streams found in this video.',
    autoSubtitle: 'Auto Subtitle (Free AI)',
    generatingSubtitle: 'Generating subtitles with Free AI...',
    autoSubtitleSuccess: 'Free AI Subtitles generated successfully.',
    autoSubtitleError: 'Failed to generate subtitles with AI.',
    speed: 'Video Speed',
    playbackSpeed: 'Playback Speed',
    speedFactor: 'Speed Factor (0.5x - 4.0x)',
    fullVideo: 'Full Video',
    autoVietsub: 'Auto Vietsub (AI)',
    translateToVi: 'Translate to Vietnamese',
    subtitleStyle: 'Subtitle Style',
    subtitlePos: 'Position',
    addVoice: 'Add AI Voiceover',
    styleDefault: 'Default',
    styleYellow: 'Yellow Highlight',
    stylePurple: 'Purple Box',
    styleGlow: 'Glow White',
    styleCyan: 'Cyan Neon',
    top: 'Top',
    middle: 'Middle',
    bottom: 'Bottom',
    voiceName: 'Voice',
    generatingVoice: 'Generating AI Voice...',
    thumbnail: 'Thumbnail & AI Metadata',
    generateThumbnail: 'Upload an image or video to generate catchy titles and a description using AI.',
    suggestedTitles: 'Suggested Titles',
    suggestedDescription: 'Suggested Description',
    selectTitle: 'Select Title',
    copy: 'Copy',
    metadataSuccess: 'Metadata generated successfully.',
    metadataError: 'Failed to generate metadata.',
    maxDuration: 'Max Duration',
    suggested: 'Suggested',
    limitInfo: 'Recommended for videos under 10 minutes for best stability.',
    basicLimitInfo: 'Supports videos up to 30 minutes.',
    audioSeparator: 'Audio Separator (Free)',
    extractVoice: 'Isolate Voice',
    extractMusic: 'Remove Voice (Keep Music)',
    audioSuccess: 'Audio processed successfully.',
    secureChat: 'Secure Vault',
    videoAnalysis: 'Video Analysis AI',
    videoAnalysisDesc: 'AI will watch the video and analyze the content to provide the most accurate title orientations and directions.',
    startAnalysis: 'Start Analysis',
    analyzingVideo: 'Analyzing video...',
    analysisSuccess: 'Video analysis completed.',
    analysisError: 'Failed to analyze video.',
    videoSummary: 'Content Summary',
    topicOrientation: 'Topic Orientation',
    viralTitles: 'Viral Titles',
    advice: 'AI Expert Advice'
  },
  vi: {
    upload: 'Tải Video Lên',
    drop: 'Kéo thả video vào đây hoặc nhấn để chọn',
    cut: 'Cắt Video',
    split: 'Chia Video',
    startTime: 'Thời gian bắt đầu (HH:MM:SS)',
    endTime: 'Thời gian kết thúc (HH:MM:SS)',
    duration: 'Thời lượng mỗi phần (giây)',
    execute: 'Thực hiện',
    processing: 'Đang xử lý...',
    export: 'Xuất Video',
    language: 'Ngôn ngữ',
    theme: 'Giao diện',
    output: 'File Đầu Ra',
    supported: 'Hỗ trợ: MP4, WEBM, MOV',
    projectName: 'Dự án chưa đặt tên',
    tools: 'Công cụ',
    preview: 'Xem trước',
    timeline: 'Dòng thời gian',
    settings: 'Cài đặt',
    download: 'Tải xuống',
    downloadAll: 'Nén & Tải tất cả (ZIP)',
    error: 'Lỗi',
    success: 'Thành công',
    initializing: 'Đang khởi tạo FFmpeg...',
    selectVideo: 'Chọn một video để bắt đầu chỉnh sửa',
    logs: 'Nhật ký xử lý',
    compressing: 'Đang nén file ZIP...',
    changeFile: 'Đổi file',
    noFile: 'Chưa có file',
    externalApp: 'Ứng dụng tích hợp',
    openInNewTab: 'Mở trong tab mới',
    iframeNotice: 'Nếu ứng dụng không hiển thị, vui lòng nhấn nút phía trên để mở trong tab mới.',
    subtitle: 'Lấy Phụ Đề',
    extractSubtitle: 'Trích xuất phụ đề',
    noSubtitleFound: 'Không tìm thấy luồng phụ đề nào trong video này.',
    autoSubtitle: 'Phụ đề AI (Miễn phí)',
    generatingSubtitle: 'Đang tạo phụ đề bằng AI miễn phí...',
    autoSubtitleSuccess: 'Đã tạo phụ đề AI thành công (Miễn phí).',
    autoSubtitleError: 'Không thể tạo phụ đề bằng AI.',
    speed: 'Tốc độ Video',
    playbackSpeed: 'Tốc độ phát',
    speedFactor: 'Hệ số tốc độ (0.5x - 4.0x)',
    fullVideo: 'Toàn bộ video',
    autoVietsub: 'Tự động Vietsub (AI)',
    translateToVi: 'Dịch sang tiếng Việt',
    subtitleStyle: 'Mẫu phụ đề',
    subtitlePos: 'Vị trí',
    addVoice: 'Thêm giọng đọc AI',
    styleDefault: 'Mặc định',
    styleYellow: 'Vàng nổi bật',
    stylePurple: 'Hộp Tím',
    styleGlow: 'Trắng Phát sáng',
    styleCyan: 'Xanh Neon',
    top: 'Trên',
    middle: 'Giữa',
    bottom: 'Dưới',
    voiceName: 'Giọng đọc',
    generatingVoice: 'Đang tạo giọng đọc AI...',
    thumbnail: 'Thumbnail & AI Metadata',
    generateThumbnail: 'Tải ảnh hoặc video lên để AI tự động tạo tiêu đề và mô tả hấp dẫn.',
    suggestedTitles: 'Gợi ý tiêu đề',
    suggestedDescription: 'Gợi ý mô tả',
    selectTitle: 'Chọn tiêu đề',
    copy: 'Sao chép',
    metadataSuccess: 'Đã tạo metadata thành công.',
    metadataError: 'Không thể tạo metadata.',
    maxDuration: 'Thời lượng tối đa',
    suggested: 'Gợi ý',
    limitInfo: 'Khuyến nghị video dưới 10 phút để đạt độ ổn định tốt nhất.',
    basicLimitInfo: 'Hỗ trợ video lên đến 30 phút.',
    audioSeparator: 'Tách/Xóa Giọng Nói (Miễn phí)',
    extractVoice: 'Tách Giọng Nói',
    extractMusic: 'Loại Bỏ Giọng Nói',
    audioSuccess: 'Đã xử lý âm thanh thành công.',
    secureChat: 'Phòng Chat Bảo Mật',
    videoAnalysis: 'Phân Tích Video AI',
    videoAnalysisDesc: 'AI sẽ xem video và phân tích nội dung, từ đó định hướng tiêu đề và hướng đi chính xác nhất cho video của bạn.',
    startAnalysis: 'Bắt đầu phân tích',
    analyzingVideo: 'Đang phân tích video...',
    analysisSuccess: 'Đã phân tích video xong.',
    analysisError: 'Không thể phân tích video.',
    videoSummary: 'Tóm tắt nội dung',
    topicOrientation: 'Định hướng chủ đề',
    viralTitles: 'Tiêu đề gợi ý (Viral)',
    advice: 'Lời khuyên từ chuyên gia AI'
  }
};

function removeVietnameseTones(str: string) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Some system encode combined accent as individual characters
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣  
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛  Ex: â, ă, ơ
    // Remove extra spaces
    str = str.replace(/ + /g, " ");
    str = str.trim();
    return str;
}

  const adjustSrtTimestamps = (srt: string, speed: number, delayMs: number = 0, manualSpeed: number = 1.0): string => {
    if (speed === 1 && delayMs === 0 && manualSpeed === 1.0 || !srt) return srt;
    
    const effectiveSpeed = speed * manualSpeed;
    
    const timeRegex = /(\d{2}:\d{2}:\d{2}[,. ]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,. ]\d{3})/;
    
    const parseTime = (timeStr: string) => {
      const normalized = timeStr.replace(/[. ]/g, ',');
      const [time, ms] = normalized.split(',');
      const [h, m, s] = time.split(':').map(Number);
      return (h * 3600 + m * 60 + s) * 1000 + Number(ms);
    };
    
    const formatTime = (msTotal: number) => {
      if (msTotal < 0) msTotal = 0;
      const h = Math.floor(msTotal / 3600000);
      msTotal %= 3600000;
      const m = Math.floor(msTotal / 60000);
      msTotal %= 60000;
      const s = Math.floor(msTotal / 1000);
      const ms = Math.floor(msTotal % 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };

    return srt.split(/\r?\n/).map(line => {
      const match = line.match(timeRegex);
      if (match) {
        const startMs = parseTime(match[1]);
        const endMs = parseTime(match[2]);
        return `${formatTime((startMs / effectiveSpeed) + delayMs)} --> ${formatTime((endMs / effectiveSpeed) + delayMs)}`;
      }
      return line;
    }).join('\n');
  };

  const cleanSrtContent = (srt: string): string => {
    if (!srt) return srt;
    const lines = srt.split(/\r?\n/);
    const cleanedLines: string[] = [];
    let isTextLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        cleanedLines.push('');
        isTextLine = false;
        continue;
      }

      // Check if it's an index or timestamp line
      if (/^\d+$/.test(line) || line.includes('-->')) {
        cleanedLines.push(line);
        if (line.includes('-->')) isTextLine = true;
        continue;
      }

      if (isTextLine) {
        // If the line contains both original and translated (often separated by / or | or \n)
        if (line.includes('/') || line.includes('|')) {
          const parts = line.split(/[\\/|]/);
          // Usually the second part is the translation
          cleanedLines.push(parts[parts.length - 1].trim());
        } else {
          // Check if the next line is also text (not empty, not index, not timestamp)
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && !/^\d+$/.test(nextLine) && !nextLine.includes('-->')) {
            // Current line might be original, next line might be translation
            // We skip current line and let the next iteration handle the translation
            continue;
          }
          cleanedLines.push(line);
        }
      } else {
        cleanedLines.push(line);
      }
    }
    return cleanedLines.join('\n');
  };

type Lang = 'en' | 'vi';
type SubStyle = 'default' | 'yellow' | 'purple' | 'glow' | 'cyan';
type SubPos = 'top' | 'middle' | 'bottom';

interface TextLayer {
  id: string;
  text: string;
  font: string;
  color: string;
  bgColor?: string;
  size: number;
  style: 'default' | 'outline' | 'shadow' | 'gradient' | 'glow' | 'background';
  x: number;
  y: number;
}

const animeImages = [
  { url: "https://i.pinimg.com/736x/00/d7/10/00d7103789b8edfea2492ecf87c6f43f.jpg", title: "Makoto Skies", desc: "Cinematic atmosphere" },
  { url: "https://i.pinimg.com/1200x/b2/23/19/b22319fed1fe4f24877392c29a3d13b8.jpg", title: "Neon Nights", desc: "Cyberpunk cityscapes" },
  { url: "https://i.pinimg.com/736x/7a/8a/73/7a8a73c6226cb6d12eac447f1e540c85.jpg", title: "Sakura Fall", desc: "Spring aesthetics" },
  { url: "https://i.pinimg.com/originals/4c/23/98/4c2398e6be397bb08b5cb70b2192d730.gif", title: "Lo-Fi Beats", desc: "Chill vibes" },
  { url: "https://i.pinimg.com/736x/e6/95/88/e69588cea343ad7033d13f1bf282ed9d.jpg", title: "Zen Garden", desc: "Peaceful moments" },
  { url: "https://i.pinimg.com/originals/14/ae/7e/14ae7ede205573466d68eb3a562fe349.gif", title: "Urban Rain", desc: "Melancholic mood" },
  { url: "https://i.pinimg.com/736x/8a/bb/52/8abb52565864ca30f8f4512e1e4b4d74.jpg", title: "Sunset Train", desc: "Journey home" },
  { url: "https://i.pinimg.com/1200x/d7/f3/21/d7f3212f6ab7a6fc77d5cb38a4e980d6.jpg", title: "Starry Night", desc: "Cosmic wonder" },
  { url: "https://i.pinimg.com/736x/30/1a/e8/301ae854ab43e7990b45afa868727590.jpg", title: "Forest Spirit", desc: "Nature magic" },
  { url: "https://i.pinimg.com/736x/c0/23/dc/c023dca0a9495521d3b2aa116f3c594b.jpg", title: "Cyber Streets", desc: "Future tech" },
  { url: "https://i.pinimg.com/736x/49/46/65/49466532ac4f621bade1bf5c9ecc6a43.jpg", title: "Moonlight Path", desc: "Night serenity" },
  { url: "https://i.pinimg.com/736x/3f/6e/99/3f6e995f35448472139040c9e16bf46b.jpg", title: "Ocean Breeze", desc: "Summer waves" }
];

const cinematicImages = [
  { url: "https://i.pinimg.com/736x/cb/e5/e4/cbe5e4d26618a2d3d927e3e48f44f02e.jpg", title: "Alpine Peaks", desc: "Majestic mountain ranges" },
  { url: "https://i.pinimg.com/1200x/fe/94/51/fe9451fe581b75d93580edee3d2b233c.jpg", title: "Desert Dunes", desc: "Golden sands at sunset" },
  { url: "https://i.pinimg.com/1200x/63/a0/fd/63a0fd88baa47f9df09142857827fdd8.jpg", title: "Misty Fjords", desc: "Deep waters and high cliffs" },
  { url: "https://i.pinimg.com/736x/9a/02/93/9a02939b2294df55e33d86b5b85a7ae0.jpg", title: "Tropical Shores", desc: "Crystal clear ocean waves" },
  { url: "https://i.pinimg.com/736x/18/95/73/1895737f4920c928809a49547df82b06.jpg", title: "Autumn Woods", desc: "Vibrant fall foliage" },
  { url: "https://i.pinimg.com/736x/f7/f3/a6/f7f3a609ccb614aa03fc5a2d25f6abdd.jpg", title: "Arctic Tundra", desc: "Frozen beauty of the north" },
  { url: "https://i.pinimg.com/736x/b0/47/a8/b047a87987f8b163ed335c2c25c6c4bc.jpg", title: "Rolling Hills", desc: "Green pastures of Tuscany" },
  { url: "https://i.pinimg.com/736x/fc/5f/2c/fc5f2cdbd664a26fd9b95eb691bfe078.jpg", title: "Volcanic Peaks", desc: "Raw power of nature" },
];

const cyberpunkImages = [
  { url: "https://i.pinimg.com/736x/a5/5e/73/a55e73fe67e88d8bafe6d15091c750c2.jpg", title: "Neon District", desc: "Vibrant city lights" },
  { url: "https://i.pinimg.com/736x/68/28/f4/6828f48cfeb009b4b01574796190a9e9.jpg", title: "Data Stream", desc: "Digital highways" },
  { url: "https://i.pinimg.com/736x/98/28/a8/9828a8e02766adf6fc3a83192147c64c.jpg", title: "Tech Sprawl", desc: "Mega-city architecture" },
  { url: "https://i.pinimg.com/736x/57/7e/b0/577eb015ea833833d83aa1a6975c8a64.jpg", title: "Synthwave Sky", desc: "Retro-future aesthetics" },
  { url: "https://i.pinimg.com/736x/cc/51/77/cc517722e749b01a4d8611463ac07f4b.jpg", title: "Glitch City", desc: "Fragmented reality" },
  { url: "https://i.pinimg.com/736x/4a/99/20/4a99200943c29d93164d32402d50f039.jpg", title: "Chrome Streets", desc: "Reflections of tomorrow" },
  { url: "https://i.pinimg.com/736x/dd/b2/ec/ddb2ec683543a64a1fefa41a9bc22651.jpg", title: "Neural Link", desc: "Connection to the grid" },
  { url: "https://i.pinimg.com/1200x/e1/55/b1/e155b11d1a07613aa919d445d9f90691.jpg", title: "Void Runner", desc: "Beyond the horizon" },
];

const natureImages = [
  { url: "https://i.pinimg.com/1200x/1e/58/40/1e5840958893d2fc325c6b8d5af93ab8.jpg", title: "Hidden Waterfall", desc: "Secret oasis in the forest" },
  { url: "https://i.pinimg.com/736x/40/76/37/40763772b6d0f93bb0dce6d546d8c458.jpg", title: "Ancient Oaks", desc: "Whispers of the past" },
  { url: "https://i.pinimg.com/736x/45/cc/37/45cc3797b51572ab91d2417d1ba90a6f.jpg", title: "Wild Meadows", desc: "Flowers in full bloom" },
  { url: "https://i.pinimg.com/736x/49/15/d1/4915d11ef3a6a8e2e1245fa46c16a8a2.jpg", title: "Canyon Echoes", desc: "Carved by time and water" },
  { url: "https://i.pinimg.com/1200x/7a/b9/eb/7ab9ebcdd215ff9ea1ada41dd92050d2.jpg", title: "Coral Reefs", desc: "Underwater kaleidoscope" },
  { url: "https://i.pinimg.com/736x/e3/c5/5a/e3c55add104fac8aa9d2d7d72420e05a.jpg", title: "Snowy Pines", desc: "Winter's quiet embrace" },
  { url: "https://i.pinimg.com/736x/9f/37/20/9f37209a6aedc5c58eb185451549593c.jpg", title: "Savannah Sun", desc: "Golden hour in the wild" },
  { url: "https://i.pinimg.com/1200x/4b/4b/1c/4b4b1cd77f8b2ce1f736ece84b5e4593.jpg", title: "River Flow", desc: "Eternal journey to the sea" },
];

const HorizontalScrollRow = ({ title, images, onImageClick, icon: Icon }: { title: string, images: any[], onImageClick: (img: any) => void, icon: any }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      if (e.deltaY !== 0) {
        scrollRef.current.scrollLeft += e.deltaY;
        // Only prevent default if we are scrolling horizontally within the container
        // to allow normal page scroll if we reach the end, but usually for these rows
        // users expect it to capture the wheel.
        e.preventDefault();
      }
    }
  };

  return (
    <div className="mt-16 first:mt-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-4 text-gray-900 dark:text-white tracking-tight">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
            <Icon className="w-7 h-7" />
          </div>
          {title}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button 
            onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div 
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-8 overflow-x-auto no-scrollbar pb-8 scroll-smooth"
      >
        {images.map((img, i) => (
          <div 
            key={i}
            onClick={() => onImageClick(img)}
            className="flex-none w-[320px] md:w-[450px] rounded-[2rem] overflow-hidden aspect-[16/10] relative group cursor-pointer shadow-xl border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-all duration-500"
          >
            <img 
              src={img.url} 
              alt={img.title} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
              referrerPolicy="no-referrer" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
              <div className="transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="text-white font-bold text-2xl mb-2 tracking-tight">{img.title}</h3>
                <p className="text-gray-300 text-base leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">{img.desc}</p>
              </div>
            </div>
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-[-10px] group-hover:translate-y-0">
              <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20 shadow-2xl">
                <ChevronRight className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const studioTools = [
  {
    id: 'translateVideo',
    name: 'Dịch thuật Trung/Hàn',
    desc: 'Bản dịch AI trực tiếp trên hình ảnh phụ đề video bằng OCR. Không cần tệp phụ đề SRT rời, cực kỳ lý tưởng cho các phim kịch gốc.',
    badge: 'Đặc Biệt',
    badgeColor: 'from-indigo-500 to-rose-500',
    icon: Languages,
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10',
    category: 'translation',
    specs: ['Nhận dạng trực tiếp hardsub', 'Dịch nghĩa tiếng Việt mượt mà', 'Xem trực tiếp thời gian thực']
  },
  {
    id: 'ocr',
    name: 'Real-time Video OCR',
    desc: 'Nhận dạng và giải nghĩa chữ viết trực tiếp từ Live Webcam hoặc các tệp Video gốc. Phù hợp quét văn bản nhanh chóng.',
    badge: 'High-Tech',
    badgeColor: 'from-blue-500 to-sky-500',
    icon: FileText,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
    category: 'ai',
    specs: ['Đọc văn bản từ camera', 'Trích xuất sao chép văn bản', 'Hỗ trợ dịch nghĩa tức thì']
  },
  {
    id: 'videoAnalysis',
    name: 'Phân Tích Video AI',
    desc: 'Khai thác tối đa trí tuệ Gemini để tóm tắt kịch bản phim, gợi ý cách triển khai chủ đề và thiết lập bộ từ khóa viral.',
    badge: 'Thông Minh',
    badgeColor: 'from-amber-500 to-orange-500',
    icon: Gauge,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
    category: 'ai',
    specs: ['Tóm tắt tự động siêu tốc', 'Định hướng dàn ý chủ đề', 'Mẹo thu hút triệu người xem']
  },
  {
    id: 'chibiFrame',
    name: 'Khung Viền & Chibi',
    desc: 'Lồng ghép các kiểu khung hình quảng cáo đẹp mắt hoặc thêm nhân vật chibi hoạt hình vui nhộn để gia tăng tương tác video.',
    badge: 'Marketing',
    badgeColor: 'from-pink-500 to-rose-500',
    icon: ImagePlus,
    color: 'text-pink-500 bg-pink-50 dark:bg-pink-500/10',
    category: 'editing',
    specs: ['Hàng chục hoạt ảnh chibi', 'Thêm logo watermark quảng bá', 'Xóa phông nền ảnh bìa']
  },
  {
    id: 'autoSubtitle',
    name: 'Phụ Đề Tự Động',
    desc: 'Hệ thống lắng nghe âm điệu AI tự động phân tách âm thanh lời nói để chuyển hóa thành văn bản phụ đề chi tiết khớp với hình.',
    badge: 'Rảnh Tay',
    badgeColor: 'from-emerald-500 to-teal-500',
    icon: Sparkles,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    category: 'translation',
    specs: ['Nhận giọng nói sang text', 'Tạo thời gian chuẩn xác', 'Xuất file SRT tiện lợi']
  },
  {
    id: 'autoVietsub',
    name: 'Biên Dịch Vietsub',
    desc: 'Tự động dịch tệp phụ đề hiện hữu sang Tiếng Việt truyền cảm, tạo kiểu phụ đề Neon, phát sáng hoặc bóng mờ chuyên nghiệp.',
    badge: 'Thẩm Mỹ',
    badgeColor: 'from-purple-500 to-fuchsia-500',
    icon: Sparkles,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
    category: 'translation',
    specs: ['Bản dịch tự động mượt mà', 'Biên tập kiểu chữ nổi bật', 'Xuất bản chất lượng cực cao']
  },
  {
    id: 'split',
    name: 'Chia Nhỏ Video clip',
    desc: 'Nhanh chóng bóc tách một video lớn thành nhiều phần nhỏ đều nhau. Rất hữu hiệu để đăng đăng loạt Shorts, Reels, TikTok.',
    badge: 'Năng Suất',
    badgeColor: 'from-cyan-500 to-blue-500',
    icon: SplitSquareHorizontal,
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10',
    category: 'editing',
    specs: ['Cắt phân nhỏ tự động', 'Không làm vỡ chất lượng', 'Xuất danh sách tải xuống']
  },
  {
    id: 'cut',
    name: 'Cắt Ngắn Phân Đoạn',
    desc: 'Lấy ra phân cảnh đắt giá nhất chỉ bằng cách nhập mốc thời gian bắt đầu và kết thúc cực kỳ linh hoạt và mượt mà.',
    badge: 'Chuẩn Xác',
    badgeColor: 'from-red-500 to-orange-500',
    icon: Scissors,
    color: 'text-red-500 bg-red-50 dark:bg-red-500/10',
    category: 'editing',
    specs: ['Thời gian miligiây chuẩn', 'Xem trước nhanh mốc ghép', 'Tải về tệp nén dung lượng nhẹ']
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail & Descriptive AI',
    desc: 'Trích xuất ảnh lồng ghép văn bản làm ảnh bìa thu hút người nhìn, đồng thời nhận đề xuất tiêu đề, bài viết mô tả viral.',
    badge: 'Creator Boost',
    badgeColor: 'from-blue-600 to-indigo-600',
    icon: ImageIcon,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
    category: 'editing',
    specs: ['Gợi ý tiêu đề giật gân', 'Chỉnh sửa văn bản chồng ảnh', 'Lưu ảnh chất lượng Full HD']
  },
  {
    id: 'audioSeparator',
    name: 'Tách Âm Lời & Nhạc',
    desc: 'Trích xuất lọc bỏ bài hát để lấy lời thoại diễn thuyết rõ nét hoặc giữ nguyên beat nhạc cụ tinh tế chất lượng phòng thu.',
    badge: 'Độc Lập',
    badgeColor: 'from-violet-500 to-indigo-500',
    icon: Mic,
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
    category: 'editing',
    specs: ['Lọc nhiễu âm rác', 'Tách riêng Vocals & Beats', 'Giữ nguyên tần số nhạc gốc']
  },
  {
    id: 'srtCleaner',
    name: 'Dọn Dẹp File SRT',
    desc: 'Tiện ích lọc sạch mã CapCut, thời gian trùng lặp, ngôn ngữ lỗi và chuẩn hóa trực quan file phụ đề SRT sẵn có.',
    badge: 'Tool Tiện ích',
    badgeColor: 'from-green-500 to-teal-500',
    icon: Eraser,
    color: 'text-green-500 bg-green-50 dark:bg-green-500/10',
    category: 'utility',
    specs: ['Xóa bỏ text thừa CapCut', 'Sắp xếp chuẩn mốc giây', 'Lưu nhanh dạng SRT/TXT']
  },
  {
    id: 'removeText',
    name: 'Xóa Chữ watermark',
    desc: 'Bôi xóa sạch sẽ watermark bản quyền cứng, logo chèn, hoặc nhãn dán cứng lấn chiếm thẩm mỹ hình ảnh bằng AI thông minh.',
    badge: 'AI Xử Lý',
    badgeColor: 'from-rose-500 to-pink-500',
    icon: Type,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
    isImageOnly: true,
    category: 'ai',
    specs: ['Vẽ khu vực cần loại bỏ', 'Tái tạo nền rực rỡ', 'Không để lại vết mờ rác']
  },
  {
    id: 'secureChat',
    name: 'Trò Chuyện Vault Riêng Tư',
    desc: 'Phòng trò chuyện nhóm mã hóa ngang hàng, truyền tải mượt mà không qua máy chủ tập trung để bàn kế hoạch sáng tạo.',
    badge: 'Tuyệt Mật',
    badgeColor: 'from-gray-700 to-slate-900',
    icon: Shield,
    color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/60',
    category: 'utility',
    specs: ['Không lưu trữ nhật ký', 'ID phòng mã hóa bảo an', 'An toàn giao tiếp tối mật']
  }
];

// Exponential Backoff Retry Utility for Gemini API calls to ensure extreme stability
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1500
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.statusCode === 429;
    const isServerErr = error?.status >= 500 || error?.message?.includes('500') || error?.message?.includes('503');
    
    if ((isRateLimit || isServerErr) && retries > 0) {
      console.warn(`[GEMINI API] Lỗi tạm thời: ${error?.message || error}. Đang thử lại sau ${delay}ms... (Còn lại ${retries} lần thử)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const getSecondsFromSrtTime = (timeStr: string): number => {
  if (!timeStr) return 0;
  try {
    const parts = timeStr.trim().split(/[,.]/);
    const timePart = parts[0] ? parts[0].trim() : "00:00:00";
    const msPart = parts[1] ? parts[1].trim() : "000";
    
    const timeParts = timePart.split(':').map(Number);
    let sec = 0;
    if (timeParts.length === 3) {
      sec = (timeParts[0] || 0) * 3600 + (timeParts[1] || 0) * 60 + (timeParts[2] || 0);
    } else if (timeParts.length === 2) {
      sec = (timeParts[0] || 0) * 60 + (timeParts[1] || 0);
    } else if (timeParts.length === 1) {
      sec = timeParts[0] || 0;
    }
    sec += parseInt(msPart, 10) / 1000;
    return sec;
  } catch (err) {
    return 0;
  }
};

const isTimeInTimestamp = (timeSec: number, timestamp: string): boolean => {
  if (!timestamp || !timestamp.includes('-->')) return false;
  try {
    const parts = timestamp.split('-->');
    const start = getSecondsFromSrtTime(parts[0]);
    const end = getSecondsFromSrtTime(parts[1]);
    return timeSec >= start && timeSec <= end;
  } catch (err) {
    return false;
  }
};

const parseSrtText = (srtText: string): any[] => {
  if (!srtText) return [];
  try {
    const cleanSrt = srtText.replace(/\r\n/g, '\n').trim();
    const blocks = cleanSrt.split(/\n\s*\n/);
    const results: any[] = [];
    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 3) {
        const tsIndex = lines.findIndex(l => l.includes('-->'));
        if (tsIndex !== -1 && lines.length > tsIndex + 1) {
          const timestamp = lines[tsIndex];
          const text = lines.slice(tsIndex + 1).join('\n');
          results.push({ timestamp, translatedVi: text });
        }
      }
    }
    return results;
  } catch (err) {
    console.error("Error parsing SRT:", err);
    return [];
  }
};

interface OutputVideoPlayerProps {
  video: {
    name: string;
    url: string;
    translateVideoResult?: any[];
    srtOutput?: string;
  };
  globalTranslateVideoResult: any[];
  globalSrtOutput: string;
}

const OutputVideoPlayer: React.FC<OutputVideoPlayerProps> = ({ video, globalTranslateVideoResult, globalSrtOutput }) => {
  const [currentTime, setCurrentTime] = useState(0);

  const subtitleList = useMemo(() => {
    if (video.translateVideoResult && video.translateVideoResult.length > 0) {
      return video.translateVideoResult;
    }
    if (video.srtOutput) {
      return parseSrtText(video.srtOutput);
    }
    // Fallback to active global translation states
    if (globalTranslateVideoResult && globalTranslateVideoResult.length > 0) {
      return globalTranslateVideoResult;
    }
    if (globalSrtOutput) {
      return parseSrtText(globalSrtOutput);
    }
    return [];
  }, [video.translateVideoResult, video.srtOutput, globalTranslateVideoResult, globalSrtOutput]);

  const activeTranslation = subtitleList.find((tr: any) => isTimeInTimestamp(currentTime, tr.timestamp));

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group border border-white/5 shadow-inner">
      <video
        src={video.url}
        controls
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
        className="w-full h-full object-contain"
      />
      {activeTranslation && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-black/90 backdrop-blur-lg px-5 py-2.5 border border-white/15 rounded-2xl text-center pointer-events-none transition-all duration-300 z-10 shadow-xl shadow-black/70">
          <p className="text-sm sm:text-base md:text-lg font-black text-white leading-snug drop-shadow-md whitespace-pre-wrap">
            {activeTranslation.translatedVi || activeTranslation.text || ''}
          </p>
        </div>
      )}
      {subtitleList.length > 0 && (
        <div className="absolute top-3 left-3 bg-indigo-600/95 backdrop-blur-md text-[9px] text-white font-black uppercase tracking-widest px-2 py-0.5 rounded-full select-none z-10 shadow-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Đã Kèm Bản Dịch ({subtitleList.length})
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Custom API Key inputs & states
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return window.localStorage.getItem('user_gemini_api_key') || '';
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return window.localStorage.getItem('user_gemini_api_key') || '';
  });
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<'success' | 'failed' | null>(null);
  const [keyTestError, setKeyTestError] = useState<string>('');
  const [activeRoom, setActiveRoom] = useState('global');
  const [chatToast, setChatToast] = useState<{ sender: string; text: string; avatar?: string } | null>(null);
  const [lastNotifiedMessageId, setLastNotifiedMessageId] = useState<string | null>(null);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Sweet dual-tone bell synthesizer chime (A5 chord -> E6 resolution)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1320, ctx.currentTime);
          gain2.gain.setValueAtTime(0.08, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.4);
        } catch (e) {}
      }, 70);
    } catch (e) {
      console.error("Audio chime error:", e);
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Dashboard & UX settings states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'ai' | 'editing' | 'translation' | 'utility'>('all');
  const [isSidebarExpandedReal, setIsSidebarExpanded] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isSidebarExpanded = isSidebarExpandedReal || isMobileSidebarOpen;

  const [mode, setMode] = useState<'dashboard' | 'cut' | 'split' | 'autoSubtitle' | 'autoVietsub' | 'speed' | 'thumbnail' | 'external' | 'audioSeparator' | 'srtCleaner' | 'chibiFrame' | 'secureChat' | 'videoAnalysis' | 'translateVideo' | 'removeText' | 'ocr'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode');
      const validModes = ['dashboard', 'cut', 'split', 'autoSubtitle', 'autoVietsub', 'speed', 'thumbnail', 'external', 'audioSeparator', 'srtCleaner', 'chibiFrame', 'secureChat', 'videoAnalysis', 'translateVideo', 'removeText', 'ocr'];
      if (urlMode && validModes.includes(urlMode)) {
        return urlMode as any;
      }
      if (params.get('room')) {
        return 'secureChat';
      }
    }
    return 'dashboard'; // Default to gorgeous home dashboard
  });
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [subtitleSpeedFactor, setSubtitleSpeedFactor] = useState(1.0);

  // Translate Video states
  const [translateVideoResult, setTranslateVideoResult] = useState<any[]>([]);
  const [videoPlayerTime, setVideoPlayerTime] = useState<number>(0);
  const [copiedTranslateIndex, setCopiedTranslateIndex] = useState<number | null>(null);
  const [translateRange, setTranslateRange] = useState<'all' | 'custom'>('all');
  const [translateStart, setTranslateStart] = useState<string>('00:00:00');
  const [translateEnd, setTranslateEnd] = useState<string>('00:00:10');
  const [translateStepSeconds, setTranslateStepSeconds] = useState<number>(1.5);
  const [isCropEnabled, setIsCropEnabled] = useState<boolean>(true);
  const [cropXPercent, setCropXPercent] = useState<number>(10);
  const [cropYPercent, setCropYPercent] = useState<number>(70);
  const [cropWidthPercent, setCropWidthPercent] = useState<number>(80);
  const [cropHeightPercent, setCropHeightPercent] = useState<number>(20);

  // Chibi Frame states
  const [chibiImage, setChibiImage] = useState<string>('');
  const [bgFrameImage, setBgFrameImage] = useState<string>('');
  const [chibiFrameRatio, setChibiFrameRatio] = useState<'16:9' | '9:16'>('16:9');
  const chibiPreviewRef = useRef<HTMLDivElement>(null);
  const [previewHeight, setPreviewHeight] = useState<number>(900);
  const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [previewFrameRatio, setPreviewFrameRatio] = useState<'auto' | '16:9' | '9:16' | '1:1'>('auto');
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  // SRT Cleaner states
  const [cleanBrackets, setCleanBrackets] = useState(true);
  const [cleanUppercase, setCleanUppercase] = useState(false);
  const [cleanPunctuation, setCleanPunctuation] = useState(false);
  const [cleanTranslateVi, setCleanTranslateVi] = useState(false);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtOutput, setSrtOutput] = useState('');
  const [srtFileName, setSrtFileName] = useState('');
  const [srtTab, setSrtTab] = useState<'srt' | 'txt'>('srt');

  // Audio Separator states
  const [audioSepMode, setAudioSepMode] = useState<'voice' | 'music'>('voice');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  // Cut states
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:00:10');

  // Split states
  const [chunkDuration, setChunkDuration] = useState(10);
  const [splitAspectRatio, setSplitAspectRatio] = useState<'original' | '16:9' | '9:16'>('original');

  // Auto Subtitle states
  const [isFullVideo, setIsFullVideo] = useState(true);

  // Auto Vietsub states
  const [subStyle, setSubStyle] = useState<SubStyle>('default');
  const [subPos, setSubPos] = useState<SubPos>('bottom');
  const [subMarginV, setSubMarginV] = useState(20);
  const [withVoice, setWithVoice] = useState(false);
  const [voiceName, setVoiceName] = useState('Kore'); // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'

  // Logo Modal state
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedZoomImage, setSelectedZoomImage] = useState<{url: string, title: string, desc?: string} | null>(null);

  // Speed states
  const [videoSpeed, setVideoSpeed] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Thumbnail & Metadata states
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [aiSuggestedLayers, setAiSuggestedLayers] = useState<TextLayer[][]>([]);
  const [generatedDescription, setGeneratedDescription] = useState<string>('');
  const [activeThumbnailTab, setActiveThumbnailTab] = useState<'images' | 'metadata' | 'editor'>('images');
  const [externalTool, setExternalTool] = useState<'ai-studio' | 'suno' | 'tiktok'>('ai-studio');
  const [textLayers, setTextLayers] = useState<TextLayer[]>([
    {
      id: '1',
      text: 'TIÊU ĐỀ HẤP DẪN',
      font: 'Inter',
      color: '#ffffff',
      size: 60,
      style: 'outline',
      x: 50,
      y: 50
    }
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('1');
  const [userPrompt, setUserPrompt] = useState<string>('');

  const [numThumbnails, setNumThumbnails] = useState<number>(5);

  // Video Analysis states
  const [analysisResult, setAnalysisResult] = useState<{
    fileName?: string;
    summary: string;
    orientation: string;
    titles: string[];
    advice: string;
  } | null>(null);
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<{
    fileName: string;
    thumbnailUrl?: string;
    summary: string;
    orientation: string;
    titles: string[];
    advice: string;
  }[]>([]);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputVideos, setOutputVideos] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  // UI States
  const [lang, setLang] = useState<Lang>('vi');
  const [darkMode, setDarkMode] = useState(true);

  const t = translations[lang];

  const resetEngine = async () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    generatedThumbnails.forEach(url => {
      if (url !== imageUrl) URL.revokeObjectURL(url);
    });
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    
    setVideoFile(null);
    setVideoUrl('');
    setImageFile(null);
    setImageUrl('');
    setOutputVideos([]);
    setGeneratedThumbnails([]);
    setGeneratedTitles([]);
    setGeneratedDescription('');
    setUserPrompt('');
    setError(null);
    setProgress(0);
    
    try {
      await ffmpegRef.current.terminate();
    } catch (e) {
      // Ignore termination errors
    }
    await load(true);
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const safeReadFile = async (ffmpeg: any, fileName: string) => {
    try {
      const files = await ffmpeg.listDir('/');
      if (files.some((f: any) => f.name === fileName)) {
        return await ffmpeg.readFile(fileName);
      }
      return null;
    } catch (err) {
      console.warn(`Safe read failed for ${fileName}:`, err);
      return null;
    }
  };

  const safeDeleteFile = async (ffmpeg: any, fileName: string) => {
    try {
      const files = await ffmpeg.listDir('/');
      if (files.some((f: any) => f.name === fileName)) {
        await ffmpeg.deleteFile(fileName);
      }
    } catch (err) {
      console.warn(`Safe delete failed for ${fileName}:`, err);
    }
  };

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Global memory error detected. Resetting engine...');
        resetEngine();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Synchronise the user custom optional API key with URL search parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiKeys_params = ['apiKey', 'key', 'geminiKey', 'userApiKey', 'gemini_api_key'];
    let foundKey = '';
    for (const p of apiKeys_params) {
      const val = params.get(p);
      if (val && val.trim().startsWith('AIzaSy')) {
        foundKey = val.trim();
        params.delete(p);
        break;
      }
    }

    if (foundKey) {
      window.localStorage.setItem('user_gemini_api_key', foundKey);
      setUserApiKey(foundKey);
      setApiKeyInput(foundKey);
      
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);

      setTimeout(() => {
        addLog('SYSTEM: Đã tự động nhận diện và thiết lập API Key cá nhân của bạn!');
      }, 1500);
    }
  }, []);

  // Synchronise the activeRoom state with the URL room search parameter
  useEffect(() => {
    const syncRoom = () => {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room') || 'global';
      if (r !== activeRoom) {
        setActiveRoom(r);
      }
    };
    syncRoom();
    const interval = setInterval(syncRoom, 1000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  // Request browser Notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Listen to incoming messages globally across Firestore to handle notifications & sounds
  useEffect(() => {
    if (mode === 'secureChat') {
      setUnreadCount(0);
    }

    let isInitial = true;
    const initialTimestamp = Date.now();

    const q = query(
      collection(db, 'messages'),
      where('room', '==', activeRoom),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        isInitial = false;
        return;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      const msgId = doc.id;
      const currentUsername = localStorage.getItem('chat_username') || '';

      if (data.sender !== currentUsername && data.sender !== 'SYSTEM') {
        if (!isInitial) {
          const messageAge = Date.now() - data.timestamp;
          const isRecent = messageAge < 8000;
          
          if (isRecent && lastNotifiedMessageId !== msgId) {
            setLastNotifiedMessageId(msgId);
            
            // Play notification bell on-the-fly via web audio API
            playNotificationSound();

            // Handle browser title blinking when document tab is hidden
            if (document.hidden) {
              let toggle = true;
              const originalTitle = document.title;
              const blinkInterval = setInterval(() => {
                document.title = toggle ? `🔔 (1) Tin nhắn mới từ ${data.sender}` : originalTitle;
                toggle = !toggle;
              }, 1000);

              const handleVisibility = () => {
                if (!document.hidden) {
                  clearInterval(blinkInterval);
                  document.title = originalTitle;
                  window.removeEventListener('visibilitychange', handleVisibility);
                }
              };
              window.addEventListener('visibilitychange', handleVisibility);
            }

            // Standard push notification if granted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Tin nhắn mới từ ${data.sender}`, {
                  body: data.text || 'Đã gửi một tệp đính kèm...',
                  icon: data.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=SecureNode"
                });
              } catch (err) {
                console.error("Browser notification push error:", err);
              }
            }

            // Custom UI in-app Toast if not actively looking at chat
            if (mode !== 'secureChat') {
              setUnreadCount(prev => prev + 1);
              setChatToast({
                sender: data.sender,
                text: data.text || 'Đã gửi một tệp đính kèm...',
                avatar: data.avatar
              });
            }
          }
        }
      }
      isInitial = false;
    }, (err) => {
      console.warn("Silent ignore: global listener snapshot fail", err);
    });

    return () => {
      unsubscribe();
    };
  }, [activeRoom, mode, lastNotifiedMessageId]);

  // Handle auto-dismiss of custom Toast Notification alert after several seconds
  useEffect(() => {
    if (chatToast) {
      const timer = setTimeout(() => {
        setChatToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [chatToast]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoUrl]);

  // Derived state for active translation segment tracking based on video time
  const activeTranslationIndex = mode === 'translateVideo' && translateVideoResult.length > 0
    ? translateVideoResult.findIndex(tr => isTimeInTimestamp(videoPlayerTime, tr.timestamp))
    : -1;
  const activeTranslation = activeTranslationIndex !== -1 ? translateVideoResult[activeTranslationIndex] : null;

  // Auto-scroll the active subtitle card smoothly inside its container as video plays WITHOUT scrolling the outer window
  useEffect(() => {
    if (activeTranslationIndex !== -1 && mode === 'translateVideo') {
      const container = document.getElementById('translate-subtitles-container');
      const activeCard = document.getElementById(`tr-card-${activeTranslationIndex}`);
      if (container && activeCard) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = activeCard.getBoundingClientRect();
        
        let targetScrollTop = container.scrollTop;
        if (cardRect.top < containerRect.top) {
          targetScrollTop = container.scrollTop - (containerRect.top - cardRect.top) - 12;
        } else if (cardRect.bottom > containerRect.bottom) {
          targetScrollTop = container.scrollTop + (cardRect.bottom - containerRect.bottom) + 12;
        }
        
        if (targetScrollTop !== container.scrollTop) {
          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [activeTranslationIndex, mode]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), msg]);
  };

  const load = async (force = false) => {
    if (!force && (loaded || isLoading)) return;
    setIsLoading(true);
    setLoaded(false);
    try {
      // Use a more stable version of FFmpeg core
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ message }) => {
        addLog(message);
      });

      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.max(0, Math.min(100, progress * 100)));
      });

      // Load FFmpeg with specific core and wasm URLs
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      setLoaded(true);
      addLog('SYSTEM: FFmpeg engine loaded successfully.');
    } catch (err) {
      console.error('FFmpeg Initialization Error:', err);
      setError('Failed to initialize FFmpeg. Please check your internet connection or browser compatibility (COOP/COEP headers).');
      addLog('ERROR: FFmpeg initialization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSubFFmpeg = async (workerId: number): Promise<any> => {
    try {
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      const sub = new FFmpeg();
      sub.on('log', ({ message }) => {
        if (message.includes('Error') || message.includes('failed') || message.includes('Success') || message.includes('Output')) {
          addLog(`[Worker #${workerId}]: ${message}`);
        }
      });
      await sub.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return sub;
    } catch (e: any) {
      console.error("Failed to load sub FFmpeg:", e);
      addLog(`ERROR: Worker #${workerId} không thể khởi chạy công cụ FFmpeg.`);
      throw e;
    }
  };

  const runWithConcurrency = async <T, R>(
    items: T[],
    concurrency: number,
    task: (item: T, index: number, workerId: number) => Promise<R>
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    const queue = [...items.map((item, index) => ({ item, index }))];
    
    const totalWorkers = Math.min(concurrency, items.length);
    const workers = Array.from({ length: totalWorkers }, async (_, workerId) => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        try {
          const res = await task(next.item, next.index, workerId + 1);
          results[next.index] = res;
        } catch (e) {
          console.error(`Concurrency error at index ${next.index}:`, e);
          throw e;
        }
      }
    });

    await Promise.all(workers);
    return results;
  };

  useEffect(() => {
    load();
    return () => {
      try {
        ffmpegRef.current.terminate();
      } catch (e) {
        // Ignore termination errors
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('mode') !== mode) {
        url.searchParams.set('mode', mode);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [mode]);

  const handleFileSelection = async (file: File) => {
    // Start reading the file's data immediately to prevent DOMException Code 8 in sandboxed environments
    const bufferPromise = file.arrayBuffer();

    setIsProcessing(true);
    addLog(`SYSTEM: Đang tối ưu hóa bộ nhớ đệm cho ${file.name}...`);
    let optimizedFile = file;
    try {
      const buffer = await bufferPromise;
      optimizedFile = new File([buffer], file.name, { type: file.type });
    } catch (e: any) {
      console.warn("Could not cache file in memory, using original reference:", e);
    } finally {
      setIsProcessing(false);
    }

    const isVideo = optimizedFile.type.startsWith('video/') || optimizedFile.type === 'application/octet-stream' || optimizedFile.type === '' || optimizedFile.name.match(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|flv)$/i);
    const isImage = optimizedFile.type.startsWith('image/') || optimizedFile.name.match(/\.(jpg|jpeg|png|webp|bmp|heif|heic)$/i);

    let targetMode = mode;
    if (mode === 'dashboard' || mode === 'secureChat' || mode === 'external') {
      if (isVideo) {
        setMode('videoAnalysis');
        targetMode = 'videoAnalysis';
      } else if (isImage) {
        setMode('thumbnail');
        targetMode = 'thumbnail';
      }
    }

    if (optimizedFile && isVideo) {
      const sizeInMB = optimizedFile.size / 1024 / 1024;
      if (sizeInMB > 500) {
        addLog(`WARNING: Large file detected (${sizeInMB.toFixed(2)} MB). Processing might fail due to browser memory limits.`);
      }
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      
      setVideoFile(optimizedFile);
      setVideoUrl(URL.createObjectURL(optimizedFile));
      setVideoDimensions(null);
      setPreviewFrameRatio('auto');
      
      if (targetMode !== 'chibiFrame') {
        generatedThumbnails.forEach(url => {
          if (url !== imageUrl) URL.revokeObjectURL(url);
        });
        outputVideos.forEach(v => URL.revokeObjectURL(v.url));
        setImageFile(null);
        setImageUrl('');
        setOutputVideos([]);
        setGeneratedThumbnails([]);
        setGeneratedTitles([]);
        setGeneratedDescription('');
        setAnalysisResult(null);
        setUserPrompt('');
        setError(null);
        setProgress(0);
      }
      addLog(`SYSTEM: Video loaded - ${optimizedFile.name} (${sizeInMB.toFixed(2)} MB)`);
      if (targetMode === 'thumbnail') setActiveThumbnailTab('editor');
    } else if (optimizedFile && isImage && (targetMode === 'thumbnail' || targetMode === 'chibiFrame' || targetMode === 'removeText')) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      
      setImageFile(optimizedFile);
      const url = URL.createObjectURL(optimizedFile);
      setImageUrl(url);
      
      if (targetMode !== 'chibiFrame') {
        generatedThumbnails.forEach(genUrl => {
          if (genUrl !== imageUrl) URL.revokeObjectURL(genUrl);
        });
        setGeneratedThumbnails([url]);
        setGeneratedTitles([]);
        setGeneratedDescription('');
        setUserPrompt('');
        setVideoFile(null);
        setVideoUrl('');
        setError(null);
      }
      addLog(`SYSTEM: Image/Asset loaded - ${optimizedFile.name}`);
      if (targetMode === 'thumbnail') setActiveThumbnailTab('editor');
    } else {
      setError((targetMode === 'thumbnail' || targetMode === 'chibiFrame' || targetMode === 'removeText') ? 'Please select a valid video or image file.' : 'Please select a valid video file.');
    }
  };

  const optimizeAndSetBatchFiles = async (files: File[]) => {
    setIsProcessing(true);
    addLog(`SYSTEM: Đang nạp và tối ưu hóa bộ nhớ cho ${files.length} tập tin để tránh lỗi đọc...`);
    try {
      const promises = files.map(async (file) => {
        const bufferPromise = file.arrayBuffer();
        const buffer = await bufferPromise;
        return new File([buffer], file.name, { type: file.type });
      });
      const optimized = await Promise.all(promises);
      setBatchFiles(optimized);
      addLog(`SYSTEM: Tối ưu dữ liệu ${optimized.length} tập tin thành công.`);
    } catch (e: any) {
      console.error(e);
      addLog(`ERROR: Lỗi tối ưu hóa tập tin: ${e.message}`);
      setError(`Không thể tối ưu hóa một hoặc nhiều tập tin.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  useEffect(() => {
    setIsDragging(dragCounter > 0);
  }, [dragCounter]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (mode === 'secureChat' || mode === 'external') return;
    if (e.dataTransfer.types && (e.dataTransfer.types.includes ? e.dataTransfer.types.includes('Files') : true)) {
      setDragCounter(prev => prev + 1);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (mode === 'secureChat' || mode === 'external') return;
    setDragCounter(prev => Math.max(0, prev - 1));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(0);
    if (mode === 'secureChat' || mode === 'external') return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const setTimeToCurrent = (type: 'start' | 'end') => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      if (type === 'start') setStartTime(formatted);
      else setEndTime(formatted);
    }
  };

  const formatTimeHHMMSS = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const safeJsonParse = (text: string) => {
    if (!text) return null;
    const trimmed = text.trim();
    
    // First, if it parses directly, great!
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      // Ignore
    }

    // Next, try to extract from markdown code blocks
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {
        // Ignore and fallback
      }
    }

    // Last resort: find the first { or [ and last } or ]
    const startIdx = Math.min(
      trimmed.indexOf('{') === -1 ? Infinity : trimmed.indexOf('{'),
      trimmed.indexOf('[') === -1 ? Infinity : trimmed.indexOf('[')
    );
    const endIdx = Math.max(
      trimmed.lastIndexOf('}'),
      trimmed.lastIndexOf(']')
    );
    
    if (startIdx !== Infinity && endIdx !== -1 && endIdx > startIdx) {
      const potentialJson = trimmed.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(potentialJson);
      } catch (e2) {
        // Ignore JSON parse errors for non-JSON strings that just happen to contain braces/brackets
      }
    }
    
    return null;
  };

  const captureFrame = () => {
    if (!videoRef.current || !videoFile) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', 0.9);
    // Revoke old image if it was a blob URL we created
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(url);
    addLog('SYSTEM: Đã chụp ảnh màn hình video để làm thumbnail.');
    setActiveThumbnailTab('editor');
  };

  const handleCut = async () => {
    if (!videoFile || !loaded) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    setOutputVideos([]);
    addLog('SYSTEM: Initializing cut operation...');

    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      
      addLog(`EXEC: ffmpeg -i ${inputName} -ss ${startTime} -to ${endTime} -c copy ${outputName}`);
      
      await ffmpeg.exec([
        '-threads', '1',
        '-i', inputName,
        '-ss', startTime,
        '-to', endTime,
        '-c', 'copy',
        outputName
      ]);

      const data = await safeReadFile(ffmpeg, outputName);
      if (data) {
        const url = URL.createObjectURL(new Blob([data as Uint8Array], { type: 'video/mp4' }));
        setOutputVideos([{ name: `cut_${startTime.replace(/:/g, '-')}_to_${endTime.replace(/:/g, '-')}.mp4`, url }]);
        addLog('SYSTEM: Cut operation completed successfully.');
      }
      
      await safeDeleteFile(ffmpeg, inputName);
      await safeDeleteFile(ffmpeg, outputName);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Memory limit reached. Resetting engine...');
        await ffmpeg.terminate();
        await load(true);
        setError('Video too large for browser memory. Try a shorter clip.');
      } else {
        setError('An error occurred while cutting the video.');
        addLog('ERROR: Cut operation failed.');
      }
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };
  
  const handleAutoSubtitle = async () => {
    if (!videoFile || !loaded) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    setOutputVideos([]);
    addLog(`SYSTEM: Initializing auto-subtitle generation (${isFullVideo ? 'Full Video' : `${startTime} to ${endTime}`})...`);

    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.mp4';
    const audioOutputName = 'audio.mp3';

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      
      const ffmpegArgs = [];
      if (!isFullVideo) {
        ffmpegArgs.push('-ss', startTime, '-to', endTime);
      }
      ffmpegArgs.push('-threads', '1', '-i', inputName, '-vn', '-acodec', 'libmp3lame', '-b:a', '128k', audioOutputName);

      addLog(`EXEC: ffmpeg ${ffmpegArgs.join(' ')}`);
      
      const extractResult = await ffmpeg.exec(ffmpegArgs);
      if (extractResult !== 0) throw new Error(`Audio extraction failed with code ${extractResult}`);

      const audioData = await safeReadFile(ffmpeg, audioOutputName) as Uint8Array;
      if (!audioData) throw new Error('Audio extraction failed: Output file not found');
      
      // Efficiently convert Uint8Array to base64 using a Blob and FileReader
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const blob = new Blob([audioData], { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 2. AI Transcription (Upgraded with Retry & Stable Model)
      addLog('AI: Transcribing audio (Sử dụng Gemini Flash)...');
      const ai = new GoogleGenAI();
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          {
            parts: [
              { text: "Transcribe the following audio and return the result in SRT format. CRITICAL: Keep the timestamps exactly as they appear in the audio. Do not skip any parts. Return ONLY the SRT content. Ensure the format is: \n1\n00:00:00,000 --> 00:00:05,000\nText here\n" },
              { inlineData: { data: audioBase64, mimeType: "audio/mp3" } }
            ]
          }
        ]
      }));

      let srtContent = response.text || '';
      // Clean markdown code blocks if present
      srtContent = srtContent.replace(/```srt/g, '').replace(/```/g, '').trim();
      // Clean original language if present
      srtContent = cleanSrtContent(srtContent);
      
      if (!srtContent) throw new Error('No content returned from AI');

      // For external SRT file, we adjust timestamps
      const adjustedSrtContent = adjustSrtTimestamps(srtContent, videoSpeed, subtitleDelay, subtitleSpeedFactor);

      const outputs = [];
      const srtUrl = URL.createObjectURL(new Blob([adjustedSrtContent], { type: 'text/plain' }));
      
      if (videoSpeed !== 1.0) {
        addLog('SYSTEM: Speeding up video...');
        const outputVideoName = 'output_speed.mp4';
        
        let audioFilter = '';
        let tempSpeed = videoSpeed;
        while (tempSpeed > 2.0) { audioFilter += 'atempo=2.0,'; tempSpeed /= 2.0; }
        while (tempSpeed < 0.5) { audioFilter += 'atempo=0.5,'; tempSpeed /= 0.5; }
        audioFilter += `atempo=${tempSpeed.toFixed(2)}`;

        const videoSpeedFilter = `scale='min(1280,iw)':-2,setpts=${1/videoSpeed}*PTS`;
        
        const execArgs = [];
        if (!isFullVideo) {
          execArgs.push('-ss', startTime, '-to', endTime);
        }
        execArgs.push(
          '-threads', '1', '-i', inputName,
          '-vf', videoSpeedFilter,
          '-af', audioFilter,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-threads', '1',
          '-c:a', 'aac',
          outputVideoName
        );
        addLog(`EXEC: ffmpeg ${execArgs.join(' ')}`);
        const speedResult = await ffmpeg.exec(execArgs);
        if (speedResult !== 0) throw new Error(`Video speed adjustment failed with code ${speedResult}`);
        
        const data = await safeReadFile(ffmpeg, outputVideoName);
        if (data) {
          const videoUrl = URL.createObjectURL(new Blob([data as Uint8Array], { type: 'video/mp4' }));
          outputs.push({ name: `speed_${videoSpeed}x_${videoFile.name}`, url: videoUrl });
        }
        await safeDeleteFile(ffmpeg, outputVideoName);
      }

      outputs.push({ name: `auto_sub_${videoFile.name.split('.')[0]}.srt`, url: srtUrl });
      setOutputVideos(outputs);
      addLog('SYSTEM: AI Subtitle generation completed successfully.');
      
      await safeDeleteFile(ffmpeg, inputName);
      await safeDeleteFile(ffmpeg, audioOutputName);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Memory limit reached. Resetting engine...');
        await ffmpeg.terminate();
        await load(true);
        setError('Video too large for browser memory. Try a shorter clip.');
      } else {
        setError(t.autoSubtitleError);
        addLog('ERROR: AI Subtitle generation failed.');
      }
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleAutoVietsub = async () => {
    if (!videoFile || !loaded) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    setOutputVideos([]);
    addLog(`SYSTEM: Initializing Auto Vietsub...`);

    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.mp4';
    const audioInputName = 'audio.mp3';
    const srtName = 'sub.srt';
    const outputName = 'output_vietsub.mp4';

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      
      // 1. Extract audio
      addLog(`SYSTEM: Extracting audio for AI...`);
      
      const extractArgs = [];
      if (!isFullVideo) {
        extractArgs.push('-ss', startTime, '-to', endTime);
      }
      extractArgs.push('-threads', '1', '-i', inputName, '-vn', '-acodec', 'libmp3lame', '-b:a', '128k', audioInputName);
      const extractResult = await ffmpeg.exec(extractArgs);
      if (extractResult !== 0) throw new Error(`Audio extraction failed with code ${extractResult}`);

      const audioData = await safeReadFile(ffmpeg, audioInputName) as Uint8Array;
      if (!audioData) throw new Error('Audio extraction failed: Output file not found');
      
      const audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(new Blob([audioData], { type: 'audio/mp3' }));
      });

      // 2. AI Transcription & Translation (Upgraded with Retry & Stable Model)
      addLog('AI: Transcribing and translating to Vietnamese (Sử dụng Gemini Flash)...');
      const ai = new GoogleGenAI();
      
      let srtContent = '';
      try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [
            {
              parts: [
                { text: "Transcribe the following audio and translate it into Vietnamese. Return the result in SRT format. CRITICAL: Keep the timestamps exactly as they appear in the original audio. Do not modify the time values. Return ONLY the SRT content. Ensure valid SRT format. IMPORTANT: Do NOT include the original language text, return ONLY the Vietnamese translation. Each subtitle entry should contain ONLY the Vietnamese text." },
                { inlineData: { data: audioBase64, mimeType: "audio/mp3" } }
              ]
            }
          ]
        }));
        srtContent = response.text || '';
        // Clean markdown code blocks if present
        srtContent = srtContent.replace(/```srt/g, '').replace(/```/g, '').trim();
        // Clean original language if present
        srtContent = cleanSrtContent(srtContent);
      } catch (aiErr: any) {
        if (aiErr.message?.includes('429') || aiErr.status === 429) {
          throw new Error('API Quota Exceeded: Bạn đã tạm thời vượt quá giới hạn lượt yêu cầu AI. Vui lòng đợi một lát rồi thử lại.');
        }
        throw aiErr;
      }

      if (!srtContent) throw new Error('No content returned from AI');
      
      // IMPORTANT: For burning subtitles, we use the ORIGINAL 1x timestamps
      // because we apply the speed filter AFTER the subtitle filter.
      await ffmpeg.writeFile(srtName, new TextEncoder().encode(srtContent));

      // For the downloadable SRT file, we adjust timestamps to match the new video speed
      const adjustedSrtContent = adjustSrtTimestamps(srtContent, videoSpeed, subtitleDelay, subtitleSpeedFactor);

      // 3. Burn Subtitles and Speed Up
      addLog('SYSTEM: Burning subtitles and adjusting speed...');
      
      // Default style
      const forceStyle = 'FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,Alignment=2,MarginV=20';
      
      let audioFilter = '';
      let tempSpeed = videoSpeed;
      while (tempSpeed > 2.0) { audioFilter += 'atempo=2.0,'; tempSpeed /= 2.0; }
      while (tempSpeed < 0.5) { audioFilter += 'atempo=0.5,'; tempSpeed /= 0.5; }
      audioFilter += `atempo=${tempSpeed.toFixed(2)}`;

      const videoSpeedFilter = `setpts=${1/videoSpeed}*PTS`;
      
      // Complex filter: scale down if needed (max 1280px), burn subtitles, and handle speed
      const filter = `scale='min(1280,iw)':-2,subtitles=${srtName}:force_style='${forceStyle}'${videoSpeed !== 1.0 ? `,${videoSpeedFilter}` : ''}`;
      
      const execArgs = [];
      if (!isFullVideo) {
        execArgs.push('-ss', startTime, '-to', endTime);
      }
      execArgs.push(
        '-threads', '1', '-i', inputName,
        '-vf', filter
      );
      if (videoSpeed !== 1.0) {
        execArgs.push('-af', audioFilter);
      }
      execArgs.push(
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-threads', '1',
        '-c:a', 'aac',
        outputName
      );

      addLog(`EXEC: ffmpeg ${execArgs.join(' ')}`);
      const burnResult = await ffmpeg.exec(execArgs);
      if (burnResult !== 0) throw new Error(`Subtitle burning failed with code ${burnResult}`);

      const data = await safeReadFile(ffmpeg, outputName);
      if (!data) throw new Error('Subtitle burning failed: Output file not found');
      
      const url = URL.createObjectURL(new Blob([data as Uint8Array], { type: 'video/mp4' }));
      
      const srtBlob = new Blob([adjustedSrtContent], { type: 'text/plain' });
      const srtUrl = URL.createObjectURL(srtBlob);
      
      setOutputVideos([
        { name: `vietsub_${videoSpeed !== 1.0 ? `${videoSpeed.toFixed(1)}x_` : ''}${videoFile.name}`, url },
        { name: `vietsub_${videoFile.name.split('.')[0]}.srt`, url: srtUrl }
      ]);
      addLog('SYSTEM: Auto Vietsub completed successfully.');
      
      // Cleanup
      await safeDeleteFile(ffmpeg, inputName);
      await safeDeleteFile(ffmpeg, audioInputName);
      await safeDeleteFile(ffmpeg, srtName);
      await safeDeleteFile(ffmpeg, outputName);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Memory limit reached. Resetting engine...');
        await ffmpeg.terminate();
        await load(true);
        setError('Video too large for browser memory. Try a shorter clip.');
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg || 'An error occurred during Auto Vietsub process.');
        addLog(`ERROR: Auto Vietsub failed: ${errMsg}`);
      }
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleSrtCleaner = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSrtFileName(file.name);
    addLog(`SYSTEM: Cleaning SRT file: ${file.name}`);

    try {
      const text = await file.text();
      let jsonData: any = null;

      // Check if it's a CapCut JSON file
      if (file.name.endsWith('.json')) {
        jsonData = safeJsonParse(text);
      }

      let captions: { startMs: number, endMs: number, text: string }[] = [];

      if (jsonData) {
        // Ported CapCut parsing logic
        const materialsMap = new Map();
        if (jsonData.materials) {
          const mats = jsonData.materials;
          if (Array.isArray(mats)) {
            mats.forEach((m: any) => { if(m?.id) materialsMap.set(m.id, m); });
          } else if (typeof mats === 'object') {
            Object.values(mats).forEach((arr: any) => {
              if (Array.isArray(arr)) {
                arr.forEach((m: any) => { if(m?.id) materialsMap.set(m.id, m); });
              } else if (arr && typeof arr === 'object' && arr.id) {
                materialsMap.set(arr.id, arr);
              }
            });
          }
        }

        if (jsonData.tracks && Array.isArray(jsonData.tracks)) {
          for (const track of jsonData.tracks) {
            const segments = track.segments || [];
            for (const seg of segments) {
              let startMs, durationMs;
              if (Array.isArray(seg.target_timerange)) {
                startMs = seg.target_timerange[0];
                durationMs = seg.target_timerange[1];
              } else {
                startMs = seg.target_timerange?.start ?? seg.start_time ?? seg.start;
                durationMs = seg.target_timerange?.duration ?? seg.duration;
              }
              if (startMs === undefined || durationMs === undefined) continue;
              startMs = Math.round(startMs / 1000);
              durationMs = Math.round(durationMs / 1000);
              const endMs = startMs + durationMs;
              
              let text = "";
              if (seg.text) text = seg.text;
              else if (seg.content) text = seg.content;
              else if (seg.caption) text = seg.caption;
              else if (seg.material_id) {
                const mat = materialsMap.get(seg.material_id);
                if (mat) {
                  let rawContent = mat.content || mat.text || mat.caption || "";
                  // CapCut PC sometimes stores text as JSON: [{"text":"Hello"}] or {"text":"Hello"}
                  const parsed = safeJsonParse(rawContent);
                  if (Array.isArray(parsed)) {
                    rawContent = parsed.map((item: any) => item.text || '').join('');
                  } else if (parsed && parsed.text) {
                    rawContent = parsed.text;
                  }
                  text = rawContent;
                }
              }
              if (text && text.trim()) {
                captions.push({ startMs, endMs, text: text.trim() });
              }
            }
          }
        }
        
        // Fallback for other structures ONLY if tracks yielded nothing
        if (captions.length === 0) {
          const textMaterials = [
            ...(jsonData.materials?.texts || []), 
            ...(jsonData.materials?.voice_to_texts || []), 
            ...(jsonData.materials?.subtitles || [])
          ];
          for (const item of textMaterials) {
            let timerange = item.target_timerange;
            let startRaw, durationRaw;
            if (Array.isArray(timerange)) {
              startRaw = timerange[0];
              durationRaw = timerange[1];
            } else {
              timerange = timerange || {};
              startRaw = timerange.start;
              durationRaw = timerange.duration;
            }
            // If no timerange exists, we might get overlapping subs at t=0, 
            // but this is a fallback for legacy formats.
            let startMs = startRaw !== undefined ? Math.round(startRaw / 1000) : 0;
            let durationMs = durationRaw !== undefined ? Math.round(durationRaw / 1000) : 2000;
            const endMs = startMs + durationMs;
            let content = item.content || item.text || "";
                  const parsed = safeJsonParse(content);
                  if (Array.isArray(parsed)) {
                    content = parsed.map((it: any) => it.text || '').join('');
                  } else if (parsed && parsed.text) {
                    content = parsed.text;
                  }
            if (content.trim()) {
              captions.push({ startMs, endMs, text: content.trim() });
            }
          }
        }

        // Deduplicate overlapping exact-same captions
        const deduplicated = [];
        const seen = new Set();
        for (const cap of captions) {
          const key = `${cap.startMs}-${cap.endMs}-${cap.text}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduplicated.push(cap);
          }
        }
        captions = deduplicated;
      } else {
        // Treat as SRT or plain text
        // Simple SRT parser could be added here if needed, but the user's HTML focused on CapCut JSON
        setError('Vui lòng chọn file draft_content.json hoặc draft_info.json từ CapCut.');
        setIsProcessing(false);
        return;
      }

      if (captions.length === 0) {
        throw new Error("Không tìm thấy phụ đề nào trong file.");
      }

      captions.sort((a,b) => a.startMs - b.startMs);

      const applyOptions = (rawText: string) => {
        let processed = rawText.replace(/<[^>]+>/g, ''); // strip tags
        if (cleanBrackets) {
          processed = processed.replace(/\[|\]/g, '');
        }
        if (cleanUppercase) {
          processed = processed.toUpperCase();
        }
        if (cleanPunctuation) {
          processed = processed.replace(/[.,!?;:…\"'“”]/g, '');
        }
        return processed.replace(/\s+/g, ' ').trim() || "[empty]";
      };

      if (cleanTranslateVi) {
         addLog(`SYSTEM: Đang dịch ${captions.length} dòng phụ đề sang Tiếng Việt bằng Gemini (Công nghệ Gemini Flash)...`);
         const ai = new GoogleGenAI();
         const batchSize = 50;
         
         for (let i = 0; i < captions.length; i += batchSize) {
           const batch = captions.slice(i, i + batchSize);
           const texts = batch.map(c => applyOptions(c.text)).join('\n||\n');
           const prompt = `Translate the following subtitles to Vietnamese accurately and naturally. Maintain the exact same number of lines and use || as the separator between lines, just like the input. If some lines are numbers or timestamps, translate their meaning or leave as-is but keep the placeholder structure.\n\nInput lines:\n${texts}`;
           
           try {
             const res = await callGeminiWithRetry(() => ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: prompt,
             }));
             const responseText = res.text || '';
             // Handle potential single-line splitting mistakes
             let translatedLines = responseText.split('||').map(t => t.trim());
             
             batch.forEach((cap, idx) => {
               if (translatedLines[idx]) {
                 cap.text = translatedLines[idx];
               } else {
                 cap.text = applyOptions(cap.text);
               }
             });
           } catch(e: any) {
             console.error(e);
             addLog(`ERROR: Lỗi khi dịch ở lô ${i}-${i + batchSize}: ${e.message}`);
             // fallback to original text + options
             batch.forEach(cap => { cap.text = applyOptions(cap.text); });
           }
           setProgress(((i + batch.length) / captions.length) * 100);
         }
         addLog('SYSTEM: Dịch phụ đề hoàn tất.');
      }

      const msToSrt = (ms: number) => {
        ms = Math.max(0, Math.round(ms));
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const ms2 = ms % 1000;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms2).padStart(3,'0')}`;
      };

      const finalCaptions = captions.map(cap => ({
         ...cap,
         text: cleanTranslateVi ? cap.text : applyOptions(cap.text)
      }));

      const srtResult = finalCaptions.map((cap, idx) => {
        return `${idx+1}\n${msToSrt(cap.startMs)} --> ${msToSrt(cap.endMs)}\n${cap.text}`;
      }).join('\n\n');

      const txtResult = finalCaptions.map(cap => cap.text).join('\n');

      setSrtOutput(srtTab === 'srt' ? srtResult : txtResult);
      addLog(`SUCCESS: Cleaned ${captions.length} captions.`);
      
      // Also provide as a downloadable file in outputVideos
      const blob = new Blob([srtResult], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      setOutputVideos([{ name: `${file.name.split('.')[0]}_cleaned.srt`, url }]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi xử lý file.');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };



  const handleRemoveText = async () => {
    if (!imageFile && batchFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    setOutputVideos([]);
    
    // Process files
    const filesToProcess = batchFiles.length > 0 ? batchFiles : (imageFile ? [imageFile] : []);
    addLog(`AI: Đang xử lý xóa chữ cho ${filesToProcess.length} ảnh song song (tối đa 3 tệp cùng lúc)...`);
    
    try {
      const ai = new GoogleGenAI();
      const generatedOutputs: any[] = [];

      await runWithConcurrency<File, void>(filesToProcess, 1, async (file: File, i: number, workerId: number) => {
        addLog(`WORKER #${workerId}: Đang xóa chữ ảnh ${i + 1}/${filesToProcess.length}: ${file.name}...`);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
          
          const promptText = 'Recreate this image EXACTLY as it is, but completely remove any and all text, words, letters, typography, watermarks, subtitles, or captions. Cleanly fill in the background where the text was removed, matching the surrounding texture, color, and lighting perfectly. Maintain all original non-text elements, overall mood, art style, and aspect ratio of this image.';

          const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
                { text: promptText }
              ]
            }
          }));

          let found = false;
          if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const imgData = part.inlineData.data;
                const blob = await fetch(`data:${part.inlineData.mimeType};base64,${imgData}`).then(r => r.blob());
                const url = URL.createObjectURL(blob);
                generatedOutputs.push({ name: `no_text_${file.name}`, url });
                found = true;
                break;
              }
            }
          }
          if (!found) {
             addLog(`ERROR: AI không trả về ảnh cho file ${file.name}.`);
          }
        } catch (e: any) {
           console.error(e);
           addLog(`ERROR: Xử lý thất bại file ${file.name}: ${e.message}`);
        }

        setProgress(prev => {
          const finished = Math.min(100, prev + Math.ceil(100 / filesToProcess.length));
          return finished > 100 ? 100 : finished;
        });
      });
      
      if (generatedOutputs.length > 0) {
        setOutputVideos(generatedOutputs);
        addLog(`SYSTEM: Đã hoàn tất xóa chữ cho ${generatedOutputs.length} ảnh.`);
      } else {
        throw new Error('Dịch vụ AI không trả về được hình ảnh nào thành công.');
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi áp dụng hiệu ứng xóa chữ AI.');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>, action: 'drag' | 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = cropXPercent;
    const initialY = cropYPercent;
    const initialW = cropWidthPercent;
    const initialH = cropHeightPercent;
    
    const container = e.currentTarget.closest('.pointer-events-none.overflow-hidden') || e.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
      
      if (action === 'drag') {
        let newX = initialX + deltaX;
        let newY = initialY + deltaY;
        
        newX = Math.max(0, Math.min(100 - cropWidthPercent, newX));
        newY = Math.max(0, Math.min(100 - cropHeightPercent, newY));
        
        setCropXPercent(Math.round(newX));
        setCropYPercent(Math.round(newY));
      } else {
        let newX = initialX;
        let newY = initialY;
        let newW = initialW;
        let newH = initialH;

        if (action.includes('w')) {
          const proposedX = initialX + deltaX;
          const proposedW = initialW - deltaX;
          if (proposedX >= 0 && proposedW >= 5) {
            newX = proposedX;
            newW = proposedW;
          } else if (proposedX < 0) {
            newX = 0;
            newW = initialW + initialX;
          } else if (proposedW < 5) {
            newX = initialX + initialW - 5;
            newW = 5;
          }
        } else if (action.includes('e')) {
          const proposedW = initialW + deltaX;
          newW = Math.max(5, Math.min(100 - initialX, proposedW));
        }

        if (action.includes('n')) {
          const proposedY = initialY + deltaY;
          const proposedH = initialH - deltaY;
          if (proposedY >= 0 && proposedH >= 5) {
            newY = proposedY;
            newH = proposedH;
          } else if (proposedY < 0) {
            newY = 0;
            newH = initialH + initialY;
          } else if (proposedH < 5) {
            newY = initialY + initialH - 5;
            newH = 5;
          }
        } else if (action.includes('s')) {
          const proposedH = initialH + deltaY;
          newH = Math.max(5, Math.min(100 - initialY, proposedH));
        }

        setCropXPercent(Math.round(newX));
        setCropYPercent(Math.round(newY));
        setCropWidthPercent(Math.round(newW));
        setCropHeightPercent(Math.round(newH));
      }
    };
    
    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleSeekVideo = (timestampStr: string) => {
    if (!videoRef.current || !timestampStr) return;
    const startStr = timestampStr.split('-->')[0].trim();
    if (!startStr) return;
    const parts = startStr.split(/[:.,]/).map(Number);
    let seconds = 0;
    if (parts.length >= 3) {
      const hh = parts[0] || 0;
      const mm = parts[1] || 0;
      const ss = parts[2] || 0;
      const ms = parts[3] || 0;
      seconds = hh * 3600 + mm * 60 + ss + ms / 1000;
    } else if (parts.length === 2) {
      const mm = parts[0] || 0;
      const ss = parts[1] || 0;
      seconds = mm * 60 + ss;
    } else if (parts.length === 1) {
      seconds = parts[0] || 0;
    }
    if (!isNaN(seconds) && isFinite(seconds)) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      addLog(`SYSTEM: Tua đến thời điểm: ${startStr}`);
    }
  };

  const handleTranslateVideoText = async () => {
    if (!videoFile || !loaded) return;
    setIsProcessing(true);
    setProgress(10);
    setError(null);
    setTranslateVideoResult([]);
    addLog('SYSTEM: Khởi tạo tiến trình trích xuất hình ảnh để dịch chữ...');

    const formatSrtTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const s = Math.floor(seconds % 60).toString().padStart(2, '0');
      const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
      return `${h}:${m}:${s},${ms}`;
    };

    const timeToSeconds = (timeStr: string): number => {
      if (!timeStr) return 0;
      const cleanStr = timeStr.split(/[,.]/)[0].trim();
      const parts = cleanStr.split(':').map(Number);
      if (parts.some(isNaN)) return 0;
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 1) {
        return parts[0];
      }
      return 0;
    };

    try {
      let duration = Number(videoRef.current?.duration) || 30;
      if (isNaN(duration) || !isFinite(duration)) {
        duration = 30;
      }

      let startTime = 0;
      let endTime = duration;

      if (translateRange === 'custom') {
        startTime = Math.max(0, timeToSeconds(translateStart));
        endTime = Math.min(duration, timeToSeconds(translateEnd));
        if (startTime >= endTime) {
          startTime = 0;
          endTime = duration;
        }
        addLog(`SYSTEM: Dịch từ mốc ${formatSrtTime(startTime)} đến ${formatSrtTime(endTime)}...`);
      }
      
      // Sample frames based on stepSeconds configured by the user
      // Adaptive fallback handles long videos up to 80 frames safely.
      let stepSeconds = Math.max(0.1, translateStepSeconds);
      let totalExpected = Math.ceil((endTime - startTime) / stepSeconds);
      if (totalExpected > 80) {
        stepSeconds = Number(((endTime - startTime) / 80).toFixed(2));
        addLog(`SYSTEM: Đoạn video quá dài so với tần suất chọn. Tự động nới giãn cách lên cứ ${stepSeconds} giây lấy 1 ảnh để tránh quá tải hệ thống.`);
      }
      const timestamps = [];
      for (let t = startTime; t < endTime; t += stepSeconds) {
        timestamps.push(t);
      }
      
      const videoWidth = videoRef.current?.videoWidth || 640;
      const videoHeight = videoRef.current?.videoHeight || 360;
      const containerWidth = videoRef.current?.clientWidth || 640;
      const containerHeight = videoRef.current?.clientHeight || 360;

      // Helper function to map container crop coordinates to raw video coordinates to resolve letterbox shift
      const mapCropToVideo = (
        cX: number,
        cY: number,
        cW: number,
        cH: number,
        contW: number,
        contH: number,
        vidW: number,
        vidH: number,
        fit: 'contain' | 'cover' | 'fill'
      ) => {
        if (fit !== 'contain' || contW <= 0 || contH <= 0 || vidW <= 0 || vidH <= 0) {
          return { x: cX, y: cY, w: cW, h: cH };
        }

        const videoRatio = vidW / vidH;
        const containerRatio = contW / contH;

        let activeWidth = contW;
        let activeHeight = contH;
        let xPadding = 0;
        let yPadding = 0;

        if (videoRatio > containerRatio) {
          // Letterbox on top/bottom
          activeHeight = contW / videoRatio;
          yPadding = (contH - activeHeight) / 2;
        } else if (videoRatio < containerRatio) {
          // Letterbox on left/right
          activeWidth = contH * videoRatio;
          xPadding = (contW - activeWidth) / 2;
        }

        const clientX = (cX / 100) * contW;
        const clientY = (cY / 100) * contH;
        const clientW = (cW / 100) * contW;
        const clientH = (cH / 100) * contH;

        const localX = clientX - xPadding;
        const localY = clientY - yPadding;

        let newXPercent = (localX / activeWidth) * 100;
        let newYPercent = (localY / activeHeight) * 100;
        let newWPercent = (clientW / activeWidth) * 100;
        let newHPercent = (clientH / activeHeight) * 100;

        newXPercent = Math.max(0, Math.min(100, newXPercent));
        newYPercent = Math.max(0, Math.min(100, newYPercent));
        newWPercent = Math.max(0, Math.min(100 - newXPercent, newWPercent));
        newHPercent = Math.max(0, Math.min(100 - newYPercent, newHPercent));

        return {
          x: newXPercent,
          y: newYPercent,
          w: newWPercent,
          h: newHPercent
        };
      };
      
      addLog(`SYSTEM: Tiến hành trích xuất ${timestamps.length} khung hình từ video để AI nhận diện chữ (không dùng FFMPEG)...`);
      if (isCropEnabled) {
        addLog(`SYSTEM: Chế độ Dịch Vùng được bật. Tọa độ cắt giao diện: X=${cropXPercent}%, Y=${cropYPercent}%, W=${cropWidthPercent}%, H=${cropHeightPercent}%`);
      }
      
      const frames = [];
      
      const hiddenVideo = document.createElement('video');
      hiddenVideo.src = videoUrl;
      hiddenVideo.muted = true;
      hiddenVideo.crossOrigin = "anonymous";
      hiddenVideo.setAttribute('playsinline', '');
      
      await new Promise((resolve) => {
        hiddenVideo.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas 2D context null");

      // Use max dimension of 640 for extremely fast and robust OCR processing
      const MAX_DIM = 640;

      for (let i = 0; i < timestamps.length; i++) {
        const t = timestamps[i];
        
        const currentProgress = Math.round(10 + (i / timestamps.length) * 40);
        setProgress(currentProgress);
        
        if (i % 3 === 0 || i === timestamps.length - 1) {
          addLog(`SYSTEM: Đang tải và trích xuất khung hình (${i + 1}/${timestamps.length}) - mốc ${formatSrtTime(t)}...`);
        }
        
        await new Promise((resolve, reject) => {
          hiddenVideo.onseeked = resolve;
          hiddenVideo.onerror = reject;
          hiddenVideo.currentTime = t;
        });

        const vw = hiddenVideo.videoWidth;
        const vh = hiddenVideo.videoHeight;

        let srcX = 0, srcY = 0, srcW = vw, srcH = vh;
        if (isCropEnabled) {
          const mapped = mapCropToVideo(
            cropXPercent,
            cropYPercent,
            cropWidthPercent,
            cropHeightPercent,
            containerWidth,
            containerHeight,
            vw,
            vh,
            videoFitMode
          );
          srcX = (mapped.x / 100) * vw;
          srcY = (mapped.y / 100) * vh;
          srcW = (mapped.w / 100) * vw;
          srcH = (mapped.h / 100) * vh;
        }

        let isPortrait = srcH > srcW;
        let cW = srcW;
        let cH = srcH;
        
        if (isPortrait) {
           cH = MAX_DIM;
           cW = (srcW / srcH) * MAX_DIM;
        } else {
           cW = MAX_DIM;
           cH = (srcH / srcW) * MAX_DIM;
        }

        canvas.width = Math.round(cW);
        canvas.height = Math.round(cH);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(hiddenVideo, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
        
        // Use 0.80 quality for a perfect balance of crisp legibility and small weight
        const base64 = canvas.toDataURL('image/jpeg', 0.80).split(',')[1];
        
        const srtStart = formatSrtTime(t);
        const srtEnd = formatSrtTime(Math.min(duration, t + stepSeconds));
        const timestampRange = `${srtStart} --> ${srtEnd}`;

        frames.push({
          base64,
          timestamp: timestampRange,
          mimeType: 'image/jpeg'
        });
      }

      hiddenVideo.src = "";
      
      if (frames.length === 0) {
        throw new Error("Không thể trích xuất khung hình nào từ video.");
      }
      
      setProgress(60);
      addLog('SYSTEM: Gửi dữ liệu hình ảnh lên AI để tự động dịch thuật (Tiếng Trung/Hàn -> Việt)...');

      // Craft custom instructions depending on whether crop view is active
      let targetSystemPrompt = "Bạn là một hệ thống OCR và AI dịch thuật cao cấp chuyên nghiệp cho phim ảnh/video. Bạn nhận được chuỗi các hình ảnh được cắt hoặc trích xuất từ video tương ứng với các mốc thời gian khác nhau.\n\nNhiệm vụ của bạn:\n1. Phân tích từng khung hình.\n2. Nhận diện CHÍNH XÁC nội dung chữ tiếng Trung Quốc hoặc tiếng Hàn Quốc (chữ gốc/hardsub) xuất hiện trên ảnh.\n3. Dịch nghĩa ngữ cảnh của chữ đó sang tiếng Việt một cách tự nhiên, chuẩn điện ảnh/phóng tác chuẩn xác nhất, không bổ sung văn bản không tồn tại.\n4. Ghép nối với mốc thời gian 'timestamp' được ghi rõ trong yêu cầu của từng ảnh (ví dụ: '[Khung hình gốc tại mốc thời gian: 00:00:00,000 --> 00:00:05,000]'). Bạn phải giữ đúng 'timestamp' này để khớp phụ đề.\n\nYÊU CẦU ĐỊNH DẠNG ĐẦU RA:\nTrả về đối tượng JSON khớp chính xác theo schema đã chỉ định.";

      if (isCropEnabled) {
        targetSystemPrompt = "Bạn là một hệ thống OCR và AI dịch thuật cao cấp và vô cùng nghiêm ngặt cho phụ đề phim/video. Người dùng đã lựa chọn vùng chọn CẮT (CROP) trên khung hình tập trung 100% vào phần chứa phụ đề/chữ cần dịch chính xác.\n\nNhiệm vụ tối quan trọng:\n1. Nhận diện CHÍNH XÁC 100% tất cả chữ viết tiếng Trung Quốc hoặc tiếng Hàn Quốc có trong ảnh này. Nhận diện kỹ từng từ dù ngắn hay dài.\n2. Tuyệt đối CHỈ dịch và nhận diện chữ NGAY TRONG BỨC ẢNH CẮT này. KHÔNG ĐƯỢC PHÉP tự suy đoán, bịa đặt, tưởng tượng hay bổ sung bất cứ thông tin nào ở ngoài vùng ảnh cắt này. Tập trung 100% vào nội dung ảnh được truyền lên.\n3. Dịch nghĩa ngữ cảnh của chữ đó sang tiếng Việt một cách tự nhiên, cực kỳ mượt mà, chuẩn điện ảnh/bản ngữ.\n4. Ghép nối với mốc thời gian 'timestamp' được ghi rõ trong yêu cầu của từng ảnh (ví dụ: '[Khung hình gốc tại mốc thời gian: 00:00:00,000 --> 00:00:05,000]'). Bạn phải giữ đúng 'timestamp' này để khớp phụ đề.\n\nYÊU CẦU ĐỊNH DẠNG ĐẦU RA:\nTrả về đối tượng JSON khớp chính xác theo schema đã chỉ định.";
      }

      const userKey = window.localStorage.getItem('user_gemini_api_key') || '';
      const response = await fetch('/api/gemini/video-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-API-Key': userKey
        },
        body: JSON.stringify({
          prompt: targetSystemPrompt,
          frames: frames,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                translations: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      timestamp: { type: "STRING" },
                      original: { type: "STRING" },
                      translatedVi: { type: "STRING" }
                    },
                    required: ["timestamp", "original", "translatedVi"]
                  }
                }
              },
              required: ["translations"]
            }
          }
        }),
      });

      if (!response.ok) {
        let errMsg = 'Lỗi gọi API biên dịch video';
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (_) {}
        } else {
          try {
            const rawText = await response.text();
            errMsg = `${errMsg} (Mã lỗi: ${response.status}): ${rawText.slice(0, 150)}`;
          } catch (__) {
            errMsg = `${errMsg} (Mã lỗi: ${response.status})`;
          }
        }
        throw new Error(errMsg);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const rawText = await response.text();
        throw new Error(`Đầu ra API server không hợp lệ. Phản hồi không phải JSON. Vui lòng kiểm tra cấu hình Secrets GEMINI_API_KEY ở Settings panel. Chi tiết: ${rawText.slice(0, 120)}`);
      }

      const data = await response.json();
      
      let resParsed = { translations: [] };
      try {
         const cleanJSON = (data.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
         resParsed = JSON.parse(cleanJSON);
      } catch (e) {
         addLog('SYSTEM: Cảnh báo - không thể truy xuất JSON dịch thuật, thử trích xuất bằng biểu thức chính quy...');
         try {
           const match = (data.text || '').match(/\{[\s\S]*\}/);
           if (match) {
             resParsed = JSON.parse(match[0]);
           }
         } catch (innerErr) {
           console.error("Regex parse failed:", innerErr);
         }
      }
      
      const enrichedTranslations = (resParsed.translations || []).map((tr: any) => {
        const matchingFrame = frames.find(f => f.timestamp === tr.timestamp || tr.timestamp?.includes(f.timestamp) || f.timestamp?.includes(tr.timestamp));
        return {
          ...tr,
          frameImage: matchingFrame ? `data:image/jpeg;base64,${matchingFrame.base64}` : null
        };
      });

      if (enrichedTranslations.length > 0) {
         setTranslateVideoResult(enrichedTranslations);
         addLog(`SYSTEM: Thành công tìm thấy và dịch ${enrichedTranslations.length} đoạn nội dung.`);
      } else {
         addLog(`SYSTEM: Không phát hiện được văn bản nào trên màn hình video.`);
         setTranslateVideoResult([{ timestamp: '', original: '', translatedVi: 'AI không tìm thấy chữ Tiếng Trung/Hàn hiển thị trên màn hình video.', frameImage: null }]);
      }
      
      setProgress(100);
      
    } catch (err: any) {
      console.error(err);
      setError('Lỗi khi dịch chữ trên video: ' + (err.message || 'Kiểm tra dung lượng và cấu hình API.'));
      addLog('ERROR: Quá trình dịch chữ thất bại: ' + (err.message || 'Kiểm tra dung lượng và cấu hình API.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!videoFile || !loaded) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    setOutputVideos([]);
    addLog('SYSTEM: Initializing split operation...');

    const ffmpeg = ffmpegRef.current;
    const timestamp = Date.now();
    const inputName = `input_split_${timestamp}.mp4`;

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      
      let execArgs: string[] = [];
      if (splitAspectRatio === 'original') {
        addLog(`EXEC: ffmpeg -i ${inputName} -c copy -map 0 -segment_time ${chunkDuration} -f segment -reset_timestamps 1 output_%03d.mp4`);
        execArgs = [
          '-threads', '1', '-i', inputName,
          '-c', 'copy',
          '-map', '0',
          '-segment_time', String(chunkDuration),
          '-f', 'segment',
          '-reset_timestamps', '1',
          'output_%03d.mp4'
        ];
      } else {
        const padFilter = splitAspectRatio === '16:9' 
          ? "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black"
          : "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black";
          
        addLog(`EXEC: ffmpeg -i ${inputName} -vf "${padFilter}" -c:v libx264 -preset ultrafast -c:a copy -map 0 -segment_time ${chunkDuration} -f segment -reset_timestamps 1 output_%03d.mp4`);
        execArgs = [
          '-threads', '1', '-i', inputName,
          '-vf', padFilter,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-threads', '1',
          '-c:a', 'copy',
          '-map', '0',
          '-segment_time', String(chunkDuration),
          '-f', 'segment',
          '-reset_timestamps', '1',
          'output_%03d.mp4'
        ];
      }
      
      await ffmpeg.exec(execArgs);

      const files = await ffmpeg.listDir('/');
      const generatedFiles = files.filter(f => f.name.startsWith('output_') && f.name.endsWith('.mp4'));
      
      const newOutputs = [];
      for (const file of generatedFiles) {
        const data = await safeReadFile(ffmpeg, file.name);
        if (data) {
          const url = URL.createObjectURL(new Blob([data as Uint8Array], { type: 'video/mp4' }));
          newOutputs.push({ name: `part_${file.name.split('_')[1]}`, url });
        }
        await safeDeleteFile(ffmpeg, file.name);
      }
      
      setOutputVideos(newOutputs);
      addLog(`SYSTEM: Split operation completed. Generated ${newOutputs.length} parts.`);
      
      await safeDeleteFile(ffmpeg, inputName);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Memory limit reached. Resetting engine...');
        await ffmpeg.terminate();
        await load(true);
        setError('Video too large for browser memory. Try a shorter clip.');
      } else {
        setError('An error occurred while splitting the video.');
        addLog('ERROR: Split operation failed.');
      }
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleSpeed = async () => {
    if (!videoFile || !loaded) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    setOutputVideos([]);
    addLog(`SYSTEM: Initializing speed adjustment (${videoSpeed}x)...`);

    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      
      // Calculate PTS factor (1/speed)
      const ptsFactor = 1 / videoSpeed;
      
      // Handle audio speed (atempo limit is 0.5 to 2.0)
      // For speeds outside this range, we chain atempo filters
      let audioFilter = '';
      let tempSpeed = videoSpeed;
      while (tempSpeed > 2.0) {
        audioFilter += 'atempo=2.0,';
        tempSpeed /= 2.0;
      }
      while (tempSpeed < 0.5) {
        audioFilter += 'atempo=0.5,';
        tempSpeed /= 0.5;
      }
      audioFilter += `atempo=${tempSpeed.toFixed(2)}`;

      addLog(`EXEC: ffmpeg -i ${inputName} -filter:v "scale='min(1280,iw)':-2,setpts=${ptsFactor.toFixed(4)}*PTS" -filter:a "${audioFilter}" -c:v libx264 -preset ultrafast -c:a aac ${outputName}`);
      
      await ffmpeg.exec([
        '-threads', '1', '-i', inputName,
        '-filter:v', `scale='min(1280,iw)':-2,setpts=${ptsFactor.toFixed(4)}*PTS`,
        '-filter:a', audioFilter,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-threads', '1',
        '-c:a', 'aac',
        outputName
      ]);

      const data = await safeReadFile(ffmpeg, outputName);
      if (!data) throw new Error('Speed adjustment failed: Output file not found');
      
      const url = URL.createObjectURL(new Blob([data as Uint8Array], { type: 'video/mp4' }));
      setOutputVideos([{ name: `speed_${videoSpeed}x_${videoFile.name}`, url }]);
      addLog('SYSTEM: Speed adjustment completed successfully.');
      
      await safeDeleteFile(ffmpeg, inputName);
      await safeDeleteFile(ffmpeg, outputName);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Memory limit reached. Resetting engine...');
        await ffmpeg.terminate();
        await load(true);
        setError('Video too large for browser memory. Try a shorter clip.');
      } else {
        setError('An error occurred while adjusting video speed.');
        addLog('ERROR: Speed adjustment failed.');
      }
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };


  const handleVideoAnalysis = async () => {
    if ((!videoFile && batchFiles.length === 0) || !loaded) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setAnalysisResult(null);
    setBatchAnalysisResults([]);
    
    addLog('SYSTEM: Đang chuẩn bị phân tích video chuyên sâu...');

    const filesToProcess = batchFiles.length > 0 ? batchFiles : [videoFile!];
    const results: any[] = [];

    try {
      await runWithConcurrency<File, void>(filesToProcess, 1, async (file: File, fIdx: number, workerId: number) => {
        addLog(`WORKER #${workerId}: Đang xử lý phân tích video ${fIdx + 1}/${filesToProcess.length}: ${file.name}`);

        // Maintain size limit checks
        const MAX_ANALYSIS_SIZE = 250 * 1024 * 1024;
        if (file.size > MAX_ANALYSIS_SIZE) {
          addLog(`WARNING: ${file.name} vượt quá dung lượng cho phép (250MB). Bỏ qua.`);
          return;
        }

        let ffmpegInstance;
        let createdInstance = false;
        if (filesToProcess.length === 1) {
          if (!loaded) {
            addLog("SYSTEM: Đang tải động cơ FFmpeg...");
            await load();
          }
          ffmpegInstance = ffmpegRef.current;
        } else {
          ffmpegInstance = await getSubFFmpeg(workerId);
          createdInstance = true;
        }

        const inputName = `input_${workerId}_${fIdx}.mp4`;
        const audioName = `audio_analysis_${workerId}_${fIdx}.mp3`;

        try {
          const videoData = await fetchFile(file);
          await ffmpegInstance.writeFile(inputName, videoData);
          
          const frames = [];
          
          let duration = 30;
          if (file === videoFile && videoRef.current) {
            duration = videoRef.current.duration || 30;
          }
          
          const targets = [duration * 0.1, duration * 0.5, duration * 0.9];
          let currentThumbnailUrl = '';
          
          for (let i = 0; i < targets.length; i++) {
            const timeStr = formatTimeHHMMSS(targets[i]);
            const frameName = `v_frame_${workerId}_${fIdx}_${i}.jpg`;
            await ffmpegInstance.exec(['-threads', '1', '-ss', timeStr, '-i', inputName, '-vf', "scale='min(640,iw)':-2", '-vframes', '1', '-q:v', '10', frameName]);
            
            const frameData = await safeReadFile(ffmpegInstance, frameName) as Uint8Array;
            if (frameData) {
              const blob = new Blob([frameData], { type: 'image/jpeg' });
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
              });
              frames.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
              
              if (i === 1) {
                currentThumbnailUrl = URL.createObjectURL(blob);
              }
              
              await safeDeleteFile(ffmpegInstance, frameName);
            }
          }

          // Extract audio (limit of 30s for quick analysis)
          await ffmpegInstance.exec(['-threads', '1', '-ss', '00:00:00', '-i', inputName, '-t', '00:00:30', '-vn', '-acodec', 'libmp3lame', '-b:a', '24k', '-ar', '16000', audioName]);
          await safeDeleteFile(ffmpegInstance, inputName);

          const audioData = await safeReadFile(ffmpegInstance, audioName) as Uint8Array;
          let audioPart: any = null;
          if (audioData) {
            const audioBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(new Blob([audioData], { type: 'audio/mp3' }));
            });
            audioPart = { inlineData: { data: audioBase64, mimeType: 'audio/mp3' } };
            await safeDeleteFile(ffmpegInstance, audioName);
          }

          const ai = new GoogleGenAI();
          const prompt = `Hãy đóng vai một chuyên gia phân tích nội dung video và cố vấn viral marketing. 
          Phân tích video dựa trên các khung hình và âm thanh được cung cấp.
          Hãy thực hiện các yêu cầu sau bằng tiếng Việt:
          1. Tóm tắt nội dung video nói về cái gì một cách ngắn gọn nhưng đầy đủ (khoảng 3-5 câu).
          2. Định hướng chủ đề chính của video: Xác định video này thuộc thể loại gì, đối tượng người xem là ai.
          3. Đề xuất 5 tiêu đề "giật gân", thu hút người xem (viral titles) mang tính chính xác cao và dễ lên xu hướng.
          4. Đưa ra lời khuyên chuyên sâu để video này có thể viral hoặc cải thiện chất lượng nội dung để giữ chân người xem.
          
          Trả về kết quả dưới dạng JSON với các khóa:
          - 'summary': chuỗi tóm tắt
          - 'orientation': chuỗi định hướng chủ đề
          - 'titles': mảng gồm 5 tiêu đề
          - 'advice': chuỗi lời khuyên`;

          const contents: any = { parts: [{ text: prompt }, ...frames] };
          if (audioPart) contents.parts.push(audioPart);

          const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: "gemini-flash-latest",
            contents,
            config: { responseMimeType: "application/json" }
          }));

          const result = safeJsonParse(response.text || '{}') || {};
          const finalResult = { ...result, fileName: file.name, thumbnailUrl: currentThumbnailUrl };
          results.push(finalResult);
          
          if (filesToProcess.length === 1) {
            setAnalysisResult(finalResult);
          } else {
            setBatchAnalysisResults(prev => [...prev, finalResult]);
          }

          addLog(`WORKER #${workerId}: Đã phân tích thành công video ${file.name}`);
        } finally {
          try {
            await safeDeleteFile(ffmpegInstance, inputName);
            await safeDeleteFile(ffmpegInstance, audioName);
          } catch(e) {}
          if (createdInstance) {
            try {
              await ffmpegInstance.terminate();
            } catch (e) {}
          }
        }

        setProgress(prev => {
          const finished = Math.min(100, prev + Math.ceil(100 / filesToProcess.length));
          return finished > 100 ? 100 : finished;
        });
      });

      addLog('SYSTEM: Đã hoàn tất phân tích toàn bộ video song song thành công.');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Quá tải bộ nhớ hệ thống. Đang tái khởi động công cụ...');
        await ffmpegRef.current.terminate();
        await load(true);
        setError('Video quá nặng hoặc hết bộ nhớ đệm trình duyệt.');
      } else {
        setError('Lỗi phân tích video: ' + (err.message || err.toString()));
        addLog(`ERROR: ${err.message || err.toString()}`);
      }
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleGenerateMetadata = async () => {
    if ((!videoFile && !imageFile) || !loaded) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    outputVideos.forEach(v => URL.revokeObjectURL(v.url));
    setOutputVideos([]);
    
    // Revoke old thumbnails
    generatedThumbnails.forEach(url => {
      if (url !== imageUrl) URL.revokeObjectURL(url);
    });
    setGeneratedThumbnails(imageUrl ? [imageUrl] : []);
    
    setGeneratedTitles([]);
    setGeneratedDescription('');
    addLog('SYSTEM: Initializing Thumbnail & Metadata generation...');

    const ffmpeg = ffmpegRef.current;
    const timestamp = Date.now();
    const inputName = `input_${timestamp}.mp4`;
    const thumbName = `thumb_${timestamp}.jpg`;
    const audioName = `audio_${timestamp}.mp3`;

    try {
      let imageBase64 = '';
      let audioBase64 = '';
      const ffmpeg = ffmpegRef.current;

      // 1. Prepare Image
      if (imageFile) {
        addLog('SYSTEM: Using uploaded image for metadata analysis...');
        imageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(imageFile);
        });
        setGeneratedThumbnails([imageUrl]);
      } else if (imageUrl && imageUrl.startsWith('data:image')) {
        addLog('SYSTEM: Using captured frame for metadata analysis...');
        imageBase64 = imageUrl.split(',')[1];
        setGeneratedThumbnails([imageUrl]);
      } else if (videoFile) {
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
        const timestamp = videoRef.current ? formatTimeHHMMSS(videoRef.current.currentTime) : '00:00:05';
        addLog(`SYSTEM: Extracting thumbnail frame from video at ${timestamp}...`);
        await ffmpeg.exec(['-threads', '1', '-ss', timestamp, '-i', inputName, '-vf', "scale='min(800,iw)':-2", '-vframes', '1', '-q:v', '2', thumbName]);
        const thumbData = await safeReadFile(ffmpeg, thumbName) as Uint8Array;
        if (thumbData) {
          const thumbUrl = URL.createObjectURL(new Blob([thumbData], { type: 'image/jpeg' }));
          setGeneratedThumbnails([thumbUrl]);
          imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(new Blob([thumbData], { type: 'image/jpeg' }));
          });
        }
      }

      // 2. Prepare Audio Context (if video exists)
      if (videoFile) {
        const files = await ffmpeg.listDir('/');
        const exists = files.some((f: any) => f.name === inputName);
        if (!exists) await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        const audioStart = videoRef.current ? Math.max(0, videoRef.current.currentTime - 15) : 0;
        const audioStartStr = formatTimeHHMMSS(audioStart);
        addLog(`SYSTEM: Extracting audio for AI context starting at ${audioStartStr}...`);
        await ffmpeg.exec(['-threads', '1', '-i', inputName, '-ss', audioStartStr, '-t', '00:00:30', '-vn', '-acodec', 'libmp3lame', '-b:a', '64k', audioName]);
        const audioData = await safeReadFile(ffmpeg, audioName) as Uint8Array;
        if (audioData) {
          audioBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(new Blob([audioData], { type: 'audio/mp3' }));
          });
        }
      }

      // 3. AI Analysis
      if (imageBase64) {
        addLog(audioBase64 ? 'AI: Analyzing content (image + audio)...' : 'AI: Analyzing image content...');
        const ai = new GoogleGenAI();
        
        const contents = [
          {
            parts: [
              { text: `Based on this thumbnail image ${audioBase64 ? 'and the audio from the video' : ''}, generate ${numThumbnails} catchy YouTube titles and a long, detailed description (at least 3-4 paragraphs) in Vietnamese. 
              
              For each of the ${numThumbnails} titles, also suggest a professional text layer configuration for the thumbnail editor.
              
              Return the result in JSON format with:
              - 'titles': array of strings
              - 'description': string
              - 'variations': array of objects, each containing:
                - 'title': the title string
                - 'layers': array of TextLayer objects:
                  - 'text': the title (can be split into multiple layers if needed)
                  - 'font': one of ['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Be Vietnam Pro', 'Playfair Display', 'JetBrains Mono']
                  - 'color': hex color string
                  - 'bgColor': hex color string (optional, for 'background' style)
                  - 'size': number (40-100)
                  - 'style': one of ['default', 'outline', 'shadow', 'gradient', 'glow', 'background']
                  - 'x': number (0-100)
                  - 'y': number (0-100)
              
              The description should be engaging, include relevant emojis/icons, and have 5-10 trending hashtags at the end. ${userPrompt ? `Additional instructions: ${userPrompt}` : ''}` },
              { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
            ]
          }
        ];

        if (audioBase64) {
          contents[0].parts.push({ inlineData: { data: audioBase64, mimeType: "audio/mp3" } });
        }

        const textResponse = await callGeminiWithRetry(() => ai.models.generateContent({
          model: "gemini-flash-latest",
          contents,
          config: { responseMimeType: "application/json" }
        }));

        const result = safeJsonParse(textResponse.text || '{}') || {};
        setGeneratedTitles(result.titles || []);
        setGeneratedDescription(result.description || '');
        
        const suggested = (result.variations || []).map((v: any) => 
          (v.layers || []).map((l: any, idx: number) => ({
            ...l,
            id: `ai-${Date.now()}-${idx}`
          }))
        );
        setAiSuggestedLayers(suggested);

        // 4. Generate AI variations
        addLog(`AI: Generating ${numThumbnails} professional thumbnail variations...`);
        const imagePromises = Array.from({ length: Math.min(numThumbnails, 5) }).map((_, i) => 
          callGeminiWithRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
                { text: `Create a professional, high-click-through-rate YouTube thumbnail based on this image. Variation ${i + 1}. DO NOT include any YouTube logos or icons in the image. Keep the main subject and key elements. IMPORTANT: If the thumbnail contains text in Vietnamese, use Vietnamese WITHOUT diacritics (tiếng Việt không dấu) to avoid rendering errors. ${userPrompt ? `Follow these instructions: ${removeVietnameseTones(userPrompt)}` : 'Make it look vibrant and engaging with different styles.'}` }
              ]
            }
          }))
        );

        const imageResponses = await Promise.all(imagePromises);
        const newThumbnails: string[] = [];
        for (const response of imageResponses) {
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              newThumbnails.push(`data:image/png;base64,${part.inlineData.data}`);
              break;
            }
          }
        }
        setGeneratedThumbnails(prev => [...prev.filter(url => url === imageUrl), ...newThumbnails]);
      }
      
      // Cleanup
      await safeDeleteFile(ffmpeg, inputName);
      await safeDeleteFile(ffmpeg, thumbName);
      await safeDeleteFile(ffmpeg, audioName);
      addLog('SYSTEM: Metadata generation completed successfully.');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('memory access out of bounds')) {
        addLog('CRITICAL: Memory limit reached. Resetting engine...');
        await ffmpegRef.current.terminate();
        await load(true);
        setError('Video too large for browser memory. Try a shorter clip.');
      } else {
        setError(t.metadataError);
        addLog(`ERROR: Metadata generation failed: ${err.message}`);
      }
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleGenerateChibi = async () => {
    if (!imageFile && batchFiles.length === 0) {
      setError('Vui lòng upload ảnh để tạo nhân vật Chibi.');
      return;
    }
    
    if (batchFiles.length > 0) {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setOutputVideos([]);
      addLog(`AI: Đang tạo hàng loạt ${batchFiles.length} nhân vật Chibi...`);
      
      try {
        const ai = new GoogleGenAI();
        const chibiPromptText = 'A beautifully isolated highly detailed full-body 2D anime chibi character avatar based EXACTLY on the subject, clothing, and props in this image. Accurately recreate their outfit and color palette in a cute, vibrant anime chibi style. The background MUST be a pure, flat, solid white (#FFFFFF) with absolutely NO shadows or scenery behind the character. High contrast, masterpiece.';
        const generatedOutputs = [];

        for (let i = 0; i < batchFiles.length; i++) {
          const file = batchFiles[i];
          addLog(`AI: Đang tạo Chibi cho ${file.name}...`);
          try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            const response = await callGeminiWithRetry(() => ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [
                  { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
                  { text: chibiPromptText }
                ]
              },
              config: { imageConfig: { aspectRatio: "1:1" } }
            }));

            for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                const transImage = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'chibi');
                const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                generatedOutputs.push({ name: `chibi_${nameNoExt}.png`, url: transImage });
                break;
              }
            }
          } catch(e:any) {
             addLog(`ERROR: Lỗi với ${file.name}: ${e.message}`);
          }
          setProgress(((i + 1) / batchFiles.length) * 100);
        }
        
        setOutputVideos(generatedOutputs);
        addLog('SYSTEM: Đã xử lý xong hàng loạt Chibi!');
      } catch(e:any) {
        setError(e.message || "Đã xảy ra lỗi");
      } finally {
        setIsProcessing(false);
        setProgress(100);
      }
      return;
    }

    setIsProcessing(true);
    addLog('AI: Đang tạo nhân vật Chibi...');
    try {
      const arrayBuffer = await imageFile!.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const chibiPromptText = 'A beautifully isolated highly detailed full-body 2D anime chibi character avatar based EXACTLY on the subject, clothing, and props in this image. Accurately recreate their outfit and color palette in a cute, vibrant anime chibi style. The background MUST be a pure, flat, solid white (#FFFFFF) with absolutely NO shadows or scenery behind the character. High contrast, masterpiece.';

      const ai = new GoogleGenAI();
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: imageFile!.type || 'image/jpeg' } },
            { text: chibiPromptText }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      }));

      let found = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const transImage = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'chibi');
          setChibiImage(transImage);
          found = true;
          break;
        }
      }

      if (found) {
        addLog('SYSTEM: Đã tạo Chibi thành công.');
      } else {
        throw new Error("Không nhận được ảnh từ AI.");
      }
    } catch (err: any) {
      console.error(err);
      setError('Lỗi khi tạo Chibi: ' + err.message);
      addLog(`ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const ratioPromptFrame = chibiFrameRatio === '9:16'
    ? 'vertical 9:16'
    : 'horizontal 16:9';

  const framePromptText = `Create a masterpiece, top-tier quality ${ratioPromptFrame} decorative border frame. 
CRITICAL REQUIREMENT: The center area MUST be a completely pure, flat, solid white (#FFFFFF) rectangle to serve as a video placeholder (absolutely NO patterns, NO shadows, NO items in the center). 
The frame's outer borders and corners MUST be intricately designed using elements, props, textures, symbols, and colors directly extracted from the character, clothing, and environment in the provided image. 
Ensure the frame feels deeply connected to the uploaded subject (e.g., mirroring their exact costume patterns, aesthetic, magic elements, or scenery). High-definition, vibrant, stunningly cohesive artistic frame perfectly matching the character universe.`;

  const handleGenerateFrame = async () => {
    if (!imageFile && batchFiles.length === 0) {
      setError('Vui lòng upload ảnh để tạo khung viền nền.');
      return;
    }
    
    if (batchFiles.length > 0) {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setOutputVideos([]);
      addLog(`AI: Đang tạo hàng loạt ${batchFiles.length} Khung viền...`);
      
      try {
        const ai = new GoogleGenAI();
        const generatedOutputs = [];

        for (let i = 0; i < batchFiles.length; i++) {
          const file = batchFiles[i];
          addLog(`AI: Đang tạo Khung viền cho ${file.name}...`);
          try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            const response = await callGeminiWithRetry(() => ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [
                  { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
                  { text: framePromptText }
                ]
              },
              config: { imageConfig: { aspectRatio: chibiFrameRatio } }
            }));

            for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                const transFrame = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'frame');
                const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                generatedOutputs.push({ name: `frame_${nameNoExt}.png`, url: transFrame });
                break;
              }
            }
          } catch(e:any) {
             addLog(`ERROR: Lỗi với ${file.name}: ${e.message}`);
          }
          setProgress(((i + 1) / batchFiles.length) * 100);
        }
        
        setOutputVideos(generatedOutputs);
        addLog('SYSTEM: Đã xử lý xong hàng loạt Khung viền!');
      } catch(e:any) {
        setError(e.message || "Đã xảy ra lỗi");
      } finally {
        setIsProcessing(false);
        setProgress(100);
      }
      return;
    }

    setIsProcessing(true);
    addLog('AI: Đang tạo khung viền trang trí...');
    try {
      const arrayBuffer = await imageFile!.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const ai = new GoogleGenAI();
      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: imageFile!.type || 'image/jpeg' } },
            { text: framePromptText }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: chibiFrameRatio
          }
        }
      }));

      let found = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const transFrame = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'frame');
          setBgFrameImage(transFrame);
          found = true;
          break;
        }
      }

      if (found) {
        addLog('SYSTEM: Đã tạo khung viền background thành công.');
      } else {
        throw new Error("Không nhận được ảnh từ AI.");
      }
    } catch (err: any) {
      console.error(err);
      setError('Lỗi khi tạo Background: ' + err.message);
      addLog(`ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchChibiFrame = async () => {
    if (batchFiles.length === 0) {
      setError('Vui lòng chọn thư mục chứa ảnh.');
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setOutputVideos([]);
    addLog(`AI: Đang xử lý hàng loạt ${batchFiles.length} hình ảnh Khung & Chibi...`);
    
    try {
      const ai = new GoogleGenAI();
      const chibiPromptText = 'A beautifully isolated highly detailed full-body 2D anime chibi character avatar based EXACTLY on the subject, clothing, and props in this image. Accurately recreate their outfit and color palette in a cute, vibrant anime chibi style. The background MUST be a pure, flat, solid white (#FFFFFF) with absolutely NO shadows or scenery behind the character. High contrast, masterpiece.';

      const generatedOutputs = [];

      for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i];
        addLog(`AI: Đang tạo Khung & Chibi cho ${file.name}...`);
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          const chibiPromise = callGeminiWithRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
                { text: chibiPromptText }
              ]
            },
            config: {
              imageConfig: { aspectRatio: "1:1" }
            }
          }));

          const framePromise = callGeminiWithRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
                { text: framePromptText }
              ]
            },
            config: {
              imageConfig: { aspectRatio: chibiFrameRatio }
            }
          }));

          const [chibiRes, frameRes] = await Promise.all([chibiPromise, framePromise]);

          for (const part of chibiRes.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const transImage = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'chibi');
              const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              generatedOutputs.push({ name: `chibi_${nameNoExt}.png`, url: transImage });
              break;
            }
          }

          for (const part of frameRes.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const transFrame = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'frame');
              const nameNoExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              generatedOutputs.push({ name: `frame_${nameNoExt}.png`, url: transFrame });
              break;
            }
          }
          
        } catch (e: any) {
           addLog(`ERROR: Lỗi với ${file.name}: ${e.message}`);
        }
        
        setProgress(((i + 1) / batchFiles.length) * 100);
      }
      
      setOutputVideos(generatedOutputs);
      if (generatedOutputs.length > 0) {
        addLog('SYSTEM: Đã xử lý xong hàng loạt Khung & Chibi!');
      } else {
        throw new Error('Không thể tạo ảnh nào.');
      }
    } catch(e: any) {
      console.error(e);
      setError(e.message || "Đã xảy ra lỗi");
      addLog(`ERROR: ${e.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleGenerateCombo = async () => {
    if (!imageFile) {
      setError('Vui lòng upload hình ảnh để tạo full combo.');
      return;
    }
    setIsProcessing(true);
    addLog('AI: Đang tạo đồng thời Khung Viền & Chibi...');
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const ai = new GoogleGenAI();
      
      const chibiPromptText = 'A beautifully isolated highly detailed full-body 2D anime chibi character avatar based EXACTLY on the subject, clothing, and props in this image. Accurately recreate their outfit and color palette in a cute, vibrant anime chibi style. The background MUST be a pure, flat, solid white (#FFFFFF) with absolutely NO shadows or scenery behind the character. High contrast, masterpiece.';

      const chibiPromise = callGeminiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: imageFile.type || 'image/jpeg' } },
            { text: chibiPromptText }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      }));

      const framePromise = callGeminiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: imageFile.type || 'image/jpeg' } },
            { text: framePromptText }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: chibiFrameRatio
          }
        }
      }));

      const [chibiRes, frameRes] = await Promise.all([chibiPromise, framePromise]);

      let chibiFound = false;
      let frameFound = false;

      // Extract parts inside the loops to await properly
      const processImages = async () => {
        for (const part of chibiRes.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const transImage = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'chibi');
            setChibiImage(transImage);
            chibiFound = true;
            break;
          }
        }

        for (const part of frameRes.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const transFrame = await makeTransparent(`data:image/jpeg;base64,${part.inlineData.data}`, 'frame');
            setBgFrameImage(transFrame);
            frameFound = true;
            break;
          }
        }
      };

      await processImages();

      if (chibiFound && frameFound) {
        addLog('SYSTEM: Đã tạo trọn bộ Chibi và Khung Viền thành công.');
      } else {
        throw new Error("Không nhận được đủ ảnh từ AI.");
      }
    } catch (err: any) {
      console.error(err);
      setError('Lỗi khi tạo combo: ' + err.message);
      addLog(`ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAudioSeparator = async () => {
    const filesToProcess = batchFiles.length > 0 ? batchFiles : (videoFile ? [videoFile] : []);
    if (filesToProcess.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    addLog(`SYSTEM: Đang xử lý tách âm thanh (${audioSepMode === 'voice' ? 'Tách giọng nói' : 'Tách nhạc nền'}) cho ${filesToProcess.length} tệp...`);

    try {
      await runWithConcurrency<File, void>(filesToProcess, 1, async (currentFile: File, index: number, workerId: number) => {
        const isAudioOnly = currentFile.type.startsWith('audio/');
        addLog(`WORKER #${workerId}: Đang xử lý tệp ${index + 1}/${filesToProcess.length}: ${currentFile.name}`);

        let ffmpegInstance;
        let createdInstance = false;
        if (filesToProcess.length === 1) {
          if (!loaded) {
            addLog("SYSTEM: Đang tải động cơ FFmpeg...");
            await load();
          }
          ffmpegInstance = ffmpegRef.current;
        } else {
          ffmpegInstance = await getSubFFmpeg(workerId);
          createdInstance = true;
        }

        const extension = currentFile.name.split('.').pop() || 'mp4';
        const baseName = currentFile.name.replace(`.${extension}`, '');
        
        // Use safe filenames for FFmpeg virtual file system
        const safeInputName = `input_${workerId}_${index}.${extension}`;
        const safeAudioOutputName = `audio_out_${workerId}_${index}.mp3`;
        const safeVideoOutputName = `video_out_${workerId}_${index}.mp4`;
        
        // Display names
        const displayAudioName = audioSepMode === 'voice' ? `${baseName}_voice_only.mp3` : `${baseName}_music_only.mp3`;
        const displayVideoName = audioSepMode === 'voice' ? `${baseName}_video_voice_only.mp4` : `${baseName}_video_music_only.mp4`;
        
        try {
          await ffmpegInstance.writeFile(safeInputName, await fetchFile(currentFile));
          
          let ffmpegArgsAudio: string[] = [];
          let ffmpegArgsVideo: string[] = [];

          if (audioSepMode === 'voice') {
            const filter = 'highpass=f=200,lowpass=f=3000';
            ffmpegArgsAudio = ['-threads', '1', '-i', safeInputName, '-af', filter, '-q:a', '2', safeAudioOutputName];
            if (!isAudioOnly) {
              ffmpegArgsVideo = ['-threads', '1', '-i', safeInputName, '-af', filter, '-c:v', 'copy', safeVideoOutputName];
            }
          } else {
            const complexFilter = '[0:a]aformat=channel_layouts=stereo,pan=stereo|c0=c0-c1|c1=c1-c0[aout]';
            ffmpegArgsAudio = ['-threads', '1', '-i', safeInputName, '-filter_complex', complexFilter, '-map', '[aout]', '-q:a', '2', safeAudioOutputName];
            if (!isAudioOnly) {
              ffmpegArgsVideo = ['-threads', '1', '-i', safeInputName, '-filter_complex', complexFilter, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', safeVideoOutputName];
            }
          }
          
          addLog(`WORKER #${workerId}: Phân tách âm thanh tệp ${currentFile.name}...`);
          await ffmpegInstance.exec(ffmpegArgsAudio);
          
          const audioData = await safeReadFile(ffmpegInstance, safeAudioOutputName);
          if (audioData) {
            const audioUrl = URL.createObjectURL(new Blob([audioData], { type: 'audio/mp3' }));
            
            const newOutputs = [{
              name: displayAudioName,
              url: audioUrl,
              type: 'audio' as 'audio' | 'video'
            }];

            if (!isAudioOnly) {
              addLog(`WORKER #${workerId}: Đang tạo video tách dải tần cho ${currentFile.name}...`);
              await ffmpegInstance.exec(ffmpegArgsVideo);
              
              const videoData = await safeReadFile(ffmpegInstance, safeVideoOutputName);
              if (videoData) {
                const videoUrl = URL.createObjectURL(new Blob([videoData], { type: 'video/mp4' }));
                
                newOutputs.unshift({
                  name: displayVideoName,
                  url: videoUrl,
                  type: 'video' as 'audio' | 'video'
                });
              }
            }
            
            setOutputVideos(prev => [...newOutputs, ...prev]);
            addLog(`WORKER #${workerId}: Hoàn tất xử lý tách âm ${currentFile.name}.`);
          }
        } finally {
          try {
            await safeDeleteFile(ffmpegInstance, safeInputName);
            await safeDeleteFile(ffmpegInstance, safeAudioOutputName);
            if (!isAudioOnly) {
              await safeDeleteFile(ffmpegInstance, safeVideoOutputName);
            }
          } catch (e) {}
          if (createdInstance) {
            try {
              await ffmpegInstance.terminate();
            } catch (e) {}
          }
        }

        setProgress(prev => {
          const finished = Math.min(100, prev + Math.ceil(100 / filesToProcess.length));
          return finished > 100 ? 100 : finished;
        });
      });
      
      addLog(`SUCCESS: Đã hoàn tất xử lý tách âm song song cho ${filesToProcess.length} tệp.`);
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setError(t.error);
      addLog(`ERROR: Trình tách âm thanh gặp lỗi: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSrtTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours().toString().padStart(2, '0');
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
  };

  const handleDownloadAll = async () => {
    setIsProcessing(true);
    addLog('SYSTEM: Compressing files into ZIP...');
    try {
      const zip = new JSZip();
      
      for (const video of outputVideos) {
        try {
          const response = await fetch(video.url);
          if (!response.ok) throw new Error(`Failed to fetch ${video.name}`);
          const blob = await response.blob();
          zip.file(video.name, blob);
        } catch (fetchErr) {
          console.error(`Error fetching ${video.name}:`, fetchErr);
          addLog(`WARNING: Could not include ${video.name} in ZIP.`);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = 'Tawil_Videos.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
      
      addLog('SYSTEM: ZIP download complete.');
    } catch (err) {
      console.error(err);
      setError('Failed to create ZIP file.');
      addLog('ERROR: ZIP compression failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTargetedUploader = () => {
    const currentToolMeta = studioTools.find(tool => tool.id === mode);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full text-center animate-in fade-in duration-500">
        <div className="premium-glass rounded-3xl border border-white/10 p-8 shadow-2xl shadow-indigo-500/5 premium-glow-subtle w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-2xl pointer-events-none" />
          
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/10 hover:rotate-3 hover:scale-105 transition-transform ${currentToolMeta?.color || 'text-blue-500 bg-blue-50 dark:bg-blue-500/10'}`}>
            {currentToolMeta ? <currentToolMeta.icon className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
          </div>
          
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r ${currentToolMeta?.badgeColor || 'from-indigo-500 to-indigo-700'} shadow-sm`}>
            {currentToolMeta?.badge || 'CÔNG CỤ'}
          </span>
          <h2 className="text-xl md:text-2xl font-black mt-4 mb-2 text-gray-950 dark:text-white">Công cụ: {currentToolMeta?.name || 'Tải File'}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-6 leading-relaxed font-semibold">
            {currentToolMeta?.desc || 'Hãy tải file phù hợp lên để mở các bảng cấu hình và bộ lọc AI cao cấp phía dưới.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {currentToolMeta?.specs.map((spec, i) => (
              <div key={i} className="p-3 bg-gray-50/50 dark:bg-[#090b0f]/50 border border-gray-200/50 dark:border-gray-800/80 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-gray-700 dark:text-gray-350">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{spec}</span>
              </div>
            ))}
          </div>

          {/* Drag & drop region with premium glowing hover highlight */}
          <label 
            htmlFor="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center select-none block hover:scale-[1.01] active:scale-[0.99] group ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                : 'border-gray-305 dark:border-gray-800 hover:border-indigo-500/60 hover:bg-gray-100/50 dark:hover:bg-indigo-950/20 bg-gray-50/40 dark:bg-[#07090d]/60'
            }`}
          >
            <Upload className="w-9 h-9 text-indigo-500 mb-2 animate-bounce group-hover:scale-110 transition-transform duration-300" />
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Kép thả hoặc Click vào đây</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-semibold">
              Hỗ trợ: {currentToolMeta?.isImageOnly ? 'Hình ảnh JPG, PNG, WEBP' : 'Video định dạng MP4, WEBM (Lên tới 2GB)'}
            </p>
          </label>

          <div className="flex justify-center gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/80">
            <button
              onClick={() => setMode('dashboard')}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-750 dark:text-gray-300 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              Quay lại Bảng điều khiển
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreativeDashboard = () => {
    const filteredTools = studioTools.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || tool.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-12 animate-in fade-in duration-500">
        
        {/* Banner with stunning interactive depth and floating light spots */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-tr from-slate-950 via-[#0d0f14] to-indigo-950/95 text-white p-6 md:p-8 border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full filter blur-[100px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none animate-pulse" />
          
          <div className="space-y-4 z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-extrabold uppercase tracking-widest leading-none shadow-sm shadow-indigo-500/10">
              <span className="premium-live-dot" /> Trình điều hành điện ảnh AI 2026
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              Tawil AI Workspace
            </h1>
            <p className="text-xs text-gray-300/90 leading-relaxed font-medium">
              Môi trường làm việc hiệu năng cao tích hợp dịch thuật video, biên soạn thông minh bằng <strong className="text-indigo-300">Gemini Pro</strong> và tự động hóa <strong className="text-indigo-300">FFmpeg</strong>. Chạy bảo mật tuyệt đối trực tiếp trên trình duyệt.
            </p>
            
            {/* Status indicators in gorgeous cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Động cơ Video</span>
                <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Kích Hoạt
                </span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Trí tuệ AI</span>
                <span className="text-[10px] font-black text-indigo-300 mt-1 block">Gemini 1.5 &amp; 2.5</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Bảo mật dữ liệu</span>
                <span className="text-[10px] font-black text-sky-400 mt-1 block">Mã hóa Sandbox</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">Hiệu suất GPU</span>
                <span className="text-[10px] font-black text-amber-400 mt-1 block">Tăng tốc phần cứng</span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row gap-3 z-10">
            <div className="p-5 bg-gradient-to-tr from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 rounded-2xl flex flex-col justify-between h-32 min-w-[150px] shadow-lg shadow-indigo-950/20">
              <div>
                <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest block">CÔNG CỤ BIÊN TẬP</span>
                <span className="text-3xl font-black block text-white mt-1">13</span>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold">Tích hợp đa năng</span>
            </div>
          </div>
        </div>

        {/* Filter and search row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-[#11131a]/80 border border-gray-200/50 dark:border-gray-850/80 p-3.5 rounded-2xl shadow-sm backdrop-blur-xl">
          {/* Category tabs */}
          <div className="flex items-center gap-1 px-1 bg-gray-50/80 dark:bg-[#090b0f] rounded-xl border border-gray-200/40 dark:border-gray-800/60 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'ai', label: 'AI Studio' },
              { id: 'translation', label: 'Biên Dịch Phim' },
              { id: 'editing', label: 'Biên Tập Video' },
              { id: 'utility', label: 'Tiện ích' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id as any)}
                className={`px-3.5 py-1.5 text-[11px] font-extrabold rounded-lg whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  filterCategory === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              autoComplete="off"
              data-lpignore="true"
              placeholder="Tìm kiếm công cụ biên tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#090b0f] border border-gray-200 dark:border-gray-800 rounded-xl py-2 pl-9 pr-8 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d0f14] focus:ring-1 focus:ring-indigo-500/20 transition-all text-gray-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 dark:hover:text-white text-xs font-bold"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {/* Tools Grid with premium Framer Motion hover & intro stagering */}
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool, index) => {
              const IconComponent = tool.icon;
              return (
                <motion.div
                  key={tool.id}
                  onClick={() => setMode(tool.id as any)}
                  initial={{ opacity: 0, y: 35 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.45), ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -6, scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className="group bg-white/90 dark:bg-[#12141c]/90 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl p-5 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  {/* Visual ambient accent for hover */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-pink-500/5 rounded-full filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {/* Premium tool icon layout with glow shadow */}
                      <div className={`p-3 rounded-xl ${tool.color} shadow-sm group-hover:shadow-md group-hover:shadow-indigo-500/10 transition-all duration-300`}>
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${tool.badgeColor} shadow-sm`}>
                        {tool.badge}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-gray-950 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed line-clamp-3 font-medium">
                      {tool.desc}
                    </p>
                  </div>

                  <div className="mt-5 space-y-2 pt-4 border-t border-gray-150/50 dark:border-gray-800/50">
                    {tool.specs.slice(0, 3).map((spec, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 animate-pulse" />
                        <span className="truncate">{spec}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-1.5 flex items-center justify-between text-xs font-black text-blue-600 dark:text-indigo-400 group-hover:translate-x-1.5 transition-transform duration-300">
                    <span>Mở công cụ</span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-[#12141c] border border-gray-250 dark:border-gray-800 rounded-3xl p-8">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin mx-auto mb-4" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Không tìm thấy công cụ</h3>
            <p className="text-xs text-gray-500 mt-1.5">
              Hãy thử tìm kiếm với từ khóa khác hoặc bấm bên dưới để xem lại tất cả.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setFilterCategory('all'); }}
              className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase transition-all"
            >
              Xem tất cả
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    mode === 'ocr' ? <OCRVideo onBack={() => setMode('videoAnalysis')} /> : (
    <div 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen flex bg-[#fbfbfd] dark:bg-[#06080d] text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300 relative"
    >
      {/* Dynamic 2026 Ambient Core Lighting Spots (GPU accelerated) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 dark:from-indigo-600/5 dark:to-purple-600/5 filter blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-pink-500/5 to-blue-500/5 dark:from-pink-600/5 dark:to-cyan-600/5 filter blur-[120px] pointer-events-none animate-pulse duration-[12s]" />
      <input 
        id="file-upload" 
        type="file" 
        accept={mode === 'removeText' ? 'image/*' : (mode === 'thumbnail' || mode === 'chibiFrame') ? "video/*,image/*" : "video/*"} 
        className="sr-only" 
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} 
        onChange={handleFileChange} 
      />
      {/* Floating visual Toast alert for chat */}
      <AnimatePresence>
        {chatToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-6 right-6 z-[100] max-w-sm w-[90%] sm:w-full bg-white dark:bg-[#16181d] border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10 p-4 shrink-0 pointer-events-auto cursor-pointer"
            onClick={() => {
              setMode('secureChat');
              setChatToast(null);
            }}
          >
            <div className="flex gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <img
                  src={chatToast.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${chatToast.sender}`}
                  alt={chatToast.sender}
                  className="w-full h-full object-cover rounded-xl border border-red-500/10"
                />
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase text-red-500 tracking-wider">Tin nhắn mới</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatToast(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-semibold truncate text-gray-900 dark:text-white mt-0.5">{chatToast.sender}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{chatToast.text}</p>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatToast(null);
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Để sau
                  </button>
                  <button
                    onClick={() => {
                      setMode('secureChat');
                      setChatToast(null);
                    }}
                    className="bg-red-500 text-white font-bold text-[10px] px-3 py-1 rounded-lg hover:bg-red-650 transition-colors shadow-md shadow-red-500/20 uppercase tracking-wider"
                  >
                    Xem ngay
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Full-screen premium Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 border-[6px] border-dashed border-indigo-500 m-4 rounded-3xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none select-none">
          <div className="p-7 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-3xl text-white shadow-2xl shadow-indigo-500/35 mb-5 animate-bounce">
            <Upload className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-black text-white text-center tracking-tight">Thả tập tin của bạn vào đây ngay!</h2>
          <p className="text-xs text-indigo-200/90 max-w-md mt-2.5 text-center leading-relaxed">
            Hệ thống sẽ tự động tải lên, chuyển đổi định dạng và tối ưu hóa tập tin cho công cụ <strong className="text-white text-sm">{(studioTools.find(tool => tool.id === mode)?.name || 'được chọn')}</strong>.
          </p>
          <span className="mt-8 text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-950/40 px-3.5 py-1.5 rounded-full border border-indigo-800/40">
            Hỗ trợ: Video MP4/WEBM &amp; Ảnh JPG/PNG/WEBP lên tới 2GB
          </span>
        </div>
      )}
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        onClick={(e) => {
          // Close mobile sidebar when clicking any menu button inside
          if ((e.target as HTMLElement).closest('button')) {
            setIsMobileSidebarOpen(false);
          }
        }}
        className={`flex flex-col h-full border-r border-gray-200/40 dark:border-gray-800/45 premium-glass z-40 py-6 transition-all duration-300 ease-in-out shrink-0
          fixed inset-y-0 left-0 md:relative md:translate-x-0 md:flex
          ${isMobileSidebarOpen ? 'translate-x-0 w-64 px-4 shadow-2xl bg-white/95 dark:bg-[#0c0e12]/95 backdrop-blur-2xl' : '-translate-x-full md:translate-x-0'}
          ${isSidebarPinned || isSidebarExpanded ? 'md:w-64 md:px-4 bg-white/80 dark:bg-[#0c0e12]/80 backdrop-blur-2xl shadow-xl' : 'md:w-20 md:px-3 md:items-center bg-white/70 dark:bg-[#0c0e12]/70 backdrop-blur-xl'}
        `}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        {/* Branding header in Sidebar */}
        <div className={`flex items-center w-full mb-6 ${(isSidebarPinned || isSidebarExpanded || isMobileSidebarOpen) ? 'justify-between px-2' : 'justify-center'}`}>
          {(isSidebarPinned || isSidebarExpanded || isMobileSidebarOpen) ? (
            <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-gray-900 dark:text-white">TAWIL STUDIO</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">PRO AI 2026</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-transform duration-300 cursor-pointer">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
          )}

          {isMobileSidebarOpen ? (
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Đóng sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (isSidebarPinned || isSidebarExpanded) ? (
            <button 
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className={`p-1.5 rounded-lg border text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer ${isSidebarPinned ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-500/5' : 'bg-transparent border-transparent'}`}
              title={isSidebarPinned ? "Bỏ ghim Sidebar" : "Ghim Sidebar"}
            >
              <Pin className={`w-3.5 h-3.5 transform transition-transform ${isSidebarPinned ? 'rotate-45 text-indigo-600 dark:text-indigo-400' : ''}`} />
            </button>
          ) : null}
        </div>

        {/* Scrollable list of options */}
        <div className="flex-1 flex flex-col gap-1.5 w-full overflow-y-auto no-scrollbar py-2">
          
          {/* Dashboard item */}
          <button 
            onClick={() => setMode('dashboard')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'dashboard' 
                ? 'bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/25 shadow-md shadow-indigo-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Bảng Điều Khiển"
          >
            <div className="relative flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />
            </div>
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Bảng điều khiển</span>
            )}
            {mode === 'dashboard' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-blue-505 to-indigo-500 rounded-r-xl shadow-lg shadow-indigo-505/50" />}
          </button>

          <div className="h-px bg-gray-200/40 dark:bg-gray-800/40 my-2 w-full shrink-0" />

          {/* OCR */}
          <button 
            onClick={() => setMode('ocr')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'ocr' 
                ? 'bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-md shadow-blue-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Real-time Video OCR"
          >
            <FileText className="w-5 h-5 flex-shrink-0 text-blue-500 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Real-time Video OCR</span>
            )}
            {mode === 'ocr' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-blue-450 to-indigo-500 rounded-r-xl shadow-lg shadow-blue-500/50" />}
          </button>

          {/* Video Analysis */}
          <button 
            onClick={() => setMode('videoAnalysis')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'videoAnalysis' 
                ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 shadow-md shadow-amber-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Phân Tích Video AI"
          >
            <div className="relative flex items-center justify-center">
              <Gauge className="w-5 h-5 flex-shrink-0 text-amber-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
              {!(isSidebarPinned || isSidebarExpanded) && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>
            {(isSidebarPinned || isSidebarExpanded) && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Phân Phối Video AI</span>
                <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full scale-90 shrink-0">AI</span>
              </div>
            )}
            {mode === 'videoAnalysis' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-amber-450 to-orange-500 rounded-r-xl shadow-lg shadow-amber-500/50" />}
          </button>

          {/* Split Video */}
          <button 
            onClick={() => setMode('split')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'split' 
                ? 'bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-transparent text-blue-600 dark:text-blue-450 font-bold border border-blue-500/20 shadow-md shadow-blue-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Chia nhỏ Video"
          >
            <SplitSquareHorizontal className="w-5 h-5 flex-shrink-0 text-blue-500 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Chia nhỏ Video clip</span>
            )}
            {mode === 'split' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-xl shadow-lg shadow-indigo-500/50" />}
          </button>

          {/* Auto Subtitle */}
          <button 
            onClick={() => setMode('autoSubtitle')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'autoSubtitle' 
                ? 'bg-gradient-to-r from-blue-600/15 via-indigo-500/10 to-transparent text-blue-600 dark:text-blue-450 font-bold border border-blue-500/20 shadow-md shadow-blue-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Tạo Phụ đề tự động"
          >
            <Sparkles className="w-5 h-5 flex-shrink-0 text-blue-550 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Phụ Đề Tự Động</span>
            )}
            {mode === 'autoSubtitle' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-blue-450 to-indigo-550 rounded-r-xl shadow-lg shadow-blue-505/50" />}
          </button>

          {/* Auto Vietsub */}
          <button 
            onClick={() => setMode('autoVietsub')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'autoVietsub' 
                ? 'bg-gradient-to-r from-purple-600/15 via-fuchsia-600/10 to-transparent text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20 shadow-md shadow-purple-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Biên dịch Vietsub"
          >
            <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Biên Dịch Vietsub</span>
            )}
            {mode === 'autoVietsub' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-purple-500 to-fuchsia-500 rounded-r-xl shadow-lg shadow-purple-550/50" />}
          </button>

          {/* Thumbnail */}
          <button 
            onClick={() => setMode('thumbnail')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'thumbnail' 
                ? 'bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-transparent text-blue-600 dark:text-blue-450 font-bold border border-blue-500/20 shadow-md shadow-blue-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Thiết kế Thumbnail AI"
          >
            <ImageIcon className="w-5 h-5 flex-shrink-0 text-blue-500 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Ảnh Bìa / SEO AI</span>
            )}
            {mode === 'thumbnail' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-xl shadow-lg shadow-blue-500/50" />}
          </button>

          {/* Audio Separator */}
          <button 
            onClick={() => setMode('audioSeparator')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'audioSeparator' 
                ? 'bg-gradient-to-r from-cyan-600/15 via-blue-600/10 to-transparent text-cyan-600 dark:text-cyan-550 font-bold border border-cyan-500/20 shadow-md shadow-cyan-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Tách Lời & Nhạc"
          >
            <Mic className="w-5 h-5 text-cyan-500 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Tách Lời & Nhạc</span>
            )}
            {mode === 'audioSeparator' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-r-xl shadow-lg shadow-cyan-550/50" />}
          </button>

          {/* SRT Cleaner */}
          <button 
            onClick={() => setMode('srtCleaner')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'srtCleaner' 
                ? 'bg-gradient-to-r from-green-600/15 via-teal-600/10 to-transparent text-green-600 dark:text-green-500 font-bold border border-green-500/20 shadow-md shadow-green-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="CapCut SRT Cleaner"
          >
            <Eraser className="w-5 h-5 text-green-500 flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Sạch hóa File SRT</span>
            )}
            {mode === 'srtCleaner' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-green-500 to-teal-500 rounded-r-xl shadow-lg shadow-green-500/55" />}
          </button>

          {/* Chibi Frame */}
          <button 
            onClick={() => setMode('chibiFrame')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'chibiFrame' 
                ? 'bg-gradient-to-r from-pink-600/15 via-rose-600/10 to-transparent text-pink-600 dark:text-pink-450 font-bold border border-pink-500/20 shadow-md shadow-pink-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Khung Viền & Chibi"
          >
            <ImagePlus className="w-5 h-5 text-pink-500 flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Khung Viền Chibi AI</span>
            )}
            {mode === 'chibiFrame' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-pink-500 to-rose-500 rounded-r-xl shadow-lg shadow-pink-550/50" />}
          </button>

          {/* Secure Chat */}
          <button 
            onClick={() => setMode('secureChat')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'secureChat' 
                ? 'bg-gradient-to-r from-red-600/15 via-rose-600/10 to-transparent text-red-600 dark:text-red-400 font-bold border border-red-500/20 shadow-md shadow-red-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Kênh Trò chuyện Vault bảo mật"
          >
            <Shield className="w-5 h-5 text-red-500 flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Trò chuyện Vault</span>
            )}
            {unreadCount > 0 && (
              <span className={`absolute ${isSidebarPinned || isSidebarExpanded ? 'right-4' : 'right-1.5' + ' top-1.5'} flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-[9px] font-black text-white shadow-lg shadow-red-500/35 border border-white/10 select-none animate-bounce`}>
                {unreadCount}
              </span>
            )}
            {mode === 'secureChat' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-red-500 to-rose-500 rounded-r-xl shadow-lg shadow-red-550/50" />}
          </button>
          <button 
            onClick={() => setMode('translateVideo')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'translateVideo' 
                ? 'bg-gradient-to-r from-indigo-600/15 via-rose-600/10 to-transparent text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 shadow-md shadow-indigo-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Dịch Tiếng Trung/Hàn trên video"
          >
            <Languages className="w-5 h-5 text-indigo-500 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Dịch Trung/Hàn Phim</span>
            )}
            {mode === 'translateVideo' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-rose-500 rounded-r-xl shadow-lg shadow-indigo-550/50" />}
          </button>

          {/* Remove Text */}
          <button 
            onClick={() => setMode('removeText')}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'removeText' 
                ? 'bg-gradient-to-r from-purple-600/15 via-fuchsia-600/10 to-transparent text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20 shadow-md shadow-purple-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Xóa Chữ Trên Ảnh bằng AI"
          >
            <div className="relative flex items-center justify-center">
              <Type className="w-5 h-5 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute w-6 h-0.5 bg-red-400 rotate-45 z-10 animate-pulse" />
            </div>
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Xóa Chữ watermark</span>
            )}
            {mode === 'removeText' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-purple-550 to-fuchsia-500 rounded-r-xl shadow-lg shadow-purple-550/50" />}
          </button>

          {/* External Links */}
          <button 
            onClick={() => {
              setMode('external');
              setExternalTool('ai-studio');
            }}
            className={`group w-full flex items-center gap-3.5 h-12 rounded-xl transition-all duration-300 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              mode === 'external' 
                ? 'bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-transparent text-blue-600 dark:text-blue-450 font-bold border border-blue-500/20 shadow-md shadow-blue-500/5 backdrop-blur-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/55 border border-transparent hover:text-gray-950 dark:hover:text-white'
            } ${(isSidebarPinned || isSidebarExpanded) ? 'px-4 justify-start' : 'justify-center'}`}
            title="Ứng Dụng Liên Kết"
          >
            <Monitor className="w-5 h-5 flex-shrink-0 text-indigo-500 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />
            {(isSidebarPinned || isSidebarExpanded) && (
              <span className="text-xs font-semibold truncate animate-in slide-in-from-left-2 duration-300">Hỗ trợ Suno AI</span>
            )}
            {mode === 'external' && <div className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-blue-550 to-indigo-500 rounded-r-xl shadow-lg shadow-indigo-500/50" />}
          </button>
        </div>

        {/* Sidebar Footer */}
        <div className="mt-auto flex flex-col gap-4 w-full">
          {(isSidebarPinned || isSidebarExpanded) ? (
            <div className="p-3 bg-gray-50 dark:bg-[#111318] border border-gray-150 dark:border-gray-800 rounded-xl animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-2">
                <UserCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">STUDIO PRO LEVEL</span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
              </div>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 block mt-1">Hạn ngạch: 4.0 / 5.0 GB khả dụng</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <UserCircle2 className="w-5 h-5 text-indigo-500" />
            </div>
          )}

          <div className="flex items-center gap-2.5 w-full">
            <button 
              onClick={() => setIsLogoModalOpen(true)}
              className="rounded-xl overflow-hidden shadow-md shadow-blue-500/10 hover:scale-105 transition-all outline-none border border-gray-200 dark:border-gray-800 w-10 h-10 flex-shrink-0"
            >
              <img 
                src="https://i.pinimg.com/1200x/89/c1/61/89c161a0986ff427c8e84848119458ab.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
            {(isSidebarPinned || isSidebarExpanded) && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Mẫu Anime chibi</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500">Watermark đang hoạt động</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Topbar of premium video editor studio */}
        <header className="sticky top-0 h-16 border-b border-gray-200/40 dark:border-gray-800/45 bg-white/70 dark:bg-[#0c0e12]/75 backdrop-blur-2xl flex items-center justify-between px-3 md:px-6 z-30 transition-colors duration-300">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-1.5 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shrink-0"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
 
            <button 
              onClick={() => setIsLogoModalOpen(true)}
              className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/10 hover:scale-110 hover:rotate-3 transition-transform active:scale-95 led-glow shrink-0 border border-indigo-500/30"
            >
              <img 
                src="https://i.pinimg.com/736x/d2/11/f3/d211f3100c62d42d38394402e29cb3c9.jpg" 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
            <h1 className="font-extrabold text-lg md:text-xl hidden md:block bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-900 dark:from-white dark:via-indigo-100 dark:to-indigo-300 bg-clip-text text-transparent tracking-tight shrink-0">丅ᗩᗯᎥᒪ ᔕ丅ᑌᗪᎥᗝ</h1>
            {videoFile || imageFile ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold bg-gray-100 dark:bg-gray-800/60 rounded text-gray-500 dark:text-gray-450 max-w-[70px] xs:max-w-[120px] sm:max-w-[200px] md:max-w-[300px] truncate border border-gray-200/50 dark:border-gray-800/40" title={videoFile?.name || imageFile?.name}>
                  {videoFile?.name || imageFile?.name}
                </span>
                <button 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">{t.changeFile}</span>
                </button>
              </div>
            ) : (
              <span className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold bg-gray-100/60 dark:bg-gray-800/40 rounded text-gray-505 dark:text-gray-450 truncate shrink-0 border border-gray-200/45 dark:border-gray-800/30">
                {t.noFile}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
            {/* Custom user API Key widget button */}
            <button
              onClick={() => {
                setApiKeyInput(userApiKey);
                setKeyTestResult(null);
                setKeyTestError('');
                setIsApiKeyVisible(false);
                setIsApiKeyModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-xl border cursor-pointer transition-all hover:scale-105 active:scale-95 text-xs md:text-sm font-bold ${
                userApiKey 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 shadow-sm shadow-emerald-500/5' 
                  : 'bg-gray-50/70 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-850'
              }`}
              title={userApiKey ? "Đang sử dụng API Key cá nhân của bạn" : "Đang sử dụng hạn ngạch từ chủ sở hữu. Click để đổi sang API Key cá nhân của bạn."}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden leading-none xs:inline">{userApiKey ? "Key cá nhân" : "Khóa API"}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${userApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
            </button>

            <button 
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-850 transition-all text-xs md:text-sm font-bold cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
              {lang.toUpperCase()}
            </button>
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 md:p-2 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-850 transition-all text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />}
            </button>
            
            <button 
              disabled={!videoFile || isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl font-extrabold text-xs md:text-sm transition-all shadow-lg shadow-indigo-500/15 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] premium-btn-shine premium-glow-hover cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden md:inline">{t.export}</span>
            </button>
          </div>
        </header>

        {/* Workspace */}
        <motion.main 
          key={mode}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0f1115]"
        >
          
          {mode === 'secureChat' ? (
            <SecureChat />
          ) : mode === 'external' ? (
            <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto">
              <div className="flex items-center gap-4 bg-white dark:bg-[#16181d] p-3 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setExternalTool('ai-studio')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${externalTool === 'ai-studio' ? 'bg-black text-white shadow-lg shadow-blue-500/40 led-glow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <Monitor className="w-5 h-5" />
                  AI Studio App
                </button>
                <button 
                  onClick={() => setExternalTool('suno')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${externalTool === 'suno' ? 'bg-black text-white shadow-lg shadow-purple-500/40 led-glow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <Music className="w-5 h-5" />
                  Suno AI (Music)
                </button>
                <button 
                  onClick={() => setExternalTool('tiktok')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${externalTool === 'tiktok' ? 'bg-black text-white shadow-lg shadow-black/40 led-glow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <Video className="w-5 h-5" />
                  TikTok
                </button>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-[#16181d] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${externalTool === 'suno' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-500' : externalTool === 'tiktok' ? 'bg-gray-50 dark:bg-gray-500/10 text-gray-800 dark:text-white' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'}`}>
                    {externalTool === 'suno' ? <Music className="w-5 h-5" /> : externalTool === 'tiktok' ? <Video className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {externalTool === 'suno' ? 'Suno AI - Tạo nhạc AI' : externalTool === 'tiktok' ? 'TikTok - Video ngắn' : t.externalApp}
                    </h3>
                    <p className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-md">
                      {externalTool === 'suno' ? 'suno.com/create' : externalTool === 'tiktok' ? 'tiktok.com' : 'ai.studio/apps/5155c7f6-7e9f-4ae5-84ed-d385aee6c21e'}
                    </p>
                  </div>
                </div>
                <a 
                  href={externalTool === 'suno' ? 'https://suno.com/create?wid=default' : externalTool === 'tiktok' ? 'https://www.tiktok.com/' : "https://ai.studio/apps/5155c7f6-7e9f-4ae5-84ed-d385aee6c21e?fullscreenApplet=true"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium text-sm transition-all shadow-lg ${externalTool === 'suno' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20' : externalTool === 'tiktok' ? 'bg-black hover:bg-gray-900 shadow-black/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.openInNewTab}</span>
                </a>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#16181d] relative group">
                <iframe 
                  src={externalTool === 'suno' ? 'https://suno.com/create?wid=default' : externalTool === 'tiktok' ? 'https://www.tiktok.com/' : "https://ai.studio/apps/5155c7f6-7e9f-4ae5-84ed-d385aee6c21e?fullscreenApplet=true"} 
                  className="w-full h-full border-0"
                  title="External Tool"
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5">
                  <p className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full text-xs font-medium shadow-xl border border-gray-200 dark:border-gray-700">
                    {externalTool === 'tiktok' ? 'TikTok có thể không hiển thị trong iframe do chính sách bảo mật. Hãy nhấn "Mở trong tab mới" để sử dụng.' : t.iframeNotice}
                  </p>
                </div>
              </div>
            </div>
          ) : !loaded ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t.initializing}</p>
            </div>
          ) : mode === 'dashboard' ? (
            <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 md:gap-6 overflow-y-auto no-scrollbar bg-gray-50 dark:bg-[#0c0e12]">
              {renderCreativeDashboard()}
            </div>
          ) : !videoFile && !imageFile && mode !== 'srtCleaner' ? (
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-[#0c0e12] no-scrollbar">
              {renderTargetedUploader()}
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 md:gap-6 overflow-y-auto no-scrollbar">
              {/* Toolbar of Aspect Ratio & Fit Mode */}
              {videoUrl && (
                <div className="bg-white dark:bg-[#16181d] border border-gray-200 dark:border-gray-800 p-3 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors duration-200">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Aspect Ratio Section */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#0f1115] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700/50">
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 pl-1 select-none flex items-center gap-1">
                        📱 Khung hình:
                      </span>
                      {[
                        { id: 'auto', label: 'Tự động' },
                        { id: '16:9', label: '16:9' },
                        { id: '9:16', label: '9:16' },
                        { id: '1:1', label: '1:1' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreviewFrameRatio(item.id as any)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${
                            previewFrameRatio === item.id
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-450 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          title={`Đặt tỉ lệ khung: ${item.label}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playback speed & meta info */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Playback rate */}
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0f1115] p-1 rounded-xl border border-gray-200 dark:border-gray-700/50">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400 pl-1.5 select-none flex items-center gap-1">
                        ⚡ Tốc độ:
                      </span>
                      {[0.5, 1, 1.5, 2].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPlaybackRate(s)}
                          className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all active:scale-95 cursor-pointer ${
                            playbackRate === s 
                              ? 'bg-amber-500 text-white shadow-sm' 
                              : 'text-gray-500 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    {/* Dynamic Height Slider */}
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0f1115]/80 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700/50">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400 pl-1 select-none flex items-center gap-1">
                        ↕ Cao Khung:
                      </span>
                      <input 
                        type="range"
                        min="350"
                        max="1400"
                        step="10"
                        value={previewHeight}
                        onChange={(e) => setPreviewHeight(parseInt(e.target.value))}
                        className="w-18 sm:w-28 h-1 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer accent-emerald-500"
                        title="Điều chỉnh kích cỡ khung đen xem trước"
                      />
                      <span className="text-[9px] font-mono font-bold text-gray-500 min-w-[34px] text-right">
                        {previewHeight}px
                      </span>
                    </div>

                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-gray-500 font-mono flex items-center gap-2 pr-1 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      {videoDimensions ? `${videoDimensions.width}x${videoDimensions.height}` : 'Đang tải...'}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Workspace Grid Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
                
                {/* Left Column: Player & Timeline */}
                <div className="flex flex-col gap-4 md:gap-6 w-full lg:col-span-7 lg:order-1">
                  
                  {/* Video Preview / Upload Area */}
                  <div 
                    ref={chibiPreviewRef} 
                    className="w-full bg-black rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative flex items-center justify-center group shadow-sm transition-all duration-300"
                    style={{ height: `${previewHeight}px`, minHeight: '350px', maxHeight: '90vh' }}
                  >
                {/* Floating controls removed to prevent covering video content */}

                {mode === 'chibiFrame' ? (
                  <div 
                    className="w-full h-full relative group/video overflow-hidden flex items-center justify-center" 
                    style={{ backgroundImage: bgFrameImage ? `url(${bgFrameImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    {!videoFile && !imageFile ? (
                      <div 
                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-all bg-gray-50/90 dark:bg-[#111318]/90 hover:bg-gray-100/90 dark:hover:bg-[#1a1d24]/90 backdrop-blur-sm z-10"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                         <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4 text-blue-500">
                           <ImagePlus className="w-8 h-8" />
                         </div>
                         <h3 className="text-lg font-medium mb-2">Tải Ảnh (Để tạo Chibi/Khung)</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.drop}</p>
                      </div>
                    ) : (
                      <>
                        {videoUrl ? (
                          <div 
                            className={`relative shadow-2xl border border-gray-200 dark:border-gray-800/80 bg-[#06070a] rounded-2xl overflow-hidden transition-all duration-300 flex items-center justify-center z-10 ${
                              previewFrameRatio === '9:16' || (previewFrameRatio === 'auto' && videoDimensions && videoDimensions.height > videoDimensions.width)
                                ? 'border-[6px] border-slate-700/80 dark:border-slate-800 shadow-indigo-500/10'
                                : ''
                            }`}
                            style={{ 
                              aspectRatio: previewFrameRatio === '16:9'
                                ? '16 / 9'
                                : previewFrameRatio === '9:16'
                                ? '9 / 16'
                                : previewFrameRatio === '1:1'
                                ? '1 / 1'
                                : videoDimensions
                                ? `${videoDimensions.width} / ${videoDimensions.height}`
                                : '16 / 9',
                              height: bgFrameImage ? '75%' : '100%',
                              width: bgFrameImage ? '75%' : 'auto',
                              maxWidth: '100%',
                              maxHeight: '100%',
                            }}
                          >
                            <video 
                              ref={videoRef} 
                              src={videoUrl} 
                              controls 
                              className="w-full h-full block rounded-xl shadow-inner"
                              style={{
                                objectFit: videoFitMode === 'contain' ? 'contain' : videoFitMode === 'cover' ? 'cover' : 'fill'
                              }}
                              onTimeUpdate={(e) => setVideoPlayerTime(e.currentTarget.currentTime)}
                              onLoadedMetadata={(e) => {
                                const v = e.currentTarget;
                                const w = v.videoWidth;
                                const h = v.videoHeight;
                                setVideoPlayerTime(v.currentTime);
                                setVideoDimensions({ width: w, height: h });
                                addLog(`SYSTEM: (Chibi) Đã nhận diện kích thước video: ${w}x${h}`);
                              }}
                            />
                          </div>
                        ) : imageFile && !bgFrameImage ? (
                          <img src={imageUrl} alt="Uploaded Ref" className="w-full h-full object-contain opacity-50 blur-sm" />
                        ) : null}
                        
                        {/* Add Video Button when image is uploaded but no video */}
                        {imageFile && !videoFile && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                            <button
                              onClick={() => document.getElementById('file-upload')?.click()}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-500/30 flex items-center gap-2"
                            >
                              <Video className="w-5 h-5" /> Tải Lên Video Để Lồng Ghép
                            </button>
                          </div>
                        )}

                        {chibiImage && (
                          <motion.img 
                            drag
                            dragMomentum={false}
                            src={chibiImage} 
                            alt="Chibi" 
                            className="absolute z-20 w-48 h-48 object-contain cursor-move drop-shadow-2xl" 
                          />
                        )}

                        <button 
                          onClick={() => {
                            setBgFrameImage('');
                            setChibiImage('');
                            setImageFile(null);
                            setImageUrl('');
                            setVideoFile(null);
                            setVideoUrl('');
                            setAnalysisResult(null);
                          }}
                          className="absolute top-16 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/video:opacity-100 transition-opacity z-30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ) : !videoFile && !imageFile ? (
                  <div 
                    className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'bg-blue-500/10' : 'bg-gray-50 dark:bg-[#111318] hover:bg-gray-100 dark:hover:bg-[#1a1d24]'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4 text-blue-500">
                      {(mode === 'thumbnail' || mode === 'chibiFrame' || mode === 'removeText') ? <ImageIcon className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                    </div>
                    <h3 className="text-lg font-medium mb-2">{(mode === 'thumbnail' || mode === 'chibiFrame') ? 'Tải Ảnh/Video Lên' : mode === 'removeText' ? 'Tải Ảnh Lên' : t.upload}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.drop}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{(mode === 'thumbnail' || mode === 'chibiFrame') ? 'Hỗ trợ: JPG, PNG, MP4, WEBM' : mode === 'removeText' ? 'Hỗ trợ: JPG, PNG, WEBP' : t.supported}</p>
                  </div>
                ) : imageFile ? (
                  <div className="w-full h-full relative group/image">
                    <img src={imageUrl} alt="Uploaded" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => {
                        setImageFile(null);
                        setImageUrl('');
                        setGeneratedThumbnails([]);
                      }}
                      className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative group/video p-4">
                    <div 
                      className={`relative shadow-2xl border border-gray-200 dark:border-gray-800/80 bg-[#06070a] rounded-2xl overflow-hidden transition-all duration-300 flex items-center justify-center ${
                        previewFrameRatio === '9:16' || (previewFrameRatio === 'auto' && videoDimensions && videoDimensions.height > videoDimensions.width)
                          ? 'border-[6px] border-slate-700/80 dark:border-slate-800 shadow-indigo-500/10'
                          : ''
                      }`}
                      style={{ 
                        aspectRatio: previewFrameRatio === '16:9'
                          ? '16 / 9'
                          : previewFrameRatio === '9:16'
                          ? '9 / 16'
                          : previewFrameRatio === '1:1'
                          ? '1 / 1'
                          : videoDimensions
                          ? `${videoDimensions.width} / ${videoDimensions.height}`
                          : '16 / 9',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                      }}
                    >
                      <video 
                        ref={videoRef} 
                        src={videoUrl} 
                        controls 
                        className="w-full h-full block rounded-xl shadow-inner"
                        style={{
                          objectFit: videoFitMode === 'contain' ? 'contain' : videoFitMode === 'cover' ? 'cover' : 'fill'
                        }}
                        onTimeUpdate={(e) => setVideoPlayerTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget;
                          const w = v.videoWidth;
                          const h = v.videoHeight;
                          setVideoPlayerTime(v.currentTime);
                          setVideoDimensions({ width: w, height: h });
                          if (h > w) {
                            // Automatically adjust selection region for vertical video
                            setCropXPercent(5);
                            setCropYPercent(75);
                            setCropWidthPercent(90);
                            setCropHeightPercent(15);
                          } else {
                            // Automatically adjust selection region for horizontal video
                            setCropXPercent(10);
                            setCropYPercent(75);
                            setCropWidthPercent(80);
                            setCropHeightPercent(15);
                          }
                          addLog(`SYSTEM: Đã nhận diện video kích thước: ${w}x${h} (${h > w ? 'Dọc/Portrait' : 'Ngang/Landscape'}). Tự động điều chỉnh vùng chọn.`);
                        }}
                      />
                      
                      {/* Visual Crop Overlay (for Select Area Translate) */}
                      {mode === 'translateVideo' && isCropEnabled && (
                        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                          {/* Selector Frame */}
                          <div
                            className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 pointer-events-auto rounded shadow-2xl flex flex-col justify-between"
                            style={{
                              left: `${cropXPercent}%`,
                              top: `${cropYPercent}%`,
                              width: `${cropWidthPercent}%`,
                              height: `${cropHeightPercent}%`,
                              cursor: 'move',
                              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)', // Dim outer area!
                            }}
                            onPointerDown={(e) => handleCropPointerDown(e, 'drag')}
                          >
                            {/* Inner Label */}
                            <div className="absolute -top-7 left-0 bg-indigo-600/95 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow flex items-center gap-1 select-none whitespace-nowrap pointer-events-none backdrop-blur-sm">
                              <Crop className="w-3 h-3 text-indigo-300" /> Vùng dịch thuật (Kéo/Thả)
                            </div>

                            {/* Corner handle - Top Left */}
                            <div
                              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-600 hover:bg-indigo-500 border border-white rounded-full z-30 cursor-nw-resize pointer-events-auto shadow-md"
                              onPointerDown={(e) => handleCropPointerDown(e, 'nw')}
                              title="Kéo giãn góc trên bên trái"
                            />

                            {/* Corner handle - Top Right */}
                            <div
                              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-600 hover:bg-indigo-500 border border-white rounded-full z-30 cursor-ne-resize pointer-events-auto shadow-md"
                              onPointerDown={(e) => handleCropPointerDown(e, 'ne')}
                              title="Kéo giãn góc trên bên phải"
                            />

                            {/* Corner handle - Bottom Left */}
                            <div
                              className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-600 hover:bg-indigo-500 border border-white rounded-full z-30 cursor-sw-resize pointer-events-auto shadow-md"
                              onPointerDown={(e) => handleCropPointerDown(e, 'sw')}
                              title="Kéo giãn góc dưới bên trái"
                            />

                            {/* Corner handle - Bottom Right */}
                            <div
                              className="absolute -bottom-2 -right-2 w-5 h-5 bg-indigo-600 hover:bg-indigo-500 border border-white rounded-full z-30 cursor-se-resize flex items-center justify-center pointer-events-auto shadow-md"
                              onPointerDown={(e) => handleCropPointerDown(e, 'se')}
                              title="Kéo giãn góc dưới bên phải"
                            >
                              <span className="text-[10px] text-white font-black select-none pointer-events-none">⤡</span>
                            </div>

                            {/* Edge handle - Top */}
                            <div
                              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-indigo-600/80 hover:bg-indigo-500 hover:scale-y-125 border border-white/50 rounded-full z-30 cursor-n-resize pointer-events-auto shadow-sm"
                              onPointerDown={(e) => handleCropPointerDown(e, 'n')}
                              title="Kéo giãn cạnh trên"
                            />

                            {/* Edge handle - Bottom */}
                            <div
                              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-2 bg-indigo-600/80 hover:bg-indigo-500 hover:scale-y-125 border border-white/50 rounded-full z-30 cursor-s-resize pointer-events-auto shadow-sm"
                              onPointerDown={(e) => handleCropPointerDown(e, 's')}
                              title="Kéo giãn cạnh dưới"
                            />

                            {/* Edge handle - Left */}
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-2 hover:scale-x-125 bg-indigo-600/80 hover:bg-indigo-500 border border-white/50 rounded-full z-30 cursor-w-resize pointer-events-auto shadow-sm"
                              onPointerDown={(e) => handleCropPointerDown(e, 'w')}
                              title="Kéo giãn cạnh trái"
                            />

                            {/* Edge handle - Right */}
                            <div
                              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-8 w-2 hover:scale-x-125 bg-indigo-600/80 hover:bg-indigo-500 border border-white/50 rounded-full z-30 cursor-e-resize pointer-events-auto shadow-sm"
                              onPointerDown={(e) => handleCropPointerDown(e, 'e')}
                              title="Kéo giãn cạnh phải"
                            />
                            
                            {/* Corner highlights */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-indigo-300 pointer-events-none"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-indigo-300 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-indigo-300 pointer-events-none"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-indigo-300 pointer-events-none"></div>
                          </div>
                        </div>
                      )}
                      {/* Real-time Subtitle/Caption Overlay inside video wrapper */}
                      {mode === 'translateVideo' && activeTranslation && (
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[92%] max-w-xl bg-black/90 backdrop-blur-lg px-5 py-3 border border-white/15 rounded-2xl shadow-2xl text-center pointer-events-none transition-all duration-300 z-30 animate-fade-in">
                          <p className="text-[11px] font-bold text-indigo-350 tracking-wider uppercase mb-0.5 truncate opacity-90">{activeTranslation.original}</p>
                          <p className="text-sm sm:text-base md:text-lg font-black text-white leading-snug drop-shadow-md">{activeTranslation.translatedVi}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Video Scrubbing & Easy Seeking Panel */}
              {videoUrl && (
                <div className="w-full bg-white dark:bg-[#16181d] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm transition-all animate-fade-in">
                  {/* Title and digital elapsed clock */}
                  <div className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-gray-800 pb-2.5">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wide select-none">
                      <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
                      Bộ Tua & Máy Điều Khiển Video
                    </span>
                    <div className="flex items-center gap-1 select-none">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded leading-none">
                        {videoRef.current ? formatTimeHHMMSS(videoPlayerTime) : '00:00:00'}
                      </span>
                      <span className="text-xs text-gray-400">/</span>
                      <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded leading-none">
                        {videoRef.current && isFinite(videoRef.current.duration) ? formatTimeHHMMSS(videoRef.current.duration) : '00:00:00'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Scrubbing slider */}
                    <div className="lg:col-span-6 space-y-1">
                      <input 
                        type="range"
                        min="0"
                        max={videoRef.current && isFinite(videoRef.current.duration) ? videoRef.current.duration : 100}
                        step="0.1"
                        value={videoPlayerTime}
                        onChange={(e) => {
                          const seekTime = parseFloat(e.target.value);
                          if (videoRef.current) {
                            videoRef.current.currentTime = seekTime;
                            setVideoPlayerTime(seekTime);
                          }
                        }}
                        className="w-full h-2 rounded-lg bg-gray-150 dark:bg-gray-800 accent-indigo-600 dark:accent-indigo-500 cursor-pointer appearance-none focus:outline-none transition-all hover:bg-gray-200 dark:hover:bg-gray-750"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-semibold px-0.5 select-none">
                        <span>Đầu (0%)</span>
                        <span>25%</span>
                        <span>Giữa (50%)</span>
                        <span>75%</span>
                        <span>Cuối (100%)</span>
                      </div>
                    </div>

                    {/* Speed precision control buttons */}
                    <div className="lg:col-span-6 flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                            setVideoPlayerTime(videoRef.current.currentTime);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Tua lùi 10 giây"
                      >
                        ⏪ -10s
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 2);
                            setVideoPlayerTime(videoRef.current.currentTime);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Tua lùi 2 giây"
                      >
                        ◀ -2s
                      </button>

                      {/* Play / Pause Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            if (videoRef.current.paused) {
                              videoRef.current.play().catch(() => {});
                            } else {
                              videoRef.current.pause();
                            }
                            setVideoPlayerTime(videoRef.current.currentTime);
                          }
                        }}
                        className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        {videoRef.current?.paused ? '▶ Phát' : '⏸ Tạm dừng'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 2);
                            setVideoPlayerTime(videoRef.current.currentTime);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Tua nhanh 2 giây"
                      >
                        +2s ▶
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
                            setVideoPlayerTime(videoRef.current.currentTime);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Tua nhanh 10 giây"
                      >
                        +10s ⏩
                      </button>
                    </div>
                  </div>

                  {/* Quick Seek segment timeline points */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 dark:bg-[#0f1115] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap select-none">Định vị nhanh:</span>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((ratio, idx) => {
                        const dTime = videoRef.current && isFinite(videoRef.current.duration) ? videoRef.current.duration * ratio : 0;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = dTime;
                                setVideoPlayerTime(dTime);
                              }
                            }}
                            className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-indigo-50 dark:bg-gray-800 text-gray-500 hover:text-indigo-650 dark:text-gray-400 dark:hover:text-indigo-400 rounded-lg border border-gray-200/55 dark:border-gray-700/60 transition-all whitespace-nowrap active:scale-95 shadow-sm cursor-pointer"
                          >
                            {(ratio * 100).toFixed(0)}%
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-dashed border-gray-200 dark:border-gray-800 pt-3 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!videoUrl) return;
                        const fileName = videoFile?.name || 'video_goc.mp4';
                        if (outputVideos.some(v => v.name === fileName)) {
                          addLog(`SYSTEM: ${fileName} đã có trong danh sách File Đầu Ra.`);
                          return;
                        }
                        setOutputVideos(prev => [
                          ...prev,
                          { 
                            name: fileName, 
                            url: videoUrl,
                            translateVideoResult: translateVideoResult.length > 0 ? [...translateVideoResult] : undefined,
                            srtOutput: srtOutput || undefined
                          }
                        ]);
                        addLog(`SYSTEM: Đã sao chép video gốc từ trình phát xuống danh sách File Đầu Ra.`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-green-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 animate-bounce" />
                      Đưa video gốc xuống mục File Đầu Ra
                    </button>
                  </div>
                </div>
              )}
              </div>

                  {/* Settings Panel */}
                  <div className="lg:col-span-12 lg:order-3 w-full mt-4 bg-white dark:bg-[#16181d] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-colors duration-200">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    {mode === 'split' ? t.split : mode === 'autoSubtitle' ? t.autoSubtitle : mode === 'autoVietsub' ? t.autoVietsub : mode === 'thumbnail' ? t.thumbnail : mode === 'srtCleaner' ? 'CapCut SRT Cleaner' : mode === 'chibiFrame' ? 'Khung Viền & Chibi AI' : mode === 'videoAnalysis' ? t.videoAnalysis : mode === 'translateVideo' ? 'Dịch Tiếng Trung/Hàn' : mode === 'removeText' ? 'Xóa Chữ Trên Ảnh' : t.settings}
                  </h3>
                  
                  {mode === 'translateVideo' ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-center">
                        <Languages className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-400 mb-2">Dịch Text Trên Video (Trung/Hàn)</h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                          AI sẽ tự động đọc trực tiếp màn hình video để tìm chữ Tiếng Trung/Hàn (hardsub) và dịch sang Tiếng Việt chuẩn xác nhất mà không cần file SRT.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-800">
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                            Phạm vi dịch thuật
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setTranslateRange('all')}
                              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border ${
                                translateRange === 'all'
                                  ? 'bg-indigo-600 border-indigo-650 text-white shadow-md'
                                  : 'bg-white border-gray-200 dark:bg-[#111318] dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                              }`}
                            >
                              Toàn bộ video
                            </button>
                            <button
                              onClick={() => setTranslateRange('custom')}
                              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border ${
                                translateRange === 'custom'
                                  ? 'bg-indigo-600 border-indigo-650 text-white shadow-md'
                                  : 'bg-white border-gray-200 dark:bg-[#111318] dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                              }`}
                            >
                              Chọn một đoạn
                            </button>
                          </div>

                          {translateRange === 'custom' && (
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-gray-200 dark:border-gray-800">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                                  Bắt đầu (HH:MM:SS)
                                </label>
                                <input
                                  type="text"
                                  placeholder="00:00:00"
                                  value={translateStart}
                                  onChange={(e) => setTranslateStart(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs text-center border rounded-lg bg-white dark:bg-[#111318] border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (videoRef.current) {
                                      setTranslateStart(formatTimeHHMMSS(videoRef.current.currentTime));
                                    }
                                  }}
                                  className="mt-1 w-full py-1 text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200/50 dark:border-indigo-805/45 focus:outline-none transition-all flex items-center justify-center gap-0.5 active:scale-95"
                                >
                                  <Clock className="w-2.5 h-2.5" /> Lấy từ phát video
                                </button>
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                                  Kết thúc (HH:MM:SS)
                                </label>
                                <input
                                  type="text"
                                  placeholder="00:00:10"
                                  value={translateEnd}
                                  onChange={(e) => setTranslateEnd(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs text-center border rounded-lg bg-white dark:bg-[#111318] border-gray-200 dark:border-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (videoRef.current) {
                                      setTranslateEnd(formatTimeHHMMSS(videoRef.current.currentTime));
                                    }
                                  }}
                                  className="mt-1 w-full py-1 text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200/50 dark:border-indigo-805/45 focus:outline-none transition-all flex items-center justify-center gap-0.5 active:scale-95"
                                >
                                  <Clock className="w-2.5 h-2.5" /> Lấy từ phát video
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Selector for scan frequency */}
                        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5 whitespace-nowrap">
                              <Zap className="w-4 h-4 text-amber-500" />
                              Tần suất quét khung hình
                            </label>
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold rounded text-xs font-mono border border-indigo-100 dark:border-indigo-900/40">
                              {translateStepSeconds} giây / ảnh
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                            Thời gian giãn cách chụp ảnh màn hình để AI dịch. Giãn cách càng nhỏ (ví dụ 0.5s - 1s) sẽ quét cực mịn không lo bỏ sót chữ ngắn hay phụ đề chuyển cảnh nhanh.
                          </p>
                          
                          <div className="space-y-1.5 pt-1">
                            <input 
                              type="range" 
                              min="0.2" 
                              max="10.0" 
                              step="0.1" 
                              value={translateStepSeconds} 
                              onChange={(e) => setTranslateStepSeconds(parseFloat(e.target.value))} 
                              className="w-full accent-indigo-650 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                            />
                            <div className="flex justify-between text-[9px] font-bold text-gray-400 font-mono select-none px-1">
                              <span>0.2s (Dầy nhất)</span>
                              <span>1.5s (Tiêu chuẩn)</span>
                              <span>5s</span>
                              <span>10s (Thưa)</span>
                            </div>
                          </div>
                        </div>

                        {/* Selector for translation area */}
                        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                              <Crop className="w-4 h-4 text-indigo-500" />
                              Dịch theo vùng chọn
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isCropEnabled} 
                                onChange={(e) => setIsCropEnabled(e.target.checked)} 
                                className="sr-only peer" 
                              />
                              <div className="w-8 h-4.5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                          
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Hạn chế vùng đọc của AI chỉ trong phần chứa phụ đề (tránh logo hoặc chi tiết thừa) để tăng tốc độ nhận dạng và độ chính xác dịch thuật lên tối đa.
                          </p>
                          
                          {isCropEnabled && (
                            <div className="space-y-2.5 pt-2 border-t border-dashed border-gray-200 dark:border-gray-800 text-xs">
                              {/* Left & Width */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                  <span>Trái (X): <strong>{cropXPercent}%</strong></span>
                                  <span>Rộng (W): <strong>{cropWidthPercent}%</strong></span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max={100 - cropWidthPercent} 
                                    value={cropXPercent} 
                                    onChange={(e) => setCropXPercent(parseInt(e.target.value))} 
                                    className="w-full accent-indigo-650 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                                  />
                                  <input 
                                    type="range" 
                                    min="5" 
                                    max={100 - cropXPercent} 
                                    value={cropWidthPercent} 
                                    onChange={(e) => setCropWidthPercent(parseInt(e.target.value))} 
                                    className="w-full accent-indigo-650 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                                  />
                                </div>
                              </div>
                              
                              {/* Top & Height */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                  <span>Trên (Y): <strong>{cropYPercent}%</strong></span>
                                  <span>Cao (H): <strong>{cropHeightPercent}%</strong></span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max={100 - cropHeightPercent} 
                                    value={cropYPercent} 
                                    onChange={(e) => setCropYPercent(parseInt(e.target.value))} 
                                    className="w-full accent-indigo-650 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                                  />
                                  <input 
                                    type="range" 
                                    min="5" 
                                    max={100 - cropYPercent} 
                                    value={cropHeightPercent} 
                                    onChange={(e) => setCropHeightPercent(parseInt(e.target.value))} 
                                    className="w-full accent-indigo-650 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleTranslateVideoText}
                          disabled={!videoFile || isProcessing || !loaded}
                          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-base font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-500/30 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Languages className="w-5 h-5" />}
                          TỰ ĐỘNG DỊCH TEXT VIDEO
                        </button>
                        
                        {translateVideoResult && translateVideoResult.length > 0 && (
                          <div className="mt-4 flex flex-col gap-3">
                            <button
                              onClick={() => {
                                const srtContent = translateVideoResult.map((tr, i) => `${i + 1}\n${tr.timestamp || '00:00:00,000 --> 00:00:05,000'}\n${tr.translatedVi}\n`).join('\n');
                                const blob = new Blob([srtContent], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'translated_subtitles.srt';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
                            >
                              <Download className="w-4 h-4" /> TRÍCH XUẤT FILE SRT
                            </button>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                              </span>
                              Mẹo: Bấm vào phụ đề bên dưới để tua nhanh video đến đúng mốc thời gian đó!
                            </p>

                            <div id="translate-subtitles-container" className="max-h-[400px] overflow-y-auto pr-2 gap-3 flex flex-col">
                              {translateVideoResult.map((tr, index) => {
                                const isCurrentlyActive = activeTranslationIndex === index;
                                return (
                                  <div 
                                    key={index} 
                                    id={`tr-card-${index}`}
                                    onClick={() => handleSeekVideo(tr.timestamp)}
                                    className={`p-3 rounded-xl relative group cursor-pointer transition-all active:scale-[0.98] select-none ${
                                      isCurrentlyActive 
                                        ? 'bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-500 shadow-lg ring-1 ring-indigo-500/20 scale-[1.01]' 
                                        : 'bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/5'
                                    }`}
                                    title="Bấm để tua video đến mốc này"
                                  >
                                    <div className={`absolute -top-2 left-3 px-2 py-0.5 text-[10px] font-bold rounded-md z-10 border flex items-center gap-1 ${
                                      isCurrentlyActive
                                        ? 'bg-indigo-650 text-white border-indigo-700 shadow'
                                        : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50'
                                    }`}>
                                      <Clock className="w-2.5 h-2.5" />
                                      {tr.timestamp ? tr.timestamp : `Khung hình cảnh ${index + 1}`}
                                    </div>

                                    {/* Hover Play/Seek button in top-right */}
                                    <div className={`absolute top-2.5 right-2.5 transition-opacity p-1.5 rounded-full shadow-lg text-white pointer-events-none flex items-center justify-center ${
                                      isCurrentlyActive ? 'opacity-100 bg-emerald-600' : 'opacity-0 group-hover:opacity-100 bg-indigo-600 dark:bg-indigo-500'
                                    }`}>
                                      {isCurrentlyActive ? (
                                        <span className="flex h-2.5 w-2.5 relative items-center justify-center">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1 w-1 bg-white"></span>
                                        </span>
                                      ) : (
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                      )}
                                    </div>

                                    {/* Hover/Persistent Copy Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (tr.translatedVi) {
                                          navigator.clipboard.writeText(tr.translatedVi);
                                          setCopiedTranslateIndex(index);
                                          addLog(`SYSTEM: Đã copy chữ dịch cảnh ${index + 1}: ${tr.translatedVi}`);
                                          setTimeout(() => {
                                            setCopiedTranslateIndex(null);
                                          }, 2000);
                                        }
                                      }}
                                      className={`absolute top-2.5 right-11 p-1.5 rounded-lg z-20 border transition-all active:scale-90 ${
                                        copiedTranslateIndex === index
                                          ? 'bg-emerald-500 border-emerald-600 text-white shadow-md scale-105 opacity-100 animate-in zoom-in-50 duration-200'
                                          : 'bg-white dark:bg-[#1a1d24] border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 opacity-0 group-hover:opacity-100'
                                      }`}
                                      title="Sao chép chữ Việt đã dịch"
                                    >
                                      {copiedTranslateIndex === index ? (
                                        <Check className="w-3.5 h-3.5" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <div className="pt-2.5 pr-20 flex items-center gap-3">
                                      {tr.frameImage && (
                                        <div className="w-16 h-11 sm:w-20 sm:h-14 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm relative group-hover:border-indigo-500 transition-colors flex items-center justify-center">
                                          <img src={tr.frameImage} alt="Frame" className="w-full h-full object-cover" />
                                          {/* Little play overlay indicator on the image itself */}
                                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play className="w-4 h-4 text-white fill-current" />
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5 truncate">{tr.original || 'Chữ gốc...'}</p>
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight line-clamp-2">{tr.translatedVi}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-500 text-center italic"> * Bạn có thể tải thẳng tệp SRT về để ghép vào video hoặc dùng tùy ý.</p>
                      </div>
                    </div>
                  ) : mode === 'removeText' ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-purple-50 dark:bg-purple-500/5 rounded-2xl border border-purple-100 dark:border-purple-500/20 text-center">
                        <Type className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-purple-800 dark:text-purple-400 mb-2">Xóa Chữ Trên Ảnh</h4>
                        <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                          Sử dụng mô hình AI tiên tiến để xóa sạch văn bản trên hình ảnh của bạn, giữ nguyên các chi tiết khung cảnh và chất lượng hình ảnh gốc.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Áp dụng hàng loạt</label>
                          <input 
                            type="file" 
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('image/'));
                                optimizeAndSetBatchFiles(files);
                              }
                            }}
                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/20 dark:file:text-purple-400 cursor-pointer"
                          />
                          {batchFiles.length > 0 && (
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-purple-600 font-bold">Đã chọn {batchFiles.length} ảnh.</p>
                              <button 
                                onClick={() => setBatchFiles([])}
                                className="text-[10px] text-red-500 hover:underline font-bold"
                              >
                                Xóa tất cả
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleRemoveText}
                          disabled={(!imageFile && batchFiles.length === 0) || isProcessing}
                          className="w-full py-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white rounded-xl text-base font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-purple-500/30 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          TIẾN HÀNH XÓA CHỮ (AI)
                        </button>
                      </div>
                    </div>

                  ) : mode === 'videoAnalysis' ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/20 text-center">
                        <Gauge className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">{t.videoAnalysis}</h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                          {t.videoAnalysisDesc}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/20">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-blue-600 dark:text-blue-400">
                              AI sẽ tự động trích xuất các khung hình quan trọng và âm thanh từ video để đưa ra nhận định chính xác nhất. Hỗ trợ tốt nhất cho video dưới 10 phút.
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 font-bold uppercase tracking-tight">Phân tích hàng loạt (Chọn thư mục)</label>
                          <input 
                            type="file" 
                            // @ts-ignore
                            webkitdirectory="true" 
                            directory="true"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('video/'));
                                optimizeAndSetBatchFiles(files);
                              }
                            }}
                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-900/20 dark:file:text-amber-400 cursor-pointer"
                          />
                          {batchFiles.length > 0 && (
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-amber-600 font-bold">Đã chọn {batchFiles.length} file.</p>
                              <button 
                                onClick={() => setBatchFiles([])}
                                className="text-[10px] text-red-500 hover:underline font-bold"
                              >
                                Xóa tất cả
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleVideoAnalysis}
                          disabled={(!videoFile && batchFiles.length === 0) || isProcessing || !loaded}
                          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-base font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-orange-500/30 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                          {t.startAnalysis.toUpperCase()}
                        </button>
                      </div>
                    </div>
                  ) : mode === 'chibiFrame' ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-center">
                        <UserCircle2 className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-1">Upload Hình Ảnh (Bắt Buộc)</h4>
                        <p className="text-xs text-indigo-600 dark:text-indigo-300">
                          Bạn cần tải lên hình ảnh nhân vật/phong cảnh trước để AI dựa vào đó tạo nhân vật Chibi và Khung nền video. Hỗ trợ tạo lẻ và hàng loạt.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                          <button
                            onClick={() => setChibiFrameRatio('16:9')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${chibiFrameRatio === '16:9' ? 'bg-white dark:bg-[#16181d] text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                          >
                            Khung Ngang (16:9)
                          </button>
                          <button
                            onClick={() => setChibiFrameRatio('9:16')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${chibiFrameRatio === '9:16' ? 'bg-white dark:bg-[#16181d] text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                          >
                            Khung Dọc (9:16)
                          </button>
                        </div>
                        
                        <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 font-bold uppercase tracking-tight">Tạo hàng loạt (Nhiều ảnh hoặc thư mục)</label>
                          <input 
                            type="file" 
                            // @ts-ignore
                            webkitdirectory="true" 
                            directory="true"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('image/'));
                                optimizeAndSetBatchFiles(files);
                              }
                            }}
                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/20 dark:file:text-indigo-400 cursor-pointer"
                          />
                          <p className="text-xs font-medium text-gray-400">Hoặc chọn từng file ảnh riêng lẻ:</p>
                          <input 
                            type="file" 
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = Array.from(e.target.files) as File[];
                                optimizeAndSetBatchFiles(files);
                              }
                            }}
                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400 cursor-pointer"
                          />
                          {batchFiles.length > 0 && (
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-indigo-600 font-bold">Đã chọn {batchFiles.length} file ảnh.</p>
                              <button 
                                onClick={() => setBatchFiles([])}
                                className="text-[10px] text-red-500 hover:underline font-bold"
                              >
                                Xóa tất cả
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {batchFiles.length > 0 ? (
                          <button
                            onClick={handleBatchChibiFrame}
                            disabled={isProcessing}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-base font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-purple-500/30 transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            TẠO HÀNG LOẠT KHUNG + CHIBI
                          </button>
                        ) : (
                          <button
                            onClick={handleGenerateCombo}
                            disabled={!imageFile || isProcessing}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-base font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-500/30 transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            TẠO FULL COMBO: KHUNG + CHIBI
                          </button>
                        )}

                        <div className="flex items-center gap-2 my-2">
                          <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Hoặc tạo lẻ (Chỉ xử lý 1 ảnh)</span>
                          <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleGenerateChibi}
                            disabled={(!imageFile && batchFiles.length === 0) || isProcessing}
                            className="w-full py-2.5 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {isProcessing && !chibiImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCircle2 className="w-3.5 h-3.5" />}
                            Chỉ tạo Chibi
                          </button>

                          <button
                            onClick={handleGenerateFrame}
                            disabled={(!imageFile && batchFiles.length === 0) || isProcessing}
                            className="w-full py-2.5 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {isProcessing && !bgFrameImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                            Chỉ tạo Khung
                          </button>
                        </div>
                        
                        {(chibiImage || bgFrameImage) && (
                          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <button
                              onClick={async () => {
                                if (chibiPreviewRef.current) {
                                  try {
                                    setIsProcessing(true);
                                    addLog('SYSTEM: Đang chụp ảnh màn hình trọn bộ Khung & Chibi...');
                                    const dataUrl = await toPng(chibiPreviewRef.current, { cacheBust: true, pixelRatio: 2 });
                                    const link = document.createElement('a');
                                    link.download = 'chibi-frame-composite.png';
                                    link.href = dataUrl;
                                    link.click();
                                    addLog('SYSTEM: Tải xuống thành công!');
                                  } catch (err: any) {
                                    console.error('Lỗi khi chụp màn hình', err);
                                    setError('Không thể chụp được nội dung: ' + (err.message || 'Lỗi không xác định'));
                                  } finally {
                                    setIsProcessing(false);
                                  }
                                }
                              }}
                              className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold text-center transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                            >
                              <Download className="w-4 h-4" /> Tải Xuống Khung Cảnh Hiện Tại (Sau khi kéo thả)
                            </button>
                            <div className="flex gap-2">
                              {chibiImage && (
                                <a
                                  href={chibiImage}
                                  download="chibi-character.png"
                                  className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <ImageIcon className="w-3 h-3" /> Chibi Rời
                                </a>
                              )}
                              {bgFrameImage && (
                                <a
                                  href={bgFrameImage}
                                  download="video-frame.png"
                                  className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <ImageIcon className="w-3 h-3" /> Khung Rời
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Hướng dẫn</h4>
                        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                          <li>Kéo thả ảnh vào khu vực video hoặc click nút Upload File góc trên.</li>
                          <li>Nhấn nút <b>Tạo Chibi</b> để biến nhân vật thành phong cách đáng yêu. Chibi có thể <b>kéo thả tự do</b> trên màn hình.</li>
                          <li>Nhấn <b>Tạo Khung Background</b> để tạo bức tường nền cực đẹp cho video.</li>
                          <li>Sau khi tạo, nếu có video đang play, video sẽ tự lọt vào giữa trung tâm khung.</li>
                        </ul>
                      </div>
                    </div>
                  ) : mode === 'autoVietsub' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium">{t.fullVideo}</span>
                        <button
                          onClick={() => setIsFullVideo(!isFullVideo)}
                          className={`w-10 h-5 rounded-full transition-all relative ${isFullVideo ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isFullVideo ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      {!isFullVideo && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">{t.startTime}</label>
                            <input type="text" value={startTime ?? ''} onChange={(e) => setStartTime(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">{t.endTime}</label>
                            <input type="text" value={endTime ?? ''} onChange={(e) => setEndTime(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none" />
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/20">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-2">
                          <Sparkles className="w-3 h-3" /> {t.translateToVi}
                        </p>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-blue-500" /> {t.speed}
                          </label>
                          <span className="text-xs font-bold text-blue-600">{videoSpeed}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.1"
                          value={Number.isNaN(videoSpeed) || videoSpeed === undefined || videoSpeed === null ? '' : videoSpeed} 
                          onChange={(e) => setVideoSpeed(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>0.5x</span>
                          <span>1.0x</span>
                          <span>2.0x</span>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" /> Delay (ms)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5 justify-end">
                            <div className="flex gap-1">
                              <button onClick={() => setSubtitleDelay(prev => prev - 500)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">-500</button>
                              <button onClick={() => setSubtitleDelay(prev => prev - 100)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">-100</button>
                            </div>
                            <input 
                              type="number" 
                              value={Number.isNaN(subtitleDelay) || subtitleDelay === undefined || subtitleDelay === null ? '' : subtitleDelay} 
                              onChange={(e) => setSubtitleDelay(parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-center"
                            />
                            <div className="flex gap-1">
                              <button onClick={() => setSubtitleDelay(prev => prev + 100)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">+100</button>
                              <button onClick={() => setSubtitleDelay(prev => prev + 500)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">+500</button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-purple-500" /> Sync Speed
                          </label>
                          <div className="flex items-center gap-1">
                            {[0.98, 0.99, 1.0, 1.01, 1.02].map(s => (
                              <button 
                                key={s}
                                onClick={() => setSubtitleSpeedFactor(s)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${subtitleSpeedFactor === s ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200'}`}
                              >
                                {s.toFixed(2)}x
                              </button>
                            ))}
                          </div>
                        </div>
                        <input 
                          type="range" 
                          min="0.8" 
                          max="1.2" 
                          step="0.005"
                          value={Number.isNaN(subtitleSpeedFactor) || subtitleSpeedFactor === undefined || subtitleSpeedFactor === null ? '' : subtitleSpeedFactor} 
                          onChange={(e) => setSubtitleSpeedFactor(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>

                      <div className="p-3 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/20 space-y-2">
                        <h4 className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                          <HelpCircle className="w-3 h-3" /> Mẹo khớp Sub 100%
                        </h4>
                        <div className="grid grid-cols-1 gap-2 text-[9px] text-amber-600 dark:text-amber-500">
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Lệch đều (toàn bộ):</b> Chỉnh <b>Delay</b> (+ trễ hơn, - sớm hơn).</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Càng về sau càng lệch:</b> Chỉnh <b>Sync Speed</b>.</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Sub trôi nhanh hơn video:</b> Giảm Sync Speed (về 0.99x hoặc 0.98x).</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Sub trôi chậm hơn video:</b> Tăng Sync Speed (lên 1.01x hoặc 1.02x).</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t.maxDuration}</p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed">{t.limitInfo}</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleAutoVietsub}
                        disabled={!videoFile || isProcessing || !loaded}
                        className="w-full py-2.5 mt-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/30"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isProcessing ? t.processing : t.execute}
                      </button>
                    </div>
                  ) : mode === 'autoSubtitle' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium">{t.fullVideo}</span>
                        <button
                          onClick={() => setIsFullVideo(!isFullVideo)}
                          className={`w-10 h-5 rounded-full transition-all relative ${isFullVideo ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isFullVideo ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      {!isFullVideo && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t.startTime}</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={startTime ?? ''}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                              />
                              <button 
                                onClick={() => setTimeToCurrent('start')}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-all"
                                title="Set to current time"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t.endTime}</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={endTime ?? ''}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                              />
                              <button 
                                onClick={() => setTimeToCurrent('end')}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-all"
                                title="Set to current time"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-blue-500" /> {t.speed}
                          </label>
                          <span className="text-xs font-bold text-blue-600">{videoSpeed}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.1"
                          value={Number.isNaN(videoSpeed) || videoSpeed === undefined || videoSpeed === null ? '' : videoSpeed} 
                          onChange={(e) => setVideoSpeed(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>0.5x</span>
                          <span>1.0x</span>
                          <span>2.0x</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" /> Delay (ms)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5 justify-end">
                            <div className="flex gap-1">
                              <button onClick={() => setSubtitleDelay(prev => prev - 500)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">-500</button>
                              <button onClick={() => setSubtitleDelay(prev => prev - 100)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">-100</button>
                            </div>
                            <input 
                              type="number" 
                              value={Number.isNaN(subtitleDelay) || subtitleDelay === undefined || subtitleDelay === null ? '' : subtitleDelay} 
                              onChange={(e) => setSubtitleDelay(parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-center"
                            />
                            <div className="flex gap-1">
                              <button onClick={() => setSubtitleDelay(prev => prev + 100)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">+100</button>
                              <button onClick={() => setSubtitleDelay(prev => prev + 500)} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[9px] hover:bg-gray-200">+500</button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-purple-500" /> Sync Speed
                          </label>
                          <div className="flex items-center gap-1">
                            {[0.98, 0.99, 1.0, 1.01, 1.02].map(s => (
                              <button 
                                key={s}
                                onClick={() => setSubtitleSpeedFactor(s)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${subtitleSpeedFactor === s ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200'}`}
                              >
                                {s.toFixed(2)}x
                              </button>
                            ))}
                          </div>
                        </div>
                        <input 
                          type="range" 
                          min="0.8" 
                          max="1.2" 
                          step="0.005"
                          value={Number.isNaN(subtitleSpeedFactor) || subtitleSpeedFactor === undefined || subtitleSpeedFactor === null ? '' : subtitleSpeedFactor} 
                          onChange={(e) => setSubtitleSpeedFactor(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>

                      <div className="p-3 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/20 space-y-2">
                        <h4 className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                          <HelpCircle className="w-3 h-3" /> Mẹo khớp Sub 100%
                        </h4>
                        <div className="grid grid-cols-1 gap-2 text-[9px] text-amber-600 dark:text-amber-500">
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Lệch đều (toàn bộ):</b> Chỉnh <b>Delay</b> (+ trễ hơn, - sớm hơn).</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Càng về sau càng lệch:</b> Chỉnh <b>Sync Speed</b>.</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Sub trôi nhanh hơn video:</b> Giảm Sync Speed (về 0.99x hoặc 0.98x).</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                            <p><b>Sub trôi chậm hơn video:</b> Tăng Sync Speed (lên 1.01x hoặc 1.02x).</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t.maxDuration}</p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-relaxed">{t.limitInfo}</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleAutoSubtitle}
                        disabled={!videoFile || isProcessing || !loaded}
                        className="w-full py-2.5 mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/20"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isProcessing ? t.processing : t.execute}
                      </button>
                    </div>

                  ) : mode === 'audioSeparator' ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t.audioSeparator}</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setAudioSepMode('voice')}
                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${audioSepMode === 'voice' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'}`}
                          >
                            <Mic className="w-3 h-3" /> {t.extractVoice}
                          </button>
                          <button
                            onClick={() => setAudioSepMode('music')}
                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${audioSepMode === 'music' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'}`}
                          >
                            <Music className="w-3 h-3" /> {t.extractMusic}
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/20">
                        <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                          {audioSepMode === 'voice' ? <Mic className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                          {audioSepMode === 'voice' ? t.extractVoice : t.extractMusic} (Miễn phí)
                        </h3>
                        <p className="text-[10px] text-blue-600 dark:text-blue-500 leading-relaxed">
                          {audioSepMode === 'voice' 
                            ? 'Hệ thống sử dụng AI để tách riêng giọng nói của nhân vật và loại bỏ nhạc nền.' 
                            : 'Hệ thống sử dụng thuật toán phân tách dải tần (Frequency-banded) để xóa giọng nói nhưng vẫn giữ nguyên âm trầm (Bass/Hiệu ứng nổ) và âm cao (Treble).'}
                          <br />Kết quả (Hoàn toàn miễn phí):
                          <br />• 1 file <b>MP3</b> chất lượng cao.
                          <br />• 1 file <b>Video</b> đã được xử lý âm thanh.
                        </p>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Xử lý hàng loạt (Chọn thư mục)</label>
                        <input 
                          type="file" 
                          // @ts-ignore
                          webkitdirectory="true" 
                          directory="true"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/'));
                              optimizeAndSetBatchFiles(files);
                            }
                          }}
                          className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
                        />
                        {batchFiles.length > 0 && (
                          <p className="text-[10px] text-blue-500 font-medium">Đã chọn {batchFiles.length} file.</p>
                        )}
                      </div>

                      <button
                        onClick={handleAudioSeparator}
                        disabled={(!videoFile && batchFiles.length === 0) || isProcessing || !loaded}
                        className="w-full py-2.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                        {isProcessing ? t.processing : t.execute}
                      </button>
                    </div>
                  ) : mode === 'thumbnail' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400 rounded uppercase tracking-wider">Miễn phí</span>
                          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-[10px] font-bold text-purple-600 dark:text-purple-400 rounded uppercase tracking-wider">AI Tự động</span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                          {t.generateThumbnail}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Gợi ý của bạn (Tùy chọn)</label>
                          {userPrompt && (
                            <button 
                              onClick={() => setUserPrompt('')}
                              className="text-[10px] text-blue-500 hover:underline"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                        <textarea
                          value={userPrompt ?? ''}
                          onChange={(e) => setUserPrompt(e.target.value)}
                          placeholder="Ví dụ: Thêm tiêu đề 'Bí kíp làm giàu', làm phong cách vlog..."
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[80px] resize-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Số lượng ảnh AI tạo ra</label>
                          <span className="text-xs font-bold text-blue-500">{numThumbnails} ảnh</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={Number.isNaN(numThumbnails) || numThumbnails === undefined || numThumbnails === null ? '' : numThumbnails}
                          onChange={(e) => setNumThumbnails(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">1</span>
                          <span className="text-[10px] text-gray-400">10</span>
                        </div>
                      </div>
                      {videoFile && (
                        <button
                          onClick={captureFrame}
                          className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                          <Monitor className="w-4 h-4" /> Chụp ảnh từ video
                        </button>
                      )}
                      <button
                        onClick={handleGenerateMetadata}
                        disabled={(!videoFile && !imageFile) || isProcessing || !loaded}
                        className="w-full py-2.5 mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/20"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isProcessing ? t.processing : t.execute}
                      </button>
                    </div>
                  ) : mode === 'split' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t.duration}</label>
                        <input
                          type="number"
                          min="1"
                          value={Number.isNaN(chunkDuration) || chunkDuration === undefined || chunkDuration === null ? '' : chunkDuration}
                          onChange={(e) => setChunkDuration(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          Khung hình (Aspect Ratio)
                          <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">NEW</span>
                        </label>
                        <select
                          value={splitAspectRatio ?? 'original'}
                          onChange={(e) => setSplitAspectRatio(e.target.value as any)}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                          <option value="original">Gốc (Original)</option>
                          <option value="16:9">16:9 (Ngang)</option>
                          <option value="9:16">9:16 (Dọc)</option>
                        </select>
                      </div>
                      <button
                        onClick={handleSplit}
                        disabled={!videoFile || isProcessing || !loaded}
                        className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {isProcessing ? t.processing : t.execute}
                      </button>
                    </div>
                  ) : mode === 'srtCleaner' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-500/5 rounded-xl border border-green-100 dark:border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-[10px] font-bold text-green-600 dark:text-green-400 rounded uppercase tracking-wider">CapCut Cleaner</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                          Tự động loại bỏ mọi thẻ XML/HTML và xóa dấu ngoặc vuông [] nhưng vẫn giữ nguyên chữ bên trong.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
                          <input type="checkbox" checked={cleanBrackets ?? false} onChange={(e) => setCleanBrackets(e.target.checked)} className="w-4 h-4 accent-green-600" />
                          <span className="text-xs font-medium">Xóa dấu ngoặc [] (giữ chữ bên trong)</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
                          <input type="checkbox" checked={cleanUppercase ?? false} onChange={(e) => setCleanUppercase(e.target.checked)} className="w-4 h-4 accent-green-600" />
                          <span className="text-xs font-medium">In hoa toàn bộ</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
                          <input type="checkbox" checked={cleanPunctuation ?? false} onChange={(e) => setCleanPunctuation(e.target.checked)} className="w-4 h-4 accent-green-600" />
                          <span className="text-xs font-medium">Xóa dấu câu (.,!?;)</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-[#0f1423] rounded-xl border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-100 transition-colors">
                          <input type="checkbox" checked={cleanTranslateVi ?? false} onChange={(e) => setCleanTranslateVi(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Dịch phụ đề sang Tiếng Việt (bằng AI)</span>
                        </label>
                      </div>

                      <div className="p-3 bg-gray-50 dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-700">
                        <label className="block text-xs font-medium text-gray-500 mb-2">Chọn file draft_content.json</label>
                        <input 
                          type="file" 
                          accept=".json"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleSrtCleaner(e.target.files[0]);
                            }
                          }}
                          className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/20 dark:file:text-green-400"
                        />
                      </div>

                      {srtOutput && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSrtTab('srt')}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${srtTab === 'srt' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                            >
                              SRT
                            </button>
                            <button 
                              onClick={() => setSrtTab('txt')}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${srtTab === 'txt' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                            >
                              TXT
                            </button>
                          </div>
                          <textarea 
                            value={srtOutput ?? ''}
                            readOnly
                            className="w-full h-40 p-3 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-mono outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(srtOutput);
                                addLog('SYSTEM: Đã copy nội dung vào clipboard.');
                              }}
                              className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                            <button 
                              onClick={() => {
                                const blob = new Blob([srtOutput], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${srtFileName.split('.')[0]}_cleaned.${srtTab}`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                            >
                              <Download className="w-3 h-3" /> Lưu file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div> {/* End of Settings Panel */}
                

                {/* Right Column: File Đầu Ra (Output & Logs) - Optimized size and positioning side-by-side */}
                <div className="flex flex-col gap-6 w-full lg:col-span-5 lg:order-2">
                  
                  {/* Output & Logs Panel */}
                  <div className="w-full bg-white dark:bg-[#16181d] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex flex-col transition-colors duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-gray-500" />
                      {t.output}
                    </h3>
                    <div className="flex items-center gap-3">
                      {isProcessing && (
                        <span className="text-xs font-medium text-blue-500">{Math.round(progress)}%</span>
                      )}
                      {outputVideos.length > 1 && (
                        <button
                          onClick={handleDownloadAll}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          {t.downloadAll}
                        </button>
                      )}
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4 overflow-hidden">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto min-h-[120px]">
                    {mode === 'videoAnalysis' && batchAnalysisResults.length > 0 && (
                      <div className="mb-8 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0">Video hàng loạt ({batchAnalysisResults.length})</h4>
                          <button 
                            onClick={async () => {
                              const zip = new JSZip();
                              batchAnalysisResults.forEach(res => {
                                const content = `FILE: ${res.fileName}\n\nTÓM TẮT:\n${res.summary}\n\nĐỊNH HƯỚNG:\n${res.orientation}\n\nTIÊU ĐỀ VIRAL:\n${res.titles.join('\n')}\n\nLỜI KHUYÊN:\n${res.advice}`;
                                zip.file(`${res.fileName.split('.')[0]}_analysis.txt`, content);
                              });
                              const blob = await zip.generateAsync({ type: 'blob' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Batch_Analysis_${Date.now()}.zip`;
                              a.click();
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-bold hover:bg-amber-500/20 transition-all border border-amber-500/20"
                          >
                            <Archive className="w-3 h-3" /> Xuất tất cả (ZIP)
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {batchAnalysisResults.map((res, i) => (
                            <motion.div 
                              key={i}
                              whileHover={{ y: -2 }}
                              onClick={() => setAnalysisResult(res)}
                              className={`cursor-pointer p-4 rounded-2xl border transition-all ${analysisResult?.fileName === res.fileName ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-gray-50 dark:bg-[#111318] border-gray-100 dark:border-gray-800 hover:border-amber-500/20'}`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div 
                                  className="w-12 h-12 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 flex-shrink-0 cursor-zoom-in relative group"
                                  onClick={(e) => {
                                    if (res.thumbnailUrl) {
                                      e.stopPropagation();
                                      setSelectedZoomImage({ url: res.thumbnailUrl, title: res.fileName || 'Phân Tích AI' });
                                    }
                                  }}
                                >
                                  {res.thumbnailUrl ? (
                                    <>
                                      <img src={res.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Thumb" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Maximize2 className="w-4 h-4 text-white" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="w-4 h-4 text-amber-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{res.fileName}</h5>
                                  <p className="text-[9px] text-gray-400 uppercase tracking-tighter truncate">{res.orientation}</p>
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">"{res.summary}"</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {mode === 'videoAnalysis' && analysisResult && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6 animate-in fade-in duration-500"
                      >
                        {analysisResult.fileName && (
                          <div className="flex items-center gap-3 mb-2 px-4 animate-in slide-in-from-left-4 duration-500">
                            {analysisResult.thumbnailUrl ? (
                                <div 
                                  className="w-10 h-10 rounded-md bg-white dark:bg-gray-800 shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 flex-shrink-0 cursor-zoom-in relative group"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedZoomImage({ url: analysisResult.thumbnailUrl!, title: analysisResult.fileName || 'Phân Tích AI' });
                                  }}
                                >
                                  <img src={analysisResult.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Thumb" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Maximize2 className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Đang xem: {analysisResult.fileName}</h4>
                          </div>
                        )}
                        {/* Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 rounded-3xl p-6 border border-blue-100 dark:border-blue-500/20 shadow-sm transition-colors duration-200">
                          <h4 className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-4 uppercase tracking-widest">
                            <FileText className="w-4 h-4" /> {t.videoSummary}
                          </h4>
                          <p className="text-base leading-relaxed text-gray-700 dark:text-gray-200 font-medium italic">
                            "{analysisResult.summary}"
                          </p>
                        </div>

                        {/* Orientation */}
                        <div className="bg-white dark:bg-[#111318] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
                          <h4 className="text-sm font-black text-purple-600 dark:text-purple-400 flex items-center gap-2 mb-4 uppercase tracking-widest">
                            <LayoutDashboard className="w-4 h-4" /> {t.topicOrientation}
                          </h4>
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {analysisResult.orientation}
                          </p>
                        </div>

                        {/* Viral Titles */}
                        <div className="bg-white dark:bg-[#111318] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
                          <h4 className="text-sm font-black text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-6 uppercase tracking-widest">
                            <Sparkles className="w-4 h-4" /> {t.viralTitles}
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            {analysisResult.titles.map((title, i) => (
                              <motion.div 
                                key={i} 
                                whileHover={{ x: 5 }}
                                className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-[#16181d] hover:bg-orange-50 dark:hover:bg-orange-500/5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-500/20 transition-all cursor-default"
                              >
                                <span className="font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">{title}</span>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(title);
                                    addLog(`SYSTEM: Đã sao chép tiêu đề - ${title}`);
                                  }}
                                  className="p-2.5 bg-white dark:bg-gray-800 rounded-xl text-gray-400 hover:text-orange-500 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Specialist AI Advice */}
                        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden group/advice">
                          <Zap className="absolute top-[-40px] right-[-40px] w-64 h-64 opacity-5 rotate-12 group-hover/advice:scale-110 transition-transform duration-700" />
                          <h4 className="text-xl font-black flex items-center gap-4 mb-8 relative z-10 tracking-tight">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg">
                              <HelpCircle className="w-8 h-8" />
                            </div>
                            {t.advice.toUpperCase()}
                          </h4>
                          <div className="relative z-10">
                            <div className="text-base font-medium leading-loose bg-white/10 p-8 rounded-3xl border border-white/20 backdrop-blur-md shadow-inner">
                              <p className="whitespace-pre-line">{analysisResult.advice}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {mode === 'thumbnail' && (generatedThumbnails.length > 0 || generatedTitles.length > 0 || videoFile || imageFile) ? (
                      <div className="space-y-6">
                        {/* Sub-tabs for Thumbnail Mode */}
                        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl mb-4">
                          <button
                            onClick={() => setActiveThumbnailTab('images')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                              activeThumbnailTab === 'images'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> AI Gợi ý
                          </button>
                          <button
                            onClick={() => setActiveThumbnailTab('editor')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                              activeThumbnailTab === 'editor'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" /> Chỉnh sửa (Mẫu)
                          </button>
                          <button
                            onClick={() => setActiveThumbnailTab('metadata')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                              activeThumbnailTab === 'metadata'
                                ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Tiêu đề & Mô tả
                          </button>
                        </div>

                        {activeThumbnailTab === 'editor' && (
                          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Preview Area */}
                            <div className="space-y-4">
                              {videoUrl && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[2rem] border border-gray-200 dark:border-gray-800 space-y-4 shadow-inner">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                      <Video className="w-3.5 h-3.5" /> Chọn khung hình từ Video
                                    </h5>
                                    <span className="text-[10px] font-mono text-gray-400">Kéo thanh trượt để tìm cảnh đẹp nhất</span>
                                  </div>
                                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 group shadow-lg">
                                    <video 
                                      ref={videoRef} 
                                      src={videoUrl} 
                                      controls 
                                      className="w-full h-full object-contain" 
                                    />
                                  </div>
                                  <button 
                                    onClick={captureFrame}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                                  >
                                    <Scissors className="w-4 h-4" /> DÙNG CẢNH NÀY LÀM THUMBNAIL
                                  </button>
                                </div>
                              )}

                              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 group shadow-2xl">
                                <div className="absolute top-4 left-4 z-40">
                                  <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-black rounded-full border border-white/10 uppercase tracking-widest">Xem trước Template</span>
                                </div>
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs italic gap-2">
                                    <ImageIcon className="w-8 h-8 opacity-20" />
                                    Tải ảnh hoặc video lên để xem trước
                                  </div>
                                )}
                                
                                {/* Text Layers Overlay */}
                                {textLayers.map((layer) => (
                                  <div 
                                    key={layer.id}
                                    onClick={() => setSelectedLayerId(layer.id)}
                                    className={`absolute flex items-center justify-center cursor-pointer transition-all ${selectedLayerId === layer.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''}`}
                                    style={{
                                      left: `${layer.x}%`,
                                      top: `${layer.y}%`,
                                      transform: 'translate(-50%, -50%)',
                                      width: 'auto',
                                      maxWidth: '80%',
                                      pointerEvents: 'auto'
                                    }}
                                  >
                                    <div 
                                      className="text-center break-words"
                                      style={{
                                        fontFamily: layer.font,
                                        fontSize: `${layer.size}px`,
                                        color: layer.color,
                                        fontWeight: 900,
                                        lineHeight: 1.1,
                                        textTransform: 'uppercase',
                                        padding: layer.style === 'background' ? '8px 16px' : '0',
                                        backgroundColor: layer.style === 'background' ? (layer.bgColor || '#000000') : 'transparent',
                                        borderRadius: layer.style === 'background' ? '8px' : '0',
                                        textShadow: layer.style === 'outline' 
                                          ? '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 4px 4px 10px rgba(0,0,0,0.5)'
                                          : layer.style === 'shadow'
                                          ? '4px 4px 0px rgba(0,0,0,0.8)'
                                          : layer.style === 'glow'
                                          ? `0 0 10px ${layer.color}, 0 0 20px ${layer.color}, 0 0 30px ${layer.color}`
                                          : layer.style === 'gradient'
                                          ? '2px 2px 10px rgba(0,0,0,0.5)'
                                          : 'none',
                                        background: layer.style === 'gradient' 
                                          ? `linear-gradient(to bottom, ${layer.color}, #ffaa00)` 
                                          : layer.style === 'background' ? (layer.bgColor || '#000000') : 'none',
                                        WebkitBackgroundClip: layer.style === 'gradient' ? 'text' : 'none',
                                        WebkitTextFillColor: layer.style === 'gradient' ? 'transparent' : 'inherit',
                                      }}
                                    >
                                      {layer.text}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const newId = String(Date.now());
                                    setTextLayers([...textLayers, {
                                      id: newId,
                                      text: 'TIÊU ĐỀ MỚI',
                                      font: 'Inter',
                                      color: '#ffffff',
                                      size: 40,
                                      style: 'outline',
                                      x: 50,
                                      y: 70
                                    }]);
                                    setSelectedLayerId(newId);
                                  }}
                                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                  <Plus className="w-4 h-4" /> Thêm tiêu đề
                                </button>
                                <button
                                  onClick={async () => {
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    if (!ctx || !imageUrl) return;
                                    
                                    const img = new Image();
                                    img.crossOrigin = "anonymous";
                                    img.src = imageUrl;
                                    await new Promise(resolve => img.onload = resolve);
                                    
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    ctx.drawImage(img, 0, 0);
                                    
                                    // Draw all layers
                                    textLayers.forEach(layer => {
                                      ctx.save();
                                      const scale = img.width / 1280;
                                      ctx.font = `900 ${Math.round(layer.size * scale)}px ${layer.font}`;
                                      ctx.textAlign = 'center';
                                      ctx.textBaseline = 'middle';
                                      
                                      const x = (layer.x / 100) * canvas.width;
                                      const y = (layer.y / 100) * canvas.height;
                                      
                                      if (layer.style === 'background') {
                                        const metrics = ctx.measureText(layer.text);
                                        const paddingH = 20 * scale;
                                        const paddingV = 10 * scale;
                                        const rectW = metrics.width + paddingH * 2;
                                        const rectH = (layer.size * scale) + paddingV * 2;
                                        
                                        ctx.fillStyle = layer.bgColor || '#000000';
                                        ctx.beginPath();
                                        ctx.roundRect(x - rectW / 2, y - rectH / 2, rectW, rectH, 8 * scale);
                                        ctx.fill();
                                      }

                                      if (layer.style === 'outline') {
                                        ctx.strokeStyle = '#000000';
                                        ctx.lineWidth = Math.round(10 * scale);
                                        ctx.strokeText(layer.text, x, y);
                                      } else if (layer.style === 'shadow') {
                                        ctx.shadowColor = 'rgba(0,0,0,0.8)';
                                        ctx.shadowBlur = 0;
                                        ctx.shadowOffsetX = 8 * scale;
                                        ctx.shadowOffsetY = 8 * scale;
                                      } else if (layer.style === 'glow') {
                                        ctx.shadowColor = layer.color;
                                        ctx.shadowBlur = 20 * scale;
                                        ctx.shadowOffsetX = 0;
                                        ctx.shadowOffsetY = 0;
                                        // Draw multiple times for stronger glow
                                        ctx.fillStyle = layer.color;
                                        ctx.fillText(layer.text, x, y);
                                        ctx.fillText(layer.text, x, y);
                                      }
                                      
                                      ctx.fillStyle = layer.color;
                                      ctx.fillText(layer.text, x, y);
                                      ctx.restore();
                                    });
                                    
                                    const link = document.createElement('a');
                                    link.download = 'thumbnail-edited.jpg';
                                    link.href = canvas.toDataURL('image/jpeg', 0.9);
                                    link.click();
                                  }}
                                  disabled={!imageUrl}
                                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                                >
                                  <Download className="w-4 h-4" /> Tải Thumbnail
                                </button>
                              </div>
                            </div>

                            {/* Controls Area */}
                            <div className="space-y-5 bg-gray-50 dark:bg-black/20 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 h-fit">
                              {/* Layer Selector */}
                              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {textLayers.map((layer, idx) => (
                                  <button
                                    key={layer.id}
                                    onClick={() => setSelectedLayerId(layer.id)}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                      selectedLayerId === layer.id 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    Lớp {idx + 1}
                                  </button>
                                ))}
                              </div>

                              {selectedLayerId && textLayers.find(l => l.id === selectedLayerId) && (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Nội dung chữ</label>
                                    {textLayers.length > 1 && (
                                      <button 
                                        onClick={() => {
                                          setTextLayers(textLayers.filter(l => l.id !== selectedLayerId));
                                          setSelectedLayerId(textLayers.find(l => l.id !== selectedLayerId)?.id || '');
                                        }}
                                        className="text-red-500 hover:text-red-600 p-1"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                  <input 
                                    type="text" 
                                    value={textLayers.find(l => l.id === selectedLayerId)?.text ?? ''}
                                    onChange={(e) => {
                                      setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, text: e.target.value } : l));
                                    }}
                                    className="w-full px-4 py-3 bg-white dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="Nhập chữ..."
                                  />

                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Mẫu chữ (Templates)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
                                      {[
                                        { id: 'vlog', name: 'Vlog Trắng', font: 'Montserrat', color: '#ffffff', style: 'outline' },
                                        { id: 'gaming', name: 'Gaming Vàng', font: 'Oswald', color: '#ffcc00', style: 'shadow' },
                                        { id: 'news', name: 'Tin tức Đỏ', font: 'Roboto', color: '#ff0000', style: 'outline' },
                                        { id: 'neon', name: 'Neon Hồng', font: 'Montserrat', color: '#ff00ff', style: 'glow' },
                                        { id: 'glow_blue', name: 'Phát sáng Xanh', font: 'Oswald', color: '#00ffff', style: 'glow' },
                                        { id: 'bg_black', name: 'Nền đen', font: 'Inter', color: '#ffffff', bgColor: '#000000', style: 'background' },
                                        { id: 'bg_yellow', name: 'Nền vàng', font: 'Oswald', color: '#000000', bgColor: '#ffcc00', style: 'background' },
                                        { id: 'bg_red', name: 'Nền đỏ', font: 'Roboto', color: '#ffffff', bgColor: '#ff0000', style: 'background' },
                                        { id: 'cyber', name: 'Cyber Xanh', font: 'Oswald', color: '#00ffff', style: 'gradient' },
                                        { id: 'luxury', name: 'Sang trọng', font: 'Playfair Display', color: '#ffd700', style: 'shadow' },
                                        { id: 'horror', name: 'Kinh dị', font: 'Roboto', color: '#8b0000', style: 'shadow' },
                                        { id: 'kids', name: 'Trẻ em', font: 'Montserrat', color: '#32cd32', style: 'outline' },
                                        { id: 'tech', name: 'Công nghệ', font: 'JetBrains Mono', color: '#007bff', style: 'outline' },
                                        { id: 'elegant', name: 'Thanh lịch', font: 'Playfair Display', color: '#ffb6c1', style: 'default' },
                                        { id: 'bold', name: 'Đậm chất', font: 'Inter', color: '#000000', style: 'outline' },
                                        { id: 'sun', name: 'Nắng vàng', font: 'Montserrat', color: '#ffa500', style: 'gradient' },
                                        { id: 'midnight', name: 'Nửa đêm', font: 'Inter', color: '#191970', style: 'shadow' },
                                        { id: 'forest', name: 'Rừng xanh', font: 'Be Vietnam Pro', color: '#228b22', style: 'outline' },
                                        { id: 'candy', name: 'Kẹo ngọt', font: 'Montserrat', color: '#da70d6', style: 'gradient' },
                                        { id: 'classic', name: 'Cổ điển', font: 'Roboto', color: '#ffffff', style: 'shadow' },
                                        { id: 'retro', name: 'Retro', font: 'Playfair Display', color: '#f0e68c', style: 'shadow' },
                                        { id: 'minimal', name: 'Tối giản', font: 'Be Vietnam Pro', color: '#ffffff', style: 'default' },
                                      ].map(tpl => (
                                        <button
                                          key={tpl.id}
                                          onClick={() => {
                                            setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { 
                                              ...l, 
                                              font: tpl.font, 
                                              color: tpl.color, 
                                              bgColor: (tpl as any).bgColor || l.bgColor,
                                              style: tpl.style as any
                                            } : l));
                                          }}
                                          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[9px] font-bold hover:border-blue-500 transition-all text-center flex flex-col items-center gap-1"
                                        >
                                          <span style={{ 
                                            fontFamily: tpl.font, 
                                            color: tpl.color, 
                                            fontSize: '12px',
                                            backgroundColor: tpl.style === 'background' ? (tpl as any).bgColor : 'transparent',
                                            padding: tpl.style === 'background' ? '2px 4px' : '0',
                                            borderRadius: '2px'
                                          }}>ABC</span>
                                          <span className="truncate w-full">{tpl.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Font chữ</label>
                                    <select 
                                      value={textLayers.find(l => l.id === selectedLayerId)?.font ?? 'Inter'}
                                      onChange={(e) => {
                                        setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, font: e.target.value } : l));
                                      }}
                                      className="w-full px-3 py-2.5 bg-white dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none"
                                    >
                                      <option value="Inter">Inter</option>
                                      <option value="Roboto">Roboto</option>
                                      <option value="Montserrat">Montserrat</option>
                                      <option value="Oswald">Oswald</option>
                                      <option value="Be Vietnam Pro">Be Vietnam Pro</option>
                                      <option value="Playfair Display">Playfair Display</option>
                                      <option value="JetBrains Mono">JetBrains Mono</option>
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Màu chữ</label>
                                      <input 
                                        type="color" 
                                        value={textLayers.find(l => l.id === selectedLayerId)?.color ?? '#ffffff'}
                                        onChange={(e) => {
                                          setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, color: e.target.value } : l));
                                        }}
                                        className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Màu nền (nếu có)</label>
                                      <input 
                                        type="color" 
                                        value={textLayers.find(l => l.id === selectedLayerId)?.bgColor ?? '#000000'}
                                        onChange={(e) => {
                                          setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, bgColor: e.target.value } : l));
                                        }}
                                        className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Kích thước</label>
                                      </div>
                                      <input 
                                        type="range" 
                                        min="10" 
                                        max="200" 
                                        value={textLayers.find(l => l.id === selectedLayerId)?.size ?? 60}
                                        onChange={(e) => {
                                          setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, size: Number(e.target.value) } : l));
                                        }}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Kiểu chữ</label>
                                      <select 
                                        value={textLayers.find(l => l.id === selectedLayerId)?.style ?? 'default'}
                                        onChange={(e) => {
                                          setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, style: e.target.value as any } : l));
                                        }}
                                        className="w-full px-3 py-2.5 bg-white dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none"
                                      >
                                        <option value="default">Mặc định</option>
                                        <option value="outline">Viền đen</option>
                                        <option value="shadow">Đổ bóng</option>
                                        <option value="gradient">Gradient</option>
                                        <option value="glow">Phát sáng</option>
                                        <option value="background">Có nền</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-800">
                                    <div className="flex justify-between items-center">
                                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Vị trí X</label>
                                      <span className="text-[10px] font-bold text-blue-500">{textLayers.find(l => l.id === selectedLayerId)?.x}%</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="100" 
                                      value={textLayers.find(l => l.id === selectedLayerId)?.x ?? 50}
                                      onChange={(e) => {
                                        setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, x: Number(e.target.value) } : l));
                                      }}
                                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between items-center">
                                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Vị trí Y</label>
                                      <span className="text-[10px] font-bold text-blue-500">{textLayers.find(l => l.id === selectedLayerId)?.y}%</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="100" 
                                      value={textLayers.find(l => l.id === selectedLayerId)?.y ?? 50}
                                      onChange={(e) => {
                                        setTextLayers(textLayers.map(l => l.id === selectedLayerId ? { ...l, y: Number(e.target.value) } : l));
                                      }}
                                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeThumbnailTab === 'images' && generatedThumbnails.length > 0 && (
                          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {generatedThumbnails.map((thumb, i) => (
                                <div key={i} className="relative group rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 aspect-video shadow-lg bg-gray-900">
                                  <img src={thumb} alt={`Generated Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button 
                                      onClick={() => {
                                        setImageUrl(thumb);
                                        // If we have AI suggested layers for this thumbnail index, apply them
                                        // Note: generatedThumbnails[0] is original, AI ones start from index 1
                                        // But generatedTitles/aiSuggestedLayers are 5 items (for the 5 AI variations)
                                        // So index i-1 should match
                                        if (i > 0 && aiSuggestedLayers[i-1]) {
                                          setTextLayers(aiSuggestedLayers[i-1]);
                                          setSelectedLayerId(aiSuggestedLayers[i-1][0]?.id || '');
                                        }
                                        setActiveThumbnailTab('editor');
                                      }}
                                      className="p-3 bg-blue-600/80 backdrop-blur-md rounded-full text-white hover:bg-blue-600 transition-all"
                                      title="Chỉnh sửa ảnh này"
                                    >
                                      <LayoutDashboard className="w-6 h-6" />
                                    </button>
                                    <a href={thumb} download={`thumbnail-${i + 1}.jpg`} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all" title="Tải xuống">
                                      <Download className="w-6 h-6" />
                                    </a>
                                    <button 
                                      onClick={() => setSelectedZoomImage({
                                        url: thumb, 
                                        title: `Thumbnail #${i + 1}`,
                                        desc: 'AI-generated thumbnail variation'
                                      })}
                                      className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
                                      title="Xem lớn"
                                    >
                                      <ExternalLink className="w-6 h-6" />
                                    </button>
                                  </div>
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold">
                                    #{i + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/20 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                              <p className="text-[10px] text-blue-600 dark:text-blue-400">
                                <strong>Mẹo:</strong> Nhấn vào biểu tượng <LayoutDashboard className="w-3 h-3 inline" /> trên ảnh để đưa ảnh AI vào trình chỉnh sửa và thêm tiêu đề của riêng bạn!
                              </p>
                            </div>
                            <p className="mt-4 text-[11px] text-gray-500 dark:text-gray-400 italic text-center">
                              * Bạn có thể tải xuống hoặc xem lớn để kiểm tra chi tiết. Tất cả đều miễn phí!
                            </p>
                          </div>
                        )}
                        
                        {activeThumbnailTab === 'metadata' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {generatedTitles.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold flex items-center gap-2 text-blue-500">
                                  <Sparkles className="w-4 h-4" /> {t.suggestedTitles}
                                </h4>
                                <div className="grid gap-2">
                                  {generatedTitles.map((title, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-xl group hover:border-blue-500/50 transition-all">
                                      <span className="text-sm font-medium">{title}</span>
                                      <button 
                                        onClick={() => {
                                          navigator.clipboard.writeText(title);
                                          addLog(`SYSTEM: Copied title to clipboard: ${title}`);
                                        }}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {generatedDescription && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold flex items-center gap-2 text-purple-500">
                                  <FileText className="w-4 h-4" /> {t.suggestedDescription}
                                </h4>
                                <div className="relative group">
                                  <div className="p-4 bg-gray-50 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                                    {generatedDescription}
                                  </div>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(generatedDescription);
                                      addLog('SYSTEM: Copied description to clipboard');
                                    }}
                                    className="absolute top-3 right-3 p-2 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-purple-500 transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : outputVideos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {outputVideos.map((video, idx) => {
                          const isImage = video.name.toLowerCase().endsWith('.jpg') || video.name.toLowerCase().endsWith('.png') || video.name.toLowerCase().endsWith('.jpeg') || video.name.toLowerCase().endsWith('.webp');
                          const isVideo = video.name.toLowerCase().endsWith('.mp4');
                          return (
                            <div key={idx} className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1115] overflow-hidden group hover:border-blue-500/50 transition-all">
                              {isImage ? (
                                <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800">
                                  <img src={video.url} alt={video.name} className="w-full h-full object-contain" />
                                </div>
                              ) : isVideo ? (
                                <OutputVideoPlayer 
                                  video={video} 
                                  globalTranslateVideoResult={translateVideoResult}
                                  globalSrtOutput={srtOutput}
                                />
                              ) : (
                                <div className="flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50">
                                  <FileText className="w-8 h-8 text-purple-500" />
                                </div>
                              )}
                              <div className="p-3 flex flex-col gap-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2 overflow-hidden justify-between w-full">
                                  <span className="text-xs font-semibold truncate text-gray-700 dark:text-gray-300">{video.name}</span>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 flex-wrap w-full">
                                  {(() => {
                                    const hasLocalTranslate = video.translateVideoResult && video.translateVideoResult.length > 0;
                                    const hasLocalSrt = !!video.srtOutput;
                                    const hasGlobalTranslate = translateVideoResult && translateVideoResult.length > 0;
                                    const hasGlobalSrt = !!srtOutput;

                                    if (!hasLocalTranslate && !hasLocalSrt && !hasGlobalTranslate && !hasGlobalSrt) return null;

                                    return (
                                      <button
                                        onClick={() => {
                                          let srtContent = '';
                                          if (hasLocalSrt) {
                                            srtContent = video.srtOutput!;
                                          } else if (hasLocalTranslate) {
                                            srtContent = video.translateVideoResult!.map((tr, i) => `${i + 1}\n${tr.timestamp || '00:00:00,000 --> 00:00:05,000'}\n${tr.translatedVi}\n`).join('\n');
                                          } else if (hasGlobalSrt) {
                                            srtContent = srtOutput;
                                          } else if (hasGlobalTranslate) {
                                            srtContent = translateVideoResult.map((tr, i) => `${i + 1}\n${tr.timestamp || '00:00:00,000 --> 00:00:05,000'}\n${tr.translatedVi}\n`).join('\n');
                                          }

                                          const cleanName = video.name.replace(/\.[^/.]+$/, "");
                                          const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `${cleanName}_bandich.srt`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                          addLog(`SYSTEM: Đã tải xuống file subtitle dịch của video ${video.name}`);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-extrabold border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-all cursor-pointer"
                                        title="Tải phụ đề / bản dịch dạng SRT"
                                      >
                                        <FileText className="w-3 h-3 text-indigo-500 animate-pulse" /> Tải Bản Dịch
                                      </button>
                                    );
                                  })()}
                                  <a
                                    href={video.url}
                                    download={video.name}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-extrabold bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer"
                                    title={t.download}
                                  >
                                    <Download className="w-3 h-3" /> Tải Video
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <p className="text-sm">{t.selectVideo}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Logs */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t.logs}</p>
                    <div className="h-16 overflow-y-auto text-[11px] font-mono text-gray-400 dark:text-gray-500 space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className="truncate">{log}</div>
                      ))}
                    </div>
                  </div>

                </div> {/* End of Output Panel */}
              </div> {/* End of Right Column */}
            </div> {/* End of Main Grid */}

              {/* Enhanced Image Rows Section */}
              <div className="mt-12 pt-12 border-t border-gray-200 dark:border-gray-800 pb-20">
                <HorizontalScrollRow 
                  title="Anime Inspirations" 
                  images={animeImages} 
                  onImageClick={setSelectedZoomImage} 
                  icon={Sparkles}
                />
                
                <HorizontalScrollRow 
                  title="Cinematic Landscapes" 
                  images={cinematicImages} 
                  onImageClick={setSelectedZoomImage} 
                  icon={Monitor}
                />

                <HorizontalScrollRow 
                  title="Cyberpunk Cityscapes" 
                  images={cyberpunkImages} 
                  onImageClick={setSelectedZoomImage} 
                  icon={Zap}
                />

                <HorizontalScrollRow 
                  title="Nature & Serenity" 
                  images={natureImages} 
                  onImageClick={setSelectedZoomImage} 
                  icon={ImageIcon}
                />
              </div>
            </div>
          )}
        </motion.main>
      </div>

      {/* Logo Info Modal */}
      {isLogoModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsLogoModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#16181d] rounded-3xl overflow-y-auto shadow-2xl max-w-md w-full max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square relative group">
              <img 
                src="https://plain-apac-prod-public.komododecks.com/202604/02/uu4Nzsn8egeSgvRYFg0B/image.png" 
                alt="Logo Zoom" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">Tawil Studio</h2>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-blue-500 font-semibold">
                    <Sparkles className="w-5 h-5" />
                    <span>Creative Video Solutions</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">LONG HỌ HOÀNG</h3>
                </div>
                <div className="flex gap-3">
                  <a 
                    href="https://www.facebook.com/Tawil.tk" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                    title="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a 
                    href="https://www.youtube.com/@C%E1%BA%ADuLong-0" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                    title="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Tawil Studio is a professional browser-based video editing platform. 
                Our mission is to provide high-performance tools like cutting, splitting, 
                and AI-powered subtitling directly in your browser using FFmpeg technology.
              </p>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span className="text-xs text-gray-400">v1.0.0 Stable</span>
                <button 
                  onClick={() => setIsLogoModalOpen(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-lg shadow-blue-500/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {selectedZoomImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedZoomImage(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedZoomImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full h-full overflow-hidden rounded-2xl shadow-2xl border border-white/10">
              <img 
                src={selectedZoomImage.url} 
                alt={selectedZoomImage.title} 
                className="w-full h-full object-contain max-h-[75vh]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{selectedZoomImage.title}</h2>
              <p className="text-white/60 text-lg">{selectedZoomImage.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gemini API Key Custom Configuration Modal */}
      {isApiKeyModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsApiKeyModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#16181d] rounded-3xl overflow-y-auto shadow-2xl max-w-md w-full max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                    <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 dark:text-white">API Key Cá Nhân</h3>
                    <p className="text-[10px] text-gray-500">Dành riêng cho hạn ngạch tài khoản của bạn</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Visual Status Badges to resolve user's confusion about current status */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase block">Trạng thái hiện tại</label>
                {userApiKey ? (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <div>
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Đã kích hoạt khóa cá nhân</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-mono mt-0.5">
                          AIzaSy...{userApiKey.slice(-4) || '••••'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      Đang chạy
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"></div>
                      <div>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Chưa cấu hình API Key</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Hệ thống đang chạy trên tài nguyên chung mặc định
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold">
                      Mặc định
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                  <div className="flex gap-3">
                    <div className="p-2 bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Bạn chưa có Gemini API Key?</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-450 mt-1 leading-relaxed">
                        Bạn có thể tạo một khóa API <strong>miễn phí 100%</strong> từ Google AI Studio để tự do dịch và biên tập video mà không sợ bị giới hạn lưu lượng hệ thống chung.
                      </p>
                    </div>
                  </div>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>👉 Lấy API Key miễn phí ngay tại đây</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <p className="text-xs text-gray-550 dark:text-gray-400 leading-relaxed block">
                  Khóa API của bạn được lưu <strong>mã hóa an toàn trong thiết bị (localStorage)</strong> và không bao giờ được gửi đi bất kỳ đâu ngoài máy chủ API.
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Cập nhật API Key Gemini</label>
                    <button
                      onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                      className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {isApiKeyVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {isApiKeyVisible ? "Ẩn bớt" : "Hiện khóa"}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={isApiKeyVisible ? "text" : "password"} 
                      autoComplete="new-password"
                      placeholder="Nhập khóa API bắt đầu bằng AIzaSy..." 
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value);
                        setKeyTestResult(null); // Clear test whenever key changes
                        setKeyTestError('');
                      }}
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Shield className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 block leading-tight">
                    *Mẹo: Bạn có thể thêm trực tiếp mật khóa vào URL <code className="bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded text-indigo-500 font-mono">?apiKey=AIzaSy...</code> để chia sẻ liên kết tự kích hoạt!
                  </span>
                </div>

                {/* Key verification result UI */}
                {keyTestResult && (
                  <div className={`p-3 rounded-2xl border text-xs animate-in slide-in-from-top-2 duration-200 ${
                    keyTestResult === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-800/20 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-rose-50 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-800/20 text-rose-700 dark:text-rose-400'
                  }`}>
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">{keyTestResult === 'success' ? 'Kiểm tra thành công!' : 'Kiểm tra kết nối thất bại'}</h4>
                        <p className="text-[11px] mt-0.5">
                          {keyTestResult === 'success' 
                            ? 'Khóa API hoạt động cực tốt. Chúng tôi đã tự động ghi nhận và đồng bộ khóa của bạn để dịch thuật ngay lập tức!' 
                            : keyTestError || 'Khóa này không hợp lệ, bị khóa hoặc hết quota. Hãy kiểm tra lại.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200/40 dark:border-amber-800/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Khắc phục cuộc gọi ban đầu chậm</h4>
                    <p className="text-[11px] mt-0.5">Tiến trình trích xuất hình ảnh video cần nạp dữ liệu và tải video tuần tự trong trình duyệt. Vui lòng giữ cửa sổ hoạt động và kiên nhẫn trong vài giây ban đầu.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2.5 justify-between">
                <div>
                  <button 
                    onClick={async () => {
                      if (!apiKeyInput.trim()) {
                        setKeyTestError('Vui lòng điền API Key trước khi kiểm tra.');
                        setKeyTestResult('failed');
                        return;
                      }
                      if (!apiKeyInput.trim().startsWith('AIzaSy')) {
                        setKeyTestError('API Key Gemini phải bắt đầu bằng chữ "AIzaSy"!');
                        setKeyTestResult('failed');
                        return;
                      }

                      setIsTestingKey(true);
                      setKeyTestResult(null);
                      setKeyTestError('');

                      try {
                        const testResponse = await fetch('/api/gemini/generate', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-User-API-Key': apiKeyInput.trim()
                          },
                          body: JSON.stringify({
                            model: 'gemini-3.5-flash',
                            contents: [{ parts: [{ text: "Hãy trả lời duy nhất 1 từ: 'OK'." }] }]
                          })
                        });

                        if (!testResponse.ok) {
                          const errData = await testResponse.json().catch(() => ({}));
                          throw new Error(errData.error || `HTTP ${testResponse.status}`);
                        }

                        const data = await testResponse.json();
                        if (data.text) {
                          setKeyTestResult('success');
                          const trimmed = apiKeyInput.trim();
                          window.localStorage.setItem('user_gemini_api_key', trimmed);
                          setUserApiKey(trimmed);
                        } else {
                          throw new Error("Không nhận được dữ liệu hợp lệ từ Gemini API.");
                        }
                      } catch (err: any) {
                        setKeyTestResult('failed');
                        setKeyTestError(err.message || "Không thể kết nối. Vui lòng xác thực khóa đã kích hoạt dịch vụ Generative Language.");
                      } finally {
                        setIsTestingKey(false);
                      }
                    }}
                    disabled={isTestingKey}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 border border-transparent"
                  >
                    {isTestingKey && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isTestingKey ? 'Đang kiểm tra...' : '🔑 Thử kết nối'}
                  </button>
                </div>

                <div className="flex gap-2">
                  {userApiKey && (
                    <button 
                      onClick={() => {
                        window.localStorage.removeItem('user_gemini_api_key');
                        setUserApiKey('');
                        setApiKeyInput('');
                        setIsApiKeyModalOpen(false);
                        addLog('SYSTEM: Đã khôi phục về hạn ngạch chung mặc định của hệ thống.');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer border border-transparent"
                    >
                      Khôi phục mặc định
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const trimmed = apiKeyInput.trim();
                      if (trimmed && !trimmed.startsWith('AIzaSy')) {
                        addLog('ERROR: API Key Gemini phải bắt đầu bằng "AIzaSy"!');
                        return;
                      }
                      window.localStorage.setItem('user_gemini_api_key', trimmed);
                      setUserApiKey(trimmed);
                      setIsApiKeyModalOpen(false);
                      if (trimmed) {
                        addLog('SYSTEM: Đã lưu API Key cá nhân mới của bạn!');
                      } else {
                        addLog('SYSTEM: Đã khôi phục về hạn ngạch chung mặc định của hệ thống.');
                      }
                    }}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer border border-transparent"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  ));
}
