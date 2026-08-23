/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { ProcessingLoader } from "./components/ProcessingLoader";
import { 
  Users, 
  MapPin, 
  Globe, 
  Sparkles, 
  BookOpen, 
  Ghost, 
  Heart, 
  Smile, 
  Lightbulb, 
  Film,
  Sprout, 
  Palette, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  FileText, 
  Play, 
  Music, 
  Volume2, 
  HelpCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Sun,
  Moon,
  Plus,
  PenTool,
  MessageSquare,
  Settings,
  Key,
  ChevronDown,
  Trash2,
  Loader2,
  Menu,
  X,
  Shield,
  LogIn,
  LogOut,
  User,
  UserPlus,
  Coins,
  Save
} from "lucide-react";

// Steps list for the Sidebar
interface Step {
  id: string;
  label: string;
  icon: any;
}

const STEPS: Step[] = [
  { id: "audience", label: "Audience", icon: Users },
  { id: "genre", label: "Genre", icon: BookOpen },
  { id: "topic", label: "Topic", icon: Lightbulb },
  { id: "visual", label: "Gaya Visual", icon: Palette },
  { id: "script", label: "Script", icon: FileText },
  { id: "image-prompt", label: "Image Prompt", icon: ImageIcon },
  { id: "video-prompt", label: "Video Prompt", icon: VideoIcon },
  { id: "export", label: "Export", icon: Download },
];

interface VisualStyleOption {
  id: string;
  desc: string;
  keyword: string;
}

const VISUAL_STYLES: VisualStyleOption[] = [
  // 1. Realistis / Fotografis / Klasik Pintar
  { id: "Cinematic Realistic", desc: "Film, lighting natural dramatis, lensa 35mm, detail nyata.", keyword: "photorealistic, shot on 35mm lens, volumetric mist, golden hour" },
  { id: "Retro Vintage / Lo-Fi", desc: "Estetika VHS 90-an, tekstur hangat berbutir halus, nostalgia.", keyword: "vintage photograph, warm grainy film texture, 90s retro lo-fi, nostalgic color grading" },
  { id: "Oil Painting", desc: "Tekstur goresan kuas cat minyak tebal di atas kanvas, pencahayaan klasik dramatis.", keyword: "classical oil painting, impasto brushwork, textured canvas, dramatic chiaroscuro lighting" },
  
  // 2. 3D Digital Render
  { id: "3D Pixar / Disney Style", desc: "Model karakter empuk menggemaskan, warna-warni cerah.", keyword: "3d render style, stylized charming mascot characters, bright cheerful volumetric lighting, clay-like smooth textures, Pixar-like quality" },
  { id: "3D Designer Toy Clay (Pixar Style)", desc: "Estetika 3D mainan desainer menarik dengan tekstur clay halus, warna pastel cerah, dan pencahayaan studio lembut bergaya animasi Pixar.", keyword: "Charming 3D designer toy style, bright cheerful pastel colors, smooth clay texture, clean minimalist studio lighting, solid soft background, high detail, 8k resolution, stylized toy aesthetic, Pixar-like quality." },
  
  // 3. Stop Motion Keluarga
  { 
    id: "Stop Motion (Claymation)", 
    desc: "Tekstur tanah liat fisik, bayangan nyata, kesan gerakan frame-by-frame tak sempurna.", 
    keyword: "animated short in a high-quality handcrafted clay animation (claymation) style similar to stop-motion movies. Every object, character, building, vehicle, tree, tool, and background is made entirely from colorful modeling clay with visible fingerprints, soft clay texture, handmade imperfections, rounded edges, and realistic stop-motion aesthetics. Warm cinematic lighting, shallow depth of field, smooth stop-motion animation, Pixar-quality composition, 8K, highly detailed handcrafted clay textures. Negative Prompt: Real humans, realistic skin, anime, plastic toy, LEGO, paper craft, blurry, low quality, watermark, inconsistent characters, changing clothes, CGI metal look, extra fingers, deformed faces." 
  },
  {
    id: "Stop Motion (Lego)",
    desc: "Tekstur plastik bata mainan Lego, refleksi mengkilap khas brickfilm, gerakan patah-patah autentik.",
    keyword: "animated short in a high-quality handcrafted toy building bricks (LEGO brickfilm) style similar to brick-by-brick stop-motion movies. Every object, character, building, vehicle, tree, tool, and background is made entirely from colorful plastic toy building bricks with studs, glossy reflective plastic surfaces, modular pieces, and realistic brickfilm stop-motion aesthetics. Warm cinematic lighting, shallow depth of field, smooth stop-motion animation with distinct micro-movements, Pixar-quality composition, 8K, highly detailed glossy plastic brick textures. Negative Prompt: Real humans, realistic skin, anime, claymation, soft clay, wood texture, paper craft, blurry, low quality, watermark, inconsistent characters, CGI metal look, extra fingers, deformed faces."
  },
  {
    id: "Stop Motion (Wood)",
    desc: "Tekstur kayu pahat alami berpola serat kayu, cat cat warna hangat, nuansa mainan kayu klasik.",
    keyword: "animated short in a high-quality handcrafted wooden toy style similar to classic carved wood stop-motion animations. Every object, character, building, vehicle, tree, tool, and background is crafted entirely from beautifully painted or natural wood with visible wood grain, warm wooden textures, smooth carved edges, minor handmade timber imperfections, and realistic stop-motion tactile aesthetics. Warm cinematic lighting, shallow depth of field, tactile shadows, smooth woodcraft stop-motion animation, Pixar-quality composition, 8K, highly detailed natural wooden textures and painted grain. Negative Prompt: Real humans, realistic skin, anime, plastic toy, LEGO, claymation, paper craft, blurry, low quality, watermark, inconsistent characters, shiny CGI look, extra fingers, deformed faces."
  },

  // 4. Animasi 2D / Ilustratif Modern & Retro
  { id: "2D Kawaii Anime (Pastel)", desc: "Gaya ilustrasi anime 2D imut (kawaii) dengan warna pastel lembut, garis bersih, dan shading cel-shading halus.", keyword: "Charming 2D mascot kawaii anime style, hand-drawn anime illustration style, clean line art, soft pastel cel-shading, solid soft background, high quality, aesthetic anime visual." },
  { id: "Anime Shonen Modern", desc: "Garis tajam dinamis, efek pencahayaan partikel bersinar, palet warna dramatis.", keyword: "modern shonen anime style, dynamic action lighting, high-contrast, glowing particles, digital 2D illustration" },
  { id: "Anime / Manga Art", desc: "Line art tajam khas kartun jepang, detail modern.", keyword: "anime style, clean manga lineart, vibrant cel-shading, modern anime aesthetic" },
  { id: "Studio Ghibli / Anime Klasik", desc: "Lanskap cat air lembut, nostalgia, estetika film animasi retro hand-drawn.", keyword: "studio ghibli style, hand-drawn anime, retro watercolor aesthetic, scenic cinematic backgrounds, soft nostalgic lighting" },
  { id: "Disney Klasik (2D Tradisional)", desc: "Animasi sel klasik digambar tangan, karakter ekspresif, latar belakang cat air kaya.", keyword: "classic disney animation, 2d hand-drawn style, vintage watercolor illustration, expressive line art" },
  { id: "Komik Retro / Pop Art", desc: "Garis outline tebal, dot pola setengah warna (halftone), warna CMYK cerah mencolok.", keyword: "retro comic book art, pop art, roy lichtenstein style, halftone dots, heavy ink outline, bold colors" },
  
  // 5. Seni Grafis / Cyber-Futuristis
  { id: "Cyberpunk Neon", desc: "Saturasi biru neon merah jambu, teknologi futuristik, gemerlap malam.", keyword: "cyberpunk, dark futuristic cityscape, glowing neon accents, volumetric pink and blue lighting, high-tech aesthetics" },
  { id: "Cyber-Art / Synthwave", desc: "Estetika retro-futuristik 80-an, grid neon ungu-oranye, siluet matahari fajar.", keyword: "synthwave retro-futurism, outrun aesthetic, neon cyberpunk, 1980s grid sun vector" },
  
  // 6. Gaya Pipih / Cut-Out / Vektor / Minimalis
  { id: "Paper Cut-Out (Potongan Kertas)", desc: "Efek kedalaman 3D berlapis dari potongan kertas fisik, bayangan halus.", keyword: "papercraft, paper cut-out style, layered depth shadow, tactile organic paper textures" },
  { id: "Cyber-Mascot", desc: "Karakter kepala besar menarik dengan aksesoris sci-fi neon futuristik yang detail.", keyword: "mascot anime style, charming cyberpunk, hyper-detailed miniature, big expressive eyes" },
  { id: "Vektor Datar (Flat Vector)", desc: "Ilustrasi grafis minimalis, tanpa gradasi, warna blok bersih, bentuk geometris.", keyword: "flat vector illustration, clean lines, minimalist graphic design, solid shapes" },
  { id: "Minimalist Vector Illustration", desc: "Seni grafis datar modern, kontras warna tegas, estetika bento.", keyword: "vector art, simple minimalist branding design, bold high-contrast colors, modern geometric curves" },
  { id: "Pixel Art", desc: "Estetika game retro 16-bit/32-bit, grid piksel bersih, warna nostalgia terbatas.", keyword: "pixel art, 16-bit retro game asset, clean pixels, nostalgic pixelated render" },
  
  // 7. Kustomisasi
  { id: "Gaya Kustom", desc: "Tulis gaya visual buatan sendiri secara eksplisit.", keyword: "custom" },
];

interface TopicSuggestion {
  category: string;
  title: string;
  description: string;
  hookAngle: string;
  viralScore?: number;
  uniqueness?: number;
}

interface Scene {
  sceneNumber: number;
  timeRange: string;
  visualInstructions: string;
  voiceOver: string;
  audioVibe: string;
}

interface ScriptData {
  title: string;
  hookDescription: string;
  pacingStyle: string;
  scenes: Scene[];
}

interface ImagePrompt {
  sceneNumber: number;
  optimizedPrompt: string;
  aspectRatioTip: string;
}

interface VideoPrompt {
  sceneNumber: number;
  motionPrompt: string;
  runwaySettings: string;
}

const OPENROUTER_MODELS = [
  { group: "Free", options: [
    { label: "Llama 3.3 70B (Paid)", value: "meta-llama/llama-3.3-70b-instruct" },
    { label: "Nemotron 3 Ultra 550B (free)", value: "nvidia/nemotron-3-ultra-550b-a55b:free" },
    { label: "GPT-OSS 20B (free)", value: "openai/gpt-oss-20b:free" },
    { label: "Gemma 4 31B (free)", value: "google/gemma-4-31b-it:free" },
    { label: "Qwen 3 Next 80B (free)", value: "qwen/qwen3-next-80b-a3b-instruct:free" }
  ]},
  { group: "Trinity", options: [
    { label: "Trinity Large Thinking", value: "trinity/large-thinking" },
    { label: "Trinity Mini", value: "trinity/mini" }
  ]}
];

const OPENAGENTIC_MODELS = [
  { group: "Free Tier", options: [
    { label: "Assistant Sonnet 4.5", value: "assistant-sonnet-4.5" },
    { label: "Assistant Sonnet 4.5 (1M)", value: "assistant-sonnet-4.5-1m" },
    { label: "DeepSeek 3.2", value: "deepseek-3.2" },
    { label: "DeepSeek V4 Flash", value: "deepseek-v4-flash" },
    { label: "GLM-5 (Zhipu AI)", value: "glm-5" },
    { label: "MiniMax M2.1", value: "minimax-m2.1" },
    { label: "MiniMax M2.5", value: "minimax-m2.5" },
    { label: "Open Agentic", value: "open-agentic" }
  ]}
];

