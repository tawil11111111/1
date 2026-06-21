import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Shield, Send, Lock, Eye, EyeOff, User, AlertTriangle, Smile, Cat, Mic, Square, Trash2, X, Camera, Edit2, Download, Video, Paperclip, FileText, Pin, PinOff, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, getDoc, setDoc, doc, getDocs, updateDoc, deleteDoc, writeBatch, limit } from 'firebase/firestore';
import { MEME_STICKERS } from './lib/stickers';

interface UserProfile {
  username: string;
  avatar?: string;
  coverUrl?: string;
  bio?: string;
  createdAt?: number;
  lastActive?: number;
}

interface Message {
  text: string;
  sender: string;
  senderEmail: string;
  timestamp: number;
  id: string;
  avatar?: string;
  isSticky?: boolean;
  stickerUrl?: string; // New field for gif stickers
  audioUrl?: string; // New field for voice messages
  imageUrl?: string; // Custom uploaded image
  videoUrl?: string; // Custom uploaded video
  fileUrl?: string;  // Custom uploaded file
  fileName?: string;
  fileSize?: string;
  reactions?: Record<string, string[]>;
}

export const SecureChat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [room, setRoom] = useState('global');
  const [roomPinInput, setRoomPinInput] = useState('');
  const [isVideoCalling, setIsVideoCalling] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{name: string, owner?: string} | null>(null);

  const EMOJIS = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '❤️', '🔥', '🎉', '💩', '👻', '🤡', '👽', '🤖', '💀', '👀', '💯'];
  
  const [isJoined, setIsJoined] = useState(false);
  const [hasFocus, setHasFocus] = useState(true);
  const [isHovering, setIsHovering] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editProfileError, setEditProfileError] = useState('');
  const [deviceAccount, setDeviceAccount] = useState<string | null>(null);
  
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [activeRooms, setActiveRooms] = useState<{name: string, lastActive: number}[]>([]);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [dismissNotificationBanner, setDismissNotificationBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert("Trình duyệt này không hỗ trợ thông báo hệ thống.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        const testNotify = new Notification("Đã bật thông báo thành công! 🎉", {
          body: "Bạn sẽ nhận được thông báo tin nhắn mới tức thời ngay khi có tin nhắn từ người khác!",
          icon: avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=SecureNode",
          tag: "secure-node-test"
        });
        // Play success tone
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          }
        } catch (e) {}
      } else if (permission === 'denied') {
        alert("Bạn đã từ chối quyền thông báo. Vui lòng bật lại trong cài đặt trang web của trình duyệt.");
      }
    } catch (e) {
      console.error("Yêu cầu quyền thông báo thất bại:", e);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  // Initialize Socket and listeners
  useEffect(() => {
    if (!isJoined) return;

    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    // Listen to messages from Firestore (Real-time)
    const q = query(
      collection(db, 'messages'),
      where('room', '==', room),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);
    });

    // Listen to users for presence
    const userUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers: Record<string, UserProfile> = {};
      snapshot.docs.forEach(doc => {
        allUsers[doc.id] = { username: doc.id, ...doc.data() } as UserProfile;
      });
      setUsersMap(allUsers);
    });

    const roomUnsubscribe = onSnapshot(doc(db, 'rooms', room), (docSnap) => {
      if (docSnap.exists()) {
        setRoomInfo(docSnap.data() as any);
      }
    });

    return () => {
      newSocket.disconnect();
      unsubscribe();
      userUnsubscribe();
      roomUnsubscribe();
    };
  }, [isJoined, room]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Security: Screenshot warning
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable PrintScreen, Ctrl+P, Ctrl+S, etc.
      if (e.key === 'PrintScreen' || 
          (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u')) || 
          (e.metaKey && (e.key === 'p' || e.key === 's' || e.shiftKey)) || 
          (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        
        if (isJoined && room && username) {
             addDoc(collection(db, 'messages'), {
                text: `⚠️ CẢNH BÁO: ${username} có dấu hiệu chụp màn hình / in trang!`,
                sender: 'SYSTEM',
                senderEmail: 'system',
                room,
                timestamp: Date.now(),
                isSticky: false,
                avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=SYSTEM"
             }).catch(()=>{});
        }
        
        alert("Thao tác bị giới hạn.");
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isJoined, room, username]);

  // Heartbeat Presence
  useEffect(() => {
    if (!isJoined || !username) return;

    const updatePresence = async () => {
      try {
        await setDoc(doc(db, 'users', username), { lastActive: Date.now() }, { merge: true });
      } catch (err) {}
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // 30 seconds
    
    // Handle unmount / close window
    const handleUnload = () => {
      // Best-effort to offline the user when closing tab
      setDoc(doc(db, 'users', username), { lastActive: 0 }, { merge: true }).catch(() => {});
    };
    
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      setDoc(doc(db, 'users', username), { lastActive: 0 }, { merge: true }).catch(() => {});
    };
  }, [isJoined, username]);

  // Update watermark position
  useEffect(() => {
    if (!isJoined) return;
    const interval = setInterval(() => {
      if (watermarkRef.current) {
        const x = Math.random() * 80;
        const y = Math.random() * 80;
        watermarkRef.current.style.transform = `translate(${x}vw, ${y}vh) rotate(-15deg)`;
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isJoined]);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 underline hover:opacity-80 break-all cursor-pointer font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const isUserOnline = (uName: string) => {
    const user = usersMap[uName];
    if (!user || !user.lastActive) return false;
    // Consider online if active within the last 60 seconds
    return Date.now() - user.lastActive < 60000;
  };

  const toggleVideoCall = async () => {
    const nextState = !isVideoCalling;
    setIsVideoCalling(nextState);
    
    if (nextState && isJoined && room && username) {
      // Khi bắt đầu call, gửi 1 tin nhắn hệ thống để mọi người biết
      try {
        await addDoc(collection(db, 'messages'), {
          text: `📞 ${username} đã bắt đầu cuộc gọi video. Nhấn nút Call ở góc trên để tham gia cùng nhé!`,
          sender: 'SYSTEM',
          senderEmail: 'system',
          room,
          timestamp: Date.now(),
          isSticky: false,
          avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CALL_NOTIFY"
        });
      } catch (e) {
        console.error("Gửi thông báo call thất bại:", e);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (!isCancelledRef.current) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64AudioMessage = reader.result as string;
            if (base64AudioMessage.length > 900000) {
              alert("Bản ghi âm quá dài. Vui lòng thử lại đoạn ngắn hơn.");
              return;
            }
            await addDoc(collection(db, 'messages'), {
              text: '',
              sender: username,
              senderEmail: deviceAccount || 'anonymous',
              room,
              timestamp: Date.now(),
              avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`, 
              isSticky: false,
              audioUrl: base64AudioMessage
            });
          };
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone permission denied:", err);
      alert("Lỗi: Không thể truy cập micro. Hãy kiểm tra quyền trên trình duyệt.");
    }
  };

  const stopRecording = (cancel = false) => {
    isCancelledRef.current = cancel;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const openProfile = async (targetUsername: string) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', targetUsername));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setViewingProfile({
          username: targetUsername,
          avatar: data.avatar,
          coverUrl: data.coverUrl,
          bio: data.bio,
          createdAt: data.createdAt
        });
      } else {
        setViewingProfile({ username: targetUsername });
      }
    } catch(err) {
      console.error(err);
    }
  };

  const startEditingProfile = () => {
    if (viewingProfile) {
      setEditUsername(viewingProfile.username);
      setEditBio(viewingProfile.bio || '');
      setEditCover(viewingProfile.coverUrl || '');
      setEditAvatar(viewingProfile.avatar || '');
      setEditProfileError('');
      setIsEditingProfile(true);
    }
  };

  const saveProfile = async () => {
    setEditProfileError('');
    try {
      const newUName = editUsername.trim();
      if (!newUName) {
        setEditProfileError('Tên hiển thị không được để trống.');
        return;
      }

      if (newUName !== username) {
        const newUserRef = doc(db, 'users', newUName);
        const userSnap = await getDoc(newUserRef);
        if (userSnap.exists()) {
          setEditProfileError('Tên đã được đăng ký! Vui lòng chọn tên khác.');
          return;
        }

        // 1. Get current user's token and data
        const currentToken = localStorage.getItem(`chat_token_${username}`);
        const oldUserSnap = await getDoc(doc(db, 'users', username));
        const oldData = oldUserSnap.exists() ? oldUserSnap.data() : {};

        // 2. Create new user doc
        await setDoc(newUserRef, {
          ...oldData,
          token: currentToken,
          avatar: editAvatar,
          coverUrl: editCover,
          bio: editBio,
          createdAt: oldData.createdAt || Date.now(),
          lastActive: Date.now()
        });

        // 3. Update all past messages using batch
        const batch = writeBatch(db);
        const msgsQuery = query(collection(db, 'messages'), where('sender', '==', username));
        const msgsSnap = await getDocs(msgsQuery);
        
        msgsSnap.docs.forEach((msgDoc) => {
          batch.update(msgDoc.ref, { sender: newUName });
        });

        // 4. Delete old user doc
        batch.delete(doc(db, 'users', username));
        
        // Remove old device account lock if we are creating a new one? 
        // NO, the user is still on the same device. Just update the primary account setting.
        
        await batch.commit();

        // 5. Update local storage
        localStorage.removeItem(`chat_token_${username}`);
        localStorage.setItem(`chat_token_${newUName}`, currentToken || '');
        localStorage.setItem('chat_username', newUName);
        localStorage.setItem('primary_device_account', newUName);
        setDeviceAccount(newUName);
        
        setUsername(newUName);
        setAvatar(editAvatar);
        setViewingProfile({ username: newUName, avatar: editAvatar, coverUrl: editCover, bio: editBio });
      } else {
        // Just update existing profile
        await setDoc(doc(db, 'users', username), {
          avatar: editAvatar,
          coverUrl: editCover,
          bio: editBio
        }, { merge: true });
        
        setUsername(newUName); // Cập nhật username state nếu cần đồng bộ
        setAvatar(editAvatar);
        setViewingProfile(prev => prev ? { ...prev, avatar: editAvatar, coverUrl: editCover, bio: editBio } : null);
      }
      setIsEditingProfile(false);
    } catch(err) {
      console.error(err);
      setEditProfileError('Có lỗi xảy ra khi lưu hồ sơ.');
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = type === 'cover' ? 800 : 200;
          const MAX_HEIGHT = type === 'cover' ? 400 : 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (type === 'avatar') setEditAvatar(dataUrl);
          else setEditCover(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDeviceAccount = () => {
    if (confirm("Xác nhận: Bạn có chắc chắn muốn đăng xuất tài khoản hiện tại trên trình duyệt này để chuyển sang tài khoản khác không?")) {
      const oldAccount = localStorage.getItem('primary_device_account');
      if (oldAccount) {
        localStorage.removeItem(`chat_token_${oldAccount}`);
        localStorage.removeItem(`chat_password_${oldAccount}`);
      }
      localStorage.removeItem('primary_device_account');
      localStorage.removeItem('chat_username');
      setDeviceAccount(null);
      setUsername('');
      setUserPassword('');
      setAvatar('');
    }
  };

  const checkAndJoinRoom = async (uName: string, selectedAvatar: string, joinRoomCode: string, typedPassword?: string) => {
    setJoinError('');
    if (!uName.trim()) return;
    
    setIsJoining(true);
    try {
      const activePassword = typedPassword !== undefined ? typedPassword : userPassword;
      const userRef = doc(db, 'users', uName);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.password) {
          if (userData.password !== activePassword) {
            setJoinError('Mật khẩu của tài khoản hiển thị không chính xác! Vui lòng nhập đúng mật khẩu để đăng nhập.');
            setIsJoining(false);
            return;
          }
        } else {
          // If the profile does not have a password field (legacy account), claiming it now
          if (activePassword.length < 4) {
            setJoinError('Tài khoản này chưa có mật khẩu bảo vệ. Vui lòng đặt mật khẩu mới (tối thiểu 4 ký tự) để bảo vệ tài khoản này.');
            setIsJoining(false);
            return;
          }
          await setDoc(userRef, { password: activePassword }, { merge: true });
        }
        
        // Save security credentials in localStorage
        localStorage.setItem(`chat_password_${uName}`, activePassword);
        localStorage.setItem('primary_device_account', uName);
        setDeviceAccount(uName);

        // update avatar if newly uploaded
        if (selectedAvatar && selectedAvatar !== userData.avatar) {
          await setDoc(userRef, { avatar: selectedAvatar }, { merge: true });
        } else if (!selectedAvatar && userData.avatar) {
          setAvatar(userData.avatar);
        }
      } else {
        // Create new user with password
        if (activePassword.length < 4) {
          setJoinError('Vui lòng tạo mật khẩu tối thiểu 4 ký tự để bảo vệ tài khoản mới!');
          setIsJoining(false);
          return;
        }
        const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const finalAvatar = selectedAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uName}`;
        await setDoc(userRef, {
          token: newToken,
          password: activePassword,
          avatar: finalAvatar,
          createdAt: Date.now()
        });
        localStorage.setItem(`chat_token_${uName}`, newToken);
        localStorage.setItem(`chat_password_${uName}`, activePassword);
        localStorage.setItem('primary_device_account', uName);
        setDeviceAccount(uName);
        setAvatar(finalAvatar);
      }

      // Record room activity and set ownership + PIN logic
      const roomRef = doc(db, 'rooms', joinRoomCode);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        if (roomData.pin && roomData.pin !== roomPinInput) {
           setJoinError('Mã PIN phòng không chính xác!');
           setIsJoining(false);
           return;
        }
        await setDoc(roomRef, { lastActive: Date.now() }, { merge: true });
      } else {
        if (!roomPinInput) {
           setJoinError('Mã PIN không được để trống khi tạo phòng mới!');
           setIsJoining(false);
           return;
        }
        await setDoc(roomRef, {
          name: joinRoomCode,
          owner: uName,
          pin: roomPinInput,
          lastActive: Date.now()
        });
      }

      localStorage.setItem('chat_username', uName);
      setRoom(joinRoomCode);
      setIsJoined(true);
      
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('room', joinRoomCode);
        window.history.replaceState({}, '', url.toString());
      } catch (e) {
        console.error("Failed to update URL:", e);
      }
    } catch (err) {
      console.error(err);
      setJoinError('Lỗi kết nối kiểm tra tên. Vui lòng thử lại!');
    }
    setIsJoining(false);
  };

  const joinRoom = () => checkAndJoinRoom(username, avatar, room);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 150;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setAvatar(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Parse room from URL & Load user data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const initialRoom = roomParam || 'global';
    if (roomParam) {
      setRoom(roomParam);
    }
    
    // Manage device account
    let primary = localStorage.getItem('primary_device_account');
    const savedUsername = localStorage.getItem('chat_username');
    
    // Migration for older users
    if (!primary && savedUsername) {
      localStorage.setItem('primary_device_account', savedUsername);
      primary = savedUsername;
    }

    const activeUser = primary || savedUsername || '';
    const savedPassword = activeUser ? (localStorage.getItem(`chat_password_${activeUser}`) || '') : '';

    if (primary) {
      setDeviceAccount(primary);
      setUsername(primary);
      if (savedPassword) {
        setUserPassword(savedPassword);
      }
    } else if (savedUsername) {
      setUsername(savedUsername);
      if (savedPassword) {
        setUserPassword(savedPassword);
      }
    }
    
    // Auto join if possible
    if (activeUser) {
      checkAndJoinRoom(activeUser, avatar, initialRoom, savedPassword);
    }

    // Lắng nghe danh sách phòng hoạt động
    const roomsQuery = query(collection(db, 'rooms'), orderBy('lastActive', 'desc'), limit(10));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        name: doc.id,
        lastActive: doc.data().lastActive
      }));
      setActiveRooms(roomsData);
    });

    return () => unsubscribeRooms();
  }, []);

  const leaveRoom = () => {
    setIsJoined(false);
    // Xóa room param khỏi URL để không tự động join lại phòng cũ nếu load lại trang
    window.history.pushState({}, '', window.location.pathname);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/?room=${room}`;
    navigator.clipboard.writeText(link);
    alert('Đã sao chép link phòng!');
  };

  const sendSticker = async (stickerUrl: string) => {
    if (isJoined) {
      await addDoc(collection(db, 'messages'), {
        text: '',
        sender: username,
        senderEmail: 'anonymous',
        room,
        timestamp: Date.now(),
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`, 
        isSticky: false,
        stickerUrl: stickerUrl
      });
      // Record room activity
      await setDoc(doc(db, 'rooms', room), { name: room, lastActive: Date.now() }, { merge: true });
      setShowStickerPicker(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 700000) {
      alert("Tệp quá lớn. Vì chế độ bảo mật ẩn danh và giới hạn dung lượng, vui lòng chọn tệp/ảnh/video dưới 700KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      const payload: any = {
        text: '',
        sender: username,
        senderEmail: 'anonymous',
        room,
        timestamp: Date.now(),
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`, 
        isSticky: false,
      };

      if (isImage) {
        payload.imageUrl = base64Str;
      } else if (isVideo) {
        payload.videoUrl = base64Str;
      } else {
        payload.fileUrl = base64Str;
        payload.fileName = file.name;
        payload.fileSize = (file.size / 1024).toFixed(1) + ' KB';
      }

      await addDoc(collection(db, 'messages'), payload);
      await setDoc(doc(db, 'rooms', room), { name: room, lastActive: Date.now() }, { merge: true });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isJoined) {
      await addDoc(collection(db, 'messages'), {
        text: input,
        sender: username,
        senderEmail: 'anonymous',
        room,
        timestamp: Date.now(),
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`, 
        isSticky: false,
      });
      // Record room activity
      await setDoc(doc(db, 'rooms', room), { name: room, lastActive: Date.now() }, { merge: true });
      setInput('');
      setShowEmojiPicker(false);
    }
  };

  const clearChatHistory = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử chat của phòng này không? Hành động này không thể hoàn tác.")) return;
    try {
      const q = query(collection(db, 'messages'), where('room', '==', room));
      const snaps = await getDocs(q);
      
      // Chunk batches to avoid >500 limits if needed (simple loop for now)
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      
      snaps.docs.forEach((d) => {
          currentBatch.delete(d.ref);
          count++;
          if (count === 490) {
              batches.push(currentBatch.commit());
              currentBatch = writeBatch(db);
              count = 0;
          }
      });
      if (count > 0) batches.push(currentBatch.commit());
      
      await Promise.all(batches);
      
      // Also send a system message stating it was cleared
      await addDoc(collection(db, 'messages'), {
        text: 'Chủ phòng đã dọn dẹp toàn bộ lịch sử chat.',
        sender: 'SYSTEM',
        senderEmail: 'system',
        room,
        timestamp: Date.now(),
        isSticky: true,
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=SYSTEM"
      });
    } catch(err) {
       console.error("Clear chat error", err);
       alert("Lỗi khi xóa lịch sử chat.");
    }
  };

  const recallMessage = async (msgId: string, timestamp: number) => {
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      alert("Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ sau khi gửi.");
      return;
    }
    
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn thu hồi tin nhắn này?");
    if (!confirmDelete) return;

    try {
      await updateDoc(doc(db, 'messages', msgId), {
         text: '[Tin nhắn đã bị thu hồi]',
         imageUrl: null,
         videoUrl: null,
         audioUrl: null,
         stickerUrl: null,
         fileUrl: null
      } as any);
    } catch (err) {
      console.error("Lỗi khi thu hồi:", err);
      // Fallback in case of old messages or rules requiring delete
      try {
         await deleteDoc(doc(db, 'messages', msgId));
      } catch (e) {
         alert("Lỗi: Không thể thu hồi (Không đủ quyền hoặc sự cố kết nối).");
      }
    }
  };

  const togglePinMessage = async (msgId: string, currentSticky?: boolean) => {
    try {
      await updateDoc(doc(db, 'messages', msgId), { isSticky: !currentSticky });
    } catch (err) {
      console.error("Lỗi khi ghim/bỏ ghim:", err);
      alert("Không thể ghim/bỏ ghim tin nhắn. Có thể do lỗi mạng hoặc không có quyền.");
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!isJoined) return;
    try {
      const msgRef = doc(db, 'messages', msgId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const data = msgSnap.data();
        const currentReactions: Record<string, string[]> = data.reactions || {};
        const usersForEmoji = currentReactions[emoji] || [];
        
        if (usersForEmoji.includes(username)) {
          currentReactions[emoji] = usersForEmoji.filter((u: string) => u !== username);
          if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = [...usersForEmoji, username];
        }
        
        await updateDoc(msgRef, {
          reactions: currentReactions
        });
      }
    } catch (err) {
      console.error("Lỗi thả cảm xúc:", err);
    }
  };

  const pinnedMessages = messages.filter(m => m.isSticky).sort((a, b) => b.timestamp - a.timestamp);

  // Sort messages: only by timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    return a.timestamp - b.timestamp;
  });

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full overflow-y-auto bg-gray-50 dark:bg-[#0f1115] p-3 sm:p-6 relative">
        {isInstallable && (
          <button 
            onClick={handleInstallClick}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95 z-50"
          >
            <Download className="w-4 h-4" /> Install App
          </button>
        )}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-[#16181d] rounded-2xl p-5 sm:p-8 my-auto shadow-2xl border border-gray-200 dark:border-gray-800"
        >
          <div className="flex flex-col items-center mb-5 text-center">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">Secure Node</h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Kết nối mã hóa an toàn &amp; lưu trữ đám mây</p>
            
            {/* Elegant features pill list */}
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                🖼️ Thay đại diện
              </span>
              <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/10 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                🔒 Đăng nhập bảo vệ
              </span>
              <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/10 rounded-full border border-purple-100 dark:border-purple-900/30">
                💬 Đồng bộ tin nhắn
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {deviceAccount ? (
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative group w-11 h-11 rounded-xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-800 shrink-0 bg-gray-150 dark:bg-gray-800 flex items-center justify-center cursor-pointer">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] text-white font-bold leading-none uppercase">Đổi</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">Thiết bị đã khớp</span>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{deviceAccount}</h4>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={resetDeviceAccount}
                  className="shrink-0 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 rounded-lg text-[10px] font-black transition-all"
                >
                  Đăng xuất 🔓
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative group w-11 h-11 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] text-white font-bold uppercase">Avatar</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={username ?? ''}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên hiển thị (Username)..."
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0a0c10] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1.5 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="relative w-full">
              <input 
                type={isPasswordVisible ? "text" : "password"}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder={deviceAccount ? "•••••••• (Mật khẩu được lưu trữ tự động điền)" : "Mật khẩu bảo vệ (Tối thiểu 4 ký tự)..."}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0a0c10] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1.5 focus:ring-blue-500 outline-none transition-all pr-10 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Room Settings Division */}
            <div className="border-t border-gray-150 dark:border-gray-800/80 my-3.5 pt-3.5 space-y-2.5">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Khu vực phòng chat</span>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  value={room ?? ''}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Mã phòng (VD: global)..."
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#0a0c10] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1.5 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-bold"
                />
                <input 
                  type="password" 
                  value={roomPinInput ?? ''}
                  onChange={(e) => setRoomPinInput(e.target.value)}
                  placeholder="PIN bảo mật phòng..."
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#0a0c10] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-1.5 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-bold"
                />
              </div>
            </div>
            
            {joinError && (
              <p className="text-red-500 text-xs font-semibold text-center mt-1 animate-pulse">{joinError}</p>
            )}

            <button 
              onClick={joinRoom}
              disabled={isJoining}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center mt-4"
            >
              {isJoining ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Vào Phòng Chat 🚀'
              )}
            </button>
            
            {/* Active Rooms List */}
            {activeRooms.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                  <span>🔥 Đang hoạt động ({activeRooms.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeRooms.map((r) => (
                    <button
                      key={r.name}
                      onClick={() => setRoom(r.name)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors uppercase tracking-wider"
                    >
                      #{r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col h-full bg-gray-100 dark:bg-[#0a0c10] transition-all duration-500 user-select-none`} style={{ userSelect: 'none' }}>
      
      {/* Dynamic Watermark - Protects against physical physical camera photos */}
      <div 
        ref={watermarkRef}
        className="fixed pointer-events-none text-red-500/10 dark:text-white/5 font-black text-6xl whitespace-nowrap z-50 transition-all duration-1000 ease-in-out uppercase"
        style={{ transform: 'translate(10vw, 10vh) rotate(-15deg)' }}
      >
        {username} - {new Date().toLocaleTimeString()}
      </div>

      {/* Header */}
      <div className="h-14 sm:h-16 px-4 sm:px-6 bg-white dark:bg-[#16181d] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="font-bold text-xs sm:text-sm tracking-widest uppercase truncate max-w-[100px] sm:max-w-xs">{room}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {roomInfo?.owner === username && (
             <button onClick={clearChatHistory} title="Chỉ Chủ Phòng mới thấy nút này" className="hidden sm:flex text-[10px] sm:text-xs bg-red-600 outline outline-1 outline-red-800 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-red-700 transition-all font-bold items-center gap-1">
               <Trash2 className="w-3 h-3" /> Xóa lịch sử
             </button>
          )}
          <button onClick={toggleVideoCall} className={`flex items-center justify-center gap-1 text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all font-semibold ${isVideoCalling ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 led-glow-indigo'}`}>
             <Video className="w-3 h-3" /> {isVideoCalling ? 'Tắt' : 'Call'}
          </button>
          {isInstallable && (
            <button onClick={handleInstallClick} className="hidden sm:flex items-center justify-center gap-1 text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 px-3 py-1.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-all font-semibold">
              <Download className="w-3 h-3" /> Install
            </button>
          )}
          <button onClick={() => openProfile(username)} className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] sm:rounded-[12px] bg-gray-200 dark:bg-gray-800 transition-all focus:outline-none ${isUserOnline(username) ? 'led-glow' : 'border-2 border-gray-300 dark:border-gray-700 hover:opacity-80'}`}>
            <img src={avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`} alt="My profile" className="w-full h-full object-cover rounded-[8px] sm:rounded-[10px]" />
          </button>
          <button onClick={copyRoomLink} className="text-[10px] sm:text-xs bg-gray-200 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-gray-300 transition-all">
            Copy
          </button>
          <button onClick={leaveRoom} className="text-[10px] sm:text-xs bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-red-200 dark:hover:bg-red-900/60 transition-all font-semibold">
            Thoát
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative z-10">
        
        {isVideoCalling && (
          <div className="w-full lg:w-[65%] xl:w-[70%] h-[80vh] md:h-full lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 bg-black shrink-0 relative transition-all duration-300">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button 
                onClick={() => setIsVideoCalling(false)} 
                className="bg-red-600/90 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-xs font-bold backdrop-blur-md transition-all shadow-xl flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Rời Call
              </button>
            </div>
            <iframe 
              src={`https://meet.jit.si/AIS_SecureNode_${room}#config.prejoinPageEnabled=false&userInfo.displayName="${username}"`} 
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="flex-1 w-full h-full border-none"
            />
          </div>
        )}

        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-100 dark:bg-[#0a0c10] relative">
          
          {notificationPermission !== 'granted' && !dismissNotificationBanner && (
            <div className="bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent border-b border-rose-500/20 px-4 py-3 flex items-center justify-between gap-4 z-20 shrink-0 select-none animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-red-500/10 text-red-500 p-2 rounded-xl shrink-0">
                  <Bell className="w-4 h-4 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Bật thông báo đẩy (như Zalo / Messenger)</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Nhận tin nhắn trên máy tính/điện thoại ngay khi có người khác nhắn tin!</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={requestNotificationPermission}
                  className="bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all shadow-md shadow-red-500/20 uppercase tracking-wider"
                >
                  Bật thông báo
                </button>
                <button 
                  onClick={() => setDismissNotificationBanner(true)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          
          {pinnedMessages.length > 0 && (
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-2 flex flex-col gap-1 z-20 sticky top-0 shrink-0 shadow-sm max-h-[30vh] overflow-y-auto">
              {pinnedMessages.map((msg) => (
                <div key={`pinned-${msg.id}`} className="flex items-start gap-2 bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg relative group/pin cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                  onClick={() => {
                    document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  <Pin className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate opacity-80">{msg.sender === 'SYSTEM' ? 'Hệ thống' : msg.sender}</span>
                      <span className="text-[10px] opacity-50">{formatTime(msg.timestamp)}</span>
                    </div>
                    {msg.text ? (
                      <p className="text-sm truncate opacity-90">{renderTextWithLinks(msg.text)}</p>
                    ) : msg.imageUrl ? (
                       <span className="text-sm opacity-90 italic">[Hình ảnh]</span>
                    ) : msg.videoUrl ? (
                       <span className="text-sm opacity-90 italic">[Video]</span>
                    ) : msg.fileUrl ? (
                       <span className="text-sm opacity-90 italic">[Tệp đính kèm] {msg.fileName}</span>
                    ) : msg.stickerUrl ? (
                       <span className="text-sm opacity-90 italic">[Nhãn dán]</span>
                    ) : msg.audioUrl ? (
                       <span className="text-sm opacity-90 italic">[Tin nhắn thoại]</span>
                    ) : null}
                  </div>
                  {msg.sender !== 'SYSTEM' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePinMessage(msg.id, msg.isSticky); }}
                      className="opacity-0 group-hover/pin:opacity-100 p-1 text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-all"
                      title="Bỏ ghim"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div 
            ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scroll-smooth overflow-x-hidden"
      >
        {sortedMessages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, x: msg.sender === username ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={msg.id} 
            id={`msg-${msg.id}`}
            className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'} ${msg.isSticky ? 'order-first' : ''} group/message`}
          >
            <div className="flex items-center gap-2 mb-1 px-2">
              <button 
                onClick={() => togglePinMessage(msg.id, msg.isSticky)} 
                title={msg.isSticky ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                className={`opacity-100 sm:opacity-0 group-hover/message:opacity-100 flex items-center justify-center p-1 rounded transition-opacity ${msg.isSticky ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 opacity-100' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                {msg.isSticky ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
              {(msg.sender === username || msg.senderEmail === deviceAccount) && Date.now() - msg.timestamp <= 24 * 60 * 60 * 1000 && (
                <button 
                  onClick={() => recallMessage(msg.id, msg.timestamp)} 
                  title="Thu hồi tin nhắn"
                  className="opacity-100 sm:opacity-0 group-hover/message:opacity-100 flex items-center justify-center p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <div className="relative group/reaction">
                <button 
                  title="Thả cảm xúc"
                  className="opacity-100 sm:opacity-0 group-hover/message:opacity-100 flex items-center justify-center p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                >
                  <Smile className="w-3 h-3" />
                </button>
                <div className="absolute top-[-35px] left-1/2 -translate-x-1/2 hidden group-hover/reaction:flex bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-1 items-center gap-1 z-50 animate-in fade-in zoom-in duration-200">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button 
                      key={emoji}
                      onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                      className="w-7 h-7 flex items-center justify-center hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                    >
                      <span className="text-[16px] leading-none">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => openProfile(msg.sender)} 
                className={`relative w-7 h-7 flex items-center justify-center rounded-[10px] transition-transform active:scale-95 focus:outline-none bg-gray-200 dark:bg-gray-800 ${isUserOnline(msg.sender) ? 'led-glow hover:scale-110' : 'border border-gray-300 dark:border-gray-700 hover:opacity-80 hover:scale-105'}`}
              >
                <img src={msg.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.sender}`} alt={msg.sender} className="w-full h-full object-cover rounded-[8px]" />
              </button>
              <span onClick={() => openProfile(msg.sender)} className="text-[10px] font-bold uppercase tracking-tighter opacity-50 cursor-pointer hover:opacity-100 transition-opacity">{msg.sender}</span>
              {msg.isSticky && <span className="text-[10px] text-blue-500 font-bold">📌</span>}
            </div>
            
            {/* Normal message display */}
            {msg.audioUrl ? (
              <div className={`relative px-4 py-2 bg-blue-50 dark:bg-gray-800 rounded-2xl shadow-md ${msg.isSticky ? 'border-2 border-blue-500' : ''}`}>
                <audio controls src={msg.audioUrl} className={`h-10 w-40 sm:w-48 custom-audio`} />
              </div>
            ) : msg.stickerUrl ? (
              <div className={`relative ${msg.isSticky ? 'border-2 border-blue-500 rounded-2xl' : ''}`}>
                <img src={msg.stickerUrl} alt="sticker" className={`w-28 sm:w-32 h-auto rounded-xl shadow-md`} loading="lazy" />
              </div>
            ) : msg.imageUrl ? (
              <div className={`relative ${msg.isSticky ? 'border-2 border-blue-500 rounded-2xl' : ''}`}>
                <img src={msg.imageUrl} alt="uploaded image" className={`w-40 sm:w-56 h-auto rounded-xl shadow-md cursor-pointer`} loading="lazy" onClick={() => window.open(msg.imageUrl, '_blank')} />
              </div>
            ) : msg.videoUrl ? (
              <div className={`relative ${msg.isSticky ? 'border-2 border-blue-500 rounded-2xl' : ''}`}>
                <video src={msg.videoUrl} controls className="w-48 sm:w-64 max-h-64 object-contain rounded-xl shadow-md" />
              </div>
            ) : msg.fileUrl ? (
              <div className={`relative flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-md ${msg.isSticky ? 'border-2 border-blue-500' : ''}`}>
                 <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                    <FileText className="w-6 h-6" />
                 </div>
                 <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="text-sm font-bold truncate text-gray-900 dark:text-gray-100">{msg.fileName}</span>
                    <span className="text-xs text-gray-500">{msg.fileSize}</span>
                 </div>
                 <a href={msg.fileUrl} download={msg.fileName} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all">
                    <Download className="w-4 h-4" />
                 </a>
              </div>
            ) : (
              <div 
                className={`relative max-w-[85%] sm:max-w-[80%] px-4 py-2.5 sm:py-3 rounded-2xl shadow-md break-words
                  ${/^[\p{Emoji}\s]+$/u.test(msg.text) && msg.text.length <= 10 ? 'text-4xl sm:text-5xl bg-transparent shadow-none px-0 py-0' : 'text-[13px] sm:text-sm'}
                  ${msg.sender === username && !(/^[\p{Emoji}\s]+$/u.test(msg.text) && msg.text.length <= 10)
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : !(/^[\p{Emoji}\s]+$/u.test(msg.text) && msg.text.length <= 10) ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none' : ''}
                  ${msg.isSticky ? 'border-2 border-blue-500' : ''}
                `}
              >
                <div>
                  {renderTextWithLinks(msg.text)}
                </div>
              </div>
            )}
            
            {/* Reactions Display */}
            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${msg.sender === username ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                {Object.entries(msg.reactions).map(([emoji, usersArr]) => {
                  const users = usersArr as string[];
                  return (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(msg.id, emoji)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${users.includes(username) ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                    title={users.join(', ')}
                  >
                    <span>{emoji}</span>
                    <span className="font-medium">{users.length}</span>
                  </button>
                )})}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 bg-white dark:bg-[#16181d] border-t border-gray-200 dark:border-gray-800 z-10 shrink-0 relative">
        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2 sm:mb-4 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-2xl grid grid-cols-6 gap-2 animate-in fade-in slide-in-from-bottom-2">
            {EMOJIS.map((emoji) => (
              <button 
                key={emoji}
                onClick={() => {
                  setInput(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-2xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        {showStickerPicker && (
          <div className="absolute bottom-full mb-2 sm:mb-4 left-4 sm:left-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 sm:p-3 shadow-2xl grid grid-cols-4 gap-1.5 sm:gap-2 animate-in fade-in slide-in-from-bottom-2 w-[calc(100vw-2rem)] max-w-sm h-64 sm:h-72 overflow-y-auto z-50">
            {MEME_STICKERS.map((stickerUrl, index) => (
              <button 
                key={index}
                onClick={() => sendSticker(stickerUrl)}
                className="hover:scale-105 transition-transform p-1 rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden flex items-center justify-center h-14 sm:h-16 w-full shadow-sm"
              >
                <img src={stickerUrl} alt="meme sticker" className="h-full w-auto object-cover rounded-lg" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-1.5 sm:gap-2 relative w-full items-end pb-safe">
          {!isRecording ? (
            <>
              <label 
                className="p-2.5 sm:p-3 text-gray-400 hover:text-blue-500 rounded-xl transition-colors bg-gray-100 dark:bg-[#0a0c10] cursor-pointer"
                title="Đính kèm Ảnh/Video (< 700KB)"
              >
                <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
                <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                className={`p-2.5 sm:p-3 text-gray-400 hover:text-blue-500 rounded-xl transition-colors ${showEmojiPicker ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-500' : 'bg-gray-100 dark:bg-[#0a0c10]'}`}
              >
                <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                className={`p-2.5 sm:p-3 text-gray-400 hover:text-orange-500 rounded-xl transition-colors ${showStickerPicker ? 'bg-orange-50 dark:bg-orange-900/40 text-orange-500' : 'bg-gray-100 dark:bg-[#0a0c10]'}`}
              >
                <Cat className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 sm:p-3 text-gray-400 hover:text-red-500 rounded-xl transition-colors bg-gray-100 dark:bg-[#0a0c10]"
              >
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              <input 
                type="text" 
                value={input ?? ''}
                autoComplete="off"
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn bảo mật..."
                className="flex-1 bg-gray-100 dark:bg-[#0a0c10] border-none rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-0"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 sm:p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded-xl transition-all shadow-md active:scale-90"
              >
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl px-3 sm:px-4 py-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-600 dark:text-red-400 font-mono text-xs sm:text-sm">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => stopRecording(true)}
                  className="p-1 sm:p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                  title="Hủy ghi âm"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => stopRecording(false)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all active:scale-95 flex items-center gap-1 sm:gap-2"
                >
                  <Square className="w-3 h-3 sm:w-4 sm:h-4 fill-current" /> Gửi
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
        </div>
      </div>

      {/* Security Footer */}
      <div className="px-6 py-2 bg-red-600 text-white text-[10px] uppercase font-black tracking-[0.2em] flex items-center justify-center gap-2 z-10">
        <AlertTriangle className="w-3 h-3" /> No Recording Allowed • User identified via Dynamic Watermark
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {viewingProfile && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="bg-white dark:bg-[#16181d] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
              {/* Cover Background */}
              <div className="h-40 bg-gray-200 dark:bg-gray-800 relative group">
                {isEditingProfile ? (
                  <>
                    {editCover ? (
                      <img src={editCover} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-400 to-indigo-500" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                       <label className="cursor-pointer bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors">
                          <Camera className="w-6 h-6 text-white" />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfileImageUpload(e, 'cover')} />
                       </label>
                    </div>
                  </>
                ) : (
                  viewingProfile.coverUrl ? (
                    <img src={viewingProfile.coverUrl} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-400 to-indigo-500" />
                  )
                )}
                
                <button 
                  onClick={() => {
                    if(isEditingProfile) setIsEditingProfile(false);
                    else setViewingProfile(null);
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar Section */}
              <div className="flex flex-col items-center relative pb-6">
                <div className="relative -mt-16 mb-3">
                  <div className={`w-32 h-32 rounded-[24px] bg-gray-200 dark:bg-gray-800 flex items-center justify-center shadow-lg ${isUserOnline(viewingProfile.username) ? 'led-glow' : 'border-4 border-white dark:border-[#16181d]'}`}>
                    <img 
                      src={isEditingProfile ? (editAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${viewingProfile.username}`) : (viewingProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${viewingProfile.username}`)} 
                      alt="avatar" 
                      className={`w-full h-full object-cover ${isUserOnline(viewingProfile.username) ? 'rounded-[20px]' : 'rounded-[20px]'}`} 
                    />
                  </div>
                  {isEditingProfile && (
                     <label className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[24px] cursor-pointer hover:bg-black/50 transition-colors z-10">
                        <Camera className="w-8 h-8 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfileImageUpload(e, 'avatar')} />
                     </label>
                  )}
                </div>

                {isEditingProfile ? (
                  <div className="px-6 w-full mt-4 text-center">
                    <input
                      type="text"
                      className="w-full bg-gray-100 dark:bg-[#0a0c10] border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editUsername ?? ''}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Tên tài khoản mới"
                    />
                    {editProfileError && <p className="text-red-500 text-xs font-bold mt-2">{editProfileError}</p>}
                  </div>
                ) : (
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-widest">{viewingProfile.username}</h2>
                )}
                
                <div className="px-6 w-full mt-4 text-center">
                  {isEditingProfile ? (
                    <textarea 
                      value={editBio ?? ''}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Viết một vài điều về bạn..."
                      className="w-full bg-gray-100 dark:bg-[#0a0c10] border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-pre-wrap">
                      {viewingProfile.bio || "Người này chưa có tiểu sử."}
                    </p>
                  )}
                </div>

                <div className="mt-8 px-6 w-full">
                  {isEditingProfile ? (
                    <button onClick={saveProfile} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-md active:scale-95">Lưu thay đổi</button>
                  ) : (
                    viewingProfile.username === username ? (
                      <button onClick={startEditingProfile} className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Edit2 className="w-4 h-4" /> Chỉnh sửa hồ sơ
                      </button>
                    ) : (
                      <button onClick={() => setViewingProfile(null)} className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95">Đóng</button>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
