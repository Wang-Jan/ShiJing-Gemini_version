import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Camera,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Cpu,
  User,
  KeyRound,
  Server,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthUser } from '../types';

interface SettingsViewProps {
  user: AuthUser;
  authToken: string;
  gardenApiKey: string;
  gardenBaseUrl: string;
  onGardenApiKeyChange: (value: string) => void;
  onGardenBaseUrlChange: (value: string) => void;
  onLogout: () => void;
  onUserUpdate: (user: AuthUser, token?: string) => void;
}

interface SettingItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  color?: string;
}

type ModalType = 'security' | 'profile' | 'garden' | null;

const SettingItem: React.FC<SettingItemProps> = ({ icon: Icon, label, value, onClick, color = 'text-slate-400' }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full p-4 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 last:border-0 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 ${color}`}>
        <Icon size={20} />
      </div>
      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-slate-400 font-medium">{value}</span>}
      <ChevronRight size={16} className="text-slate-300" />
    </div>
  </button>
);

const getPasswordStrength = (pwd: string) => {
  if (!pwd) {
    return { label: '未填写', color: 'bg-slate-200', width: '0%' };
  }

  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  switch (score) {
    case 1:
      return { label: '较弱', color: 'bg-red-500', width: '25%' };
    case 2:
      return { label: '一般', color: 'bg-orange-500', width: '50%' };
    case 3:
      return { label: '较强', color: 'bg-blue-500', width: '75%' };
    case 4:
      return { label: '很强', color: 'bg-green-500', width: '100%' };
    default:
      return { label: '极弱', color: 'bg-red-400', width: '10%' };
  }
};

const maskApiKey = (value: string) => {
  if (!value) {
    return '未填写';
  }

  if (value.length <= 10) {
    return '已填写';
  }

  return `${value.slice(0, 5)}...${value.slice(-4)}`;
};

const formatBaseUrlLabel = (value: string) => {
  if (!value) {
    return '未填写';
  }

  return value.length > 24 ? `${value.slice(0, 24)}...` : value;
};

const NativeSheet: React.FC<{
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}> = ({ title, subtitle, onClose, children, footer }) => (
  <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm">
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-[2rem] bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
    >
      <div className="px-5 pt-3 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-50">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="max-h-[calc(90vh-170px)] overflow-y-auto px-5 py-5 space-y-5">
        {children}
      </div>
      <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        {footer}
      </div>
    </motion.div>
  </div>
);

const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  authToken,
  gardenApiKey,
  gardenBaseUrl,
  onGardenApiKeyChange,
  onGardenBaseUrlChange,
  onLogout,
  onUserUpdate,
}) => {
  const [robotConnected, setRobotConnected] = useState(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [profileNickname, setProfileNickname] = useState(user.nickname);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(user.avatar ?? null);
  const [gardenApiKeyDraft, setGardenApiKeyDraft] = useState(gardenApiKey);
  const [gardenBaseUrlDraft, setGardenBaseUrlDraft] = useState(gardenBaseUrl);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGardenApiKey, setShowGardenApiKey] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGardenApiKeyDraft(gardenApiKey);
  }, [gardenApiKey]);

  useEffect(() => {
    setGardenBaseUrlDraft(gardenBaseUrl);
  }, [gardenBaseUrl]);

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const openModal = (type: ModalType) => {
    resetMessages();

    if (type === 'profile') {
      setProfileNickname(user.nickname);
      setProfileAvatar(user.avatar ?? null);
    }

    if (type === 'security') {
      resetPasswordForm();
    }

    if (type === 'garden') {
      setGardenApiKeyDraft(gardenApiKey);
      setGardenBaseUrlDraft(gardenBaseUrl);
      setShowGardenApiKey(false);
    }

    setActiveModal(type);
  };

  const closeModal = () => {
    resetMessages();
    setSubmitting(false);
    setActiveModal(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setProfileAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    resetMessages();

    if (!profileNickname.trim()) {
      setError('昵称不能为空。');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          nickname: profileNickname.trim(),
          avatar: profileAvatar,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.user) {
        setError(data.message || '个人资料更新失败。');
        return;
      }

      onUserUpdate(data.user as AuthUser, data.token as string | undefined);
      setSuccessMessage('个人资料已更新。');
    } catch {
      setError('网络连接失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSave = async () => {
    resetMessages();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请完整填写密码信息。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码必须完全一致。');
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度至少需要 6 位。');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || '密码修改失败。');
        return;
      }

      setSuccessMessage('密码修改成功。');
      resetPasswordForm();
    } catch {
      setError('网络连接失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGardenConfigSave = () => {
    onGardenApiKeyChange(gardenApiKeyDraft.trim());
    onGardenBaseUrlChange(gardenBaseUrlDraft.trim());
    setSuccessMessage('Garden 配置已保存到当前设备。');
  };

  const handleGardenConfigReset = () => {
    setGardenApiKeyDraft('');
    setGardenBaseUrlDraft('');
    onGardenApiKeyChange('');
    onGardenBaseUrlChange('');
    setSuccessMessage('已恢复为 .env 默认配置。');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="px-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">设置</h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">系统配置与账户管理</p>
      </div>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-white dark:border-slate-800 overflow-hidden shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-600 font-black text-2xl italic">
              {user.nickname.charAt(0) || 'U'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{user.nickname}</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">账号：{user.accountId}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">设备连接</h3>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800">
          <SettingItem icon={Bot} label="清洁机器人" value={robotConnected ? '已连接' : '未连接'} color="text-blue-500" onClick={() => setRobotConnected((value) => !value)} />
          <SettingItem icon={Camera} label="实时监控摄像头" value={cameraConnected ? '已连接' : '未连接'} color="text-green-500" onClick={() => setCameraConnected((value) => !value)} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">AI 引擎配置</h3>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800">
          <SettingItem icon={Cpu} label="Garden 模型配置" value={maskApiKey(gardenApiKey)} color="text-emerald-500" onClick={() => openModal('garden')} />
        </div>
        <div className="bg-slate-950 text-slate-50 rounded-[2rem] p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
              <Server size={18} />
            </div>
            <div>
              <p className="text-sm font-black">Garden 后端代理</p>
              <p className="text-xs text-slate-400 mt-1">分析请求发往 `/api/analyze`，优先使用你在当前设备里保存的 API key 和 Base URL。</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-slate-400 uppercase tracking-wider font-bold">
                <KeyRound size={14} />
                Key
              </div>
              <p className="mt-2 font-bold text-slate-100 break-all">{maskApiKey(gardenApiKey)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-slate-400 uppercase tracking-wider font-bold">
                <Cpu size={14} />
                Mode
              </div>
              <p className="mt-2 font-bold text-slate-100">Garden only</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 col-span-2">
              <div className="flex items-center gap-2 text-slate-400 uppercase tracking-wider font-bold">
                <Server size={14} />
                Base URL
              </div>
              <p className="mt-2 font-bold text-slate-100 break-all">{formatBaseUrlLabel(gardenBaseUrl)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">通用</h3>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800">
          <SettingItem icon={ShieldCheck} label="隐私与安全" onClick={() => openModal('security')} />
          <SettingItem icon={User} label="个人资料" onClick={() => openModal('profile')} />
        </div>
      </section>

      <div className="text-center pb-10">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">视净 Shi Jing v1.3.1</p>
      </div>

      <AnimatePresence>
        {activeModal === 'security' && (
          <NativeSheet
            title="修改密码"
            subtitle="采用和注册时一致的密码强度规则，并同步更新到 MySQL。"
            onClose={closeModal}
            footer={(
              <div className="space-y-3">
                {error && <p className="text-sm font-bold text-red-500 text-center">{error}</p>}
                {successMessage && (
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-600">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">取消</button>
                  <button type="button" disabled={submitting} onClick={handlePasswordSave} className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                    保存
                  </button>
                </div>
              </div>
            )}
          >
            <div className="rounded-[1.75rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">验证当前身份</p>
              </div>
              <div className="p-4">
                <div className="relative">
                  <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="block w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none" placeholder="当前密码" />
                  <button type="button" onClick={() => setShowCurrentPassword((value) => !value)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">设置新密码</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="block w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none" placeholder="新密码" />
                  <button type="button" onClick={() => setShowNewPassword((value) => !value)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {newPassword && (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">密码强度</span>
                      <span className="text-slate-700 dark:text-slate-200">{strength.label}</span>
                    </div>
                    <div className="mt-3 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: strength.width }} className={`h-full ${strength.color} transition-all duration-500`} />
                    </div>
                  </div>
                )}

                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`block w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none ${showMismatch ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'}`} placeholder="确认新密码" />
                  <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {showMismatch && <p className="text-xs text-red-500">确认密码必须与新密码完全一致。</p>}
                {passwordsMatch && <p className="text-xs text-green-600">两次输入的新密码一致。</p>}
              </div>
            </div>
          </NativeSheet>
        )}

        {activeModal === 'profile' && (
          <NativeSheet
            title="个人资料"
            subtitle="修改昵称和头像后，会同步到当前账户与数据库。"
            onClose={closeModal}
            footer={(
              <div className="space-y-3">
                {error && <p className="text-sm font-bold text-red-500 text-center">{error}</p>}
                {successMessage && (
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-600">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">取消</button>
                  <button type="button" disabled={submitting} onClick={handleProfileSave} className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                    保存
                  </button>
                </div>
              </div>
            )}
          >
            <div className="rounded-[1.75rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center gap-4">
              <div onClick={() => fileInputRef.current?.click()} className="relative w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-blue-600 font-black text-2xl italic">{profileNickname.charAt(0) || 'U'}</div>
                )}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-blue-600 dark:text-blue-400">
                更换头像
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div className="rounded-[1.75rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">昵称</p>
              </div>
              <div className="p-4">
                <input type="text" value={profileNickname} onChange={(e) => setProfileNickname(e.target.value)} className="block w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none" placeholder="请输入新的昵称" />
              </div>
            </div>
          </NativeSheet>
        )}

        {activeModal === 'garden' && (
          <NativeSheet
            title="Garden 模型配置"
            subtitle="保存后仅作用于当前设备。恢复默认会清空本地覆盖值，重新使用 .env 中的服务端配置。"
            onClose={closeModal}
            footer={(
              <div className="space-y-3">
                {successMessage && (
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-600">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">关闭</button>
                  <button type="button" onClick={handleGardenConfigReset} className="flex-1 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-bold">恢复默认</button>
                  <button type="button" onClick={handleGardenConfigSave} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold">保存配置</button>
                </div>
              </div>
            )}
          >
            <div className="rounded-[1.75rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">API Key</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="relative">
                  <input type={showGardenApiKey ? 'text' : 'password'} value={gardenApiKeyDraft} onChange={(e) => setGardenApiKeyDraft(e.target.value)} className="block w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none pr-12" placeholder="请输入 Garden API key" />
                  <button type="button" onClick={() => setShowGardenApiKey((value) => !value)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
                    {showGardenApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  建议只在你自己的设备上填写。清空后，后端会退回使用服务器环境变量中的 Garden key。
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Base URL</p>
                  <input
                    type="text"
                    value={gardenBaseUrlDraft}
                    onChange={(e) => setGardenBaseUrlDraft(e.target.value)}
                    className="block w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
                    placeholder="例如：http://127.0.0.1:8000"
                  />
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  如果这里留空，后端会继续使用 `.env` 里的 `GARDEN_API_BASE_URL`。
                </div>
              </div>
            </div>
          </NativeSheet>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsView;