export default function App() {
  // Authentication & Admin States
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; expiresAt?: string | null; credits?: number } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Self-Registration Form States
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [registerName, setRegisterName] = useState<string>("");
  const [registerEmail, setRegisterEmail] = useState<string>("");
  const [registerPassword, setRegisterPassword] = useState<string>("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState<boolean>(false);
  
  // Admin User Manager states
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [adminNewName, setAdminNewName] = useState<string>("");
  const [adminNewEmail, setAdminNewEmail] = useState<string>("");
  const [adminNewPassword, setAdminNewPassword] = useState<string>("");
  const [adminNewRole, setAdminNewRole] = useState<string>("user");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [adminUserFilter, setAdminUserFilter] = useState<"all" | "admin" | "self">("all");
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<"self" | "all" | null>(null);

  // Filtered users calculations
  const totalUsers = usersList.length;
  const adminCreatedCount = usersList.filter((usr: any) => !usr.expiresAt).length;
  const selfRegisteredCount = usersList.filter((usr: any) => usr.expiresAt).length;
  const filteredUsers = usersList.filter((usr: any) => {
    if (adminUserFilter === "admin") return !usr.expiresAt;
    if (adminUserFilter === "self") return !!usr.expiresAt;
    return true;
  });

  // Authenticate on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          localStorage.setItem("adin-story-auth-token", token);
          
          // Fetch real user metadata from backend
          const authRes = await fetch("/api/auth/me", {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.success && authData.user) {
              setCurrentUser(authData.user);
            } else {
              setCurrentUser({
                id: user.uid,
                name: user.displayName || user.email?.split("@")[0] || "User",
                email: user.email || "",
                role: user.email === "admin@gmail.com" ? "admin" : "user",
                credits: 30
              });
            }
          } else {
            setCurrentUser({
              id: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "User",
              email: user.email || "",
              role: user.email === "admin@gmail.com" ? "admin" : "user",
              credits: 30
            });
          }
        } catch (e) {
          console.error("Failed to get token", e);
          setCurrentUser({
            id: user.uid,
            name: user.displayName || user.email?.split("@")[0] || "User",
            email: user.email || "",
            role: user.email === "admin@gmail.com" ? "admin" : "user",
            credits: 30
          });
        }
      } else {
        localStorage.removeItem("adin-story-auth-token");
        setCurrentUser(null);
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Email dan password harus diisi.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setLoginError("Email atau password salah.");
      } else {
        setLoginError("Koneksi gagal. Silakan coba lagi.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", userCredential.user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Pre-registered by admin (with random u-ID). Migrate to new UID.
          const oldDoc = querySnapshot.docs[0];
          const oldData = oldDoc.data();
          
          await setDoc(userDocRef, {
            ...oldData, // keep existing role, missing expiresAt, missing credits (if any)
            name: userCredential.user.displayName || oldData.name || "User"
          });
          
          // Delete old doc
          await deleteDoc(oldDoc.ref);
        } else {
          // Only set this initial data if the user is completely new (self-registered)
          const createdAt = new Date().toISOString();
          const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
          
          await setDoc(userDocRef, {
            name: userCredential.user.displayName || userCredential.user.email?.split("@")[0] || "User",
            email: userCredential.user.email,
            role: "user",
            createdAt,
            expiresAt,
            credits: 30,
            lastCreditResetAt: createdAt
          });
        }
      }
      
    } catch (err: any) {
      setLoginError("Gagal masuk dengan Google: " + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setRegisterError("Semua kolom harus diisi.");
      return;
    }
    setRegisterLoading(true);
    setRegisterError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await updateProfile(userCredential.user, {
        displayName: registerName
      });
      
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: registerName,
        email: registerEmail,
        role: registerEmail === "admin@gmail.com" ? "admin" : "user",
        createdAt,
        expiresAt,
        credits: 30,
        lastCreditResetAt: createdAt
      });

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setAuthMode("login");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setRegisterError("Email sudah terdaftar.");
      } else if (err.code === "auth/weak-password") {
        setRegisterError("Password terlalu lemah (minimal 6 karakter).");
      } else {
        setRegisterError("Pendaftaran gagal. Silakan coba lagi.");
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("adin-story-auth-token");
    setCurrentUser(null);
    setUsersList([]);
    setShowAdminModal(false);
  };

  const fetchUsersList = async () => {
    const token = localStorage.getItem("adin-story-auth-token");
    if (!token) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        data = { error: text || `Server error (${res.status})` };
      }
      if (res.ok && data.success) {
        setUsersList(data.users);
      } else {
        setAdminError(data.error || "Gagal mengambil daftar pengguna.");
      }
    } catch (err: any) {
      setAdminError(err.message ? `Koneksi gagal: ${err.message}` : "Koneksi gagal.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewName.trim() || !adminNewEmail.trim() || !adminNewPassword.trim()) {
      setAdminError("Semua bidang wajib diisi untuk membuat user baru.");
      return;
    }
    const token = localStorage.getItem("adin-story-auth-token");
    if (!token) return;
    setAdminLoading(true);
    setAdminError(null);
    setAdminSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: adminNewName,
          email: adminNewEmail,
          password: adminNewPassword,
          role: adminNewRole
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminSuccess(`User "${data.user.name}" berhasil dibuat!`);

        // Save to localStorage backup
        const localBackupRaw = localStorage.getItem("adin-story-local-users-backup") || "[]";
        try {
          const localBackup = JSON.parse(localBackupRaw);
          const userObj = {
            id: data.user.id,
            name: adminNewName,
            email: adminNewEmail,
            password: adminNewPassword, // Save the password too so they can log back in!
            role: adminNewRole,
            createdAt: data.user.createdAt || new Date().toISOString()
          };
          if (!localBackup.some((u: any) => u.email.toLowerCase() === adminNewEmail.toLowerCase())) {
            localBackup.push(userObj);
            localStorage.setItem("adin-story-local-users-backup", JSON.stringify(localBackup));
          }
        } catch (e) {
          console.error("Failed to backup created user:", e);
        }

        setAdminNewName("");
        setAdminNewEmail("");
        setAdminNewPassword("");
        setAdminNewRole("user");
        await fetchUsersList();
      } else {
        setAdminError(data.error || `Error raw: ${JSON.stringify(data)} (status: ${res.status})`);
      }
    } catch (err: any) {
      setAdminError(`Koneksi gagal: ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const token = localStorage.getItem("adin-story-auth-token");
    if (!token) return;
    setAdminLoading(true);
    setAdminError(null);
    setAdminSuccess(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminSuccess("User berhasil dihapus.");
        setDeletingUserId(null);

        // Remove from local backup
        const localBackupRaw = localStorage.getItem("adin-story-local-users-backup");
        if (localBackupRaw) {
          try {
            const localBackup = JSON.parse(localBackupRaw);
            const updatedBackup = localBackup.filter((u: any) => u.id !== userId);
            localStorage.setItem("adin-story-local-users-backup", JSON.stringify(updatedBackup));
          } catch (e) {
            console.error("Failed to update backup after delete:", e);
          }
        }

        await fetchUsersList();
      } else {
        setAdminError(data.error || "Gagal menghapus user.");
      }
    } catch (err) {
      setAdminError("Koneksi gagal.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleBulkDelete = async (type: "self" | "all") => {
    const token = localStorage.getItem("adin-story-auth-token");
    if (!token) return;
    setAdminLoading(true);
    setAdminError(null);
    setAdminSuccess(null);
    try {
      const endpoint = type === "self" ? "all-self-registered" : "all-users";
      const res = await fetch(`/api/admin/users/${endpoint}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminSuccess(data.message || "Pengguna berhasil dihapus.");
        setShowBulkDeleteConfirm(null);

        // Remove from local backup
        const localBackupRaw = localStorage.getItem("adin-story-local-users-backup");
        if (localBackupRaw) {
          try {
            const localBackup = JSON.parse(localBackupRaw);
            let updatedBackup;
            if (type === "self") {
              // Remove only self-registered users (which have expiresAt)
              updatedBackup = localBackup.filter((u: any) => !u.expiresAt);
            } else {
              // Keep only current user
              updatedBackup = localBackup.filter((u: any) => u.id === currentUser?.id);
            }
            localStorage.setItem("adin-story-local-users-backup", JSON.stringify(updatedBackup));
          } catch (e) {
            console.error("Failed to update backup after bulk delete:", e);
          }
        }

        await fetchUsersList();
      } else {
        setAdminError(data.error || "Gagal melakukan penghapusan massal.");
      }
    } catch (err) {
      setAdminError("Koneksi gagal.");
    } finally {
      setAdminLoading(false);
    }
  };

  // State Machine
  const [currentStep, setCurrentStep] = useState<string>("audience");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isEditingScript, setIsEditingScript] = useState<boolean>(false);
  
  // App Core States
  const [audience, setAudience] = useState<"indonesia" | "global" | "custom" | null>(null);
  const [customAudience, setCustomAudience] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [genre, setGenre] = useState<string>("");
  const [customGenre, setCustomGenre] = useState<string>("");
  const [themeContext, setThemeContext] = useState<string>("");
  const [duration, setDuration] = useState<string>("10");
  
  // Scripts and Prompts states
  const [script, setScript] = useState<ScriptData | null>(null);
  const [visualStyle, setVisualStyle] = useState<string>("Cinematic Realistic");
  const [customVisualStyle, setCustomVisualStyle] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Dark/Light Theme State
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("adin-story-theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  useEffect(() => {
    localStorage.setItem("adin-story-theme", theme);
  }, [theme]);
  const [imagePrompts, setImagePrompts] = useState<ImagePrompt[] | null>(null);
  const [skippedImagePrompt, setSkippedImagePrompt] = useState<boolean>(false);
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompt[] | null>(null);

  // Loading and Error UI states
  const [loadingTopics, setLoadingTopics] = useState<boolean>(false);
  const [refiningTopic, setRefiningTopic] = useState<boolean>(false);
  const [refinementStatus, setRefinementStatus] = useState<"idle" | "success" | "error">("idle");
  const [loadingScript, setLoadingScript] = useState<boolean>(false);
  const [loadingImagePrompts, setLoadingImagePrompts] = useState<boolean>(false);
  const [loadingVideoPrompts, setLoadingVideoPrompts] = useState<boolean>(false);
  
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState<boolean>(false);

  // Settings & Custom API Key States
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [apiKeyChannel, setApiKeyChannel] = useState<string>(() => {
    return localStorage.getItem("api_key_channel") || "GEMINI";
  });
  const [apiKeysRaw, setApiKeysRaw] = useState<string>(() => {
    const channel = localStorage.getItem("api_key_channel") || "GEMINI";
    let stored = localStorage.getItem(`api_keys_${channel}`);
    if (!stored && channel === "OPENAGENTIC") {
      stored = "sk-b539c4d906aaaddabc42726553afb3a2684cb119fcd65c11d7abae498928e444";
      localStorage.setItem(`api_keys_${channel}`, stored);
    }
    return stored || "";
  });
  const [apiModel, setApiModel] = useState<string>(() => {
    const channel = localStorage.getItem("api_key_channel") || "GEMINI";
    let stored = localStorage.getItem(`api_model_${channel}`);
    if (!stored && channel === "OPENAGENTIC") {
      stored = "glm-5";
      localStorage.setItem(`api_model_${channel}`, stored);
    }
    return stored || "";
  });

  const hasApiKey = apiKeysRaw.split("\n").map(k => k.trim()).filter(k => k.length > 0).length > 0;

  const [apiCreditInfo, setApiCreditInfo] = useState<any>(null);
  const [checkingCredit, setCheckingCredit] = useState<boolean>(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("api_key_channel", apiKeyChannel);
    let saved = localStorage.getItem(`api_keys_${apiKeyChannel}`);
    if (!saved && apiKeyChannel === "OPENAGENTIC") {
      saved = "sk-b539c4d906aaaddabc42726553afb3a2684cb119fcd65c11d7abae498928e444";
      localStorage.setItem(`api_keys_${apiKeyChannel}`, saved);
    }
    const finalSaved = saved || "";
    
    let savedModel = localStorage.getItem(`api_model_${apiKeyChannel}`);
    if (!savedModel && apiKeyChannel === "OPENAGENTIC") {
      savedModel = "glm-5";
      localStorage.setItem(`api_model_${apiKeyChannel}`, savedModel);
    }
    const finalModel = savedModel || "";

    setApiKeysRaw(finalSaved);
    setApiModel(finalModel);
    setApiCreditInfo(null);
    setCreditError(null);
  }, [apiKeyChannel]);

  const fetchCredit = async () => {
    const firstKey = apiKeysRaw.split("\n").map(k => k.trim()).filter(k => k.length > 0)[0] || "";
    if (!firstKey) {
      setApiCreditInfo(null);
      return false;
    }
    
    setCheckingCredit(true);
    setCreditError(null);
    try {
      const response = await fetch("/api/check-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeysRaw, channel: apiKeyChannel }),
      });
      const resData = await response.json();
      if (resData.success) {
        setApiCreditInfo(resData.data || { valid: true });
        return true;
      } else {
        setCreditError(resData.error || "Gagal memperbarui sisa kredit.");
        setApiCreditInfo(null);
        return false;
      }
    } catch (err: any) {
      setCreditError("Gagal menghubungkan ke server untuk cek kredit.");
      setApiCreditInfo(null);
      return false;
    } finally {
      setCheckingCredit(false);
    }
  };

  useEffect(() => {
    if (showSettingsModal) {
      fetchCredit();
    }
  }, [showSettingsModal]);

  const handleSaveKeys = async () => {
    localStorage.setItem(`api_keys_${apiKeyChannel}`, apiKeysRaw);
    localStorage.setItem(`api_model_${apiKeyChannel}`, apiModel);
    setServerError(null);
    const isValid = await fetchCredit();
    if (isValid) {
      setCopiedStatus("Kunci Tersimpan & Valid!");
      setTimeout(() => setCopiedStatus(null), 2000);
      // Automatically close modal after a short delay so the user sees the success feedback
      setTimeout(() => {
        setShowSettingsModal(false);
      }, 800);
    } else {
      setCopiedStatus("API Key disimpan tapi tidak valid!");
      setTimeout(() => setCopiedStatus(null), 2000);
    }
  };

  const handleClearKeys = () => {
    setApiKeysRaw("");
    localStorage.removeItem(`api_keys_${apiKeyChannel}`);
    setApiCreditInfo(null);
    setCreditError(null);
    setCopiedStatus("Hapus API Key");
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  const getAuthHeaders = () => {
    const activeChannel = localStorage.getItem("api_key_channel") || "GEMINI";
    let savedKeysRaw = localStorage.getItem(`api_keys_${activeChannel}`);
    if (!savedKeysRaw && activeChannel === "OPENAGENTIC") {
      savedKeysRaw = "sk-b539c4d906aaaddabc42726553afb3a2684cb119fcd65c11d7abae498928e444";
    }
    const keysList = (savedKeysRaw || "").split("\n").map(k => k.trim()).filter(k => k.length > 0);
    const activeKey = keysList[0] || "";
    let activeModel = localStorage.getItem(`api_model_${activeChannel}`);
    if (!activeModel && activeChannel === "OPENAGENTIC") {
      activeModel = "glm-5";
    }
    activeModel = activeModel || "";

    if (activeModel.includes("1.5") || activeModel === "google/gemini-2.5-flash") {
      activeModel = activeChannel === "OPENROUTER" ? "google/gemma-4-31b-it:free" : "gemini-2.5-flash";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    const authToken = localStorage.getItem("adin-story-auth-token");
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    if (activeKey) {
      headers["x-api-key"] = activeKey;
      headers["x-api-channel"] = activeChannel;
      if (activeModel) {
        headers["x-api-model"] = activeModel;
      }
    }
    return headers;
  };

  // Success Feedback
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [loadingStepText, setLoadingStepText] = useState<string>("");

  // Clean error at step change
  useEffect(() => {
    setServerError(null);
  }, [currentStep]);

  // Handle Toast Copied feedback
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStatus(label);
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  // Trigger actual reset securely and cleanly
  const triggerResetProject = () => {
    setAudience(null);
    setCustomAudience("");
    setTopic("");
    setGenre("");
    setCustomGenre("");
    setThemeContext("");
    setDuration("10");
    setScript(null);
    setVisualStyle("Cinematic Realistic");
    setCustomVisualStyle("");
    setImagePrompts(null);
    setVideoPrompts(null);
    setTopicSuggestions([]);
    setCurrentStep("audience");
    setServerError(null);
    setShowResetConfirm(false);
  };

  // Reset core project state
  const handleResetProject = () => {
    setShowResetConfirm(true);
  };

  // Generate Trending Topics from Gemini Server
  const fetchTrendingTopics = async () => {
    if (!audience) return;
    if (!hasApiKey) {
      setServerError("isi apikey dulu baru bisa jalankan aplikasi");
      setNeedsApiKey(true);
      setShowSettingsModal(true);
      return;
    }
    setLoadingTopics(true);
    setServerError(null);
    try {
      const response = await fetch("/api/generate/topics", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ audience, customAudience, themeContext, genre, customGenre }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mendapatkan topik dari AI.");
      }
      setTopicSuggestions(data);
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || "Gagal menghubungkan ke server.");
      if (err.message?.includes("API Key") || err.message?.includes("GEMINI_API_KEY")) {
        setNeedsApiKey(true);
      }
    } finally {
      setLoadingTopics(false);
    }
  };

  // Correct and polish user's own topic idea using Gemini
  const handleRefineTopic = async () => {
    if (!topic || !topic.trim()) return;
    if (!hasApiKey) {
      setServerError("isi apikey dulu baru bisa jalankan aplikasi");
      setNeedsApiKey(true);
      setShowSettingsModal(true);
      return;
    }
    setRefiningTopic(true);
    setRefinementStatus("idle");
    setServerError(null);
    try {
      const response = await fetch("/api/generate/refine-topic", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ topic, audience, customAudience, genre, customGenre }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengkoreksi topik");
      }
      if (data.success && data.refinedTopic) {
        setTopic(data.refinedTopic);
        setRefinementStatus("success");
        setTimeout(() => setRefinementStatus("idle"), 2500);
      } else {
        throw new Error("Gagal mengkoreksi topik");
      }
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || "Gagal mengkoreksi topik");
      setRefinementStatus("error");
      setTimeout(() => setRefinementStatus("idle"), 3000);
    } finally {
      setRefiningTopic(false);
    }
  };

  // Generate Script from Gemini Server
  const generateScript = async () => {
    if (!audience || !topic || !genre) return;
    if (audience === "custom" && !customAudience.trim()) return;
    if (genre === "Kustom" && !customGenre.trim()) return;
    if (!hasApiKey) {
      setServerError("isi apikey dulu baru bisa jalankan aplikasi");
      setNeedsApiKey(true);
      setShowSettingsModal(true);
      return;
    }
    setLoadingScript(true);
    setServerError(null);

    // Stagger loading text updates for high-end visual feedback
    const loadingTexts = [
      "Menganalisis profil target audiens...",
      "Merancang strategi hook pembuka 3 detik...",
      "Menyusun visual b-roll per adegan...",
      "Menulis naskah dialog suara latar (voiceover)...",
      "Sinkronisasi durasi dan tempo musik..."
    ];
    let textIdx = 0;
    setLoadingStepText(loadingTexts[0]);
    const interval = setInterval(() => {
      textIdx = (textIdx + 1) % loadingTexts.length;
      setLoadingStepText(loadingTexts[textIdx]);
    }, 2500);

    try {
      const response = await fetch("/api/generate/script", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ audience, customAudience, topic, genre, customGenre, duration }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal memformulasikan skenario cerita.");
      }
      setScript(data);
      // Automatically clear stale prompts if script gets updated
      setImagePrompts(null);
      setSkippedImagePrompt(false);
      setVideoPrompts(null);
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || "Terjadi kendala pada formulasi naskah.");
    } finally {
      clearInterval(interval);
      setLoadingScript(false);
    }
  };

  // Generate Image Prompts based on Script
  const generateImagePrompts = async () => {
    if (!script) return;
    if (!hasApiKey) {
      setServerError("isi apikey dulu baru bisa jalankan aplikasi");
      setNeedsApiKey(true);
      setShowSettingsModal(true);
      return;
    }
    setLoadingImagePrompts(true);
    setServerError(null);
    try {
      const selectedOption = VISUAL_STYLES.find(s => s.id === visualStyle);
      const visualStyleKeyword = selectedOption ? selectedOption.keyword : "";

      const response = await fetch("/api/generate/image-prompts", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          scenes: script.scenes, 
          visualStyle, 
          customVisualStyle,
          visualStyleKeyword
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengoptimasi prompt gambar.");
      }
      setImagePrompts(data);
      setSkippedImagePrompt(false);
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || "Gagal membuat daftar prompt gambar.");
    } finally {
      setLoadingImagePrompts(false);
    }
  };

  // Generate Video Prompts based on Script and Image Prompts
  const generateVideoPrompts = async () => {
    if (!script) return;
    if (!hasApiKey) {
      setServerError("isi apikey dulu baru bisa jalankan aplikasi");
      setNeedsApiKey(true);
      setShowSettingsModal(true);
      return;
    }
    setLoadingVideoPrompts(true);
    setServerError(null);
    try {
      const selectedOption = VISUAL_STYLES.find(s => s.id === visualStyle);
      const visualStyleKeyword = selectedOption ? selectedOption.keyword : "";

      const response = await fetch("/api/generate/video-prompts", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          scenes: script.scenes, 
          imagePrompts, 
          visualStyle, 
          customVisualStyle,
          visualStyleKeyword
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menghasilkan prompt video.");
      }
      setVideoPrompts(data);
      
      // Refresh user info if logged in to update credits
      if (currentUser) {
        try {
          const authRes = await fetch("/api/auth/me", { headers: getAuthHeaders() });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.success && authData.user) {
              setCurrentUser(authData.user);
            }
          }
        } catch (_) {}
      }
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || "Gagal menyusun prompt pergerakan video.");
    } finally {
      setLoadingVideoPrompts(false);
    }
  };

  // Script editing helpers
  const updateScriptTitle = (newTitle: string) => {
    if (script) {
      setScript({ ...script, title: newTitle });
    }
  };

  const updateScriptPacing = (newPacing: string) => {
    if (script) {
      setScript({ ...script, pacingStyle: newPacing });
    }
  };

  const updateScriptHook = (newHook: string) => {
    if (script) {
      setScript({ ...script, hookDescription: newHook });
    }
  };

  const updateSceneField = (sceneNumber: number, field: "voiceOver" | "visualInstructions" | "audioVibe", value: string) => {
    if (script) {
      const updatedScenes = script.scenes.map((scene) => {
        if (scene.sceneNumber === sceneNumber) {
          return { ...scene, [field]: value };
        }
        return scene;
      });
      setScript({ ...script, scenes: updatedScenes });
    }
  };

  // Prompts download helpers
  const downloadImagePrompts = () => {
    if (!imagePrompts) return;
    const content = imagePrompts.map((p) => {
      const sc = script?.scenes.find(s => s.sceneNumber === p.sceneNumber);
      return `### Adegan ${p.sceneNumber} (${p.aspectRatioTip})\n` +
             `*Visual Ref:* ${sc?.visualInstructions || ""}\n` +
             `*Image Prompt:* ${p.optimizedPrompt}\n\n`;
    }).join("\n");
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Prompt_Gambar_${script?.title.replace(/[^a-zA-Z0-9]/g, "_") || "Studio"}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadVideoPrompts = () => {
    if (!videoPrompts) return;
    const content = videoPrompts.map((p) => {
      const sc = script?.scenes.find(s => s.sceneNumber === p.sceneNumber);
      return `### Prompt Video ${p.sceneNumber} (${p.runwaySettings})\n` +
             `*VO:* ${sc?.voiceOver || ""}\n` +
             `*Motion Prompt:* ${p.motionPrompt}\n\n`;
    }).join("\n");
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Prompt_Video_${script?.title.replace(/[^a-zA-Z0-9]/g, "_") || "Studio"}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if current step's requirements are met to allow forward navigation
  const canGoNext = () => {
    if (currentStep === "audience") return audience !== null && (audience !== "custom" || customAudience.trim().length > 0);
    if (currentStep === "topic") return topic.trim().length > 0;
    if (currentStep === "genre") return genre !== "" && (genre !== "Kustom" || customGenre.trim().length > 0);
    if (currentStep === "script") return script !== null;
    if (currentStep === "visual") return visualStyle !== "" && (visualStyle !== "Gaya Kustom" || customVisualStyle.trim().length > 0);
    if (currentStep === "image-prompt") return imagePrompts !== null || skippedImagePrompt;
    if (currentStep === "video-prompt") return videoPrompts !== null;
    return true;
  };

  // Get Next Step identifier
  const getNextStepId = () => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx !== -1 && idx < STEPS.length - 1) {
      return STEPS[idx + 1].id;
    }
    return null;
  };

  // Proceed to Next Step
  const handleNextStep = () => {
    const nextId = getNextStepId();
    if (nextId) {
      setCurrentStep(nextId);
    }
  };

  // Create consolidated Markdown export string
  const getProductionMarkdown = () => {
    if (!script) return "";
    
    if (videoPrompts && videoPrompts.length > 0) {
      return videoPrompts.map(vp => vp.motionPrompt).join("\n\n---\n\n");
    }
    
    // Fallback if video prompts are not generated yet
    let md = `Berikut versi draft skenario naskah sebelum pembuatan Prompt Video AI:\n\n`;
    script.scenes.forEach((scene) => {
      md += `SCENE ${scene.sceneNumber} — (${scene.timeRange.toUpperCase()})\n\n`;
      md += `Visual:\n${scene.visualInstructions}\n\n`;
      md += `Voice Over:\n"${scene.voiceOver}"\n\n`;
      md += `Audio/SFX:\n${scene.audioVibe}\n\n`;
      md += `---\n\n`;
    });
    return md.trim();
  };

  if (checkingAuth) {
    return (
      <div className={`min-h-screen w-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium tracking-wide">Memuat Sesi Pengguna...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div 
        id="adin-story-engine-root" 
        className={`min-h-[100dvh] w-full max-w-full flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300 relative overflow-y-auto ${
          theme === "dark" 
            ? "bg-slate-950 text-slate-100 dark" 
            : "bg-[#f8fafd] text-[#1e293b]"
        }`}
      >
        {/* Visual background accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/10 via-sky-300/5 to-transparent rounded-full blur-3xl pointer-events-none fixed" />
        <div className="absolute bottom-0 left-[200px] w-[400px] h-[400px] bg-gradient-to-tr from-sky-200/10 via-indigo-200/5 to-transparent rounded-full blur-3xl pointer-events-none fixed" />

        <div className="w-full max-w-md p-4 sm:p-6 mx-auto my-auto relative z-10 min-h-max py-8">
          <div className={`p-6 sm:p-8 rounded-2xl border shadow-xl transition-all duration-300 relative ${
            theme === "dark" 
              ? "bg-slate-900/90 border-slate-800 shadow-slate-950/50" 
              : "bg-white/95 border-slate-200 shadow-slate-200/50"
          }`}>
            {/* Theme Switcher inside Card */}
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`p-2 rounded-xl border shadow-xs transition-all duration-150 flex items-center justify-center cursor-pointer ${
                  theme === "dark" 
                    ? "bg-slate-950 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-900" 
                    : "bg-slate-50 border-slate-150 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
                title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              </button>
            </div>
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-4">
                <Sprout className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">AKAR Story Engine</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {authMode === "login" 
                  ? "Silakan masuk untuk melanjutkan pembuatan konten" 
                  : "Daftar akun mandiri (Aktif selama 1 hari)"}
              </p>
            </div>

            {authMode === "login" ? (
              <>
                {loginError && (
                  <div className="mb-6 p-3.5 rounded-xl text-xs flex items-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                      Alamat Email / Nama User
                    </label>
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="contoh: user@gmail.com atau namauser"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                      Kata Sandi (Password)
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-4 mt-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menghubungkan...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 animate-pulse" />
                        <span>Masuk Ke Studio</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-150 dark:border-slate-800 text-center flex flex-col items-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Belum memiliki akun dari admin?
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loginLoading}
                    className="w-full py-3 px-4 mt-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Daftar/Masuk Akun Google</span>
                  </button>

                  <div className="mt-4 pt-4 border-t border-dashed border-slate-150 dark:border-slate-800 w-full text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Atau butuh akses penuh tanpa batas waktu?
                    </p>
                    <a
                      href="https://wa.me/6285136392947?text=Halo%20Admin,%20saya%20tertarik%20untuk%20mendapatkan%20akses%20penuh%20tanpa%20batas%20waktu%20di%20AKAR%20Story%20Engine."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.863.002-2.637-1.023-5.116-2.884-6.978C16.592 1.902 14.118.878 11.48.878c-5.436 0-9.859 4.418-9.863 9.862a9.78 9.78 0 0 0 1.492 5.03l-.979 3.577 3.666-.961-.243.144zM17.314 14.18c-.287-.143-1.697-.838-1.959-.933-.262-.095-.452-.143-.642.143-.19.287-.736.933-.903 1.124-.166.19-.333.214-.619.071-.287-.143-1.21-.446-2.305-1.425-.853-.761-1.428-1.7-1.595-1.987-.166-.287-.018-.442.125-.584.129-.127.287-.333.43-.5.143-.166.19-.286.287-.476.095-.19.047-.357-.024-.5-.071-.143-.642-1.548-.88-2.12-.232-.558-.468-.482-.642-.491l-.547-.01c-.19 0-.499.071-.76.357-.262.287-.999.977-.999 2.383s1.023 2.764 1.166 2.954c.143.19 2.015 3.076 4.88 4.316.682.294 1.214.471 1.629.603.685.218 1.31.187 1.803.113.549-.082 1.697-.693 1.937-1.362.239-.669.239-1.242.167-1.362-.072-.119-.262-.19-.549-.333z"/>
                      </svg>
                      Chat Admin via WhatsApp
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                {registerError && (
                  <div className="mb-6 p-3.5 rounded-xl text-xs flex items-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{registerError}</span>
                  </div>
                )}

                <div className="mb-5 p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⚠️ Informasi Akun Sementara</span>
                  </p>
                  <p className="leading-relaxed">
                    Pendaftaran mandiri di luar admin akan menghasilkan akun sementara yang berlaku selama **2 hari** saja.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Masukkan nama Anda"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                      Alamat Email
                    </label>
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="contoh: nama@domain.com"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">
                      Kata Sandi (Password)
                    </label>
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Masukkan kata sandi baru"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full py-3 px-4 mt-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Daftar Sekarang</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-150 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sudah memiliki akun?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setLoginError(null);
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    ← Kembali ke Halaman Masuk
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="adin-story-engine-root" 
      className={`h-[100dvh] overflow-hidden w-full max-w-full  flex font-sans antialiased selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300 relative ${
        theme === "dark" 
          ? "bg-slate-950 text-slate-100 dark" 
          : "bg-[#f8fafd] text-[#1e293b]"
      }`}
    >
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/10 via-sky-300/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-[200px] w-[400px] h-[400px] bg-gradient-to-tr from-sky-200/10 via-indigo-200/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Copy notification Toast */}
      {copiedStatus && (
        <div 
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-slide-up border border-slate-800 text-sm"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <Check className="w-3 h-3" />
          </div>
          <span>Berhasil menyalin <strong>{copiedStatus}</strong> ke papan klip!</span>
        </div>
      )}

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 z-[60] md:hidden backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside 
        id="sidebar-navigation" 
        className={`w-72 border-r flex flex-col justify-between shrink-0 z-[70] fixed md:relative inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } transition-transform duration-300 ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div 
            id="brand-header" 
            className={`p-6 border-b flex items-center justify-between transition-colors duration-300 ${
              theme === "dark" ? "border-slate-800" : "border-[#f1f5f9]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-bold text-lg tracking-tight transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-[#0f172a]"
                }`}>AKAR Story Engine</h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">v1.0 • Creator Studio</span>
              </div>
            </div>

            {/* Close sidebar button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
 
          {/* Steps List */}
          <nav id="steps-nav" className="p-4 space-y-1">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              
              // Define visual progress indicator (completed/locked)
              let isCompleted = false;
              if (step.id === "audience" && audience !== null) isCompleted = true;
              if (step.id === "topic" && topic.trim().length > 0) isCompleted = true;
              if (step.id === "genre" && genre !== "") isCompleted = true;
              if (step.id === "script" && script !== null) isCompleted = true;
              if (step.id === "visual" && visualStyle !== "") isCompleted = true;
              if (step.id === "image-prompt" && (imagePrompts !== null || skippedImagePrompt)) isCompleted = true;
              if (step.id === "video-prompt" && videoPrompts !== null) isCompleted = true;
 
              return (
                <button
                  key={step.id}
                  id={`step-btn-${step.id}`}
                  onClick={() => {
                    // Prevent navigating forward to locked steps without data
                    if (step.id === "audience") setCurrentStep(step.id);
                    else if (step.id === "genre" && audience) setCurrentStep(step.id);
                    else if (step.id === "topic" && genre) setCurrentStep(step.id);
                    else if (step.id === "visual" && topic.trim().length > 0) setCurrentStep(step.id);
                    else if (step.id === "script" && visualStyle && topic.trim().length > 0) setCurrentStep(step.id);
                    else if (step.id === "image-prompt" && script) setCurrentStep(step.id);
                    else if (step.id === "video-prompt" && (imagePrompts || skippedImagePrompt)) setCurrentStep(step.id);
                    else if (step.id === "export" && script) setCurrentStep(step.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? "bg-[#2563eb] text-white shadow-lg shadow-blue-500/10" 
                      : theme === "dark"
                      ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#94a3b8]"}`} />
                    <span>{step.label}</span>
                  </div>
                  {isCompleted && !isActive && (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Action */}
        <div 
          id="sidebar-footer" 
          className={`p-4 border-t space-y-3 transition-colors duration-300 ${
            theme === "dark" ? "border-slate-800" : "border-[#f1f5f9]"
          }`}
        >
          {/* Real-time status tracker */}
          <div 
            className={`p-3 rounded-xl flex items-center gap-2 border transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Engine Ready</span>
          </div>

          <button
            id="reset-project-btn"
            onClick={handleResetProject}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-150 ${
              theme === "dark"
                ? "border-rose-950/40 text-rose-400 hover:bg-rose-950/20"
                : "border-rose-200 text-rose-600 hover:bg-rose-50"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Project
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT CANVAS */}
      <main id="main-content-canvas" className="flex-1 min-w-0 w-full max-w-full flex flex-col px-4 pt-0 sm:px-8 md:px-12 relative overflow-y-auto">
        
        {/* Top Header Bar with Theme Switcher and Settings in Top Right */}
        <div className={`w-full sticky top-0 z-50 pt-4 sm:pt-8 md:pt-12 pb-4 mb-4 transition-all duration-300 ${
          theme === "dark" 
            ? "bg-slate-950/95 backdrop-blur-md" 
            : "bg-[#f8fafd]/95 backdrop-blur-md"
        }`}>
          <div className="w-full max-w-4xl mx-auto flex justify-between items-center relative gap-2 xs:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Hamburger Menu Button for Mobile */}
              <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 xs:p-2.5 rounded-lg xs:rounded-xl border shadow-sm transition-all duration-150 flex items-center justify-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
            >
              <Menu className="w-4 h-4 xs:w-5 xs:h-5 text-slate-500 dark:text-slate-400" />
            </button>
            
            <div className={`text-[10px] xs:text-xs font-bold uppercase tracking-widest truncate max-w-[120px] xs:max-w-none ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Langkah: {STEPS.find(s => s.id === currentStep)?.label || "Studio"}
            </div>
          </div>
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-3">
            {/* User Profile Badge */}
            {currentUser && (
              <div className={`group relative flex items-center justify-center sm:justify-start gap-1 sm:gap-2 p-1.5 xs:p-2 sm:px-2.5 sm:py-1.5 rounded-lg xs:rounded-xl border text-[10px] xs:text-xs shadow-sm transition-all duration-150 cursor-default ${
                theme === "dark" 
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" 
                  : "bg-white border-[#e2e8f0] text-slate-600 hover:bg-slate-50"
              }`}>
                <div className="flex items-center justify-center">
                  <User className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-blue-500 shrink-0" />
                </div>
                
                {/* Desktop View: Text details */}
                <div className="hidden sm:flex items-center gap-0.5 sm:gap-1.5">
                  <span className="font-semibold text-xs leading-none truncate max-w-[120px]">{currentUser.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider shrink-0 ${
                    currentUser.role === 'admin' 
                      ? 'bg-amber-500/10 text-amber-600' 
                      : 'bg-blue-500/10 text-blue-600'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
                  {currentUser.expiresAt && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title={`Akun sementara kedaluwarsa pada ${new Date(currentUser.expiresAt).toLocaleString()}`}>
                      <Clock className="w-2 h-2" />
                      <span>2H</span>
                    </span>
                  )}
                  {currentUser.credits !== undefined && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title={`${currentUser.credits} credit tersisa`}>
                      <Coins className="w-2 h-2" />
                      <span>{currentUser.credits} CR</span>
                    </span>
                  )}
                </div>

                {/* Mobile Hover Tooltip */}
                <div className={`absolute top-full right-0 mt-2 p-3 rounded-xl border shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col gap-2 z-50 sm:hidden min-w-[140px] pointer-events-none ${
                  theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs truncate max-w-[100px]">{currentUser.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider shrink-0 ${
                      currentUser.role === 'admin' 
                        ? 'bg-amber-500/10 text-amber-600' 
                        : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {currentUser.expiresAt && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-600 bg-amber-500/10 px-1.5 py-1 rounded uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        <span>Sisa 2 Jam</span>
                      </span>
                    )}
                    {currentUser.credits !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 bg-emerald-500/10 px-1.5 py-1 rounded uppercase tracking-wider">
                        <Coins className="w-3 h-3" />
                        <span>{currentUser.credits} Credits</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Admin User Management Button */}
            {currentUser?.role === "admin" && (
              <button
                onClick={() => {
                  setShowAdminModal(true);
                  fetchUsersList();
                }}
                className={`p-1.5 xs:p-2 sm:p-2.5 rounded-lg xs:rounded-xl border shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${
                  theme === "dark" 
                    ? "bg-amber-950/25 border-amber-900/40 text-amber-400 hover:text-amber-300 hover:bg-amber-900/30" 
                    : "bg-amber-50 border-amber-100 text-amber-700 hover:text-amber-950 hover:bg-amber-100"
                }`}
                title="Kelola Akun Pengguna"
              >
                <Shield className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider ml-1.5 hidden md:inline">Kelola User</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              id="open-settings-btn"
              onClick={() => setShowSettingsModal(true)}
              className={`p-1.5 xs:p-2 sm:p-2.5 rounded-lg xs:rounded-xl border shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${
                theme === "dark" 
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800" 
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Pengaturan API Keys"
            >
              <Settings className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-1.5 xs:p-2 sm:p-2.5 rounded-lg xs:rounded-xl border shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${
                theme === "dark" 
                  ? "bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800" 
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" />
              ) : (
                <Moon className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" />
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`p-1.5 xs:p-2 sm:p-2.5 rounded-lg xs:rounded-xl border shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer shrink-0 ${
                theme === "dark" 
                  ? "bg-rose-950/20 border-rose-900/40 text-rose-400 hover:text-rose-350 hover:bg-rose-900/30" 
                  : "bg-rose-50 border-rose-100 text-rose-650 hover:text-rose-900 hover:bg-rose-100"
              }`}
              title="Keluar dari Aplikasi"
            >
              <LogOut className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" />
            </button>
          </div>
        </div>
        </div>

        {/* Core Container Card with spacious padding */}
        <div className="w-full max-w-4xl mx-auto flex-grow relative z-10 pb-20 md:pb-28">
          
          {/* API Key Missing Default Notice */}
          {!hasApiKey && (
            <div id="api-key-missing-warning-banner" className="mb-8 p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all duration-300 animate-fade-in bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-950 dark:text-amber-200">
              <div className="flex gap-3.5">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl shrink-0 h-fit">
                  <Key className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-0.5 animate-pulse">
                  <h3 className="font-bold text-sm">Konfigurasi API Key Dibutuhkan</h3>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    isi apikey dulu baru bisa jalankan aplikasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="w-full md:w-auto px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Settings className="w-3.5 h-3.5" />
                Input API Key
              </button>
            </div>
          )}

          {/* Missing API Key Warning Box if verified */}
          {serverError && (
            <div id="api-error-alert" className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3 text-sm text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Terjadi Kesalahan Server / API</p>
                <p className="opacity-90">{serverError}</p>
                {needsApiKey && (
                  <p className="font-medium mt-1">
                    Silakan pastikan Anda telah memasang <strong>GEMINI_API_KEY</strong> dengan benar di menu <strong>Settings &gt; Secrets</strong> pada sudut kanan atas workspace.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =========================================
              STEP 1: AUDIENCE
              ========================================= */}
          {currentStep === "audience" && (
            <div id="view-step-audience" className="space-y-6 sm:space-y-8 animate-fade-in">
              <div className="text-center space-y-1.5 sm:space-y-2">
                <h1 id="audience-step-title" className={`text-2xl sm:text-3xl font-extrabold tracking-tight transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>
                  Pilih Target Audience
                </h1>
                <p className={`text-xs sm:text-sm max-w-lg mx-auto transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>
                  Tentukan persona dan gaya bahasa untuk konten Video Short Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 max-w-4xl mx-auto">
                {/* Indonesia Card */}
                <button
                  id="audience-card-indonesia"
                  onClick={() => setAudience("indonesia")}
                  className={`p-4 sm:p-6 border rounded-2xl text-left transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] sm:min-h-[190px] shadow-sm hover:shadow-md ${
                    audience === "indonesia"
                      ? "border-[#2563eb] ring-2 ring-[#2563eb]/15 bg-blue-50/5"
                      : theme === "dark"
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-[#e2e8f0] hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${
                    audience === "indonesia" 
                      ? "bg-blue-50 text-blue-600" 
                      : theme === "dark"
                      ? "bg-slate-850 text-slate-400 group-hover:bg-slate-800"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}>
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <h3 className={`font-bold text-base sm:text-lg tracking-tight transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}>Indonesia</h3>
                    <p className={`text-[11px] sm:text-xs mt-1 leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Gaya bahasa lokal santai, komedi kekinian, ekspresi nusantara, atau finansial relevan.
                    </p>
                  </div>
                  {audience === "indonesia" && (
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                  )}
                </button>

                {/* Global Card */}
                <button
                  id="audience-card-global"
                  onClick={() => setAudience("global")}
                  className={`p-4 sm:p-6 border rounded-2xl text-left transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] sm:min-h-[190px] shadow-sm hover:shadow-md ${
                    audience === "global"
                      ? "border-[#2563eb] ring-2 ring-[#2563eb]/15 bg-blue-50/5"
                      : theme === "dark"
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-[#e2e8f0] hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${
                    audience === "global" 
                      ? "bg-blue-50 text-blue-600" 
                      : theme === "dark"
                      ? "bg-slate-850 text-slate-400 group-hover:bg-slate-800"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}>
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <h3 className={`font-bold text-base sm:text-lg tracking-tight transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}>Global</h3>
                    <p className={`text-[11px] sm:text-xs mt-1 leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>
                      English professional or energetic, universal factual trivia, mind-bending scientific mystery.
                    </p>
                  </div>
                  {audience === "global" && (
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                  )}
                </button>

                {/* Custom / Kustom Card */}
                <button
                  id="audience-card-custom"
                  onClick={() => setAudience("custom")}
                  className={`p-4 sm:p-6 border rounded-2xl text-left transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] sm:min-h-[190px] shadow-sm hover:shadow-md ${
                    audience === "custom"
                      ? "border-[#2563eb] ring-2 ring-[#2563eb]/15 bg-blue-50/5"
                      : theme === "dark"
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                      : "bg-white border-[#e2e8f0] hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${
                    audience === "custom" 
                      ? "bg-blue-50 text-blue-600" 
                      : theme === "dark"
                      ? "bg-slate-850 text-slate-400 group-hover:bg-slate-800"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}>
                    <PenTool className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-3 sm:mt-4">
                    <h3 className={`font-bold text-base sm:text-lg tracking-tight transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}>Kustom</h3>
                    <p className={`text-[11px] sm:text-xs mt-1 leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Ketik target pemirsa spesifik Anda (misal: pengusaha muda, penikmat olahraga ekstrem).
                    </p>
                  </div>
                  {audience === "custom" && (
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                  )}
                </button>
              </div>

              {/* Custom Audience Text Input Area */}
              {audience === "custom" && (
                <div className={`p-4 sm:p-6 border rounded-2xl space-y-3 mt-4 sm:mt-6 max-w-2xl mx-auto transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-blue-50/20 border-blue-100"
                }`}>
                  <label className={`text-xs font-bold uppercase tracking-wider block ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>Tulis Target Pemirsa Anda Secara Manual</label>
                  <textarea
                    id="custom-audience-textarea"
                    value={customAudience}
                    onChange={(e) => setCustomAudience(e.target.value)}
                    placeholder="Contoh: Ibu-ibu rumah tangga pecinta drama korea usia 25-45 tahun di wilayah Jabodetabek."
                    className={`w-full min-h-[100px] p-3 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all outline-none leading-relaxed ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                        : "bg-white border-[#e2e8f0] text-slate-800 placeholder:text-slate-400"
                    }`}
                  />
                </div>
              )}
            </div>
          )}

          {/* =========================================
              STEP 2: TOPIC
              ========================================= */}
          {currentStep === "topic" && (
            <div id="view-step-topic" className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
              {/* Section 1: Ide Topik Sendiri */}
              <div className="space-y-2 sm:space-y-3">
                <div className="space-y-1">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}>Ide Topik Sendiri</h1>
                  <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Tuliskan ide topik kreasi Anda sendiri secara langsung jika sudah memilikinya.
                  </p>
                </div>

                <div className={`border rounded-2xl p-4 sm:p-6 shadow-sm space-y-3 sm:space-y-4 transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
                }`}>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>Tulis Topik Konten Anda</label>
                    <textarea
                      id="own-topic-input"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Masukkan atau ketik detail topik video Shorts/Reels yang ingin Anda buat..."
                      rows={2}
                      className={`w-full p-3 sm:p-3.5 text-xs sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all outline-none leading-relaxed ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                          : "bg-slate-50 border-[#e2e8f0] text-slate-800 placeholder:text-slate-400"
                      }`}
                    />
                    
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        id="btn-refine-own-topic"
                        onClick={handleRefineTopic}
                        disabled={refiningTopic || !topic || !topic.trim()}
                        className={`w-full sm:w-auto px-4 py-2.5 text-[11px] sm:text-xs font-bold rounded-xl flex items-center justify-center sm:justify-start gap-1.5 transition-all duration-300 shadow-sm border ${
                          refiningTopic
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent cursor-not-allowed"
                            : refinementStatus === "success"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                            : refinementStatus === "error"
                            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400"
                            : !topic || !topic.trim()
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent cursor-not-allowed"
                            : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:shadow-md"
                        }`}
                      >
                        {refiningTopic ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyesuaikan Bahasa & Tema...</span>
                          </>
                        ) : refinementStatus === "success" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Bahasa & Tema Disesuaikan!</span>
                          </>
                        ) : refinementStatus === "error" ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Gagal Menyesuaikan</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            <span>Koreksi & Sesuaikan dengan Tema (AI)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider Pemisah */}
              <div className="relative py-2 flex items-center">
                <div className="flex-grow border-t border-dashed border-slate-300 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[10px] sm:text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Atau Cari Ide dengan AI
                </span>
                <div className="flex-grow border-t border-dashed border-slate-300 dark:border-slate-800"></div>
              </div>

              {/* Section 2: Pencarian Ide Topik */}
              <div className="space-y-2 sm:space-y-3">
                <div className="space-y-1">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}>Pencarian Ide Topik</h1>
                  <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Beri sedikit konteks atau biarkan AI memberikan ide-ide paling viral.
                  </p>
                </div>
              </div>

              {/* Tema Spesifik (Opsional) Card */}
              <div className={`border rounded-2xl p-4 sm:p-6 shadow-sm space-y-3 sm:space-y-4 transition-colors duration-300 ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
              }`}>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>Tema Spesifik (Opsional)</label>
                  
                  <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3">
                    <input
                      type="text"
                      id="theme-context-input"
                      value={themeContext}
                      onChange={(e) => setThemeContext(e.target.value)}
                      placeholder="Contoh: bisnis, teknologi, horor, tips keuangan..."
                      className={`flex-1 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all outline-none ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                          : "bg-slate-50 border-[#e2e8f0] text-slate-800 placeholder:text-slate-400"
                      }`}
                    />
                    <button
                      id="generate-ide-btn"
                      onClick={fetchTrendingTopics}
                      disabled={loadingTopics}
                      className="bg-[#2563eb] text-white py-2.5 px-5 sm:py-3 sm:px-6 rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer disabled:opacity-50 text-[11px] sm:text-sm whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                      {loadingTopics ? "Menganalisis..." : "Generate Ide"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Suggestions Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  <h3 className={`text-sm font-bold ${
                    theme === "dark" ? "text-slate-200" : "text-slate-700"
                  }`}>
                    Pilih Satu Topik Viral:
                  </h3>
                </div>

                {loadingTopics ? (
                  <ProcessingLoader type="topics" theme={theme} />
                ) : topicSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topicSuggestions.map((item, idx) => {
                      const isSelected = topic === item.title;
                      return (
                        <button
                          key={idx}
                          id={`topic-suggestion-item-${idx}`}
                          onClick={() => setTopic(item.title)}
                          className={`w-full p-4 sm:p-5 rounded-2xl text-left transition-all relative flex flex-col gap-2.5 border cursor-pointer hover:shadow-md ${
                            isSelected
                              ? theme === "dark"
                                ? "bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20"
                                : "bg-blue-50/20 border-blue-500 ring-2 ring-blue-500/10"
                              : theme === "dark"
                              ? "bg-slate-900 border-slate-800 hover:bg-slate-850"
                              : "bg-white border-[#e2e8f0] hover:bg-slate-50/50"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-4 right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                          )}
                          <h4 className={`font-bold text-sm sm:text-base tracking-tight leading-snug transition-colors pr-8 sm:pr-12 ${
                            theme === "dark" ? "text-white" : "text-slate-900"
                          }`}>
                            {item.title}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 sm:mt-0">
                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1 ${
                              theme === "dark" 
                                ? "bg-red-950/50 text-red-300 border border-red-900/30" 
                                : "bg-red-50 text-red-600"
                            }`}>
                              🔥 Viral Score: {item.viralScore || 95}
                            </span>
                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1 ${
                              theme === "dark" 
                                ? "bg-amber-950/50 text-amber-300 border border-amber-900/30" 
                                : "bg-amber-50 text-amber-600"
                            }`}>
                              ✨ Uniqueness: {item.uniqueness || 85}
                            </span>
                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 sm:mt-0 ${
                              theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                            }`}>
                              {item.category}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                    theme === "dark" ? "border-slate-800 text-slate-500" : "border-[#e2e8f0] text-slate-400"
                  }`}>
                    <Lightbulb className="w-8 h-8 mx-auto opacity-40 mb-3 text-slate-400" />
                    <p className="text-xs font-semibold">Belum Ada Rekomendasi Terbuka</p>
                    <p className="text-[11px] mt-1 max-w-xs mx-auto">
                      Ketik tema spesifik di atas dan klik "Generate Ide" untuk memuat rekomendasi topik viral.
                    </p>
                  </div>
                )}
              </div>

              {/* Selected Topic Customization Panel (High usability addition) */}
              {topic && (
                <div className={`p-6 border rounded-2xl space-y-3 transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-blue-50/10 border-blue-100/60"
                }`}>
                  <label className={`text-xs font-bold uppercase tracking-wider block ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>Refined Topik Pilihan (Bisa Diedit Manual)</label>
                  <textarea
                    id="selected-topic-refine"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={2}
                    className={`w-full p-3 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all outline-none leading-relaxed ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-white"
                        : "bg-white border-[#e2e8f0] text-slate-800"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">
                    💡 Anda bisa menyesuaikan kalimat topik di atas sebelum melangkah ke proses pembuatan skenario.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* =========================================
              STEP 3: GENRE
              ========================================= */}
          {currentStep === "genre" && (
            <div id="view-step-genre" className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>Pilih Genre Konten</h1>
                <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>
                  Suasana video, skema ritme narasi, serta gaya penyuntingan naskah akan disesuaikan dengan genre pilihan Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
                {[
                  { id: "Edukasi & Tips", desc: "Penjelasan informatif, fakta praktis, solusi masalah harian.", icon: BookOpen, color: "blue" },
                  { id: "Misteri & Horor", desc: "Cerita mistis misterius, intrik gelap, visual menegangkan.", icon: Ghost, color: "purple" },
                  { id: "Motivasi & Inspirasi", desc: "Gaya puitis, menggugah emosi hati, pengembangan mental.", icon: Heart, color: "rose" },
                  { id: "Komedi & Parodi", desc: "Humor jenaka cerdas, sindiran tren sosial, sarkasme lucu.", icon: Smile, color: "amber" },
                  { id: "Fakta Unik & Trivia", desc: "Data mengejutkan dunia, edukasi cepat, hook pikiran.", icon: Lightbulb, color: "emerald" },
                  { id: "Drama & Storytelling", desc: "Narasi plot mendalam, sinematik, biografi petualang.", icon: Film, color: "indigo" },
                  { id: "Kustom", desc: "Tulis genre kreasi mandiri sesuai visi kreatif unik Anda.", icon: PenTool, color: "slate" },
                ].map((g) => {
                  const IconComponent = g.icon;
                  const isSelected = genre === g.id;
                  return (
                    <button
                      key={g.id}
                      id={`genre-card-${g.id.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => setGenre(g.id)}
                      className={`p-3 sm:p-4 border rounded-2xl text-left transition-all duration-200 hover:shadow-sm relative flex flex-col justify-between min-h-[110px] sm:min-h-[140px] ${
                        isSelected 
                          ? "border-[#2563eb] ring-2 ring-[#2563eb]/15 bg-blue-50/5" 
                          : theme === "dark"
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                          : "border-[#e2e8f0] hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                        isSelected 
                          ? "bg-blue-50 text-[#2563eb]" 
                          : theme === "dark"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-50 text-[#94a3b8]"
                      }`}>
                        <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="space-y-1 mt-2.5 sm:mt-3">
                        <h4 className={`font-bold text-[11px] sm:text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }`}>{g.id}</h4>
                        <p className={`text-[9.5px] sm:text-[10px] leading-relaxed transition-colors duration-300 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}>{g.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Genre Input Field */}
              {genre === "Kustom" && (
                <div className={`p-4 sm:p-6 border rounded-2xl space-y-3 mt-4 sm:mt-6 max-w-xl mx-auto transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-blue-50/20 border-blue-100"
                }`}>
                  <label className={`text-xs font-bold uppercase tracking-wider block ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>Tulis Genre Konten Kustom Anda</label>
                  <input
                    type="text"
                    id="custom-genre-input"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    placeholder="Contoh: Tekno-Dystopia, Finansial Komedi, Meditasi Alam liar..."
                    className={`w-full p-3 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all outline-none ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                        : "bg-white border-[#e2e8f0] text-slate-800 placeholder:text-slate-400"
                    }`}
                  />
                </div>
              )}
            </div>
          )}

          {/* =========================================
              STEP 4: SCRIPT
              ========================================= */}
          {currentStep === "script" && (
            <div id="view-step-script" className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}>Naskah Skenario AI (Script)</h1>
                  <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Tinjau naskah dialog video short dengan penataan visual timeline b-roll dan efek soundscape audio.
                  </p>
                </div>
                {script && (
                  <div className="flex items-center gap-2">
                    <button
                      id="toggle-edit-script-btn"
                      onClick={() => setIsEditingScript(!isEditingScript)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition ${
                        isEditingScript
                          ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700"
                          : theme === "dark"
                          ? "border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white bg-slate-900/40"
                          : "border-[#e2e8f0] text-slate-700 hover:bg-slate-50 bg-white"
                      }`}
                    >
                      {isEditingScript ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Selesai Mengedit</span>
                        </>
                      ) : (
                        <>
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Edit Skenario</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      id="regenerate-script-btn"
                      onClick={generateScript}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition ${
                        theme === "dark"
                          ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                          : "border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Bikin Ulang Skenario
                    </button>
                  </div>
                )}
              </div>

              {loadingScript ? (
                <ProcessingLoader type="script" theme={theme} />
              ) : !script ? (
                <div className={`border rounded-2xl p-10 text-center space-y-6 max-w-xl mx-auto transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
                }`}>
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                    <Film className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className={`font-bold text-lg transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}>Skenario Siap Diproses</h3>
                    <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>
                      AI Story Engine akan mensintesis ide topik dan gaya penulisan genre Anda ke dalam screenplay lengkap dengan rancangan hook pembuka dan visualisasi adegan.
                    </p>
                  </div>

                  {/* Pengaturan Jumlah Durasi Video */}
                  <div className="space-y-3 text-left border-t pt-4 border-slate-100 dark:border-slate-800">
                    <label className={`text-xs font-bold uppercase tracking-wider block ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>Pengaturan Jumlah Durasi Video Konten</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "10", label: "10 Detik", desc: "Fast & Punchy" },
                        { value: "30", label: "30 Detik", desc: "Standard" },
                        { value: "60", label: "60 Detik", desc: "Deep Dive" },
                      ].map((opt) => {
                        const isSelected = duration === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDuration(opt.value)}
                            className={`p-3 border rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? "border-[#2563eb] bg-blue-50/20 text-[#2563eb] font-bold shadow-sm"
                                : theme === "dark"
                                ? "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                                : "bg-slate-50 border-[#e2e8f0] text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-xs">{opt.label}</span>
                            <span className="text-[9px] font-normal opacity-75">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-1 justify-between sm:justify-start">
                      <span className={`text-xs font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                        Atau Isi Manual (Detik):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="relative max-w-[100px]">
                          <input
                            type="number"
                            min="5"
                            max="300"
                            value={["10", "30", "60"].includes(duration) ? "" : duration}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setDuration(val);
                              } else {
                                setDuration("10");
                              }
                            }}
                            placeholder="Kustom"
                            className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg text-center outline-none border focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all ${
                              !["10", "30", "60"].includes(duration) && duration !== ""
                                ? "border-blue-500 bg-blue-50/10 text-blue-600"
                                : theme === "dark"
                                ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-700"
                                : "bg-white border-[#e2e8f0] text-slate-800 placeholder:text-slate-400"
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 italic">detik</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl text-left space-y-2 text-xs border transition-colors duration-300 ${
                    theme === "dark" ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600"
                  }`}>
                    <p>⚡ <strong>Parameter Proyek:</strong></p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <span className="text-slate-400 block">Audience</span>
                        <span className={`font-semibold capitalize truncate block ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                          {audience === "custom" ? customAudience : audience}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Genre</span>
                        <span className={`font-semibold truncate block ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                          {genre === "Kustom" ? customGenre : genre}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Gaya Visual</span>
                        <span className={`font-semibold truncate block ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                          {visualStyle === "Gaya Kustom" ? customVisualStyle : visualStyle}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Durasi</span>
                        <span className={`font-semibold block ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                          {duration} Detik
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 block">Topic</span>
                        <span className={`font-semibold block truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`} title={topic}>{topic}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    id="start-generate-script-btn"
                    onClick={generateScript}
                    disabled={loadingScript}
                    className="w-full bg-[#2563eb] text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Mulai Rumuskan Skenario AI
                  </button>
                </div>
              ) : (
                // Render beautiful chronological timeline screenplay
                <div className="space-y-6">
                  {/* Script Metadata Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className={`md:col-span-8 border rounded-2xl p-6 shadow-sm space-y-3 transition-colors duration-300 ${
                      theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
                    }`}>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Judul Video Short</h3>
                      {isEditingScript ? (
                        <input
                          type="text"
                          value={script.title}
                          onChange={(e) => updateScriptTitle(e.target.value)}
                          className={`w-full px-4 py-2.5 text-base font-bold rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/25 transition-all ${
                            theme === "dark"
                              ? "bg-slate-950 border-slate-800 text-white"
                              : "bg-white border-slate-200 text-slate-900"
                          }`}
                        />
                      ) : (
                        <h2 id="script-final-title" className={`text-xl font-extrabold tracking-tight leading-snug transition-colors duration-300 ${
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }`}>
                          {script.title}
                        </h2>
                      )}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-colors duration-300 ${
                        theme === "dark" ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-[#f8fafc] border-[#f1f5f9] text-slate-600"
                      }`}>
                        <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
                        {isEditingScript ? (
                          <div className="flex items-center gap-2 w-full">
                            <span className="font-bold shrink-0">Pacing:</span>
                            <input
                              type="text"
                              value={script.pacingStyle}
                              onChange={(e) => updateScriptPacing(e.target.value)}
                              className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/15 transition-all ${
                                theme === "dark"
                                  ? "bg-slate-900 border-slate-850 text-white"
                                  : "bg-white border-[#e2e8f0] text-slate-800"
                              }`}
                            />
                          </div>
                        ) : (
                          <span><strong>Rekomendasi Pacing:</strong> {script.pacingStyle}</span>
                        )}
                      </div>
                    </div>

                    <div className={`md:col-span-4 rounded-2xl p-6 space-y-2 border transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-sky-950/40 border-sky-900/40 text-sky-200" 
                        : "bg-[#f0f9ff] border-[#bae6fd] text-sky-950"
                    }`}>
                      <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                        theme === "dark" ? "text-sky-300" : "text-sky-800"
                      }`}>
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        Strategi Hook 3 Detik
                      </h4>
                      {isEditingScript ? (
                        <textarea
                          rows={3}
                          value={script.hookDescription}
                          onChange={(e) => updateScriptHook(e.target.value)}
                          className={`w-full p-2.5 text-xs rounded-xl border outline-none resize-none focus:ring-2 focus:ring-sky-500/20 transition-all ${
                            theme === "dark"
                              ? "bg-slate-950 border-sky-950/60 text-sky-100"
                              : "bg-white border-sky-200 text-sky-950"
                          }`}
                        />
                      ) : (
                        <p className="text-xs leading-relaxed opacity-90">
                          {script.hookDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Scene Timeline */}
                  <div className={`space-y-6 relative before:absolute before:top-4 before:bottom-4 before:left-4 sm:before:left-5 before:w-0.5 ${
                    theme === "dark" ? "before:bg-slate-800" : "before:bg-slate-200"
                  }`}>
                    {script.scenes.map((scene) => (
                      <div key={scene.sceneNumber} className="flex gap-3 sm:gap-6 relative" id={`script-scene-block-${scene.sceneNumber}`}>
                        {/* Circle scene marker */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-md shadow-blue-500/10 shrink-0 z-10">
                          {scene.sceneNumber}
                        </div>

                        <div className={`flex-1 border rounded-2xl p-6 shadow-sm hover:border-[#bae6fd] transition duration-300 space-y-4 ${
                          theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-[#e2e8f0]"
                        }`}>
                          <div className={`flex items-center justify-between border-b pb-3 ${
                            theme === "dark" ? "border-slate-800" : "border-slate-50"
                          }`}>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {scene.timeRange}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Adegan {scene.sceneNumber}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Dialogue / VO */}
                            <div className="md:col-span-6 bg-slate-50/80 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100/50 dark:border-slate-800/50 space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suara Latar (Voiceover / VO)</span>
                              {isEditingScript ? (
                                <textarea
                                  rows={4}
                                  value={scene.voiceOver}
                                  onChange={(e) => updateSceneField(scene.sceneNumber, "voiceOver", e.target.value)}
                                  className={`w-full p-2.5 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                                    theme === "dark"
                                      ? "bg-slate-900 border-slate-800 text-white"
                                      : "bg-white border-slate-200 text-slate-850"
                                  }`}
                                />
                              ) : (
                                <blockquote className="text-sm font-medium text-slate-800 dark:text-slate-200 italic leading-relaxed">
                                  "{scene.voiceOver}"
                                </blockquote>
                              )}
                            </div>

                            {/* Visual Action & SFX */}
                            <div className="md:col-span-6 space-y-3">
                              <div className="space-y-1 text-xs">
                                <span className="font-bold text-slate-500 flex items-center gap-1.5">
                                  <Film className="w-3.5 h-3.5 text-blue-500" />
                                  Instruksi Visual (B-Roll)
                                </span>
                                {isEditingScript ? (
                                  <textarea
                                    rows={3}
                                    value={scene.visualInstructions}
                                    onChange={(e) => updateSceneField(scene.sceneNumber, "visualInstructions", e.target.value)}
                                    className={`w-full p-2.5 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                                      theme === "dark"
                                        ? "bg-slate-900 border-slate-800 text-white"
                                        : "bg-white border-slate-200 text-slate-850"
                                    }`}
                                  />
                                ) : (
                                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                                    {scene.visualInstructions}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1 text-xs">
                                <span className="font-bold text-slate-500 flex items-center gap-1.5">
                                  <Music className="w-3.5 h-3.5 text-emerald-500" />
                                  Atmosfer Audio & SFX
                                </span>
                                {isEditingScript ? (
                                  <textarea
                                    rows={2}
                                    value={scene.audioVibe}
                                    onChange={(e) => updateSceneField(scene.sceneNumber, "audioVibe", e.target.value)}
                                    className={`w-full p-2.5 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                                      theme === "dark"
                                        ? "bg-slate-900 border-slate-800 text-white"
                                        : "bg-white border-slate-200 text-slate-850"
                                    }`}
                                  />
                                ) : (
                                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-5 italic">
                                    {scene.audioVibe}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================
              STEP 5: VISUAL STYLE
              ========================================= */}
          {currentStep === "visual" && (
            <div id="view-step-visual" className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>Pilih Gaya Visual</h1>
                <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>
                  Gaya visual pilihan Anda akan diintegrasikan langsung ke dalam perumusan visual prompt sheet generator.
                </p>
              </div>

              <div className="grid grid-cols-1 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
                {VISUAL_STYLES.map((style) => {
                  const isSelected = visualStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      id={`style-card-${style.id.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                      onClick={() => setVisualStyle(style.id)}
                      className={`p-3 sm:p-4 border rounded-2xl text-left transition-all duration-200 hover:shadow-sm relative flex flex-col justify-between min-h-[110px] sm:min-h-[140px] ${
                        isSelected 
                          ? "border-[#2563eb] ring-2 ring-[#2563eb]/15 bg-blue-50/5" 
                          : theme === "dark"
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                          : "border-[#e2e8f0] hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-450">Gaya Estetika</span>
                      <div className="space-y-1 mt-2.5 sm:mt-3">
                        <h4 className={`font-bold text-[11px] sm:text-xs transition-colors duration-300 ${
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }`}>{style.id}</h4>
                        <p className={`text-[9.5px] sm:text-[10px] leading-relaxed transition-colors duration-300 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}>{style.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Visual Style Input Field */}
              {visualStyle === "Gaya Kustom" && (
                <div className={`p-4 sm:p-6 border rounded-2xl space-y-3 mt-4 sm:mt-6 max-w-xl mx-auto transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-blue-50/20 border-blue-100"
                }`}>
                  <label className={`text-xs font-bold uppercase tracking-wider block ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>Tulis Gaya Visual Kustom Anda</label>
                  <input
                    type="text"
                    id="custom-visual-style-input"
                    value={customVisualStyle}
                    onChange={(e) => setCustomVisualStyle(e.target.value)}
                    placeholder="Contoh: Claymation imut bercahaya lembut, film noir hitam-putih grainy..."
                    className={`w-full p-3 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] transition-all outline-none ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600"
                        : "bg-white border-[#e2e8f0] text-slate-800 placeholder:text-slate-400"
                    }`}
                  />
                </div>
              )}
            </div>
          )}

          {/* =========================================
              STEP 6: IMAGE PROMPT SHEET
              ========================================= */}
          {currentStep === "image-prompt" && (
            <div id="view-step-image-prompt" className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}>Prompt Sheet Gambar AI</h1>
                  <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Salin visual prompt bahasa inggris yang telah dioptimalkan untuk Midjourney, Stable Diffusion, atau DALL-E.
                  </p>
                </div>
                {imagePrompts && (
                  <div className="flex items-center gap-2">
                    <button
                      id="download-image-prompts-btn"
                      onClick={downloadImagePrompts}
                      className="p-2 bg-blue-600 border border-blue-500 text-white rounded-lg cursor-pointer transition hover:bg-blue-700 shadow-xs"
                      title="Unduh Prompt (TXT)"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      id="regenerate-image-prompts-btn"
                      onClick={generateImagePrompts}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition ${
                        theme === "dark"
                          ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                          : "border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Bikin Ulang Prompt
                    </button>
                  </div>
                )}
              </div>

              {loadingImagePrompts ? (
                <ProcessingLoader type="image-prompts" theme={theme} />
              ) : !imagePrompts ? (
                <div className={`border rounded-2xl p-10 text-center space-y-6 max-w-xl mx-auto transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
                }`}>
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center mx-auto shadow-sm">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className={`font-bold text-lg transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}>Optimasi Prompt Gambar AI</h3>
                    <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Sistem akan membedah instruksi visual b-roll naskah Anda, lalu menyusun visual deskripsi profesional bersandar pada gaya artistik <strong>{visualStyle === "Gaya Kustom" ? customVisualStyle : visualStyle}</strong> dalam bahasa inggris yang kaya akan atribut visual.
                    </p>
                  </div>

                  <button
                    id="start-generate-image-prompts-btn"
                    onClick={generateImagePrompts}
                    disabled={loadingImagePrompts}
                    className="w-full bg-[#2563eb] text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {loadingImagePrompts ? "Mengkalkulasi Seni Visual..." : "Mulai Optimasi Prompt Gambar"}
                  </button>

                  <button
                    type="button"
                    id="skip-to-video-prompts-btn"
                    onClick={() => {
                      setSkippedImagePrompt(true);
                      setCurrentStep("video-prompt");
                    }}
                    className={`w-full py-2.5 px-6 rounded-xl font-semibold text-xs border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      theme === "dark"
                        ? "border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    Skip & Lanjut ke Prompt Video →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {imagePrompts.map((p) => {
                    // Match scene VO for context reference
                    const sc = script?.scenes.find(s => s.sceneNumber === p.sceneNumber);
                    return (
                      <div key={p.sceneNumber} className={`border rounded-2xl p-6 shadow-sm space-y-4 transition-colors duration-300 ${
                        theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-[#e2e8f0]"
                      }`} id={`image-prompt-block-${p.sceneNumber}`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${
                          theme === "dark" ? "border-slate-800" : "border-slate-50"
                        }`}>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-full">
                            Adegan {p.sceneNumber} • {sc?.timeRange || ""}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{p.aspectRatioTip}</span>
                        </div>

                        {sc && (
                          <div className={`p-3 rounded-xl text-[11px] leading-normal border transition-colors duration-300 ${
                            theme === "dark" 
                              ? "bg-slate-950/60 border-slate-800/80 text-slate-400" 
                              : "bg-[#f8fafc] border-[#f1f5f9] text-slate-500"
                          }`}>
                            📌 <strong>Visual Ref (Naskah):</strong> {sc.visualInstructions}
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Generated English Prompt</span>
                            <button
                              id={`copy-image-prompt-btn-${p.sceneNumber}`}
                              onClick={() => handleCopy(p.optimizedPrompt, `Prompt Gambar ${p.sceneNumber}`)}
                              className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Salin Prompt
                            </button>
                          </div>
                          <div className="bg-slate-950 text-[#f8fafc] p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed break-words relative select-all selection:bg-slate-800">
                            {p.optimizedPrompt}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================
              STEP 7: VIDEO PROMPT SHEET
              ========================================= */}
          {currentStep === "video-prompt" && (
            <div id="view-step-video-prompt" className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}>AI Video Motion Prompts</h1>
                  <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Prompt pergerakan kamera dan dinamisitas video untuk model video AI (Runway Gen-3, Luma, Sora).
                  </p>
                </div>
                {videoPrompts && (
                  <div className="flex items-center gap-2">
                    <button
                      id="download-video-prompts-btn"
                      onClick={downloadVideoPrompts}
                      className="p-2 bg-blue-600 border border-blue-500 text-white rounded-lg cursor-pointer transition hover:bg-blue-700 shadow-xs"
                      title="Unduh Prompt (TXT)"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      id="regenerate-video-prompts-btn"
                      onClick={generateVideoPrompts}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition ${
                        theme === "dark"
                          ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                          : "border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Bikin Ulang Prompt Video
                    </button>
                  </div>
                )}
              </div>

              {loadingVideoPrompts ? (
                <ProcessingLoader type="video-prompts" theme={theme} />
              ) : !videoPrompts ? (
                <div className={`border rounded-2xl p-10 text-center space-y-6 max-w-xl mx-auto transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
                }`}>
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center mx-auto shadow-sm">
                    <VideoIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className={`font-bold text-lg transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}>Rumuskan Dinamisitas Kamera</h3>
                    <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Sistem akan menganalisis transisi gambar dan b-roll, kemudian menyusun naskah pergerakan kamera (pan, tilt, orbit, zoom rate) bersandar pada model sintesis video mutakhir.
                    </p>
                  </div>

                  <button
                    id="start-generate-video-prompts-btn"
                    onClick={generateVideoPrompts}
                    disabled={loadingVideoPrompts}
                    className="w-full bg-[#2563eb] text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {loadingVideoPrompts ? "Menghitung Gerakan..." : "Mulai Formulasi Prompt Video"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {videoPrompts.map((p) => {
                    const sc = script?.scenes.find(s => s.sceneNumber === p.sceneNumber);
                    return (
                      <div key={p.sceneNumber} className={`border rounded-2xl p-6 shadow-sm space-y-4 transition-colors duration-300 ${
                        theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-[#e2e8f0]"
                      }`} id={`video-prompt-block-${p.sceneNumber}`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${
                          theme === "dark" ? "border-slate-800" : "border-slate-50"
                        }`}>
                          <span className="text-xs font-extrabold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1 rounded-full uppercase tracking-wider">
                            PROMPT VIDEO {p.sceneNumber} ({sc?.timeRange ? sc.timeRange.toUpperCase() : "0-10 DETIK"})
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Settings: {p.runwaySettings}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">AI VIDEO PROMPT (ENGLISH)</span>
                            <button
                              id={`copy-video-prompt-btn-${p.sceneNumber}`}
                              onClick={() => handleCopy(p.motionPrompt, `Prompt Video ${p.sceneNumber}`)}
                              className="text-xs font-semibold text-[#2563eb] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Salin Prompt Video
                            </button>
                          </div>
                          <div className="bg-slate-950 text-[#f8fafc] p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed break-words relative select-all selection:bg-slate-800">
                            {p.motionPrompt}
                          </div>
                        </div>

                        <div className="space-y-2 border-t pt-4 dark:border-slate-800 border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">VO INDONESIA</span>
                            <button
                              id={`copy-vo-btn-${p.sceneNumber}`}
                              onClick={() => handleCopy(sc?.voiceOver || "", `Voiceover Adegan ${p.sceneNumber}`)}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Salin VO
                            </button>
                          </div>
                          <blockquote className="text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                            "{sc?.voiceOver}"
                          </blockquote>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================
              STEP 8: EXPORT SECTION
              ========================================= */}
          {currentStep === "export" && (
            <div id="view-step-export" className="space-y-6 animate-fade-in">
              <div className="space-y-1">
                <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>Ekspor & Salin Paket Story</h1>
                <p className={`text-[11px] sm:text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>
                  Salin seluruh isi rancangan skenario naskah, visual b-roll, sfx audio, prompt gambar, dan prompt video Anda untuk disimpan.
                </p>
              </div>

              {script && (
                <div className="space-y-6">
                  {/* Master Copy Button Block */}
                  <div className={`border p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm transition-colors duration-300 ${
                    theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
                  }`}>
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className={`font-bold text-base transition-colors duration-300 ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}>Bundel Produksi Konten Lengkap</h3>
                      <p className={`text-xs transition-colors duration-300 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}>
                        Siap digunakan untuk pembuatan aset gambar, editing klip video, dan voice-over recording.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        id="copy-all-production-btn"
                        onClick={() => handleCopy(getProductionMarkdown(), "Bundel Produksi Markdown")}
                        className="flex-1 sm:flex-initial bg-[#2563eb] text-white py-2.5 px-5 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        Salin Semua (Markdown)
                      </button>
                      <button
                        id="download-json-production-btn"
                        onClick={() => {
                          const jsonPayload = {
                            metadata: { audience, genre, visualStyle },
                            script,
                            imagePrompts,
                            videoPrompts
                          };
                          const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `akar-story-${script.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`;
                          a.click();
                        }}
                        className={`px-3 py-2.5 border rounded-xl font-semibold transition flex items-center justify-center cursor-pointer ${
                          theme === "dark" 
                            ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white" 
                            : "border-[#e2e8f0] text-slate-600 hover:bg-slate-50"
                        }`}
                        title="Download file produksi JSON"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Production Markdown Sheet Preview */}
                  <div className={`border rounded-2xl p-6 shadow-sm space-y-3 transition-colors duration-300 ${
                    theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-[#e2e8f0]"
                  }`}>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Pratinjau Lembar Produksi (Markdown)</h4>
                    <pre className="p-4 bg-slate-950 text-[#f8fafc] text-xs font-mono rounded-xl max-h-[380px] overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
                      {getProductionMarkdown()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        {/* Global Small Footer */}
        <footer id="app-visual-footer" className={`text-center text-xs mt-12 pb-6 border-t pt-4 transition-colors duration-300 ${
          theme === "dark" ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
        }`}>
          <p>© 2026 AKAR Story Engine. Karya visual dengan tata artistik, spasi seimbang, dan keterbacaan tinggi.</p>
        </footer>
      </div>

      {/* =========================================
          COMMON FOOTER NAVIGATION CONTROLS
          ========================================= */}
      <div 
        id="control-footer-navigation"
            className={`sticky bottom-0 z-40 py-3 px-4 sm:px-6 md:px-12 -mx-4 sm:-mx-8 md:-mx-12 border-t flex flex-row items-center justify-between transition-colors duration-300 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] ${
              theme === "dark" ? "border-slate-800 bg-slate-950/80 backdrop-blur-xl" : "border-[#e2e8f0]/60 bg-slate-50/80 backdrop-blur-xl"
            }`}
          >
            {/* Prev step */}
            <button
              id="prev-navigation-btn"
              onClick={() => {
                const idx = STEPS.findIndex(s => s.id === currentStep);
                if (idx > 0) {
                  setCurrentStep(STEPS[idx - 1].id);
                }
              }}
              disabled={currentStep === "audience"}
              className={`w-auto px-4 py-2.5 sm:px-5 sm:py-3 border text-[11px] sm:text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none text-center rounded-xl hover:border-slate-300 dark:hover:border-slate-700 ${
                theme === "dark" ? "text-slate-400 hover:text-white border-slate-800 bg-slate-900" : "text-slate-500 hover:text-slate-900 border-slate-200 bg-white"
              } sm:bg-transparent sm:border-transparent`}
            >
              <span className="sm:hidden">&lt; Back</span>
              <span className="hidden sm:inline">&lt; Kembali</span>
            </button>

            {/* Next step CTA */}
            {getNextStepId() ? (
              <button
                id="next-navigation-btn"
                onClick={handleNextStep}
                disabled={!canGoNext()}
                className={`w-auto py-2.5 px-5 sm:py-3 sm:px-6 rounded-xl font-bold text-xs sm:text-sm tracking-tight transition flex items-center justify-center gap-1.5 sm:gap-2 ${
                  canGoNext()
                    ? "bg-[#2563eb] text-white hover:bg-blue-700 shadow-lg shadow-blue-500/10 cursor-pointer"
                    : theme === "dark"
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                    : "bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed"
                }`}
              >
                <span className="whitespace-nowrap sm:hidden">Lanjut</span>
                <span className="hidden sm:inline">Lanjut ke Tahap Berikutnya</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
              </button>
            ) : <div className="w-auto" />}
          </div>
      </main>

      {/* Settings API Modal Overlay */}
      {showSettingsModal && (
        <div id="settings-api-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          
          {/* Content Card */}
          <div className={`relative w-full max-w-lg max-h-[85dvh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-300 transform scale-100 animate-fade-in ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
          }`}>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b p-4 sm:p-6 pb-4 transition-colors duration-300 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base leading-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    🔑 Pengaturan API Keys
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Konfigurasi jalur kecerdasan buatan Anda</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0 sm:pt-4 space-y-4 hide-scrollbar">
              {/* Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto hide-scrollbar">
                {["GEMINI", "OPENROUTER", "OPENAGENTIC"].map((channel) => (
                  <button
                    key={channel}
                    onClick={() => setApiKeyChannel(channel)}
                    className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                      apiKeyChannel === channel
                        ? "border-blue-500 text-blue-500"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>

              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                theme === "dark" ? "bg-amber-950/20 border-amber-900/50 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    {apiKeyChannel === "GEMINI" ? (
                      <>Dapatkan kunci Gemini API gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-medium hover:underline">Google AI Studio</a>.</>
                    ) : apiKeyChannel === "OPENAGENTIC" ? (
                      <>Tambah kunci OpenAgentic (<a href="https://openagentic.id" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-medium hover:underline">openagentic.id</a>). Syarat Free Plan: Top up min Rp10.000 (<a href="https://aimurah.my.id/donations" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-medium hover:underline">di sini</a>).</>
                    ) : (
                      <>Tambah kunci OpenRouter (<a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-medium hover:underline">openrouter.ai/keys</a>). Daftar gratis, model free tidak memerlukan kredit berbayar.</>
                    )}
                  </p>
                </div>
              </div>

              {apiKeyChannel !== "GEMINI" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">MODEL {apiKeyChannel}</label>
                    {(() => {
                      const modelList = apiKeyChannel === "OPENROUTER" ? OPENROUTER_MODELS : (apiKeyChannel === "OPENAGENTIC" ? OPENAGENTIC_MODELS : []);
                      const isPreset = modelList.some(g => g.options.some(o => o.value === apiModel));
                      
                      return (
                        <div className="space-y-2">
                          {modelList.length > 0 && (
                            <div className="relative">
                              <select
                                value={isPreset ? apiModel : "custom"}
                                onChange={(e) => setApiModel(e.target.value === "custom" ? "" : e.target.value)}
                                className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                  theme === "dark"
                                    ? "bg-slate-950 border-slate-800 text-white"
                                    : "bg-[#f8fafd] border-slate-200 text-slate-800"
                                }`}
                              >
                                {modelList.map((group, idx) => (
                                  <optgroup key={idx} label={group.group}>
                                    {group.options.map((opt, oIdx) => (
                                      <option key={oIdx} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </optgroup>
                                ))}
                                <optgroup label="Kustom">
                                  <option value="custom">Kustom — tempel slug sendiri</option>
                                </optgroup>
                              </select>
                              <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                          
                          {(!isPreset || apiModel === "" || modelList.length === 0) && (
                            <input
                              type="text"
                              value={apiModel}
                              onChange={(e) => setApiModel(e.target.value)}
                              placeholder={`Tempel ${apiKeyChannel} model slug di sini...`}
                              className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                                theme === "dark"
                                  ? "bg-slate-950 border-slate-800 text-white"
                                  : "bg-[#f8fafd] border-slate-200 text-slate-800"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })()}
                    {apiKeyChannel === "OPENROUTER" && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Pilih preset Free atau Kustom lalu tempel slug dari <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">openrouter.ai/models</a>.</p>
                    )}
                  </div>
                </>
              )}

              {/* Textarea for API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">TAMBAH KEY {apiKeyChannel}</label>
                </div>
                <div className="relative">
                  <textarea
                    id="api-key-input"
                    value={apiKeysRaw}
                    onChange={(e) => setApiKeysRaw(e.target.value)}
                    placeholder={`Tempel ${apiKeyChannel} API key di sini...`}
                    rows={2}
                    className={`w-full pl-3 pr-10 py-2.5 rounded-xl text-xs font-mono border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-150 whitespace-pre-wrap break-all ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500/50"
                        : "bg-[#f8fafd] border-slate-200 text-slate-800 focus:border-blue-400"
                    }`}
                  />
                  <div className="absolute top-2.5 right-3 text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {apiKeysRaw ? (
                <div className={`p-4 rounded-xl border transition-colors duration-300 ${
                  theme === "dark" ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-100"
                }`}>
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Terdapat {apiKeysRaw.split("\n").filter(k => k.trim()).length} Key(s)</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex flex-col items-center gap-2">
                  <Key className="w-6 h-6 opacity-20" />
                  <p>Belum ada key {apiKeyChannel}<br/>Tambahkan di atas untuk platform ini.</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-slate-900 rounded-b-2xl">
              <button
                type="button"
                onClick={handleClearKeys}
                className={`p-3 sm:px-4 sm:py-2 flex-1 sm:flex-none text-xs font-bold uppercase tracking-wider rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  theme === "dark" 
                    ? "border-rose-950/40 text-rose-400 hover:bg-rose-950/20" 
                    : "border-rose-100 text-rose-600 hover:bg-rose-50"
                }`}
                title="Hapus semua API Key pada jalur yang aktif saat ini"
              >
                <Trash2 className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Hapus Semua</span>
              </button>
              
              <div className="flex flex-row items-center gap-2 sm:gap-3 flex-[2] sm:flex-none">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className={`p-3 sm:px-4 sm:py-2 flex-1 sm:flex-none text-xs font-bold uppercase tracking-wider rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    theme === "dark" 
                      ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white" 
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                  title="Tutup"
                >
                  <X className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Tutup</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveKeys}
                  className="p-3 sm:px-5 sm:py-2 flex-1 sm:flex-none text-xs font-bold uppercase tracking-wider rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/10"
                  title="Tambah & Simpan"
                >
                  <Save className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">+ Tambah & Simpan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div id="reset-confirm-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          
          {/* Content Card */}
          <div className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all duration-300 transform scale-100 animate-fade-in ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
          }`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className={`font-bold text-lg leading-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  Atur Ulang Proyek?
                </h3>
                <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Apakah Anda yakin ingin mengatur ulang semua progres proyek? Seluruh pilihan target audiens, topik, skenario naskah, b-roll, dan rekomendasi visual akan dikembalikan ke pengaturan awal.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition cursor-pointer ${
                  theme === "dark" 
                    ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white" 
                    : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={triggerResetProject}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer shadow-lg shadow-rose-600/10"
              >
                Ya, Atur Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminModal && (
        <div id="admin-user-manager-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowAdminModal(false)} />
          
          {/* Content Card */}
          <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl border transition-all duration-300 transform scale-100 animate-fade-in ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-850"
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-6 transition-colors duration-300 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base leading-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    🛡️ Panel Manajemen Pengguna
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Tambah, hapus, dan kelola peran otorisasi user</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Tambah Pengguna */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Buat Pengguna Baru</h4>
                
                {adminError && (
                  <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                {adminSuccess && (
                  <div className="p-3.5 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{adminSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-450">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={adminNewName}
                      onChange={(e) => setAdminNewName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-450">Alamat Email</label>
                    <input
                      type="email"
                      required
                      value={adminNewEmail}
                      onChange={(e) => setAdminNewEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-450">Kata Sandi (Password)</label>
                    <input
                      type="text"
                      required
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        theme === "dark"
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-455">Peran Pengguna (Role)</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="adminNewRole"
                          value="user"
                          checked={adminNewRole === "user"}
                          onChange={() => setAdminNewRole("user")}
                          className="accent-blue-600"
                        />
                        <span>Regular User</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="adminNewRole"
                          value="admin"
                          checked={adminNewRole === "admin"}
                          onChange={() => setAdminNewRole("admin")}
                          className="accent-amber-500"
                        />
                        <span>Admin</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full py-2.5 px-4 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adminLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Tambahkan User</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Daftar Pengguna Aktif */}
              <div className="lg:col-span-7 space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daftar Pengguna Aktif ({filteredUsers.length})</h4>
                    <button
                      type="button"
                      onClick={fetchUsersList}
                      className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      Segarkan List
                    </button>
                  </div>
                  
                  {/* Tab Filters */}
                  <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminUserFilter("all");
                        setShowBulkDeleteConfirm(null);
                      }}
                      className={`flex-1 min-w-[70px] text-center px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        adminUserFilter === "all"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Semua ({totalUsers})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminUserFilter("admin");
                        setShowBulkDeleteConfirm(null);
                      }}
                      className={`flex-1 min-w-[90px] text-center px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        adminUserFilter === "admin"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Dibuat Admin ({adminCreatedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminUserFilter("self");
                        setShowBulkDeleteConfirm(null);
                      }}
                      className={`flex-1 min-w-[100px] text-center px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        adminUserFilter === "self"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Daftar Mandiri ({selfRegisteredCount})
                    </button>
                  </div>

                  {/* Bulk Delete Options */}
                  {adminUserFilter === "self" && selfRegisteredCount > 0 && (
                    <div className="p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Terdapat <strong>{selfRegisteredCount}</strong> akun mendaftar mandiri.</span>
                      </div>
                      {showBulkDeleteConfirm === "self" ? (
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleBulkDelete("self")}
                            disabled={adminLoading}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Yakin, Hapus Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBulkDeleteConfirm(null)}
                            className={`px-2.5 py-1.5 font-semibold rounded-lg text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
                              theme === "dark" 
                                ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" 
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowBulkDeleteConfirm("self")}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer shrink-0 self-end sm:self-auto"
                        >
                          Hapus Semua Akun Mandiri
                        </button>
                      )}
                    </div>
                  )}

                  {adminUserFilter === "all" && totalUsers > 1 && (
                    <div className="p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Terdapat <strong>{totalUsers - 1}</strong> pengguna lain selain Anda.</span>
                      </div>
                      {showBulkDeleteConfirm === "all" ? (
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleBulkDelete("all")}
                            disabled={adminLoading}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Yakin, Hapus Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBulkDeleteConfirm(null)}
                            className={`px-2.5 py-1.5 font-semibold rounded-lg text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
                              theme === "dark" 
                                ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" 
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowBulkDeleteConfirm("all")}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer shrink-0 self-end sm:sm:self-auto"
                        >
                          Hapus Semua Pengguna Lain
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className={`border rounded-2xl divide-y overflow-hidden max-h-[50vh] overflow-y-auto ${
                  theme === "dark" ? "border-slate-800 divide-slate-800 bg-slate-950" : "border-slate-200 divide-slate-100 bg-slate-50"
                }`}>
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">
                      Tidak ada user yang sesuai kriteria filter.
                    </div>
                  ) : (
                    filteredUsers.map((usr: any) => (
                      <div key={usr.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm truncate">{usr.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                              usr.role === 'admin' 
                                ? 'bg-amber-500/15 text-amber-500' 
                                : 'bg-blue-500/15 text-blue-500'
                            }`}>
                              {usr.role}
                            </span>
                            {usr.expiresAt && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/10 shrink-0">
                                Daftar Mandiri
                              </span>
                            )}
                            {usr.id === currentUser?.id && (
                              <span className="text-[10px] text-slate-400 italic">(Anda)</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{usr.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500">ID: {usr.id} • Dibuat: {new Date(usr.createdAt).toLocaleDateString()}</span>
                            {usr.expiresAt && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                Berlaku s/d: {new Date(usr.expiresAt).toLocaleDateString()} {new Date(usr.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {usr.id !== currentUser?.id && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {deletingUserId === usr.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(usr.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-[10px] font-bold text-white transition-colors cursor-pointer"
                                  title="Konfirmasi Hapus"
                                >
                                  Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingUserId(null)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                    theme === "dark" 
                                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" 
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                  title="Batal"
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingUserId(usr.id)}
                                className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
